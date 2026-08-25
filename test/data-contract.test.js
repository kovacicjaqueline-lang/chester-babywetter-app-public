import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CLOTHING_CATALOG,
  NOTICE_CODES,
  OUTFIT_SLOTS,
  TEMPERATURE_BANDS,
  recommendOutfit,
  temperatureBandFor
} from '../src/index.js';

const NOW = '2026-08-25T14:00:00+02:00';

function baseRequest(overrides = {}) {
  return {
    requestId: 'contract', requestedAt: NOW,
    profile: { profileId: 'baby', birthDate: '2026-01-24', warmthBias: 'neutral', styleTheme: 'neutral', defaultMode: 'outdoor' },
    context: { mode: 'outdoor', plannedMinutes: 60, activity: 'normal', activitySource: 'user', sunExposure: 'shade', groundContact: 'none' },
    weather: {
      weatherId: 'w', origin: 'api', source: 'open_meteo', fetchedAt: NOW, freshness: 'fresh',
      current: { time: NOW, airTempC: 18, apparentTempC: 18, apparentTempTrusted: true, apparentTempIncludes: ['wind', 'humidity', 'sun'], windSpeedKmh: 5, windGustKmh: 10, precipProbabilityPct: 10, precipMm: 0, precipitationType: 'none', uvIndex: 1, cloudCoverPct: 20, isDay: true },
      hourly: []
    },
    session: { sessionId: 's', manualLocks: [], warmthOffset: 0 }, neckFeedback: null,
    ...overrides
  };
}

test('all calibrated outdoor temperature bands have exact boundaries', () => {
  const cases = [
    [-20, 'below_0'], [-0.001, 'below_0'], [0, '0_to_3'], [2.999, '0_to_3'],
    [3, '3_to_8'], [7.999, '3_to_8'], [8, '8_to_12'], [11.999, '8_to_12'],
    [12, '12_to_16'], [15.999, '12_to_16'], [16, '16_to_20'], [19.999, '16_to_20'],
    [20, '20_to_24'], [23.999, '20_to_24'], [24, '24_to_28'], [27.999, '24_to_28'],
    [28, '28_to_30'], [29.999, '28_to_30'], [30, '30_plus'], [45, '30_plus']
  ];
  assert.equal(TEMPERATURE_BANDS.length, 10);
  for (const [temp, expected] of cases) assert.equal(temperatureBandFor(temp).id, expected, `${temp}°C`);
});

test('catalog contains all V1 stroller accessories and carrier covers', () => {
  for (const id of [
    'stroller_light_blanket', 'stroller_warm_blanket',
    'stroller_light_footmuff', 'stroller_warm_footmuff',
    'stroller_rain_cover', 'stroller_sunshade',
    'carrier_cover_light', 'carrier_cover_warm'
  ]) assert.ok(CLOTHING_CATALOG[id], id);
});

test('catalog items implement the calibrated data-contract fields', () => {
  const required = ['itemId', 'kind', 'slot', 'category', 'labelKey', 'bodyZones', 'thermalWeight', 'thermalStepCredit', 'sleepWarmthWeight', 'tog', 'windProtection', 'rainProtection', 'sunCoverage', 'carSeatCompatibility', 'sleepSafe', 'allowedSituations', 'styleAssetGroup'];
  for (const item of Object.values(CLOTHING_CATALOG)) {
    for (const key of required) assert.ok(Object.hasOwn(item, key), `${item.itemId}.${key}`);
    assert.ok(OUTFIT_SLOTS.includes(item.slot), item.slot);
    assert.ok(Number.isInteger(item.thermalWeight) && item.thermalWeight >= 0 && item.thermalWeight <= 4, item.itemId);
  }
});

test('all normative V1 notice codes are declared', () => {
  const expected = [
    'CHECK_NECK', 'CAR_SEAT_NO_BULKY_LAYERS', 'CAR_SEAT_REMOVE_OUTER_BEFORE_HARNESS',
    'CAR_SEAT_BLANKET_OVER_HARNESS_ONLY', 'CAR_SEAT_CONDITIONAL_LAYER_CHECK_FIT',
    'CAR_CABIN_TEMPERATURE_ESTIMATED', 'SLEEP_NO_HAT', 'SLEEP_NO_LOOSE_BLANKET_OVER_BAG',
    'SLEEP_NO_WEIGHTED_PRODUCTS', 'SLEEP_USE_ROOM_TEMPERATURE', 'SLEEP_GENERIC_TOG_ORIENTATION',
    'STROLLER_DO_NOT_COVER_AIRFLOW', 'STROLLER_RAIN_COVER', 'STROLLER_SUNSHADE',
    'INFANT_UNDER_12M_AVOID_DIRECT_SUN', 'AGE_UNKNOWN_DIRECT_SUN_CONSERVATIVE_RULE',
    'UV_SHADE_AND_COVERAGE', 'WEATHER_DATA_STALE', 'WEATHER_DATA_INCOMPLETE',
    'EXTREME_COLD_CAUTION', 'EXTREME_HEAT_CAUTION', 'STRONG_WIND_CAUTION',
    'MANUAL_LOCK_OVERRIDDEN_FOR_SAFETY'
  ];
  for (const code of expected) assert.ok(NOTICE_CODES.includes(code), code);
});

test('high UV/direct sun uses light covering clothing rather than heavy insulation', () => {
  const request = baseRequest();
  request.context = { ...request.context, sunExposure: 'direct' };
  request.weather = { ...request.weather, current: { ...request.weather.current, airTempC: 29, apparentTempC: 29, uvIndex: 7 } };
  const result = recommendOutfit(request);
  const ids = result.items.map((item) => item.itemId);
  assert.ok(ids.includes('light_long_sleeve_shirt'));
  assert.ok(ids.includes('light_trousers'));
  assert.ok(ids.includes('sun_hat'));
  assert.ok(!ids.includes('thin_sweater'));
  assert.ok(!ids.includes('fleece_jacket'));
});

test('extra cold-hands metadata does not change global outfit warmth', () => {
  const request = baseRequest();
  const normal = recommendOutfit(request);
  const withColdHands = recommendOutfit({ ...request, handsFeetCold: true });
  assert.deepEqual(normal.slots.map(({ phase, slot, selected }) => [phase, slot, selected.itemId]), withColdHands.slots.map(({ phase, slot, selected }) => [phase, slot, selected.itemId]));
});

test('engine is deterministic for identical input', () => {
  const request = baseRequest();
  assert.deepEqual(recommendOutfit(request), recommendOutfit(request));
});

test('result uses structured slot/session/phase contract', () => {
  const result = recommendOutfit(baseRequest());
  assert.equal(result.requestId, 'contract');
  assert.equal(result.sessionId, 's');
  assert.ok(Array.isArray(result.phases) && result.phases.length === 1);
  assert.ok(Array.isArray(result.slots) && result.slots.length > 0);
  for (const slot of result.slots) {
    assert.ok(OUTFIT_SLOTS.includes(slot.slot));
    assert.ok(['main', 'outdoor_transition', 'in_car'].includes(slot.phase));
    assert.ok(['engine', 'manual_lock', 'safety_override'].includes(slot.selected.selectionSource));
    assert.ok(Array.isArray(slot.alternatives));
  }
});
