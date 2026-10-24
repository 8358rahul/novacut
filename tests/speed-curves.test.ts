import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  evaluateSpeedCurve,
  createSpeedCurveFromPreset,
  SPEED_CURVE_PRESETS,
} from '../src/core/timeline/speedCurves';

describe('CapCut-Grade Feature: Speed Curves & Dynamic Speed Ramping', () => {
  it('evaluates constant speed for standard curve', () => {
    const curve = createSpeedCurveFromPreset('standard');
    assert.strictEqual(evaluateSpeedCurve(curve, 0.0), 1.0);
    assert.strictEqual(evaluateSpeedCurve(curve, 0.5), 1.0);
    assert.strictEqual(evaluateSpeedCurve(curve, 1.0), 1.0);
  });

  it('evaluates Montage preset speed curve dynamically', () => {
    // Montage preset: starts fast (2.5x), dips to (0.3x) in middle, exits at (2.0x)
    const curve = createSpeedCurveFromPreset('montage');

    // At normalized start 0.0 -> 2.5x
    assert.strictEqual(evaluateSpeedCurve(curve, 0.0), 2.5);

    // At middle 0.5 -> 0.3x (dramatic slow motion impact)
    assert.strictEqual(evaluateSpeedCurve(curve, 0.5), 0.3);

    // At end 1.0 -> 2.0x
    assert.strictEqual(evaluateSpeedCurve(curve, 1.0), 2.0);

    // Between 0.0 (2.5x) and 0.25 (1.0x): at 0.125 -> exactly 1.75x
    const midSpeed = evaluateSpeedCurve(curve, 0.125);
    assert.strictEqual(midSpeed, 1.75);
  });

  it('evaluates Bullet Time and Hero presets properly', () => {
    const bullet = createSpeedCurveFromPreset('bullet');
    assert.strictEqual(evaluateSpeedCurve(bullet, 0.0), 5.0);
    assert.strictEqual(evaluateSpeedCurve(bullet, 0.6), 0.2); // deep in slow-mo pocket

    const hero = createSpeedCurveFromPreset('hero');
    assert.strictEqual(evaluateSpeedCurve(hero, 0.5), 0.2);
  });
});
