import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { selectVisualLook } from '../src/visual-outfit.js';

const visualManifest = JSON.parse(readFileSync(new URL('../assets/clothing/visual-manifest.json', import.meta.url), 'utf8'));

const assetManifest = {
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

test('boy style auto-selects only blue/green themes and never girl socks', () => {
  const allowedThemes = new Set(visualManifest.sourceStyleProfiles.boy.themeIds);

  for (let seed = 0; seed < 100; seed += 1) {
    const look = selectVisualLook({
      recommendation: socksRecommendation(seed),
      assetManifest,
      visualManifest,
      styleTheme: 'boy',
      visualSeed: seed
    });

    assert.equal(allowedThemes.has(look.themeId), true, `unexpected boy theme for seed ${seed}: ${look.themeId}`);
    assert.notEqual(look.items[0].sourceStyle, 'girl', `girl socks selected for seed ${seed}`);
  }
});
