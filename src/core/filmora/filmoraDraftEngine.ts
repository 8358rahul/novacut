/**
 * Wondershare Filmora (.wfp / .wesproj) Bidirectional Translation Engine
 * Clean-room implementation providing seamless project interoperability between
 * NovaCut and Wondershare Filmora.
 */

import { Project, ProjectSettings, AspectRatio } from '../models/project';
import { TimelineTrack, TrackType } from '../models/timeline';
import { Clip, VideoClip, AudioClip, DEFAULT_TRANSFORM, DEFAULT_COLOR_ADJUSTMENTS } from '../models/clip';
import { MediaAsset } from '../models/asset';
import {
  FilmoraProjectPackage,
  FilmoraProjectInfo,
  FilmoraTimelineRoot,
  FilmoraTimelineInfo,
  FilmoraTrack,
  FilmoraClip,
  FilmoraResource,
  FilmoraEffect,
} from './filmoraModel';

/**
 * Normalizes file URIs or paths (e.g. file:///C:/path to C:/path).
 */
export function normalizeUriToPath(uri: string): string {
  if (uri.startsWith('file:///')) {
    return decodeURIComponent(uri.replace('file:///', ''));
  }
  if (uri.startsWith('file://')) {
    return decodeURIComponent(uri.replace('file://', ''));
  }
  if (uri.startsWith('file:/')) {
    return decodeURIComponent(uri.replace('file:/', ''));
  }
  return uri;
}

/**
 * Converts dB to linear volume gain factor (e.g. 0 dB = 1.0, -6 dB ≈ 0.5, -12 dB ≈ 0.25).
 */
export function dbToLinearGain(db: number): number {
  return Math.max(0, Math.pow(10, db / 20));
}

/**
 * Converts linear volume gain factor to dB (e.g. 1.0 = 0 dB, 0.5 ≈ -6.02 dB).
 */
export function linearGainToDb(gain: number): number {
  if (gain <= 0.0001) return -60;
  return Math.round(20 * Math.log10(gain) * 100) / 100;
}

/**
 * Maps width and height to closest standard aspect ratio.
 */
export function calculateAspectRatio(width: number, height: number): AspectRatio {
  if (height <= 0 || width <= 0) return '16:9';
  const ratio = width / height;

  if (Math.abs(ratio - 16 / 9) < 0.1) return '16:9';
  if (Math.abs(ratio - 9 / 16) < 0.1) return '9:16';
  if (Math.abs(ratio - 1.0) < 0.1) return '1:1';
  if (Math.abs(ratio - 4 / 5) < 0.1) return '4:5';
  if (Math.abs(ratio - 21 / 9) < 0.15) return '21:9';

  return ratio > 1 ? '16:9' : '9:16';
}

/**
 * Imports a Filmora Project Package into a NovaCut Project.
 */
export function importFilmoraProject(pkg: FilmoraProjectPackage): Project {
  const { projectInfo, timelineRoot } = pkg;
  const timelineInfo = timelineRoot.timelineInfos[0];
  if (!timelineInfo) {
    throw new Error('Invalid Filmora project: timelineInfos is empty');
  }

  const fps = Math.round(
    timelineInfo.frameRate.den > 0
      ? timelineInfo.frameRate.num / timelineInfo.frameRate.den
      : 30
  );

  const width = timelineInfo.resolutionWidth || 1920;
  const height = timelineInfo.resolutionHeight || 1080;
  const aspectRatio = calculateAspectRatio(width, height);

  const settings: ProjectSettings = {
    width,
    height,
    fps,
    aspectRatio,
    sampleRate: timelineInfo.sampleRate || projectInfo.project_sample_rate || 44100,
    backgroundColor: '#000000',
  };

  const assets: Record<string, MediaAsset> = {};
  const resourceMap: Record<string, FilmoraResource> = {};

  for (const res of timelineInfo.resources || []) {
    resourceMap[res.sourceUuid] = res;
    const cleanPath = normalizeUriToPath(res.filename);
    const fileName = cleanPath.split(/[/\\]/).pop() || res.sourceUuid;
    const isAudioOnly = res.videoStreamCount === 0 && res.audioStreamCount > 0;

    assets[res.sourceUuid] = {
      id: res.sourceUuid,
      type: isAudioOnly ? 'audio' : 'video',
      uri: cleanPath,
      name: fileName,
      metadata: {
        width: res.width || width,
        height: res.height || height,
        durationUs: res.duration || projectInfo.project_timeline_duration || 0,
        fps,
        mimeType: isAudioOnly ? 'audio/mp3' : 'video/mp4',
        fileSize: res.fileSize || 0,
        hasAudio: res.audioStreamCount > 0,
      },
      createdAt: Date.now(),
    };
  }

  const tracks: TimelineTrack[] = [];
  const clips: Record<string, Clip> = {};

  for (let trackIndex = 0; trackIndex < timelineInfo.trackInfos.length; trackIndex++) {
    const fTrack = timelineInfo.trackInfos[trackIndex];
    let trackType: TrackType = 'video';
    if (fTrack.trackType === 2) trackType = 'audio';
    else if (fTrack.trackType === 3) trackType = 'text';

    const trackId = fTrack.uuid || `track-${trackIndex}`;
    const clipIds: string[] = [];

    for (const fClip of fTrack.clipList || []) {
      const clipId = fClip.thisUId || `clip-${Math.random().toString(36).substring(2, 9)}`;
      clipIds.push(clipId);

      const durationUs = Math.max(0, fClip.tlEnd - fClip.tlBegin);
      const sourceDurationUs = Math.max(0, fClip.outPoint - fClip.inPoint);

      let linearVolume = 1.0;
      let transform = { ...DEFAULT_TRANSFORM };

      // Parse effect chains (volume, transforms)
      if (fClip.effectChainList) {
        for (const chain of fClip.effectChainList) {
          for (const effect of chain.effectList || []) {
            if (effect.id === 'audio/effect/volume') {
              const gainParam = effect.paramList?.find((p) => p.name === 'VolumeGain');
              if (gainParam && typeof gainParam.fxParam.unValue === 'number') {
                linearVolume = dbToLinearGain(gainParam.fxParam.unValue);
              }
            } else if (effect.id === 'video/effect/transform') {
              const scaleParam = effect.paramList?.find((p) => p.name === 'Scale');
              const rotParam = effect.paramList?.find((p) => p.name === 'Rotation');
              const txParam = effect.paramList?.find((p) => p.name === 'TranslateX');
              const tyParam = effect.paramList?.find((p) => p.name === 'TranslateY');

              if (scaleParam && typeof scaleParam.fxParam.unValue === 'number') {
                transform.scale = scaleParam.fxParam.unValue;
              }
              if (rotParam && typeof rotParam.fxParam.unValue === 'number') {
                transform.rotationDeg = rotParam.fxParam.unValue;
              }
              if (txParam && typeof txParam.fxParam.unValue === 'number') {
                transform.translateX = txParam.fxParam.unValue;
              }
              if (tyParam && typeof tyParam.fxParam.unValue === 'number') {
                transform.translateY = tyParam.fxParam.unValue;
              }
            }
          }
        }
      }

      const speedVal = fClip.speed?.speedRatio || (sourceDurationUs > 0 && durationUs > 0 ? sourceDurationUs / durationUs : 1.0);

      // Create asset reference if not exists
      if (!assets[fClip.sourceUuid] && fClip.filename) {
        const cleanPath = normalizeUriToPath(fClip.filename);
        assets[fClip.sourceUuid] = {
          id: fClip.sourceUuid,
          type: trackType === 'audio' ? 'audio' : 'video',
          uri: cleanPath,
          name: cleanPath.split(/[/\\]/).pop() || fClip.sourceUuid,
          metadata: {
            width,
            height,
            durationUs: Math.max(fClip.outPoint, durationUs),
            fps,
            mimeType: trackType === 'audio' ? 'audio/mp3' : 'video/mp4',
            fileSize: 0,
            hasAudio: true,
          },
          createdAt: Date.now(),
        };
      }

      if (trackType === 'audio') {
        const audioClip: AudioClip = {
          id: clipId,
          trackId,
          type: 'audio',
          name: assets[fClip.sourceUuid]?.name || `Audio ${clipId}`,
          timelineRange: {
            startUs: fClip.tlBegin,
            durationUs,
          },
          assetId: fClip.sourceUuid,
          sourceRange: {
            startUs: fClip.inPoint,
            durationUs: sourceDurationUs,
          },
          volume: linearVolume,
          fadeInDurationUs: 0,
          fadeOutDurationUs: 0,
          speed: speedVal,
        };
        clips[clipId] = audioClip;
      } else {
        const videoClip: VideoClip = {
          id: clipId,
          trackId,
          type: 'video',
          name: assets[fClip.sourceUuid]?.name || `Video ${clipId}`,
          timelineRange: {
            startUs: fClip.tlBegin,
            durationUs,
          },
          assetId: fClip.sourceUuid,
          sourceRange: {
            startUs: fClip.inPoint,
            durationUs: sourceDurationUs,
          },
          speed: speedVal,
          volume: linearVolume,
          transform,
          colorAdjustments: { ...DEFAULT_COLOR_ADJUSTMENTS },
        };
        clips[clipId] = videoClip;
      }
    }

    tracks.push({
      id: trackId,
      type: trackType,
      name: fTrack.name || `${trackType.charAt(0).toUpperCase() + trackType.slice(1)} Track ${trackIndex + 1}`,
      isMuted: !!fTrack.isMuted,
      isLocked: !!fTrack.isLocked,
      isVisible: true,
      zIndex: trackIndex,
      clips: clipIds,
    });
  }

  return {
    metadata: {
      id: `filmora-${projectInfo.timeline_mediaId || 'proj'}`,
      title: projectInfo.project_file_name || 'Imported Filmora Project',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      durationUs: projectInfo.project_timeline_duration || 0,
      schemaVersion: 1,
    },
    settings,
    tracks,
    clips,
    assets,
    exportSettings: {
      resolutionPreset: '1080p',
      width,
      height,
      fps: (fps === 60 ? 60 : fps === 24 ? 24 : 30),
      quality: 'high',
      videoBitrateMbps: 8,
      audioBitrateKbps: 192,
      format: 'mp4',
    },
  };
}

/**
 * Exports a NovaCut Project into Filmora Project Package schema (.wfp / .wesproj).
 */
export function exportFilmoraProject(project: Project): FilmoraProjectPackage {
  const timelineMediaId = `timeline-${project.metadata.id.replace(/[^a-zA-Z0-9]/g, '')}`;
  const resources: FilmoraResource[] = [];
  const resourceMap: Record<string, boolean> = {};

  // Build Filmora resources from NovaCut assets
  const projectAssets = project.assets || {};
  for (const assetId in projectAssets) {
    const asset = projectAssets[assetId];
    if (!asset) continue;
    resourceMap[assetId] = true;
    resources.push({
      sourceUuid: asset.id,
      filename: asset.uri.startsWith('file:') ? asset.uri : `file:///${asset.uri.replace(/\\/g, '/')}`,
      videoStreamCount: asset.type === 'video' ? 1 : 0,
      audioStreamCount: 1,
      width: asset.metadata?.width || project.settings.width,
      height: asset.metadata?.height || project.settings.height,
      duration: asset.metadata?.durationUs || project.metadata.durationUs,
      fileSize: asset.metadata?.fileSize || 0,
    });
  }

  const trackInfos: FilmoraTrack[] = [];

  for (let trackIndex = 0; trackIndex < project.tracks.length; trackIndex++) {
    const track = project.tracks[trackIndex];
    let fTrackType = 1; // Video
    if (track.type === 'audio') fTrackType = 2;
    else if (track.type === 'text') fTrackType = 3;

    const clipList: FilmoraClip[] = [];

    for (const clipId of track.clips) {
      const clip = project.clips?.[clipId];
      if (!clip) continue;

      const tlBegin = clip.timelineRange.startUs;
      const tlEnd = tlBegin + clip.timelineRange.durationUs;

      let inPoint = 0;
      let outPoint = clip.timelineRange.durationUs;
      let assetId = '';
      let speedRatio = 1.0;
      let volume = 1.0;
      const effects: FilmoraEffect[] = [];

      if (clip.type === 'video') {
        const vClip = clip as VideoClip;
        inPoint = vClip.sourceRange.startUs;
        outPoint = inPoint + vClip.sourceRange.durationUs;
        assetId = vClip.assetId;
        speedRatio = vClip.speed || 1.0;
        volume = vClip.volume;

        // Add volume effect
        effects.push({
          id: 'audio/effect/volume',
          paramList: [
            {
              name: 'VolumeGain',
              fxParam: { unValue: linearGainToDb(volume) },
            },
          ],
        });

        // Add transform effect
        if (vClip.transform) {
          effects.push({
            id: 'video/effect/transform',
            paramList: [
              { name: 'Scale', fxParam: { unValue: vClip.transform.scale } },
              { name: 'Rotation', fxParam: { unValue: vClip.transform.rotationDeg } },
              { name: 'TranslateX', fxParam: { unValue: vClip.transform.translateX } },
              { name: 'TranslateY', fxParam: { unValue: vClip.transform.translateY } },
            ],
          });
        }
      } else if (clip.type === 'audio') {
        const aClip = clip as AudioClip;
        inPoint = aClip.sourceRange.startUs;
        outPoint = inPoint + aClip.sourceRange.durationUs;
        assetId = aClip.assetId;
        speedRatio = aClip.speed || 1.0;
        volume = aClip.volume;

        effects.push({
          id: 'audio/effect/volume',
          paramList: [
            {
              name: 'VolumeGain',
              fxParam: { unValue: linearGainToDb(volume) },
            },
          ],
        });
      }

      const asset = project.assets?.[assetId];
      const filename = asset ? (asset.uri.startsWith('file:') ? asset.uri : `file:///${asset.uri.replace(/\\/g, '/')}`) : '';

      clipList.push({
        thisUId: clip.id,
        sourceUuid: assetId || clip.id,
        filename,
        type: track.type === 'audio' ? 2 : 0,
        streamId: 0,
        tlBegin,
        tlEnd,
        inPoint,
        outPoint,
        speed: {
          reverse: false,
          speedRatio,
        },
        effectChainList: effects.length > 0 ? [{ effectList: effects }] : undefined,
      });
    }

    trackInfos.push({
      uuid: track.id,
      trackType: fTrackType,
      name: track.name,
      isMuted: track.isMuted,
      isLocked: track.isLocked,
      clipList,
    });
  }

  const projectInfo: FilmoraProjectInfo = {
    project_file_name: project.metadata.title,
    timeline_mediaId: timelineMediaId,
    project_timeline_duration: project.metadata.durationUs,
    project_sample_rate: project.settings.sampleRate,
    version: '16.0.0',
    creator: 'NovaCut Filmora Interop Engine',
  };

  const timelineInfo: FilmoraTimelineInfo = {
    resolutionWidth: project.settings.width,
    resolutionHeight: project.settings.height,
    frameRate: {
      num: project.settings.fps,
      den: 1,
    },
    sampleRate: project.settings.sampleRate,
    resources,
    trackInfos,
  };

  return {
    projectInfo,
    timelineRoot: {
      timelineInfos: [timelineInfo],
    },
  };
}
