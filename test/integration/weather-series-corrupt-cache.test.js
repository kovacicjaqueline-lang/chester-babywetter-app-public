import test from 'node:test';
import assert from 'node:assert/strict';
import { assessCachedWeatherSeries, normalizeWeatherBundle } from '../../src/integration/weather-series.js';

const location = { locationId:'loc', label:'Salzburg', latitude:47.8, longitude:13, timezone:'Europe/Vienna' };

function snapshot(time, airTempC = 18) {
  return {
    snapshotId:`snapshot:${time}`,
    location,
    origin:'api',
    source:'open-meteo',
    observedAt:time,
    fetchedAt:'2026-08-26T10:00:00.000Z',
    freshness:'fresh',
    airTempC,
    apparentTempC:null,
    apparentTempTrusted:false,
    apparentTempIncludes:[],
    windSpeedKmh:null,
    windGustKmh:null,
    precipProbabilityPct:null,
    precipMm:null,
    precipitationType:'unknown',
    uvIndex:null,
    cloudCoverPct:null,
    isDay:null,
    weatherCode:null
  };
}

test('corrupt hourly point is never promoted to current for stale cache', () => {
  const series = normalizeWeatherBundle({
    current:snapshot('2026-08-26T10:00:00.000Z'),
    hourly:[snapshot('2026-08-26T11:00:00.000Z'), snapshot('2026-08-26T12:00:00.000Z')]
  }, location);
  series.hourly[0] = { ...series.hourly[0], airTempC:null };

  const result = assessCachedWeatherSeries(series, {
    location,
    now:() => new Date('2026-08-26T11:20:00.000Z')
  });

  assert.equal(result.status, 'stale');
  assert.equal(result.series.current.time, '2026-08-26T10:00:00.000Z');
  assert.equal(result.series.current.airTempC, 18);
  assert.deepEqual(result.series.hourly.map((point) => point.time), [
    '2026-08-26T12:00:00.000Z'
  ]);
});
