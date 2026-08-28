import test from 'node:test';
import assert from 'node:assert/strict';
import { ClothingAssetStore } from '../ui/asset-store.js';

function createStore() {
  const store = new ClothingAssetStore();
  const groups = [
    {
      id: 'leggings',
      category: 'leggings',
      label: 'Leggings',
      altText: 'Leggings.',
      assetPath: 'assets/clothing/leggings/neutral.webp'
    },
    {
      id: 'short_sleeve_bodysuit',
      category: 'short_sleeve_bodysuit',
      label: 'Kurzarmbody',
      altText: 'Kurzarmbody.',
      variantPaths: {
        neutral: 'assets/clothing/short_sleeve_bodysuit/neutral.webp',
        boy: 'assets/clothing/short_sleeve_bodysuit/boy.webp',
        girl: 'assets/clothing/short_sleeve_bodysuit/girl.webp'
      }
    }
  ];
  store.assetManifest = { schemaVersion: 1, assetGroups: groups };
  store.byId = new Map(groups.map((group) => [group.id, group]));
  store.visualManifest = {
    schemaVersion: 1,
    fallbackSourceStyle: 'neutral',
    themes: [
      { id: 'sage_oat', label: 'Sage / Oat', palette: ['sage', 'oat'] },
      { id: 'mauve_cream', label: 'Mauve / Cream', palette: ['mauve', 'cream'] },
      { id: 'dusty_blue_sand', label: 'Dusty Blue / Sand', palette: ['dusty_blue', 'sand'] }
    ],
    sourceStyleProfiles: {
      neutral: {
        themeIds: ['sage_oat', 'mauve_cream'],
        stylePreferenceRank: { neutral: 0, boy: 1, girl: 1 }
      },
      boy: {
        themeIds: ['dusty_blue_sand'],
        stylePreferenceRank: { boy: 0, neutral: 1, girl: 2 }
      },
      girl: {
        themeIds: ['mauve_cream'],
        stylePreferenceRank: { girl: 0, neutral: 1, boy: 2 }
      }
    },
    additionalVariants: {
      leggings: [
        {
          id: 'sage-rib-01',
          assetPath: 'assets/clothing/leggings/sage-rib-01.webp',
          themeIds: ['sage_oat']
        },
        {
          id: 'mauve-knit-01',
          assetPath: 'assets/clothing/leggings/mauve-knit-01.webp',
          themeIds: ['mauve_cream']
        }
      ]
    }
  };
  store.status = 'ready';
  return store;
}

test('catalog prefers an available high-detail visual variant for the selected style', () => {
  const store = createStore();
  const neutral = store.resolveCatalog('leggings', 'neutral');
  const girl = store.resolveCatalog('leggings', 'girl');

  assert.equal(neutral.assetPath, 'assets/clothing/leggings/sage-rib-01.webp');
  assert.equal(neutral.visualVariantId, 'sage-rib-01');
  assert.equal(girl.assetPath, 'assets/clothing/leggings/mauve-knit-01.webp');
  assert.equal(girl.visualVariantId, 'mauve-knit-01');
});

test('catalog keeps the style-specific base image when no compatible visual variant exists', () => {
  const store = createStore();

  const boyLeggings = store.resolveCatalog('leggings', 'boy');
  const girlBody = store.resolveCatalog('short_sleeve_bodysuit', 'girl');

  assert.equal(boyLeggings.assetPath, 'assets/clothing/leggings/neutral.webp');
  assert.equal(boyLeggings.visualVariantId, null);
  assert.equal(girlBody.assetPath, 'assets/clothing/short_sleeve_bodysuit/girl.webp');
  assert.equal(girlBody.visualVariantId, null);
});

test('standard resolve uses the high-detail catalog lookup when no active look exists', () => {
  const store = createStore();
  const neutral = store.resolve('leggings', 'neutral');
  const girl = store.resolve('leggings', 'girl');

  assert.equal(neutral.assetPath, 'assets/clothing/leggings/sage-rib-01.webp');
  assert.equal(neutral.visualVariantId, 'sage-rib-01');
  assert.equal(girl.assetPath, 'assets/clothing/leggings/mauve-knit-01.webp');
  assert.equal(girl.visualVariantId, 'mauve-knit-01');
});

test('alternative resolve keeps the active look theme and variant seed', () => {
  const store = createStore();
  const currentSlot = {
    phase: 'main',
    slot: 'base_torso',
    selected: { itemId: 'short_sleeve_bodysuit' }
  };
  const currentRecommendation = {
    recommendationId: 'recommendation:test',
    sessionId: 'session:test',
    slots: [currentSlot]
  };

  const currentVisual = store.resolveLook(currentRecommendation, 'neutral', 0, 'mauve_cream');
  assert.equal(currentVisual.look.themeId, 'mauve_cream');

  const previewAsset = store.resolve('leggings', 'neutral');
  const projectedSlot = {
    phase: 'main',
    slot: 'legs',
    selected: { itemId: 'leggings' }
  };
  const projectedVisual = store.resolveLook({
    recommendationId: 'recommendation:test',
    sessionId: 'session:test',
    slots: [projectedSlot]
  }, 'neutral', 0, 'mauve_cream');
  const projectedAsset = store.resolveSlot(projectedSlot, projectedVisual.bySlot);

  assert.equal(previewAsset.assetPath, projectedAsset.assetPath);
  assert.equal(previewAsset.visualVariantId, projectedAsset.visualVariantId);
  assert.notEqual(previewAsset.assetPath, 'assets/clothing/leggings/sage-rib-01.webp');
});
