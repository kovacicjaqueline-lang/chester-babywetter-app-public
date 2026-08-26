import { weatherError, WeatherDataError } from './errors.js';

export const LAST_LOCATION_STORAGE_KEY = 'babyweather:last-location:v1';
export const OPEN_METEO_GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';

function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isWeatherLocation(value) {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof value.label === 'string' &&
      value.label.trim() &&
      (value.latitude === null || finiteNumber(value.latitude)) &&
      (value.longitude === null || finiteNumber(value.longitude)) &&
      (value.timezone === null || typeof value.timezone === 'string') &&
      (value.locationId === null || typeof value.locationId === 'string')
  );
}

export function createLocationStore(storage, key = LAST_LOCATION_STORAGE_KEY) {
  return {
    load() {
      if (!storage) return null;
      try {
        const raw = storage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return isWeatherLocation(parsed) ? parsed : null;
      } catch {
        return null;
      }
    },

    save(location) {
      if (!storage) return;
      if (!isWeatherLocation(location)) {
        throw new TypeError('Invalid WeatherLocation');
      }
      try {
        storage.setItem(key, JSON.stringify(location));
      } catch (cause) {
        throw weatherError('storage_failed', 'Failed to store last weather location.', { cause });
      }
    },

    clear() {
      if (!storage) return;
      try {
        storage.removeItem(key);
      } catch {
        // A failed clear must not prevent weather usage.
      }
    }
  };
}

function browserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

export function getBrowserLocation({ geolocation = globalThis.navigator?.geolocation } = {}) {
  if (!geolocation?.getCurrentPosition) {
    return Promise.reject(weatherError('geolocation_unavailable', 'Browser geolocation is unavailable.'));
  }

  return new Promise((resolve, reject) => {
    geolocation.getCurrentPosition(
      (position) => {
        const latitude = position?.coords?.latitude;
        const longitude = position?.coords?.longitude;
        if (!finiteNumber(latitude) || !finiteNumber(longitude)) {
          reject(weatherError('geolocation_unavailable', 'Geolocation returned invalid coordinates.'));
          return;
        }
        resolve({
          locationId: `geo:${latitude.toFixed(5)},${longitude.toFixed(5)}`,
          label: 'Aktueller Standort',
          latitude,
          longitude,
          timezone: browserTimezone()
        });
      },
      (error) => {
        const code = error?.code === 1 ? 'geolocation_denied' : 'geolocation_unavailable';
        reject(weatherError(code, error?.message || 'Browser geolocation failed.'));
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  });
}

function locationLabel(result) {
  return [result.name, result.admin1, result.country].filter(Boolean).filter((part, index, all) => all.indexOf(part) === index).join(', ');
}

export async function searchLocations(
  query,
  {
    fetchImpl = globalThis.fetch,
    language = 'de',
    countryCode = null,
    count = 8,
    endpoint = OPEN_METEO_GEOCODING_URL
  } = {}
) {
  const normalizedQuery = String(query ?? '').trim();
  if (normalizedQuery.length < 2) return [];

  const url = new URL(endpoint);
  url.searchParams.set('name', normalizedQuery);
  url.searchParams.set('count', String(count));
  url.searchParams.set('language', language);
  url.searchParams.set('format', 'json');
  if (countryCode) url.searchParams.set('countryCode', countryCode);

  let response;
  try {
    response = await fetchImpl(url);
  } catch (cause) {
    throw weatherError('location_search_failed', 'Open-Meteo geocoding request failed.', { cause });
  }

  if (!response?.ok) {
    throw weatherError('location_search_failed', `Open-Meteo geocoding returned HTTP ${response?.status ?? 'unknown'}.`);
  }

  let payload;
  try {
    payload = await response.json();
  } catch (cause) {
    throw weatherError('location_search_failed', 'Open-Meteo geocoding returned invalid JSON.', { cause });
  }

  if (payload?.error) {
    throw weatherError('location_search_failed', payload.reason || 'Open-Meteo geocoding returned an error.');
  }

  const results = Array.isArray(payload?.results) ? payload.results : [];
  return results
    .filter((result) => finiteNumber(result.latitude) && finiteNumber(result.longitude))
    .map((result) => ({
      locationId: result.id == null ? null : `openmeteo:${result.id}`,
      label: locationLabel(result) || normalizedQuery,
      latitude: result.latitude,
      longitude: result.longitude,
      timezone: typeof result.timezone === 'string' ? result.timezone : null
    }));
}

export function asWeatherDataError(error, fallbackCode = 'location_search_failed') {
  return error instanceof WeatherDataError ? error : weatherError(fallbackCode, error?.message || String(error), { cause: error });
}
