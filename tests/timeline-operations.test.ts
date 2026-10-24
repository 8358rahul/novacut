import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  trimClipStart,
  trimClipEnd,
  splitClip,
  deleteClip,
  duplicateClip,
  changeClipSpeed,
  changeClipVolume,
} from '../src/core/timeline/operations';
import { Clip, VideoClip, DEFAULT_TRANSFORM, DEFAULT_COLOR_ADJUSTMENTS } from '../src/core/models/clip';
import { TimelineTrack } from '../src/core/models/timeline';

describe('Non-Destructive Timeline Operations', () => {
  const mockTrack: TimelineTrack = {
    id: 't_video',
    type: 'video',
    name: 'Video 1',
    isMuted: false,
    isLocked: false,
    isVisible: true,
    zIndex: 1,
    clips: ['clip_1'],
  };

  const createMockVideoClip = (id: string, startUs: number, durationUs: number): VideoClip => ({
    id,
    trackId: mockTrack.id,
    type: 'video',
    name: 'Video Clip',
    assetId: 'asset_1',
    timelineRange: { startUs, durationUs },
    sourceRange: { startUs: 0, durationUs },
    speed: 1.0,
    volume: 1.0,
    transform: DEFAULT_TRANSFORM,
    colorAdjustments: DEFAULT_COLOR_ADJUSTMENTS,
  });

  it('trims clip start and shifts sourceRange proportionally', () => {
    const clip = createMockVideoClip('clip_1', 1_000_000, 4_000_000);
    const clips = { [clip.id]: clip };

    // Move start from 1s to 2s (+1s shift)
    const result = trimClipStart(mockTrack, clips, 'clip_1', 2_000_000);
    const updated = result.updatedClips['clip_1'] as VideoClip;

    assert.strictEqual(updated.timelineRange.startUs, 2_000_000);
    assert.strictEqual(updated.timelineRange.durationUs, 3_000_000);
    assert.strictEqual(updated.sourceRange.startUs, 1_000_000);
    assert.strictEqual(updated.sourceRange.durationUs, 3_000_000);
  });

  it('trims clip end without shifting source start', () => {
    const clip = createMockVideoClip('clip_1', 1_000_000, 4_000_000);
    const clips = { [clip.id]: clip };

    // Move end from 5s to 3.5s (2.5s duration)
    const result = trimClipEnd(mockTrack, clips, 'clip_1', 3_500_000);
    const updated = result.updatedClips['clip_1'] as VideoClip;

    assert.strictEqual(updated.timelineRange.startUs, 1_000_000);
    assert.strictEqual(updated.timelineRange.durationUs, 2_500_000);
    assert.strictEqual(updated.sourceRange.startUs, 0);
    assert.strictEqual(updated.sourceRange.durationUs, 2_500_000);
  });

  it('splits a clip cleanly into two consecutive segments', () => {
    const clip = createMockVideoClip('clip_1', 1_000_000, 4_000_000); // 1s to 5s
    const clips = { [clip.id]: clip };

    // Split at 3s (1s + 2s into the clip)
    const result = splitClip(mockTrack, clips, 'clip_1', 3_000_000);
    assert.ok(result.newClipId);

    const first = result.updatedClips['clip_1'] as VideoClip;
    const second = result.updatedClips[result.newClipId!] as VideoClip;

    // First clip: 1s to 3s (2s duration)
    assert.strictEqual(first.timelineRange.startUs, 1_000_000);
    assert.strictEqual(first.timelineRange.durationUs, 2_000_000);
    assert.strictEqual(first.sourceRange.startUs, 0);
    assert.strictEqual(first.sourceRange.durationUs, 2_000_000);

    // Second clip: 3s to 5s (2s duration)
    assert.strictEqual(second.timelineRange.startUs, 3_000_000);
    assert.strictEqual(second.timelineRange.durationUs, 2_000_000);
    assert.strictEqual(second.sourceRange.startUs, 2_000_000);
    assert.strictEqual(second.sourceRange.durationUs, 2_000_000);

    // Track order updated
    assert.strictEqual(result.updatedTrack.clips.length, 2);
    assert.strictEqual(result.updatedTrack.clips[0], 'clip_1');
    assert.strictEqual(result.updatedTrack.clips[1], result.newClipId);
  });

  it('throws error when splitting outside clip bounds', () => {
    const clip = createMockVideoClip('clip_1', 1_000_000, 4_000_000);
    const clips = { [clip.id]: clip };

    assert.throws(() => {
      splitClip(mockTrack, clips, 'clip_1', 500_000); // before clip start
    });

    assert.throws(() => {
      splitClip(mockTrack, clips, 'clip_1', 5_500_000); // after clip end
    });
  });

  it('deletes clip and supports ripple mode', () => {
    const clip1 = createMockVideoClip('c1', 0, 2_000_000);
    const clip2 = createMockVideoClip('c2', 2_000_000, 3_000_000);
    const track: TimelineTrack = { ...mockTrack, clips: ['c1', 'c2'] };
    const clips = { c1: clip1, c2: clip2 };

    // Delete c1 with ripple: c2 should slide left by 2s
    const result = deleteClip(track, clips, 'c1', true);
    assert.strictEqual(result.updatedClips['c1'], undefined);
    assert.strictEqual(result.updatedTrack.clips.length, 1);
    assert.strictEqual(result.updatedTrack.clips[0], 'c2');
    assert.strictEqual(result.updatedClips['c2'].timelineRange.startUs, 0);
  });

  it('duplicates a clip immediately following the original', () => {
    const clip = createMockVideoClip('c1', 1_000_000, 2_000_000); // ends at 3s
    const clips = { c1: clip };

    const result = duplicateClip(mockTrack, clips, 'c1');
    assert.ok(result.newClipId);
    const copy = result.updatedClips[result.newClipId!];

    assert.strictEqual(copy.timelineRange.startUs, 3_000_000);
    assert.strictEqual(copy.timelineRange.durationUs, 2_000_000);
    assert.strictEqual(result.updatedTrack.clips.length, 2);
  });

  it('changes clip speed and recalculates timeline duration inversely', () => {
    const clip = createMockVideoClip('c1', 0, 4_000_000); // 4s source at 1x
    const clips = { c1: clip };

    // Change to 2x speed -> timeline duration should halve to 2s
    const res2x = changeClipSpeed(clips, 'c1', 2.0);
    const clip2x = res2x['c1'] as VideoClip;
    assert.strictEqual(clip2x.speed, 2.0);
    assert.strictEqual(clip2x.timelineRange.durationUs, 2_000_000);

    // Change to 0.5x speed -> timeline duration should double to 8s
    const resHalf = changeClipSpeed(clips, 'c1', 0.5);
    const clipHalf = resHalf['c1'] as VideoClip;
    assert.strictEqual(clipHalf.speed, 0.5);
    assert.strictEqual(clipHalf.timelineRange.durationUs, 8_000_000);
  });

  it('changes clip volume within clamped range [0.0, 2.0]', () => {
    const clip = createMockVideoClip('c1', 0, 2_000_000);
    const clips = { c1: clip };

    const res1 = changeClipVolume(clips, 'c1', 1.5);
    assert.strictEqual((res1['c1'] as VideoClip).volume, 1.5);

    const resClampHigh = changeClipVolume(clips, 'c1', 3.0);
    assert.strictEqual((resClampHigh['c1'] as VideoClip).volume, 2.0);

    const resClampLow = changeClipVolume(clips, 'c1', -0.5);
    assert.strictEqual((resClampLow['c1'] as VideoClip).volume, 0);
  });
});
