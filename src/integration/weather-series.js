function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizePoint(point) {
  if (!point || typeof point !== 'object') return null;
  const time = point.time ?? point.observedAt ?? null;
  if (typeof time !== 'string' || !Number.isFinite(Date.parse(time)) || !finiteNumber(point.airTempC)) return null;
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

  return {
    weatherId: bundle.weatherId ?? sourceCurrent.snapshotId ?? `weather:${location.locationId ?? location.label}:${current.time}`,
    location: structuredClone(location),
    origin: bundle.origin ?? sourceCurrent.origin ?? 'api',
    source: bundle.source ?? sourceCurrent.source ?? 'unknown',
    fetchedAt: bundle.fetchedAt ?? sourceCurrent.fetchedAt ?? new Date().toISOString(),
    freshness: bundle.freshness ?? sourceCurrent.freshness ?? 'unknown',
    current,
    hourly
  };
}

export function markWeatherSeriesStale(series) {
  if (!series || typeof series !== 'object' || !series.current) return null;
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
    typeof value.current.time === 'string' &&
    finiteNumber(value.current.airTempC) &&
    value.location &&
    typeof value.location.label === 'string' &&
    Array.isArray(value.hourly)
  );
}
