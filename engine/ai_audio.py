"""
NovaCut AI Audio Analyzer
High-precision rhythmic beat drop detection, onset transient energy tracking,
and normalized waveform extraction using static FFmpeg and NumPy vector math.
Conforms to CapCut's microsecond integer timebase and MaterialBeat$AiBeats schema.
"""

import subprocess
from pathlib import Path
from typing import Dict, Any, List
import numpy as np


def extract_pcm_from_media(media_path: str, ffmpeg_exe: str, sample_rate: int = 22050) -> np.ndarray:
    """
    Extracts 16-bit mono PCM audio from video or audio file using static FFmpeg.
    """
    cmd = [
        ffmpeg_exe,
        "-i", media_path,
        "-f", "s16le",
        "-ac", "1",
        "-ar", str(sample_rate),
        "-vn",
        "-",
    ]
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    if not proc.stdout:
        return np.zeros(0, dtype=np.int16)

    pcm = np.frombuffer(proc.stdout, dtype=np.int16)
    return pcm


def detect_audio_beats_and_waveforms(
    media_path: str,
    ffmpeg_exe: str,
    sample_rate: int = 22050,
    waveform_samples_count: int = 100,
) -> Dict[str, Any]:
    """
    Computes energy onsets, beats, estimated BPM, and normalized waveforms.
    """
    pcm = extract_pcm_from_media(media_path, ffmpeg_exe, sample_rate)
    if len(pcm) == 0:
        return {
            "status": "empty_or_no_audio",
            "bpm": 120,
            "durationUs": 0,
            "beatDrops": [],
            "waveform": [0.0] * waveform_samples_count,
        }

    # Normalize audio samples to [-1.0, 1.0]
    samples = pcm.astype(np.float32) / 32768.0
    duration_sec = len(samples) / sample_rate
    duration_us = int(duration_sec * 1_000_000)

    # 1. Compute Waveform profile (decimate into target count of peaks)
    chunk_size = max(1, len(samples) // waveform_samples_count)
    waveform = []
    for i in range(waveform_samples_count):
        start = i * chunk_size
        end = min(len(samples), start + chunk_size)
        if start < len(samples):
            peak = float(np.max(np.abs(samples[start:end])))
            waveform.append(round(min(1.0, peak * 1.2), 3))
        else:
            waveform.append(0.0)

    # 2. Compute Short-Time Energy Envelope (50ms windows)
    hop_length = int(sample_rate * 0.05)  # 50ms hop
    frame_count = max(1, len(samples) // hop_length)

    energy = np.zeros(frame_count, dtype=np.float32)
    for i in range(frame_count):
        window = samples[i * hop_length : (i + 1) * hop_length]
        energy[i] = np.mean(window ** 2)

    # Energy difference / onset strength
    energy_diff = np.diff(energy, prepend=energy[0])
    energy_diff = np.maximum(0, energy_diff)  # Half-wave rectification

    # Dynamic thresholding for beat drops
    mean_onset = np.mean(energy_diff)
    std_onset = np.std(energy_diff)
    threshold = mean_onset + 1.25 * std_onset

    beat_frames = []
    min_dist_frames = int(0.25 / 0.05)  # Minimum 250ms between beat drops

    last_beat = -min_dist_frames
    for i in range(1, frame_count - 1):
        if (
            energy_diff[i] > threshold
            and energy_diff[i] > energy_diff[i - 1]
            and energy_diff[i] >= energy_diff[i + 1]
            and (i - last_beat) >= min_dist_frames
        ):
            beat_frames.append(i)
            last_beat = i

    # Convert beat frames to microseconds and seconds
    beat_drops: List[Dict[str, Any]] = []
    for f in beat_frames:
        t_sec = f * 0.05
        t_us = int(t_sec * 1_000_000)
        beat_drops.append({
            "timeUs": t_us,
            "timeSec": round(t_sec, 3),
            "intensity": round(float(energy_diff[f] / (threshold + 1e-6)), 2),
        })

    # Estimate BPM based on average beat intervals
    if len(beat_drops) >= 3:
        intervals = [
            (beat_drops[j + 1]["timeSec"] - beat_drops[j]["timeSec"])
            for j in range(len(beat_drops) - 1)
        ]
        median_interval = float(np.median(intervals))
        bpm = round(60.0 / median_interval) if median_interval > 0 else 120
        # Clamp to realistic musical range [60, 200]
        while bpm < 70:
            bpm *= 2
        while bpm > 190:
            bpm //= 2
    else:
        bpm = 120

    return {
        "status": "success",
        "durationUs": duration_us,
        "durationSec": round(duration_sec, 2),
        "bpm": bpm,
        "beatCount": len(beat_drops),
        "beatDrops": beat_drops,
        "waveform": waveform,
    }
