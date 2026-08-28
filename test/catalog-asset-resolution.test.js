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
  store.byId = new Map(groups.map((group) => [group.id, group]));
  store.visualManifest = {
    sourceStyleProfiles: {
      neutral: { themeIds: ['sage_oat', 'mauve_cream'] },
      boy: { themeIds: ['dusty_blue_sand'] },
      girl: { themeIds: ['mauve_cream'] }
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

test('standard resolve shares the high-detail presentation lookup used by alternatives', () => {
  const store = createStore();
  const neutral = store.resolve('leggings', 'neutral');
  const girl = store.resolve('leggings', 'girl');

  assert.equal(neutral.assetPath, 'assets/clothing/leggings/sage-rib-01.webp');
  assert.equal(neutral.visualVariantId, 'sage-rib-01');
  assert.equal(girl.assetPath, 'assets/clothing/leggings/mauve-knit-01.webp');
  assert.equal(girl.visualVariantId, 'mauve-knit-01');
});
