import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  buildExportCompositionPlan,
  generateFfmpegCommand,
} from '../src/core/rendering/exporter';
import { ProjectStorage } from '../src/core/persistence/storage';
import { VideoClip, AudioClip, DEFAULT_TRANSFORM, DEFAULT_COLOR_ADJUSTMENTS } from '../src/core/models/clip';
import { DEFAULT_EXPORT_SETTINGS } from '../src/core/models/export';

describe('Milestone D: Media Export Pipeline & Composition Plan', () => {
  const storage = new ProjectStorage();

  it('builds a deterministic export composition plan preserving trim bounds and order', () => {
    const project = storage.createProject('Summer Vacation', '16:9');

    // Add 2 video clips to video track
    const v1: VideoClip = {
      id: 'v1',
      trackId: 'track_video_1',
      type: 'video',
      name: 'Beach.mp4',
      assetId: 'asset_beach',
      timelineRange: { startUs: 0, durationUs: 4_000_000 },       // 0 to 4s
      sourceRange: { startUs: 1_000_000, durationUs: 4_000_000 }, // trimmed: starts 1s into source
      speed: 1.0,
      volume: 1.0,
      transform: DEFAULT_TRANSFORM,
      colorAdjustments: DEFAULT_COLOR_ADJUSTMENTS,
    };

    const v2: VideoClip = {
      id: 'v2',
      trackId: 'track_video_1',
      type: 'video',
      name: 'Sunset.mp4',
      assetId: 'asset_sunset',
      timelineRange: { startUs: 4_000_000, durationUs: 3_000_000 }, // 4s to 7s
      sourceRange: { startUs: 500_000, durationUs: 3_000_000 },
      speed: 1.5, // fast forward
      volume: 0.8,
      transform: DEFAULT_TRANSFORM,
      colorAdjustments: DEFAULT_COLOR_ADJUSTMENTS,
    };

    // Add audio track clip
    const a1: AudioClip = {
      id: 'a1',
      trackId: 'track_audio_1',
      type: 'audio',
      name: 'Music.mp3',
      assetId: 'asset_music',
      timelineRange: { startUs: 0, durationUs: 7_000_000 },
      sourceRange: { startUs: 0, durationUs: 7_000_000 },
      volume: 0.6,
      fadeInDurationUs: 500_000,
      fadeOutDurationUs: 500_000,
      speed: 1.0,
    };

    project.tracks[0].clips = ['v1', 'v2'];
    project.tracks[1].clips = ['a1'];

    const clips = { v1, v2, a1 };
    const assetUriMap = {
      asset_beach: 'file:///movies/beach.mp4',
      asset_sunset: 'file:///movies/sunset.mp4',
      asset_music: 'file:///music/chill.mp3',
    };

    const plan = buildExportCompositionPlan(project, clips, assetUriMap, {
      ...DEFAULT_EXPORT_SETTINGS,
      resolutionPreset: '1080p',
      width: 1920,
      height: 1080,
      fps: 30,
      videoBitrateMbps: 10,
      audioBitrateKbps: 192,
    });

    // 1. Verify output specifications
    assert.strictEqual(plan.outputResolution.width, 1920);
    assert.strictEqual(plan.outputResolution.height, 1080);
    assert.strictEqual(plan.fps, 30);
    assert.strictEqual(plan.totalDurationSec, 7.0);

    // 2. Verify video segments preserve trim boundaries and order
    const videoSegs = plan.segments.filter((s) => s.trackType === 'video');
    assert.strictEqual(videoSegs.length, 2);

    // First clip: source starts at 1s, runs for 4s
    assert.strictEqual(videoSegs[0].sourceUri, 'file:///movies/beach.mp4');
    assert.strictEqual(videoSegs[0].sourceStartSec, 1.0);
    assert.strictEqual(videoSegs[0].sourceDurationSec, 4.0);
    assert.strictEqual(videoSegs[0].outputStartSec, 0);

    // Second clip: source starts at 0.5s, speed is 1.5x
    assert.strictEqual(videoSegs[1].sourceUri, 'file:///movies/sunset.mp4');
    assert.strictEqual(videoSegs[1].sourceStartSec, 0.5);
    assert.strictEqual(videoSegs[1].sourceDurationSec, 3.0);
    assert.strictEqual(videoSegs[1].speed, 1.5);
    assert.strictEqual(videoSegs[1].volume, 0.8);
    assert.strictEqual(videoSegs[1].outputStartSec, 4.0);

    // 3. Verify audio segment
    const audioSegs = plan.segments.filter((s) => s.trackType === 'audio');
    assert.strictEqual(audioSegs.length, 1);
    assert.strictEqual(audioSegs[0].sourceUri, 'file:///music/chill.mp3');
    assert.strictEqual(audioSegs[0].volume, 0.6);

    // 4. Verify file size estimation
    // 7s * (10 + 0.192 Mbps) / 8 = ~8.92 MB
    assert.ok(plan.estimatedFileSizeMb > 8 && plan.estimatedFileSizeMb < 10);
  });

  it('generates an executable FFmpeg rendering argument vector', () => {
    const project = storage.createProject('Test CLI', '9:16');
    const plan = buildExportCompositionPlan(project, {}, {}, {
      ...DEFAULT_EXPORT_SETTINGS,
      width: 1080,
      height: 1920,
      fps: 30,
      videoBitrateMbps: 12,
      audioBitrateKbps: 192,
    });

    const outputPath = 'D:/work/capcut/novacut/exports/output.mp4';
    const args = generateFfmpegCommand(plan, outputPath);

    // Validates essential H.264/AAC encoding flags
    assert.ok(args.includes('-y'));
    assert.ok(args.includes('libx264'));
    assert.ok(args.includes('aac'));
    assert.ok(args.includes('+faststart'));
    assert.strictEqual(args[args.length - 1], outputPath);
  });
});
