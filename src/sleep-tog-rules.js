export const GENERIC_TOG_TABLE = Object.freeze([
  row('below_16', -Infinity, 16, 'sleep_bag_3_5', 'sleep_underlayer_long_sleeve_bodysuit', 'sleep_bag_2_5', 'sleep_underlayer_short_bodysuit_plus_light_pajamas'),
  row('16_to_18', 16, 18, 'sleep_bag_2_5', 'sleep_underlayer_long_sleeve_bodysuit', 'sleep_bag_3_5', 'sleep_underlayer_short_sleeve_bodysuit'),
  row('18_to_20', 18, 20, 'sleep_bag_2_5', 'sleep_underlayer_short_sleeve_bodysuit', 'sleep_bag_1_5', 'sleep_underlayer_light_pajamas'),
  row('20_to_22', 20, 22, 'sleep_bag_1_5', 'sleep_underlayer_short_sleeve_bodysuit', 'sleep_bag_1_0', 'sleep_underlayer_light_pajamas'),
  row('22_to_24', 22, 24, 'sleep_bag_1_0', 'sleep_underlayer_short_sleeve_bodysuit', 'sleep_bag_0_5', 'sleep_underlayer_light_pajamas'),
  row('24_to_27', 24, 27, 'sleep_bag_0_5', 'sleep_underlayer_short_sleeve_bodysuit', 'sleep_bag_none', 'sleep_underlayer_light_pajamas'),
  row('27_plus', 27, Infinity, 'sleep_bag_none', 'sleep_underlayer_nappy_only', 'sleep_bag_0_5', 'sleep_underlayer_nappy_only')
]);

export const SLEEP_WARMTH_WEIGHTS = Object.freeze({
  sleep_bag_none: 0,
  sleep_bag_0_5: 1,
  sleep_bag_1_0: 2,
  sleep_bag_1_5: 3,
  sleep_bag_2_5: 4,
  sleep_bag_3_5: 5,
  sleep_underlayer_nappy_only: 0,
  sleep_underlayer_short_sleeve_bodysuit: 1,
  sleep_underlayer_long_sleeve_bodysuit: 2,
  sleep_underlayer_light_pajamas: 2,
  sleep_underlayer_short_bodysuit_plus_light_pajamas: 3,
  sleep_underlayer_long_bodysuit_plus_light_pajamas: 4
});

export const SLEEP_BAG_ITEM_IDS = Object.freeze([
  'sleep_bag_none', 'sleep_bag_0_5', 'sleep_bag_1_0', 'sleep_bag_1_5', 'sleep_bag_2_5', 'sleep_bag_3_5'
]);

export const SLEEP_UNDERLAYER_ITEM_IDS = Object.freeze([
  'sleep_underlayer_nappy_only',
  'sleep_underlayer_short_sleeve_bodysuit',
  'sleep_underlayer_long_sleeve_bodysuit',
  'sleep_underlayer_light_pajamas',
  'sleep_underlayer_short_bodysuit_plus_light_pajamas',
  'sleep_underlayer_long_bodysuit_plus_light_pajamas'
]);

function row(id, minRoomTempC, maxRoomTempC, sleepBagItemId, underlayerItemId, alternativeSleepBagItemId, alternativeUnderlayerItemId) {
  return Object.freeze({ id, minRoomTempC, maxRoomTempC, sleepBagItemId, underlayerItemId, alternativeSleepBagItemId, alternativeUnderlayerItemId });
}

export function genericTogGuidanceForRoomTemp(roomTempC) {
  if (!Number.isFinite(roomTempC)) throw new TypeError('roomTempC must be a finite number');
  const entry = GENERIC_TOG_TABLE.find((candidate) => roomTempC >= candidate.minRoomTempC && roomTempC < candidate.maxRoomTempC);
  return { ...entry };
}

export function targetSleepWarmthForRoomTemp(roomTempC) {
  const guidance = genericTogGuidanceForRoomTemp(roomTempC);
  return SLEEP_WARMTH_WEIGHTS[guidance.sleepBagItemId] + SLEEP_WARMTH_WEIGHTS[guidance.underlayerItemId];
}

/** Compatibility helper: no inventory/manufacturer data is read in V1. */
export function sleepBagRecommendationFor({ context, situation, session = { manualLocks: [] } }) {
  const sleepContext = context ?? situation;
  if (sleepContext?.mode !== 'sleep' || !Number.isFinite(sleepContext.roomTempC)) return null;
  const guidance = genericTogGuidanceForRoomTemp(sleepContext.roomTempC);
  const lockedBag = (session.manualLocks ?? []).find((lock) => lock.phase === 'main' && lock.slot === 'sleep_bag')?.itemId ?? null;
  return {
    action: lockedBag ? 'keep' : 'select',
    basis: 'generic_v1_orientation',
    targetSleepBagItemId: lockedBag ?? guidance.sleepBagItemId,
    genericTarget: guidance
  };
}

/** Legacy no-op kept so older imports do not break. */
export function applyGenericTogFallback(result) {
  return result;
}
