import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { selectVisualLook } from '../src/visual-outfit.js';

const visualManifest = JSON.parse(readFileSync(new URL('../assets/clothing/visual-manifest.json', import.meta.url), 'utf8'));
const runtimeAssetManifest = JSON.parse(readFileSync(new URL('../assets/clothing/manifest.json', import.meta.url), 'utf8'));

const socksAssetManifest = {
  assetGroups: [
    {
      id: 'socks',
      label: 'Socken',
      altText: 'Socken.',
      styleVariants: ['neutral', 'boy', 'girl'],
      variantPaths: {
        neutral: 'assets/clothing/socks/neutral.webp',
        boy: 'assets/clothing/socks/boy.webp',
        girl: 'assets/clothing/socks/girl.webp'
      }
    }
  ]
};

function socksRecommendation(seed) {
  return {
    recommendationId: `socks_${seed}`,
    sessionId: `style-session-${seed}`,
    slots: [
      {
        phase: 'main',
        slot: 'feet',
        selected: { itemId: 'socks', reasonCodes: ['TEST_REASON'] }
      }
    ]
  };
}

function runtimeManifestRecommendation(seed) {
  return {
    recommendationId: `runtime-style_${seed}`,
    sessionId: `runtime-style-session-${seed}`,
    slots: runtimeAssetManifest.assetGroups.map((group, index) => ({
      phase: 'main',
      slot: `${group.slot || 'asset'}-${index}`,
      selected: { itemId: group.id, reasonCodes: ['TEST_REASON'] }
    }))
  };
}

function assertAutomaticStyleIsolation({ styleTheme, forbiddenSourceStyle }) {
  const allowedThemes = new Set(visualManifest.sourceStyleProfiles[styleTheme].themeIds);

  for (let seed = 0; seed < 100; seed += 1) {
    const look = selectVisualLook({
      recommendation: runtimeManifestRecommendation(seed),
      assetManifest: runtimeAssetManifest,
      visualManifest,
      styleTheme,
      visualSeed: seed
    });

    assert.equal(allowedThemes.has(look.themeId), true, `unexpected ${styleTheme} theme for seed ${seed}: ${look.themeId}`);
    assert.equal(look.items.length, runtimeAssetManifest.assetGroups.length, `runtime manifest coverage changed for seed ${seed}`);

    for (const item of look.items) {
      assert.notEqual(
        item.sourceStyle,
        forbiddenSourceStyle,
        `${item.itemId} selected ${forbiddenSourceStyle} for ${styleTheme} style with seed ${seed} and theme ${look.themeId}`
      );
    }
  }
}

test('boy style auto-selects only blue/green themes and never girl socks', () => {
  const allowedThemes = new Set(visualManifest.sourceStyleProfiles.boy.themeIds);

  for (let seed = 0; seed < 100; seed += 1) {
    const look = selectVisualLook({
      recommendation: socksRecommendation(seed),
      assetManifest: socksAssetManifest,
      visualManifest,
      styleTheme: 'boy',
      visualSeed: seed
    });

    assert.equal(allowedThemes.has(look.themeId), true, `unexpected boy theme for seed ${seed}: ${look.themeId}`);
    assert.notEqual(look.items[0].sourceStyle, 'girl', `girl socks selected for seed ${seed}`);
  }
});

test('boy style never selects girl assets across the runtime clothing manifest', () => {
  assertAutomaticStyleIsolation({ styleTheme: 'boy', forbiddenSourceStyle: 'girl' });
});

test('girl style never selects boy assets across the runtime clothing manifest', () => {
  assertAutomaticStyleIsolation({ styleTheme: 'girl', forbiddenSourceStyle: 'boy' });
});
