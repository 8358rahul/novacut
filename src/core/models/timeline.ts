export type TrackType = 'video' | 'audio' | 'text' | 'overlay';

export interface TimeRange {
  /** Timeline start offset in microseconds (1 sec = 1,000,000 µs) */
  startUs: number;
  /** Active duration on the timeline in microseconds */
  durationUs: number;
}

export interface TimelineTrack {
  id: string;
  type: TrackType;
  name: string;
  isMuted: boolean;
  isLocked: boolean;
  isVisible: boolean;
  zIndex: number;
  clips: string[]; // Clip IDs belonging to this track
}

/** Microseconds per second constant for integer timebase conversions */
export const MICROS_PER_SECOND = 1_000_000;
export const MICROS_PER_MILLI = 1_000;

export function millisToMicros(ms: number): number {
  return Math.round(ms * MICROS_PER_MILLI);
}

export function microsToMillis(us: number): number {
  return Math.round(us / MICROS_PER_MILLI);
}

export function secondsToMicros(sec: number): number {
  return Math.round(sec * MICROS_PER_SECOND);
}

export function microsToSeconds(us: number): number {
  return us / MICROS_PER_SECOND;
}

export function framesToMicros(frames: number, fps: number): number {
  return Math.round((frames / fps) * MICROS_PER_SECOND);
}

export function microsToFrames(us: number, fps: number): number {
  return Math.floor((us / MICROS_PER_SECOND) * fps);
}

/**
 * Format microseconds to "MM:SS.ms" or "HH:MM:SS.ms" timecode display
 */
export function formatTimecode(micros: number, showHours: boolean = false): string {
  const totalSeconds = Math.max(0, micros / MICROS_PER_SECOND);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const centiseconds = Math.floor((totalSeconds % 1) * 100);

  const pad = (n: number, z: number = 2) => n.toString().padStart(z, '0');

  if (showHours || hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(centiseconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}.${pad(centiseconds)}`;
}
