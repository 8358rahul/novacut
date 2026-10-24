import { describe, it } from 'node:test';
import assert from 'node:assert';
import { TimelineEngine, createInitialTimelineState } from '../src/core/timeline/engine';
import { ProjectStorage } from '../src/core/persistence/storage';
import { VideoClip, DEFAULT_TRANSFORM, DEFAULT_COLOR_ADJUSTMENTS } from '../src/core/models/clip';

describe('TimelineEngine History Stack (Undo & Redo)', () => {
  const storage = new ProjectStorage();

  it('performs full undo and redo cycles across trim and split operations', () => {
    const project = storage.createProject('Test Project', '16:9');
    const engine = new TimelineEngine(createInitialTimelineState(project));

    // Initially cannot undo or redo
    assert.strictEqual(engine.canUndo(), false);
    assert.strictEqual(engine.canRedo(), false);

    // 1. Add clip
    const clip1: VideoClip = {
      id: 'clip_v1',
      trackId: 'track_video_1',
      type: 'video',
      name: 'Video One',
      assetId: 'asset_1',
      timelineRange: { startUs: 0, durationUs: 6_000_000 }, // 6 seconds
      sourceRange: { startUs: 0, durationUs: 6_000_000 },
      speed: 1,
      volume: 1,
      transform: DEFAULT_TRANSFORM,
      colorAdjustments: DEFAULT_COLOR_ADJUSTMENTS,
    };
    engine.addClip('track_video_1', clip1);

    assert.strictEqual(engine.canUndo(), true);
    assert.strictEqual(engine.canRedo(), false);
    assert.ok(engine.getState().clips['clip_v1']);

    // 2. Split clip at 2s
    const secondClipId = engine.split('clip_v1', 2_000_000);
    assert.ok(secondClipId);
    assert.strictEqual(Object.keys(engine.getState().clips).length, 2);
    assert.strictEqual(engine.getState().clips['clip_v1'].timelineRange.durationUs, 2_000_000);

    // 3. Undo split
    engine.undo();
    assert.strictEqual(Object.keys(engine.getState().clips).length, 1);
    assert.strictEqual(engine.getState().clips['clip_v1'].timelineRange.durationUs, 6_000_000);
    assert.strictEqual(engine.canRedo(), true);

    // 4. Redo split
    engine.redo();
    assert.strictEqual(Object.keys(engine.getState().clips).length, 2);
    assert.strictEqual(engine.getState().clips['clip_v1'].timelineRange.durationUs, 2_000_000);

    // 5. Trim start of first clip to 500ms
    engine.trimStart('clip_v1', 500_000);
    assert.strictEqual(engine.getState().clips['clip_v1'].timelineRange.startUs, 500_000);
    assert.strictEqual(engine.getState().clips['clip_v1'].timelineRange.durationUs, 1_500_000);

    // 6. Undo trim
    engine.undo();
    assert.strictEqual(engine.getState().clips['clip_v1'].timelineRange.startUs, 0);
    assert.strictEqual(engine.getState().clips['clip_v1'].timelineRange.durationUs, 2_000_000);
  });
});
