import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  buildUnifiedSearchCatalog,
  searchCatalog,
  searchHistoryManager,
  TRENDING_TAGS,
  ROYALTY_FREE_AUDIO_TRACKS,
  VISUAL_EFFECT_ITEMS,
} from '../src/core/search/searchEngine';

describe('CapCut Universal Search & Discovery Engine', () => {
  it('builds a unified indexed catalog across templates, effects, LUTs, and audio', () => {
    const catalog = buildUnifiedSearchCatalog();
    assert.ok(catalog.length > 15);

    const types = new Set(catalog.map((i) => i.type));
    assert.ok(types.has('template'));
    assert.ok(types.has('effect'));
    assert.ok(types.has('audio'));

    catalog.forEach((item) => {
      assert.ok(item.id.length > 0);
      assert.ok(item.title.length > 0);
      assert.ok(item.subtitle.length > 0);
      assert.ok(item.icon.length > 0);
      assert.ok(item.accentColor.length > 0);
    });
  });

  it('performs multi-token fuzzy search accurately', () => {
    // Search "cyber" should match Cyberpunk template and audio
    const cyberResults = searchCatalog('cyber');
    assert.ok(cyberResults.length >= 1);
    const cyberTitles = cyberResults.map((r) => r.title.toLowerCase());
    assert.ok(cyberTitles.some((t) => t.includes('cyber')));

    // Multi-token: "beat drop"
    const beatResults = searchCatalog('beat drop');
    assert.ok(beatResults.length >= 1);

    // Empty query returns all items in category
    const allResults = searchCatalog('');
    assert.strictEqual(allResults.length, buildUnifiedSearchCatalog().length);
  });

  it('filters results strictly by category pill', () => {
    const templateOnly = searchCatalog('', 'templates');
    assert.ok(templateOnly.length > 0);
    assert.ok(templateOnly.every((i) => i.type === 'template'));

    const effectsOnly = searchCatalog('', 'effects');
    assert.ok(effectsOnly.length > 0);
    assert.ok(effectsOnly.every((i) => i.type === 'effect'));

    const audioOnly = searchCatalog('', 'audio');
    assert.ok(audioOnly.length > 0);
    assert.ok(audioOnly.every((i) => i.type === 'audio'));
  });

  it('manages search history with deduplication and cap limits', () => {
    searchHistoryManager.clearHistory();
    assert.strictEqual(searchHistoryManager.getHistory().length, 0);

    searchHistoryManager.addTerm('Vlog Music');
    assert.deepStrictEqual(searchHistoryManager.getHistory(), ['Vlog Music']);

    // Duplicate term should be hoisted to top without duplicates
    searchHistoryManager.addTerm('Film Grain');
    searchHistoryManager.addTerm('vlog music'); // case insensitive match
    const history = searchHistoryManager.getHistory();
    assert.strictEqual(history.length, 2);
    assert.strictEqual(history[0], 'vlog music');
    assert.strictEqual(history[1], 'Film Grain');

    // History cap at 10 items
    for (let i = 0; i < 15; i++) {
      searchHistoryManager.addTerm(`query_${i}`);
    }
    assert.ok(searchHistoryManager.getHistory().length <= 10);
  });

  it('provides trending hashtags and audio assets', () => {
    assert.ok(TRENDING_TAGS.length >= 5);
    assert.ok(TRENDING_TAGS.includes('#BeatDrop'));
    assert.ok(TRENDING_TAGS.includes('#Velocity'));

    assert.ok(ROYALTY_FREE_AUDIO_TRACKS.length >= 5);
    assert.ok(VISUAL_EFFECT_ITEMS.length >= 6);
  });
});
