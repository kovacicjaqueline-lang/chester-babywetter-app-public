import test from 'node:test';
import assert from 'node:assert/strict';
import { CLOTHING_CATALOG, createSession, recommendOutfit } from '../src/index.js';

const PROFILE = Object.freeze({
  profileId:'cool_windy_baby',
  displayName:'Baby',
  birthDate:'2026-01-24',
  warmthBias:'neutral',
  styleTheme:'neutral',
  defaultMode:'outdoor'
});

function point(overrides = {}) {
  return {
    time:'2026-09-21T12:00:00+02:00',
    airTempC:15,
    apparentTempC:11,
    apparentTempTrusted:true,
    apparentTempIncludes:['wind','humidity','sun'],
    windSpeedKmh:20,
    windGustKmh:22,
    precipProbabilityPct:0,
    precipMm:0,
    precipitationType:'none',
    uvIndex:2,
    cloudCoverPct:80,
    isDay:true,
    ...overrides
  };
}

function weather(overrides = {}) {
  return {
    weatherId:'cool_windy_weather',
    location:{ locationId:'loc', label:'Testort', latitude:47.8, longitude:13, timezone:'Europe/Vienna' },
    origin:'api',
    source:'test',
    fetchedAt:'2026-09-21T10:00:00.000Z',
    freshness:'fresh',
    current:point(overrides),
    hourly:[]
  };
}

function context(mode = 'outdoor', overrides = {}) {
  return {
    mode,
    plannedMinutes:60,
    activity:'normal',
    activitySource:'user',
    sunExposure:'shade',
    groundContact:'none',
    ...(mode === 'stroller' ? { strollerState:'awake', windProtection:'none' } : {}),
    ...(mode === 'carrier' ? { placement:'over_wearer_outerwear' } : {}),
    ...overrides
  };
}

function recommend(mode = 'outdoor', contextOverrides = {}, weatherOverrides = {}) {
  return recommendOutfit({
    requestId:`cool-windy-${mode}`,
    requestedAt:'2026-09-21T10:00:00.000Z',
    profile:PROFILE,
    context:context(mode, contextOverrides),
    weather:weather(weatherOverrides),
    session:createSession('cool-windy-session'),
    neckFeedback:null
  });
}

function item(result, slot, phase = 'main') {
  return result.slots.find((entry) => entry.phase === phase && entry.slot === slot)?.selected.itemId ?? null;
}

test('15 C with 11 C apparent temperature and 20 km/h wind stays in a light normal outdoor stack', () => {
  const result = recommend();

  assert.equal(result.phases[0].thermalReferenceC,11);
  assert.equal(result.phases[0].thermalAdjustment,0);
  assert.equal(item(result,'base_torso'),'long_sleeve_bodysuit');
  assert.equal(item(result,'legs'),'trousers');
  assert.ok(['light_transition_jacket','softshell_jacket'].includes(item(result,'outer')));
  assert.equal(item(result,'head'),'thin_hat');
  assert.equal(item(result,'feet'),'socks');
  assert.equal(item(result,'hands'),null);
  assert.notEqual(item(result,'mid'),'fleece_jacket');
  assert.notEqual(item(result,'legs'),'warm_trousers');
  assert.notEqual(item(result,'feet'),'warm_socks_booties');
  assert.notEqual(item(result,'head'),'warm_hat');
  assert.ok(!result.ruleTrace.some((entry) => entry.reasonCode === 'WIND_THERMAL_EFFECT'));
});

test('trusted apparent temperature does not receive a second wind step when factor metadata is incomplete', () => {
  const result = recommend('outdoor', {}, { apparentTempIncludes:[] });

  assert.equal(result.phases[0].thermalReferenceSource,'apparent_temp');
  assert.equal(result.phases[0].thermalAdjustment,0);
  assert.equal(item(result,'feet'),'socks');
  assert.equal(item(result,'hands'),null);
  assert.ok(!result.ruleTrace.some((entry) => entry.reasonCode === 'WIND_THERMAL_EFFECT'));
});

test('moderate wind can add thin head and ear protection without warming the body', () => {
  const result = recommend('outdoor', {}, {
    airTempC:18,
    apparentTempC:18,
    apparentTempIncludes:['wind','humidity','sun']
  });

  assert.equal(item(result,'head'),'thin_hat');
  assert.equal(item(result,'feet'),'socks');
  assert.equal(item(result,'hands'),null);
  assert.ok(result.ruleTrace.some((entry) => entry.reasonCode === 'WIND_HEAD_PROTECTION_REQUIRED'));
  assert.ok((CLOTHING_CATALOG[item(result,'head')]?.windProtection ?? 0) >= 1);
});

test('normal outdoor activity does not inherit active or cold-situation insulation', () => {
  const result = recommend('outdoor');

  assert.ok(!result.ruleTrace.some((entry) => entry.reasonCode === 'ACTIVITY_COOLER'));
  assert.ok(!result.ruleTrace.some((entry) => entry.reasonCode === 'STROLLER_STATE_THERMAL_ADJUSTMENT'));
  assert.equal(item(result,'hands'),null);
});

test('stroller awake/asleep, carrier and car keep their situation-specific thermal rules', () => {
  const awake = recommend('stroller', { strollerState:'awake' });
  const asleep = recommend('stroller', { strollerState:'asleep' });
  const carrier = recommend('carrier');
  const car = recommend('car');

  assert.equal(item(awake,'stroller_thermal_accessory'),'stroller_light_footmuff');
  assert.equal(item(asleep,'stroller_thermal_accessory'),'stroller_light_footmuff');
  assert.equal(item(awake,'head'),'thin_hat');
  assert.equal(item(asleep,'head'),'thin_hat');
  assert.equal(item(carrier,'carrier_accessory'),'carrier_cover_light');
  assert.equal(item(carrier,'head'),'warm_hat');
  assert.equal(car.phases[0].phase,'in_car');
  assert.equal(item(car,'car_thermal_accessory','in_car'),'car_blanket_over_harness');
  assert.equal(item(car,'outer','in_car'),null);
});
