import { Clip } from '../models/clip';
import { TimelineTrack, MICROS_PER_SECOND } from '../models/timeline';

export interface TimelineBounds {
  startUs: number;
  endUs: number;
  durationUs: number;
}

/**
 * Calculates the bounding time range of a single track.
 */
export function getTrackBounds(trackClips: Clip[]): TimelineBounds {
  if (trackClips.length === 0) {
    return { startUs: 0, endUs: 0, durationUs: 0 };
  }

  let minStart = Infinity;
  let maxEnd = 0;

  for (const clip of trackClips) {
    const start = clip.timelineRange.startUs;
    const end = start + clip.timelineRange.durationUs;
    if (start < minStart) minStart = start;
    if (end > maxEnd) maxEnd = end;
  }

  const startUs = minStart === Infinity ? 0 : minStart;
  const endUs = maxEnd;
  return {
    startUs,
    endUs,
    durationUs: Math.max(0, endUs - startUs),
  };
}

/**
 * Calculates the total duration of the project across all tracks.
 */
export function calculateProjectDurationUs(allClips: Record<string, Clip>): number {
  let maxEnd = 0;
  for (const clipId in allClips) {
    const clip = allClips[clipId];
    const end = clip.timelineRange.startUs + clip.timelineRange.durationUs;
    if (end > maxEnd) maxEnd = end;
  }
  return maxEnd;
}

/**
 * Finds which clip on a track is active at the given playhead time.
 */
export function findActiveClipAtTime(
  trackClips: Clip[],
  playheadTimeUs: number
): Clip | null {
  for (const clip of trackClips) {
    const start = clip.timelineRange.startUs;
    const end = start + clip.timelineRange.durationUs;
    if (playheadTimeUs >= start && playheadTimeUs < end) {
      return clip;
    }
  }
  return null;
}

/**
 * Calculates the source time inside a video/audio asset given the timeline playhead.
 */
export function calculateSourceTimeUs(
  timelinePlayheadUs: number,
  clipStartUs: number,
  sourceStartUs: number,
  speed: number = 1.0
): number {
  const elapsedTimelineUs = Math.max(0, timelinePlayheadUs - clipStartUs);
  const elapsedSourceUs = Math.round(elapsedTimelineUs * speed);
  return sourceStartUs + elapsedSourceUs;
}

/**
 * Snapping calculation: checks if a target time is within snapThresholdUs
 * of snap targets (track boundaries, other clip edges, or playhead).
 */
export function snapTimeToPoints(
  targetTimeUs: number,
  snapPoints: number[],
  snapThresholdUs: number = 200_000 // 200ms default snap radius
): { snappedTimeUs: number; didSnap: boolean } {
  let closestDist = Infinity;
  let bestPoint = targetTimeUs;

  for (const pt of snapPoints) {
    const dist = Math.abs(targetTimeUs - pt);
    if (dist <= snapThresholdUs && dist < closestDist) {
      closestDist = dist;
      bestPoint = pt;
    }
  }

  return {
    snappedTimeUs: bestPoint,
    didSnap: bestPoint !== targetTimeUs,
  };
}

/**
 * Zoom mapping utilities:
 * Converts between timeline microseconds and horizontal scroll pixel offset.
 */
export function timeUsToPixels(timeUs: number, pixelsPerSecond: number): number {
  return (timeUs / MICROS_PER_SECOND) * pixelsPerSecond;
}

export function pixelsToTimeUs(pixelOffset: number, pixelsPerSecond: number): number {
  return Math.max(0, Math.round((pixelOffset / pixelsPerSecond) * MICROS_PER_SECOND));
}
