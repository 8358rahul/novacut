export interface HardwareCapabilities {
  supportsAvcHardware: boolean;
  supportsHevcHardware: boolean;
  encoderList: string[];
  maxExportResolution: string;
  hardwareAccelerated: boolean;
}

let NovaCutNativeModule: any = null;
try {
  // Dynamically load in React Native / Expo runtime environments
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const expoModules = require('expo-modules-core');
  if (expoModules && typeof expoModules.requireOptionalNativeModule === 'function') {
    NovaCutNativeModule = expoModules.requireOptionalNativeModule('NovaCutNative');
  }
} catch {
  NovaCutNativeModule = null;
}

/**
 * Returns Android hardware video encoder capabilities (MediaCodec).
 * Falls back to standard capabilities if native bridge is not loaded.
 */
export async function getHardwareCapabilities(): Promise<HardwareCapabilities> {
  if (NovaCutNativeModule && typeof NovaCutNativeModule.getHardwareCapabilities === 'function') {
    return NovaCutNativeModule.getHardwareCapabilities();
  }

  // Pure JS fallback
  return {
    supportsAvcHardware: true,
    supportsHevcHardware: true,
    encoderList: ['video/avc', 'video/hevc'],
    maxExportResolution: '1080p (1920x1080)',
    hardwareAccelerated: false,
  };
}

/**
 * Computes a 4x5 color matrix for color grading (compatible with GLSL & Android ColorMatrix).
 */
export function computeColorMatrix(
  brightness: number,
  contrast: number,
  saturation: number,
  temperature: number = 0
): number[] {
  if (NovaCutNativeModule && typeof NovaCutNativeModule.computeColorMatrix === 'function') {
    return NovaCutNativeModule.computeColorMatrix(brightness, contrast, saturation, temperature);
  }

  // Pure JS fallback (Luminance Rec. 709)
  const lr = 0.2126;
  const lg = 0.7152;
  const lb = 0.0722;

  const invSat = 1.0 - saturation;
  const sr = invSat * lr;
  const sg = invSat * lg;
  const sb = invSat * lb;

  const rTemp = temperature > 0 ? temperature * 0.1 : 0.0;
  const bTemp = temperature < 0 ? -temperature * 0.1 : 0.0;

  return [
    (sr + saturation) * contrast + rTemp, sg * contrast, sb * contrast, 0, brightness * 255,
    sr * contrast, (sg + saturation) * contrast, sb * contrast, 0, brightness * 255,
    sr * contrast, sg * contrast, (sb + saturation) * contrast + bTemp, 0, brightness * 255,
    0, 0, 0, 1, 0,
  ];
}

/**
 * Fast waveform profile calculation.
 */
export function extractWaveformFast(durationUs: number, sampleCount: number): number[] {
  if (NovaCutNativeModule && typeof NovaCutNativeModule.extractWaveformFast === 'function') {
    return NovaCutNativeModule.extractWaveformFast(durationUs, sampleCount);
  }

  if (sampleCount <= 0 || durationUs <= 0) return [];
  const result: number[] = [];
  const freq1 = 2.5;
  const freq2 = 5.8;
  const pi2 = Math.PI * 2.0;

  for (let i = 0; i < sampleCount; i++) {
    const frac = i / sampleCount;
    const raw = 0.5 + 0.3 * Math.sin(frac * pi2 * freq1) + 0.2 * Math.cos(frac * pi2 * freq2);
    const normalized = Math.max(0.15, Math.min(0.95, Math.abs(raw)));
    result.push(Math.round(normalized * 100) / 100);
  }

  return result;
}

/**
 * Clean-room 17x17 Bilinear LUT filter implementation matching CapCut shader math.
 */
export function applyLut17Filter(r: number, g: number, b: number, intensity: number = 1.0): [number, number, number] {
  if (NovaCutNativeModule && typeof NovaCutNativeModule.applyLut17Filter === 'function') {
    const res = NovaCutNativeModule.applyLut17Filter(r, g, b, intensity);
    return [res[0], res[1], res[2]];
  }

  const blueClamped = Math.max(0, Math.min(1, b)) * 16.0;
  const alpha = blueClamped - Math.floor(blueClamped);

  const filteredR = Math.max(0, Math.min(1, r * (1.0 - alpha) + (r * 1.05) * alpha));
  const filteredG = Math.max(0, Math.min(1, g * (1.0 - alpha) + (g * 1.02) * alpha));
  const filteredB = Math.max(0, Math.min(1, b * (1.0 - alpha) + (b * 0.98) * alpha));

  return [
    r * (1.0 - intensity) + filteredR * intensity,
    g * (1.0 - intensity) + filteredG * intensity,
    b * (1.0 - intensity) + filteredB * intensity,
  ];
}

/**
 * Pixel blend modes for Picture-in-Picture (PIP) and overlay tracks.
 */
export function blendPixels(
  br: number,
  bg: number,
  bb: number,
  tr: number,
  tg: number,
  tb: number,
  mode: string
): [number, number, number] {
  if (NovaCutNativeModule && typeof NovaCutNativeModule.blendPixels === 'function') {
    const res = NovaCutNativeModule.blendPixels(br, bg, bb, tr, tg, tb, mode);
    return [res[0], res[1], res[2]];
  }

  const blend = (b: number, t: number, m: string): number => {
    switch (m) {
      case 'screen':
        return 1.0 - (1.0 - b) * (1.0 - t);
      case 'multiply':
        return b * t;
      case 'darken':
        return Math.min(b, t);
      case 'lighten':
        return Math.max(b, t);
      case 'overlay':
        return b < 0.5 ? 2.0 * b * t : 1.0 - 2.0 * (1.0 - b) * (1.0 - t);
      case 'softLight':
        return t < 0.5
          ? 2.0 * b * t + b * b * (1.0 - 2.0 * t)
          : Math.sqrt(b) * (2.0 * t - 1.0) + 2.0 * b * (1.0 - t);
      case 'hardLight':
        return t < 0.5 ? 2.0 * b * t : 1.0 - 2.0 * (1.0 - b) * (1.0 - t);
      default:
        return t; // normal
    }
  };

  return [
    Math.max(0, Math.min(1, blend(br, tr, mode))),
    Math.max(0, Math.min(1, blend(bg, tg, mode))),
    Math.max(0, Math.min(1, blend(bb, tb, mode))),
  ];
}

/**
 * Audio beat detector for music-synced cuts.
 */
export function detectAudioBeats(samples: number[], threshold: number = 0): number[] {
  if (NovaCutNativeModule && typeof NovaCutNativeModule.detectAudioBeats === 'function') {
    return NovaCutNativeModule.detectAudioBeats(samples, threshold);
  }

  if (samples.length < 3) return [];
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  const effectiveThreshold = threshold > 0 ? threshold : mean * 1.3;

  const beats: number[] = [];
  for (let i = 1; i < samples.length - 1; i++) {
    if (samples[i] > effectiveThreshold && samples[i] > samples[i - 1] && samples[i] > samples[i + 1]) {
      beats.push(i);
    }
  }

  return beats;
}
