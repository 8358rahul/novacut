/**
 * NovaCut Video Effects & LUT Engine (CapCut Clean-Room Architecture)
 * Inspired by CapCut's Effect & Filter Architecture (com.ss.android.ugc.effectmanager & com.ss.android.vesdk.filter).
 * Implements real-time shader simulation, 3D LUT matrix approximations, chromatic aberration,
 * and high-impact visual effects with variable intensity.
 */

export type VisualEffectType =
  | 'none'
  | 'glitch'
  | 'film_grain'
  | 'retro_vhs'
  | 'zoom_blur'
  | 'sparkle_glow'
  | 'camera_shake'
  | 'chromatic_flash'
  | 'diamond_zoom'
  | 'halo_blur'
  | 'strobe_flash'
  | 'cyber_scanlines'
  | 'crt_noise'
  | 'film_burn'
  | 'light_leak'
  | 'lens_flare'
  | 'dreamy_aura'
  | 'earthquake'
  | 'vertigo_warp'
  | 'soft_mist'
  | 'cyber_smoke'
  | 'heatwave'
  | 'matrix_rain'
  | 'neon_edge';

export type VisualEffectCategory =
  | 'Trending'
  | 'Glitch'
  | 'Retro'
  | 'Bling'
  | 'Motion'
  | 'Atmosphere';

export interface VisualEffectConfig {
  type: VisualEffectType;
  name: string;
  category: VisualEffectCategory;
  intensity: number; // 0.0 to 1.0
  description: string;
  icon: string;
  badge?: string;
}

export const VISUAL_EFFECTS_CATALOG: VisualEffectConfig[] = [
  // --- 1. TRENDING ---
  {
    type: 'none',
    name: 'Normal',
    category: 'Trending',
    intensity: 0,
    description: 'No visual effect applied',
    icon: '🚫',
  },
  {
    type: 'chromatic_flash',
    name: 'Chromatic Flash',
    category: 'Trending',
    intensity: 0.8,
    description: 'High-speed RGB split transition burst',
    icon: '⚡',
    badge: 'HOT',
  },
  {
    type: 'diamond_zoom',
    name: 'Diamond Zoom',
    category: 'Trending',
    intensity: 0.75,
    description: 'Kaleidoscopic prism refraction with rapid zoom',
    icon: '💎',
    badge: 'VIRAL',
  },
  {
    type: 'halo_blur',
    name: 'Halo Bloom',
    category: 'Trending',
    intensity: 0.65,
    description: 'Silky radial highlight diffusion',
    icon: '✨',
    badge: 'NEW',
  },
  {
    type: 'strobe_flash',
    name: 'White Strobe',
    category: 'Trending',
    intensity: 0.7,
    description: 'Rhythmic white flash frames aligned to beat drops',
    icon: '💡',
    badge: 'BEAT',
  },

  // --- 2. GLITCH & CYBER ---
  {
    type: 'glitch',
    name: 'RGB Glitch Split',
    category: 'Glitch',
    intensity: 0.7,
    description: 'RGB channel displacement & horizontal tear scanlines',
    icon: '👾',
    badge: 'PRO',
  },
  {
    type: 'cyber_scanlines',
    name: 'Cyber Scanlines',
    category: 'Glitch',
    intensity: 0.6,
    description: 'Futuristic HUD raster scanline grid with neon tint',
    icon: '🖥️',
  },
  {
    type: 'crt_noise',
    name: 'CRT Pixel Noise',
    category: 'Glitch',
    intensity: 0.55,
    description: 'Cathode-ray television static and tracking flutter',
    icon: '📺',
  },
  {
    type: 'matrix_rain',
    name: 'Matrix Data Stream',
    category: 'Glitch',
    intensity: 0.65,
    description: 'Emerald green binary glyph overlay',
    icon: '🟢',
  },

  // --- 3. RETRO & FILM ---
  {
    type: 'film_grain',
    name: '35mm Kodak Grain',
    category: 'Retro',
    intensity: 0.5,
    description: 'Authentic analog film emulsion texture & micro-grain',
    icon: '🎞️',
    badge: 'CLASSIC',
  },
  {
    type: 'retro_vhs',
    name: 'Vintage VHS Camcorder',
    category: 'Retro',
    intensity: 0.65,
    description: '1990s home-video tape distortion, tracking & timecode',
    icon: '📼',
    badge: 'RETRO',
  },
  {
    type: 'film_burn',
    name: 'Golden Film Burn',
    category: 'Retro',
    intensity: 0.75,
    description: 'Overexposed amber emulsion flares and edge burn',
    icon: '🔥',
  },
  {
    type: 'light_leak',
    name: 'Prism Light Leak',
    category: 'Retro',
    intensity: 0.6,
    description: 'Vintage camera lens flare bleeding warm magenta & orange',
    icon: '🌅',
  },

  // --- 4. BLING & STARS ---
  {
    type: 'sparkle_glow',
    name: 'Starry Sparkle',
    category: 'Bling',
    intensity: 0.6,
    description: 'Dreamy highlight glitter with 4-point star bursts',
    icon: '🌟',
    badge: 'POPULAR',
  },
  {
    type: 'lens_flare',
    name: 'Anamorphic Lens Flare',
    category: 'Bling',
    intensity: 0.7,
    description: 'Horizontal cinematic streak flare',
    icon: '💫',
  },
  {
    type: 'dreamy_aura',
    name: 'Dreamy Aura',
    category: 'Bling',
    intensity: 0.5,
    description: 'Ethereal pastel glow around subjects and lights',
    icon: '🔮',
  },

  // --- 5. MOTION & SHAKE ---
  {
    type: 'camera_shake',
    name: 'Impact Shake',
    category: 'Motion',
    intensity: 0.75,
    description: 'Bass-driven camera shake simulation on cuts',
    icon: '💥',
    badge: 'IMPACT',
  },
  {
    type: 'zoom_blur',
    name: 'Radial Zoom Blur',
    category: 'Motion',
    intensity: 0.65,
    description: 'Dynamic focal blur pulling viewer into the center',
    icon: '🌀',
  },
  {
    type: 'earthquake',
    name: 'Earthquake Jolt',
    category: 'Motion',
    intensity: 0.85,
    description: 'Violent multi-axis seismic camera vibration',
    icon: '⚡',
  },
  {
    type: 'vertigo_warp',
    name: 'Dolly Zoom Warp',
    category: 'Motion',
    intensity: 0.7,
    description: 'Hitchcock vertigo perspective distortion',
    icon: '👁️',
  },

  // --- 6. ATMOSPHERE & MOOD ---
  {
    type: 'soft_mist',
    name: 'Cinematic Mist',
    category: 'Atmosphere',
    intensity: 0.45,
    description: 'Soft atmospheric fog reducing harsh digital contrast',
    icon: '🌫️',
  },
  {
    type: 'cyber_smoke',
    name: 'Neon Cyber Smoke',
    category: 'Atmosphere',
    intensity: 0.55,
    description: 'Fluorescent vapor wisps drift across foreground',
    icon: '💨',
  },
  {
    type: 'heatwave',
    name: 'Heatwave Shimmer',
    category: 'Atmosphere',
    intensity: 0.5,
    description: 'Desert mirage optical refraction waves',
    icon: '☀️',
  },
  {
    type: 'neon_edge',
    name: 'Neon Edge Glow',
    category: 'Atmosphere',
    intensity: 0.7,
    description: 'Cyberpunk edge detection outlining contours in hot cyan',
    icon: '🌈',
  },
];

export type LutFilterCategory =
  | 'Cinematic'
  | 'TikTok'
  | 'Retro'
  | 'Travel'
  | 'Monochrome';

export interface LutFilterConfig {
  id: string;
  name: string;
  category: LutFilterCategory;
  intensity: number; // 0.0 to 1.0
  tintRgba: string;
  contrastMod: number;
  saturationMod: number;
  brightnessMod: number;
  temperatureMod: number;
  badge?: string;
}

export const LUT_FILTERS_CATALOG: LutFilterConfig[] = [
  // --- CINEMATIC ---
  {
    id: 'lut_normal',
    name: 'Original',
    category: 'Cinematic',
    intensity: 1.0,
    tintRgba: 'transparent',
    contrastMod: 1.0,
    saturationMod: 1.0,
    brightnessMod: 0,
    temperatureMod: 0,
  },
  {
    id: 'lut_teal_orange',
    name: 'Teal & Orange',
    category: 'Cinematic',
    intensity: 0.85,
    tintRgba: 'rgba(0, 180, 216, 0.18)',
    contrastMod: 1.25,
    saturationMod: 1.2,
    brightnessMod: 0,
    temperatureMod: 0.2,
    badge: 'TOP',
  },
  {
    id: 'lut_moody_dark',
    name: 'Moody Noir',
    category: 'Cinematic',
    intensity: 0.8,
    tintRgba: 'rgba(15, 23, 42, 0.25)',
    contrastMod: 1.35,
    saturationMod: 0.75,
    brightnessMod: -0.12,
    temperatureMod: -0.1,
  },
  {
    id: 'lut_hollywood_gold',
    name: 'Hollywood Gold',
    category: 'Cinematic',
    intensity: 0.85,
    tintRgba: 'rgba(217, 119, 6, 0.2)',
    contrastMod: 1.2,
    saturationMod: 1.15,
    brightnessMod: 0.03,
    temperatureMod: 0.35,
    badge: 'PRO',
  },
  {
    id: 'lut_blockbuster',
    name: 'Blockbuster Blue',
    category: 'Cinematic',
    intensity: 0.8,
    tintRgba: 'rgba(30, 58, 138, 0.22)',
    contrastMod: 1.3,
    saturationMod: 0.9,
    brightnessMod: -0.05,
    temperatureMod: -0.3,
  },

  // --- TIKTOK & VIRAL ---
  {
    id: 'lut_cyberpunk',
    name: 'Cyberpunk Neon',
    category: 'TikTok',
    intensity: 0.9,
    tintRgba: 'rgba(247, 37, 133, 0.22)',
    contrastMod: 1.4,
    saturationMod: 1.35,
    brightnessMod: 0.05,
    temperatureMod: 0,
    badge: 'HOT',
  },
  {
    id: 'lut_vivid_warm',
    name: 'Golden Hour Glow',
    category: 'TikTok',
    intensity: 0.85,
    tintRgba: 'rgba(255, 183, 3, 0.18)',
    contrastMod: 1.15,
    saturationMod: 1.3,
    brightnessMod: 0.04,
    temperatureMod: 0.35,
    badge: 'VIRAL',
  },
  {
    id: 'lut_fresh_pastel',
    name: 'Fresh Pastel',
    category: 'TikTok',
    intensity: 0.75,
    tintRgba: 'rgba(162, 210, 255, 0.16)',
    contrastMod: 0.95,
    saturationMod: 1.15,
    brightnessMod: 0.08,
    temperatureMod: -0.15,
  },
  {
    id: 'lut_sunset_pop',
    name: 'Sunset Euphoria',
    category: 'TikTok',
    intensity: 0.85,
    tintRgba: 'rgba(244, 63, 94, 0.2)',
    contrastMod: 1.25,
    saturationMod: 1.4,
    brightnessMod: 0.02,
    temperatureMod: 0.25,
  },

  // --- RETRO & FILM ---
  {
    id: 'lut_vintage_70s',
    name: 'Vintage 70s',
    category: 'Retro',
    intensity: 0.8,
    tintRgba: 'rgba(238, 155, 0, 0.22)',
    contrastMod: 0.9,
    saturationMod: 0.85,
    brightnessMod: 0.05,
    temperatureMod: 0.4,
  },
  {
    id: 'lut_polaroid_warm',
    name: 'Polaroid Fade',
    category: 'Retro',
    intensity: 0.8,
    tintRgba: 'rgba(254, 215, 170, 0.25)',
    contrastMod: 0.88,
    saturationMod: 0.8,
    brightnessMod: 0.08,
    temperatureMod: 0.3,
  },
  {
    id: 'lut_kodachrome',
    name: 'Kodachrome 64',
    category: 'Retro',
    intensity: 0.85,
    tintRgba: 'rgba(185, 28, 28, 0.16)',
    contrastMod: 1.35,
    saturationMod: 1.25,
    brightnessMod: -0.02,
    temperatureMod: 0.15,
  },
  {
    id: 'lut_bleach_bypass',
    name: 'Bleach Bypass',
    category: 'Retro',
    intensity: 0.8,
    tintRgba: 'rgba(100, 116, 139, 0.2)',
    contrastMod: 1.5,
    saturationMod: 0.4,
    brightnessMod: -0.05,
    temperatureMod: -0.1,
  },

  // --- TRAVEL & SCENIC ---
  {
    id: 'lut_forest_green',
    name: 'Emerald Forest',
    category: 'Travel',
    intensity: 0.8,
    tintRgba: 'rgba(16, 185, 129, 0.18)',
    contrastMod: 1.2,
    saturationMod: 1.25,
    brightnessMod: 0.01,
    temperatureMod: -0.15,
  },
  {
    id: 'lut_deep_ocean',
    name: 'Deep Blue Ocean',
    category: 'Travel',
    intensity: 0.85,
    tintRgba: 'rgba(6, 182, 212, 0.2)',
    contrastMod: 1.25,
    saturationMod: 1.3,
    brightnessMod: -0.04,
    temperatureMod: -0.25,
  },
  {
    id: 'lut_desert_dune',
    name: 'Sahara Dune',
    category: 'Travel',
    intensity: 0.8,
    tintRgba: 'rgba(245, 158, 11, 0.22)',
    contrastMod: 1.15,
    saturationMod: 1.1,
    brightnessMod: 0.06,
    temperatureMod: 0.45,
  },

  // --- MONOCHROME ---
  {
    id: 'lut_monochrome',
    name: 'Film Noir B&W',
    category: 'Monochrome',
    intensity: 1.0,
    tintRgba: 'rgba(0, 0, 0, 0.1)',
    contrastMod: 1.4,
    saturationMod: 0.0,
    brightnessMod: 0,
    temperatureMod: 0,
    badge: 'B&W',
  },
  {
    id: 'lut_high_contrast_bw',
    name: 'Silver Gelatin B&W',
    category: 'Monochrome',
    intensity: 1.0,
    tintRgba: 'rgba(255, 255, 255, 0.05)',
    contrastMod: 1.6,
    saturationMod: 0.0,
    brightnessMod: 0.04,
    temperatureMod: 0,
  },
];

/**
 * Computes effective color adjustment values blending base adjustments with active LUT.
 */
export function computeEffectiveColorAdjustments(
  base: { brightness: number; contrast: number; saturation: number; temperature: number },
  lutId?: string,
  lutIntensity = 1.0
) {
  const lut = LUT_FILTERS_CATALOG.find((l) => l.id === lutId) || LUT_FILTERS_CATALOG[0];
  const weight = Math.max(0, Math.min(1.0, lutIntensity));

  return {
    brightness: base.brightness + (lut.brightnessMod * weight),
    contrast: base.contrast * (1 + (lut.contrastMod - 1) * weight),
    saturation: base.saturation * (1 + (lut.saturationMod - 1) * weight),
    temperature: base.temperature + (lut.temperatureMod * weight),
    tintRgba: lut.tintRgba,
  };
}
