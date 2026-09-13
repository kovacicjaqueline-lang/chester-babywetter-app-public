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

export function normalizeTemperatureToHalfDegree(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return value;
  return Number((Math.round(value * 2) / 2).toFixed(1));
}

export function manualWeatherCodeFor({
  precipitationType = 'unknown',
  precipMm = null,
  precipProbabilityPct = null,
  uvIndex = null
} = {}) {
  if (precipitationType === 'rain' || precipitationType === 'sleet') return 61;
  if (precipitationType === 'snow') return 71;
  if (precipMm > 0 || precipProbabilityPct >= 60) return 61;
  if (typeof uvIndex !== 'number' || !Number.isFinite(uvIndex)) return null;
  if (uvIndex >= 6) return 0;
  if (uvIndex >= 3) return 1;
  return 3;
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
      cloudCoverPct: null,
      isDay: typeof retainedCurrent?.isDay === 'boolean' ? retainedCurrent.isDay : null,
      weatherCode: manualWeatherCodeFor({ precipitationType, precipMm, precipProbabilityPct, uvIndex })
    },
    hourly: reuseApiForecast && Array.isArray(weather.hourly)
      ? weather.hourly.map((point) => ({ ...point }))
      : []
  };
}
