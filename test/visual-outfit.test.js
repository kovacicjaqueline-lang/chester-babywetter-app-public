import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildVisualCatalog,
  nextVisualSeed,
  selectVisualLook,
  selectVisualVariant
} from '../src/visual-outfit.js';

const visualManifest = JSON.parse(readFileSync(new URL('../assets/clothing/visual-manifest.json', import.meta.url), 'utf8'));

const assetManifest = {
  assetGroups: [
    {
      id: 'long_sleeve_bodysuit', label: 'Langarmbody', altText: 'Langarmbody.',
      styleVariants: ['neutral', 'boy', 'girl'],
      variantPaths: {
        neutral: 'assets/clothing/long_sleeve_bodysuit/neutral.webp',
        boy: 'assets/clothing/long_sleeve_bodysuit/boy.webp',
        girl: 'assets/clothing/long_sleeve_bodysuit/girl.webp'
      }
    },
    {
      id: 'trousers', label: 'Hose', altText: 'Hose.', styleVariants: ['neutral'],
      assetPath: 'assets/clothing/trousers/neutral.webp'
    },
    {
      id: 'thin_sweater', label: 'Dünner Pullover', altText: 'Dünner Pullover.',
      styleVariants: ['neutral', 'boy', 'girl'],
      variantPaths: {
        neutral: 'assets/clothing/thin_sweater/neutral.webp',
        boy: 'assets/clothing/thin_sweater/boy.webp',
        girl: 'assets/clothing/thin_sweater/girl.webp'
      }
    },
    {
      id: 'sleep_bag_none', label: 'Kein Schlafsack', altText: 'Kein Schlafsack.',
      styleVariants: [], assetPath: null
    }
  ]
};

function recommendation(itemIds, overrides = {}) {
  return {
    recommendationId: 'rec_1',
    sessionId: 'session_42',
    notices: [{ code: 'CHECK_NECK' }],
    slots: itemIds.map((itemId, index) => ({
      phase: 'main',
      slot: `slot_${index}`,
      selected: { itemId, reasonCodes: ['TEST_REASON'] }
    })),
    ...overrides
  };
}

test('same session and same seed produce exactly the same visual look', () => {
  const rec = recommendation(['long_sleeve_bodysuit', 'trousers', 'thin_sweater']);
  const first = selectVisualLook({ recommendation: rec, assetManifest, visualManifest, styleTheme: 'neutral', visualSeed: 7 });
  const second = selectVisualLook({ recommendation: rec, assetManifest, visualManifest, styleTheme: 'neutral', visualSeed: 7 });
  assert.deepEqual(second, first);
});

test('a new seed can produce a different look without changing recommendation data', () => {
  const rec = recommendation(['long_sleeve_bodysuit', 'trousers', 'thin_sweater']);
  const before = structuredClone(rec);
  const baseline = selectVisualLook({ recommendation: rec, assetManifest, visualManifest, styleTheme: 'neutral', visualSeed: 0 });

  let changed = false;
  let seed = 0;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    seed = nextVisualSeed(seed);
    const candidate = selectVisualLook({ recommendation: rec, assetManifest, visualManifest, styleTheme: 'neutral', visualSeed: seed });
    if (candidate.themeId !== baseline.themeId || candidate.items.some((item, index) => item.variantId !== baseline.items[index].variantId)) {
      changed = true;
      break;
    }
  }

  assert.equal(changed, true);
  assert.deepEqual(rec, before);
});

test('all rendered items are compatible with the selected theme or explicit neutral fallback', () => {
  const rec = recommendation(['long_sleeve_bodysuit', 'trousers', 'thin_sweater']);
  const look = selectVisualLook({ recommendation: rec, assetManifest, visualManifest, styleTheme: 'girl', visualSeed: 4 });
  for (const item of look.items) {
    assert.equal(item.compatibleWithTheme || item.usedFallback, true);
  }
});

test('all configured themes produce a fully compatible representative outfit', () => {
  const rec = recommendation(['long_sleeve_bodysuit', 'trousers', 'thin_sweater']);
  for (const theme of visualManifest.themes) {
    const look = selectVisualLook({
      recommendation: rec,
      assetManifest,
      visualManifest,
      styleTheme: 'neutral',
      visualSeed: 5,
      themeId: theme.id
    });
    assert.equal(look.themeId, theme.id);
    for (const item of look.items) {
      assert.equal(item.compatibleWithTheme || item.usedFallback, true, `${theme.id} / ${item.itemId}`);
    }
  }
});

test('same session keeps theme and unchanged item assets stable across fachliche recomputation', () => {
  const firstRecommendation = recommendation(['long_sleeve_bodysuit', 'trousers', 'thin_sweater']);
  const changedRecommendation = recommendation(['long_sleeve_bodysuit', 'trousers'], { recommendationId: 'rec_2' });
  const first = selectVisualLook({ recommendation: firstRecommendation, assetManifest, visualManifest, visualSeed: 6 });
  const changed = selectVisualLook({ recommendation: changedRecommendation, assetManifest, visualManifest, visualSeed: 6 });
  assert.equal(changed.themeId, first.themeId);
  assert.deepEqual(changed.items.map((item) => item.variantId), first.items.slice(0, 2).map((item) => item.variantId));
});

test('missing theme variant falls back cleanly to neutral', () => {
  const restrictiveVisualManifest = structuredClone(visualManifest);
  restrictiveVisualManifest.sourceStyleProfiles.neutral.themeIds = ['sage_oat'];
  restrictiveVisualManifest.sourceStyleProfiles.boy.themeIds = ['dusty_blue_sand'];
  restrictiveVisualManifest.sourceStyleProfiles.girl.themeIds = ['clay_cream'];
  const catalog = buildVisualCatalog(assetManifest, restrictiveVisualManifest);

  const result = selectVisualVariant({
    catalog,
    assetGroupId: 'long_sleeve_bodysuit',
    themeId: 'mauve_cream',
    styleTheme: 'boy',
    seedKey: 'fallback-test'
  });

  assert.equal(result.sourceStyle, 'neutral');
  assert.equal(result.usedFallback, true);
  assert.equal(result.assetPath, 'assets/clothing/long_sleeve_bodysuit/neutral.webp');
});

test('boy/girl visual style never changes fachliche itemIds', () => {
  const rec = recommendation(['long_sleeve_bodysuit', 'trousers', 'thin_sweater']);
  const boy = selectVisualLook({ recommendation: rec, assetManifest, visualManifest, styleTheme: 'boy', visualSeed: 3 });
  const girl = selectVisualLook({ recommendation: rec, assetManifest, visualManifest, styleTheme: 'girl', visualSeed: 3 });
  const expected = rec.slots.map((slot) => slot.selected.itemId);
  assert.deepEqual(boy.items.map((item) => item.itemId), expected);
  assert.deepEqual(girl.items.map((item) => item.itemId), expected);
});

test('Anderer Look changes only visual output, not the engine recommendation', () => {
  const rec = recommendation(['long_sleeve_bodysuit', 'trousers', 'thin_sweater']);
  const before = JSON.stringify(rec);
  const first = selectVisualLook({ recommendation: rec, assetManifest, visualManifest, styleTheme: 'neutral', visualSeed: 10 });
  const second = selectVisualLook({ recommendation: rec, assetManifest, visualManifest, styleTheme: 'neutral', visualSeed: nextVisualSeed(10) });
  assert.equal(JSON.stringify(rec), before);
  assert.deepEqual(first.items.map((item) => item.itemId), second.items.map((item) => item.itemId));
});

test('car safety and sleep recommendation payloads are left byte-for-byte unchanged', () => {
  for (const rec of [
    recommendation(['long_sleeve_bodysuit'], { mode: 'car', notices: [{ code: 'CAR_SEAT_NO_BULKY_LAYERS' }] }),
    recommendation(['sleep_bag_none'], { mode: 'sleep', notices: [{ code: 'SLEEP_NO_HAT' }, { code: 'SLEEP_NO_LOOSE_BLANKET_OVER_BAG' }] })
  ]) {
    const before = JSON.stringify(rec);
    selectVisualLook({ recommendation: rec, assetManifest, visualManifest, styleTheme: 'neutral', visualSeed: 2 });
    assert.equal(JSON.stringify(rec), before);
  }
});

test('theme-compatible variants are actually explored across seeds', () => {
  const catalog = buildVisualCatalog(assetManifest, visualManifest);
  const observed = new Set();
  for (let seed = 0; seed < 40; seed += 1) {
    observed.add(selectVisualVariant({
      catalog,
      assetGroupId: 'long_sleeve_bodysuit',
      themeId: 'dusty_blue_sand',
      styleTheme: 'neutral',
      seedKey: `variation-${seed}`
    }).sourceStyle);
  }
  assert.deepEqual([...observed].sort(), ['boy', 'neutral']);
});

test('unknown item ids fail loudly instead of silently losing an image', () => {
  const catalog = buildVisualCatalog(assetManifest, visualManifest);
  assert.throws(() => selectVisualVariant({
    catalog,
    assetGroupId: 'obsolete_item_id',
    themeId: 'sage_oat',
    styleTheme: 'neutral',
    seedKey: 'obsolete-test'
  }), /Unknown asset group/);
});

test('derived visual variant ids are unique and all themes referenced by variants exist', () => {
  const catalog = buildVisualCatalog(assetManifest, visualManifest);
  const ids = Object.values(catalog.groupsById).flatMap((group) => group.visualVariants.map((variant) => variant.id));
  assert.equal(new Set(ids).size, ids.length);
  const themeIds = new Set(catalog.themes.map((theme) => theme.id));
  for (const group of Object.values(catalog.groupsById)) {
    for (const variant of group.visualVariants) {
      assert.equal(variant.themeIds.every((themeId) => themeIds.has(themeId)), true);
    }
  }
});
