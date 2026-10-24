export type AssetType = 'video' | 'image' | 'audio';

export interface MediaMetadata {
  width: number;
  height: number;
  durationUs: number;
  fps: number;
  mimeType: string;
  fileSize: number;
  hasAudio: boolean;
  bitrate?: number;
}

export interface MediaAsset {
  id: string;
  uri: string;
  name: string;
  type: AssetType;
  metadata: MediaMetadata;
  thumbnailUri?: string;
  createdAt: number;
}
