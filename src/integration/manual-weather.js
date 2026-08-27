const PRECIPITATION_TYPES = new Set(['none', 'rain', 'snow', 'sleet', 'unknown']);

function requiredNumber(value, field, min, max) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new RangeError(`${field} must be between ${min} and ${max}`);
  }
  return value;
}

function optionalNumber(value, field, min, max) {
  if (value == null) return null;
  return requiredNumber(value, field, min, max);
}

function weatherCodeFor(type, previousCode) {
  if (type === 'rain' || type === 'sleet') return 61;
  if (type === 'snow') return 71;
  if (type === 'none') return 2;
  return Number.isInteger(previousCode) ? previousCode : null;
}

function isLocation(value) {
  return Boolean(value && typeof value === 'object' && typeof value.label === 'string' && value.label.trim());
}

function manualLocation(weather, location) {
  const candidate = isLocation(weather?.location) ? weather.location : location;
  if (isLocation(candidate)) return structuredClone(candidate);
  return { locationId: null, label: 'Manuell', latitude: null, longitude: null, timezone: null };
}

function canReuseApiForecast(weather) {
  return Boolean(
    weather &&
    typeof weather === 'object' &&
    weather.current &&
    typeof weather.current === 'object' &&
    weather.freshness === 'fresh' &&
    ['api', 'api_with_manual_override'].includes(weather.origin)
  );
}

export function applyManualWeatherOverride(weather, overrides, { now = () => new Date(), location = null } = {}) {
  if (weather != null && (typeof weather !== 'object' || !weather.current || typeof weather.current !== 'object')) {
    throw new TypeError('weather must be a WeatherSeries or null.');
  }
  if (!overrides || typeof overrides !== 'object') throw new TypeError('Manual weather overrides are required.');

  const airTempC = requiredNumber(overrides.airTempC, 'airTempC', -60, 60);
  const windSpeedKmh = optionalNumber(overrides.windSpeedKmh, 'windSpeedKmh', 0, 250);
  const windGustKmh = optionalNumber(overrides.windGustKmh, 'windGustKmh', 0, 300);
  const precipProbabilityPct = optionalNumber(overrides.precipProbabilityPct, 'precipProbabilityPct', 0, 100);
  const precipMm = optionalNumber(overrides.precipMm, 'precipMm', 0, 500);
  const uvIndex = optionalNumber(overrides.uvIndex, 'uvIndex', 0, 20);
  const precipitationType = PRECIPITATION_TYPES.has(overrides.precipitationType) ? overrides.precipitationType : 'unknown';
  const instant = now();
  if (!(instant instanceof Date) || !Number.isFinite(instant.getTime())) throw new TypeError('now must return a valid Date.');
  const timestamp = instant.toISOString();
  const reuseApiForecast = canReuseApiForecast(weather);
  const retainedCurrent = reuseApiForecast ? weather.current : null;
  const origin = reuseApiForecast ? 'api_with_manual_override' : 'manual';

  return {
    weatherId: `${weather?.weatherId || 'weather:manual'}:manual:${timestamp}`,
    location: manualLocation(weather, location),
    origin,
    source: reuseApiForecast ? (weather.source || 'unknown') : 'manual',
    fetchedAt: timestamp,
    freshness: 'fresh',
    current: {
      time: timestamp,
      airTempC,
      apparentTempC: null,
      apparentTempTrusted: false,
      apparentTempIncludes: [],
      windSpeedKmh,
      windGustKmh,
      precipProbabilityPct,
      precipMm,
      precipitationType,
      uvIndex,
      cloudCoverPct: Number.isFinite(retainedCurrent?.cloudCoverPct) ? retainedCurrent.cloudCoverPct : null,
      isDay: typeof retainedCurrent?.isDay === 'boolean' ? retainedCurrent.isDay : null,
      weatherCode: weatherCodeFor(precipitationType, retainedCurrent?.weatherCode)
    },
    hourly: reuseApiForecast && Array.isArray(weather.hourly)
      ? weather.hourly.map((point) => ({ ...point }))
      : []
  };
}
