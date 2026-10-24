import { SpeedCurve, SpeedCurvePreset, SpeedCurvePoint } from '../models/clip';

/**
 * Standard CapCut-inspired Speed Curve presets.
 */
export const SPEED_CURVE_PRESETS: Record<SpeedCurvePreset, SpeedCurvePoint[]> = {
  standard: [
    { x: 0.0, y: 1.0 },
    { x: 1.0, y: 1.0 },
  ],
  montage: [
    { x: 0.0, y: 2.5 },
    { x: 0.25, y: 1.0 },
    { x: 0.5, y: 0.3 },
    { x: 0.75, y: 1.0 },
    { x: 1.0, y: 2.0 },
  ],
  hero: [
    { x: 0.0, y: 1.2 },
    { x: 0.3, y: 0.8 },
    { x: 0.5, y: 0.2 },
    { x: 0.7, y: 0.8 },
    { x: 1.0, y: 1.2 },
  ],
  bullet: [
    { x: 0.0, y: 5.0 },
    { x: 0.2, y: 3.0 },
    { x: 0.4, y: 0.2 },
    { x: 0.8, y: 0.2 },
    { x: 1.0, y: 4.0 },
  ],
  jumpCut: [
    { x: 0.0, y: 3.0 },
    { x: 0.3, y: 3.0 },
    { x: 0.31, y: 0.5 },
    { x: 0.7, y: 0.5 },
    { x: 0.71, y: 3.0 },
    { x: 1.0, y: 3.0 },
  ],
  flashIn: [
    { x: 0.0, y: 5.0 },
    { x: 0.3, y: 2.0 },
    { x: 0.6, y: 1.0 },
    { x: 1.0, y: 1.0 },
  ],
  flashOut: [
    { x: 0.0, y: 1.0 },
    { x: 0.4, y: 1.0 },
    { x: 0.7, y: 2.5 },
    { x: 1.0, y: 5.0 },
  ],
};

/**
 * Creates a SpeedCurve from a preset name.
 */
export function createSpeedCurveFromPreset(preset: SpeedCurvePreset): SpeedCurve {
  return {
    preset,
    points: [...SPEED_CURVE_PRESETS[preset]],
  };
}

/**
 * Evaluates the instantaneous speed multiplier (0.1x to 10.0x) along a SpeedCurve
 * for a normalized time between 0.0 (start) and 1.0 (end).
 */
export function evaluateSpeedCurve(curve: SpeedCurve | undefined, normalizedTime: number): number {
  if (!curve || !curve.points || curve.points.length === 0) {
    return 1.0;
  }

  const t = Math.max(0, Math.min(1.0, normalizedTime));
  const points = curve.points;

  if (t <= points[0].x) return points[0].y;
  if (t >= points[points.length - 1].x) return points[points.length - 1].y;

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];

    if (t >= p1.x && t <= p2.x) {
      const span = p2.x - p1.x;
      if (span === 0) return p1.y;
      const progress = (t - p1.x) / span;
      // Linear interpolation between curve control points
      const val = p1.y + (p2.y - p1.y) * progress;
      return Math.round(val * 10000) / 10000;
    }
  }

  return 1.0;
}
