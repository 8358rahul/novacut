import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  calculateAudioGainAtTime,
  generateWaveformProfile,
} from '../src/core/timeline/audioMixer';
import { AudioClip } from '../src/core/models/clip';
import { secondsToMicros } from '../src/core/models/timeline';

describe('Phase 5: Audio Mixer & Gain Ramp Calculations', () => {
  const sampleAudioClip: AudioClip = {
    id: 'aud_clip_1',
    trackId: 'track_aud',
    type: 'audio',
    name: 'Voiceover.mp3',
    assetId: 'asset_1',
    timelineRange: {
      startUs: secondsToMicros(2), // starts at 2.0s (2,000,000 µs)
      durationUs: secondsToMicros(10), // ends at 12.0s (12,000,000 µs)
    },
    sourceRange: {
      startUs: 0,
      durationUs: secondsToMicros(10),
    },
    volume: 0.8,
    fadeInDurationUs: secondsToMicros(2), // 2s fade in
    fadeOutDurationUs: secondsToMicros(2), // 2s fade out
    speed: 1.0,
  };

  it('returns 0 gain outside clip boundary', () => {
    // Before start
    assert.strictEqual(calculateAudioGainAtTime(sampleAudioClip, secondsToMicros(1)), 0);
    // After end
    assert.strictEqual(calculateAudioGainAtTime(sampleAudioClip, secondsToMicros(13)), 0);
  });

  it('computes linear fade-in ramp accurately', () => {
    // Exactly at start (2.0s) -> gain is 0
    const gainAtStart = calculateAudioGainAtTime(sampleAudioClip, secondsToMicros(2));
    assert.strictEqual(gainAtStart, 0);

    // Halfway through 2s fade-in (at 3.0s, elapsed = 1.0s) -> 50% of 0.8 = 0.4
    const gainMidFadeIn = calculateAudioGainAtTime(sampleAudioClip, secondsToMicros(3));
    assert.strictEqual(Math.round(gainMidFadeIn * 100) / 100, 0.4);

    // At completion of fade-in (4.0s) -> full base volume 0.8
    const gainFull = calculateAudioGainAtTime(sampleAudioClip, secondsToMicros(4));
    assert.strictEqual(Math.round(gainFull * 100) / 100, 0.8);
  });

  it('maintains steady base volume between fade-in and fade-out', () => {
    // At 7.0s (well between 4.0s and 10.0s)
    const steadyGain = calculateAudioGainAtTime(sampleAudioClip, secondsToMicros(7));
    assert.strictEqual(steadyGain, 0.8);
  });

  it('computes linear fade-out ramp accurately', () => {
    // Start of fade-out at 10.0s (remaining = 2.0s) -> full volume 0.8
    const gainStartFadeOut = calculateAudioGainAtTime(sampleAudioClip, secondsToMicros(10));
    assert.strictEqual(Math.round(gainStartFadeOut * 100) / 100, 0.8);

    // Halfway through fade-out at 11.0s (remaining = 1.0s) -> 50% of 0.8 = 0.4
    const gainMidFadeOut = calculateAudioGainAtTime(sampleAudioClip, secondsToMicros(11));
    assert.strictEqual(Math.round(gainMidFadeOut * 100) / 100, 0.4);

    // Near end of fade-out at 11.9s (remaining = 0.1s) -> 0.05 * 0.8 = 0.04
    const gainNearEnd = calculateAudioGainAtTime(sampleAudioClip, secondsToMicros(11.9));
    assert.ok(gainNearEnd < 0.1 && gainNearEnd > 0);
  });

  it('generates deterministic normalized waveform profiles', () => {
    const waveform = generateWaveformProfile(secondsToMicros(5), 30);
    assert.strictEqual(waveform.length, 30);

    // All sample values must be within normalized visual range [0.15, 1.0]
    for (const val of waveform) {
      assert.ok(val >= 0.15 && val <= 1.0, `Waveform value out of bounds: ${val}`);
    }

    // Deterministic repeatability
    const repeatWaveform = generateWaveformProfile(secondsToMicros(5), 30);
    assert.deepStrictEqual(waveform, repeatWaveform);
  });
});
