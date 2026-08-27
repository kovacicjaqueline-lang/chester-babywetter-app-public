import test from 'node:test';
import assert from 'node:assert/strict';
import { applyManualWeatherOverride } from '../src/integration/manual-weather.js';

function sampleWeather() {
  return {
    weatherId: 'weather_test',
    location: { locationId:'loc', label:'Salzburg', latitude:47.8, longitude:13, timezone:'Europe/Vienna' },
    origin: 'api',
    source: 'open-meteo',
    fetchedAt: '2026-08-27T10:00:00.000Z',
    freshness: 'fresh',
    current: {
      time:'2026-08-27T10:00:00.000Z', airTempC:18, apparentTempC:17, apparentTempTrusted:true,
      apparentTempIncludes:['wind','humidity','sun'], windSpeedKmh:14, windGustKmh:22,
      precipProbabilityPct:20, precipMm:0, precipitationType:'none', uvIndex:3.4,
      cloudCoverPct:45, isDay:true, weatherCode:2
    },
    hourly: [{
      time:'2026-08-27T11:00:00.000Z', airTempC:19, apparentTempC:18, apparentTempTrusted:true,
      apparentTempIncludes:['wind','humidity','sun'], windSpeedKmh:15, windGustKmh:23,
      precipProbabilityPct:30, precipMm:0, precipitationType:'none', uvIndex:3.8,
      cloudCoverPct:40, isDay:true, weatherCode:2
    }]
  };
}

test('manual override is immutable, visible in origin and uses manual air temperature thermally', () => {
  const original = sampleWeather();
  const result = applyManualWeatherOverride(original, {
    airTempC: 7,
    windSpeedKmh: 30,
    windGustKmh: 45,
    precipProbabilityPct: 70,
    precipMm: 1.2,
    precipitationType: 'rain',
    uvIndex: 1
  }, { now: () => new Date('2026-08-27T10:15:00.000Z') });

  assert.equal(original.current.airTempC, 18);
  assert.equal(original.current.apparentTempTrusted, true);
  assert.equal(result.origin, 'api_with_manual_override');
  assert.equal(result.freshness, 'fresh');
  assert.equal(result.current.airTempC, 7);
  assert.equal(result.current.apparentTempC, null);
  assert.equal(result.current.apparentTempTrusted, false);
  assert.deepEqual(result.current.apparentTempIncludes, []);
  assert.equal(result.current.windSpeedKmh, 30);
  assert.equal(result.current.precipProbabilityPct, 70);
  assert.equal(result.current.precipitationType, 'rain');
  assert.equal(result.current.weatherCode, 61);
  assert.deepEqual(result.hourly, original.hourly);
  assert.notEqual(result.hourly, original.hourly);
});

test('manual override permits unknown optional values but validates ranges', () => {
  const result = applyManualWeatherOverride(sampleWeather(), {
    airTempC: 20,
    windSpeedKmh: null,
    windGustKmh: null,
    precipProbabilityPct: null,
    precipMm: null,
    precipitationType: 'unknown',
    uvIndex: null
  });
  assert.equal(result.current.windSpeedKmh, null);
  assert.equal(result.current.precipProbabilityPct, null);
  assert.equal(result.current.uvIndex, null);
  assert.throws(() => applyManualWeatherOverride(sampleWeather(), { airTempC: 20, windSpeedKmh: -1, precipitationType:'none' }), RangeError);
  assert.throws(() => applyManualWeatherOverride(sampleWeather(), { airTempC: 20, precipProbabilityPct: 101, precipitationType:'none' }), RangeError);
});
