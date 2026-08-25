import { weatherError, WeatherDataError } from './errors.js';
import { isWeatherLocation } from './location.js';

export const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
export const OPEN_METEO_SOURCE = 'open-meteo';

const CURRENT_FIELDS = [
  'temperature_2m',
  'apparent_temperature',
  'wind_speed_10m',
  'wind_gusts_10m',
  'precipitation',
  'rain',
  'showers',
  'snowfall',
  'weather_code',
  'cloud_cover',
  'is_day',
  'uv_index'
];

const HOURLY_FIELDS = [
  'temperature_2m',
  'apparent_temperature',
  'wind_speed_10m',
  'wind_gusts_10m',
  'precipitation_probability',
  'precipitation',
  'rain',
  'showers',
  'snowfall',
  'weather_code',
  'cloud_cover',
  'is_day',
  'uv_index'
];

function numberOrNull(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function requiredNumber(value, field) {
  const normalized = numberOrNull(value);
  if (normalized === null) {
    throw weatherError('invalid_weather_response', `Missing required weather field: ${field}`);
  }
  return normalized;
}

function integerOrNull(value) {
  const normalized = numberOrNull(value);
  return normalized === null ? null : Math.trunc(normalized);
}

function boolOrNull(value) {
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;
  return null;
}

export function toIsoInstant(value, utcOffsetSeconds = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value * 1000).toISOString();
  }
  if (typeof value !== 'string' || !value.trim()) return null;
  const text = value.trim();
  const explicitZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(text);
  const millis = explicitZone
    ? Date.parse(text)
    : Date.parse(`${text}Z`) - (Number.isFinite(utcOffsetSeconds) ? utcOffsetSeconds * 1000 : 0);
  return Number.isFinite(millis) ? new Date(millis).toISOString() : null;
}

export function detectPrecipitationType({ rain, showers, snowfall, precipitation, weatherCode }) {
  const rainMm = numberOrNull(rain);
  const showerMm = numberOrNull(showers);
  const snowCm = numberOrNull(snowfall);
  const precipMm = numberOrNull(precipitation);
  const code = integerOrNull(weatherCode);

  const hasLiquid = (rainMm ?? 0) > 0 || (showerMm ?? 0) > 0;
  const hasSnow = (snowCm ?? 0) > 0;
  if (hasLiquid && hasSnow) return 'sleet';
  if (hasSnow) return 'snow';
  if (hasLiquid) return 'rain';

  if (code !== null) {
    if ([56, 57, 66, 67].includes(code)) return 'sleet';
    if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow';
    if ((code >= 51 && code <= 65) || (code >= 80 && code <= 82) || (code >= 95 && code <= 99)) return 'rain';
    if ([0, 1, 2, 3, 45, 48].includes(code) && (precipMm ?? 0) <= 0) return 'none';
  }

  if (precipMm !== null) return precipMm > 0 ? 'rain' : 'none';
  return 'unknown';
}

function makeLocation(requestedLocation, payload) {
  return {
    locationId: requestedLocation.locationId,
    label: requestedLocation.label,
    latitude: numberOrNull(requestedLocation.latitude),
    longitude: numberOrNull(requestedLocation.longitude),
    timezone: typeof payload?.timezone === 'string' ? payload.timezone : requestedLocation.timezone ?? null
  };
}

function arrayValue(hourly, field, index) {
  const values = hourly?.[field];
  return Array.isArray(values) ? values[index] : null;
}

function snapshotFromValues({ values, location, observedAt, fetchedAt, snapshotId }) {
  const apparentTempC = numberOrNull(values.apparent_temperature);
  const weatherCode = integerOrNull(values.weather_code);
  return {
    snapshotId,
    location,
    origin: 'api',
    source: OPEN_METEO_SOURCE,
    observedAt,
    fetchedAt,
    freshness: 'fresh',
    airTempC: requiredNumber(values.temperature_2m, 'temperature_2m'),
    apparentTempC,
    apparentTempTrusted: apparentTempC !== null,
    apparentTempIncludes: apparentTempC === null ? [] : ['wind', 'humidity', 'sun'],
    windSpeedKmh: numberOrNull(values.wind_speed_10m),
    windGustKmh: numberOrNull(values.wind_gusts_10m),
    precipProbabilityPct: numberOrNull(values.precipitation_probability),
    precipMm: numberOrNull(values.precipitation),
    precipitationType: detectPrecipitationType({
      rain: values.rain,
      showers: values.showers,
      snowfall: values.snowfall,
      precipitation: values.precipitation,
      weatherCode
    }),
    uvIndex: numberOrNull(values.uv_index),
    cloudCoverPct: numberOrNull(values.cloud_cover),
    isDay: boolOrNull(values.is_day),
    weatherCode
  };
}

function nearestHourlyIndex(hourlyTimes, targetSeconds) {
  if (!Array.isArray(hourlyTimes) || !hourlyTimes.length || !Number.isFinite(targetSeconds)) return -1;
  let bestIndex = -1;
  let bestDistance = Infinity;
  hourlyTimes.forEach((value, index) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return;
    const distance = Math.abs(value - targetSeconds);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });
  return bestIndex;
}

export function mapOpenMeteoResponse(payload, requestedLocation, { now = () => new Date() } = {}) {
  if (!payload || typeof payload !== 'object' || payload.error) {
    throw weatherError('invalid_weather_response', payload?.reason || 'Open-Meteo response is not a forecast object.');
  }
  if (!isWeatherLocation(requestedLocation) || requestedLocation.latitude === null || requestedLocation.longitude === null) {
    throw new TypeError('Open-Meteo weather requests require a WeatherLocation with coordinates.');
  }

  const fetchedAt = now().toISOString();
  const offset = numberOrNull(payload.utc_offset_seconds) ?? 0;
  const location = makeLocation(requestedLocation, payload);
  const currentTime = payload.current?.time;
  const currentObservedAt = toIsoInstant(currentTime, offset);
  if (!currentObservedAt) {
    throw weatherError('invalid_weather_response', 'Open-Meteo response is missing a valid current time.');
  }

  const nearestIndex = nearestHourlyIndex(payload.hourly?.time, typeof currentTime === 'number' ? currentTime : NaN);
  const currentValues = { ...payload.current };
  if (nearestIndex >= 0) {
    for (const field of ['precipitation_probability', 'uv_index']) {
      if (numberOrNull(currentValues[field]) === null) currentValues[field] = arrayValue(payload.hourly, field, nearestIndex);
    }
  }

  const current = snapshotFromValues({
    values: currentValues,
    location,
    observedAt: currentObservedAt,
    fetchedAt,
    snapshotId: `weather:${location.locationId ?? `${location.latitude},${location.longitude}`}:${currentObservedAt}`
  });

  const hourlyTimes = Array.isArray(payload.hourly?.time) ? payload.hourly.time : [];
  const hourly = hourlyTimes.flatMap((time, index) => {
    const observedAt = toIsoInstant(time, offset);
    if (!observedAt) return [];
    const values = Object.fromEntries(HOURLY_FIELDS.map((field) => [field, arrayValue(payload.hourly, field, index)]));
    try {
      return [
        snapshotFromValues({
          values,
          location,
          observedAt,
          fetchedAt,
          snapshotId: `weather:${location.locationId ?? `${location.latitude},${location.longitude}`}:${observedAt}`
        })
      ];
    } catch (error) {
      if (error instanceof WeatherDataError && error.code === 'invalid_weather_response') return [];
      throw error;
    }
  });

  return { current, hourly };
}

export function buildOpenMeteoForecastUrl(location, { endpoint = OPEN_METEO_FORECAST_URL } = {}) {
  if (!isWeatherLocation(location) || location.latitude === null || location.longitude === null) {
    throw new TypeError('Open-Meteo weather requests require a WeatherLocation with coordinates.');
  }
  const url = new URL(endpoint);
  url.searchParams.set('latitude', String(location.latitude));
  url.searchParams.set('longitude', String(location.longitude));
  url.searchParams.set('current', CURRENT_FIELDS.join(','));
  url.searchParams.set('hourly', HOURLY_FIELDS.join(','));
  url.searchParams.set('forecast_hours', '24');
  url.searchParams.set('past_hours', '1');
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('timeformat', 'unixtime');
  url.searchParams.set('temperature_unit', 'celsius');
  url.searchParams.set('wind_speed_unit', 'kmh');
  url.searchParams.set('precipitation_unit', 'mm');
  return url;
}

export function createOpenMeteoAdapter({ fetchImpl = globalThis.fetch, now = () => new Date(), endpoint = OPEN_METEO_FORECAST_URL } = {}) {
  return {
    async fetchWeather(location) {
      const url = buildOpenMeteoForecastUrl(location, { endpoint });
      let response;
      try {
        response = await fetchImpl(url);
      } catch (cause) {
        throw weatherError('weather_fetch_failed', 'Open-Meteo network request failed.', { cause });
      }
      if (!response?.ok) {
        let reason = '';
        try {
          const body = await response.json();
          reason = body?.reason ? ` ${body.reason}` : '';
        } catch {
          // Ignore an unreadable error body.
        }
        throw weatherError('weather_fetch_failed', `Open-Meteo returned HTTP ${response?.status ?? 'unknown'}.${reason}`);
      }
      let payload;
      try {
        payload = await response.json();
      } catch (cause) {
        throw weatherError('invalid_weather_response', 'Open-Meteo returned invalid JSON.', { cause });
      }
      return mapOpenMeteoResponse(payload, location, { now });
    }
  };
}
