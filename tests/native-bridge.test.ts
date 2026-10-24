import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  getHardwareCapabilities,
  computeColorMatrix,
  extractWaveformFast,
  applyLut17Filter,
  blendPixels,
  detectAudioBeats,
} from '../modules/novacut-native';

describe('iOS & Android Native Bridge: High-Performance Video Editor Architecture', () => {
  it('queries hardware capabilities safely with fallback', async () => {
    const caps = await getHardwareCapabilities();
    assert.strictEqual(typeof caps.supportsAvcHardware, 'boolean');
    assert.strictEqual(typeof caps.supportsHevcHardware, 'boolean');
    assert.ok(Array.isArray(caps.encoderList));
    assert.ok(caps.encoderList.includes('video/avc'));
  });

  it('computes 4x5 color matrix for color grading filters', () => {
    // Normal neutral matrix (brightness 0, contrast 1, saturation 1, temp 0)
    const matrix = computeColorMatrix(0, 1, 1, 0);
    assert.strictEqual(matrix.length, 20);

    // Alpha row must be [0, 0, 0, 1, 0]
    assert.strictEqual(matrix[15], 0);
    assert.strictEqual(matrix[16], 0);
    assert.strictEqual(matrix[17], 0);
    assert.strictEqual(matrix[18], 1);
    assert.strictEqual(matrix[19], 0);

    // With brightness +0.2 -> offset elements (index 4, 9, 14) are 0.2 * 255 = 51
    const brightMatrix = computeColorMatrix(0.2, 1, 1, 0);
    assert.strictEqual(brightMatrix[4], 51);
    assert.strictEqual(brightMatrix[9], 51);
    assert.strictEqual(brightMatrix[14], 51);
  });

  it('computes fast native waveform samples', () => {
    const samples = extractWaveformFast(5_000_000, 20);
    assert.strictEqual(samples.length, 20);
    for (const s of samples) {
      assert.ok(s >= 0.15 && s <= 1.0);
    }
  });

  it('evaluates CapCut-grade 17x17 LUT color grading shader math', () => {
    // Given an input RGB (0.5, 0.5, 0.5) with intensity 1.0
    const [r, g, b] = applyLut17Filter(0.5, 0.5, 0.5, 1.0);
    assert.ok(r >= 0.0 && r <= 1.0);
    assert.ok(g >= 0.0 && g <= 1.0);
    assert.ok(b >= 0.0 && b <= 1.0);

    // With intensity 0.0, output equals original color exactly
    const [origR, origG, origB] = applyLut17Filter(0.4, 0.6, 0.8, 0.0);
    assert.strictEqual(Math.round(origR * 100) / 100, 0.4);
    assert.strictEqual(Math.round(origG * 100) / 100, 0.6);
    assert.strictEqual(Math.round(origB * 100) / 100, 0.8);
  });

  it('evaluates Picture-in-Picture (PIP) blend modes accurately', () => {
    // Screen: 1 - (1 - 0.5)*(1 - 0.5) = 1 - 0.25 = 0.75
    const [screenR] = blendPixels(0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 'screen');
    assert.strictEqual(screenR, 0.75);

    // Multiply: 0.5 * 0.5 = 0.25
    const [multR] = blendPixels(0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 'multiply');
    assert.strictEqual(multR, 0.25);

    // Darken: min(0.3, 0.7) = 0.3
    const [darkenR] = blendPixels(0.3, 0.3, 0.3, 0.7, 0.7, 0.7, 'darken');
    assert.strictEqual(darkenR, 0.3);

    // Lighten: max(0.3, 0.7) = 0.7
    const [lightenR] = blendPixels(0.3, 0.3, 0.3, 0.7, 0.7, 0.7, 'lighten');
    assert.strictEqual(lightenR, 0.7);
  });

  it('detects audio beat drops for automatic cut synchronization', () => {
    // Sample track with two clear peaks at indices 3 and 7
    const audioEnergy = [0.2, 0.25, 0.3, 0.95, 0.35, 0.2, 0.25, 0.98, 0.3, 0.2];
    const beats = detectAudioBeats(audioEnergy);
    assert.ok(beats.includes(3), 'Should detect first beat peak at index 3');
    assert.ok(beats.includes(7), 'Should detect second beat peak at index 7');
  });
});
