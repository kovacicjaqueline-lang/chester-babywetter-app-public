export const WEATHER_FRESH_MAX_AGE_MINUTES = 30;
export const WEATHER_CACHE_MAX_AGE_MINUTES = 120;
export const WEATHER_CACHE_CLOCK_SKEW_MINUTES = 5;
export const DEFAULT_WEATHER_RISK_WINDOW_MINUTES = 120;

function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function validDateString(value) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function manualOrigin(origin) {
  return origin === 'manual' || origin === 'api_with_manual_override';
}

function normalizePoint(point) {
  if (!point || typeof point !== 'object') return null;
  const time = point.time ?? point.observedAt ?? null;
  if (!validDateString(time) || !finiteNumber(point.airTempC)) return null;
  return {
    time,
    airTempC: point.airTempC,
    apparentTempC: finiteNumber(point.apparentTempC) ? point.apparentTempC : null,
    apparentTempTrusted: Boolean(point.apparentTempTrusted && finiteNumber(point.apparentTempC)),
    apparentTempIncludes: Array.isArray(point.apparentTempIncludes) ? [...point.apparentTempIncludes] : [],
    windSpeedKmh: finiteNumber(point.windSpeedKmh) ? point.windSpeedKmh : null,
    windGustKmh: finiteNumber(point.windGustKmh) ? point.windGustKmh : null,
    precipProbabilityPct: finiteNumber(point.precipProbabilityPct) ? point.precipProbabilityPct : null,
    precipMm: finiteNumber(point.precipMm) ? point.precipMm : null,
    precipitationType: typeof point.precipitationType === 'string' ? point.precipitationType : 'unknown',
    uvIndex: finiteNumber(point.uvIndex) ? point.uvIndex : null,
    cloudCoverPct: finiteNumber(point.cloudCoverPct) ? point.cloudCoverPct : null,
    isDay: typeof point.isDay === 'boolean' ? point.isDay : null,
    weatherCode: finiteNumber(point.weatherCode) ? point.weatherCode : null
  };
}

export function normalizeWeatherBundle(bundle, fallbackLocation = null) {
  if (!bundle || typeof bundle !== 'object') throw new TypeError('weather bundle is required');
  const current = normalizePoint(bundle.current);
  if (!current) throw new TypeError('weather bundle requires a valid current point');
  const sourceCurrent = bundle.current;
  const location = sourceCurrent.location ?? bundle.location ?? fallbackLocation;
  if (!location || typeof location.label !== 'string') throw new TypeError('weather bundle requires a location');
  const hourly = (Array.isArray(bundle.hourly) ? bundle.hourly : [])
    .map(normalizePoint)
    .filter(Boolean)
    .filter((point) => Date.parse(point.time) > Date.parse(current.time))
    .sort((a, b) => Date.parse(a.time) - Date.parse(b.time));

  const fetchedAt = bundle.fetchedAt ?? sourceCurrent.fetchedAt ?? null;
  if (!validDateString(fetchedAt)) throw new TypeError('weather bundle requires a valid fetchedAt timestamp');

  return {
    weatherId: bundle.weatherId ?? sourceCurrent.snapshotId ?? `weather:${location.locationId ?? location.label}:${current.time}`,
    location: structuredClone(location),
    origin: bundle.origin ?? sourceCurrent.origin ?? 'api',
    source: bundle.source ?? sourceCurrent.source ?? 'unknown',
    fetchedAt,
    freshness: bundle.freshness ?? sourceCurrent.freshness ?? 'unknown',
    current,
    hourly
  };
}

export function markWeatherSeriesStale(series) {
  if (!isWeatherSeries(series)) return null;
  return {
    ...structuredClone(series),
    origin: 'cache',
    freshness: 'stale'
  };
}

export function isWeatherSeries(value) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    value.current &&
    validDateString(value.current.time) &&
    finiteNumber(value.current.airTempC) &&
    value.location &&
    typeof value.location.label === 'string' &&
    validDateString(value.fetchedAt) &&
    Array.isArray(value.hourly)
  );
}

export function sameWeatherLocation(left, right) {
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
  if (typeof left.locationId === 'string' && left.locationId && typeof right.locationId === 'string' && right.locationId) {
    return left.locationId === right.locationId;
  }
  if ([left.latitude, left.longitude, right.latitude, right.longitude].every(finiteNumber)) {
    return Math.abs(left.latitude - right.latitude) <= 0.001 && Math.abs(left.longitude - right.longitude) <= 0.001;
  }
  return false;
}

function alignStaleSeriesToNow(series, nowMs) {
  const currentMs = Date.parse(series.current.time);
  const promoted = series.hourly
    .filter((point) => validDateString(point?.time) && finiteNumber(point?.airTempC))
    .filter((point) => {
      const pointMs = Date.parse(point.time);
      return pointMs > currentMs && pointMs <= nowMs;
    })
    .sort((left, right) => Date.parse(left.time) - Date.parse(right.time))
    .at(-1);

  if (!promoted) return series;
  const promotedMs = Date.parse(promoted.time);
  return {
    ...series,
    current: structuredClone(promoted),
    hourly: series.hourly.filter((point) => validDateString(point?.time) && finiteNumber(point?.airTempC) && Date.parse(point.time) > promotedMs)
  };
}

export function compensateWeatherRiskHorizon(
  context,
  weather,
  {
    now = () => new Date(),
    defaultWindowMinutes = DEFAULT_WEATHER_RISK_WINDOW_MINUTES
  } = {}
) {
  const adjusted = structuredClone(context ?? {});
  if (!weather || weather.freshness !== 'stale' || !validDateString(weather.current?.time)) return adjusted;

  const nowValue = now();
  const nowMs = nowValue instanceof Date ? nowValue.getTime() : Date.parse(nowValue);
  const currentMs = Date.parse(weather.current.time);
  if (!Number.isFinite(nowMs) || !Number.isFinite(currentMs) || nowMs <= currentMs) return adjusted;

  const lagMinutes = (nowMs - currentMs) / 60000;
  const fallbackWindow = finiteNumber(defaultWindowMinutes) && defaultWindowMinutes >= 0
    ? defaultWindowMinutes
    : DEFAULT_WEATHER_RISK_WINDOW_MINUTES;

  if (['outdoor', 'stroller', 'carrier'].includes(adjusted.mode)) {
    const planned = finiteNumber(adjusted.plannedMinutes) ? Math.max(0, adjusted.plannedMinutes) : fallbackWindow;
    adjusted.plannedMinutes = planned + lagMinutes;
  } else if (adjusted.mode === 'car' && adjusted.includeOutdoorTransition) {
    const transition = finiteNumber(adjusted.outsideTransitionMinutes)
      ? Math.max(0, adjusted.outsideTransitionMinutes)
      : finiteNumber(adjusted.plannedMinutes)
        ? Math.max(0, adjusted.plannedMinutes)
        : fallbackWindow;
    adjusted.outsideTransitionMinutes = transition + lagMinutes;
  }

  return adjusted;
}

export function assessCachedWeatherSeries(
  candidate,
  {
    location = null,
    now = () => new Date(),
    freshMaxAgeMinutes = WEATHER_FRESH_MAX_AGE_MINUTES,
    maxAgeMinutes = WEATHER_CACHE_MAX_AGE_MINUTES,
    maxClockSkewMinutes = WEATHER_CACHE_CLOCK_SKEW_MINUTES
  } = {}
) {
  const sourceOrigin = candidate && typeof candidate === 'object' && typeof candidate.origin === 'string'
    ? candidate.origin
    : null;
  if (!isWeatherSeries(candidate)) return { status: 'invalid', ageMinutes: null, sourceOrigin, series: null };
  if (location && !sameWeatherLocation(candidate.location, location)) {
    return { status: 'location_mismatch', ageMinutes: null, sourceOrigin, series: null };
  }

  const nowValue = now();
  const nowMs = nowValue instanceof Date ? nowValue.getTime() : Date.parse(nowValue);
  const fetchedMs = Date.parse(candidate.fetchedAt);
  if (!Number.isFinite(nowMs) || !Number.isFinite(fetchedMs)) {
    return { status: 'invalid', ageMinutes: null, sourceOrigin, series: null };
  }

  const rawAgeMinutes = (nowMs - fetchedMs) / 60000;
  if (rawAgeMinutes < -Math.abs(maxClockSkewMinutes)) {
    return { status: 'invalid', ageMinutes: rawAgeMinutes, sourceOrigin, series: null };
  }
  const ageMinutes = Math.max(0, rawAgeMinutes);
  if (!finiteNumber(maxAgeMinutes) || maxAgeMinutes < 0 || ageMinutes > maxAgeMinutes) {
    return { status: 'expired', ageMinutes, sourceOrigin, series: null };
  }

  const freshness = ageMinutes <= freshMaxAgeMinutes ? 'fresh' : 'stale';
  let series = {
    ...structuredClone(candidate),
    origin: manualOrigin(candidate.origin) ? candidate.origin : 'cache',
    freshness
  };
  if (freshness === 'stale' && !manualOrigin(candidate.origin)) series = alignStaleSeriesToNow(series, nowMs);

  return {
    status: freshness,
    ageMinutes,
    sourceOrigin,
    series
  };
}
