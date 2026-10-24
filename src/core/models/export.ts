export type ExportResolutionPreset = '720p' | '1080p' | '4K';
export type ExportFpsPreset = 24 | 30 | 60;
export type ExportQualityPreset = 'standard' | 'high' | 'ultra';

export interface ExportSettings {
  resolutionPreset: ExportResolutionPreset;
  width: number;
  height: number;
  fps: ExportFpsPreset;
  quality: ExportQualityPreset;
  videoBitrateMbps: number;
  audioBitrateKbps: number;
  format: 'mp4';
}

export type ExportJobStatus = 'idle' | 'rendering' | 'completed' | 'failed' | 'cancelled';

export interface ExportJob {
  id: string;
  projectId: string;
  status: ExportJobStatus;
  progress: number; // 0.0 to 1.0
  outputPath?: string;
  error?: string;
  startedAt?: number;
  completedAt?: number;
}

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  resolutionPreset: '1080p',
  width: 1080,
  height: 1920,
  fps: 30,
  quality: 'high',
  videoBitrateMbps: 12,
  audioBitrateKbps: 192,
  format: 'mp4',
};
