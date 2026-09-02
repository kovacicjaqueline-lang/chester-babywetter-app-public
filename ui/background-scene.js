import { deriveBackgroundScene } from '../src/integration/background-scene.js';
import { getHourlySelectionSnapshot } from '../src/integration/hourly-selection.js';
import {
  WEATHER_CACHE_MAX_AGE_MINUTES,
  WEATHER_FRESH_MAX_AGE_MINUTES,
  assessCachedWeatherSeries
} from '../src/integration/weather-series.js';
import { isWeatherLocation, LAST_LOCATION_STORAGE_KEY } from '../src/weather/location.js';

const WEATHER_CACHE_KEY = 'babyweather.v1.weatherCache';
const SETTINGS_KEY = 'babyweather.v1.settings';
let observer = null;
let refreshQueued = false;

function safeParse(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function configuredWeatherMaxAge() {
  const configured = safeParse(SETTINGS_KEY)?.weatherCacheMaxAgeMinutes;
  if (typeof configured !== 'number' || !Number.isFinite(configured)) return WEATHER_CACHE_MAX_AGE_MINUTES;
  return Math.min(WEATHER_CACHE_MAX_AGE_MINUTES, Math.max(WEATHER_FRESH_MAX_AGE_MINUTES, Math.round(configured)));
}

function activeWeatherSeries() {
  const candidate = safeParse(WEATHER_CACHE_KEY);
  const savedLocation = safeParse(LAST_LOCATION_STORAGE_KEY);
  const assessment = assessCachedWeatherSeries(candidate, {
    location: isWeatherLocation(savedLocation) ? savedLocation : null,
    maxAgeMinutes: configuredWeatherMaxAge()
  });
  return assessment.series;
}

function applyScene(scene) {
  const body = document.body;
  if (!body) return;
  body.dataset.sceneTime = scene.timeOfDay;
  body.dataset.sceneWeather = scene.weather;
  body.dataset.sceneSource = scene.source;
  if (scene.pointTime) body.dataset.scenePointTime = scene.pointTime;
  else delete body.dataset.scenePointTime;
}

export function refreshBackgroundScene() {
  try {
    const weather = activeWeatherSeries();
    const selection = getHourlySelectionSnapshot();
    applyScene(deriveBackgroundScene({ weather, selection, location: weather?.location ?? null }));
  } catch {
    applyScene(deriveBackgroundScene());
  }
}

function queueRefresh() {
  if (refreshQueued) return;
  refreshQueued = true;
  queueMicrotask(() => {
    refreshQueued = false;
    refreshBackgroundScene();
  });
}

function initBackgroundScene() {
  refreshBackgroundScene();
  const hourly = document.querySelector('#hourlyForecast');
  if (hourly && !observer) {
    observer = new MutationObserver(queueRefresh);
    observer.observe(hourly, { childList: true });
  }
  window.addEventListener('online', queueRefresh);
  window.addEventListener('offline', queueRefresh);
  window.addEventListener('storage', queueRefresh);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) queueRefresh();
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initBackgroundScene, { once: true });
else initBackgroundScene();
