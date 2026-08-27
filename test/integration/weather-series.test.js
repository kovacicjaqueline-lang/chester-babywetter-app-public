import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WEATHER_CACHE_MAX_AGE_MINUTES,
  WEATHER_FRESH_MAX_AGE_MINUTES,
  assessCachedWeatherSeries,
  compensateWeatherRiskHorizon,
  isWeatherSeries,
  markWeatherSeriesStale,
  normalizeWeatherBundle,
  sameWeatherLocation
} from '../../src/integration/weather-series.js';

const location = { locationId: 'loc', label: 'Salzburg', latitude: 47.8, longitude: 13.0, timezone: 'Europe/Vienna' };
const otherLocation = { locationId: 'other', label: 'Wien', latitude: 48.2, longitude: 16.37, timezone: 'Europe/Vienna' };
const snapshot = (observedAt, overrides = {}) => ({
  snapshotId: `snapshot:${observedAt}`,
  location,
  origin: 'api',
  source: 'open-meteo',
  observedAt,
  fetchedAt: '2026-08-26T10:00:00.000Z',
  freshness: 'fresh',
  airTempC: 18,
  apparentTempC: 17,
  apparentTempTrusted: true,
  apparentTempIncludes: ['wind', 'humidity', 'sun'],
  windSpeedKmh: 12,
  windGustKmh: 20,
  precipProbabilityPct: 20,
  precipMm: 0,
  precipitationType: 'none',
  uvIndex: 3,
  cloudCoverPct: 40,
  isDay: true,
  weatherCode: 2,
  ...overrides
});

function cachedSeries() {
  return normalizeWeatherBundle({ current: snapshot('2026-08-26T10:00:00.000Z'), hourly: [] }, location);
}

test('normalizes weather branch bundle to current WeatherSeries contract', () => {
  const bundle = {
    current: snapshot('2026-08-26T10:00:00.000Z'),
    hourly: [snapshot('2026-08-26T11:00:00.000Z'), snapshot('2026-08-26T12:00:00.000Z')]
  };
  const series = normalizeWeatherBundle(bundle, location);
  assert.equal(series.current.time, '2026-08-26T10:00:00.000Z');
  assert.equal(series.current.observedAt, undefined);
  assert.equal(series.location.label, 'Salzburg');
  assert.equal(series.source, 'open-meteo');
  assert.equal(series.freshness, 'fresh');
  assert.equal(series.hourly.length, 2);
  assert.ok(isWeatherSeries(series));
});

test('drops hourly values at or before current time', () => {
  const series = normalizeWeatherBundle({
    current: snapshot('2026-08-26T10:00:00.000Z'),
    hourly: [snapshot('2026-08-26T09:00:00.000Z'), snapshot('2026-08-26T10:00:00.000Z'), snapshot('2026-08-26T11:00:00.000Z')]
  }, location);
  assert.deepEqual(series.hourly.map((point) => point.time), ['2026-08-26T11:00:00.000Z']);
});

test('cached weather remains fresh through the 30 minute boundary', () => {
  const result = assessCachedWeatherSeries(cachedSeries(), {
    location,
    now: () => new Date('2026-08-26T10:30:00.000Z')
  });
  assert.equal(WEATHER_FRESH_MAX_AGE_MINUTES, 30);
  assert.equal(result.status, 'fresh');
  assert.equal(result.ageMinutes, 30);
  assert.equal(result.series.origin, 'cache');
  assert.equal(result.series.freshness, 'fresh');
});

test('cached weather becomes stale after 30 minutes and stays usable through 120 minutes', () => {
  const afterFresh = assessCachedWeatherSeries(cachedSeries(), {
    location,
    now: () => new Date('2026-08-26T10:30:00.001Z')
  });
  const atMaxAge = assessCachedWeatherSeries(cachedSeries(), {
    location,
    now: () => new Date('2026-08-26T12:00:00.000Z')
  });
  assert.equal(WEATHER_CACHE_MAX_AGE_MINUTES, 120);
  assert.equal(afterFresh.status, 'stale');
  assert.equal(afterFresh.series.freshness, 'stale');
  assert.equal(atMaxAge.status, 'stale');
  assert.equal(atMaxAge.ageMinutes, 120);
});

test('stale cache advances current to the latest cached forecast point at or before now', () => {
  const series = normalizeWeatherBundle({
    current: snapshot('2026-08-26T10:00:00.000Z', { airTempC: 18 }),
    hourly: [
      snapshot('2026-08-26T11:00:00.000Z', { airTempC: 19 }),
      snapshot('2026-08-26T12:00:00.000Z', { airTempC: 20 }),
      snapshot('2026-08-26T13:00:00.000Z', { airTempC: 21 })
    ]
  }, location);
  const result = assessCachedWeatherSeries(series, {
    location,
    now: () => new Date('2026-08-26T11:20:00.000Z')
  });
  assert.equal(result.status, 'stale');
  assert.equal(result.series.current.time, '2026-08-26T11:00:00.000Z');
  assert.equal(result.series.current.airTempC, 19);
  assert.deepEqual(result.series.hourly.map((point) => point.time), ['2026-08-26T12:00:00.000Z', '2026-08-26T13:00:00.000Z']);
  assert.equal(result.series.fetchedAt, '2026-08-26T10:00:00.000Z');
  assert.equal(series.current.time, '2026-08-26T10:00:00.000Z');
});

test('stale manual override keeps manual current and removes already-past API forecast points', () => {
  const series = normalizeWeatherBundle({
    origin: 'api_with_manual_override',
    current: snapshot('2026-08-26T10:00:00.000Z', { airTempC: 16, origin: 'api_with_manual_override' }),
    hourly: [snapshot('2026-08-26T11:00:00.000Z', { airTempC: 22 }), snapshot('2026-08-26T12:00:00.000Z', { airTempC: 23 })]
  }, location);
  const result = assessCachedWeatherSeries(series, {
    location,
    now: () => new Date('2026-08-26T11:20:00.000Z')
  });
  assert.equal(result.status, 'stale');
  assert.equal(result.series.origin, 'api_with_manual_override');
  assert.equal(result.series.current.time, '2026-08-26T10:00:00.000Z');
  assert.equal(result.series.current.airTempC, 16);
  assert.deepEqual(result.series.hourly.map((point) => point.time), ['2026-08-26T12:00:00.000Z']);
});

test('stale risk horizon is compensated to start from actual request time without changing weather timestamps', () => {
  const series = normalizeWeatherBundle({
    current: snapshot('2026-08-26T10:00:00.000Z'),
    hourly: [
      snapshot('2026-08-26T11:00:00.000Z'),
      snapshot('2026-08-26T12:00:00.000Z')
    ]
  }, location);
  const stale = assessCachedWeatherSeries(series, {
    location,
    now: () => new Date('2026-08-26T11:58:00.000Z')
  }).series;
  assert.equal(stale.current.time, '2026-08-26T11:00:00.000Z');

  const outdoor = compensateWeatherRiskHorizon(
    { mode: 'outdoor', plannedMinutes: 5, activity: 'normal' },
    stale,
    { now: () => new Date('2026-08-26T11:58:00.000Z') }
  );
  assert.equal(outdoor.plannedMinutes, 63);
  assert.equal(stale.current.time, '2026-08-26T11:00:00.000Z');

  const car = compensateWeatherRiskHorizon(
    { mode: 'car', plannedMinutes: 30, includeOutdoorTransition: true, outsideTransitionMinutes: 5 },
    stale,
    { now: () => new Date('2026-08-26T11:58:00.000Z') }
  );
  assert.equal(car.outsideTransitionMinutes, 63);
});

test('fresh cache does not get a compensated risk horizon', () => {
  const fresh = assessCachedWeatherSeries(cachedSeries(), {
    location,
    now: () => new Date('2026-08-26T10:20:00.000Z')
  }).series;
  const context = { mode: 'outdoor', plannedMinutes: 5 };
  assert.deepEqual(
    compensateWeatherRiskHorizon(context, fresh, { now: () => new Date('2026-08-26T10:20:00.000Z') }),
    context
  );
});

test('fresh cache does not promote forecast points to current', () => {
  const series = normalizeWeatherBundle({
    current: snapshot('2026-08-26T10:00:00.000Z'),
    hourly: [snapshot('2026-08-26T10:15:00.000Z', { airTempC: 19 })]
  }, location);
  const result = assessCachedWeatherSeries(series, {
    location,
    now: () => new Date('2026-08-26T10:20:00.000Z')
  });
  assert.equal(result.status, 'fresh');
  assert.equal(result.series.current.time, '2026-08-26T10:00:00.000Z');
  assert.equal(result.series.hourly[0].time, '2026-08-26T10:15:00.000Z');
});

test('cached manual override keeps its provenance while the same age limits apply', () => {
  const series = cachedSeries();
  series.origin = 'manual';
  const result = assessCachedWeatherSeries(series, {
    location,
    now: () => new Date('2026-08-26T11:00:00.000Z')
  });
  assert.equal(result.status, 'stale');
  assert.equal(result.series.origin, 'manual');
  assert.equal(result.series.freshness, 'stale');
  assert.equal(result.sourceOrigin, 'manual');
});

test('cached weather older than 120 minutes is expired and not returned as WeatherSeries', () => {
  const result = assessCachedWeatherSeries(cachedSeries(), {
    location,
    now: () => new Date('2026-08-26T12:00:00.001Z')
  });
  assert.equal(result.status, 'expired');
  assert.equal(result.series, null);
});

test('cache max age override can only make reuse stricter at the integration call site', () => {
  const result = assessCachedWeatherSeries(cachedSeries(), {
    location,
    maxAgeMinutes: 60,
    now: () => new Date('2026-08-26T11:00:00.001Z')
  });
  assert.equal(result.status, 'expired');
  assert.equal(result.series, null);
});

test('cached weather is rejected for a different location', () => {
  const result = assessCachedWeatherSeries(cachedSeries(), {
    location: otherLocation,
    now: () => new Date('2026-08-26T10:10:00.000Z')
  });
  assert.equal(result.status, 'location_mismatch');
  assert.equal(result.series, null);
  assert.equal(sameWeatherLocation(location, otherLocation), false);
});

test('coordinate-only locations can match within a small geolocation tolerance', () => {
  assert.equal(sameWeatherLocation(
    { locationId: null, label: 'A', latitude: 47.8000, longitude: 13.0000, timezone: null },
    { locationId: null, label: 'B', latitude: 47.8005, longitude: 13.0005, timezone: null }
  ), true);
});

test('invalid or implausibly future fetchedAt values are not reusable', () => {
  const invalid = cachedSeries();
  invalid.fetchedAt = 'not-a-date';
  assert.equal(isWeatherSeries(invalid), false);
  assert.equal(assessCachedWeatherSeries(invalid, { location }).status, 'invalid');

  const future = cachedSeries();
  future.fetchedAt = '2026-08-26T10:06:00.000Z';
  const futureResult = assessCachedWeatherSeries(future, {
    location,
    now: () => new Date('2026-08-26T10:00:00.000Z')
  });
  assert.equal(futureResult.status, 'invalid');
  assert.equal(futureResult.series, null);
});

test('small clock skew is treated as age zero rather than inventing negative freshness age', () => {
  const future = cachedSeries();
  future.fetchedAt = '2026-08-26T10:04:00.000Z';
  const result = assessCachedWeatherSeries(future, {
    location,
    now: () => new Date('2026-08-26T10:00:00.000Z')
  });
  assert.equal(result.status, 'fresh');
  assert.equal(result.ageMinutes, 0);
});

test('low-level stale marker keeps source data immutable', () => {
  const series = cachedSeries();
  const stale = markWeatherSeriesStale(series);
  assert.equal(stale.origin, 'cache');
  assert.equal(stale.freshness, 'stale');
  assert.equal(series.origin, 'api');
  assert.equal(series.freshness, 'fresh');
});

test('invalid bundles are rejected rather than inventing timestamps or temperature values', () => {
  assert.throws(() => normalizeWeatherBundle({ current: { observedAt: '2026-08-26T10:00:00.000Z', airTempC: null }, hourly: [] }, location), TypeError);
  assert.throws(() => normalizeWeatherBundle({ current: snapshot('2026-08-26T10:00:00.000Z', { fetchedAt: null }), hourly: [] }, location), /fetchedAt/);
  assert.equal(isWeatherSeries({}), false);
});
