"""
NovaCut Studio Engine - Professional AI & Video Rendering Server
Powered by FastAPI, OpenCV, and static FFmpeg 7.1 via imageio-ffmpeg.
Provides high-quality video timeline composition, LUT color grading,
audio mixing, AI background cutout, AI auto-reframe tracking,
AI HDR/portrait enhancements, and rhythmic beat drop analysis.
"""

import os
import sys
import json
import time
import shutil
import hashlib
import base64
import uuid
import mimetypes
import urllib.request
import subprocess
from pathlib import Path
from typing import List, Dict, Any, Optional, Literal

import imageio_ffmpeg
from fastapi import FastAPI, HTTPException, BackgroundTasks, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field
import uvicorn

# Local AI Engine Modules
from ai_cutout import remove_background
from ai_reframe import calculate_smooth_reframe_keyframes
from ai_enhancer import enhance_image, enhance_frame
from ai_audio import detect_audio_beats_and_waveforms

# Get static FFmpeg executable path
FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()
DATA_DIR = Path(os.environ.get("NOVACUT_DATA_DIR", str(Path(__file__).resolve().parent / "data")))
OUTPUT_DIR = DATA_DIR / "exports"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
CACHE_DIR = DATA_DIR / "cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)


def safe_child(directory: Path, filename: str) -> Path:
    if not filename or Path(filename).name != filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid media filename")
    path = (directory / filename).resolve()
    if path.parent != directory.resolve():
        raise HTTPException(status_code=400, detail="Invalid media filename")
    return path


def resolve_media_path(path_or_url: str) -> str:
    """
    Safely resolves local file path, file:// URI, server cached path, base64 data, or remote asset URL.
    Ensures images from mobile devices (iOS / Android) or web URLs are accessible on the host machine.
    """
    if not path_or_url:
        raise HTTPException(status_code=400, detail="Empty media path")

    # 1. If it refers to an internal cached asset (e.g. /cache/cutout_123.png or http://...:8765/cache/cutout_123.png)
    if "/cache/" in path_or_url:
        filename = path_or_url.split("/cache/")[-1].split("?")[0]
        cached_file = safe_child(CACHE_DIR, filename)
        if cached_file.exists():
            return str(cached_file)

    # 2. If it's a base64 encoded data URI (sent from mobile)
    if path_or_url.startswith("data:image/") or (len(path_or_url) > 200 and "," in path_or_url[:100]):
        try:
            raw_b64 = path_or_url.split(",", 1)[-1]
            img_bytes = base64.b64decode(raw_b64)
            ext = ".png" if "image/png" in path_or_url else ".jpg"
            filename = f"b64_{int(time.time() * 1000)}{ext}"
            cached_file = safe_child(CACHE_DIR, filename)
            with open(cached_file, "wb") as f:
                f.write(img_bytes)
            return str(cached_file)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to decode base64 image: {str(e)}")

    # 3. If it's an external web URL, download and cache it locally
    if path_or_url.startswith("http://") or path_or_url.startswith("https://"):
        url_hash = hashlib.md5(path_or_url.encode("utf-8")).hexdigest()[:12]
        ext = ".jpg"
        if ".png" in path_or_url.lower():
            ext = ".png"
        elif ".mp4" in path_or_url.lower() or ".mov" in path_or_url.lower():
            ext = ".mp4"
        elif ".mp3" in path_or_url.lower() or ".wav" in path_or_url.lower():
            ext = ".mp3"
        cached_file = CACHE_DIR / f"dl_{url_hash}{ext}"
        if not cached_file.exists():
            headers = {"User-Agent": "NovaCut-AI/2.0"}
            req = urllib.request.Request(path_or_url, headers=headers)
            with urllib.request.urlopen(req, timeout=20) as resp, open(cached_file, "wb") as out:
                shutil.copyfileobj(resp, out)
        return str(cached_file)

    # 4. Local file paths on the host machine
    clean = path_or_url.replace("file://", "")
    # Normalize Windows leading slashes: /C:/work/... -> C:/work/...
    if clean.startswith("/") and len(clean) > 2 and clean[2] == ":":
        clean = clean[1:]

    # Check if file exists as-is
    if os.path.exists(clean):
        return clean

    # Check if it was saved in CACHE_DIR without the cache/ prefix
    basename = Path(clean).name
    if (CACHE_DIR / basename).exists():
        return str(CACHE_DIR / basename)

    raise HTTPException(
        status_code=400,
        detail=f"Media file '{path_or_url}' not found on server host. Ensure file is uploaded via /ai/upload or provided as a URL.",
    )


app = FastAPI(
    title="NovaCut Studio Engine",
    description="World-class AI video composition, smart cutout, reframe & rendering service for NovaCut",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ColorModel(BaseModel):
    brightness: float = Field(default=0, ge=-1, le=1)
    contrast: float = Field(default=1, ge=0, le=4)
    saturation: float = Field(default=1, ge=0, le=4)
    temperature: float = Field(default=0, ge=-1, le=1)


class ClipModel(BaseModel):
    id: str
    trackId: str
    type: Literal['video', 'image', 'audio']
    uri: Optional[str] = None
    name: Optional[str] = None
    startUs: int = Field(default=0, ge=0)
    durationUs: int = Field(gt=0, le=3_600_000_000)
    sourceStartUs: int = Field(default=0, ge=0)
    sourceDurationUs: int = 0
    speed: float = Field(default=1.0, ge=0.1, le=10)
    volume: float = Field(default=1.0, ge=0, le=4)
    zIndex: int = 0
    visualEffect: str = "none"
    visualEffectIntensity: float = Field(default=0.7, ge=0, le=1)
    colorAdjustments: Optional[ColorModel] = None
    filterId: Optional[Literal["normal", "teal_orange", "cyberpunk", "vintage_90s", "golden_hour", "bw_contrast", "vivid_warm", "moody_dark"]] = None
    transitionOut: Optional[str] = None
    text: Optional[str] = None


class ExportRequest(BaseModel):
    projectId: str
    title: str = "NovaCut_Export"
    aspectRatio: Literal["9:16", "16:9", "1:1", "4:5", "21:9"] = "9:16"  # '9:16', '16:9', '1:1', '4:5'
    resolution: Literal["720p", "1080p", "4K"] = "1080p"  # '720p', '1080p', '4K'
    fps: Literal[24, 30, 60] = 30
    quality: Literal["standard", "high", "ultra"] = "high"  # 'standard', 'high', 'ultra'
    clips: List[ClipModel] = Field(min_length=1, max_length=100)


class CutoutRequest(BaseModel):
    imagePath: str
    iterations: int = 5
    featherRadius: int = 5
    outputFilename: Optional[str] = None


class ReframeRequest(BaseModel):
    mediaPath: str
    targetAspect: str = "9:16"
    sampleIntervalSec: float = 0.5


class EnhanceRequest(BaseModel):
    imagePath: str
    mode: str = "hdr"  # 'hdr', 'portrait', 'night_enhance', 'vivid'
    intensity: float = 1.0
    outputFilename: Optional[str] = None


class AudioBeatRequest(BaseModel):
    mediaPath: Optional[str] = None
    bpm: Optional[int] = 120
    durationSec: Optional[float] = 15.0


# Active export progress tracker: exportId -> { progress: float, status: str, outputPath: str, error: str }
EXPORT_JOBS: Dict[str, Dict[str, Any]] = {}


def get_resolution_dimensions(resolution: str, aspect_ratio: str) -> tuple[int, int]:
    """Calculate target width and height based on resolution preset and aspect ratio."""
    dim_map = {
        ("1080p", "9:16"): (1080, 1920),
        ("1080p", "16:9"): (1920, 1080),
        ("1080p", "1:1"): (1080, 1080),
        ("1080p", "4:5"): (1080, 1350),
        ("720p", "9:16"): (720, 1280),
        ("720p", "16:9"): (1280, 720),
        ("720p", "1:1"): (720, 720),
        ("720p", "4:5"): (720, 900),
        ("4K", "9:16"): (2160, 3840),
        ("4K", "16:9"): (3840, 2160),
        ("4K", "1:1"): (2160, 2160),
        ("4K", "4:5"): (2160, 2700),
    }
    if aspect_ratio == "21:9":
        height = {"720p": 720, "1080p": 1080, "4K": 2160}[resolution]
        return (round(height * 21 / 9 / 2) * 2, height)
    return dim_map[(resolution, aspect_ratio)]


def build_filter_string(filter_id: Optional[str]) -> str:
    """Map CapCut LUT filters to high-quality FFmpeg color grading filters."""
    if not filter_id or filter_id == "normal":
        return ""
    if filter_id == "teal_orange":
        return ",eq=contrast=1.2:saturation=1.25,colorbalance=rs=0.1:gs=-0.05:bs=-0.1:rh=0.08:bh=-0.08"
    if filter_id == "cyberpunk":
        return ",eq=contrast=1.3:saturation=1.35,colorbalance=rm=-0.1:gm=0.05:bm=0.2:rh=0.15:bh=0.2"
    if filter_id == "vintage_90s":
        return ",eq=contrast=0.95:saturation=0.85,colorbalance=rs=0.12:gs=0.08:bs=-0.05"
    if filter_id == "golden_hour":
        return ",eq=contrast=1.1:saturation=1.2,colorbalance=rs=0.18:gs=0.06:bs=-0.12"
    if filter_id == "bw_contrast":
        return ",hue=s=0,eq=contrast=1.3:brightness=0.02"
    if filter_id == "vivid_warm":
        return ",eq=contrast=1.15:saturation=1.2,colorbalance=rs=0.1:gs=0.02:bs=-0.06"
    if filter_id == "moody_dark":
        return ",eq=contrast=1.25:brightness=-0.05:saturation=0.9"
    return ""


def run_video_export(job_id: str, request: ExportRequest):
    """Executes the high-quality multi-track video export via FFmpeg."""
    try:
        EXPORT_JOBS[job_id]["status"] = "rendering"
        EXPORT_JOBS[job_id]["progress"] = 0.05

        out_width, out_height = get_resolution_dimensions(request.resolution, request.aspectRatio)
        clean_title = "".join(c for c in request.title if c.isalnum() or c in ("-", "_")).strip() or "Export"
        output_filename = f"{clean_title}_{uuid.uuid4().hex}.mp4"
        output_file_path = OUTPUT_DIR / output_filename

        from timeline_render import build_render_command
        clips = [c.model_dump() for c in request.clips]
        for clip in clips:
            clip["uri"] = resolve_media_path(clip["uri"] or "")
        cmd = build_render_command(FFMPEG_EXE, clips, str(output_file_path),
                                   out_width, out_height, request.fps, request.quality,
                                   build_filter_string)
        EXPORT_JOBS[job_id]["progress"] = 0.2
        process = subprocess.run(cmd, capture_output=True, text=True, timeout=1800)
        if process.returncode != 0:
            raise RuntimeError(f"FFmpeg error: {process.stderr[-1000:]}")

        EXPORT_JOBS[job_id]["status"] = "completed"
        EXPORT_JOBS[job_id]["progress"] = 1.0
        EXPORT_JOBS[job_id]["outputPath"] = str(output_file_path)
        EXPORT_JOBS[job_id]["filename"] = output_file_path.name

    except Exception as e:
        EXPORT_JOBS[job_id]["status"] = "failed"
        EXPORT_JOBS[job_id]["error"] = str(e)


@app.get("/health")
def health():
    return {
        "status": "online",
        "engine": "NovaCut Studio AI Engine",
        "version": "2.0.0",
        "ffmpeg": FFMPEG_EXE,
        "ffmpeg_available": os.path.exists(FFMPEG_EXE),
        "ai_modules": [
            "ai_cutout (GrabCut alpha matting)",
            "ai_reframe (16:9 to 9:16 focal tracking)",
            "ai_enhancer (CLAHE HDR & bilateral portrait)",
            "ai_audio (PCM waveform & beat drop detection)",
        ],
    }


@app.post("/export")
def start_export(request: ExportRequest, background_tasks: BackgroundTasks):
    job_id = f"job_{uuid.uuid4().hex}"
    EXPORT_JOBS[job_id] = {
        "status": "queued",
        "progress": 0.0,
        "outputPath": None,
        "error": None,
        "createdAt": time.time(),
    }
    background_tasks.add_task(run_video_export, job_id, request)
    return {"jobId": job_id, "status": "queued"}


@app.get("/export/{job_id}")
def get_export_status(job_id: str):
    if job_id not in EXPORT_JOBS:
        raise HTTPException(status_code=404, detail="Export job not found")
    return EXPORT_JOBS[job_id]


@app.get("/download/{filename}")
def download_export(filename: str):
    file_path = safe_child(OUTPUT_DIR, filename)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Exported file not found")
    return FileResponse(
        path=str(file_path),
        filename=filename,
        media_type="video/mp4",
    )


# -------------------- AI ENDPOINTS --------------------


@app.post("/ai/upload")
async def api_upload_media(file: UploadFile = File(...)):
    """
    Accepts media uploads (photos, videos, audio) from physical mobile devices (iPhone, Android).
    Saves file into CACHE_DIR and returns download URL for subsequent AI operations.
    """
    orig_name = file.filename or "upload.jpg"
    ext = Path(orig_name).suffix or ".jpg"
    filename = f"upload_{uuid.uuid4().hex}{ext}"
    dest = CACHE_DIR / filename
    with open(dest, "wb") as out:
        shutil.copyfileobj(file.file, out)
    return {
        "status": "success",
        "filename": filename,
        "downloadUrl": f"/cache/{filename}",
        "fullUrl": f"/cache/{filename}",
    }


@app.post("/ai/remove-bg")
def api_remove_background(req: CutoutRequest):
    """
    AI Smart Subject Cutout & Background Removal using OpenCV GrabCut with feathered alpha matting.
    """
    local_path = resolve_media_path(req.imagePath)

    filename = req.outputFilename or f"cutout_{int(time.time())}.png"
    out_path = safe_child(CACHE_DIR, filename)

    try:
        res = remove_background(
            input_path=local_path,
            output_path=str(out_path),
            iterations=req.iterations,
            feather_radius=req.featherRadius,
        )
        res["downloadUrl"] = f"/cache/{filename}"
        res["fullUrl"] = f"/cache/{filename}"
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cutout failed: {str(e)}")


@app.post("/ai/auto-reframe")
def api_auto_reframe(req: ReframeRequest):
    """
    AI Subject Tracking & Dynamic Reframe (16:9 to 9:16).
    Computes keyframe pan-and-scan trajectories for NovaCut's keyframe engine.
    """
    local_path = resolve_media_path(req.mediaPath)

    try:
        res = calculate_smooth_reframe_keyframes(
            video_path=local_path,
            target_aspect=req.targetAspect,
            sample_interval_sec=req.sampleIntervalSec,
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reframe failed: {str(e)}")


@app.post("/ai/enhance")
def api_enhance_image(req: EnhanceRequest):
    """
    AI Studio Enhancement (CLAHE High Dynamic Range, Portrait Softening, Night Enhance, Vivid).
    """
    local_path = resolve_media_path(req.imagePath)

    filename = req.outputFilename or f"enhance_{req.mode}_{int(time.time())}.jpg"
    out_path = safe_child(CACHE_DIR, filename)

    try:
        res = enhance_image(
            input_path=local_path,
            output_path=str(out_path),
            mode=req.mode,
            intensity=req.intensity,
        )
        res["downloadUrl"] = f"/cache/{filename}"
        res["fullUrl"] = f"/cache/{filename}"
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Enhancement failed: {str(e)}")


@app.post("/ai/detect-beats")
def api_detect_beats(req: AudioBeatRequest):
    """
    AI Rhythmic Beat Drop Detection & Waveform Extraction from audio or synthetic BPM.
    """
    if req.mediaPath:
        try:
            local_path = resolve_media_path(req.mediaPath)
            res = detect_audio_beats_and_waveforms(local_path, FFMPEG_EXE)
            return res
        except Exception:
            pass  # Fallback to rhythmic beat synthesis below

    # Fallback to rhythmic beat drop formula
    bpm = req.bpm or 120
    duration_sec = req.durationSec or 15.0
    interval = 60.0 / bpm
    beats = []
    t = interval
    while t < duration_sec:
        beats.append({
            "timeUs": int(t * 1_000_000),
            "timeSec": round(t, 3),
            "intensity": 1.0,
        })
        t += interval

    return {
        "status": "rhythmic_synth",
        "bpm": bpm,
        "durationSec": duration_sec,
        "beatCount": len(beats),
        "beatDrops": beats,
    }


@app.get("/cache/{filename}")
def download_cached_media(filename: str):
    file_path = safe_child(CACHE_DIR, filename)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Cached asset not found")
    media_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
    return FileResponse(path=str(file_path), filename=filename, media_type=media_type)


@app.get("/api/effects")
def get_effects_catalog(category: Optional[str] = None, q: Optional[str] = None):
    """
    Returns the CapCut-style video effects catalog with 60+ renderable FFmpeg shaders.
    """
    from video_effects import SUPPORTED_EFFECTS

    effects = [
        {
            "id": eff,
            "name": eff.replace("_", " ").title(),
            "renderable": True,
        }
        for eff in SUPPORTED_EFFECTS
        if eff != "none"
    ]
    if q:
        query = q.lower().strip()
        effects = [e for e in effects if query in e["name"].lower() or query in e["id"].lower()]

    return {
        "status": "success",
        "total": len(effects),
        "effects": effects,
    }


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    print(f"[NovaCut Studio Engine v2.0] Starting server on http://0.0.0.0:8765")
    print(f"[NovaCut Studio Engine v2.0] Static FFmpeg: {FFMPEG_EXE}")
    uvicorn.run(app, host="0.0.0.0", port=8765)
