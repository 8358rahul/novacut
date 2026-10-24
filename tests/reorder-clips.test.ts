import { describe, it } from 'node:test';
import assert from 'node:assert';
import { reorderClips, moveClip } from '../src/core/timeline/operations';
import { TimelineEngine, createInitialTimelineState } from '../src/core/timeline/engine';
import { ProjectStorage } from '../src/core/persistence/storage';
import { VideoClip, DEFAULT_TRANSFORM, DEFAULT_COLOR_ADJUSTMENTS } from '../src/core/models/clip';
import { TimelineTrack } from '../src/core/models/timeline';

describe('Milestone C: Clip Reordering, Moving & Timeline Snapping', () => {
  const mockTrack: TimelineTrack = {
    id: 't_video',
    type: 'video',
    name: 'Video 1',
    isMuted: false,
    isLocked: false,
    isVisible: true,
    zIndex: 1,
    clips: ['c1', 'c2', 'c3'],
  };

  const createClip = (id: string, startUs: number, durationUs: number): VideoClip => ({
    id,
    trackId: mockTrack.id,
    type: 'video',
    name: `Clip ${id}`,
    assetId: `asset_${id}`,
    timelineRange: { startUs, durationUs },
    sourceRange: { startUs: 0, durationUs },
    speed: 1.0,
    volume: 1.0,
    transform: DEFAULT_TRANSFORM,
    colorAdjustments: DEFAULT_COLOR_ADJUSTMENTS,
  });

  it('reorders clips within a track and cascades sequential timeline starts', () => {
    // Initial: c1 (0-2s), c2 (2-5s), c3 (5-9s)
    const c1 = createClip('c1', 0, 2_000_000);
    const c2 = createClip('c2', 2_000_000, 3_000_000);
    const c3 = createClip('c3', 5_000_000, 4_000_000);
    const clips = { c1, c2, c3 };

    // Move c3 to the beginning (targetIndex 0): order should become [c3, c1, c2]
    const result = reorderClips(mockTrack, clips, 'c3', 0);

    assert.deepStrictEqual(result.updatedTrack.clips, ['c3', 'c1', 'c2']);

    // c3 should start at 0 and run for 4s
    assert.strictEqual(result.updatedClips['c3'].timelineRange.startUs, 0);
    assert.strictEqual(result.updatedClips['c3'].timelineRange.durationUs, 4_000_000);

    // c1 should now start at 4s and run for 2s (ends at 6s)
    assert.strictEqual(result.updatedClips['c1'].timelineRange.startUs, 4_000_000);
    assert.strictEqual(result.updatedClips['c1'].timelineRange.durationUs, 2_000_000);

    // c2 should now start at 6s and run for 3s (ends at 9s)
    assert.strictEqual(result.updatedClips['c2'].timelineRange.startUs, 6_000_000);
    assert.strictEqual(result.updatedClips['c2'].timelineRange.durationUs, 3_000_000);
  });

  it('moves a clip start position directly', () => {
    const c1 = createClip('c1', 0, 2_000_000);
    const updated = moveClip({ c1 }, 'c1', 1_500_000);

    assert.strictEqual(updated['c1'].timelineRange.startUs, 1_500_000);
    assert.strictEqual(updated['c1'].timelineRange.durationUs, 2_000_000);
  });

  it('reorders clips with reversible Undo/Redo cycles in TimelineEngine', () => {
    const storage = new ProjectStorage();
    const project = storage.createProject('Test Reorder', '16:9');
    const engine = new TimelineEngine(createInitialTimelineState(project));

    const c1 = { ...createClip('c1', 0, 2_000_000), trackId: 'track_video_1' };
    const c2 = { ...createClip('c2', 2_000_000, 2_000_000), trackId: 'track_video_1' };
    engine.addClip('track_video_1', c1);
    engine.addClip('track_video_1', c2);

    const initialOrder = [...engine.getState().project.tracks[0].clips];
    assert.deepStrictEqual(initialOrder, ['c1', 'c2']);

    // Reorder c2 to index 0 -> order becomes [c2, c1]
    engine.reorderClip('c2', 0);
    assert.deepStrictEqual(engine.getState().project.tracks[0].clips, ['c2', 'c1']);
    assert.strictEqual(engine.getState().clips['c2'].timelineRange.startUs, 0);
    assert.strictEqual(engine.getState().clips['c1'].timelineRange.startUs, 2_000_000);

    // Undo -> order returns to [c1, c2]
    engine.undo();
    assert.deepStrictEqual(engine.getState().project.tracks[0].clips, ['c1', 'c2']);

    // Redo -> order reapplies to [c2, c1]
    engine.redo();
    assert.deepStrictEqual(engine.getState().project.tracks[0].clips, ['c2', 'c1']);
  });
});
