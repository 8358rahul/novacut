import { describe, it } from 'node:test';
import assert from 'node:assert';
import { MediaAsset } from '../src/core/models/asset';
import { VideoClip, DEFAULT_TRANSFORM, DEFAULT_COLOR_ADJUSTMENTS } from '../src/core/models/clip';
import { secondsToMicros } from '../src/core/models/timeline';

describe('Media Import Service & Asset Translation', () => {
  it('correctly constructs MediaAsset and VideoClip models from picked document metadata', () => {
    const mockPickedFile = {
      uri: 'file:///data/user/0/com.novacut/cache/test_video.mp4',
      name: 'travel_vlog.mp4',
      size: 15_420_000,
      mimeType: 'video/mp4',
    };

    const trackId = 'track_video_1';
    const startTimelineUs = 2_000_000;
    const durationUs = secondsToMicros(10); // 10 seconds

    const asset: MediaAsset = {
      id: 'asset_test_1',
      uri: mockPickedFile.uri,
      name: mockPickedFile.name,
      type: 'video',
      metadata: {
        width: 1920,
        height: 1080,
        durationUs,
        fps: 30,
        mimeType: mockPickedFile.mimeType,
        fileSize: mockPickedFile.size,
        hasAudio: true,
      },
      createdAt: Date.now(),
    };

    const clip: VideoClip = {
      id: 'clip_vid_test_1',
      trackId,
      type: 'video',
      name: mockPickedFile.name,
      assetId: asset.id,
      timelineRange: {
        startUs: startTimelineUs,
        durationUs,
      },
      sourceRange: {
        startUs: 0,
        durationUs,
      },
      speed: 1.0,
      volume: 1.0,
      transform: DEFAULT_TRANSFORM,
      colorAdjustments: DEFAULT_COLOR_ADJUSTMENTS,
    };

    assert.strictEqual(clip.trackId, 'track_video_1');
    assert.strictEqual(clip.timelineRange.startUs, 2_000_000);
    assert.strictEqual(clip.timelineRange.durationUs, 10_000_000);
    assert.strictEqual(clip.sourceRange.startUs, 0);
    assert.strictEqual(clip.sourceRange.durationUs, 10_000_000);
    assert.strictEqual(asset.metadata.mimeType, 'video/mp4');
  });
});
