import test from 'node:test';
import assert from 'node:assert/strict';
import { isWeatherSeries, markWeatherSeriesStale, normalizeWeatherBundle } from '../../src/integration/weather-series.js';

const location = { locationId: 'loc', label: 'Salzburg', latitude: 47.8, longitude: 13.0, timezone: 'Europe/Vienna' };
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

test('cached weather becomes stale without mutating source data', () => {
  const series = normalizeWeatherBundle({ current: snapshot('2026-08-26T10:00:00.000Z'), hourly: [] }, location);
  const stale = markWeatherSeriesStale(series);
  assert.equal(stale.origin, 'cache');
  assert.equal(stale.freshness, 'stale');
  assert.equal(series.origin, 'api');
  assert.equal(series.freshness, 'fresh');
});

test('invalid bundles are rejected rather than inventing temperature values', () => {
  assert.throws(() => normalizeWeatherBundle({ current: { observedAt: '2026-08-26T10:00:00.000Z', airTempC: null }, hourly: [] }, location), TypeError);
  assert.equal(isWeatherSeries({}), false);
});
