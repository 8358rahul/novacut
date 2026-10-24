import { TimelineTrack } from './timeline';
import { ExportSettings } from './export';
import { Clip } from './clip';
import { MediaAsset } from './asset';

export type AspectRatio = '9:16' | '16:9' | '1:1' | '4:5' | '21:9';

export interface ProjectSettings {
  width: number;
  height: number;
  fps: number;
  aspectRatio: AspectRatio;
  sampleRate: number;
  backgroundColor: string;
}

export interface ProjectMetadata {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  thumbnailUri?: string;
  durationUs: number;
  schemaVersion: number;
}

export interface Project {
  metadata: ProjectMetadata;
  settings: ProjectSettings;
  tracks: TimelineTrack[];
  clips?: Record<string, Clip>;
  assets?: Record<string, MediaAsset>;
  exportSettings: ExportSettings;
}

export const CURRENT_SCHEMA_VERSION = 1;

export const DEFAULT_PROJECT_SETTINGS: Record<AspectRatio, ProjectSettings> = {
  '9:16': {
    width: 1080,
    height: 1920,
    fps: 30,
    aspectRatio: '9:16',
    sampleRate: 44100,
    backgroundColor: '#000000',
  },
  '16:9': {
    width: 1920,
    height: 1080,
    fps: 30,
    aspectRatio: '16:9',
    sampleRate: 44100,
    backgroundColor: '#000000',
  },
  '1:1': {
    width: 1080,
    height: 1080,
    fps: 30,
    aspectRatio: '1:1',
    sampleRate: 44100,
    backgroundColor: '#000000',
  },
  '4:5': {
    width: 1080,
    height: 1350,
    fps: 30,
    aspectRatio: '4:5',
    sampleRate: 44100,
    backgroundColor: '#000000',
  },
  '21:9': {
    width: 2560,
    height: 1080,
    fps: 30,
    aspectRatio: '21:9',
    sampleRate: 44100,
    backgroundColor: '#000000',
  },
};
