import {
  Keyframe,
  KeyframeTrack,
  Transform,
  VideoClip,
  ImageClip,
  DEFAULT_TRANSFORM,
} from '../models/clip';

/**
 * Evaluates easing curves between 0.0 and 1.0 progress.
 */
function applyEasing(progress: number, easing: Keyframe['easing']): number {
  const p = Math.max(0, Math.min(1, progress));
  switch (easing) {
    case 'easeIn':
      return p * p;
    case 'easeOut':
      return p * (2 - p);
    case 'easeInOut':
      return p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
    case 'linear':
    default:
      return p;
  }
}

/**
 * Interpolates a scalar value from a sorted list of keyframes at targetTimeUs.
 */
export function interpolateKeyframe(
  keyframes: Keyframe<number>[] | undefined,
  targetTimeUs: number,
  defaultValue: number
): number {
  if (!keyframes || keyframes.length === 0) {
    return defaultValue;
  }

  // Before or at first keyframe
  if (targetTimeUs <= keyframes[0].timeUs) {
    return keyframes[0].value;
  }

  // After or at last keyframe
  const last = keyframes[keyframes.length - 1];
  if (targetTimeUs >= last.timeUs) {
    return last.value;
  }

  // Binary search for the bounding interval [low, low + 1] (O(log N) for complex animations)
  let low = 0;
  let high = keyframes.length - 1;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (keyframes[mid].timeUs <= targetTimeUs) {
      if (mid < keyframes.length - 1 && targetTimeUs <= keyframes[mid + 1].timeUs) {
        low = mid;
        break;
      }
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  const k1 = keyframes[low];
  const k2 = keyframes[low + 1] ?? k1;
  const spanUs = k2.timeUs - k1.timeUs;
  if (spanUs === 0) return k1.value;

  const rawProgress = (targetTimeUs - k1.timeUs) / spanUs;
  const easedProgress = applyEasing(rawProgress, k2.easing);
  return k1.value + (k2.value - k1.value) * easedProgress;
}

/**
 * Computes instantaneous transform for a clip at targetTimeUs,
 * resolving keyframe tracks over base transform defaults.
 */
export function getInterpolatedTransform(
  clip: VideoClip | ImageClip,
  targetTimeUs: number
): Transform {
  const base = clip.transform || DEFAULT_TRANSFORM;
  const kf = clip.keyframes;

  if (!kf) {
    return base;
  }

  return {
    scale: interpolateKeyframe(kf.scale, targetTimeUs, base.scale),
    rotationDeg: interpolateKeyframe(kf.rotationDeg, targetTimeUs, base.rotationDeg),
    translateX: interpolateKeyframe(kf.translateX, targetTimeUs, base.translateX),
    translateY: interpolateKeyframe(kf.translateY, targetTimeUs, base.translateY),
    opacity: interpolateKeyframe(kf.opacity, targetTimeUs, base.opacity),
  };
}

/**
 * Adds or updates a keyframe at targetTimeUs on a specific property track.
 */
export function addOrUpdateKeyframe(
  track: KeyframeTrack | undefined,
  property: keyof KeyframeTrack,
  timeUs: number,
  value: number,
  easing: Keyframe['easing'] = 'easeInOut'
): KeyframeTrack {
  const currentTrack = track || {};
  const currentList = currentTrack[property] ? [...currentTrack[property]!] : [];

  const existingIdx = currentList.findIndex((k) => Math.abs(k.timeUs - timeUs) < 10_000); // 10ms snap
  if (existingIdx >= 0) {
    currentList[existingIdx] = { timeUs, value, easing };
  } else {
    currentList.push({ timeUs, value, easing });
    currentList.sort((a, b) => a.timeUs - b.timeUs);
  }

  return {
    ...currentTrack,
    [property]: currentList,
  };
}

/**
 * Removes a keyframe near targetTimeUs.
 */
export function removeKeyframe(
  track: KeyframeTrack | undefined,
  property: keyof KeyframeTrack,
  timeUs: number
): KeyframeTrack {
  if (!track || !track[property]) return track || {};

  const filtered = track[property]!.filter(
    (k) => Math.abs(k.timeUs - timeUs) >= 10_000
  );

  return {
    ...track,
    [property]: filtered,
  };
}
