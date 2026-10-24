import { TimeRange } from './timeline';

export type ClipType = 'video' | 'image' | 'audio' | 'text';

export interface Transform {
  scale: number;
  rotationDeg: number;
  translateX: number;
  translateY: number;
  opacity: number;
  crop?: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  };
}

export interface ColorAdjustments {
  brightness: number; // -1.0 to 1.0 (default 0)
  contrast: number;   // 0.0 to 2.0 (default 1.0)
  saturation: number; // 0.0 to 2.0 (default 1.0)
  temperature: number;// -1.0 to 1.0 (default 0)
}

export type TransitionType = 'none' | 'fade' | 'dissolve' | 'slideLeft' | 'slideRight' | 'zoomIn';

export interface Transition {
  type: TransitionType;
  durationUs: number;
}

export type BlendMode =
  | 'normal'
  | 'screen'
  | 'multiply'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'softLight'
  | 'hardLight';

export interface Keyframe<T = number> {
  timeUs: number;
  value: T;
  easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
}

export interface KeyframeTrack {
  scale?: Keyframe<number>[];
  rotationDeg?: Keyframe<number>[];
  translateX?: Keyframe<number>[];
  translateY?: Keyframe<number>[];
  opacity?: Keyframe<number>[];
  volume?: Keyframe<number>[];
}

export interface SpeedCurvePoint {
  x: number; // normalized time 0.0 to 1.0
  y: number; // speed multiplier 0.1x to 10.0x
}

export type SpeedCurvePreset =
  | 'standard'
  | 'montage'
  | 'hero'
  | 'bullet'
  | 'jumpCut'
  | 'flashIn'
  | 'flashOut';

export interface SpeedCurve {
  preset: SpeedCurvePreset;
  points: SpeedCurvePoint[];
}

export interface BaseClip {
  id: string;
  trackId: string;
  type: ClipType;
  name: string;
  /** Active placement range on the global timeline */
  timelineRange: TimeRange;
}

export interface VideoClip extends BaseClip {
  type: 'video';
  assetId: string;
  /** Range in the underlying media file to decode/play */
  sourceRange: TimeRange;
  speed: number;
  volume: number;
  transform: Transform;
  colorAdjustments: ColorAdjustments;
  transitionIn?: Transition;
  transitionOut?: Transition;
  blendMode?: BlendMode;
  keyframes?: KeyframeTrack;
  speedCurve?: SpeedCurve;
  lutFilterId?: string;
  lutIntensity?: number;
  visualEffect?: string;
  visualEffectIntensity?: number;
}

export interface ImageClip extends BaseClip {
  type: 'image';
  assetId: string;
  transform: Transform;
  colorAdjustments: ColorAdjustments;
  transitionIn?: Transition;
  transitionOut?: Transition;
  blendMode?: BlendMode;
  keyframes?: KeyframeTrack;
  lutFilterId?: string;
  lutIntensity?: number;
  visualEffect?: string;
  visualEffectIntensity?: number;
}

export interface AudioClip extends BaseClip {
  type: 'audio';
  assetId: string;
  sourceRange: TimeRange;
  volume: number;
  fadeInDurationUs: number;
  fadeOutDurationUs: number;
  speed: number;
}

export interface TextOverlay extends BaseClip {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily?: string;
  textColor: string;
  outlineColor?: string;
  outlineWidth?: number;
  backgroundColor?: string;
  alignment: 'left' | 'center' | 'right';
  transform: Transform;
}

export type Clip = VideoClip | ImageClip | AudioClip | TextOverlay;

export const DEFAULT_TRANSFORM: Transform = {
  scale: 1.0,
  rotationDeg: 0,
  translateX: 0,
  translateY: 0,
  opacity: 1.0,
};

export const DEFAULT_COLOR_ADJUSTMENTS: ColorAdjustments = {
  brightness: 0,
  contrast: 1.0,
  saturation: 1.0,
  temperature: 0,
};

export const CAPCUT_PALETTE: readonly string[] = [
  '#ffffff', '#000000', '#fb3147', '#fd6d41', '#fef015',
  '#4de51a', '#3afaf2', '#1eb4e1', '#2a73f7', '#fd86fd',
  '#747474', '#fd8e70', '#fc992e', '#ffd2ef', '#913a05',
  '#5cfebf', '#24a348', '#95d4f9', '#e94f86', '#cd7dfc'
];
