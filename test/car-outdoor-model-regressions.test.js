import test from 'node:test';
import assert from 'node:assert/strict';
import { CLOTHING_CATALOG, createSession, lockItem, recommendOutfit } from '../src/index.js';

const profile = {
  profileId:'baby_car_test', displayName:'Baby', birthDate:'2026-01-24', mobilityStage:'low_mobility', warmthBias:'neutral', styleTheme:'neutral', defaultMode:'car',
  createdAt:'2026-08-27T10:00:00.000Z', updatedAt:'2026-08-27T10:00:00.000Z'
};

function point(temp, overrides = {}) {
  return {
    time:'2026-08-27T12:00:00.000Z', airTempC:temp, apparentTempC:null, apparentTempTrusted:false, apparentTempIncludes:[],
    windSpeedKmh:null, windGustKmh:null, precipProbabilityPct:null, precipMm:null, precipitationType:null, uvIndex:null, cloudCoverPct:null, isDay:true,
    ...overrides
  };
}

function weather(temp, overrides = {}) {
  return {
    weatherId:'weather_car_test', location:{ locationId:'loc', label:'Testort', latitude:47.8, longitude:13, timezone:'Europe/Vienna' },
    origin:'api', source:'test', fetchedAt:'2026-08-27T12:00:00.000Z', freshness:'fresh', current:point(temp), hourly:[], ...overrides
  };
}

function recommend(temp, { context = { mode:'car' }, currentWeather = weather(temp), session = createSession('car_session') } = {}) {
  return recommendOutfit({ requestId:'car_test', requestedAt:'2026-08-27T12:00:00.000Z', profile, context, weather:currentWeather, session, neckFeedback:null });
}

const accessory = (result) => result.slots.find((entry) => entry.phase === 'in_car' && entry.slot === 'car_thermal_accessory');
const codes = (result) => result.notices.map((notice) => notice.code);

test('car uses current outdoor thermal reference and emits only in_car', () => {
  const result = recommend(14, { currentWeather:weather(14, { current:point(14, { apparentTempC:10, apparentTempTrusted:true, apparentTempIncludes:['wind'] }) }) });
  assert.equal(result.status, 'ready');
  assert.deepEqual(result.phases.map((phase) => phase.phase), ['in_car']);
  assert.equal(result.phases[0].thermalReferenceC, 10);
  assert.equal(result.phases[0].thermalReferenceSource, 'apparent_temp');
  assert.equal(result.dataQuality.usedEstimatedCabinTemperature, false);
  assert.ok(!codes(result).includes('CAR_CABIN_TEMPERATURE_ESTIMATED'));
});

test('legacy car context fields are ignored by the engine', () => {
  const context = { mode:'car', cabinTempC:35, cabinTempSource:'measured', includeOutdoorTransition:true, outsideTransitionMinutes:20 };
  const result = recommend(7, { context });
  assert.deepEqual(result.phases.map((phase) => phase.phase), ['in_car']);
  assert.equal(result.phases[0].thermalReferenceC, 7);
  assert.equal(accessory(result).selected.itemId, 'car_warm_blanket_over_harness');
});

test('car blocks without current outdoor temperature', () => {
  const result = recommend(null, { currentWeather:null });
  assert.equal(result.status, 'blocked');
  assert.ok(result.dataQuality.missingFields.includes('weather.current.airTempC'));
  assert.ok(codes(result).includes('WEATHER_DATA_INCOMPLETE'));
});

test('car accessory thresholds follow existing 12 and 8 degree baseline boundaries', () => {
  for (const [temp, itemId] of [[12,'car_thermal_none'],[11.9,'car_blanket_over_harness'],[8,'car_blanket_over_harness'],[7.9,'car_warm_blanket_over_harness']]) {
    const result = recommend(temp);
    assert.equal(accessory(result).selected.itemId, itemId, `${temp} °C`);
    assert.equal(accessory(result).selected.wearPosition, 'over_harness');
    assert.equal(codes(result).includes('CAR_SEAT_REMOVE_COVER_WHEN_WARM'), itemId !== 'car_thermal_none');
  }
});

test('body layers stay harness-safe and blankets are only over harness', () => {
  const result = recommend(-2);
  assert.ok(codes(result).includes('CAR_SEAT_NO_BULKY_LAYERS'));
  assert.ok(codes(result).includes('CAR_SEAT_BLANKET_OVER_HARNESS_ONLY'));
  for (const entry of result.slots.filter((slot) => slot.slot !== 'car_thermal_accessory')) {
    assert.equal(entry.selected.wearPosition, 'under_harness');
    assert.notEqual(CLOTHING_CATALOG[entry.selected.itemId]?.carSeatCompatibility, 'prohibited');
  }
});

test('unsafe body lock is overridden while accessory lock stays over harness', () => {
  let session = lockItem(createSession('car_lock'), { phase:'in_car', slot:'outer', itemId:'winter_overall' });
  session = lockItem(session, { phase:'in_car', slot:'car_thermal_accessory', itemId:'car_blanket_over_harness' });
  const result = recommend(2, { session });
  assert.ok(codes(result).includes('MANUAL_LOCK_OVERRIDDEN_FOR_SAFETY'));
  assert.ok(!result.slots.some((entry) => entry.selected.itemId === 'winter_overall'));
  assert.equal(accessory(result).selected.itemId, 'car_blanket_over_harness');
  assert.equal(accessory(result).selected.wearPosition, 'over_harness');
});
