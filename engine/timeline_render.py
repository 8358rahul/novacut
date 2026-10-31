"""Original FFmpeg compositor: absolute placement, constant speed and audio mixing."""
import subprocess
from video_effects import effect_filters, color_filters


def has_audio(ffmpeg, path):
    result = subprocess.run([ffmpeg, "-hide_banner", "-i", path],
                            capture_output=True, text=True, timeout=30)
    return "Audio:" in result.stderr


def tempo_filters(speed):
    parts = []
    while speed > 2:
        parts.append("atempo=2")
        speed /= 2
    while speed < 0.5:
        parts.append("atempo=0.5")
        speed /= 0.5
    return ",".join(parts + [f"atempo={speed}"])


def build_render_command(ffmpeg, clips, output, width, height, fps, quality,
                         color_filter=lambda _: "", audio_probe=None):
    if not clips:
        raise ValueError("Add media before exporting")
    probe = audio_probe or (lambda path: has_audio(ffmpeg, path))
    duration = max(c["startUs"] + c["durationUs"] for c in clips) / 1e6
    if duration > 3600:
        raise ValueError("Exports are limited to one hour")
    inputs, filters, audio_labels = [], [], []
    filters.append(f"color=c=black:s={width}x{height}:r={fps}:d={duration}[base]")
    filters.append(f"anullsrc=r=48000:cl=stereo,atrim=duration={duration}[silence]")
    audio_labels.append("[silence]")
    last_video = "base"
    for index, clip in enumerate(sorted(clips, key=lambda c: (c.get("zIndex", 0), c["startUs"]))):
        start, length = clip["startUs"] / 1e6, clip["durationUs"] / 1e6
        speed = clip.get("speed", 1)
        if clip["type"] == "image":
            inputs += ["-loop", "1", "-t", str(length), "-i", clip["uri"]]
        else:
            inputs += ["-ss", str(clip.get("sourceStartUs", 0) / 1e6),
                       "-t", str(length * speed), "-i", clip["uri"]]
        if clip["type"] != "audio":
            filters.append(
                f"[{index}:v]setpts=(PTS-STARTPTS)/{speed},"
                f"scale={width}:{height}:force_original_aspect_ratio=decrease,"
                f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps={fps}"
                f"{color_filters(clip.get('colorAdjustments')) if clip.get('colorAdjustments') else color_filter(clip.get('filterId'))}"
                f"{effect_filters(clip.get('visualEffect', 'none'), clip.get('visualEffectIntensity', 0.7))},trim=duration={length},"
                f"setpts=PTS+{start}/TB[v{index}]")
            filters.append(
                f"[{last_video}][v{index}]overlay=eof_action=pass:repeatlast=0:"
                f"enable='gte(t,{start})*lt(t,{start + length})'[layer{index}]")
            last_video = f"layer{index}"
        if clip["type"] != "image" and clip.get("volume", 1) > 0 and probe(clip["uri"]):
            filters.append(
                f"[{index}:a]asetpts=PTS-STARTPTS,{tempo_filters(speed)},"
                f"volume={clip.get('volume', 1)},apad,atrim=duration={length},"
                f"adelay={round(start * 1000)}:all=1[a{index}]")
            audio_labels.append(f"[a{index}]")
    filters.append(f"{''.join(audio_labels)}amix=inputs={len(audio_labels)}:"
                   f"normalize=0:duration=first,alimiter=limit=0.95:latency=1[aout]")
    return [ffmpeg, "-y", "-hide_banner", *inputs, "-filter_complex", ";".join(filters),
            "-map", f"[{last_video}]", "-map", "[aout]", "-t", str(duration),
            "-c:v", "libx264", "-preset", "fast", "-b:v",
            {"standard": "8M", "high": "16M", "ultra": "30M"}[quality],
            "-pix_fmt", "yuv420p", "-c:a", "aac", "-movflags", "+faststart", output]
