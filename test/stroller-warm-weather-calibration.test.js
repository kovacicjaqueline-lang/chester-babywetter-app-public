import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession, recommendOutfit } from '../src/index.js';

const PROFILE = Object.freeze({
  profileId:'baby_stroller_warm',
  displayName:'Baby',
  birthDate:'2026-01-24',
  mobilityStage:'crawling',
  warmthBias:'neutral',
  styleTheme:'neutral',
  defaultMode:'stroller',
  createdAt:'2026-08-25T10:00:00.000Z',
  updatedAt:'2026-08-25T10:00:00.000Z'
});

function point(temp, overrides={}) {
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

function weather(temp, overrides={}) {
  return {
    weatherId:'weather_stroller_warm',
    location:{ locationId:'loc', label:'Testort', latitude:47.8, longitude:13, timezone:'Europe/Vienna' },
    origin:'api',
    source:'test',
    fetchedAt:'2026-08-25T12:00:00.000Z',
    freshness:'fresh',
    current:point(temp, overrides),
    hourly:[]
  };
}

function stroller(overrides={}) {
  return {
    mode:'stroller',
    plannedMinutes:60,
    strollerState:'awake',
    activity:'normal',
    activitySource:'user',
    sunExposure:'shade',
    windProtection:'none',
    ...overrides
  };
}

function recommend(context, w) {
  return recommendOutfit({
    requestId:'req_stroller_warm',
    requestedAt:'2026-08-25T12:00:00.000Z',
    profile:{...PROFILE},
    context,
    weather:w,
    session:createSession('session_stroller_warm'),
    neckFeedback:null
  });
}

function item(result, slot) {
  return result.slots.find((entry) => entry.phase === 'main' && entry.slot === slot)?.selected.itemId ?? null;
}

function body(result) {
  const bodySlots = new Set(['base_torso','legs','mid','outer','feet','head','hands']);
  return Object.fromEntries(
    result.slots
      .filter((entry) => entry.phase === 'main' && bodySlots.has(entry.slot))
      .map((entry) => [entry.slot, entry.selected.itemId])
      .sort(([a],[b]) => a.localeCompare(b))
  );
}

test('stroller does not add state-based body insulation at 20 C or warmer', () => {
  for (const temp of [20,23,24,26,28,30]) {
    const w = weather(temp);
    const awake = recommend(stroller({ strollerState:'awake', activity:'normal' }), w);
    const asleep = recommend(stroller({ strollerState:'asleep', activity:'normal' }), w);
    const active = recommend(stroller({ strollerState:'awake', activity:'active' }), w);

    assert.deepEqual(body(asleep), body(awake), `asleep body at ${temp} C`);
    assert.equal(awake.phases[0].thermalAdjustment,0);
    assert.equal(asleep.phases[0].thermalAdjustment,0);
    assert.equal(active.phases[0].thermalAdjustment,-0.5);
    assert.equal(item(awake,'stroller_thermal_accessory'),'stroller_thermal_none');
    assert.equal(item(asleep,'stroller_thermal_accessory'),'stroller_thermal_none');
    assert.equal(item(awake,'mid'),null);
    assert.equal(item(asleep,'mid'),null);
    if (temp >= 24) {
      assert.equal(item(awake,'outer'),null);
      assert.equal(item(asleep,'outer'),null);
    }
  }
});

test('very active stroller can be lighter than awake in warm weather', () => {
  const mildWeather = weather(23);
  const awakeMild = recommend(stroller({ strollerState:'awake', activity:'normal' }), mildWeather);
  const activeMild = recommend(stroller({ strollerState:'awake', activity:'active' }), mildWeather);
  assert.equal(item(awakeMild,'feet'),'socks');
  assert.equal(item(activeMild,'feet'),null);

  const warmWeather = weather(26);
  const awakeWarm = recommend(stroller({ strollerState:'awake', activity:'normal' }), warmWeather);
  const activeWarm = recommend(stroller({ strollerState:'awake', activity:'active' }), warmWeather);
  assert.equal(item(awakeWarm,'legs'),'light_trousers');
  assert.equal(item(activeWarm,'legs'),null);
});

test('sleeping stroller at 18 to below 20 C uses a removable light blanket without warming body layers', () => {
  const w = weather(19);
  const awake = recommend(stroller({ strollerState:'awake', activity:'normal' }), w);
  const asleep = recommend(stroller({ strollerState:'asleep', activity:'normal' }), w);

  assert.deepEqual(body(asleep), body(awake));
  assert.equal(item(awake,'stroller_thermal_accessory'),'stroller_thermal_none');
  assert.equal(item(asleep,'stroller_thermal_accessory'),'stroller_light_blanket');
});

test('partial stroller wind shelter does not reuse a colder wind-including apparent temperature', () => {
  const w = weather(26, {
    apparentTempC:23,
    apparentTempTrusted:true,
    apparentTempIncludes:['wind','humidity','sun'],
    windSpeedKmh:17,
    windGustKmh:24
  });

  const sheltered = recommend(stroller({ windProtection:'partial' }), w);
  const exposed = recommend(stroller({ windProtection:'none' }), w);

  assert.equal(sheltered.phases[0].thermalReferenceC,26);
  assert.equal(sheltered.phases[0].thermalReferenceSource,'air_temp');
  assert.ok(sheltered.ruleTrace.some((entry) => entry.reasonCode === 'STROLLER_WIND_SHELTER_AIR_REFERENCE'));
  assert.equal(item(sheltered,'base_torso'),'short_sleeve_bodysuit');
  assert.equal(item(sheltered,'legs'),'light_trousers');
  assert.equal(item(sheltered,'feet'),null);

  assert.equal(exposed.phases[0].thermalReferenceC,23);
  assert.equal(exposed.phases[0].thermalReferenceSource,'apparent_temp');
  assert.equal(item(exposed,'base_torso'),'long_sleeve_bodysuit');
  assert.equal(item(exposed,'feet'),'socks');
});

test('26 C air / 23 C apparent / UV 4.5 stroller case keeps UV protection without thermal over-insulation', () => {
  const w = weather(26, {
    apparentTempC:23,
    apparentTempTrusted:true,
    apparentTempIncludes:['wind','humidity','sun'],
    windSpeedKmh:17,
    windGustKmh:24,
    uvIndex:4.5
  });
  const result = recommend(stroller({ windProtection:'partial', sunExposure:'unknown' }), w);

  assert.equal(result.phases[0].thermalReferenceC,26);
  assert.equal(result.phases[0].thermalAdjustment,0);
  assert.equal(item(result,'base_torso'),'light_long_sleeve_shirt');
  assert.equal(item(result,'legs'),'light_trousers');
  assert.equal(item(result,'feet'),null);
  assert.equal(item(result,'mid'),null);
  assert.equal(item(result,'outer'),null);
  assert.equal(item(result,'stroller_thermal_accessory'),'stroller_thermal_none');
  assert.equal(item(result,'stroller_weather_accessory'),'stroller_sunshade');
  assert.equal(item(result,'head'),'sun_hat');
});

test('stroller keeps a warmer trusted apparent temperature even with wind shelter', () => {
  const w = weather(26, {
    apparentTempC:29,
    apparentTempTrusted:true,
    apparentTempIncludes:['wind','humidity','sun'],
    windSpeedKmh:17
  });
  const result = recommend(stroller({ windProtection:'good' }), w);
  assert.equal(result.phases[0].thermalReferenceC,29);
  assert.equal(result.phases[0].thermalReferenceSource,'apparent_temp');
});

test('warm stroller wind protection stays functional without an insulating mid layer', () => {
  const w = weather(26, {
    apparentTempC:22,
    apparentTempTrusted:true,
    apparentTempIncludes:['wind'],
    windSpeedKmh:35,
    windGustKmh:42
  });
  const result = recommend(stroller({ windProtection:'partial' }), w);
  assert.equal(result.phases[0].thermalReferenceC,26);
  assert.equal(item(result,'mid'),null);
  assert.notEqual(item(result,'outer'),null);
});