import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  VISUAL_EFFECTS_CATALOG,
  LUT_FILTERS_CATALOG,
  computeEffectiveColorAdjustments,
} from '../src/core/effects/effectRegistry';
import { TimelineEngine, createInitialTimelineState } from '../src/core/timeline/engine';
import { VideoClip, DEFAULT_TRANSFORM, DEFAULT_COLOR_ADJUSTMENTS } from '../src/core/models/clip';
import { secondsToMicros } from '../src/core/models/timeline';
import { Project, DEFAULT_PROJECT_SETTINGS } from '../src/core/models/project';
import { DEFAULT_EXPORT_SETTINGS } from '../src/core/models/export';

describe('CapCut Video FX & 3D LUT Color Grading Engine', () => {
  it('defines comprehensive visual shader effects', () => {
    assert.ok(VISUAL_EFFECTS_CATALOG.length >= 7);
    const effectTypes = VISUAL_EFFECTS_CATALOG.map((e) => e.type);

    assert.ok(effectTypes.includes('none'));
    assert.ok(effectTypes.includes('glitch'));
    assert.ok(effectTypes.includes('film_grain'));
    assert.ok(effectTypes.includes('retro_vhs'));
    assert.ok(effectTypes.includes('zoom_blur'));
    assert.ok(effectTypes.includes('sparkle_glow'));
    assert.ok(effectTypes.includes('camera_shake'));

    VISUAL_EFFECTS_CATALOG.forEach((fx) => {
      assert.ok(fx.intensity >= 0 && fx.intensity <= 1);
      assert.ok(fx.name.length > 0);
      assert.ok(fx.icon.length > 0);
    });
  });

  it('defines comprehensive LUT color grading filters', () => {
    assert.ok(LUT_FILTERS_CATALOG.length >= 8);
    const lutIds = LUT_FILTERS_CATALOG.map((l) => l.id);

    assert.ok(lutIds.includes('lut_normal'));
    assert.ok(lutIds.includes('lut_teal_orange'));
    assert.ok(lutIds.includes('lut_vintage_70s'));
    assert.ok(lutIds.includes('lut_cyberpunk'));
    assert.ok(lutIds.includes('lut_moody_dark'));
    assert.ok(lutIds.includes('lut_vivid_warm'));
    assert.ok(lutIds.includes('lut_monochrome'));
    assert.ok(lutIds.includes('lut_fresh_pastel'));
  });

  it('computes effective color adjustments by accurately blending base values with LUT matrix', () => {
    const base = {
      brightness: 0.1,
      contrast: 1.0,
      saturation: 1.0,
      temperature: 0,
    };

    // Full Teal & Orange
    const effectiveTeal = computeEffectiveColorAdjustments(base, 'lut_teal_orange', 1.0);
    assert.strictEqual(effectiveTeal.tintRgba, 'rgba(0, 180, 216, 0.18)');
    assert.ok(effectiveTeal.contrast > 1.0);
    assert.ok(effectiveTeal.saturation > 1.0);
    assert.ok(effectiveTeal.temperature > 0);

    // 0 intensity LUT should leave base values unchanged
    const zeroIntensity = computeEffectiveColorAdjustments(base, 'lut_teal_orange', 0);
    assert.strictEqual(zeroIntensity.brightness, base.brightness);
    assert.strictEqual(zeroIntensity.contrast, base.contrast);
    assert.strictEqual(zeroIntensity.saturation, base.saturation);
    assert.strictEqual(zeroIntensity.temperature, base.temperature);

    // Monochrome LUT sets saturation towards 0
    const monochrome = computeEffectiveColorAdjustments(base, 'lut_monochrome', 1.0);
    assert.strictEqual(monochrome.saturation, 0);
  });

  it('applies LUT and visual effects to timeline clips with Undo/Redo tracking', () => {
    const clipId = 'clip_fx_test';
    const initialClip: VideoClip = {
      id: clipId,
      trackId: 'track_1',
      type: 'video',
      name: 'Test.mp4',
      assetId: 'asset_1',
      timelineRange: { startUs: 0, durationUs: secondsToMicros(5) },
      sourceRange: { startUs: 0, durationUs: secondsToMicros(5) },
      speed: 1.0,
      volume: 1.0,
      transform: { ...DEFAULT_TRANSFORM },
      colorAdjustments: { ...DEFAULT_COLOR_ADJUSTMENTS },
    };

    const project: Project = {
      metadata: {
        id: 'proj_fx',
        title: 'FX Project',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        durationUs: secondsToMicros(5),
        schemaVersion: 1,
      },
      settings: DEFAULT_PROJECT_SETTINGS['9:16'],
      exportSettings: DEFAULT_EXPORT_SETTINGS,
      tracks: [
        {
          id: 'track_1',
          name: 'Main Video',
          type: 'video',
          isLocked: false,
          isMuted: false,
          isVisible: true,
          zIndex: 1,
          clips: [clipId],
        },
      ],
    };

    const initialState = createInitialTimelineState(project);
    initialState.clips[clipId] = initialClip;
    const engine = new TimelineEngine(initialState);

    // Apply LUT filter
    engine.setLutFilter(clipId, 'lut_cyberpunk', 0.85);
    let clip = engine.getState().clips[clipId] as VideoClip;
    assert.strictEqual(clip.lutFilterId, 'lut_cyberpunk');
    assert.strictEqual(clip.lutIntensity, 0.85);

    // Apply Visual FX
    engine.setVisualEffect(clipId, 'glitch', 0.7);
    clip = engine.getState().clips[clipId] as VideoClip;
    assert.strictEqual(clip.visualEffect, 'glitch');
    assert.strictEqual(clip.visualEffectIntensity, 0.7);

    // Undo visual effect
    assert.strictEqual(engine.canUndo(), true);
    engine.undo();
    clip = engine.getState().clips[clipId] as VideoClip;
    assert.strictEqual(clip.visualEffect, undefined);
    assert.strictEqual(clip.lutFilterId, 'lut_cyberpunk'); // Still preserved

    // Undo LUT filter
    engine.undo();
    clip = engine.getState().clips[clipId] as VideoClip;
    assert.strictEqual(clip.lutFilterId, undefined);

    // Redo both
    engine.redo();
    clip = engine.getState().clips[clipId] as VideoClip;
    assert.strictEqual(clip.lutFilterId, 'lut_cyberpunk');

    engine.redo();
    clip = engine.getState().clips[clipId] as VideoClip;
    assert.strictEqual(clip.visualEffect, 'glitch');
  });
});
