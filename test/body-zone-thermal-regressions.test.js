import test from 'node:test';
import assert from 'node:assert/strict';
import { CLOTHING_CATALOG, createSession, recommendOutfit } from '../src/index.js';

const PROFILE = Object.freeze({
  profileId:'body-zone-regression',
  displayName:'Baby',
  birthDate:'2026-01-24',
  warmthBias:'neutral',
  styleTheme:'neutral',
  defaultMode:'outdoor'
});

function weather(temp, overrides = {}) {
  return {
    weatherId:'body-zone-weather',
    location:{ locationId:'test', label:'Testort', latitude:47.8, longitude:13, timezone:'Europe/Vienna' },
    origin:'api', source:'test', fetchedAt:'2026-09-21T10:00:00.000Z', freshness:'fresh',
    current:{
      time:'2026-09-21T12:00:00+02:00', airTempC:temp, apparentTempC:null,
      apparentTempTrusted:false, apparentTempIncludes:[], windSpeedKmh:5, windGustKmh:8,
      precipProbabilityPct:0, precipMm:0, precipitationType:'none', uvIndex:1,
      cloudCoverPct:80, isDay:true, ...overrides
    },
    hourly:[]
  };
}

function recommend(mode, temp, context = {}, session = createSession('body-zone-session')) {
  return recommendOutfit({
    requestId:`body-zone-${mode}-${temp}`,
    requestedAt:'2026-09-21T10:00:00.000Z',
    profile:PROFILE,
    context:{
      mode, plannedMinutes:60, activity:'normal', activitySource:'user',
      sunExposure:'shade', groundContact:'none', ...context
    },
    weather:weather(temp), session, neckFeedback:null
  });
}

function item(result, slot, phase = 'main') {
  return result.slots.find((entry) => entry.phase === phase && entry.slot === slot)?.selected.itemId ?? null;
}

test('tights declare foot coverage while footed sleep layers remain sleep-only', () => {
  assert.deepEqual(CLOTHING_CATALOG.tights.bodyZones, ['legs','feet']);
  assert.equal(CLOTHING_CATALOG.tights.thermalWeightByZone.feet, 1);
  assert.deepEqual(CLOTHING_CATALOG.sleep_under_light_pajamas.bodyZones, ['torso','arms','legs']);
  assert.deepEqual(CLOTHING_CATALOG.sleep_under_light_pajamas.allowedSituations, ['sleep']);
});

test('stroller footmuff credit is confined to covered body zones', () => {
  const result = recommend('stroller', 10, { strollerState:'awake', windProtection:'none' });

  assert.equal(item(result, 'stroller_thermal_accessory'), 'stroller_light_footmuff');
  assert.equal(item(result, 'legs'), 'light_trousers');
  assert.equal(item(result, 'feet'), 'socks');
  assert.equal(item(result, 'head'), 'thin_hat');
  assert.equal(item(result, 'hands'), null);
  assert.ok(!result.ruleTrace.some((entry) =>
    entry.reasonCode === 'THERMAL_REBALANCE' && ['head','hands'].includes(entry.target)));
});

test('stroller blanket does not turn a covered-zone credit into a torso or head downgrade', () => {
  const result = recommend('stroller', 14, { strollerState:'awake', windProtection:'none' });

  assert.equal(item(result, 'stroller_thermal_accessory'), 'stroller_light_blanket');
  assert.equal(item(result, 'base_torso'), 'long_sleeve_bodysuit');
  assert.equal(item(result, 'mid'), 'thin_sweater');
  assert.equal(item(result, 'legs'), 'trousers');
  assert.equal(item(result, 'head'), 'thin_hat');
  assert.equal(item(result, 'hands'), null);
});

test('carrier cover cools covered legs while carrier body heat does not remove leg coverage without a cover', () => {
  const covered = recommend('carrier', 10, { placement:'over_wearer_outerwear' });
  const uncovered = recommend('carrier', 16, { placement:'over_wearer_outerwear' });

  assert.equal(item(covered, 'carrier_accessory'), 'carrier_cover_light');
  assert.equal(item(covered, 'legs'), 'light_trousers');
  assert.equal(item(covered, 'feet'), 'warm_socks_booties');
  assert.equal(item(uncovered, 'carrier_accessory'), 'carrier_cover_none');
  assert.equal(item(uncovered, 'legs'), 'trousers');
});

test('car blanket remains an over-harness accessory and never becomes a body-layer replacement', () => {
  const result = recommend('car', 7);

  assert.equal(item(result, 'car_thermal_accessory', 'in_car'), 'car_warm_blanket_over_harness');
  assert.equal(item(result, 'outer', 'in_car'), null);
  assert.notEqual(item(result, 'base_torso', 'in_car'), null);
  assert.ok(result.slots
    .filter((entry) => entry.phase === 'in_car' && entry.slot === 'car_thermal_accessory')
    .every((entry) => entry.selected.wearPosition === 'over_harness'));
});
