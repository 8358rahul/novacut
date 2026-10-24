import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  updateClipColorAdjustments,
  setClipTransition,
  updateClipTransform,
  getTransitionProgress,
} from '../src/core/timeline/effects';
import { VideoClip, AudioClip, DEFAULT_TRANSFORM } from '../src/core/models/clip';
import { secondsToMicros } from '../src/core/models/timeline';
import { Project } from '../src/core/models/project';
import { DEFAULT_EXPORT_SETTINGS } from '../src/core/models/export';
import { TimelineEngine, createInitialTimelineState } from '../src/core/timeline/engine';

describe('Phase 5: Visual Effects, Color Grading & Transitions', () => {
  const baseVideoClip: VideoClip = {
    id: 'vid_1',
    trackId: 'track_v1',
    type: 'video',
    name: 'Sample.mp4',
    assetId: 'asset_v1',
    timelineRange: {
      startUs: 0,
      durationUs: secondsToMicros(4), // 4 seconds (0 to 4,000,000 µs)
    },
    sourceRange: {
      startUs: 0,
      durationUs: secondsToMicros(4),
    },
    speed: 1.0,
    volume: 1.0,
    transform: { ...DEFAULT_TRANSFORM },
    colorAdjustments: {
      brightness: 0,
      contrast: 1.0,
      saturation: 1.0,
      temperature: 0,
    },
  };

  it('updates color adjustments immutably', () => {
    const clips = { [baseVideoClip.id]: baseVideoClip };
    const updated = updateClipColorAdjustments(clips, baseVideoClip.id, {
      brightness: 0.2,
      contrast: 1.3,
      saturation: 1.5,
    });

    const modified = updated[baseVideoClip.id] as VideoClip;
    assert.strictEqual(modified.colorAdjustments?.brightness, 0.2);
    assert.strictEqual(modified.colorAdjustments?.contrast, 1.3);
    assert.strictEqual(modified.colorAdjustments?.saturation, 1.5);
    assert.strictEqual(modified.colorAdjustments?.temperature, 0); // preserved

    // Original must remain untouched (immutability)
    assert.strictEqual(baseVideoClip.colorAdjustments.brightness, 0);
  });

  it('assigns transitions and calculates transition progress over time', () => {
    let clips: Record<string, VideoClip> = { [baseVideoClip.id]: baseVideoClip };
    // Set 1s transition out (starts at 3.0s, ends at 4.0s)
    clips = setClipTransition(clips, baseVideoClip.id, 'out', {
      type: 'dissolve',
      durationUs: secondsToMicros(1),
    }) as Record<string, VideoClip>;

    const clipWithTrans = clips[baseVideoClip.id] as VideoClip;
    assert.strictEqual(clipWithTrans.transitionOut?.type, 'dissolve');

    // At 2.5s -> no transition yet (outside 1s out window)
    const progBefore = getTransitionProgress(clipWithTrans, secondsToMicros(2.5));
    assert.strictEqual(progBefore, null);

    // At 3.5s -> exactly halfway through transition out
    const progMid = getTransitionProgress(clipWithTrans, secondsToMicros(3.5));
    assert.ok(progMid !== null);
    assert.strictEqual(progMid?.type, 'dissolve');
    assert.strictEqual(Math.round((progMid?.progress || 0) * 10) / 10, 0.5);

    // At 4.0s -> 100% progress
    const progEnd = getTransitionProgress(clipWithTrans, secondsToMicros(4.0));
    assert.ok(progEnd !== null);
    assert.strictEqual(Math.round((progEnd?.progress || 0) * 10) / 10, 1.0);
  });

  it('supports full Undo and Redo for color adjustments and transitions in TimelineEngine', () => {
    const project: Project = {
      metadata: {
        id: 'proj_effects',
        title: 'Effects Test',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        durationUs: secondsToMicros(4),
        schemaVersion: 1,
      },
      settings: {
        aspectRatio: '16:9',
        width: 1920,
        height: 1080,
        fps: 30,
        sampleRate: 44100,
        backgroundColor: '#000000',
      },
      tracks: [
        {
          id: 'track_v1',
          name: 'Video Track',
          type: 'video',
          zIndex: 0,
          isMuted: false,
          isLocked: false,
          isVisible: true,
          clips: [baseVideoClip.id],
        },
      ],
      exportSettings: { ...DEFAULT_EXPORT_SETTINGS },
    };

    const initial = createInitialTimelineState(project);
    initial.clips[baseVideoClip.id] = baseVideoClip;
    const engine = new TimelineEngine(initial);

    // 1. Update color grading
    engine.updateColorAdjustments(baseVideoClip.id, { brightness: 0.5, contrast: 1.8 });
    let state = engine.getState();
    assert.strictEqual((state.clips[baseVideoClip.id] as VideoClip).colorAdjustments?.brightness, 0.5);
    assert.strictEqual((state.clips[baseVideoClip.id] as VideoClip).colorAdjustments?.contrast, 1.8);

    // 2. Undo color grading
    assert.strictEqual(engine.canUndo(), true);
    engine.undo();
    state = engine.getState();
    assert.strictEqual((state.clips[baseVideoClip.id] as VideoClip).colorAdjustments?.brightness, 0);

    // 3. Redo color grading
    assert.strictEqual(engine.canRedo(), true);
    engine.redo();
    state = engine.getState();
    assert.strictEqual((state.clips[baseVideoClip.id] as VideoClip).colorAdjustments?.brightness, 0.5);

    // 4. Set transition
    engine.setTransition(baseVideoClip.id, 'out', {
      type: 'fade',
      durationUs: secondsToMicros(1),
    });
    state = engine.getState();
    assert.strictEqual((state.clips[baseVideoClip.id] as VideoClip).transitionOut?.type, 'fade');

    // 5. Undo transition
    engine.undo();
    state = engine.getState();
    assert.strictEqual((state.clips[baseVideoClip.id] as VideoClip).transitionOut, undefined);
  });
});
