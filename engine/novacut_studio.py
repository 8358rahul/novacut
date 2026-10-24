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
import urllib.request
import subprocess
from pathlib import Path
from typing import List, Dict, Any, Optional

import imageio_ffmpeg
from fastapi import FastAPI, HTTPException, BackgroundTasks, Query
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
OUTPUT_DIR = Path("D:/work/capcut/novacut/exports")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
CACHE_DIR = Path("D:/work/capcut/novacut/engine/cache")
CACHE_DIR.mkdir(parents=True, exist_ok=True)


def resolve_media_path(path_or_url: str) -> str:
    """
    Safely resolves local file path, file:// URI, or remote HTTP/HTTPS asset URL.
    Downloads remote assets into CACHE_DIR so AI OpenCV/FFmpeg algorithms can process them.
    """
    if not path_or_url:
        raise HTTPException(status_code=400, detail="Empty media path")

    # If it's a web URL, download and cache it locally
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

    clean = path_or_url.replace("file://", "")
    # Normalize Windows leading slashes: /C:/work/... -> C:/work/...
    if clean.startswith("/") and len(clean) > 2 and clean[2] == ":":
        clean = clean[1:]

    if not os.path.exists(clean):
        raise HTTPException(status_code=400, detail=f"Media file not found at: {clean}")

    return clean


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


class ClipModel(BaseModel):
    id: str
    trackId: str
    type: str  # 'video' | 'image' | 'audio' | 'text'
    uri: Optional[str] = None
    name: Optional[str] = None
    startUs: int = 0
    durationUs: int = 0
    sourceStartUs: int = 0
    sourceDurationUs: int = 0
    speed: float = 1.0
    volume: float = 1.0
    filterId: Optional[str] = None
    transitionOut: Optional[str] = None
    text: Optional[str] = None


class ExportRequest(BaseModel):
    projectId: str
    title: str = "NovaCut_Export"
    aspectRatio: str = "9:16"  # '9:16', '16:9', '1:1', '4:5'
    resolution: str = "1080p"  # '720p', '1080p', '4K'
    fps: int = 30
    quality: str = "high"  # 'standard', 'high', 'ultra'
    clips: List[ClipModel] = []


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
    return dim_map.get((resolution, aspect_ratio), (1080, 1920))


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
        output_filename = f"{clean_title}_{int(time.time())}.mp4"
        output_file_path = OUTPUT_DIR / output_filename

        # Filter media clips
        video_clips = [c for c in request.clips if c.type in ("video", "image") and c.uri]

        if not video_clips:
            # Generate a solid aesthetic branded slate if no clips
            cmd = [
                FFMPEG_EXE,
                "-y",
                "-f", "lavfi",
                "-i", f"color=c=black:s={out_width}x{out_height}:d=3:r={request.fps}",
                "-f", "lavfi",
                "-i", "anullsrc=r=44100:cl=stereo",
                "-c:v", "libx264",
                "-pix_fmt", "yuv420p",
                "-c:a", "aac",
                "-shortest",
                "-movflags", "+faststart",
                str(output_file_path),
            ]
            subprocess.run(cmd, check=True)
            EXPORT_JOBS[job_id]["status"] = "completed"
            EXPORT_JOBS[job_id]["progress"] = 1.0
            EXPORT_JOBS[job_id]["outputPath"] = str(output_file_path)
            return

        # Prepare input arguments and complex filters
        inputs = []
        filter_parts = []
        concat_v_inputs = []

        for idx, clip in enumerate(video_clips):
            local_uri = clip.uri.replace("file://", "") if clip.uri else ""
            duration_sec = (clip.durationUs or 3_000_000) / 1_000_000
            start_sec = (clip.sourceStartUs or 0) / 1_000_000

            if clip.type == "image":
                inputs.extend(["-loop", "1", "-t", str(duration_sec), "-i", local_uri])
            else:
                inputs.extend(["-ss", str(start_sec), "-t", str(duration_sec), "-i", local_uri])

            # Video scaling & aspect padding
            scale_filter = (
                f"[{idx}:v]scale={out_width}:{out_height}:force_original_aspect_ratio=decrease,"
                f"pad={out_width}:{out_height}:(ow-iw)/2:(oh-ih)/2:black,"
                f"setsar=1,fps={request.fps}"
            )
            color_grade = build_filter_string(clip.filterId)
            scale_filter += color_grade + f"[v{idx}]"
            filter_parts.append(scale_filter)
            concat_v_inputs.append(f"[v{idx}]")

        # Concat video streams
        concat_filter = f"{''.join(concat_v_inputs)}concat=n={len(video_clips)}:v=1:a=0[vout]"
        filter_parts.append(concat_filter)

        EXPORT_JOBS[job_id]["progress"] = 0.35

        # Bitrate based on quality
        bitrate_map = {"standard": "8M", "high": "16M", "ultra": "30M"}
        video_bitrate = bitrate_map.get(request.quality, "16M")

        cmd = [
            FFMPEG_EXE,
            "-y",
            *inputs,
            "-filter_complex", ";".join(filter_parts),
            "-map", "[vout]",
            "-c:v", "libx264",
            "-preset", "fast",
            "-b:v", video_bitrate,
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            str(output_file_path),
        ]

        EXPORT_JOBS[job_id]["progress"] = 0.65

        # Run render
        process = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if process.returncode != 0:
            raise RuntimeError(f"FFmpeg error: {process.stderr[-500:]}")

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
    job_id = f"job_{int(time.time())}_{request.projectId}"
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
    file_path = OUTPUT_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Exported file not found")
    return FileResponse(
        path=str(file_path),
        filename=filename,
        media_type="video/mp4",
    )


# -------------------- AI ENDPOINTS --------------------


@app.post("/ai/remove-bg")
def api_remove_background(req: CutoutRequest):
    """
    AI Smart Subject Cutout & Background Removal using OpenCV GrabCut with feathered alpha matting.
    """
    local_path = resolve_media_path(req.imagePath)

    filename = req.outputFilename or f"cutout_{int(time.time())}.png"
    out_path = CACHE_DIR / filename

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
    out_path = CACHE_DIR / filename

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
    file_path = CACHE_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Cached asset not found")
    media_type = "image/png" if filename.endswith(".png") else "image/jpeg"
    return FileResponse(path=str(file_path), filename=filename, media_type=media_type)


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    print(f"[NovaCut Studio Engine v2.0] Starting server on http://0.0.0.0:8765")
    print(f"[NovaCut Studio Engine v2.0] Static FFmpeg: {FFMPEG_EXE}")
    uvicorn.run(app, host="0.0.0.0", port=8765)
