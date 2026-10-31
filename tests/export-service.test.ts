import test from 'node:test';
import assert from 'node:assert/strict';
import { collectExportClips } from '../src/services/exportService';
import { AIEngineService } from '../src/services/aiEngineService';
import { ProjectStorage } from '../src/core/persistence/storage';
import { DEFAULT_TRANSFORM, DEFAULT_COLOR_ADJUSTMENTS, VideoClip } from '../src/core/models/clip';

test('export preserves mute, trim and speed and rejects unsupported edits', () => {
  const project = new ProjectStorage().createProject('Render', '16:9');
  const clip: VideoClip = { id: 'v', trackId: project.tracks[0].id, type: 'video', name: 'video',
    assetId: 'a', timelineRange: {startUs: 1000000, durationUs: 2000000},
    sourceRange: {startUs: 500000, durationUs: 4000000}, speed: 2, volume: 0,
    transform: {...DEFAULT_TRANSFORM}, colorAdjustments: {...DEFAULT_COLOR_ADJUSTMENTS} };
  project.clips = {v: clip};
  project.assets = {a: { id: 'a', uri: 'file:///video.mp4', name: 'video', type: 'video', createdAt: 0, metadata: {} } as any};
  const output = collectExportClips(project)[0];
  assert.equal(output.volume, 0);
  assert.equal(output.startUs, 1000000);
  assert.equal(output.sourceStartUs, 500000);
  assert.equal(output.speed, 2);
  clip.visualEffect = 'film_grain';
  clip.visualEffectIntensity = 0;
  clip.lutFilterId = 'lut_monochrome';
  clip.lutIntensity = 1;
  const graded = collectExportClips(project)[0];
  assert.equal(graded.visualEffect, 'film_grain');
  assert.equal(graded.visualEffectIntensity, 0);
  assert.equal(graded.colorAdjustments?.saturation, 0);
  clip.transform.scale = 2;
  assert.throws(() => collectExportClips(project), /not supported/);
  project.tracks[0].isVisible = false;
  assert.equal(collectExportClips(project).length, 0);
});

test('failed uploads do not fall back to a device-only path', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => ({ok: false, status: 413})) as typeof fetch;
  try {
    await assert.rejects(new AIEngineService().uploadIfLocalMedia('file:///video.mp4'), /upload failed \(413\)/);
  } finally { globalThis.fetch = original; }
});
