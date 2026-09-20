import test from 'node:test';
import assert from 'node:assert/strict';
import { CLOTHING_CATALOG, createSession, recommendOutfit } from '../src/index.js';

const REQUESTED_AT = '2026-08-25T12:00:00.000Z';
const BODY_SLOTS = new Set(['base_torso','legs','mid','outer','feet','head','hands']);

function profile(overrides = {}) {
  return {
    profileId:'final_review_fixes',
    displayName:'Baby',
    birthDate:'2026-01-24',
    mobilityStage:'low_mobility',
    warmthBias:'neutral',
    styleTheme:'neutral',
    defaultMode:'outdoor',
    createdAt:REQUESTED_AT,
    updatedAt:REQUESTED_AT,
    ...overrides
  };
}

function point(temp, overrides = {}) {
  return {
    time:'2026-08-25T14:00:00+02:00',
    airTempC:temp,
    apparentTempC:null,
    apparentTempTrusted:false,
    apparentTempIncludes:[],
    windSpeedKmh:5,
    windGustKmh:8,
    precipProbabilityPct:0,
    precipMm:0,
    precipitationType:'none',
    uvIndex:1,
    cloudCoverPct:20,
    isDay:true,
    ...overrides
  };
}

function weather(temp, overrides = {}) {
  return {
    weatherId:'final_review_weather',
    location:{ locationId:'loc', label:'Testort', latitude:47.8, longitude:13, timezone:'Europe/Vienna' },
    origin:'api',
    source:'test',
    fetchedAt:REQUESTED_AT,
    freshness:'fresh',
    current:point(temp, overrides.current ?? {}),
    hourly:overrides.hourly ?? []
  };
}

function request(context, { p = profile(), w = context.mode === 'sleep' ? null : weather(18) } = {}) {
  return {
    requestId:'final_review_request',
    requestedAt:REQUESTED_AT,
    profile:p,
    context,
    weather:w,
    session:createSession('final_review_session'),
    neckFeedback:null
  };
}

function itemId(result, slot, phase = result.mode === 'car' ? 'in_car' : 'main') {
  return result.slots.find((entry) => entry.phase === phase && entry.slot === slot)?.selected.itemId ?? null;
}

function noticeCodes(result) {
  return new Set(result.notices.map((notice) => notice.code));
}

function carBodyWarmth(result) {
  return result.slots
    .filter((entry) => entry.phase === 'in_car' && BODY_SLOTS.has(entry.slot))
    .reduce((sum, entry) => sum + (CLOTHING_CATALOG[entry.selected.itemId]?.thermalWeight ?? 0), 0);
}

test('sleep thresholds follow the same whole-degree value shown in the UI without mutating input precision', () => {
  const context = { mode:'sleep', roomTempC:19.5 };
  const result = recommendOutfit(request(context));

  assert.equal(context.roomTempC,19.5);
  assert.equal(result.phases[0].thermalReferenceC,20);
  assert.equal(result.phases[0].thermalBand,'20_to_22');
  assert.equal(itemId(result,'sleep_bag'),'sleep_bag_1_5');
  assert.equal(itemId(result,'sleep_underlayer'),'sleep_under_short_sleeve_bodysuit');
});

test('car blanket thresholds follow the rounded visible outdoor temperature', () => {
  const cases = [
    [11.4,11,'car_blanket_over_harness'],
    [11.5,12,'car_thermal_none'],
    [7.4,7,'car_warm_blanket_over_harness'],
    [7.5,8,'car_blanket_over_harness']
  ];

  for (const [rawTemp, visibleTemp, expectedAccessory] of cases) {
    const w = weather(rawTemp);
    const result = recommendOutfit(request({ mode:'car' }, { w }));
    assert.equal(w.current.airTempC,rawTemp);
    assert.equal(result.phases[0].thermalReferenceC,visibleTemp,`${rawTemp} °C`);
    assert.equal(itemId(result,'car_thermal_accessory'),expectedAccessory,`${rawTemp} °C`);
  }
});

test('UV protection uses the same rounded whole-number UV value shown in the UI', () => {
  const context = { mode:'outdoor', plannedMinutes:0, activity:'normal', activitySource:'user', sunExposure:'partial', groundContact:'none' };
  const below = recommendOutfit(request(context, { w:weather(24, { current:{ uvIndex:2.4 } }) }));
  const thresholdWeather = weather(24, { current:{ uvIndex:2.5 } });
  const atThreshold = recommendOutfit(request(context, { w:thresholdWeather }));

  assert.equal(thresholdWeather.current.uvIndex,2.5);
  assert.ok(!noticeCodes(below).has('UV_SHADE_AND_COVERAGE'));
  assert.ok(noticeCodes(atThreshold).has('UV_SHADE_AND_COVERAGE'));
  assert.equal(itemId(atThreshold,'head'),'sun_hat');
});

test('car exposes extreme-temperature cautions on the same rounded visible boundary', () => {
  const nearZero = recommendOutfit(request({ mode:'car' }, { w:weather(-0.4) }));
  const belowZero = recommendOutfit(request({ mode:'car' }, { w:weather(-0.6) }));
  const heat = recommendOutfit(request({ mode:'car' }, { w:weather(29.5) }));

  assert.equal(nearZero.phases[0].thermalReferenceC,0);
  assert.ok(!noticeCodes(nearZero).has('EXTREME_COLD_CAUTION'));
  assert.equal(belowZero.phases[0].thermalReferenceC,-1);
  assert.ok(noticeCodes(belowZero).has('EXTREME_COLD_CAUTION'));
  assert.equal(heat.phases[0].thermalReferenceC,30);
  assert.ok(noticeCodes(heat).has('EXTREME_HEAT_CAUTION'));
});

test('young-infant and runs-cool half-step adjustments both survive car-seat safety normalization', () => {
  const oneMonthNeutral = recommendOutfit(request(
    { mode:'car' },
    { p:profile({ birthDate:'2026-07-24', warmthBias:'neutral' }), w:weather(18) }
  ));
  const oneMonthRunsCool = recommendOutfit(request(
    { mode:'car' },
    { p:profile({ birthDate:'2026-07-24', warmthBias:'runs_cool' }), w:weather(18) }
  ));

  assert.equal(oneMonthNeutral.phases[0].thermalAdjustment,0.5);
  assert.equal(oneMonthRunsCool.phases[0].thermalAdjustment,1);
  assert.ok(carBodyWarmth(oneMonthRunsCool) > carBodyWarmth(oneMonthNeutral));
  assert.ok(oneMonthRunsCool.ruleTrace.some((entry) => entry.ruleId === 'profile.age' && entry.delta === 0.5));
  assert.ok(oneMonthRunsCool.ruleTrace.some((entry) => entry.ruleId === 'profile.warmth_bias' && entry.delta === 0.5));
  for (const entry of oneMonthRunsCool.slots.filter((slot) => slot.phase === 'in_car' && BODY_SLOTS.has(slot.slot))) {
    assert.equal(CLOTHING_CATALOG[entry.selected.itemId]?.carSeatCompatibility,'allowed',entry.selected.itemId);
  }
});
