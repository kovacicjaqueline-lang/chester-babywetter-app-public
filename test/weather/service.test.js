import test from 'node:test';
import assert from 'node:assert/strict';

import { createWeatherService } from '../../src/weather/service.js';
import { WeatherDataError } from '../../src/weather/errors.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key)
  };
}

const A = { locationId: 'a', label: 'Salzburg', latitude: 47.8095, longitude: 13.055, timezone: 'Europe/Vienna' };
const B = { locationId: 'b', label: 'Wien', latitude: 48.2082, longitude: 16.3738, timezone: 'Europe/Vienna' };

function bundleFor(location) {
  const snapshot = {
    snapshotId: `test:${location.locationId}`,
    location,
    origin: 'api',
    source: 'test-provider',
    observedAt: '2026-08-25T11:00:00.000Z',
    fetchedAt: '2026-08-25T11:01:00.000Z',
    freshness: 'fresh',
    airTempC: 20,
    apparentTempC: null,
    apparentTempTrusted: false,
    apparentTempIncludes: [],
    windSpeedKmh: null,
    windGustKmh: null,
    precipProbabilityPct: null,
    precipMm: null,
    precipitationType: 'unknown',
    uvIndex: null,
    cloudCoverPct: null,
    isDay: null,
    weatherCode: null
  };
  return { current: snapshot, hourly: [] };
}

test('returns an offline error instead of silently using fake live weather', async () => {
  const service = createWeatherService({
    adapter: { fetchWeather: async () => assert.fail('provider must not be called while offline') },
    storage: memoryStorage(),
    isOnline: () => false
  });

  await assert.rejects(
    service.loadWeather(A),
    (error) => error instanceof WeatherDataError && error.code === 'offline' && /offline/.test(error.userMessage)
  );
});

test('supports explicit mock weather for offline demo mode', async () => {
  const service = createWeatherService({
    adapter: { fetchWeather: async () => assert.fail('provider must not be called while offline') },
    storage: memoryStorage(),
    isOnline: () => false,
    now: () => new Date('2026-08-25T11:00:00.000Z')
  });

  const result = await service.loadWeather(A, { allowOfflineDemo: true });
  assert.equal(result.current.source, 'mock_offline_demo');
  assert.equal(result.current.location.label, 'Salzburg');
  assert.ok(result.hourly.length > 0);
});

test('preserves provider error codes and friendly messages', async () => {
  const service = createWeatherService({
    adapter: {
      async fetchWeather() {
        throw new WeatherDataError('weather_fetch_failed', 'network exploded', 'Wetter derzeit nicht verfügbar.');
      }
    },
    storage: memoryStorage(),
    isOnline: () => true
  });

  await assert.rejects(
    service.loadWeather(A),
    (error) => error.code === 'weather_fetch_failed' && error.userMessage === 'Wetter derzeit nicht verfügbar.'
  );
});

test('switching locations fetches the new coordinates and persists the new location', async () => {
  const calls = [];
  const storage = memoryStorage();
  const service = createWeatherService({
    adapter: {
      async fetchWeather(location) {
        calls.push(location.locationId);
        return bundleFor(location);
      }
    },
    storage,
    isOnline: () => true
  });

  await service.useLocation(A);
  await service.useLocation(B);

  assert.deepEqual(calls, ['a', 'b']);
  assert.deepEqual(service.getSavedLocation(), B);
});

test('failed location switch does not overwrite the last working location', async () => {
  const storage = memoryStorage();
  let fail = false;
  const service = createWeatherService({
    adapter: {
      async fetchWeather(location) {
        if (fail) throw new WeatherDataError('weather_fetch_failed', 'boom', 'Nicht verfügbar.');
        return bundleFor(location);
      }
    },
    storage,
    isOnline: () => true
  });

  await service.useLocation(A);
  fail = true;
  await assert.rejects(service.useLocation(B));
  assert.deepEqual(service.getSavedLocation(), A);
});
