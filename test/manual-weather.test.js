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

const MANUAL_VALUES = Object.freeze({
  airTempC: 7,
  windSpeedKmh: 30,
  windGustKmh: 45,
  precipProbabilityPct: 70,
  precipMm: 1.2,
  precipitationType: 'rain',
  uvIndex: 1
});

test('fresh API override is immutable, visible in origin and keeps only fresh API forecast data', () => {
  const original = sampleWeather();
  const result = applyManualWeatherOverride(original, MANUAL_VALUES, { now: () => new Date('2026-08-27T10:15:00.000Z') });

  assert.equal(original.current.airTempC, 18);
  assert.equal(original.current.apparentTempTrusted, true);
  assert.equal(result.origin, 'api_with_manual_override');
  assert.equal(result.source, 'open-meteo');
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

test('manual weather can be created without API or cache data', () => {
  const location = { locationId:'manual:salzburg', label:'Salzburg', latitude:47.8, longitude:13, timezone:'Europe/Vienna' };
  const result = applyManualWeatherOverride(null, {
    airTempC: 9,
    windSpeedKmh: null,
    windGustKmh: null,
    precipProbabilityPct: null,
    precipMm: null,
    precipitationType: 'unknown',
    uvIndex: null
  }, { now: () => new Date('2026-08-27T10:20:00.000Z'), location });

  assert.equal(result.origin, 'manual');
  assert.equal(result.source, 'manual');
  assert.equal(result.freshness, 'fresh');
  assert.equal(result.current.airTempC, 9);
  assert.equal(result.current.apparentTempC, null);
  assert.equal(result.current.windSpeedKmh, null);
  assert.equal(result.location.label, 'Salzburg');
  assert.deepEqual(result.hourly, []);
});

test('manual input over stale cache does not relabel stale forecast points as fresh API data', () => {
  const stale = sampleWeather();
  stale.origin = 'cache';
  stale.freshness = 'stale';
  const result = applyManualWeatherOverride(stale, MANUAL_VALUES, { now: () => new Date('2026-08-27T10:30:00.000Z') });

  assert.equal(result.origin, 'manual');
  assert.equal(result.source, 'manual');
  assert.equal(result.freshness, 'fresh');
  assert.equal(result.current.airTempC, 7);
  assert.deepEqual(result.hourly, []);
  assert.equal(result.current.cloudCoverPct, null);
  assert.equal(result.current.isDay, null);
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
  assert.throws(() => applyManualWeatherOverride({}, { airTempC: 20, precipitationType:'none' }), TypeError);
});
