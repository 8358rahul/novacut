/**
 * CapCut / JianYing Native Draft Data Model
 * Reverse-engineered from ByteDance CapCut APK (`capcut.apk`, `assets/splitscreen/split_screen_*.zip/template.json`,
 * and `assets/kernel_scene_edit_record.txt` com.vega.draft.data.template.*).
 *
 * Microsecond integer timebase: 1 second = 1,000,000 µs.
 * Tracks: flag 0 = main track (magnetic adsorption), flag 2 = Picture-in-Picture (PIP) overlay track.
 */

export interface CapCutTimerange {
  /** Offset in integer microseconds */
  start: number;
  /** Duration in integer microseconds */
  duration: number;
}

export interface CapCutScale {
  x: number;
  y: number;
}

export interface CapCutTransform {
  /** Normalized coordinate: 0 is center, -0.25 is left/bottom, +0.25 is right/top */
  x: number;
  y: number;
}

export interface CapCutFlip {
  horizontal: boolean;
  vertical: boolean;
}

export interface CapCutClipGeometry {
  alpha: number;
  flip: CapCutFlip;
  rotation: number;
  scale: CapCutScale;
  transform: CapCutTransform;
}

export interface CapCutCrop {
  upper_left_x: number;
  upper_left_y: number;
  upper_right_x: number;
  upper_right_y: number;
  lower_left_x: number;
  lower_left_y: number;
  lower_right_x: number;
  lower_right_y: number;
}

export interface CapCutVideoMaterial {
  id: string;
  type: 'video' | 'photo';
  path: string;
  duration: number; // in microseconds
  width: number;
  height: number;
  has_audio: boolean;
  crop?: CapCutCrop;
  crop_ratio?: string;
  crop_scale?: number;
  material_name?: string;
}

export interface CapCutAudioMaterial {
  id: string;
  type: 'extract_music' | 'record' | 'sound_effect';
  path: string;
  duration: number; // in microseconds
  name?: string;
}

export interface CapCutTextMaterial {
  id: string;
  type: 'text';
  content: string;
  font_path?: string;
  font_size?: number;
  text_color?: string;
}

export interface CapCutMaterials {
  videos: CapCutVideoMaterial[];
  audios?: CapCutAudioMaterial[];
  texts?: CapCutTextMaterial[];
}

export interface CapCutSegment {
  id: string;
  material_id: string;
  render_index: number;
  source_timerange: CapCutTimerange;
  target_timerange: CapCutTimerange;
  speed: number;
  volume: number;
  visible: boolean;
  reverse: boolean;
  clip: CapCutClipGeometry;
  enable_adjust?: boolean;
  enable_color_curves?: boolean;
  enable_color_wheels?: boolean;
  enable_lut?: boolean;
  track_attribute?: number;
  track_render_index?: number;
  group_id?: string;
}

export type CapCutTrackType = 'video' | 'audio' | 'effect' | 'filter' | 'sticker' | 'text';

export interface CapCutTrack {
  id: string;
  type: CapCutTrackType;
  attribute: number;
  /** Track flag: 0 = primary/main track (magnetic adsorption), 2 = PIP / overlay track */
  flag: number;
  segments: CapCutSegment[];
}

export interface CapCutCanvasConfig {
  ratio: '1:1' | '9:16' | '16:9' | '4:5' | '21:9' | 'original' | string;
  width: number;
  height: number;
}

export interface CapCutConfig {
  adjust_max_index: number;
  combination_max_index?: number;
  extract_audio_last_index?: number;
  lyrics_recognition_id?: string;
  lyrics_sync?: boolean;
  /** Magnetic adsorption on main track */
  maintrack_adsorb: boolean;
  material_save_mode: number;
  original_sound_last_index?: number;
  record_audio_last_index?: number;
  sticker_max_index?: number;
  subtitle_recognition_id?: string;
  subtitle_sync?: boolean;
  video_mute: boolean;
}

export interface CapCutPlatformInfo {
  app_id?: number;
  app_version?: string;
  os: 'Android' | 'iOS' | 'Windows' | 'Mac';
  os_version?: string;
}

export interface CapCutDraft {
  id: string;
  name?: string;
  duration: number; // in microseconds
  fps: number;
  version: number;
  new_version?: string;
  source: 'jianying' | 'capcut';
  color_space: number;
  create_time: number; // in microseconds
  update_time: number; // in microseconds
  canvas_config: CapCutCanvasConfig;
  config: CapCutConfig;
  materials: CapCutMaterials;
  tracks: CapCutTrack[];
  keyframes?: Record<string, unknown>;
  extra_info?: Record<string, unknown>;
  platform?: CapCutPlatformInfo;
}

