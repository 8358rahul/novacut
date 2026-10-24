import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  interpolateKeyframe,
  getInterpolatedTransform,
  addOrUpdateKeyframe,
  removeKeyframe,
} from '../src/core/timeline/keyframes';
import { VideoClip, DEFAULT_TRANSFORM } from '../src/core/models/clip';
import { secondsToMicros } from '../src/core/models/timeline';

describe('CapCut-Grade Feature: Keyframe Animation & Interpolation', () => {
  it('interpolates scalar values accurately between bounding keyframes', () => {
    const keyframes = [
      { timeUs: 0, value: 1.0, easing: 'linear' as const },
      { timeUs: 2_000_000, value: 2.0, easing: 'linear' as const },
    ];

    // Before or at first keyframe
    assert.strictEqual(interpolateKeyframe(keyframes, 0, 1.0), 1.0);
    assert.strictEqual(interpolateKeyframe(keyframes, -100, 1.0), 1.0);

    // Halfway at 1.0s (1,000,000 µs) -> 1.5
    assert.strictEqual(interpolateKeyframe(keyframes, 1_000_000, 1.0), 1.5);

    // After last keyframe at 3.0s -> 2.0
    assert.strictEqual(interpolateKeyframe(keyframes, 3_000_000, 1.0), 2.0);
  });

  it('computes instantaneous transform resolving keyframes over clip defaults', () => {
    const clip: VideoClip = {
      id: 'clip_kf_1',
      trackId: 'track_v',
      type: 'video',
      name: 'KeyframeScene.mp4',
      assetId: 'asset_1',
      timelineRange: { startUs: 0, durationUs: secondsToMicros(4) },
      sourceRange: { startUs: 0, durationUs: secondsToMicros(4) },
      speed: 1.0,
      volume: 1.0,
      transform: { ...DEFAULT_TRANSFORM, scale: 1.0, opacity: 1.0 },
      colorAdjustments: { brightness: 0, contrast: 1, saturation: 1, temperature: 0 },
      keyframes: {
        scale: [
          { timeUs: 0, value: 1.0, easing: 'linear' },
          { timeUs: 2_000_000, value: 2.5, easing: 'linear' },
        ],
        opacity: [
          { timeUs: 0, value: 0.0, easing: 'linear' },
          { timeUs: 1_000_000, value: 1.0, easing: 'linear' },
        ],
      },
    };

    // At 1.0s: scale is halfway (1.75), opacity has reached 1.0
    const transformAt1s = getInterpolatedTransform(clip, 1_000_000);
    assert.strictEqual(transformAt1s.scale, 1.75);
    assert.strictEqual(transformAt1s.opacity, 1.0);

    // Rotation is unaffected by keyframes (stays default 0)
    assert.strictEqual(transformAt1s.rotationDeg, 0);
  });

  it('adds, updates, and removes keyframes immutably and keeps chronological order', () => {
    let track = addOrUpdateKeyframe(undefined, 'scale', 2_000_000, 2.0);
    track = addOrUpdateKeyframe(track, 'scale', 500_000, 1.2);
    track = addOrUpdateKeyframe(track, 'scale', 3_000_000, 3.0);

    // Check sorted order
    assert.strictEqual(track.scale?.length, 3);
    assert.strictEqual(track.scale?.[0].timeUs, 500_000);
    assert.strictEqual(track.scale?.[1].timeUs, 2_000_000);
    assert.strictEqual(track.scale?.[2].timeUs, 3_000_000);

    // Update existing keyframe near 2,000,000 µs
    track = addOrUpdateKeyframe(track, 'scale', 2_005_000, 2.5); // within 10ms snap threshold
    assert.strictEqual(track.scale?.length, 3);
    assert.strictEqual(track.scale?.[1].value, 2.5);

    // Remove keyframe
    track = removeKeyframe(track, 'scale', 2_000_000);
    assert.strictEqual(track.scale?.length, 2);
    assert.strictEqual(track.scale?.[0].timeUs, 500_000);
    assert.strictEqual(track.scale?.[1].timeUs, 3_000_000);
  });

  it('supports atomic setKeyframeTracks and Undo/Redo in TimelineEngine', () => {
    const { TimelineEngine, createInitialTimelineState } = require('../src/core/timeline/engine');
    const project = {
      metadata: { id: 'proj_kf', title: 'KF Test', createdAt: 0, updatedAt: 0, durationUs: 5_000_000, fps: 30, aspectRatio: '16:9' },
      tracks: [
        { id: 'track_1', name: 'Main', type: 'video', isMuted: false, isLocked: false, clips: ['clip_1'] }
      ]
    };
    const clips = {
      clip_1: {
        id: 'clip_1',
        trackId: 'track_1',
        type: 'video',
        name: 'Clip1.mp4',
        assetId: 'a1',
        timelineRange: { startUs: 0, durationUs: 5_000_000 },
        sourceRange: { startUs: 0, durationUs: 5_000_000 },
        speed: 1.0,
        volume: 1.0,
        transform: { ...DEFAULT_TRANSFORM },
        colorAdjustments: { brightness: 0, contrast: 1, saturation: 1, temperature: 0 },
      }
    };
    const initial = createInitialTimelineState(project as any);
    initial.clips = clips as any;
    const engine = new TimelineEngine(initial);

    const aiTracks = {
      translateX: [
        { timeUs: 0, value: 0, easing: 'easeInOut' as const },
        { timeUs: 2_000_000, value: 120, easing: 'easeInOut' as const },
      ],
      scale: [
        { timeUs: 0, value: 1.0, easing: 'easeInOut' as const },
        { timeUs: 2_000_000, value: 1.77, easing: 'easeInOut' as const },
      ],
    };

    engine.setKeyframeTracks('clip_1', aiTracks);
    const updatedClip = engine.getState().clips['clip_1'] as VideoClip;
    assert.strictEqual(updatedClip.keyframes?.translateX?.length, 2);
    assert.strictEqual(updatedClip.keyframes?.scale?.length, 2);

    // Test Undo
    assert.strictEqual(engine.canUndo(), true);
    engine.undo();
    const undoneClip = engine.getState().clips['clip_1'] as VideoClip;
    assert.strictEqual(undoneClip.keyframes, undefined);

    // Test Redo
    assert.strictEqual(engine.canRedo(), true);
    engine.redo();
    const redoneClip = engine.getState().clips['clip_1'] as VideoClip;
    assert.strictEqual(redoneClip.keyframes?.translateX?.[1].value, 120);
  });
});
