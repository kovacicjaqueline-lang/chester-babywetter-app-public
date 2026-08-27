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

function openMeteoResponse() {
  return {
    ok: true,
    async json() {
      return {
        timezone: 'Europe/Vienna',
        utc_offset_seconds: 7200,
        current: {
          time: 1787655600,
          temperature_2m: 20,
          apparent_temperature: 19,
          wind_speed_10m: 8,
          wind_gusts_10m: 12,
          precipitation: 0,
          rain: 0,
          showers: 0,
          snowfall: 0,
          weather_code: 1,
          cloud_cover: 20,
          is_day: 1
        },
        hourly: {
          time: [1787655600],
          temperature_2m: [20],
          apparent_temperature: [19],
          wind_speed_10m: [8],
          wind_gusts_10m: [12],
          precipitation_probability: [10],
          precipitation: [0],
          rain: [0],
          showers: [0],
          snowfall: [0],
          weather_code: [1],
          cloud_cover: [20],
          is_day: [1],
          uv_index: [3]
        }
      };
    }
  };
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

test('explicit demoMode uses mock data without contacting the provider', async () => {
  const service = createWeatherService({
    adapter: { fetchWeather: async () => assert.fail('provider must not be called in demo mode') },
    storage: memoryStorage(),
    isOnline: () => true,
    now: () => new Date('2026-08-25T11:00:00.000Z')
  });

  const result = await service.loadWeather(A, { demoMode: true });
  assert.equal(result.current.source, 'mock_offline_demo');
});

test('online provider errors are not hidden by allowOfflineDemo', async () => {
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
    service.loadWeather(A, { allowOfflineDemo: true }),
    (error) => error.code === 'weather_fetch_failed' && error.userMessage === 'Wetter derzeit nicht verfügbar.'
  );
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

test('passes injected fetchImpl into the default Open-Meteo adapter', async () => {
  let calls = 0;
  const service = createWeatherService({
    fetchImpl: async () => {
      calls += 1;
      return openMeteoResponse();
    },
    storage: memoryStorage(),
    isOnline: () => true,
    now: () => new Date('2026-08-25T11:01:00.000Z')
  });

  const result = await service.loadWeather(A);
  assert.equal(calls, 1);
  assert.equal(result.current.source, 'open-meteo');
  assert.equal(result.current.airTempC, 20);
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

test('storage failures do not discard successfully loaded weather', async () => {
  const storageError = new Error('storage disabled');
  const storage = {
    getItem: () => null,
    setItem: () => {
      throw storageError;
    },
    removeItem: () => {}
  };
  const seenErrors = [];
  const service = createWeatherService({
    adapter: { fetchWeather: async (location) => bundleFor(location) },
    storage,
    isOnline: () => true,
    onStorageError: (error) => seenErrors.push(error)
  });

  const result = await service.useLocation(A);
  assert.equal(result.current.location.label, 'Salzburg');
  assert.equal(seenErrors.length, 1);
  assert.equal(seenErrors[0].code, 'storage_failed');
});
