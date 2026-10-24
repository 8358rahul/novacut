import { AudioClip } from '../models/clip';

/**
 * Computes the exact linear audio gain (0.0 to 1.0+) of an AudioClip at a given timeline position,
 * taking into account clip volume, fade-in ramp, and fade-out ramp.
 */
export function calculateAudioGainAtTime(clip: AudioClip, timelineTimeUs: number): number {
  const start = clip.timelineRange.startUs;
  const duration = clip.timelineRange.durationUs;
  const end = start + duration;

  if (timelineTimeUs < start || timelineTimeUs >= end) {
    return 0;
  }

  const elapsedUs = timelineTimeUs - start;
  const remainingUs = end - timelineTimeUs;
  const baseVolume = clip.volume;

  let fadeMultiplier = 1.0;

  // Fade In Ramp
  if (clip.fadeInDurationUs > 0 && elapsedUs < clip.fadeInDurationUs) {
    fadeMultiplier = Math.min(fadeMultiplier, elapsedUs / clip.fadeInDurationUs);
  }

  // Fade Out Ramp
  if (clip.fadeOutDurationUs > 0 && remainingUs < clip.fadeOutDurationUs) {
    fadeMultiplier = Math.min(fadeMultiplier, remainingUs / clip.fadeOutDurationUs);
  }

  return baseVolume * fadeMultiplier;
}

/**
 * Generates a deterministic normalized waveform profile array (values between 0.1 and 1.0)
 * for rendering visual audio tracks on the editor timeline.
 */
export function generateWaveformProfile(
  durationUs: number,
  samplePointsCount: number = 40
): number[] {
  if (samplePointsCount <= 0 || durationUs <= 0) return [];

  const points: number[] = [];
  const freq1 = 2.5;
  const freq2 = 5.8;

  for (let i = 0; i < samplePointsCount; i++) {
    const t = i / samplePointsCount;
    // Harmonized pseudo-random continuous waveform envelope
    const raw =
      0.5 +
      0.3 * Math.sin(t * Math.PI * 2 * freq1) +
      0.2 * Math.cos(t * Math.PI * 2 * freq2);
    // Normalized between 0.15 and 0.95 height
    const normalized = Math.max(0.15, Math.min(0.95, Math.abs(raw)));
    points.push(Math.round(normalized * 100) / 100);
  }

  return points;
}
