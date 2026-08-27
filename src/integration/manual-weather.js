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

export function applyManualWeatherOverride(weather, overrides, { now = () => new Date() } = {}) {
  if (!weather || typeof weather !== 'object' || !weather.current || typeof weather.current !== 'object') {
    throw new TypeError('A current WeatherSeries is required.');
  }
  if (!overrides || typeof overrides !== 'object') throw new TypeError('Manual weather overrides are required.');

  const airTempC = requiredNumber(overrides.airTempC, 'airTempC', -60, 60);
  const windSpeedKmh = optionalNumber(overrides.windSpeedKmh, 'windSpeedKmh', 0, 250);
  const windGustKmh = optionalNumber(overrides.windGustKmh, 'windGustKmh', 0, 300);
  const precipProbabilityPct = optionalNumber(overrides.precipProbabilityPct, 'precipProbabilityPct', 0, 100);
  const precipMm = optionalNumber(overrides.precipMm, 'precipMm', 0, 500);
  const uvIndex = optionalNumber(overrides.uvIndex, 'uvIndex', 0, 20);
  const precipitationType = PRECIPITATION_TYPES.has(overrides.precipitationType) ? overrides.precipitationType : 'unknown';
  const timestamp = now().toISOString();

  return {
    ...weather,
    weatherId: `${weather.weatherId || 'weather'}:manual:${timestamp}`,
    origin: weather.origin === 'manual' ? 'manual' : 'api_with_manual_override',
    fetchedAt: timestamp,
    freshness: 'fresh',
    current: {
      ...weather.current,
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
      weatherCode: weatherCodeFor(precipitationType, weather.current.weatherCode)
    },
    hourly: Array.isArray(weather.hourly) ? weather.hourly.map((point) => ({ ...point })) : []
  };
}
