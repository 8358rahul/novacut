/**
 * CapCut Draft Interop Engine
 * Provides bidirectional translation between ByteDance CapCut/JianYing draft files
 * (`template.json` / `draft_content.json`) and NovaCut's native Project format.
 *
 * Direct reverse-engineering evidence:
 * - APK assets: `assets/splitscreen/split_screen_2.zip/template.json` through `split_screen_9.zip`
 * - AndroidManifest: `com.lemon.lvoverseas` / `com.vega.commonedit.commoneditor`
 * - Microsecond timebase: 1s = 1,000,000 µs
 * - Track flags: flag 0 (main track, `maintrack_adsorb: true`), flag 2 (PIP/overlay track)
 */

import {
  CapCutDraft,
  CapCutTrack,
  CapCutSegment,
  CapCutVideoMaterial,
} from './capcutDraftModel';
import { Project, AspectRatio, DEFAULT_PROJECT_SETTINGS } from '../models/project';
import { TimelineTrack, TrackType } from '../models/timeline';
import { VideoClip, DEFAULT_COLOR_ADJUSTMENTS, Clip } from '../models/clip';
import { MediaAsset } from '../models/asset';
import { DEFAULT_EXPORT_SETTINGS } from '../models/export';

export function validateCapCutDraft(data: unknown): data is CapCutDraft {
  if (!data || typeof data !== 'object') return false;
  const draft = data as Partial<CapCutDraft>;
  return (
    typeof draft.duration === 'number' &&
    typeof draft.canvas_config === 'object' &&
    Array.isArray(draft.tracks) &&
    typeof draft.materials === 'object'
  );
}

/**
 * Normalizes aspect ratio string from CapCut (e.g. '1:1', '9:16', '16:9') to NovaCut AspectRatio
 */
export function normalizeAspectRatio(ratio: string): AspectRatio {
  if (ratio === '9:16' || ratio === '16:9' || ratio === '1:1' || ratio === '4:5' || ratio === '21:9') {
    return ratio;
  }
  return '9:16';
}

/**
 * Converts a CapCut Draft JSON object or string into a NovaCut Project.
 */
export function importFromCapCutDraft(draftSource: string | CapCutDraft): Project {
  const draft: CapCutDraft =
    typeof draftSource === 'string' ? JSON.parse(draftSource) : draftSource;

  if (!validateCapCutDraft(draft)) {
    throw new Error('Invalid CapCut draft format: missing duration, canvas_config, tracks, or materials.');
  }

  const aspectRatio = normalizeAspectRatio(draft.canvas_config.ratio);
  const baseSettings = DEFAULT_PROJECT_SETTINGS[aspectRatio];

  const projectSettings = {
    ...baseSettings,
    width: draft.canvas_config.width || baseSettings.width,
    height: draft.canvas_config.height || baseSettings.height,
    fps: draft.fps || 30,
    aspectRatio,
  };

  const assets: Record<string, MediaAsset> = {};
  const clips: Record<string, Clip> = {};
  const tracks: TimelineTrack[] = [];

  // 1. Process Materials into MediaAssets
  const videos = draft.materials.videos || [];
  for (const v of videos) {
    assets[v.id] = {
      id: v.id,
      uri: v.path || `file://local/capcut_media_${v.id}.mp4`,
      name: v.material_name || `Media ${v.id.substring(0, 8)}`,
      type: v.type === 'photo' ? 'image' : 'video',
      metadata: {
        width: v.width || projectSettings.width,
        height: v.height || projectSettings.height,
        durationUs: v.duration || draft.duration,
        fps: draft.fps || 30,
        mimeType: v.type === 'photo' ? 'image/jpeg' : 'video/mp4',
        fileSize: 0,
        hasAudio: v.has_audio !== undefined ? v.has_audio : true,
      },
      createdAt: Math.floor(draft.create_time / 1000) || Date.now(),
    };
  }

  // 2. Process Tracks and Segments
  let trackZIndex = 0;
  for (const capcutTrack of draft.tracks) {
    const isMainTrack = capcutTrack.flag === 0;
    const isPIP = capcutTrack.flag === 2;
    const trackType: TrackType = isPIP ? 'overlay' : capcutTrack.type === 'video' ? 'video' : 'audio';

    const trackId = capcutTrack.id || `track_${trackZIndex}`;
    const trackClipIds: string[] = [];

    for (const seg of capcutTrack.segments) {
      const clipId = seg.id;
      trackClipIds.push(clipId);

      // Convert CapCut normalized transform (-0.25 to 0.25 range) into canvas pixel offsets
      const capcutX = seg.clip?.transform?.x ?? 0;
      const capcutY = seg.clip?.transform?.y ?? 0;
      const scaleX = seg.clip?.scale?.x ?? 1;
      const scaleY = seg.clip?.scale?.y ?? 1;

      // In CapCut: transform.x is normalized by canvas width, transform.y by canvas height
      const translateX = Math.round(capcutX * projectSettings.width);
      // Note: CapCut Y goes upward (+y is top, -y is bottom)
      const translateY = Math.round(-capcutY * projectSettings.height);

      const clip: VideoClip = {
        id: clipId,
        trackId,
        type: 'video',
        name: `Segment ${clipId.substring(0, 6)}`,
        assetId: seg.material_id,
        timelineRange: {
          startUs: seg.target_timerange.start,
          durationUs: seg.target_timerange.duration,
        },
        sourceRange: {
          startUs: seg.source_timerange.start,
          durationUs: seg.source_timerange.duration,
        },
        speed: seg.speed || 1.0,
        volume: seg.volume !== undefined ? seg.volume : 1.0,
        transform: {
          scale: Math.max(scaleX, scaleY),
          rotationDeg: seg.clip?.rotation || 0,
          translateX,
          translateY,
          opacity: seg.clip?.alpha !== undefined ? seg.clip.alpha : 1.0,
        },
        colorAdjustments: { ...DEFAULT_COLOR_ADJUSTMENTS },
      };

      clips[clipId] = clip;
    }

    tracks.push({
      id: trackId,
      type: trackType,
      name: isMainTrack ? 'Main Track' : isPIP ? `Overlay (PIP ${trackZIndex})` : `Track ${trackZIndex + 1}`,
      isMuted: false,
      isLocked: false,
      isVisible: true,
      zIndex: trackZIndex,
      clips: trackClipIds,
    });

    trackZIndex++;
  }

  return {
    metadata: {
      id: draft.id || `capcut_proj_${Date.now()}`,
      title: draft.name || 'Imported CapCut Project',
      createdAt: Math.floor(draft.create_time / 1000) || Date.now(),
      updatedAt: Math.floor(draft.update_time / 1000) || Date.now(),
      durationUs: draft.duration,
      schemaVersion: 1,
    },
    settings: projectSettings,
    tracks,
    clips,
    assets,
    exportSettings: { ...DEFAULT_EXPORT_SETTINGS },
  };
}

/**
 * Exports a NovaCut Project into CapCut/JianYing native draft JSON structure.
 */
export function exportToCapCutDraft(project: Project): CapCutDraft {
  const width = project.settings.width;
  const height = project.settings.height;

  const nowMicros = Date.now() * 1000;

  // Build Materials
  const videos: CapCutVideoMaterial[] = [];
  const assetsMap = project.assets || {};

  for (const asset of Object.values(assetsMap)) {
    videos.push({
      id: asset.id,
      type: asset.type === 'image' ? 'photo' : 'video',
      path: asset.uri,
      duration: asset.metadata?.durationUs || 0,
      width: asset.metadata?.width || width,
      height: asset.metadata?.height || height,
      has_audio: asset.metadata?.hasAudio !== undefined ? asset.metadata.hasAudio : asset.type === 'video',
      crop: {
        upper_left_x: 0,
        upper_left_y: 0,
        upper_right_x: 1,
        upper_right_y: 0,
        lower_left_x: 0,
        lower_left_y: 1,
        lower_right_x: 1,
        lower_right_y: 1,
      },
      crop_ratio: 'free',
      crop_scale: 1,
      material_name: asset.name,
    });
  }

  // Build Tracks and Segments
  const capcutTracks: CapCutTrack[] = [];
  const clipsMap = project.clips || {};

  for (let i = 0; i < project.tracks.length; i++) {
    const t = project.tracks[i];
    const isMain = i === 0 && t.type === 'video';
    const isOverlay = t.type === 'overlay' || (!isMain && t.type === 'video');

    const segments: CapCutSegment[] = [];
    let segRenderIndex = 0;

    for (const clipId of t.clips) {
      const clip = clipsMap[clipId];
      if (!clip) continue;

      if (clip.type === 'video' || clip.type === 'image') {
        const videoClip = clip as VideoClip;
        const normX = width > 0 ? (videoClip.transform?.translateX || 0) / width : 0;
        // Invert Y back to CapCut coordinate space (+Y is up)
        const normY = height > 0 ? -(videoClip.transform?.translateY || 0) / height : 0;
        const scaleVal = videoClip.transform?.scale || 1.0;

        segments.push({
          id: clip.id,
          material_id: videoClip.assetId || clip.id,
          render_index: segRenderIndex,
          source_timerange: {
            start: videoClip.sourceRange ? videoClip.sourceRange.startUs : 0,
            duration: videoClip.sourceRange ? videoClip.sourceRange.durationUs : clip.timelineRange.durationUs,
          },
          target_timerange: {
            start: clip.timelineRange.startUs,
            duration: clip.timelineRange.durationUs,
          },
          speed: videoClip.speed || 1.0,
          volume: videoClip.volume !== undefined ? videoClip.volume : 1.0,
          visible: true,
          reverse: false,
          clip: {
            alpha: videoClip.transform?.opacity ?? 1.0,
            flip: { horizontal: false, vertical: false },
            rotation: videoClip.transform?.rotationDeg || 0,
            scale: { x: scaleVal, y: scaleVal },
            transform: { x: normX, y: normY },
          },
          enable_adjust: true,
          enable_lut: true,
          enable_color_curves: true,
          enable_color_wheels: true,
        });

        segRenderIndex++;
      }
    }

    capcutTracks.push({
      id: t.id,
      type: t.type === 'audio' ? 'audio' : 'video',
      attribute: 0,
      flag: isMain ? 0 : isOverlay ? 2 : 0,
      segments,
    });
  }

  const draft: CapCutDraft = {
    id: project.metadata.id,
    name: project.metadata.title,
    duration: project.metadata.durationUs,
    fps: project.settings.fps,
    version: 360000,
    new_version: '55.0.0',
    source: 'jianying',
    color_space: -1,
    create_time: project.metadata.createdAt * 1000 || nowMicros,
    update_time: nowMicros,
    canvas_config: {
      ratio: project.settings.aspectRatio,
      width: project.settings.width,
      height: project.settings.height,
    },
    config: {
      adjust_max_index: 1,
      maintrack_adsorb: true,
      material_save_mode: 0,
      video_mute: false,
      lyrics_sync: true,
      subtitle_sync: true,
    },
    materials: {
      videos,
      audios: [],
      texts: [],
    },
    tracks: capcutTracks,
    keyframes: {},
    platform: {
      os: 'Android',
      app_version: '8.5.0',
    },
  };

  return draft;
}
