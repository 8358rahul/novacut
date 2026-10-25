/**
 * NovaCut Template Engine (CutSame / TikTok-style Viral Video Templates)
 * Inspired by CapCut's CutSame engine (com.vega.multicutsame & com.lemon.cutsame.model).
 * Provides multi-slot media substitution, beat tracking, automated trim calculation,
 * and seamless project timeline synthesis.
 */

import { Project, AspectRatio, DEFAULT_PROJECT_SETTINGS } from '../models/project';
import { VideoClip, ImageClip, AudioClip, TextOverlay, TransitionType, DEFAULT_TRANSFORM } from '../models/clip';
import { MICROS_PER_SECOND } from '../models/timeline';
import { DEFAULT_EXPORT_SETTINGS } from '../models/export';
import { MediaAsset } from '../models/asset';

export type TemplateCategory =
  | 'TikTok Trending'
  | 'Beat Sync'
  | 'Travel Vlog'
  | 'Glitch & Velocity'
  | 'Aesthetic'
  | 'Phonk & Drift'
  | 'Fashion & OOTD';

export interface TemplateSlot {
  id: string;
  slotIndex: number;
  durationUs: number;
  label: string;
  requiredType: 'video' | 'image' | 'any';
  isBeatDrop: boolean;
  speedCurvePreset?: 'montage' | 'bullet' | 'hero' | 'standard';
  transitionOut?: TransitionType;
}

export interface TemplateDefinition {
  id: string;
  title: string;
  category: TemplateCategory;
  description: string;
  author: string;
  soundTitle: string;
  bpm: number;
  aspectRatio: AspectRatio;
  slots: TemplateSlot[];
  defaultFilterId?: string;
  previewThumbnail: string;
  previewGradient: [string, string];
  tags: string[];
}

export const VIRAL_TEMPLATES: TemplateDefinition[] = [
  {
    id: 'tpl_beat_sync_tiktok',
    title: 'TikTok Beat Sync ⚡',
    category: 'Beat Sync',
    description: 'High-tempo rhythmic cuts perfectly synchronized to bass drops.',
    author: 'NovaStudio',
    soundTitle: 'Original Audio — Bass Bounce (128 BPM)',
    bpm: 128,
    aspectRatio: '9:16',
    slots: [
      { id: 's1', slotIndex: 0, durationUs: 1_875_000, label: 'Intro Build-up', requiredType: 'any', isBeatDrop: false, transitionOut: 'zoomIn' },
      { id: 's2', slotIndex: 1, durationUs: 937_500, label: 'Beat Drop 1', requiredType: 'video', isBeatDrop: true, speedCurvePreset: 'bullet', transitionOut: 'dissolve' },
      { id: 's3', slotIndex: 2, durationUs: 937_500, label: 'Beat Drop 2', requiredType: 'video', isBeatDrop: true, speedCurvePreset: 'montage', transitionOut: 'slideLeft' },
      { id: 's4', slotIndex: 3, durationUs: 1_875_000, label: 'Outro Climax', requiredType: 'any', isBeatDrop: false },
    ],
    defaultFilterId: 'teal_orange',
    previewThumbnail: '⚡',
    previewGradient: ['#EC4899', '#8B5CF6'],
    tags: ['#BeatDrop', '#TikTok', '#Velocity', '#EDM', '#Trend'],
  },
  {
    id: 'tpl_phonk_drift',
    title: 'Phonk Drift Hyper Velocity 🏎️',
    category: 'Phonk & Drift',
    description: 'Aggressive Brazilian phonk rhythm with stutter speed ramps & neon glow.',
    author: 'DriftNation',
    soundTitle: 'Brazilian Phonk Mania — Night Stutter (150 BPM)',
    bpm: 150,
    aspectRatio: '9:16',
    slots: [
      { id: 's1', slotIndex: 0, durationUs: 1_200_000, label: 'Burnout Prep', requiredType: 'video', isBeatDrop: false, transitionOut: 'slideLeft' },
      { id: 's2', slotIndex: 1, durationUs: 800_000, label: 'Bass Drop 1', requiredType: 'video', isBeatDrop: true, speedCurvePreset: 'bullet', transitionOut: 'zoomIn' },
      { id: 's3', slotIndex: 2, durationUs: 800_000, label: 'Drift Angle', requiredType: 'video', isBeatDrop: true, speedCurvePreset: 'bullet', transitionOut: 'dissolve' },
      { id: 's4', slotIndex: 3, durationUs: 1_600_000, label: 'Speed Finish', requiredType: 'video', isBeatDrop: false },
    ],
    defaultFilterId: 'cyberpunk',
    previewThumbnail: '🏎️',
    previewGradient: ['#EF4444', '#7C3AED'],
    tags: ['#Phonk', '#Drift', '#CarEdit', '#Velocity', '#TikTok'],
  },
  {
    id: 'tpl_cinematic_travel',
    title: 'Cinematic Travel Montage ✈️',
    category: 'Travel Vlog',
    description: 'Slow-motion pans, smooth dissolves and dramatic Teal & Orange grading.',
    author: 'GlobeTrotter',
    soundTitle: 'Acoustic Horizon — Wanderlust (75 BPM)',
    bpm: 75,
    aspectRatio: '9:16',
    slots: [
      { id: 's1', slotIndex: 0, durationUs: 2_400_000, label: 'Scenic Landscape', requiredType: 'video', isBeatDrop: false, speedCurvePreset: 'montage', transitionOut: 'fade' },
      { id: 's2', slotIndex: 1, durationUs: 2_400_000, label: 'Action / Motion', requiredType: 'video', isBeatDrop: true, speedCurvePreset: 'hero', transitionOut: 'dissolve' },
      { id: 's3', slotIndex: 2, durationUs: 3_200_000, label: 'Sunset Horizon', requiredType: 'any', isBeatDrop: false },
    ],
    defaultFilterId: 'teal_orange',
    previewThumbnail: '✈️',
    previewGradient: ['#06B6D4', '#3B82F6'],
    tags: ['#Travel', '#Cinematic', '#Vlog', '#Nature', '#4K'],
  },
  {
    id: 'tpl_summer_euro',
    title: 'Euro Summer Sunshine ☀️',
    category: 'Travel Vlog',
    description: 'Vibrant Mediterranean holiday aesthetic with warm retro grain.',
    author: 'Sunseeker',
    soundTitle: 'Amalfi Coast Vibes — Italian Summer (105 BPM)',
    bpm: 105,
    aspectRatio: '9:16',
    slots: [
      { id: 's1', slotIndex: 0, durationUs: 1_714_000, label: 'Beach Arrival', requiredType: 'any', isBeatDrop: false, transitionOut: 'fade' },
      { id: 's2', slotIndex: 1, durationUs: 1_142_000, label: 'Gelato / Food', requiredType: 'any', isBeatDrop: true, transitionOut: 'slideRight' },
      { id: 's3', slotIndex: 2, durationUs: 1_142_000, label: 'Boat Cruise', requiredType: 'any', isBeatDrop: true, transitionOut: 'zoomIn' },
      { id: 's4', slotIndex: 3, durationUs: 1_714_000, label: 'Golden Hour', requiredType: 'any', isBeatDrop: false },
    ],
    defaultFilterId: 'vivid_warm',
    previewThumbnail: '☀️',
    previewGradient: ['#F59E0B', '#EF4444'],
    tags: ['#EuroSummer', '#Beach', '#Holiday', '#Vlog', '#Summer'],
  },
  {
    id: 'tpl_glitch_velocity',
    title: 'Cyberpunk Glitch Velocity 👾',
    category: 'Glitch & Velocity',
    description: 'Fast-paced speed ramps with futuristic aesthetic accents.',
    author: 'NeonCut',
    soundTitle: 'Synthwave Night — Cyber Overdrive (140 BPM)',
    bpm: 140,
    aspectRatio: '9:16',
    slots: [
      { id: 's1', slotIndex: 0, durationUs: 1_285_000, label: 'Fast Hook', requiredType: 'video', isBeatDrop: true, speedCurvePreset: 'bullet', transitionOut: 'slideLeft' },
      { id: 's2', slotIndex: 1, durationUs: 1_285_000, label: 'Glitch Rush', requiredType: 'video', isBeatDrop: true, speedCurvePreset: 'bullet', transitionOut: 'zoomIn' },
      { id: 's3', slotIndex: 2, durationUs: 2_142_000, label: 'Epic Finale', requiredType: 'any', isBeatDrop: false },
    ],
    defaultFilterId: 'cyberpunk',
    previewThumbnail: '👾',
    previewGradient: ['#F43F5E', '#10B981'],
    tags: ['#Glitch', '#Gaming', '#Cyberpunk', '#Action'],
  },
  {
    id: 'tpl_drill_stutter',
    title: 'Drill Stutter Velocity Ramp 🔥',
    category: 'Glitch & Velocity',
    description: 'Rapid 808 bass slides and hyper stutter cuts for street edits.',
    author: 'BeatCrafter',
    soundTitle: 'UK Drill 808 Slide — London Heat (142 BPM)',
    bpm: 142,
    aspectRatio: '9:16',
    slots: [
      { id: 's1', slotIndex: 0, durationUs: 1_267_000, label: 'Setup Shot', requiredType: 'video', isBeatDrop: false, transitionOut: 'slideLeft' },
      { id: 's2', slotIndex: 1, durationUs: 845_000, label: 'Bass Hit 1', requiredType: 'video', isBeatDrop: true, speedCurvePreset: 'bullet', transitionOut: 'dissolve' },
      { id: 's3', slotIndex: 2, durationUs: 845_000, label: 'Bass Hit 2', requiredType: 'video', isBeatDrop: true, speedCurvePreset: 'bullet', transitionOut: 'zoomIn' },
      { id: 's4', slotIndex: 3, durationUs: 1_690_000, label: 'Final Drop', requiredType: 'any', isBeatDrop: false },
    ],
    defaultFilterId: 'moody_dark',
    previewThumbnail: '🔥',
    previewGradient: ['#1F2937', '#DC2626'],
    tags: ['#Drill', '#Stutter', '#Rap', '#Bass', '#Hype'],
  },
  {
    id: 'tpl_aesthetic_vlog',
    title: 'Minimalist Mood Reel ☕',
    category: 'Aesthetic',
    description: 'Clean vintage aesthetic with warm tones and soft transitions.',
    author: 'PastelStories',
    soundTitle: 'Lo-Fi Chill Hop — Sunday Coffee (80 BPM)',
    bpm: 80,
    aspectRatio: '9:16',
    slots: [
      { id: 's1', slotIndex: 0, durationUs: 3_000_000, label: 'Morning Calm', requiredType: 'any', isBeatDrop: false, transitionOut: 'dissolve' },
      { id: 's2', slotIndex: 1, durationUs: 3_000_000, label: 'Daily Routine', requiredType: 'any', isBeatDrop: false, transitionOut: 'fade' },
      { id: 's3', slotIndex: 2, durationUs: 2_000_000, label: 'Cozy Moments', requiredType: 'any', isBeatDrop: false },
    ],
    defaultFilterId: 'vintage_70s',
    previewThumbnail: '☕',
    previewGradient: ['#F59E0B', '#D97706'],
    tags: ['#Aesthetic', '#LoFi', '#Minimal', '#DailyVlog'],
  },
  {
    id: 'tpl_polaroid_diary',
    title: 'Retro Polaroid Diary 📸',
    category: 'Aesthetic',
    description: 'Nostalgic film scrap-book feel with soft borders and memory stamps.',
    author: 'VintageArchive',
    soundTitle: 'Indie Acoustic Nostalgia — Warm Hug (72 BPM)',
    bpm: 72,
    aspectRatio: '9:16',
    slots: [
      { id: 's1', slotIndex: 0, durationUs: 2_500_000, label: 'Photo Memory 1', requiredType: 'any', isBeatDrop: false, transitionOut: 'fade' },
      { id: 's2', slotIndex: 1, durationUs: 2_500_000, label: 'Photo Memory 2', requiredType: 'any', isBeatDrop: false, transitionOut: 'dissolve' },
      { id: 's3', slotIndex: 2, durationUs: 3_333_000, label: 'Photo Memory 3', requiredType: 'any', isBeatDrop: false },
    ],
    defaultFilterId: 'vintage_70s',
    previewThumbnail: '📸',
    previewGradient: ['#EC4899', '#F59E0B'],
    tags: ['#Polaroid', '#Nostalgia', '#Memories', '#Diary', '#Friends'],
  },
  {
    id: 'tpl_fashion_lookbook',
    title: 'Streetwear Lookbook & OOTD 👟',
    category: 'Fashion & OOTD',
    description: 'Dynamic fit transitions with smooth cuts showcasing outfits and shoes.',
    author: 'StyleVault',
    soundTitle: 'Trap House Bounce — Look At This Fit (120 BPM)',
    bpm: 120,
    aspectRatio: '9:16',
    slots: [
      { id: 's1', slotIndex: 0, durationUs: 1_500_000, label: 'Full Fit Walk', requiredType: 'video', isBeatDrop: false, transitionOut: 'slideLeft' },
      { id: 's2', slotIndex: 1, durationUs: 1_000_000, label: 'Sneaker Close-up', requiredType: 'video', isBeatDrop: true, transitionOut: 'zoomIn' },
      { id: 's3', slotIndex: 2, durationUs: 1_000_000, label: 'Accessories / Jacket', requiredType: 'video', isBeatDrop: true, transitionOut: 'slideRight' },
      { id: 's4', slotIndex: 3, durationUs: 1_500_000, label: 'Pose & Finish', requiredType: 'any', isBeatDrop: false },
    ],
    defaultFilterId: 'fresh_pastel',
    previewThumbnail: '👟',
    previewGradient: ['#3B82F6', '#10B981'],
    tags: ['#OOTD', '#Fashion', '#Streetwear', '#Sneakers', '#FitCheck'],
  },
  {
    id: 'tpl_before_after',
    title: 'Transformation: Before & After 🔄',
    category: 'TikTok Trending',
    description: 'The viral 2-slot reveal transition for workouts, makeup, and edits.',
    author: 'ViralTrends',
    soundTitle: 'The Big Reveal — Countdown Drop (110 BPM)',
    bpm: 110,
    aspectRatio: '9:16',
    slots: [
      { id: 's1', slotIndex: 0, durationUs: 2_727_000, label: 'Before Condition', requiredType: 'any', isBeatDrop: false, transitionOut: 'slideLeft' },
      { id: 's2', slotIndex: 1, durationUs: 3_272_000, label: 'After Reveal ✨', requiredType: 'any', isBeatDrop: true },
    ],
    defaultFilterId: 'vivid_warm',
    previewThumbnail: '🔄',
    previewGradient: ['#8B5CF6', '#EC4899'],
    tags: ['#Transformation', '#BeforeAfter', '#GlowUp', '#Trend'],
  },
];

/**
 * Calculates audio beat markers based on BPM tempo.
 * Mimics CapCut's BeatTracking algorithms (com.vega.multicutsame.edit.BeatTracking).
 */
export function calculateBeatDropMarkers(bpm: number, totalDurationUs: number): number[] {
  if (bpm <= 0) return [];
  const beatIntervalUs = Math.round((60 / bpm) * MICROS_PER_SECOND);
  const beats: number[] = [];
  let currentUs = beatIntervalUs;
  while (currentUs < totalDurationUs) {
    beats.push(currentUs);
    currentUs += beatIntervalUs;
  }
  return beats;
}

export interface UserSelectedMediaSlot {
  slotIndex: number;
  uri: string;
  title: string;
  type: 'video' | 'image';
}

/**
 * Compiles a full NovaCut Project from a Template and user-selected media items.
 */
export function compileProjectFromTemplate(
  template: TemplateDefinition,
  selectedMedia: UserSelectedMediaSlot[]
): Project {
  const projectId = `proj_tpl_${Date.now()}`;
  const now = Date.now();

  let cumulativeTimeUs = 0;
  const videoClipIds: string[] = [];
  const clipsMap: Record<string, any> = {};
  const assetsMap: Record<string, MediaAsset> = {};

  template.slots.forEach((slot, index) => {
    const rawUserMedia = selectedMedia.find((m) => m.slotIndex === index);
    const demoUri = 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80';
    const effectiveUri = rawUserMedia?.uri || demoUri;
    const isImageMedia =
      rawUserMedia?.type === 'image' ||
      slot.requiredType === 'image' ||
      (!rawUserMedia && true) ||
      effectiveUri.toLowerCase().includes('unsplash') ||
      effectiveUri.toLowerCase().endsWith('.jpg') ||
      effectiveUri.toLowerCase().endsWith('.jpeg') ||
      effectiveUri.toLowerCase().endsWith('.png');

    const userMedia: UserSelectedMediaSlot = {
      slotIndex: index,
      uri: effectiveUri,
      title: rawUserMedia?.title || `${slot.label} (Demo)`,
      type: isImageMedia ? 'image' : 'video',
    };

    const clipId = `clip_tpl_${index}_${Date.now()}`;
    const assetId = `asset_${clipId}`;
    videoClipIds.push(clipId);

    assetsMap[assetId] = {
      id: assetId,
      uri: userMedia.uri,
      name: userMedia.title || slot.label,
      type: userMedia.type,
      metadata: {
        width: 1080,
        height: 1920,
        durationUs: slot.durationUs,
        fps: 30,
        mimeType: userMedia.type === 'image' ? 'image/jpeg' : 'video/mp4',
        fileSize: 0,
        hasAudio: userMedia.type !== 'image',
      },
      createdAt: now,
    };

    const slotClip: VideoClip | ImageClip =
      userMedia.type === 'image'
        ? {
            id: clipId,
            trackId: 'track_video_main',
            type: 'image',
            name: slot.label,
            timelineRange: {
              startUs: cumulativeTimeUs,
              durationUs: slot.durationUs,
            },
            assetId,
            transform: DEFAULT_TRANSFORM,
            colorAdjustments:
              template.defaultFilterId === 'teal_orange'
                ? { brightness: 0, contrast: 1.2, saturation: 1.25, temperature: 0.2 }
                : template.defaultFilterId === 'cyberpunk'
                ? { brightness: 0.05, contrast: 1.35, saturation: 1.3, temperature: 0 }
                : { brightness: 0, contrast: 1.0, saturation: 1.0, temperature: 0 },
            transitionOut: slot.transitionOut
              ? {
                  type: slot.transitionOut,
                  durationUs: 500_000,
                }
              : undefined,
          }
        : {
            id: clipId,
            trackId: 'track_video_main',
            type: 'video',
            name: slot.label,
            timelineRange: {
              startUs: cumulativeTimeUs,
              durationUs: slot.durationUs,
            },
            sourceRange: {
              startUs: 0,
              durationUs: slot.durationUs,
            },
            assetId,
            speed: 1.0,
            volume: 1.0,
            transform: DEFAULT_TRANSFORM,
            colorAdjustments:
              template.defaultFilterId === 'teal_orange'
                ? { brightness: 0, contrast: 1.2, saturation: 1.25, temperature: 0.2 }
                : template.defaultFilterId === 'cyberpunk'
                ? { brightness: 0.05, contrast: 1.35, saturation: 1.3, temperature: 0 }
                : { brightness: 0, contrast: 1.0, saturation: 1.0, temperature: 0 },
            transitionOut: slot.transitionOut
              ? {
                  type: slot.transitionOut,
                  durationUs: 500_000,
                }
              : undefined,
          };

    clipsMap[clipId] = slotClip;
    cumulativeTimeUs += slot.durationUs;
  });

  // Background music track
  const audioClipId = `audio_tpl_bg_${Date.now()}`;
  const audioClip: AudioClip = {
    id: audioClipId,
    trackId: 'track_audio_bg',
    type: 'audio',
    name: template.soundTitle,
    timelineRange: {
      startUs: 0,
      durationUs: cumulativeTimeUs,
    },
    sourceRange: {
      startUs: 0,
      durationUs: cumulativeTimeUs,
    },
    assetId: `asset_sound_${template.id}`,
    speed: 1.0,
    volume: 0.85,
    fadeInDurationUs: 500_000,
    fadeOutDurationUs: 1_000_000,
  };
  clipsMap[audioClipId] = audioClip;

  // Title Text Overlay
  const titleTextId = `text_tpl_title_${Date.now()}`;
  const textClip: TextOverlay = {
    id: titleTextId,
    trackId: 'track_text_main',
    type: 'text',
    name: 'Template Title Overlay',
    timelineRange: {
      startUs: 200_000,
      durationUs: 2_500_000,
    },
    text: template.title,
    fontSize: 26,
    textColor: '#FFFFFF',
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignment: 'center',
    transform: DEFAULT_TRANSFORM,
  };
  clipsMap[titleTextId] = textClip;

  const project: Project = {
    metadata: {
      id: projectId,
      title: `${template.title}`,
      createdAt: now,
      updatedAt: now,
      durationUs: cumulativeTimeUs,
      schemaVersion: 1,
    },
    settings: DEFAULT_PROJECT_SETTINGS[template.aspectRatio],
    exportSettings: DEFAULT_EXPORT_SETTINGS,
    tracks: [
      {
        id: 'track_video_main',
        name: 'Main Video Track',
        type: 'video',
        isLocked: false,
        isMuted: false,
        isVisible: true,
        zIndex: 1,
        clips: videoClipIds,
      },
      {
        id: 'track_audio_bg',
        name: 'Background Audio',
        type: 'audio',
        isLocked: false,
        isMuted: false,
        isVisible: true,
        zIndex: 2,
        clips: [audioClipId],
      },
      {
        id: 'track_text_main',
        name: 'Title Overlay',
        type: 'text',
        isLocked: false,
        isMuted: false,
        isVisible: true,
        zIndex: 3,
        clips: [titleTextId],
      },
    ],
    clips: clipsMap,
    assets: assetsMap,
  };

  return project;
}
