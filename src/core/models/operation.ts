export type OperationType =
  | 'TRIM_CLIP_START'
  | 'TRIM_CLIP_END'
  | 'SPLIT_CLIP'
  | 'DELETE_CLIP'
  | 'DUPLICATE_CLIP'
  | 'REORDER_CLIPS'
  | 'ADD_CLIP'
  | 'UPDATE_CLIP_SPEED'
  | 'UPDATE_CLIP_VOLUME'
  | 'UPDATE_CLIP_TRANSFORM'
  | 'UPDATE_CLIP_COLOR'
  | 'UPDATE_CLIP_TRANSITION'
  | 'UPDATE_CLIP_AUDIO'
  | 'IMPORT_SUBTITLES'
  | 'UPDATE_CLIP_KEYFRAME'
  | 'UPDATE_SPEED_CURVE'
  | 'UPDATE_BLEND_MODE'
  | 'SET_LUT_FILTER'
  | 'SET_VISUAL_EFFECT'
  | 'ADD_TRACK'
  | 'DELETE_TRACK';

export interface EditOperation<T = any> {
  id: string;
  type: OperationType;
  description: string;
  timestamp: number;
  payload: T;
  inversePayload: T;
}
