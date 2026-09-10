import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession, recommendOutfit } from '../src/index.js';

const PROFILE = Object.freeze({
  profileId:'outerwear_test',
  displayName:'Baby',
  birthDate:'2026-01-24',
  warmthBias:'neutral',
  styleTheme:'neutral',
  defaultMode:'outdoor'
});

function point(temp, overrides = {}) {
  return {
    time:'2026-09-10T12:00:00+02:00',
    airTempC:temp,
    apparentTempC:temp,
    apparentTempTrusted:true,
    apparentTempIncludes:['wind','humidity','sun'],
    windSpeedKmh:1,
    windGustKmh:2,
    precipProbabilityPct:18,
    precipMm:0,
    precipitationType:'none',
    uvIndex:1.9,
    cloudCoverPct:90,
    isDay:true,
    ...overrides
  };
}

function weather(temp, currentOverrides = {}, hourly = [point(temp, { time:'2026-09-10T13:00:00+02:00' })]) {
  return {
    weatherId:'outerwear_weather',
    location:{ locationId:'test', label:'Testort', latitude:47.8, longitude:13, timezone:'Europe/Vienna' },
    origin:'api',
    source:'test',
    fetchedAt:'2026-09-10T10:00:00.000Z',
    freshness:'fresh',
    current:point(temp, currentOverrides),
    hourly
  };
}

function request(context, w) {
  return {
    requestId:`outerwear-${context.mode}-${context.strollerState ?? 'none'}`,
    requestedAt:'2026-09-10T10:00:00.000Z',
    profile:PROFILE,
    context,
    weather:w,
    session:createSession('outerwear_session'),
    neckFeedback:null
  };
}

function item(result, slot) {
  return result.slots.find((entry) => entry.phase === 'main' && entry.slot === slot)?.selected.itemId ?? null;
}

function context(mode, overrides = {}) {
  return {
    mode,
    plannedMinutes:60,
    activity:mode === 'outdoor' ? 'normal' : 'normal',
    activitySource:'user',
    sunExposure:'shade',
    groundContact:'none',
    ...(mode === 'stroller' ? { strollerState:'awake', windProtection:'none' } : {}),
    ...overrides
  };
}

test('13 C, nearly windless and dry does not add an outer shell automatically', () => {
  const result = recommendOutfit(request(context('outdoor'), weather(13)));

  assert.equal(item(result, 'mid'), 'thin_sweater');
  assert.equal(item(result, 'outer'), null);
  assert.equal(item(result, 'feet'), 'socks');
});

test('current rain requires outdoor rain protection even with low precipitation probability', () => {
  const result = recommendOutfit(request(
    context('outdoor'),
    weather(13, { precipProbabilityPct:18, precipMm:2.4, precipitationType:'rain' })
  ));

  assert.equal(item(result, 'outer'), 'rain_jacket');
});

test('13 C stroller awake uses external insulation without retaining an automatic softshell', () => {
  const result = recommendOutfit(request(
    context('stroller', { strollerState:'awake', activity:'normal' }),
    weather(13)
  ));

  assert.equal(item(result, 'mid'), 'thin_sweater');
  assert.equal(item(result, 'outer'), null);
  assert.equal(item(result, 'stroller_thermal_accessory'), 'stroller_light_footmuff');
});

test('13 C stroller asleep keeps the warmer state without adding a body shell', () => {
  const result = recommendOutfit(request(
    context('stroller', { strollerState:'asleep', activity:'normal' }),
    weather(13)
  ));

  assert.equal(item(result, 'outer'), null);
  assert.equal(item(result, 'stroller_thermal_accessory'), 'stroller_light_footmuff');
  assert.equal(result.phases[0].thermalAdjustment, 0);
});

test('colder weather still receives a functional warm outer layer', () => {
  const result = recommendOutfit(request(context('outdoor'), weather(9)));

  assert.equal(item(result, 'outer'), 'softshell_jacket');
});

test('strong wind still adds functional wind protection at 13 C', () => {
  const result = recommendOutfit(request(
    context('outdoor'),
    weather(13, { windSpeedKmh:35, windGustKmh:42 })
  ));

  assert.equal(item(result, 'outer'), 'softshell_jacket');
});

test('low precipitation probability without current rain does not add a rain element', () => {
  const result = recommendOutfit(request(
    context('outdoor'),
    weather(13, { precipProbabilityPct:18, precipMm:0, precipitationType:'none' })
  ));

  assert.notEqual(item(result, 'outer'), 'rain_jacket');
});

test('stroller rain cover handles current rain without a duplicate baby rain jacket', () => {
  const result = recommendOutfit(request(
    context('stroller', { strollerState:'awake', activity:'normal' }),
    weather(13, { precipProbabilityPct:18, precipMm:2.4, precipitationType:'rain' })
  ));

  assert.equal(item(result, 'stroller_weather_accessory'), 'stroller_rain_cover');
  assert.notEqual(item(result, 'outer'), 'rain_jacket');
});
