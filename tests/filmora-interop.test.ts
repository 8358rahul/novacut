import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  importFilmoraProject,
  exportFilmoraProject,
  dbToLinearGain,
  linearGainToDb,
  calculateAspectRatio,
  FilmoraProjectPackage,
  AudioDuckingEngine,
  ChunkDownloaderEngine,
} from '../src/core/filmora';
import { Project } from '../src/core/models/project';
import { AudioClip, VideoClip } from '../src/core/models/clip';

describe('Filmora Project (.wfp / .wesproj) Interop Engine', () => {
  const sampleFilmoraPackage: FilmoraProjectPackage = {
    projectInfo: {
      project_file_name: 'Summer_Vlog_Filmora',
      timeline_mediaId: 'media-vlog-001',
      project_timeline_duration: 10_000_000, // 10 seconds in microseconds
      project_sample_rate: 48000,
      version: '16.0.0',
    },
    timelineRoot: {
      timelineInfos: [
        {
          resolutionWidth: 1920,
          resolutionHeight: 1080,
          frameRate: { num: 30, den: 1 },
          sampleRate: 48000,
          resources: [
            {
              sourceUuid: 'res-video-1',
              filename: 'file:///C:/Media/drone_shot.mp4',
              videoStreamCount: 1,
              audioStreamCount: 1,
              width: 1920,
              height: 1080,
              duration: 15_000_000,
            },
            {
              sourceUuid: 'res-audio-bgm',
              filename: 'file:///C:/Media/ambient_music.mp3',
              videoStreamCount: 0,
              audioStreamCount: 1,
              duration: 30_000_000,
            },
          ],
          trackInfos: [
            {
              uuid: 'track-v1',
              trackType: 1, // Video
              name: 'Main Video Track',
              clipList: [
                {
                  thisUId: 'clip-v1',
                  sourceUuid: 'res-video-1',
                  filename: 'file:///C:/Media/drone_shot.mp4',
                  type: 0,
                  streamId: 0,
                  tlBegin: 0,
                  tlEnd: 5_000_000, // 5 seconds
                  inPoint: 1_000_000,
                  outPoint: 6_000_000,
                  speed: { speedRatio: 1.0, reverse: false },
                  effectChainList: [
                    {
                      effectList: [
                        {
                          id: 'audio/effect/volume',
                          paramList: [
                            {
                              name: 'VolumeGain',
                              fxParam: { unValue: -6.0 }, // -6 dB
                            },
                          ],
                        },
                        {
                          id: 'video/effect/transform',
                          paramList: [
                            { name: 'Scale', fxParam: { unValue: 1.2 } },
                            { name: 'Rotation', fxParam: { unValue: 15 } },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              uuid: 'track-a1',
              trackType: 2, // Audio
              name: 'Background Music',
              clipList: [
                {
                  thisUId: 'clip-a1',
                  sourceUuid: 'res-audio-bgm',
                  filename: 'file:///C:/Media/ambient_music.mp3',
                  type: 2,
                  streamId: 0,
                  tlBegin: 0,
                  tlEnd: 10_000_000,
                  inPoint: 0,
                  outPoint: 10_000_000,
                  speed: { speedRatio: 1.0 },
                  effectChainList: [
                    {
                      effectList: [
                        {
                          id: 'audio/effect/volume',
                          paramList: [
                            {
                              name: 'VolumeGain',
                              fxParam: { unValue: 0.0 }, // 0 dB
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  };

  it('converts decibels (dB) to linear volume gain and back with precision', () => {
    assert.equal(Math.round(dbToLinearGain(0) * 100) / 100, 1.0);
    assert.equal(Math.round(dbToLinearGain(-6) * 100) / 100, 0.5);
    assert.equal(Math.round(dbToLinearGain(-12) * 100) / 100, 0.25);
    assert.equal(linearGainToDb(1.0), 0);
    assert.equal(Math.round(linearGainToDb(0.5)), -6);
  });

  it('calculates aspect ratios matching Filmora standards', () => {
    assert.equal(calculateAspectRatio(1920, 1080), '16:9');
    assert.equal(calculateAspectRatio(1080, 1920), '9:16');
    assert.equal(calculateAspectRatio(1080, 1080), '1:1');
    assert.equal(calculateAspectRatio(1080, 1350), '4:5');
    assert.equal(calculateAspectRatio(2560, 1080), '21:9');
  });

  it('imports authentic Filmora project into NovaCut Project preserving all microsecond timebases', () => {
    const project = importFilmoraProject(sampleFilmoraPackage);

    assert.equal(project.metadata.title, 'Summer_Vlog_Filmora');
    assert.equal(project.settings.width, 1920);
    assert.equal(project.settings.height, 1080);
    assert.equal(project.settings.fps, 30);
    assert.equal(project.settings.sampleRate, 48000);
    assert.equal(project.tracks.length, 2);

    // Verify video track
    const vTrack = project.tracks[0];
    assert.equal(vTrack.type, 'video');
    assert.equal(vTrack.clips.length, 1);
    const vClip = project.clips?.[vTrack.clips[0]] as VideoClip;
    assert.ok(vClip);
    assert.equal(vClip.timelineRange.startUs, 0);
    assert.equal(vClip.timelineRange.durationUs, 5_000_000);
    assert.equal(vClip.sourceRange.startUs, 1_000_000);
    assert.equal(vClip.sourceRange.durationUs, 5_000_000);
    assert.equal(vClip.transform.scale, 1.2);
    assert.equal(vClip.transform.rotationDeg, 15);
    assert.equal(Math.round(vClip.volume * 100) / 100, 0.5); // -6 dB converted

    // Verify audio track
    const aTrack = project.tracks[1];
    assert.equal(aTrack.type, 'audio');
    const aClip = project.clips?.[aTrack.clips[0]] as AudioClip;
    assert.ok(aClip);
    assert.equal(aClip.timelineRange.durationUs, 10_000_000);
    assert.equal(aClip.volume, 1.0);
  });

  it('performs bidirectional roundtrip export from NovaCut back to Filmora .wfp schema', () => {
    const project = importFilmoraProject(sampleFilmoraPackage);
    const exportedPkg = exportFilmoraProject(project);

    assert.equal(exportedPkg.projectInfo.project_file_name, 'Summer_Vlog_Filmora');
    assert.equal(exportedPkg.timelineRoot.timelineInfos[0].resolutionWidth, 1920);
    assert.equal(exportedPkg.timelineRoot.timelineInfos[0].resolutionHeight, 1080);
    assert.equal(exportedPkg.timelineRoot.timelineInfos[0].trackInfos.length, 2);

    const fVideoTrack = exportedPkg.timelineRoot.timelineInfos[0].trackInfos[0];
    assert.equal(fVideoTrack.trackType, 1);
    assert.equal(fVideoTrack.clipList.length, 1);
    const fClip = fVideoTrack.clipList[0];
    assert.equal(fClip.tlBegin, 0);
    assert.equal(fClip.tlEnd, 5_000_000);
    assert.equal(fClip.inPoint, 1_000_000);
    assert.equal(fClip.outPoint, 6_000_000);
  });
});

describe('Filmora-Grade Automatic Audio Ducking Engine', () => {
  const speechVideoClip: VideoClip = {
    id: 'speech-1',
    trackId: 'track-v1',
    type: 'video',
    name: 'Interview Dialogue',
    timelineRange: {
      startUs: 2_000_000, // 2s to 6s (4s duration)
      durationUs: 4_000_000,
    },
    assetId: 'asset-interview',
    sourceRange: { startUs: 0, durationUs: 4_000_000 },
    speed: 1.0,
    volume: 1.0,
    transform: { scale: 1, rotationDeg: 0, translateX: 0, translateY: 0, opacity: 1 },
    colorAdjustments: { brightness: 0, contrast: 1, saturation: 1, temperature: 0 },
  };

  const bgmAudioClip: AudioClip = {
    id: 'bgm-1',
    trackId: 'track-bgm',
    type: 'audio',
    name: 'BGM Track Music',
    timelineRange: {
      startUs: 0,
      durationUs: 10_000_000, // 10s
    },
    assetId: 'asset-bgm',
    sourceRange: { startUs: 0, durationUs: 10_000_000 },
    volume: 0.8,
    fadeInDurationUs: 500_000,
    fadeOutDurationUs: 500_000,
    speed: 1.0,
  };

  it('extracts active dialogue intervals across clips', () => {
    const intervals = AudioDuckingEngine.extractSpeechIntervals([speechVideoClip, bgmAudioClip]);
    assert.equal(intervals.length, 1);
    assert.equal(intervals[0].startUs, 2_000_000);
    assert.equal(intervals[0].endUs, 6_000_000);
  });

  it('computes ducking gain across normal, attack, ducked, and release phases', () => {
    const intervals = [{ startUs: 2_000_000, endUs: 6_000_000 }];
    const options = {
      duckingLevelDb: -12.0, // ducking ratio = 0.25
      attackDurationUs: 200_000,
      releaseDurationUs: 300_000,
      preDuckingMarginUs: 50_000,
    };

    // 1. Normal before speech (e.g. at 1.0s = 1,000,000 µs)
    const normalMultiplier = AudioDuckingEngine.computeDuckingMultiplierAtTime(1_000_000, intervals, options);
    assert.equal(normalMultiplier, 1.0);

    // 2. Mid Attack phase (speech starts at 2.0s, pre-ducking starts at 1.95s, midpoint ~2.05s)
    const attackMultiplier = AudioDuckingEngine.computeDuckingMultiplierAtTime(2_050_000, intervals, options);
    assert.ok(attackMultiplier < 1.0 && attackMultiplier > 0.25);

    // 3. Fully Ducked phase during dialogue (e.g. at 3.0s = 3,000,000 µs)
    const duckedMultiplier = AudioDuckingEngine.computeDuckingMultiplierAtTime(3_000_000, intervals, options);
    assert.ok(Math.abs(duckedMultiplier - 0.25) < 0.01);

    // 4. Release phase right after dialogue (speech ends at 6.0s, release ends at 6.3s, check at 6.15s)
    const releaseMultiplier = AudioDuckingEngine.computeDuckingMultiplierAtTime(6_150_000, intervals, options);
    assert.ok(releaseMultiplier > 0.25 && releaseMultiplier < 1.0);

    // 5. Normal restored after release (e.g. at 7.0s = 7,000,000 µs)
    const restoredMultiplier = AudioDuckingEngine.computeDuckingMultiplierAtTime(7_000_000, intervals, options);
    assert.equal(restoredMultiplier, 1.0);
  });

  it('calculates effective composite music gain with ducking and fade ramps', () => {
    const intervals = [{ startUs: 2_000_000, endUs: 6_000_000 }];
    // At 3.0s, clip volume is 0.8, ducking multiplier is 0.25 -> effective gain = 0.8 * 0.25 = 0.20
    const gainAtSpeech = AudioDuckingEngine.calculateEffectiveMusicGain(bgmAudioClip, 3_000_000, intervals);
    assert.equal(Math.round(gainAtSpeech * 100) / 100, 0.2);

    // At 8.0s, speech is finished -> effective gain = 0.8 * 1.0 = 0.80
    const gainAfterSpeech = AudioDuckingEngine.calculateEffectiveMusicGain(bgmAudioClip, 8_000_000, intervals);
    assert.equal(Math.round(gainAfterSpeech * 100) / 100, 0.8);
  });

  it('generates ducking envelope profiles for timeline visualization', () => {
    const intervals = [{ startUs: 2_000_000, endUs: 6_000_000 }];
    const envelope = AudioDuckingEngine.generateDuckingEnvelope(bgmAudioClip, intervals, undefined, 20);
    assert.ok(envelope.length > 20);
    assert.ok(envelope.some((p) => p.state === 'ducked'));
    assert.ok(envelope.some((p) => p.state === 'normal'));
  });
});

describe('Filmora-Grade Multi-Chunk Downloader & Dynamic Bandwidth Engine', () => {
  it('calculates optimal slicing strategy matching network bandwidth', () => {
    // 50 MB file with 50 Mbps broadband
    const highSpeedStrategy = ChunkDownloaderEngine.calculateSliceStrategy(50 * 1024 * 1024, 50);
    assert.equal(highSpeedStrategy.concurrency, 8);
    assert.ok(highSpeedStrategy.sliceCount >= 2);
    assert.ok(highSpeedStrategy.estimatedDurationSec < 15);

    // 50 MB file with 3 Mbps weak network
    const weakNetworkStrategy = ChunkDownloaderEngine.calculateSliceStrategy(50 * 1024 * 1024, 3);
    assert.equal(weakNetworkStrategy.concurrency, 2);
    assert.ok(weakNetworkStrategy.estimatedDurationSec > 100);
  });

  it('builds byte-exact chunk slices for parallel HTTP Range transfers', () => {
    const slices = ChunkDownloaderEngine.buildSlices(10_000_000, 4_000_000);
    assert.equal(slices.length, 3);
    assert.equal(slices[0].startByte, 0);
    assert.equal(slices[0].endByte, 3_999_999);
    assert.equal(slices[1].startByte, 4_000_000);
    assert.equal(slices[1].endByte, 7_999_999);
    assert.equal(slices[2].startByte, 8_000_000);
    assert.equal(slices[2].endByte, 9_999_999);
  });

  it('handles mirror alias host fallback upon network errors', () => {
    const origin = 'https://download.wondershare.net/packages/filmora.zip';
    const mirrors = ['cdn-us.wondershare.cc', 'cdn-eu.wondershare.cc'];

    // 0 failures -> primary origin
    assert.equal(ChunkDownloaderEngine.resolveActiveHost(origin, mirrors, 0), origin);

    // 1st failure -> 1st mirror
    const fail1 = ChunkDownloaderEngine.resolveActiveHost(origin, mirrors, 1);
    assert.equal(fail1, 'https://cdn-us.wondershare.cc/packages/filmora.zip');

    // 2nd failure -> 2nd mirror
    const fail2 = ChunkDownloaderEngine.resolveActiveHost(origin, mirrors, 2);
    assert.equal(fail2, 'https://cdn-eu.wondershare.cc/packages/filmora.zip');
  });
});

