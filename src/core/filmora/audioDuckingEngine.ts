/**
 * Filmora Auto Audio Ducking Engine
 * Reverse-engineered from Wondershare Filmora's `audioDuckingframe` architecture.
 *
 * Automatically lowers (ducks) the volume of background music tracks whenever
 * speech, dialogue, or voiceover occurs on primary audio/video tracks.
 * Uses microsecond integer timebase and smooth attack/release ramps to eliminate clicks.
 */

import { AudioClip, VideoClip, Clip } from '../models/clip';
import { TimelineTrack } from '../models/timeline';

export interface DuckingSpeechInterval {
  startUs: number;
  endUs: number;
}

export interface AudioDuckingOptions {
  /** Ducking level in dB (negative, e.g. -12 dB for standard Filmora ducking) */
  duckingLevelDb?: number;
  /** Custom linear ducking multiplier (0.0 to 1.0, overrides duckingLevelDb if specified) */
  duckingRatio?: number;
  /** Attack ramp duration in microseconds (time taken to fade down music, default 200,000 µs = 0.2s) */
  attackDurationUs?: number;
  /** Release ramp duration in microseconds (time taken to fade back up, default 350,000 µs = 0.35s) */
  releaseDurationUs?: number;
  /** Optional lookahead pre-ducking margin in microseconds (default 50,000 µs = 0.05s) */
  preDuckingMarginUs?: number;
}

export interface DuckingEnvelopePoint {
  timeUs: number;
  multiplier: number; // 0.0 to 1.0 multiplier applied on top of clip's base volume
  state: 'normal' | 'attack' | 'ducked' | 'release';
}

export const DEFAULT_DUCKING_OPTIONS: Required<AudioDuckingOptions> = {
  duckingLevelDb: -12.0,
  duckingRatio: 0.25, // -12 dB ≈ 0.251 linear gain
  attackDurationUs: 200_000, // 0.2 seconds
  releaseDurationUs: 350_000, // 0.35 seconds
  preDuckingMarginUs: 50_000, // 0.05 seconds
};

export class AudioDuckingEngine {
  /**
   * Extracts active speech/dialogue intervals across primary video or voiceover clips.
   */
  static extractSpeechIntervals(
    clips: Clip[],
    primaryTrackIds?: string[]
  ): DuckingSpeechInterval[] {
    const rawIntervals: DuckingSpeechInterval[] = [];

    for (const clip of clips) {
      if (primaryTrackIds && !primaryTrackIds.includes(clip.trackId)) {
        continue;
      }

      // Check if clip is video with audio or primary voice clip
      if (clip.type === 'video') {
        const vClip = clip as VideoClip;
        if (vClip.volume > 0) {
          const startUs = vClip.timelineRange.startUs;
          rawIntervals.push({
            startUs,
            endUs: startUs + vClip.timelineRange.durationUs,
          });
        }
      } else if (clip.type === 'audio') {
        const aClip = clip as AudioClip;
        // Non-BGM audio or audio labeled as voice/dialogue
        const isVoice = !aClip.name.toLowerCase().includes('bgm') && !aClip.name.toLowerCase().includes('music');
        if (isVoice && aClip.volume > 0) {
          const startUs = aClip.timelineRange.startUs;
          rawIntervals.push({
            startUs,
            endUs: startUs + aClip.timelineRange.durationUs,
          });
        }
      }
    }

    if (rawIntervals.length === 0) return [];

    // Sort by start time
    rawIntervals.sort((a, b) => a.startUs - b.startUs);

    // Merge overlapping or contiguous speech intervals
    const merged: DuckingSpeechInterval[] = [rawIntervals[0]];
    for (let i = 1; i < rawIntervals.length; i++) {
      const current = rawIntervals[i];
      const prev = merged[merged.length - 1];

      // If overlapping or gap is less than 100ms, bridge them
      if (current.startUs <= prev.endUs + 100_000) {
        prev.endUs = Math.max(prev.endUs, current.endUs);
      } else {
        merged.push(current);
      }
    }

    return merged;
  }

  /**
   * Computes the instantaneous audio ducking multiplier (between duckingRatio and 1.0)
   * at a specific timeline timestamp in integer microseconds.
   */
  static computeDuckingMultiplierAtTime(
    timeUs: number,
    speechIntervals: DuckingSpeechInterval[],
    options?: AudioDuckingOptions
  ): number {
    const opts = { ...DEFAULT_DUCKING_OPTIONS, ...options };
    const duckRatio = options?.duckingRatio !== undefined
      ? options.duckingRatio
      : Math.pow(10, (options?.duckingLevelDb ?? opts.duckingLevelDb) / 20);

    for (const interval of speechIntervals) {
      const duckStartUs = interval.startUs - opts.preDuckingMarginUs;
      const attackEndUs = duckStartUs + opts.attackDurationUs;
      const duckEndUs = interval.endUs;
      const releaseEndUs = duckEndUs + opts.releaseDurationUs;

      // Before this ducking interval starts
      if (timeUs < duckStartUs) {
        continue;
      }

      // Inside Attack Phase (fading down from 1.0 to duckRatio)
      if (timeUs >= duckStartUs && timeUs < attackEndUs) {
        const progress = (timeUs - duckStartUs) / opts.attackDurationUs;
        // Cosine-eased smooth ramp to prevent audible popping
        const smoothProgress = 0.5 * (1 - Math.cos(progress * Math.PI));
        return 1.0 - smoothProgress * (1.0 - duckRatio);
      }

      // Inside Fully Ducked Speech Phase
      if (timeUs >= attackEndUs && timeUs <= duckEndUs) {
        return duckRatio;
      }

      // Inside Release Phase (fading back up from duckRatio to 1.0)
      if (timeUs > duckEndUs && timeUs <= releaseEndUs) {
        const progress = (timeUs - duckEndUs) / opts.releaseDurationUs;
        const smoothProgress = 0.5 * (1 - Math.cos(progress * Math.PI));
        return duckRatio + smoothProgress * (1.0 - duckRatio);
      }
    }

    // No speech active at or near this timestamp -> full normal volume
    return 1.0;
  }

  /**
   * Calculates the composite effective gain for a background music AudioClip
   * taking into account clip volume, fade-in/fade-out, and auto-ducking.
   */
  static calculateEffectiveMusicGain(
    clip: AudioClip,
    timeUs: number,
    speechIntervals: DuckingSpeechInterval[],
    options?: AudioDuckingOptions
  ): number {
    const start = clip.timelineRange.startUs;
    const duration = clip.timelineRange.durationUs;
    const end = start + duration;

    if (timeUs < start || timeUs >= end) {
      return 0;
    }

    const elapsedUs = timeUs - start;
    const remainingUs = end - timeUs;
    let fadeMultiplier = 1.0;

    if (clip.fadeInDurationUs > 0 && elapsedUs < clip.fadeInDurationUs) {
      fadeMultiplier = Math.min(fadeMultiplier, elapsedUs / clip.fadeInDurationUs);
    }
    if (clip.fadeOutDurationUs > 0 && remainingUs < clip.fadeOutDurationUs) {
      fadeMultiplier = Math.min(fadeMultiplier, remainingUs / clip.fadeOutDurationUs);
    }

    const duckingMultiplier = this.computeDuckingMultiplierAtTime(timeUs, speechIntervals, options);
    return clip.volume * fadeMultiplier * duckingMultiplier;
  }

  /**
   * Generates a sample profile of ducking envelope points over the clip's duration.
   */
  static generateDuckingEnvelope(
    clip: AudioClip,
    speechIntervals: DuckingSpeechInterval[],
    options?: AudioDuckingOptions,
    sampleCount: number = 50
  ): DuckingEnvelopePoint[] {
    const points: DuckingEnvelopePoint[] = [];
    const startUs = clip.timelineRange.startUs;
    const durationUs = clip.timelineRange.durationUs;
    const opts = { ...DEFAULT_DUCKING_OPTIONS, ...options };
    const duckRatio = options?.duckingRatio ?? Math.pow(10, opts.duckingLevelDb / 20);

    for (let i = 0; i <= sampleCount; i++) {
      const t = startUs + Math.round((i / sampleCount) * durationUs);
      const mult = this.computeDuckingMultiplierAtTime(t, speechIntervals, options);

      let state: DuckingEnvelopePoint['state'] = 'normal';
      if (Math.abs(mult - duckRatio) < 0.05) state = 'ducked';
      else if (mult < 0.98) state = mult < 0.5 ? 'attack' : 'release';

      points.push({
        timeUs: t,
        multiplier: Math.round(mult * 1000) / 1000,
        state,
      });
    }

    return points;
  }
}

