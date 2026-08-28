import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CLOTHING_CATALOG } from '../src/index.js';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));
const assetManifest = JSON.parse(readFileSync(`${repoRoot}/assets/clothing/manifest.json`, 'utf8'));

const EXPECTED_V1_IDS = Object.freeze([
  'short_sleeve_bodysuit',
  'long_sleeve_bodysuit',
  't_shirt',
  'light_long_sleeve_shirt',
  'light_trousers',
  'leggings',
  'trousers',
  'warm_trousers',
  'tights',
  'socks',
  'warm_socks_booties',
  'thin_sweater',
  'sweatshirt',
  'fleece_jacket',
  'light_transition_jacket',
  'softshell_jacket',
  'rain_jacket',
  'transition_overall',
  'winter_overall',
  'sun_hat',
  'thin_hat',
  'warm_hat',
  'gloves',
  'light_shoes',
  'weatherproof_shoes',
  'warm_shoes',
  'stroller_thermal_none',
  'stroller_light_blanket',
  'stroller_warm_blanket',
  'stroller_light_footmuff',
  'stroller_warm_footmuff',
  'stroller_weather_none',
  'stroller_rain_cover',
  'stroller_sunshade',
  'carrier_cover_none',
  'carrier_cover_light',
  'carrier_cover_warm',
  'car_blanket_over_harness',
  'sleep_bag_none',
  'sleep_bag_0_5',
  'sleep_bag_1_0',
  'sleep_bag_1_5',
  'sleep_bag_2_5',
  'sleep_bag_3_5',
  'sleep_under_nappy_only',
  'sleep_under_short_sleeve_bodysuit',
  'sleep_under_long_sleeve_bodysuit',
  'sleep_under_light_pajamas',
  'sleep_under_short_body_plus_light_pajamas',
  'sleep_under_long_body_plus_light_pajamas'
]);

function assertThermalWeights(expected) {
  for (const [itemId, thermalWeight] of Object.entries(expected)) {
    assert.equal(CLOTHING_CATALOG[itemId]?.thermalWeight, thermalWeight, itemId);
  }
}

function assertStrictlyIncreasing(ids, field) {
  for (let index = 1; index < ids.length; index += 1) {
    const previous = CLOTHING_CATALOG[ids[index - 1]]?.[field];
    const current = CLOTHING_CATALOG[ids[index]]?.[field];
    assert.ok(previous < current, `${field}: ${ids[index - 1]} (${previous}) < ${ids[index]} (${current})`);
  }
}

test('V1 catalog contains exactly the audited clothing and accessory itemIds', () => {
  assert.deepEqual(Object.keys(CLOTHING_CATALOG).sort(), [...EXPECTED_V1_IDS].sort());
});

test('body thermalWeight calibration stays monotonic within comparable slots', () => {
  assertThermalWeights({
    short_sleeve_bodysuit:1,
    t_shirt:1,
    light_long_sleeve_shirt:1,
    long_sleeve_bodysuit:2,
    light_trousers:1,
    leggings:2,
    trousers:2,
    tights:2,
    warm_trousers:3,
    thin_sweater:2,
    sweatshirt:2,
    fleece_jacket:3,
    rain_jacket:0,
    light_transition_jacket:1,
    softshell_jacket:3,
    transition_overall:3,
    winter_overall:4,
    socks:1,
    warm_socks_booties:2,
    sun_hat:0,
    thin_hat:1,
    warm_hat:2,
    gloves:1,
    light_shoes:1,
    weatherproof_shoes:1,
    warm_shoes:2
  });

  assert.ok(CLOTHING_CATALOG.short_sleeve_bodysuit.thermalWeight < CLOTHING_CATALOG.long_sleeve_bodysuit.thermalWeight);
  assert.ok(CLOTHING_CATALOG.light_trousers.thermalWeight < CLOTHING_CATALOG.trousers.thermalWeight);
  assert.ok(CLOTHING_CATALOG.trousers.thermalWeight < CLOTHING_CATALOG.warm_trousers.thermalWeight);
  assert.ok(CLOTHING_CATALOG.thin_sweater.thermalWeight < CLOTHING_CATALOG.fleece_jacket.thermalWeight);
  assert.ok(CLOTHING_CATALOG.light_transition_jacket.thermalWeight < CLOTHING_CATALOG.softshell_jacket.thermalWeight);
  assert.ok(CLOTHING_CATALOG.softshell_jacket.thermalWeight < CLOTHING_CATALOG.winter_overall.thermalWeight);
  assert.ok(CLOTHING_CATALOG.socks.thermalWeight < CLOTHING_CATALOG.warm_socks_booties.thermalWeight);
  assert.ok(CLOTHING_CATALOG.thin_hat.thermalWeight < CLOTHING_CATALOG.warm_hat.thermalWeight);
  assert.ok(CLOTHING_CATALOG.light_shoes.thermalWeight < CLOTHING_CATALOG.warm_shoes.thermalWeight);
});

test('weather and UV protection remain orthogonal to thermalWeight', () => {
  assert.deepEqual(
    {
      thermalWeight:CLOTHING_CATALOG.rain_jacket.thermalWeight,
      rainProtection:CLOTHING_CATALOG.rain_jacket.rainProtection,
      windProtection:CLOTHING_CATALOG.rain_jacket.windProtection
    },
    { thermalWeight:0, rainProtection:3, windProtection:3 }
  );
  assert.equal(CLOTHING_CATALOG.sun_hat.thermalWeight,0);
  assert.equal(CLOTHING_CATALOG.sun_hat.sunCoverage,3);
  assert.equal(CLOTHING_CATALOG.stroller_rain_cover.thermalWeight,0);
  assert.equal(CLOTHING_CATALOG.stroller_rain_cover.thermalStepCredit,0);
  assert.equal(CLOTHING_CATALOG.stroller_rain_cover.rainProtection,3);
  assert.equal(CLOTHING_CATALOG.stroller_sunshade.thermalWeight,0);
  assert.equal(CLOTHING_CATALOG.stroller_sunshade.thermalStepCredit,0);
  assert.equal(CLOTHING_CATALOG.stroller_sunshade.sunCoverage,3);
  assert.equal(CLOTHING_CATALOG.weatherproof_shoes.thermalWeight,CLOTHING_CATALOG.light_shoes.thermalWeight);
  assert.ok(CLOTHING_CATALOG.weatherproof_shoes.rainProtection > CLOTHING_CATALOG.light_shoes.rainProtection);
});

test('stroller and carrier thermalStepCredit calibration is monotonic and separate from body weights', () => {
  const expectedCredits = {
    stroller_thermal_none:0,
    stroller_light_blanket:0.5,
    stroller_warm_blanket:1,
    stroller_light_footmuff:1,
    stroller_warm_footmuff:2,
    carrier_cover_none:0,
    carrier_cover_light:0.5,
    carrier_cover_warm:1
  };
  for (const [itemId, credit] of Object.entries(expectedCredits)) {
    const item = CLOTHING_CATALOG[itemId];
    assert.equal(item.thermalStepCredit,credit,itemId);
    assert.equal(item.thermalWeight,credit * 2,itemId);
    assert.equal(item.sleepWarmthWeight,null,itemId);
  }
  assertStrictlyIncreasing(['stroller_thermal_none','stroller_light_blanket','stroller_warm_blanket','stroller_warm_footmuff'],'thermalStepCredit');
  assert.equal(CLOTHING_CATALOG.stroller_warm_blanket.thermalStepCredit,CLOTHING_CATALOG.stroller_light_footmuff.thermalStepCredit);
  assertStrictlyIncreasing(['carrier_cover_none','carrier_cover_light','carrier_cover_warm'],'thermalStepCredit');
});

test('sleep uses its own sleepWarmthWeight scale rather than outdoor thermalWeight', () => {
  const bags = ['sleep_bag_none','sleep_bag_0_5','sleep_bag_1_0','sleep_bag_1_5','sleep_bag_2_5','sleep_bag_3_5'];
  assert.deepEqual(bags.map((id) => CLOTHING_CATALOG[id].sleepWarmthWeight),[0,1,2,3,4,5]);
  assertStrictlyIncreasing(bags,'sleepWarmthWeight');
  assert.equal(CLOTHING_CATALOG.sleep_bag_2_5.thermalWeight,4);
  assert.equal(CLOTHING_CATALOG.sleep_bag_3_5.thermalWeight,4);
  assert.ok(CLOTHING_CATALOG.sleep_bag_2_5.sleepWarmthWeight < CLOTHING_CATALOG.sleep_bag_3_5.sleepWarmthWeight);

  assert.deepEqual(
    [
      'sleep_under_nappy_only',
      'sleep_under_short_sleeve_bodysuit',
      'sleep_under_long_sleeve_bodysuit',
      'sleep_under_light_pajamas',
      'sleep_under_short_body_plus_light_pajamas',
      'sleep_under_long_body_plus_light_pajamas'
    ].map((id) => CLOTHING_CATALOG[id].sleepWarmthWeight),
    [0,1,2,2,3,4]
  );
});

test('car-seat safety attributes are independent of thermal class', () => {
  assert.equal(CLOTHING_CATALOG.short_sleeve_bodysuit.carSeatCompatibility,'allowed');
  assert.equal(CLOTHING_CATALOG.long_sleeve_bodysuit.carSeatCompatibility,'allowed');
  assert.equal(CLOTHING_CATALOG.fleece_jacket.carSeatCompatibility,'conditional');
  assert.equal(CLOTHING_CATALOG.softshell_jacket.carSeatCompatibility,'conditional');
  assert.equal(CLOTHING_CATALOG.transition_overall.carSeatCompatibility,'prohibited');
  assert.equal(CLOTHING_CATALOG.winter_overall.carSeatCompatibility,'prohibited');
  assert.equal(CLOTHING_CATALOG.car_blanket_over_harness.carSeatCompatibility,'prohibited');
  assert.equal(CLOTHING_CATALOG.car_blanket_over_harness.thermalWeight,2);
});

test('asset manifest metadata maps each visual group to the same fach item without changing thermal logic', () => {
  const manifestById = new Map(assetManifest.assetGroups.map((group) => [group.id,group]));
  assert.equal(manifestById.size,Object.keys(CLOTHING_CATALOG).length);

  for (const [itemId,item] of Object.entries(CLOTHING_CATALOG)) {
    assert.equal(item.styleAssetGroup,itemId,`${itemId} styleAssetGroup`);
    const group = manifestById.get(item.styleAssetGroup);
    assert.ok(group,`${itemId} missing asset group`);
    assert.equal(group.id,itemId,`${itemId} group id`);
    assert.equal(group.slot,item.slot,`${itemId} slot`);
    assert.equal(group.category,item.category,`${itemId} category`);
    assert.deepEqual([...group.situations].sort(),[...item.allowedSituations].sort(),`${itemId} situations`);
  }
});
