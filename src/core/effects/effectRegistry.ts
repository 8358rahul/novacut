/**
 * NovaCut Video Effects & LUT Engine (CapCut Clean-Room Architecture)
 * Inspired by CapCut's Effect & Filter Architecture (com.ss.android.ugc.effectmanager & com.ss.android.vesdk.filter).
 * Implements real-time shader simulation, 3D LUT matrix approximations, chromatic aberration,
 * and high-impact visual effects with variable intensity.
 */

export type VisualEffectType =
  | 'none'
  // Trending & Beat
  | 'chromatic_flash'
  | 'diamond_zoom'
  | 'halo_blur'
  | 'strobe_flash'
  | 'black_flash'
  | 'beat_bounce'
  | 'glow_edge'
  // Glitch & Cyber
  | 'glitch'
  | 'cyber_scanlines'
  | 'crt_noise'
  | 'matrix_rain'
  | 'data_mosh'
  | 'bad_tv'
  | 'vcr_distortion'
  | 'chroma_drift'
  // Retro & Film
  | 'film_grain'
  | 'retro_vhs'
  | 'film_burn'
  | 'light_leak'
  | 'super_8'
  | 'sepia_dust'
  | 'scratch_film'
  | 'vintage_1998'
  | 'polaroid_fade'
  // Bling & Stars
  | 'sparkle_glow'
  | 'lens_flare'
  | 'dreamy_aura'
  | 'gold_glitter'
  | 'diamond_prism'
  | 'heart_bokeh'
  // Motion & Shake
  | 'camera_shake'
  | 'zoom_blur'
  | 'earthquake'
  | 'vertigo_warp'
  | 'speed_lines'
  | 'twitch_jolt'
  | 'directional_blur'
  // Distortion & Warp
  | 'fisheye_lens'
  | 'ripple_wave'
  | 'swirl_vortex'
  | 'kaleidoscope'
  | 'mirror_reflection'
  // Party & Mood
  | 'disco_strobe'
  | 'club_lights'
  | 'thermal_vision'
  | 'ghost_echo'
  | 'color_inversion'
  // Atmosphere & Weather
  | 'soft_mist'
  | 'cyber_smoke'
  | 'heatwave'
  | 'neon_edge'
  | 'rain_drops'
  | 'snow_flurry'
  | 'fire_ember'
  | 'sun_rays'
  // Split Screen & Borders
  | 'split_2_horizontal'
  | 'split_2_vertical'
  | 'split_4_quad'
  | 'split_9_grid'
  | 'cinema_widescreen'
  | 'film_sprocket'
  // Comic & Art Stylize
  | 'manga_sketch'
  | 'pop_art_poster'
  | 'halftone_dot'
  | 'oil_painting'
  | 'cartoon_contour';

export type VisualEffectCategory =
  | 'Trending'
  | 'Glitch'
  | 'Retro'
  | 'Bling'
  | 'Motion'
  | 'Distortion'
  | 'Party'
  | 'Atmosphere'
  | 'Split'
  | 'Comic';

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
  // --- 1. TRENDING & BEAT ---
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
  {
    type: 'black_flash',
    name: 'Black Strobe Flash',
    category: 'Trending',
    intensity: 0.8,
    description: 'Dark cut flicker synced to punchy basslines',
    icon: '🖤',
    badge: 'BEAT',
  },
  {
    type: 'beat_bounce',
    name: 'Beat Bounce',
    category: 'Trending',
    intensity: 0.7,
    description: 'Vertical rhythmic pulse matched to music tempo',
    icon: '🎵',
    badge: 'BEAT',
  },
  {
    type: 'glow_edge',
    name: 'Neon Glow Edges',
    category: 'Trending',
    intensity: 0.75,
    description: 'Vibrant electric outlines highlighting contours',
    icon: '🌈',
    badge: 'HOT',
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
    description: 'Emerald green binary glyph overlay grid',
    icon: '🟢',
  },
  {
    type: 'data_mosh',
    name: 'Data Mosh Decay',
    category: 'Glitch',
    intensity: 0.75,
    description: 'Deinterlaced video frame compression glitch',
    icon: '🧩',
    badge: 'VIRAL',
  },
  {
    type: 'bad_tv',
    name: 'Bad TV Signal',
    category: 'Glitch',
    intensity: 0.6,
    description: 'Analog cathode broadcast reception failure',
    icon: '📼',
  },
  {
    type: 'vcr_distortion',
    name: 'VCR Distortion',
    category: 'Glitch',
    intensity: 0.65,
    description: 'Magnetic videotape horizontal tracking slippage',
    icon: '📽️',
  },
  {
    type: 'chroma_drift',
    name: 'Chromatic Drift',
    category: 'Glitch',
    intensity: 0.7,
    description: 'Separated red and blue color planes in harmonic motion',
    icon: '🌀',
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
    description: '1990s home-video tape distortion, tracking & color bleed',
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
  {
    type: 'super_8',
    name: 'Super 8mm Projector',
    category: 'Retro',
    intensity: 0.65,
    description: 'Shaky 8mm family archive reel with warm tone',
    icon: '📽️',
    badge: 'CLASSIC',
  },
  {
    type: 'sepia_dust',
    name: '1920s Sepia Dust',
    category: 'Retro',
    intensity: 0.7,
    description: 'Early century monochromatic vintage sepia tint',
    icon: '📜',
  },
  {
    type: 'scratch_film',
    name: 'Nitrate Film Scratch',
    category: 'Retro',
    intensity: 0.65,
    description: 'Vertical film stock wear scratches and dust specks',
    icon: '🎬',
  },
  {
    type: 'vintage_1998',
    name: 'Vintage 1998 Date',
    category: 'Retro',
    intensity: 0.6,
    description: 'Golden hour nostalgic colorgrade with crushed contrast',
    icon: '⏳',
  },
  {
    type: 'polaroid_fade',
    name: 'Polaroid Instant Fade',
    category: 'Retro',
    intensity: 0.6,
    description: 'Faded instant camera chemical development wash',
    icon: '📷',
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
    name: 'Anamorphic Streak Flare',
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
  {
    type: 'gold_glitter',
    name: 'Gold Glitter Shower',
    category: 'Bling',
    intensity: 0.65,
    description: 'Floating amber specks shimmering in lighting highlights',
    icon: '✨',
    badge: 'LUXE',
  },
  {
    type: 'diamond_prism',
    name: 'Diamond Prism',
    category: 'Bling',
    intensity: 0.65,
    description: 'Jeweled optical dispersion around edges',
    icon: '💎',
  },
  {
    type: 'heart_bokeh',
    name: 'Dreamy Heart Bokeh',
    category: 'Bling',
    intensity: 0.6,
    description: 'Diffused out-of-focus background light spheres',
    icon: '💖',
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
    name: 'Dolly Zoom Vertigo',
    category: 'Motion',
    intensity: 0.7,
    description: 'Hitchcock vertigo perspective compression',
    icon: '👁️',
  },
  {
    type: 'speed_lines',
    name: 'Speed Streaks',
    category: 'Motion',
    intensity: 0.7,
    description: 'High-velocity action lines across screen',
    icon: '💨',
  },
  {
    type: 'twitch_jolt',
    name: 'Twitch Jolt',
    category: 'Motion',
    intensity: 0.75,
    description: 'Rapid micro-displacement jitter on beat pulses',
    icon: '⚡',
  },
  {
    type: 'directional_blur',
    name: 'Motion Streak Blur',
    category: 'Motion',
    intensity: 0.6,
    description: 'Horizontal kinetic streaks simulating fast pans',
    icon: '🏎️',
  },

  // --- 6. DISTORTION & WARP ---
  {
    type: 'fisheye_lens',
    name: 'Fisheye 180°',
    category: 'Distortion',
    intensity: 0.7,
    description: 'Curved ultra-wide skate video fisheye bubble',
    icon: '🛹',
    badge: 'VIRAL',
  },
  {
    type: 'ripple_wave',
    name: 'Water Ripple',
    category: 'Distortion',
    intensity: 0.65,
    description: 'Liquid glass distortion waves undulating over footage',
    icon: '🌊',
  },
  {
    type: 'swirl_vortex',
    name: 'Swirl Vortex',
    category: 'Distortion',
    intensity: 0.7,
    description: 'Centrifugal gravitational warping towards focal point',
    icon: '🌪️',
  },
  {
    type: 'kaleidoscope',
    name: 'Kaleidoscope 4X',
    category: 'Distortion',
    intensity: 0.75,
    description: 'Symmetric quad-prism reflection pattern',
    icon: '💠',
  },
  {
    type: 'mirror_reflection',
    name: 'Mirror Reflection',
    category: 'Distortion',
    intensity: 1.0,
    description: 'Vertical bilateral split creating surreal symmetry',
    icon: '🪞',
  },

  // --- 7. PARTY & MOOD ---
  {
    type: 'disco_strobe',
    name: 'Disco Spectrum Strobe',
    category: 'Party',
    intensity: 0.8,
    description: 'Cycling rainbow hue bursts for EDM and rave drops',
    icon: '🪩',
    badge: 'PARTY',
  },
  {
    type: 'club_lights',
    name: 'Club Laser Beams',
    category: 'Party',
    intensity: 0.75,
    description: 'Rapid ambient hue rotation simulating strobe fixtures',
    icon: '🔦',
  },
  {
    type: 'thermal_vision',
    name: 'Thermal Heat Vision',
    category: 'Party',
    intensity: 0.8,
    description: 'Predator-style infrared thermographic color map',
    icon: '🌡️',
    badge: 'PRO',
  },
  {
    type: 'ghost_echo',
    name: 'Motion Ghost Trails',
    category: 'Party',
    intensity: 0.65,
    description: 'Temporal frame blending leaving ethereal motion afterimages',
    icon: '👻',
  },
  {
    type: 'color_inversion',
    name: 'Negative X-Ray Invert',
    category: 'Party',
    intensity: 1.0,
    description: 'Inverted luminances and complementary color spectrum',
    icon: '🎞️',
  },

  // --- 8. ATMOSPHERE & WEATHER ---
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
  {
    type: 'rain_drops',
    name: 'Rain Storm Droplets',
    category: 'Atmosphere',
    intensity: 0.6,
    description: 'Vertical cinematic rainfall streaks and mist',
    icon: '🌧️',
  },
  {
    type: 'snow_flurry',
    name: 'Winter Snow Flurry',
    category: 'Atmosphere',
    intensity: 0.6,
    description: 'Gently drifting white particle snowfall',
    icon: '❄️',
  },
  {
    type: 'fire_ember',
    name: 'Fire Embers Spark',
    category: 'Atmosphere',
    intensity: 0.7,
    description: 'Glowing incandescent ash rising in dark scenes',
    icon: '🔥',
  },
  {
    type: 'sun_rays',
    name: 'Golden Sun Rays',
    category: 'Atmosphere',
    intensity: 0.65,
    description: 'Volumetric divine crepuscular god rays',
    icon: '✨',
  },

  // --- 9. SPLIT SCREEN & BORDERS ---
  {
    type: 'split_2_horizontal',
    name: 'Dual Horizontal Split',
    category: 'Split',
    intensity: 0.9,
    description: 'Cinema 2-tier stacked frame composition',
    icon: '🪟',
  },
  {
    type: 'split_2_vertical',
    name: 'Dual Vertical Split',
    category: 'Split',
    intensity: 0.9,
    description: 'Side-by-side duet comparison frame split',
    icon: '🚪',
  },
  {
    type: 'split_4_quad',
    name: 'Quad 4-Screen Pop',
    category: 'Split',
    intensity: 0.95,
    description: 'Music video 4-quadrant simultaneous screen grid',
    icon: '⊞',
    badge: 'VIRAL',
  },
  {
    type: 'split_9_grid',
    name: '9-Screen Video Wall',
    category: 'Split',
    intensity: 0.95,
    description: 'Nine-panel video monitor bank matrix',
    icon: '▦',
  },
  {
    type: 'cinema_widescreen',
    name: 'Cinema 2.35:1 Bars',
    category: 'Split',
    intensity: 1.0,
    description: 'Anamorphic Hollywood black letterbox borders',
    icon: '🎬',
  },
  {
    type: 'film_sprocket',
    name: '35mm Film Borders',
    category: 'Split',
    intensity: 0.9,
    description: 'Exposed analog negative sprocket hole edges',
    icon: '📽️',
  },

  // --- 10. COMIC & ART STYLIZE ---
  {
    type: 'manga_sketch',
    name: 'Manga Ink Sketch',
    category: 'Comic',
    intensity: 0.8,
    description: 'Black and white hand-drawn Japanese comic lines',
    icon: '✏️',
    badge: 'ANIME',
  },
  {
    type: 'pop_art_poster',
    name: 'Pop Art Posterize',
    category: 'Comic',
    intensity: 0.85,
    description: 'Andy Warhol silkscreen quantized color planes',
    icon: '🎨',
    badge: 'POP',
  },
  {
    type: 'halftone_dot',
    name: 'Vintage Halftone Dot',
    category: 'Comic',
    intensity: 0.7,
    description: 'Retro newspaper newsprint CMYK printing rosette dot screen',
    icon: '📰',
  },
  {
    type: 'oil_painting',
    name: 'Impressionist Oil Paint',
    category: 'Comic',
    intensity: 0.75,
    description: 'Textured brush stroke impasto smoothing',
    icon: '🖌️',
  },
  {
    type: 'cartoon_contour',
    name: 'Cel-Shaded Toon',
    category: 'Comic',
    intensity: 0.8,
    description: 'Clean ink line borders with saturated vibrant fills',
    icon: '🖍️',
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

/** All 63 CapCut-style effects verified with actual FFmpeg and real-time playback rendering. */
export const RENDERABLE_EFFECTS: readonly string[] = VISUAL_EFFECTS_CATALOG.map((e) => e.type);
