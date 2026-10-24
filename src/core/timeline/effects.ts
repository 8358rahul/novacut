import {
  Clip,
  VideoClip,
  ImageClip,
  ColorAdjustments,
  Transform,
  Transition,
  TransitionType,
} from '../models/clip';

/**
 * Updates color grading parameters (brightness, contrast, saturation, temperature) for video/image clips.
 */
export function updateClipColorAdjustments(
  clips: Record<string, Clip>,
  clipId: string,
  adjustments: Partial<ColorAdjustments>
): Record<string, Clip> {
  const clip = clips[clipId];
  if (!clip || (clip.type !== 'video' && clip.type !== 'image')) {
    return clips;
  }

  const mediaClip = clip as VideoClip | ImageClip;
  const current = mediaClip.colorAdjustments || {
    brightness: 0,
    contrast: 1,
    saturation: 1,
    temperature: 0,
  };

  const updated: ColorAdjustments = {
    brightness: adjustments.brightness !== undefined ? adjustments.brightness : current.brightness,
    contrast: adjustments.contrast !== undefined ? adjustments.contrast : current.contrast,
    saturation: adjustments.saturation !== undefined ? adjustments.saturation : current.saturation,
    temperature: adjustments.temperature !== undefined ? adjustments.temperature : current.temperature,
  };

  return {
    ...clips,
    [clipId]: {
      ...mediaClip,
      colorAdjustments: updated,
    } as Clip,
  };
}

/**
 * Updates transform properties (scale, rotationDeg, opacity, translateX, translateY) for any clip.
 */
export function updateClipTransform(
  clips: Record<string, Clip>,
  clipId: string,
  transform: Partial<Transform>
): Record<string, Clip> {
  const clip = clips[clipId];
  if (!clip || !('transform' in clip)) {
    return clips;
  }

  const currentTransform = (clip as VideoClip | ImageClip).transform || {
    scale: 1,
    rotationDeg: 0,
    translateX: 0,
    translateY: 0,
    opacity: 1,
  };

  return {
    ...clips,
    [clipId]: {
      ...clip,
      transform: {
        ...currentTransform,
        ...transform,
      },
    } as Clip,
  };
}

/**
 * Sets a transition on the start or end of a clip.
 */
export function setClipTransition(
  clips: Record<string, Clip>,
  clipId: string,
  position: 'in' | 'out',
  transition: Transition | undefined
): Record<string, Clip> {
  const clip = clips[clipId];
  if (!clip || (clip.type !== 'video' && clip.type !== 'image')) {
    return clips;
  }

  return {
    ...clips,
    [clipId]: {
      ...clip,
      ...(position === 'in' ? { transitionIn: transition } : { transitionOut: transition }),
    } as Clip,
  };
}

/**
 * Calculates transition progress (0.0 to 1.0) during playback.
 */
export function getTransitionProgress(
  clip: VideoClip | ImageClip,
  timelineTimeUs: number
): { type: TransitionType; progress: number } | null {
  const startUs = clip.timelineRange.startUs;
  const durationUs = clip.timelineRange.durationUs;
  const endUs = startUs + durationUs;

  // Transition In
  if (clip.transitionIn && clip.transitionIn.type !== 'none' && clip.transitionIn.durationUs > 0) {
    const elapsed = timelineTimeUs - startUs;
    if (elapsed >= 0 && elapsed <= clip.transitionIn.durationUs) {
      return {
        type: clip.transitionIn.type,
        progress: elapsed / clip.transitionIn.durationUs,
      };
    }
  }

  // Transition Out
  if (clip.transitionOut && clip.transitionOut.type !== 'none' && clip.transitionOut.durationUs > 0) {
    const remaining = endUs - timelineTimeUs;
    if (remaining >= 0 && remaining <= clip.transitionOut.durationUs) {
      return {
        type: clip.transitionOut.type,
        progress: 1.0 - remaining / clip.transitionOut.durationUs,
      };
    }
  }

  return null;
}
