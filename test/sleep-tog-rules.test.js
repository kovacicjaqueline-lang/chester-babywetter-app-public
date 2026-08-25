import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GENERIC_TOG_TABLE,
  SLEEP_BAG_ITEM_IDS,
  genericTogGuidanceForRoomTemp,
  targetSleepWarmthForRoomTemp,
  sleepBagRecommendationFor
} from '../src/index.js';

test('generic V1 TOG orientation has all calibrated temperature bands', () => {
  assert.equal(GENERIC_TOG_TABLE.length, 7);
  assert.equal(genericTogGuidanceForRoomTemp(28).sleepBagItemId, 'sleep_bag_none');
  assert.equal(genericTogGuidanceForRoomTemp(25).sleepBagItemId, 'sleep_bag_0_5');
  assert.equal(genericTogGuidanceForRoomTemp(23).sleepBagItemId, 'sleep_bag_1_0');
  assert.equal(genericTogGuidanceForRoomTemp(21).sleepBagItemId, 'sleep_bag_1_5');
  assert.equal(genericTogGuidanceForRoomTemp(19).sleepBagItemId, 'sleep_bag_2_5');
  assert.equal(genericTogGuidanceForRoomTemp(17).sleepBagItemId, 'sleep_bag_2_5');
  assert.equal(genericTogGuidanceForRoomTemp(15).sleepBagItemId, 'sleep_bag_3_5');
});

test('sleep bag catalog exposes none plus five TOG options', () => {
  assert.deepEqual(SLEEP_BAG_ITEM_IDS, ['sleep_bag_none', 'sleep_bag_0_5', 'sleep_bag_1_0', 'sleep_bag_1_5', 'sleep_bag_2_5', 'sleep_bag_3_5']);
});

test('sleep warmth target uses rebalancing weights, not TOG units', () => {
  assert.equal(targetSleepWarmthForRoomTemp(18.5), 5);
  assert.equal(targetSleepWarmthForRoomTemp(25), 2);
});

test('sleepBagRecommendationFor ignores inventory and manufacturer fields', () => {
  const result = sleepBagRecommendationFor({
    situation: { mode: 'sleep', roomTempC: 18.5, selectedSleepBagId: 'legacy' },
    profile: { sleepBagInventory: [{ sleepBagId: 'legacy', tog: 0.5, manufacturer: 'ignored' }] },
    session: { sessionId: 's', manualLocks: [], warmthOffset: 0 }
  });
  assert.equal(result.basis, 'generic_v1_orientation');
  assert.equal(result.targetSleepBagItemId, 'sleep_bag_2_5');
});
