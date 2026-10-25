import { Clip, VideoClip, AudioClip } from '../models/clip';
import { TimelineTrack } from '../models/timeline';

export interface OperationResult {
  updatedClips: Record<string, Clip>;
  updatedTrack: TimelineTrack;
  newClipId?: string;
  affectedClipIds: string[];
}

/**
 * Trims the start point of a clip (moving its start rightwards or leftwards).
 * Adjusts the sourceRange for media clips proportionally.
 */
export function trimClipStart(
  track: TimelineTrack,
  clips: Record<string, Clip>,
  clipId: string,
  newStartUs: number,
  minDurationUs: number = 200_000 // minimum 200ms clip duration
): OperationResult {
  const clip = clips[clipId];
  if (!clip) throw new Error(`Clip ${clipId} not found`);

  const currentStart = clip.timelineRange.startUs;
  const currentDuration = clip.timelineRange.durationUs;
  const currentEnd = currentStart + currentDuration;

  // New duration must be at least minDurationUs
  const clampedStart = Math.min(newStartUs, currentEnd - minDurationUs);
  const deltaUs = clampedStart - currentStart;
  const newDurationUs = currentDuration - deltaUs;

  let updatedClip: Clip = {
    ...clip,
    timelineRange: {
      startUs: clampedStart,
      durationUs: newDurationUs,
    },
  };

  // Adjust media sourceRange if applicable
  if (clip.type === 'video' || clip.type === 'audio') {
    const mediaClip = clip as VideoClip | AudioClip;
    const speed = mediaClip.speed || 1.0;
    const sourceDeltaUs = Math.round(deltaUs * speed);
    const newSourceStart = Math.max(0, mediaClip.sourceRange.startUs + sourceDeltaUs);
    const newSourceDuration = Math.round(newDurationUs * speed);

    updatedClip = {
      ...updatedClip,
      sourceRange: {
        startUs: newSourceStart,
        durationUs: newSourceDuration,
      },
    } as Clip;
  }

  return {
    updatedClips: {
      ...clips,
      [clipId]: updatedClip,
    },
    updatedTrack: track,
    affectedClipIds: [clipId],
  };
}

/**
 * Trims the end point of a clip (moving its end leftwards or rightwards).
 */
export function trimClipEnd(
  track: TimelineTrack,
  clips: Record<string, Clip>,
  clipId: string,
  newEndUs: number,
  minDurationUs: number = 200_000
): OperationResult {
  const clip = clips[clipId];
  if (!clip) throw new Error(`Clip ${clipId} not found`);

  const currentStart = clip.timelineRange.startUs;
  const clampedEnd = Math.max(newEndUs, currentStart + minDurationUs);
  const newDurationUs = clampedEnd - currentStart;

  let updatedClip: Clip = {
    ...clip,
    timelineRange: {
      startUs: currentStart,
      durationUs: newDurationUs,
    },
  };

  if (clip.type === 'video' || clip.type === 'audio') {
    const mediaClip = clip as VideoClip | AudioClip;
    const speed = mediaClip.speed || 1.0;
    const newSourceDuration = Math.round(newDurationUs * speed);

    updatedClip = {
      ...updatedClip,
      sourceRange: {
        startUs: mediaClip.sourceRange.startUs,
        durationUs: newSourceDuration,
      },
    } as Clip;
  }

  return {
    updatedClips: {
      ...clips,
      [clipId]: updatedClip,
    },
    updatedTrack: track,
    affectedClipIds: [clipId],
  };
}

/**
 * Splits a clip into two separate clips at the exact splitTimeUs playhead position.
 */
export function splitClip(
  track: TimelineTrack,
  clips: Record<string, Clip>,
  clipId: string,
  splitTimeUs: number,
  minDurationUs: number = 200_000
): OperationResult {
  const original = clips[clipId];
  if (!original) throw new Error(`Clip ${clipId} not found`);

  const start = original.timelineRange.startUs;
  const duration = original.timelineRange.durationUs;
  const end = start + duration;

  // Split point must be inside the clip with at least minDuration on each side
  if (splitTimeUs <= start + minDurationUs || splitTimeUs >= end - minDurationUs) {
    throw new Error(
      `Cannot split clip at ${splitTimeUs}µs: must be between ${start + minDurationUs}µs and ${end - minDurationUs}µs`
    );
  }

  const firstDurationUs = splitTimeUs - start;
  const secondDurationUs = end - splitTimeUs;
  const secondClipId = `${original.id}_split_${Date.now()}`;

  // First half clip
  let firstClip: Clip = {
    ...original,
    timelineRange: {
      startUs: start,
      durationUs: firstDurationUs,
    },
  };

  // Second half clip
  let secondClip: Clip = {
    ...original,
    id: secondClipId,
    timelineRange: {
      startUs: splitTimeUs,
      durationUs: secondDurationUs,
    },
  };

  if (original.type === 'video' || original.type === 'audio') {
    const mediaClip = original as VideoClip | AudioClip;
    const speed = mediaClip.speed || 1.0;
    const firstSourceDuration = Math.round(firstDurationUs * speed);
    const secondSourceStart = mediaClip.sourceRange.startUs + firstSourceDuration;
    const secondSourceDuration = Math.round(secondDurationUs * speed);

    firstClip = {
      ...firstClip,
      sourceRange: {
        startUs: mediaClip.sourceRange.startUs,
        durationUs: firstSourceDuration,
      },
    } as Clip;

    secondClip = {
      ...secondClip,
      sourceRange: {
        startUs: secondSourceStart,
        durationUs: secondSourceDuration,
      },
    } as Clip;
  }

  // Insert second clip immediately after first in the track's clip order
  const clipIndex = track.clips.indexOf(clipId);
  const updatedTrackClips = [...track.clips];
  updatedTrackClips.splice(clipIndex + 1, 0, secondClipId);

  return {
    updatedClips: {
      ...clips,
      [clipId]: firstClip,
      [secondClipId]: secondClip,
    },
    updatedTrack: {
      ...track,
      clips: updatedTrackClips,
    },
    newClipId: secondClipId,
    affectedClipIds: [clipId, secondClipId],
  };
}

/**
 * Deletes a clip from a track, optionally rippling subsequent clips leftward.
 */
export function deleteClip(
  track: TimelineTrack,
  clips: Record<string, Clip>,
  clipId: string,
  ripple: boolean = false
): OperationResult {
  const clipToDelete = clips[clipId];
  if (!clipToDelete) throw new Error(`Clip ${clipId} not found`);

  const updatedClips = { ...clips };
  delete updatedClips[clipId];

  const updatedTrackClips = track.clips.filter((id) => id !== clipId);
  const affectedClipIds = [clipId];

  if (ripple) {
    const deletedDuration = clipToDelete.timelineRange.durationUs;
    const deletedStart = clipToDelete.timelineRange.startUs;

    for (const id of updatedTrackClips) {
      const c = updatedClips[id];
      if (c && c.timelineRange.startUs > deletedStart) {
        updatedClips[id] = {
          ...c,
          timelineRange: {
            ...c.timelineRange,
            startUs: Math.max(deletedStart, c.timelineRange.startUs - deletedDuration),
          },
        };
        affectedClipIds.push(id);
      }
    }
  }

  return {
    updatedClips,
    updatedTrack: {
      ...track,
      clips: updatedTrackClips,
    },
    affectedClipIds,
  };
}

/**
 * Duplicates a clip and places it immediately after the original clip.
 */
export function duplicateClip(
  track: TimelineTrack,
  clips: Record<string, Clip>,
  clipId: string
): OperationResult {
  const original = clips[clipId];
  if (!original) throw new Error(`Clip ${clipId} not found`);

  const newClipId = `${original.id}_dup_${Date.now()}`;
  const originalEnd = original.timelineRange.startUs + original.timelineRange.durationUs;

  const duplicatedClip: Clip = {
    ...original,
    id: newClipId,
    name: `${original.name} (Copy)`,
    timelineRange: {
      startUs: originalEnd,
      durationUs: original.timelineRange.durationUs,
    },
  };

  const clipIndex = track.clips.indexOf(clipId);
  const updatedTrackClips = [...track.clips];
  updatedTrackClips.splice(clipIndex + 1, 0, newClipId);

  return {
    updatedClips: {
      ...clips,
      [newClipId]: duplicatedClip,
    },
    updatedTrack: {
      ...track,
      clips: updatedTrackClips,
    },
    newClipId,
    affectedClipIds: [newClipId],
  };
}

/**
 * Updates playback speed for a video or audio clip and adjusts timeline range duration accordingly.
 */
export function changeClipSpeed(
  clips: Record<string, Clip>,
  clipId: string,
  newSpeed: number
): Record<string, Clip> {
  const clip = clips[clipId];
  if (!clip) throw new Error(`Clip ${clipId} not found`);
  if (clip.type !== 'video' && clip.type !== 'audio') return clips;

  const mediaClip = clip as VideoClip | AudioClip;
  if (newSpeed <= 0) throw new Error('Speed must be positive');

  // Timeline duration changes inversely with speed
  const newTimelineDurationUs = Math.round(mediaClip.sourceRange.durationUs / newSpeed);

  const updatedClip: Clip = {
    ...mediaClip,
    speed: newSpeed,
    timelineRange: {
      startUs: mediaClip.timelineRange.startUs,
      durationUs: newTimelineDurationUs,
    },
  } as Clip;

  return {
    ...clips,
    [clipId]: updatedClip,
  };
}

/**
 * Updates volume for an audio or video clip (0.0 to 2.0).
 */
export function changeClipVolume(
  clips: Record<string, Clip>,
  clipId: string,
  newVolume: number
): Record<string, Clip> {
  const clip = clips[clipId];
  if (!clip) throw new Error(`Clip ${clipId} not found`);
  if (clip.type !== 'video' && clip.type !== 'audio') return clips;

  const clampedVolume = Math.max(0, Math.min(2.0, newVolume));
  return {
    ...clips,
    [clipId]: {
      ...clip,
      volume: clampedVolume,
    } as Clip,
  };
}

/**
 * Moves a clip to a new start position on the timeline.
 */
export function moveClip(
  clips: Record<string, Clip>,
  clipId: string,
  newStartUs: number
): Record<string, Clip> {
  const clip = clips[clipId];
  if (!clip) throw new Error(`Clip ${clipId} not found`);

  const clampedStart = Math.max(0, newStartUs);
  return {
    ...clips,
    [clipId]: {
      ...clip,
      timelineRange: {
        ...clip.timelineRange,
        startUs: clampedStart,
      },
    },
  };
}

/**
 * Reorders a clip within a track's clip list and adjusts their timeline positions consecutively.
 */
export function reorderClips(
  track: TimelineTrack,
  clips: Record<string, Clip>,
  clipId: string,
  targetIndex: number
): OperationResult {
  const currentIndex = track.clips.indexOf(clipId);
  if (currentIndex === -1) throw new Error(`Clip ${clipId} not found on track ${track.id}`);

  const clampedTarget = Math.max(0, Math.min(track.clips.length - 1, targetIndex));
  if (currentIndex === clampedTarget) {
    return { updatedClips: clips, updatedTrack: track, affectedClipIds: [] };
  }

  const updatedClipsList = [...track.clips];
  updatedClipsList.splice(currentIndex, 1);
  updatedClipsList.splice(clampedTarget, 0, clipId);

  // Recalculate sequential start positions
  let currentStartUs = 0;
  const updatedClips = { ...clips };
  const affectedClipIds: string[] = [];

  for (const id of updatedClipsList) {
    const c = updatedClips[id];
    if (c) {
      if (c.timelineRange.startUs !== currentStartUs) {
        updatedClips[id] = {
          ...c,
          timelineRange: {
            ...c.timelineRange,
            startUs: currentStartUs,
          },
        };
        affectedClipIds.push(id);
      }
      currentStartUs += c.timelineRange.durationUs;
    }
  }

  return {
    updatedClips,
    updatedTrack: {
      ...track,
      clips: updatedClipsList,
    },
    affectedClipIds,
  };
}

