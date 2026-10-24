import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  millisToMicros,
  microsToMillis,
  secondsToMicros,
  microsToSeconds,
  formatTimecode,
  framesToMicros,
  microsToFrames,
} from '../src/core/models/timeline';
import {
  getTrackBounds,
  calculateProjectDurationUs,
  findActiveClipAtTime,
  calculateSourceTimeUs,
  snapTimeToPoints,
} from '../src/core/timeline/calculator';
import { Clip, VideoClip, DEFAULT_TRANSFORM, DEFAULT_COLOR_ADJUSTMENTS } from '../src/core/models/clip';

describe('Timeline Calculator & Timebase Math', () => {
  it('converts between seconds, milliseconds, and microseconds with zero precision loss', () => {
    const sec = 5.5;
    const us = secondsToMicros(sec);
    assert.strictEqual(us, 5_500_000);
    assert.strictEqual(microsToSeconds(us), 5.5);

    const ms = 250;
    const usFromMs = millisToMicros(ms);
    assert.strictEqual(usFromMs, 250_000);
    assert.strictEqual(microsToMillis(usFromMs), 250);
  });

  it('correctly calculates frame numbers from microseconds', () => {
    const fps = 30;
    const oneSecUs = 1_000_000;
    assert.strictEqual(microsToFrames(oneSecUs, fps), 30);
    assert.strictEqual(framesToMicros(30, fps), 1_000_000);
  });

  it('formats timecode properly', () => {
    assert.strictEqual(formatTimecode(0), '00:00.00');
    assert.strictEqual(formatTimecode(1_500_000), '00:01.50');
    assert.strictEqual(formatTimecode(65_250_000), '01:05.25');
    assert.strictEqual(formatTimecode(3661_000_000, true), '01:01:01.00');
  });

  it('calculates track bounds accurately', () => {
    const clip1: Clip = {
      id: 'c1',
      trackId: 't1',
      type: 'video',
      name: 'Clip 1',
      assetId: 'a1',
      timelineRange: { startUs: 1_000_000, durationUs: 3_000_000 },
      sourceRange: { startUs: 0, durationUs: 3_000_000 },
      speed: 1,
      volume: 1,
      transform: DEFAULT_TRANSFORM,
      colorAdjustments: DEFAULT_COLOR_ADJUSTMENTS,
    } as VideoClip;

    const clip2: Clip = {
      id: 'c2',
      trackId: 't1',
      type: 'video',
      name: 'Clip 2',
      assetId: 'a2',
      timelineRange: { startUs: 4_500_000, durationUs: 2_000_000 },
      sourceRange: { startUs: 0, durationUs: 2_000_000 },
      speed: 1,
      volume: 1,
      transform: DEFAULT_TRANSFORM,
      colorAdjustments: DEFAULT_COLOR_ADJUSTMENTS,
    } as VideoClip;

    const bounds = getTrackBounds([clip1, clip2]);
    assert.strictEqual(bounds.startUs, 1_000_000);
    assert.strictEqual(bounds.endUs, 6_500_000);
    assert.strictEqual(bounds.durationUs, 5_500_000);

    const emptyBounds = getTrackBounds([]);
    assert.strictEqual(emptyBounds.durationUs, 0);
  });

  it('finds active clip at exact playhead timestamp', () => {
    const clip: Clip = {
      id: 'c1',
      trackId: 't1',
      type: 'video',
      name: 'Scene',
      assetId: 'a1',
      timelineRange: { startUs: 2_000_000, durationUs: 4_000_000 },
      sourceRange: { startUs: 0, durationUs: 4_000_000 },
      speed: 1,
      volume: 1,
      transform: DEFAULT_TRANSFORM,
      colorAdjustments: DEFAULT_COLOR_ADJUSTMENTS,
    } as VideoClip;

    assert.strictEqual(findActiveClipAtTime([clip], 1_999_999), null);
    assert.strictEqual(findActiveClipAtTime([clip], 2_000_000)?.id, 'c1');
    assert.strictEqual(findActiveClipAtTime([clip], 4_000_000)?.id, 'c1');
    assert.strictEqual(findActiveClipAtTime([clip], 5_999_999)?.id, 'c1');
    assert.strictEqual(findActiveClipAtTime([clip], 6_000_000), null);
  });

  it('calculates source time mapping with variable clip speed', () => {
    // Normal speed
    const src1 = calculateSourceTimeUs(3_000_000, 2_000_000, 500_000, 1.0);
    assert.strictEqual(src1, 1_500_000);

    // 2x Fast forward
    const src2x = calculateSourceTimeUs(3_000_000, 2_000_000, 0, 2.0);
    assert.strictEqual(src2x, 2_000_000);

    // 0.5x Slow motion
    const srcHalf = calculateSourceTimeUs(3_000_000, 2_000_000, 0, 0.5);
    assert.strictEqual(srcHalf, 500_000);
  });

  it('snaps time accurately to nearby snap points within threshold', () => {
    const snapPoints = [0, 2_000_000, 5_000_000];
    const thresholdUs = 150_000; // 150ms

    // Close to 2s
    const res1 = snapTimeToPoints(2_050_000, snapPoints, thresholdUs);
    assert.strictEqual(res1.didSnap, true);
    assert.strictEqual(res1.snappedTimeUs, 2_000_000);

    // Beyond threshold
    const res2 = snapTimeToPoints(2_200_000, snapPoints, thresholdUs);
    assert.strictEqual(res2.didSnap, false);
    assert.strictEqual(res2.snappedTimeUs, 2_200_000);
  });
});
