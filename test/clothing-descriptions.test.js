import test from 'node:test';
import assert from 'node:assert/strict';
import { CLOTHING_CATALOG, getClothingDescription } from '../src/index.js';

test('every clothing and accessory metadata entry has a resolvable description', () => {
  const itemIds = Object.keys(CLOTHING_CATALOG);
  assert.equal(itemIds.length, 53);
  for (const itemId of itemIds) {
    const description = getClothingDescription(itemId);
    assert.equal(description, CLOTHING_CATALOG[itemId].description, itemId);
    assert.ok(description.length > 0, `${itemId} has no description`);
    assert.match(description, /[.]$/, `${itemId} description should be a short complete sentence`);
  }
  assert.equal(getClothingDescription('unknown_item'), '');
});

test('sweater, sweatshirt, and fleece descriptions match their fixed product definitions', () => {
  assert.equal(getClothingDescription('thin_sweater'), 'Leichter Strick- oder Jersey-Pullover, ungefüttert.');
  assert.equal(getClothingDescription('sweatshirt'), 'Pullover aus normalem Sweatstoff, nicht dick gefüttert oder stark angeraut.');
  assert.equal(getClothingDescription('fleece_jacket'), 'Deutlich wärmere, isolierende Mittelschicht aus Fleece.');
});
