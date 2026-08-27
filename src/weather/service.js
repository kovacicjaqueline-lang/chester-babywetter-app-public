import { WeatherDataError, weatherError } from './errors.js';
import { createLocationStore, getBrowserLocation, isWeatherLocation, searchLocations } from './location.js';
import { createMockWeatherBundle } from './mock-weather.js';
import { createOpenMeteoAdapter } from './open-meteo.js';

function defaultOnline() {
  return globalThis.navigator?.onLine !== false;
}

export function createWeatherService({
  adapter = null,
  storage = globalThis.localStorage,
  geolocation = globalThis.navigator?.geolocation,
  fetchImpl = globalThis.fetch,
  isOnline = defaultOnline,
  mockFactory = createMockWeatherBundle,
  now = () => new Date(),
  onStorageError = () => {}
} = {}) {
  const locationStore = createLocationStore(storage);
  const weatherAdapter = adapter ?? createOpenMeteoAdapter({ fetchImpl, now });

  async function loadWeather(location, { allowOfflineDemo = false, demoMode = false } = {}) {
    if (!isWeatherLocation(location) || location.latitude === null || location.longitude === null) {
      throw new TypeError('Weather loading requires a WeatherLocation with coordinates.');
    }

    if (demoMode) return mockFactory(location, { now });

    if (!isOnline()) {
      if (allowOfflineDemo) return mockFactory(location, { now });
      throw weatherError('offline', 'Weather refresh requested while browser is offline.');
    }

    try {
      return await weatherAdapter.fetchWeather(location);
    } catch (error) {
      if (error instanceof WeatherDataError) throw error;
      throw weatherError('weather_fetch_failed', error?.message || 'Weather provider failed.', { cause: error });
    }
  }

  async function useLocation(location, options) {
    const weather = await loadWeather(location, options);
    const persistedLocation = weather.current?.location ?? location;
    try {
      locationStore.save(persistedLocation);
    } catch (error) {
      if (error instanceof WeatherDataError && error.code === 'storage_failed') {
        onStorageError(error);
      } else {
        throw error;
      }
    }
    return weather;
  }

  return {
    getSavedLocation() {
      return locationStore.load();
    },

    clearSavedLocation() {
      locationStore.clear();
    },

    search(query, options = {}) {
      return searchLocations(query, { fetchImpl, ...options });
    },

    async useBrowserLocation(options) {
      const location = await getBrowserLocation({ geolocation });
      return useLocation(location, options);
    },

    useLocation,
    loadWeather,

    async loadSavedLocation(options) {
      const saved = locationStore.load();
      if (!saved) return null;
      return useLocation(saved, options);
    }
  };
}
