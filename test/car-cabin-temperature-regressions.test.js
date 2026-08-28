import test from 'node:test';
import assert from 'node:assert/strict';
import { CLOTHING_CATALOG, createSession, recommendOutfit } from '../src/index.js';

const profile = {
  profileId: 'baby_car_test',
  displayName: 'Baby',
  birthDate: '2026-01-24',
  warmthBias: 'neutral',
  styleTheme: 'neutral',
  defaultMode: 'car',
  createdAt: '2026-08-27T10:00:00.000Z',
  updatedAt: '2026-08-27T10:00:00.000Z'
};

function carContext(overrides = {}) {
  return {
    mode: 'car',
    plannedMinutes: 30,
    includeOutdoorTransition: false,
    outsideTransitionMinutes: 5,
    cabinTempC: 20,
    cabinTempSource: 'estimated',
    ...overrides
  };
}

function weatherPoint(temp, time = '2026-08-27T14:00:00+02:00') {
  return {
    time,
    airTempC: temp,
    apparentTempC: null,
    apparentTempTrusted: false,
    apparentTempIncludes: [],
    windSpeedKmh: 5,
    windGustKmh: 8,
    precipProbabilityPct: 0,
    precipMm: 0,
    precipitationType: 'none',
    uvIndex: 1,
    cloudCoverPct: 20,
    isDay: true
  };
}

function weather(temp) {
  return {
    weatherId: 'weather_car_test',
    location: { locationId: 'loc', label: 'Testort', latitude: 47.8, longitude: 13, timezone: 'Europe/Vienna' },
    origin: 'api',
    source: 'test',
    fetchedAt: '2026-08-27T12:00:00.000Z',
    freshness: 'fresh',
    current: weatherPoint(temp),
    hourly: [weatherPoint(temp, '2026-08-27T15:00:00+02:00')]
  };
}

function recommend(context, currentWeather = null) {
  return recommendOutfit({
    requestId: 'car_source_test',
    requestedAt: '2026-08-27T12:00:00.000Z',
    profile,
    context,
    weather: currentWeather,
    session: createSession('car_source_session'),
    neckFeedback: null
  });
}

function noticeCodes(result) {
  return result.notices.map((notice) => notice.code);
}

function inCarItems(result) {
  return result.slots.filter((slot) => slot.phase === 'in_car').map((slot) => ({
    itemId: slot.selected.itemId,
    wearPosition: slot.selected.wearPosition
  }));
}

test('manual, measured and estimated cabin sources preserve source semantics', () => {
  const estimated = recommend(carContext({ cabinTempSource: 'estimated' }));
  const manual = recommend(carContext({ cabinTempSource: 'manual' }));
  const measured = recommend(carContext({ cabinTempSource: 'measured' }));

  assert.equal(estimated.status, 'ready_with_estimate');
  assert.equal(estimated.dataQuality.usedEstimatedCabinTemperature, true);
  assert.ok(noticeCodes(estimated).includes('CAR_CABIN_TEMPERATURE_ESTIMATED'));

  for (const known of [manual, measured]) {
    assert.equal(known.status, 'ready');
    assert.equal(known.dataQuality.usedEstimatedCabinTemperature, false);
    assert.ok(!noticeCodes(known).includes('CAR_CABIN_TEMPERATURE_ESTIMATED'));
  }

  assert.deepEqual(inCarItems(estimated), inCarItems(manual));
  assert.deepEqual(inCarItems(estimated), inCarItems(measured));
});

test('estimated cabin temperature never weakens harness safety rules', () => {
  for (const source of ['estimated', 'manual', 'measured']) {
    const result = recommend(carContext({ cabinTempC: 5, cabinTempSource: source }));
    assert.ok(noticeCodes(result).includes('CAR_SEAT_NO_BULKY_LAYERS'));
    assert.ok(noticeCodes(result).includes('CAR_SEAT_BLANKET_OVER_HARNESS_ONLY'));
    assert.ok(!result.slots.some((slot) =>
      slot.phase === 'in_car'
      && (slot.selected.wearPosition === 'under_harness' || slot.selected.wearPosition === 'on_body')
      && CLOTHING_CATALOG[slot.selected.itemId]?.carSeatCompatibility === 'prohibited'
    ));
  }
});

test('outdoor transition uses weather while in-car uses the cabin estimate', () => {
  const result = recommend(
    carContext({ includeOutdoorTransition: true, cabinTempC: 20, cabinTempSource: 'estimated' }),
    weather(5)
  );
  const transition = result.phases.find((phase) => phase.phase === 'outdoor_transition');
  const inCar = result.phases.find((phase) => phase.phase === 'in_car');

  assert.equal(transition?.thermalReferenceC, 5);
  assert.equal(transition?.thermalReferenceSource, 'air_temp');
  assert.equal(inCar?.thermalReferenceC, 20);
  assert.equal(inCar?.thermalReferenceSource, 'cabin_temp');
  assert.ok(noticeCodes(result).includes('CAR_CABIN_TEMPERATURE_ESTIMATED'));
  assert.ok(noticeCodes(result).includes('CAR_SEAT_REMOVE_OUTER_BEFORE_HARNESS'));
  assert.ok(!result.slots.some((slot) =>
    slot.phase === 'in_car' && CLOTHING_CATALOG[slot.selected.itemId]?.carSeatCompatibility === 'prohibited'
  ));
});
