/**
 * NovaCut Universal Search & Discovery Engine
 * Inspired by CapCut's universal search architecture (com.vega.search & com.xt.retouch.feed.impl.TemplateSearchActivity).
 * Provides fast, multi-category indexing and query matching across Templates,
 * Video Effects, LUT Filters, Royalty-Free Audio Tracks, and Sticker packs.
 */

import { VIRAL_TEMPLATES, TemplateDefinition } from '../templates/templateEngine';
import { PHOTO_FILTERS } from '../photo/photoEngine';
import { VISUAL_EFFECTS_CATALOG } from '../effects/effectRegistry';

export type SearchCategoryFilter = 'all' | 'templates' | 'effects' | 'audio' | 'stickers';

export type SearchItemType = 'template' | 'effect' | 'audio' | 'sticker';

export interface SearchResultItem {
  id: string;
  type: SearchItemType;
  title: string;
  subtitle: string;
  category: string;
  tags: string[];
  icon: string;
  accentColor: string;
  payload?: any;
}

export interface AudioTrackItem {
  id: string;
  title: string;
  artist: string;
  durationSec: number;
  bpm: number;
  genre: string;
  tags: string[];
}

export const ROYALTY_FREE_AUDIO_TRACKS: AudioTrackItem[] = [
  { id: 'snd_bass_bounce', title: 'Bass Bounce Drop', artist: 'NovaStudio', durationSec: 15, bpm: 128, genre: 'EDM / Dance', tags: ['#BeatDrop', '#TikTok', '#Bass'] },
  { id: 'snd_lofi_sunday', title: 'Sunday Morning Coffee', artist: 'ChillHop Crew', durationSec: 30, bpm: 80, genre: 'Lo-Fi Chill', tags: ['#LoFi', '#Aesthetic', '#Relax'] },
  { id: 'snd_cyber_overdrive', title: 'Cyber Overdrive', artist: 'SynthPulse', durationSec: 20, bpm: 140, genre: 'Synthwave', tags: ['#Cyberpunk', '#Fast', '#Action'] },
  { id: 'snd_wanderlust', title: 'Acoustic Horizon', artist: 'TravelVibes', durationSec: 25, bpm: 75, genre: 'Acoustic', tags: ['#Travel', '#Vlog', '#Peaceful'] },
  { id: 'snd_countdown_reveal', title: 'The Big Reveal (Countdown)', artist: 'TrendSound', durationSec: 12, bpm: 110, genre: 'Cinematic Drop', tags: ['#BeforeAfter', '#Transformation', '#GlowUp'] },
  { id: 'snd_glitch_hop', title: 'Glitchy Motion Trap', artist: 'BeatForge', durationSec: 18, bpm: 135, genre: 'Trap / Hip Hop', tags: ['#Trap', '#Glitch', '#Velocity'] },
];

export const VISUAL_EFFECT_ITEMS: { id: string; name: string; category: string; description: string; tags: string[]; icon: string; accentColor: string }[] = [
  { id: 'fx_glitch_split', name: 'RGB Glitch Split', category: 'Visual FX', description: 'Chromatic aberration RGB channel offset', tags: ['#Glitch', '#Cyber', '#RGB', '#Action'], icon: '⚡', accentColor: '#EC4899' },
  { id: 'fx_film_grain', name: 'Vintage 35mm Grain', category: 'Texture', description: 'Authentic analog film grain & dust texture', tags: ['#Film', '#Retro', '#Grain', '#Vintage'], icon: '🎞️', accentColor: '#F59E0B' },
  { id: 'fx_retro_vhs', name: 'Retro VHS Camcorder', category: 'Retro', description: 'Analog scanlines, tape flutter & color bleeding', tags: ['#VHS', '#90s', '#Retro', '#Tape'], icon: '📼', accentColor: '#8B5CF6' },
  { id: 'fx_zoom_blur', name: 'Dynamic Zoom Blur', category: 'Motion', description: 'Radial motion zoom on fast transitions', tags: ['#Zoom', '#Blur', '#Motion', '#Fast'], icon: '💫', accentColor: '#3B82F6' },
  { id: 'fx_sparkle_glow', name: 'Starry Sparkle Glow', category: 'Aesthetic', description: 'Dreamy highlight bloom and star glimmers', tags: ['#Sparkle', '#Glow', '#Dreamy', '#Aesthetic'], icon: '✨', accentColor: '#10B981' },
  { id: 'fx_shake_wave', name: 'Earthquake Camera Shake', category: 'Motion', description: 'Impact camera jolt synchronized to bass drops', tags: ['#Shake', '#Impact', '#Bass', '#Drop'], icon: '💥', accentColor: '#EF4444' },
];

export const TRENDING_TAGS: string[] = [
  '#BeatDrop',
  '#Velocity',
  '#TealAndOrange',
  '#Cinematic',
  '#Glitch',
  '#TikTok',
  '#LoFi',
  '#Travel',
  '#BeforeAfter',
  '#Cyberpunk',
];

/**
 * Builds the searchable unified catalog.
 */
export function buildUnifiedSearchCatalog(): SearchResultItem[] {
  const results: SearchResultItem[] = [];

  // 1. Templates
  VIRAL_TEMPLATES.forEach((tpl) => {
    results.push({
      id: `res_tpl_${tpl.id}`,
      type: 'template',
      title: tpl.title,
      subtitle: `${tpl.slots.length} Clips • ${tpl.soundTitle}`,
      category: tpl.category,
      tags: tpl.tags,
      icon: tpl.previewThumbnail,
      accentColor: tpl.previewGradient[0],
      payload: tpl,
    });
  });

  // 2. LUT Filters
  PHOTO_FILTERS.forEach((filter) => {
    results.push({
      id: `res_filter_${filter.id}`,
      type: 'effect',
      title: `${filter.name} LUT`,
      subtitle: `Color Grading • ${filter.category}`,
      category: 'Color Grading',
      tags: [`#${filter.name.replace(/\s+/g, '')}`, `#${filter.category}`, '#LUT', '#Filter'],
      icon: '🎨',
      accentColor: filter.tintColor || '#3B82F6',
      payload: filter,
    });
  });

  // 3. Visual Effects
  VISUAL_EFFECT_ITEMS.forEach((fx) => {
    results.push({
      id: `res_fx_${fx.id}`,
      type: 'effect',
      title: fx.name,
      subtitle: fx.description,
      category: fx.category,
      tags: fx.tags,
      icon: fx.icon,
      accentColor: fx.accentColor,
      payload: fx,
    });
  });

  VISUAL_EFFECTS_CATALOG.filter((f) => f.type !== 'none').forEach((fx) => {
    results.push({
      id: `res_fx_cat_${fx.type}`,
      type: 'effect',
      title: fx.name,
      subtitle: fx.description,
      category: fx.category,
      tags: [`#${fx.name.replace(/\s+/g, '')}`, `#${fx.category}`, '#Effect', '#VideoFX'],
      icon: fx.icon,
      accentColor: '#00E5FF',
      payload: fx,
    });
  });

  // 4. Audio Tracks
  ROYALTY_FREE_AUDIO_TRACKS.forEach((track) => {
    results.push({
      id: `res_audio_${track.id}`,
      type: 'audio',
      title: track.title,
      subtitle: `${track.artist} • ${track.durationSec}s • ${track.bpm} BPM`,
      category: track.genre,
      tags: track.tags,
      icon: '🎵',
      accentColor: '#10B981',
      payload: track,
    });
  });

  return results;
}

/**
 * Searches the catalog with tokenized keyword matching and category filtering.
 */
export function searchCatalog(
  query: string,
  categoryFilter: SearchCategoryFilter = 'all'
): SearchResultItem[] {
  const catalog = buildUnifiedSearchCatalog();
  const cleanQuery = query.trim().toLowerCase();

  return catalog.filter((item) => {
    // Category check
    if (categoryFilter === 'templates' && item.type !== 'template') return false;
    if (categoryFilter === 'effects' && item.type !== 'effect') return false;
    if (categoryFilter === 'audio' && item.type !== 'audio') return false;
    if (categoryFilter === 'stickers' && item.type !== 'sticker') return false;

    if (!cleanQuery) return true;

    // Search query token matching
    const tokens = cleanQuery.split(/\s+/).filter(Boolean);
    const searchableText = `${item.title} ${item.subtitle} ${item.category} ${item.tags.join(' ')}`.toLowerCase();

    return tokens.every((token) => searchableText.includes(token));
  });
}

/**
 * Manages in-memory recent search history.
 */
class SearchHistoryManager {
  private history: string[] = ['Velocity Edit', 'Cinematic LUT', 'Beat Sync 128 BPM', 'Cyberpunk', 'Lo-Fi Chill'];

  public getHistory(): string[] {
    return [...this.history];
  }

  public addTerm(term: string) {
    const trimmed = term.trim();
    if (!trimmed) return;
    this.history = [trimmed, ...this.history.filter((t) => t.toLowerCase() !== trimmed.toLowerCase())].slice(0, 10);
  }

  public clearHistory() {
    this.history = [];
  }
}

export const searchHistoryManager = new SearchHistoryManager();
