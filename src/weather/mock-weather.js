function iso(date) {
  return new Date(date).toISOString();
}

function baseSnapshot(location, observedAt, fetchedAt, index = 0) {
  const rain = index === 2 ? 0.7 : 0;
  return {
    snapshotId: `mock:${index}:${observedAt}`,
    location,
    origin: 'cache',
    source: 'mock_offline_demo',
    observedAt,
    fetchedAt,
    freshness: 'unknown',
    airTempC: 18 - index * 0.3,
    apparentTempC: 17.2 - index * 0.3,
    apparentTempTrusted: true,
    apparentTempIncludes: ['wind', 'humidity', 'sun'],
    windSpeedKmh: 14 + index,
    windGustKmh: 24 + index,
    precipProbabilityPct: index === 2 ? 70 : 20,
    precipMm: rain,
    precipitationType: rain > 0 ? 'rain' : 'none',
    uvIndex: Math.max(0, 3.4 - index * 0.4),
    cloudCoverPct: 45 + index * 4,
    isDay: true,
    weatherCode: rain > 0 ? 61 : 2
  };
}

export function createMockWeatherBundle(location, { now = () => new Date() } = {}) {
  const fetched = now();
  const fetchedAt = fetched.toISOString();
  const currentObservedAt = fetchedAt;
  const normalizedLocation = {
    locationId: location?.locationId ?? 'mock:location',
    label: location?.label ?? 'Offline-Demo',
    latitude: location?.latitude ?? null,
    longitude: location?.longitude ?? null,
    timezone: location?.timezone ?? 'Europe/Vienna'
  };
  const hourly = Array.from({ length: 6 }, (_, index) => {
    const at = new Date(fetched.getTime() + index * 60 * 60 * 1000);
    return baseSnapshot(normalizedLocation, iso(at), fetchedAt, index);
  });
  return {
    current: { ...baseSnapshot(normalizedLocation, currentObservedAt, fetchedAt), snapshotId: `mock:current:${currentObservedAt}` },
    hourly
  };
}
