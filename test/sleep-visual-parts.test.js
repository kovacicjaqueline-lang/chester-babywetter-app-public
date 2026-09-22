import test from 'node:test';
import assert from 'node:assert/strict';
import { isCompositeSleepVisualItem, visualPartsForItem, visualRecommendationFor } from '../ui/sleep-visual-parts.js';

test('sleep visual parts expand the combined short-body recommendation into two existing items', () => {
  assert.equal(isCompositeSleepVisualItem('sleep_under_short_body_plus_light_pajamas'), true);
  assert.deepEqual(visualPartsForItem('sleep_under_short_body_plus_light_pajamas'), [
    { itemId: 'sleep_under_short_sleeve_bodysuit', role: 'Basisschicht' },
    { itemId: 'sleep_under_light_pajamas', role: 'Schlafanzug' }
  ]);
});

test('sleep visual parts expand the combined long-body recommendation into two existing items', () => {
  assert.deepEqual(visualPartsForItem('sleep_under_long_body_plus_light_pajamas').map((part) => part.itemId), [
    'sleep_under_long_sleeve_bodysuit',
    'sleep_under_light_pajamas'
  ]);
});

test('non-combined items remain a single visual item', () => {
  assert.equal(isCompositeSleepVisualItem('sleep_under_light_pajamas'), false);
  assert.deepEqual(visualPartsForItem('sleep_under_light_pajamas'), [{ itemId: 'sleep_under_light_pajamas' }]);
});

test('visual recommendation expands only the composite item while preserving the logical recommendation', () => {
  const recommendation = {
    slots: [
      { phase: 'main', slot: 'sleep_underlayer', selected: { itemId: 'sleep_under_short_body_plus_light_pajamas' } },
      { phase: 'main', slot: 'sleep_bag', selected: { itemId: 'sleep_bag_2_5' } }
    ]
  };
  const visualRecommendation = visualRecommendationFor(recommendation);

  assert.deepEqual(recommendation.slots.map((slot) => slot.selected.itemId), [
    'sleep_under_short_body_plus_light_pajamas',
    'sleep_bag_2_5'
  ]);
  assert.deepEqual(visualRecommendation.slots.map((slot) => slot.selected.itemId), [
    'sleep_under_short_sleeve_bodysuit',
    'sleep_under_light_pajamas',
    'sleep_bag_2_5'
  ]);
  assert.equal(visualRecommendation.slots[0].slot, 'sleep_underlayer__visual_1');
});
