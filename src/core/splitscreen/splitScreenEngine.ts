/**
 * CapCut Split-Screen & Multi-Track Collage Engine
 * Reverse-engineered from ByteDance CapCut APK assets (`assets/splitscreen/split_screen_2.zip` through `split_screen_9.zip`).
 *
 * Implements:
 * 1. Normalized spatial coordinate mapping for multi-track video layouts (2, 3, 4, 6, 9 slots).
 * 2. Multi-track project synthesis (Track 0 main track + Track 1..N PIP overlay tracks).
 * 3. Export of Split-Screen composition into authentic CapCut `template.json`.
 */

import { Project, AspectRatio, DEFAULT_PROJECT_SETTINGS } from '../models/project';
import { TimelineTrack } from '../models/timeline';
import { VideoClip, DEFAULT_COLOR_ADJUSTMENTS, Clip } from '../models/clip';
import { MediaAsset } from '../models/asset';
import { DEFAULT_EXPORT_SETTINGS } from '../models/export';
import { CapCutDraft, CapCutTrack, CapCutVideoMaterial } from '../capcut/capcutDraftModel';

export type SplitScreenLayoutType =
  | '2-split-horizontal' // Top / Bottom (CapCut split_screen_2)
  | '2-split-vertical'   // Left / Right
  | '3-split-horizontal' // Top / Mid / Bottom (CapCut split_screen_3)
  | '3-split-hero'       // 1 Big Top + 2 Small Bottom
  | '4-split-quad'       // 2x2 Quadrants (CapCut split_screen_4)
  | '6-split-grid'       // 2x3 Grid (CapCut split_screen_6)
  | '9-split-grid';      // 3x3 Grid (CapCut split_screen_9)

export interface SplitSlotGeometry {
  slotIndex: number;
  label: string;
  /** Normalized X offset in CapCut coordinates (-1.0 to +1.0, 0 = center) */
  normX: number;
  /** Normalized Y offset in CapCut coordinates (-1.0 to +1.0, +Y = top, -Y = bottom) */
  normY: number;
  scaleX: number;
  scaleY: number;
  /** Crop ratio or crop bounding box */
  cropRatio: string;
}

export interface SplitScreenLayoutDefinition {
  type: SplitScreenLayoutType;
  title: string;
  icon: string;
  slotCount: number;
  description: string;
  slots: SplitSlotGeometry[];
}

export const SPLIT_SCREEN_LAYOUTS: Record<SplitScreenLayoutType, SplitScreenLayoutDefinition> = {
  '2-split-horizontal': {
    type: '2-split-horizontal',
    title: '2-Split Horizontal',
    icon: '⬒',
    slotCount: 2,
    description: 'Top and bottom split video panels (CapCut split_screen_2 style).',
    slots: [
      { slotIndex: 0, label: 'Top Panel', normX: 0, normY: 0.25, scaleX: 1, scaleY: 1, cropRatio: 'free' },
      { slotIndex: 1, label: 'Bottom Panel', normX: 0, normY: -0.25, scaleX: 1, scaleY: 1, cropRatio: 'free' },
    ],
  },
  '2-split-vertical': {
    type: '2-split-vertical',
    title: '2-Split Vertical',
    icon: '◫',
    slotCount: 2,
    description: 'Left and right side-by-side vertical split.',
    slots: [
      { slotIndex: 0, label: 'Left Panel', normX: -0.25, normY: 0, scaleX: 1, scaleY: 1, cropRatio: 'free' },
      { slotIndex: 1, label: 'Right Panel', normX: 0.25, normY: 0, scaleX: 1, scaleY: 1, cropRatio: 'free' },
    ],
  },
  '3-split-horizontal': {
    type: '3-split-horizontal',
    title: '3-Split Horizontal',
    icon: '☰',
    slotCount: 3,
    description: 'Three horizontal stripes (CapCut split_screen_3 style).',
    slots: [
      { slotIndex: 0, label: 'Top Stripe', normX: 0, normY: 0.33333335, scaleX: 1, scaleY: 1, cropRatio: 'free' },
      { slotIndex: 1, label: 'Middle Stripe', normX: 0, normY: 0.0, scaleX: 1, scaleY: 1, cropRatio: 'free' },
      { slotIndex: 2, label: 'Bottom Stripe', normX: 0, normY: -0.3333333, scaleX: 1, scaleY: 1, cropRatio: 'free' },
    ],
  },
  '3-split-hero': {
    type: '3-split-hero',
    title: '3-Split Hero',
    icon: '⛶',
    slotCount: 3,
    description: 'One prominent top video with two side-by-side bottom videos.',
    slots: [
      { slotIndex: 0, label: 'Top Hero', normX: 0, normY: 0.25, scaleX: 1, scaleY: 1, cropRatio: 'free' },
      { slotIndex: 1, label: 'Bottom Left', normX: -0.25, normY: -0.25, scaleX: 1, scaleY: 1, cropRatio: 'free' },
      { slotIndex: 2, label: 'Bottom Right', normX: 0.25, normY: -0.25, scaleX: 1, scaleY: 1, cropRatio: 'free' },
    ],
  },
  '4-split-quad': {
    type: '4-split-quad',
    title: '4-Split Quad',
    icon: 'boxplus;',
    slotCount: 4,
    description: 'Four equal quadrants (CapCut split_screen_4 style).',
    slots: [
      { slotIndex: 0, label: 'Top Left', normX: -0.25, normY: 0.25, scaleX: 1, scaleY: 1, cropRatio: 'free' },
      { slotIndex: 1, label: 'Top Right', normX: 0.25, normY: 0.25, scaleX: 1, scaleY: 1, cropRatio: 'free' },
      { slotIndex: 2, label: 'Bottom Left', normX: -0.25, normY: -0.25, scaleX: 1, scaleY: 1, cropRatio: 'free' },
      { slotIndex: 3, label: 'Bottom Right', normX: 0.25, normY: -0.25, scaleX: 1, scaleY: 1, cropRatio: 'free' },
    ],
  },
  '6-split-grid': {
    type: '6-split-grid',
    title: '6-Split Grid',
    icon: '▤',
    slotCount: 6,
    description: 'Six video cells arranged in a 2-row x 3-column layout.',
    slots: [
      { slotIndex: 0, label: 'Row 1 Col 1', normX: -0.333, normY: 0.25, scaleX: 1, scaleY: 1, cropRatio: 'free' },
      { slotIndex: 1, label: 'Row 1 Col 2', normX: 0.0, normY: 0.25, scaleX: 1, scaleY: 1, cropRatio: 'free' },
      { slotIndex: 2, label: 'Row 1 Col 3', normX: 0.333, normY: 0.25, scaleX: 1, scaleY: 1, cropRatio: 'free' },
      { slotIndex: 3, label: 'Row 2 Col 1', normX: -0.333, normY: -0.25, scaleX: 1, scaleY: 1, cropRatio: 'free' },
      { slotIndex: 4, label: 'Row 2 Col 2', normX: 0.0, normY: -0.25, scaleX: 1, scaleY: 1, cropRatio: 'free' },
      { slotIndex: 5, label: 'Row 2 Col 3', normX: 0.333, normY: -0.25, scaleX: 1, scaleY: 1, cropRatio: 'free' },
    ],
  },
  '9-split-grid': {
    type: '9-split-grid',
    title: '9-Split Grid',
    icon: '▦',
    slotCount: 9,
    description: 'Nine video cells arranged in a 3x3 matrix (CapCut split_screen_9 style).',
    slots: [
      { slotIndex: 0, label: 'Slot 1', normX: -0.333, normY: 0.333, scaleX: 1, scaleY: 1, cropRatio: 'free' },
      { slotIndex: 1, label: 'Slot 2', normX: 0.0, normY: 0.333, scaleX: 1, scaleY: 1, cropRatio: 'free' },
      { slotIndex: 2, label: 'Slot 3', normX: 0.333, normY: 0.333, scaleX: 1, scaleY: 1, cropRatio: 'free' },
      { slotIndex: 3, label: 'Slot 4', normX: -0.333, normY: 0.0, scaleX: 1, scaleY: 1, cropRatio: 'free' },
      { slotIndex: 4, label: 'Slot 5', normX: 0.0, normY: 0.0, scaleX: 1, scaleY: 1, cropRatio: 'free' },
      { slotIndex: 5, label: 'Slot 6', normX: 0.333, normY: 0.0, scaleX: 1, scaleY: 1, cropRatio: 'free' },
      { slotIndex: 6, label: 'Slot 7', normX: -0.333, normY: -0.333, scaleX: 1, scaleY: 1, cropRatio: 'free' },
      { slotIndex: 7, label: 'Slot 8', normX: 0.0, normY: -0.333, scaleX: 1, scaleY: 1, cropRatio: 'free' },
      { slotIndex: 8, label: 'Slot 9', normX: 0.333, normY: -0.333, scaleX: 1, scaleY: 1, cropRatio: 'free' },
    ],
  },
};

export interface CreateSplitScreenOptions {
  layoutType: SplitScreenLayoutType;
  durationUs: number; // e.g. 5_000_000 (5 seconds)
  aspectRatio?: AspectRatio;
  mediaAssets?: MediaAsset[]; // Optional user assets; defaults to demo materials
}

/**
 * Creates a complete multi-track NovaCut Project arranged as a CapCut-style split screen collage.
 */
export function createSplitScreenProject(options: CreateSplitScreenOptions): Project {
  const layout = SPLIT_SCREEN_LAYOUTS[options.layoutType];
  if (!layout) {
    throw new Error(`Unsupported split screen layout: ${options.layoutType}`);
  }

  const aspectRatio = options.aspectRatio || '1:1';
  const settings = {
    ...DEFAULT_PROJECT_SETTINGS[aspectRatio],
    width: 1440,
    height: 1440,
    fps: 30,
    aspectRatio,
  };

  const durationUs = options.durationUs || 5_000_000;
  const assets: Record<string, MediaAsset> = {};
  const clips: Record<string, Clip> = {};
  const tracks: TimelineTrack[] = [];

  for (let i = 0; i < layout.slots.length; i++) {
    const slot = layout.slots[i];
    const assetId = options.mediaAssets && options.mediaAssets[i]
      ? options.mediaAssets[i].id
      : `split_asset_${i + 1}`;

    if (!assets[assetId]) {
      assets[assetId] = options.mediaAssets && options.mediaAssets[i]
        ? options.mediaAssets[i]
        : {
            id: assetId,
            uri: `file://assets/split_video_${i + 1}.mov`,
            name: `${slot.label} Video`,
            type: 'video',
            metadata: {
              width: settings.width,
              height: settings.height,
              durationUs: durationUs + 1_000_000,
              fps: 30,
              mimeType: 'video/mp4',
              fileSize: 10_000_000,
              hasAudio: true,
            },
            createdAt: Date.now(),
          };
    }

    const clipId = `split_clip_${i + 1}`;
    const trackId = `track_${i}`;
    const isMainTrack = i === 0;

    // Convert CapCut normalized transform to pixel offsets
    const translateX = Math.round(slot.normX * settings.width);
    const translateY = Math.round(-slot.normY * settings.height);

    const videoClip: VideoClip = {
      id: clipId,
      trackId,
      type: 'video',
      name: `${slot.label}`,
      assetId,
      timelineRange: {
        startUs: 0,
        durationUs,
      },
      sourceRange: {
        startUs: 0,
        durationUs,
      },
      speed: 1.0,
      volume: isMainTrack ? 1.0 : 0.0, // Primary video has sound, overlays muted by default
      transform: {
        scale: 1.0,
        rotationDeg: 0,
        translateX,
        translateY,
        opacity: 1.0,
      },
      colorAdjustments: { ...DEFAULT_COLOR_ADJUSTMENTS },
    };

    clips[clipId] = videoClip;

    tracks.push({
      id: trackId,
      type: isMainTrack ? 'video' : 'overlay',
      name: isMainTrack ? `Main Track (${slot.label})` : `PIP Track ${i} (${slot.label})`,
      isMuted: false,
      isLocked: false,
      isVisible: true,
      zIndex: i,
      clips: [clipId],
    });
  }

  const project: Project = {
    metadata: {
      id: `split_proj_${Date.now()}`,
      title: `CapCut ${layout.title}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      durationUs,
      schemaVersion: 1,
    },
    settings,
    tracks,
    clips,
    assets,
    exportSettings: { ...DEFAULT_EXPORT_SETTINGS },
  };

  return project;
}

/**
 * Generates an authentic CapCut `template.json` draft directly from a split screen layout.
 */
export function buildSplitScreenCapCutDraft(options: CreateSplitScreenOptions): CapCutDraft {
  const layout = SPLIT_SCREEN_LAYOUTS[options.layoutType];
  const duration = options.durationUs || 2_240_000;
  const width = 1440;
  const height = 1440;
  const nowMicros = Date.now() * 1000;

  const capcutVideos: CapCutVideoMaterial[] = [];
  const capcutTracks: CapCutTrack[] = [];

  for (let i = 0; i < layout.slots.length; i++) {
    const slot = layout.slots[i];
    const matId = `VID_SPLIT_${i + 1}`;

    capcutVideos.push({
      id: matId,
      type: 'video',
      path: `video/${i + 1}.mov`,
      duration: duration + 27_000,
      width,
      height: height / 2,
      has_audio: true,
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
      crop_ratio: slot.cropRatio,
      crop_scale: 1,
      material_name: `${slot.label}`,
    });

    capcutTracks.push({
      id: `TRACK_${i + 1}`,
      type: 'video',
      attribute: 0,
      flag: i === 0 ? 0 : 2, // flag 0 = main track, flag 2 = PIP track
      segments: [
        {
          id: `SEG_${i + 1}`,
          material_id: matId,
          render_index: 0,
          source_timerange: { start: 0, duration },
          target_timerange: { start: 0, duration },
          speed: 1.0,
          volume: i === 0 ? 1.0 : 0.0,
          visible: true,
          reverse: false,
          clip: {
            alpha: 1.0,
            flip: { horizontal: false, vertical: false },
            rotation: 0,
            scale: { x: slot.scaleX, y: slot.scaleY },
            transform: { x: slot.normX, y: slot.normY },
          },
          enable_adjust: true,
          enable_color_curves: true,
          enable_color_wheels: true,
          enable_lut: true,
        },
      ],
    });
  }

  return {
    id: `CAPCUT_SPLIT_${Date.now()}`,
    name: layout.title,
    duration,
    fps: 30,
    version: 360000,
    new_version: '55.0.0',
    source: 'jianying',
    color_space: -1,
    create_time: nowMicros,
    update_time: nowMicros,
    canvas_config: {
      ratio: '1:1',
      width,
      height,
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
      videos: capcutVideos,
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
}
