import test from 'node:test';
import assert from 'node:assert/strict';
import { CLOTHING_CATALOG, recommendOutfit, temperatureBandFor } from '../src/index.js';

const BASE_PROFILE = Object.freeze({
  profileId: 'baby_test',
  displayName: 'Testbaby',
  birthDate: '2026-01-24',
  warmthBias: 'neutral',
  styleTheme: 'neutral',
  defaultActivity: 'normal',
  sleepBagInventory: [],
  createdAt: '2026-08-25T10:00:00.000Z',
  updatedAt: '2026-08-25T10:00:00.000Z'
});

function profile(overrides = {}) {
  return { ...BASE_PROFILE, ...overrides };
}

function weather(temp, overrides = {}) {
  return {
    snapshotId: 'weather_test',
    location: {
      locationId: 'loc',
      label: 'Testort',
      latitude: 47.8,
      longitude: 13.0,
      timezone: 'Europe/Vienna'
    },
    origin: 'api',
    source: 'test',
    observedAt: '2026-08-25T10:00:00.000Z',
    fetchedAt: '2026-08-25T10:01:00.000Z',
    freshness: 'fresh',
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
    cloudCoverPct: 30,
    isDay: true,
    ...overrides
  };
}

function outdoor(overrides = {}) {
  return {
    mode: 'outdoor',
    activity: 'normal',
    plannedMinutes: 60,
    sunExposure: 'shade',
    ...overrides
  };
}

function stroller(overrides = {}) {
  return {
    mode: 'stroller',
    activity: 'passive',
    plannedMinutes: 60,
    sunExposure: 'shade',
    windProtection: 'none',
    externalInsulation: 'none',
    ...overrides
  };
}

function carrier(overrides = {}) {
  return {
    mode: 'carrier',
    activity: 'passive',
    plannedMinutes: 60,
    sunExposure: 'shade',
    carrierCover: 'none',
    wearerOuterLayerCoversBaby: false,
    ...overrides
  };
}

function ids(result, phase = 'main') {
  return result.items.filter((item) => item.phase === phase).map((item) => item.itemId);
}

function noticeCodes(result) {
  return result.notices.map((notice) => notice.code);
}

test('engine is deterministic and pure for identical input', () => {
  const input = { weather: weather(18), profile: profile(), situation: outdoor() };
  assert.deepEqual(recommendOutfit(input), recommendOutfit(input));
});

test('temperature band boundaries are exact and exhaustive', () => {
  const cases = [
    [-20, 'below_3'],
    [2.999, 'below_3'],
    [3, '3_to_8'],
    [7.999, '3_to_8'],
    [8, '8_to_12'],
    [11.999, '8_to_12'],
    [12, '12_to_16'],
    [15.999, '12_to_16'],
    [16, '16_to_20'],
    [19.999, '16_to_20'],
    [20, '20_to_24'],
    [23.999, '20_to_24'],
    [24, '24_to_28'],
    [27.999, '24_to_28'],
    [28, '28_plus'],
    [45, '28_plus']
  ];
  for (const [value, expected] of cases) {
    assert.equal(temperatureBandFor(value).id, expected, `${value} °C`);
  }
});

test('trusted apparent temperature is used as thermal reference', () => {
  const result = recommendOutfit({
    weather: weather(20, { apparentTempC: 16, apparentTempTrusted: true, apparentTempIncludes: ['wind'], windSpeedKmh: 22 }),
    profile: profile(),
    situation: outdoor()
  });
  assert.equal(result.phases[0].thermalReferenceC, 16);
  assert.equal(result.phases[0].thermalReferenceSource, 'apparent_temp');
  assert.equal(result.phases[0].thermalAdjustment, 0, 'wind must not be thermally counted twice');
  assert.ok(ids(result).includes('softshell_jacket'), 'wind protection still applies');
});

test('untrusted apparent temperature is ignored and wind can add a thermal step', () => {
  const result = recommendOutfit({
    weather: weather(22, { apparentTempC: 17, apparentTempTrusted: false, windSpeedKmh: 20 }),
    profile: profile(),
    situation: outdoor()
  });
  assert.equal(result.phases[0].thermalReferenceC, 22);
  assert.equal(result.phases[0].thermalReferenceSource, 'air_temp');
  assert.equal(result.phases[0].thermalAdjustment, 1);
});

test('same temperature produces warmer stroller and lighter carrier recommendation', () => {
  const snapshot = weather(18);
  const inStroller = recommendOutfit({ weather: snapshot, profile: profile(), situation: stroller() });
  const inCarrier = recommendOutfit({ weather: snapshot, profile: profile(), situation: carrier() });

  assert.equal(inStroller.phases[0].thermalAdjustment, 1);
  assert.equal(inStroller.phases[0].effectiveThermalBand, '12_to_16');
  assert.equal(inCarrier.phases[0].thermalAdjustment, -1);
  assert.equal(inCarrier.phases[0].effectiveThermalBand, '20_to_24');
  assert.ok(ids(inStroller).includes('softshell_jacket'));
  assert.ok(!ids(inCarrier).includes('softshell_jacket'));
});

test('light stroller footmuff supplies external insulation instead of stacking another body step', () => {
  const result = recommendOutfit({
    weather: weather(18),
    profile: profile(),
    situation: stroller({ externalInsulation: 'light' })
  });
  assert.equal(result.phases[0].thermalAdjustment, 1);
  assert.equal(result.phases[0].bodyThermalAdjustment, 0);
  assert.ok(ids(result).includes('light_footmuff'));
  assert.equal(result.phases[0].effectiveThermalBand, '16_to_20');
});

test('stroller warmth modifier is capped away in warm weather', () => {
  const result = recommendOutfit({ weather: weather(24), profile: profile(), situation: stroller() });
  assert.equal(result.phases[0].thermalAdjustment, 0);
  assert.equal(result.phases[0].effectiveThermalBand, '24_to_28');
});

test('cool-sensitive baby gets one light step, not an automatic bulky winter layer', () => {
  const result = recommendOutfit({
    weather: weather(18),
    profile: profile({ warmthBias: 'runs_cool' }),
    situation: outdoor()
  });
  assert.equal(result.phases[0].thermalAdjustment, 1);
  assert.ok(ids(result).includes('long_sleeve_bodysuit'));
  assert.ok(ids(result).includes('thin_sweater'));
  assert.ok(ids(result).includes('softshell_jacket'));
  assert.ok(!ids(result).includes('winter_overall'));
});

test('warm-sensitive baby gets at most one cooler step', () => {
  const result = recommendOutfit({
    weather: weather(18),
    profile: profile({ warmthBias: 'runs_warm' }),
    situation: outdoor()
  });
  assert.equal(result.phases[0].thermalAdjustment, -1);
  assert.equal(result.phases[0].effectiveThermalBand, '20_to_24');
});

test('active and passive outdoor babies shift in opposite directions', () => {
  const active = recommendOutfit({ weather: weather(18), profile: profile(), situation: outdoor({ activity: 'active' }) });
  const passive = recommendOutfit({ weather: weather(18), profile: profile(), situation: outdoor({ activity: 'passive' }) });
  assert.equal(active.phases[0].thermalAdjustment, -1);
  assert.equal(passive.phases[0].thermalAdjustment, 1);
  assert.equal(active.phases[0].effectiveThermalBand, '20_to_24');
  assert.equal(passive.phases[0].effectiveThermalBand, '12_to_16');
});

test('moderate wind adds wind protection and a thermal step when not already included', () => {
  const result = recommendOutfit({
    weather: weather(22, { windSpeedKmh: 20 }),
    profile: profile(),
    situation: outdoor()
  });
  assert.equal(result.phases[0].thermalAdjustment, 1);
  assert.ok(ids(result).includes('softshell_jacket'));
  assert.ok(noticeCodes(result).includes('WIND_PROTECTION_RECOMMENDED'));
});

test('wind protection remains even when trusted apparent temperature already contains wind', () => {
  const result = recommendOutfit({
    weather: weather(22, { apparentTempC: 22, apparentTempTrusted: true, apparentTempIncludes: ['wind'], windSpeedKmh: 20 }),
    profile: profile(),
    situation: outdoor()
  });
  assert.equal(result.phases[0].thermalAdjustment, 0);
  assert.ok(ids(result).includes('softshell_jacket'));
});

test('rain adds rain protection without automatically increasing thermal step', () => {
  const result = recommendOutfit({
    weather: weather(25, { precipProbabilityPct: 70, precipMm: 1.2, precipitationType: 'rain' }),
    profile: profile(),
    situation: outdoor()
  });
  assert.equal(result.phases[0].thermalAdjustment, 0);
  assert.ok(ids(result).includes('rain_jacket'));
  assert.ok(!ids(result).includes('fleece_jacket'));
  assert.ok(noticeCodes(result).includes('RAIN_PROTECTION_RECOMMENDED'));
});

test('hot weather with UV uses light coverage instead of adding a heavy layer', () => {
  const result = recommendOutfit({
    weather: weather(29, { uvIndex: 7 }),
    profile: profile(),
    situation: outdoor({ sunExposure: 'direct' })
  });
  const outfit = ids(result);
  assert.ok(outfit.includes('light_long_sleeve_shirt'));
  assert.ok(outfit.includes('light_trousers'));
  assert.ok(outfit.includes('sun_hat'));
  assert.ok(!outfit.includes('short_sleeve_bodysuit'));
  assert.ok(!outfit.includes('thin_sweater'));
  assert.ok(!outfit.includes('softshell_jacket'));
  assert.ok(noticeCodes(result).includes('UV_SHADE_AND_COVERAGE'));
  assert.ok(noticeCodes(result).includes('INFANT_UNDER_12M_AVOID_DIRECT_SUN'));
});

test('under-12-month direct-sun rule applies even at low UV index', () => {
  const result = recommendOutfit({
    weather: weather(20, { uvIndex: 1 }),
    profile: profile(),
    situation: outdoor({ sunExposure: 'direct' })
  });
  assert.ok(noticeCodes(result).includes('INFANT_UNDER_12M_AVOID_DIRECT_SUN'));
  assert.ok(!noticeCodes(result).includes('UV_SHADE_AND_COVERAGE'));
});

test('unknown age uses conservative direct-sun rule', () => {
  const result = recommendOutfit({
    weather: weather(20, { uvIndex: 1 }),
    profile: profile({ birthDate: null }),
    situation: outdoor({ sunExposure: 'direct' })
  });
  assert.ok(noticeCodes(result).includes('AGE_UNKNOWN_DIRECT_SUN_CONSERVATIVE_RULE'));
});

test('default cold outfit offers overall as an alternative while keeping separate layers', () => {
  const result = recommendOutfit({ weather: weather(10), profile: profile(), situation: outdoor() });
  assert.ok(ids(result).includes('trousers'));
  assert.ok(ids(result).includes('softshell_jacket'));
  assert.ok(result.alternatives.some((alternative) => alternative.items.some((item) => item.itemId === 'transition_overall')));
});

test('overall preference can replace separate trousers and outer layer', () => {
  const result = recommendOutfit({
    weather: weather(10),
    profile: profile(),
    situation: outdoor(),
    preferences: { preferOverall: true }
  });
  assert.ok(ids(result).includes('transition_overall'));
  assert.ok(!ids(result).includes('trousers'));
  assert.ok(!ids(result).includes('softshell_jacket'));
});

test('legwear preference can choose leggings without changing thermal band', () => {
  const result = recommendOutfit({
    weather: weather(18),
    profile: profile(),
    situation: outdoor(),
    preferences: { preferredLegwear: 'leggings' }
  });
  assert.ok(ids(result).includes('leggings'));
  assert.ok(!ids(result).includes('trousers'));
  assert.equal(result.phases[0].effectiveThermalBand, '16_to_20');
});

test('car seat recommendation never puts conditional or prohibited clothing under harness', () => {
  const result = recommendOutfit({
    weather: weather(0),
    profile: profile(),
    situation: {
      mode: 'car',
      activity: 'passive',
      plannedMinutes: 40,
      cabinTempC: 10,
      includeOutdoorTransition: false,
      outsideTransitionMinutes: null
    }
  });
  const underHarness = result.items.filter((item) => item.phase === 'in_car' && item.wearPosition === 'under_harness');
  assert.ok(underHarness.length > 0);
  for (const item of underHarness) {
    assert.equal(CLOTHING_CATALOG[item.itemId].carSeatCompatibility, 'allowed', item.itemId);
  }
  assert.ok(!ids(result, 'in_car').includes('winter_overall'));
  assert.ok(noticeCodes(result).includes('CAR_SEAT_NO_BULKY_LAYERS'));
});

test('cold outdoor car transition may use winter overall but requires removal before harness', () => {
  const result = recommendOutfit({
    weather: weather(0),
    profile: profile(),
    situation: {
      mode: 'car',
      activity: 'passive',
      plannedMinutes: 40,
      cabinTempC: 20,
      includeOutdoorTransition: true,
      outsideTransitionMinutes: 5
    }
  });
  assert.ok(ids(result, 'outdoor_transition').includes('winter_overall'));
  assert.ok(!ids(result, 'in_car').includes('winter_overall'));
  assert.ok(noticeCodes(result).includes('CAR_SEAT_REMOVE_OUTER_BEFORE_HARNESS'));
});

test('cold cabin may offer extra warmth only over the closed harness', () => {
  const result = recommendOutfit({
    weather: null,
    profile: profile(),
    situation: {
      mode: 'car',
      activity: 'passive',
      plannedMinutes: 30,
      cabinTempC: 15,
      includeOutdoorTransition: false,
      outsideTransitionMinutes: null
    }
  });
  const blanket = result.items.find((item) => item.itemId === 'blanket_over_harness');
  assert.equal(blanket.wearPosition, 'over_harness');
  assert.ok(noticeCodes(result).includes('CAR_SEAT_BLANKET_OVER_HARNESS_ONLY'));
});

test('car with missing transition weather can still give a ready in-car phase', () => {
  const result = recommendOutfit({
    weather: null,
    profile: profile(),
    situation: {
      mode: 'car',
      activity: 'passive',
      plannedMinutes: 30,
      cabinTempC: 21,
      includeOutdoorTransition: true,
      outsideTransitionMinutes: 4
    }
  });
  assert.equal(result.status, 'partial');
  assert.equal(result.phases.find((phase) => phase.phase === 'outdoor_transition').status, 'blocked');
  assert.equal(result.phases.find((phase) => phase.phase === 'in_car').status, 'ready');
});

test('sleep is driven by room temperature and ignores outside weather entirely', () => {
  const situation = { mode: 'sleep', roomTempC: 18, selectedSleepBagId: null };
  const coldOutside = recommendOutfit({ weather: weather(-10, { windSpeedKmh: 50, uvIndex: 8 }), profile: profile(), situation });
  const hotOutside = recommendOutfit({ weather: weather(38, { windSpeedKmh: 0, uvIndex: 0 }), profile: profile(), situation });
  assert.deepEqual(coldOutside, hotOutside);
  assert.equal(coldOutside.phases[0].thermalReferenceSource, 'room_temp');
  assert.equal(coldOutside.phases[0].thermalReferenceC, 18);
  assert.ok(noticeCodes(coldOutside).includes('SLEEP_USE_ROOM_TEMPERATURE'));
});

test('sleep blocks without room temperature', () => {
  const result = recommendOutfit({
    weather: weather(5),
    profile: profile(),
    situation: { mode: 'sleep', roomTempC: null, selectedSleepBagId: null }
  });
  assert.equal(result.status, 'blocked');
  assert.equal(result.confidence.level, 'low');
});

test('TOG alone does not produce exact sleep-bag underlayers', () => {
  const bagProfile = profile({
    sleepBagInventory: [{ sleepBagId: 'bag_25', label: '2.5 TOG', tog: 2.5, manufacturer: 'Test', guidanceBands: [] }]
  });
  const result = recommendOutfit({
    weather: null,
    profile: bagProfile,
    situation: { mode: 'sleep', roomTempC: 18, selectedSleepBagId: 'bag_25' }
  });
  assert.equal(result.status, 'partial');
  assert.ok(noticeCodes(result).includes('SLEEP_MANUFACTURER_GUIDANCE_REQUIRED'));
  assert.deepEqual(ids(result).filter((itemId) => itemId !== 'bag_25'), []);
});

test('matching manufacturer sleep-bag guidance can produce a ready exact combination', () => {
  const bagProfile = profile({
    sleepBagInventory: [{
      sleepBagId: 'bag_guided',
      label: 'Guided bag',
      tog: 1,
      manufacturer: 'Test',
      guidanceBands: [{
        minRoomTempC: 18,
        maxRoomTempC: 22,
        recommendedUnderlayers: ['long_sleeve_bodysuit', 'sleep_suit'],
        sourceLabel: 'Manufacturer chart',
        sourceUrl: null
      }]
    }]
  });
  const result = recommendOutfit({
    weather: null,
    profile: bagProfile,
    situation: { mode: 'sleep', roomTempC: 19, selectedSleepBagId: 'bag_guided' }
  });
  assert.equal(result.status, 'ready');
  assert.equal(result.confidence.level, 'high');
  assert.ok(ids(result).includes('long_sleeve_bodysuit'));
  assert.ok(ids(result).includes('sleep_suit'));
  assert.ok(!ids(result).includes('warm_hat'));
  assert.ok(!ids(result).includes('blanket_over_harness'));
  assert.ok(noticeCodes(result).includes('SLEEP_NO_HAT'));
  assert.ok(noticeCodes(result).includes('SLEEP_NO_LOOSE_BLANKET_OVER_BAG'));
});

test('stale weather is surfaced as partial/low-confidence, not silently treated as fresh', () => {
  const result = recommendOutfit({
    weather: weather(18, { freshness: 'stale' }),
    profile: profile(),
    situation: outdoor()
  });
  assert.equal(result.status, 'partial');
  assert.equal(result.confidence.level, 'low');
  assert.ok(noticeCodes(result).includes('WEATHER_DATA_STALE'));
});

test('missing optional wind/UV/precipitation data lowers confidence and is explicit', () => {
  const result = recommendOutfit({
    weather: weather(18, {
      windSpeedKmh: null,
      uvIndex: null,
      precipProbabilityPct: null,
      precipMm: null,
      precipitationType: 'unknown'
    }),
    profile: profile(),
    situation: outdoor()
  });
  assert.equal(result.status, 'partial');
  assert.equal(result.confidence.level, 'low');
  assert.ok(result.dataQuality.missingFields.includes('weather.windSpeedKmh'));
  assert.ok(result.dataQuality.missingFields.includes('weather.uvIndex'));
  assert.ok(result.dataQuality.missingFields.includes('weather.precipitation'));
});

test('outdoor blocks if required weather is absent', () => {
  const result = recommendOutfit({ weather: null, profile: profile(), situation: outdoor() });
  assert.equal(result.status, 'blocked');
  assert.equal(result.phases[0].status, 'blocked');
  assert.ok(noticeCodes(result).includes('WEATHER_DATA_INCOMPLETE'));
});

test('manual weather fallback is surfaced in data quality', () => {
  const result = recommendOutfit({
    weather: weather(18, { origin: 'manual' }),
    profile: profile(),
    situation: outdoor()
  });
  assert.equal(result.dataQuality.usedManualFallback, true);
});

test('carrier avoids bulky torso layers and protects exposed areas in cold weather', () => {
  const result = recommendOutfit({ weather: weather(8), profile: profile(), situation: carrier() });
  const outfit = ids(result);
  assert.ok(!outfit.includes('winter_overall'));
  assert.ok(!outfit.includes('transition_overall'));
  assert.ok(!outfit.includes('softshell_jacket'));
  assert.ok(outfit.includes('warm_socks_booties'));
  assert.ok(outfit.includes('warm_hat'));
  assert.ok(noticeCodes(result).includes('CARRIER_BODY_HEAT_COUNTS_AS_INSULATION'));
});

test('carrier cover is treated as real insulation with explicit calibration uncertainty', () => {
  const result = recommendOutfit({
    weather: weather(12),
    profile: profile(),
    situation: carrier({ carrierCover: 'warm' })
  });
  assert.ok(result.uncertainty.includes('CARRIER_COVER_THERMAL_VALUE_NOT_CALIBRATED'));
  assert.equal(result.confidence.level, 'medium');
});

test('style theme never changes outfit logic', () => {
  const input = { weather: weather(18), situation: outdoor() };
  const neutral = recommendOutfit({ ...input, profile: profile({ styleTheme: 'neutral' }) });
  const rose = recommendOutfit({ ...input, profile: profile({ styleTheme: 'soft_rose' }) });
  assert.deepEqual(neutral, rose);
});

test('neck feedback adjusts only the current recommendation', () => {
  const cool = recommendOutfit({ weather: weather(18), profile: profile(), situation: outdoor(), neckFeedback: 'cool' });
  const hot = recommendOutfit({ weather: weather(18), profile: profile(), situation: outdoor(), neckFeedback: 'hot_sweaty' });
  assert.equal(cool.phases[0].thermalAdjustment, 1);
  assert.equal(hot.phases[0].thermalAdjustment, -1);
  assert.equal(BASE_PROFILE.warmthBias, 'neutral');
});

test('engine result uses the documented boundary band at every threshold', () => {
  const cases = [
    [2.999, 'below_3'], [3, '3_to_8'],
    [7.999, '3_to_8'], [8, '8_to_12'],
    [11.999, '8_to_12'], [12, '12_to_16'],
    [15.999, '12_to_16'], [16, '16_to_20'],
    [19.999, '16_to_20'], [20, '20_to_24'],
    [23.999, '20_to_24'], [24, '24_to_28'],
    [27.999, '24_to_28'], [28, '28_plus']
  ];
  for (const [temp, band] of cases) {
    const result = recommendOutfit({ weather: weather(temp), profile: profile(), situation: outdoor() });
    assert.equal(result.phases[0].thermalBand, band, `${temp} °C`);
    assert.equal(result.phases[0].effectiveThermalBand, band, `${temp} °C effective band`);
  }
});

test('extreme cold is bounded and carries explicit caution', () => {
  const result = recommendOutfit({ weather: weather(-5), profile: profile(), situation: outdoor() });
  assert.ok(noticeCodes(result).includes('EXTREME_COLD_CAUTION'));
  assert.ok(ids(result).includes('winter_overall'));
  assert.ok(ids(result).length <= 7, 'engine must not keep adding unlimited layers');
});

test('extreme heat avoids insulating layers and carries explicit caution', () => {
  const result = recommendOutfit({ weather: weather(32), profile: profile(), situation: outdoor() });
  assert.ok(noticeCodes(result).includes('EXTREME_HEAT_CAUTION'));
  assert.ok(!ids(result).includes('thin_sweater'));
  assert.ok(!ids(result).includes('fleece_jacket'));
  assert.ok(!ids(result).includes('softshell_jacket'));
  assert.ok(!ids(result).includes('winter_overall'));
});
