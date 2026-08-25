import test from 'node:test';
import assert from 'node:assert/strict';
import { GENERIC_TOG_TABLE, genericTogGuidanceForRoomTemp, recommendOutfit } from '../src/index.js';

function profile(sleepBagInventory = []) {
  return {
    profileId: 'baby_sleep_test',
    displayName: 'Testbaby',
    birthDate: '2026-01-24',
    warmthBias: 'neutral',
    styleTheme: 'neutral',
    defaultActivity: 'normal',
    sleepBagInventory,
    createdAt: '2026-08-25T10:00:00.000Z',
    updatedAt: '2026-08-25T10:00:00.000Z'
  };
}

function sleep(roomTempC, selectedSleepBagId = null) {
  return { mode: 'sleep', roomTempC, selectedSleepBagId };
}

function noticeCodes(result) {
  return result.notices.map((notice) => notice.code);
}

test('generic TOG table is exported and covers every room temperature', () => {
  assert.ok(GENERIC_TOG_TABLE.length >= 7);
  const cases = [
    [15.999, 'below_16', 3.5],
    [16, '16_to_18', 2.5],
    [17.999, '16_to_18', 2.5],
    [18, '18_to_20', 2.5],
    [19.999, '18_to_20', 2.5],
    [20, '20_to_22', 1.0],
    [21.999, '20_to_22', 1.0],
    [22, '22_to_24', 1.0],
    [23.999, '22_to_24', 1.0],
    [24, '24_to_27', 0.5],
    [26.999, '24_to_27', 0.5],
    [27, '27_plus', 0.2]
  ];

  for (const [temp, id, tog] of cases) {
    const guidance = genericTogGuidanceForRoomTemp(temp);
    assert.equal(guidance.id, id, `${temp} °C band`);
    assert.equal(guidance.recommendedTog, tog, `${temp} °C TOG`);
  }
});

test('matching selected TOG without manufacturer guidance gets concrete generic underlayer alternative', () => {
  const result = recommendOutfit({
    weather: null,
    profile: profile([{ sleepBagId: 'bag_25', label: '2.5 TOG', tog: 2.5, manufacturer: null, guidanceBands: [] }]),
    situation: sleep(18, 'bag_25')
  });

  assert.equal(result.status, 'partial');
  assert.equal(result.confidence.level, 'medium');
  assert.ok(noticeCodes(result).includes('SLEEP_GENERIC_TOG_GUIDANCE_USED'));
  const guidance = result.guidance.find((entry) => entry.code === 'SLEEP_GENERIC_TOG_TABLE');
  assert.equal(guidance.recommendedTog, 2.5);
  assert.equal(guidance.selectedTogMatches, true);
  const alternative = result.alternatives.find((entry) => entry.alternativeId === 'generic_tog_18_to_20');
  assert.ok(alternative);
  assert.deepEqual(alternative.items.map((item) => item.itemId), ['sleep_suit']);
});

test('16 to 18 C generic 2.5 TOG alternative uses body plus sleepsuit', () => {
  const result = recommendOutfit({
    weather: null,
    profile: profile([{ sleepBagId: 'bag_25', label: '2.5 TOG', tog: 2.5, manufacturer: null, guidanceBands: [] }]),
    situation: sleep(17, 'bag_25')
  });
  const alternative = result.alternatives.find((entry) => entry.alternativeId === 'generic_tog_16_to_18');
  assert.deepEqual(alternative.items.map((item) => item.itemId), ['long_sleeve_bodysuit', 'sleep_suit']);
});

test('selected TOG that differs from generic room-temperature band is explicitly flagged', () => {
  const result = recommendOutfit({
    weather: null,
    profile: profile([{ sleepBagId: 'bag_10', label: '1.0 TOG', tog: 1.0, manufacturer: null, guidanceBands: [] }]),
    situation: sleep(18, 'bag_10')
  });

  assert.equal(result.confidence.level, 'low');
  assert.ok(noticeCodes(result).includes('SLEEP_SELECTED_TOG_OUTSIDE_GENERIC_RANGE'));
  const guidance = result.guidance.find((entry) => entry.code === 'SLEEP_GENERIC_TOG_TABLE');
  assert.equal(guidance.selectedTog, 1.0);
  assert.equal(guidance.recommendedTog, 2.5);
  assert.equal(guidance.selectedTogMatches, false);
});

test('manufacturer guidance remains authoritative and suppresses generic fallback', () => {
  const result = recommendOutfit({
    weather: null,
    profile: profile([{
      sleepBagId: 'guided',
      label: 'Guided 1.0 TOG',
      tog: 1.0,
      manufacturer: 'Test',
      guidanceBands: [{
        minRoomTempC: 18,
        maxRoomTempC: 22,
        recommendedUnderlayers: ['long_sleeve_bodysuit'],
        sourceLabel: 'Manufacturer',
        sourceUrl: null
      }]
    }]),
    situation: sleep(19, 'guided')
  });

  assert.equal(result.status, 'ready');
  assert.equal(result.confidence.level, 'high');
  assert.ok(!noticeCodes(result).includes('SLEEP_GENERIC_TOG_GUIDANCE_USED'));
  assert.ok(!result.guidance.some((entry) => entry.code === 'SLEEP_GENERIC_TOG_TABLE'));
});

test('without a selected sleep bag the engine still exposes a generic TOG recommendation', () => {
  const result = recommendOutfit({
    weather: null,
    profile: profile(),
    situation: sleep(22.5, null)
  });
  const guidance = result.guidance.find((entry) => entry.code === 'SLEEP_GENERIC_TOG_TABLE');
  assert.equal(guidance.recommendedTog, 1.0);
  assert.deepEqual(guidance.recommendedUnderlayers, ['short_sleeve_bodysuit']);
});

test('generic TOG fallback never bypasses blocked sleep evaluation without room temperature', () => {
  const result = recommendOutfit({
    weather: null,
    profile: profile(),
    situation: sleep(null, null)
  });
  assert.equal(result.status, 'blocked');
  assert.ok(!result.guidance.some((entry) => entry.code === 'SLEEP_GENERIC_TOG_TABLE'));
});
