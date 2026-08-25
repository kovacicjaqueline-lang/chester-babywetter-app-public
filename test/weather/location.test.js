import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createLocationStore,
  getBrowserLocation,
  searchLocations
} from '../../src/weather/location.js';
import { WeatherDataError } from '../../src/weather/errors.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key)
  };
}

test('wraps successful browser geolocation as a WeatherLocation', async () => {
  const geolocation = {
    getCurrentPosition(success) {
      success({ coords: { latitude: 47.8095, longitude: 13.055 } });
    }
  };
  const location = await getBrowserLocation({ geolocation });
  assert.equal(location.label, 'Aktueller Standort');
  assert.equal(location.latitude, 47.8095);
  assert.equal(location.longitude, 13.055);
  assert.match(location.locationId, /^geo:/);
});

test('returns understandable geolocation denied state', async () => {
  const geolocation = {
    getCurrentPosition(_success, failure) {
      failure({ code: 1, message: 'Permission denied' });
    }
  };
  await assert.rejects(
    getBrowserLocation({ geolocation }),
    (error) => error instanceof WeatherDataError && error.code === 'geolocation_denied' && /Ort|Standort/.test(error.userMessage)
  );
});

test('searches Open-Meteo by place or postal-code query and maps results', async () => {
  let requestedUrl;
  const fetchImpl = async (url) => {
    requestedUrl = new URL(url);
    return {
      ok: true,
      async json() {
        return {
          results: [
            {
              id: 2766824,
              name: 'Salzburg',
              admin1: 'Salzburg',
              country: 'Österreich',
              latitude: 47.8095,
              longitude: 13.055,
              timezone: 'Europe/Vienna'
            }
          ]
        };
      }
    };
  };

  const results = await searchLocations('5020', { fetchImpl });
  assert.equal(requestedUrl.searchParams.get('name'), '5020');
  assert.equal(requestedUrl.searchParams.get('language'), 'de');
  assert.equal(results.length, 1);
  assert.deepEqual(results[0], {
    locationId: 'openmeteo:2766824',
    label: 'Salzburg, Österreich',
    latitude: 47.8095,
    longitude: 13.055,
    timezone: 'Europe/Vienna'
  });
});

test('stores only the most recently used valid location', () => {
  const store = createLocationStore(memoryStorage());
  const first = { locationId: '1', label: 'Salzburg', latitude: 47.8, longitude: 13.0, timezone: 'Europe/Vienna' };
  const second = { locationId: '2', label: 'Wien', latitude: 48.2, longitude: 16.37, timezone: 'Europe/Vienna' };
  store.save(first);
  store.save(second);
  assert.deepEqual(store.load(), second);
});

test('ignores malformed persisted location data', () => {
  const storage = memoryStorage();
  storage.setItem('babyweather:last-location:v1', '{broken');
  assert.equal(createLocationStore(storage).load(), null);
});
