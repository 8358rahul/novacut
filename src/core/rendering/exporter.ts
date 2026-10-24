import { Project } from '../models/project';
import { ExportSettings, ExportJob } from '../models/export';
import { Clip, VideoClip, AudioClip } from '../models/clip';
import { microsToSeconds } from '../models/timeline';

export interface RenderClipSegment {
  sourceUri: string;
  sourceStartSec: number;
  sourceDurationSec: number;
  outputStartSec: number;
  outputDurationSec: number;
  speed: number;
  volume: number;
  trackType: 'video' | 'audio';
}

export interface ExportCompositionPlan {
  projectId: string;
  outputResolution: { width: number; height: number };
  fps: number;
  videoBitrateMbps: number;
  audioBitrateKbps: number;
  segments: RenderClipSegment[];
  totalDurationSec: number;
  estimatedFileSizeMb: number;
}

/**
 * Builds a deterministic, validated composition plan from a NovaCut project.
 * This plan is consumed by the Android native Media3 / FFmpeg export worker.
 */
export function buildExportCompositionPlan(
  project: Project,
  clips: Record<string, Clip>,
  assetUriMap: Record<string, string>,
  exportSettings?: ExportSettings
): ExportCompositionPlan {
  const settings = exportSettings || project.exportSettings;
  const segments: RenderClipSegment[] = [];

  // 1. Process Video Tracks
  const videoTracks = project.tracks.filter((t) => t.type === 'video' && t.isVisible);
  for (const track of videoTracks) {
    for (const clipId of track.clips) {
      const clip = clips[clipId] as VideoClip;
      if (!clip) continue;

      const sourceUri = assetUriMap[clip.assetId] || `mock://${clip.assetId}`;
      const sourceStartSec = microsToSeconds(clip.sourceRange.startUs);
      const sourceDurationSec = microsToSeconds(clip.sourceRange.durationUs);
      const outputStartSec = microsToSeconds(clip.timelineRange.startUs);
      const outputDurationSec = microsToSeconds(clip.timelineRange.durationUs);

      segments.push({
        sourceUri,
        sourceStartSec,
        sourceDurationSec,
        outputStartSec,
        outputDurationSec,
        speed: clip.speed || 1.0,
        volume: track.isMuted ? 0 : clip.volume,
        trackType: 'video',
      });
    }
  }

  // 2. Process Audio Tracks
  const audioTracks = project.tracks.filter((t) => t.type === 'audio' && !t.isMuted);
  for (const track of audioTracks) {
    for (const clipId of track.clips) {
      const clip = clips[clipId] as AudioClip;
      if (!clip) continue;

      const sourceUri = assetUriMap[clip.assetId] || `mock://${clip.assetId}`;
      segments.push({
        sourceUri,
        sourceStartSec: microsToSeconds(clip.sourceRange.startUs),
        sourceDurationSec: microsToSeconds(clip.sourceRange.durationUs),
        outputStartSec: microsToSeconds(clip.timelineRange.startUs),
        outputDurationSec: microsToSeconds(clip.timelineRange.durationUs),
        speed: clip.speed || 1.0,
        volume: clip.volume,
        trackType: 'audio',
      });
    }
  }

  // Calculate total rendered duration
  const totalDurationSec = segments.reduce((max, seg) => {
    const end = seg.outputStartSec + seg.outputDurationSec;
    return end > max ? end : max;
  }, 0);

  // Estimate output file size: Duration (s) * (VideoBitrate + AudioBitrate) / 8
  const totalBitrateMbps = settings.videoBitrateMbps + settings.audioBitrateKbps / 1000;
  const estimatedFileSizeMb = Math.round(((totalDurationSec * totalBitrateMbps) / 8) * 100) / 100;

  return {
    projectId: project.metadata.id,
    outputResolution: { width: settings.width, height: settings.height },
    fps: settings.fps,
    videoBitrateMbps: settings.videoBitrateMbps,
    audioBitrateKbps: settings.audioBitrateKbps,
    segments,
    totalDurationSec,
    estimatedFileSizeMb,
  };
}

/**
 * Generates an FFmpeg complex filtergraph command string for the export plan.
 * Used for headless rendering and native media processing.
 */
export function generateFfmpegCommand(
  plan: ExportCompositionPlan,
  outputFilePath: string
): string[] {
  const args: string[] = ['-y'];

  // Add inputs
  const inputUris: string[] = [];
  plan.segments.forEach((seg) => {
    if (!inputUris.includes(seg.sourceUri)) {
      inputUris.push(seg.sourceUri);
      args.push('-i', seg.sourceUri);
    }
  });

  // Scale and format options
  args.push(
    '-vf',
    `scale=${plan.outputResolution.width}:${plan.outputResolution.height}:force_original_aspect_ratio=decrease,pad=${plan.outputResolution.width}:${plan.outputResolution.height}:(ow-iw)/2:(oh-ih)/2`,
    '-r',
    `${plan.fps}`,
    '-c:v',
    'libx264',
    '-b:v',
    `${plan.videoBitrateMbps}M`,
    '-c:a',
    'aac',
    '-b:a',
    `${plan.audioBitrateKbps}k`,
    '-movflags',
    '+faststart',
    outputFilePath
  );

  return args;
}
