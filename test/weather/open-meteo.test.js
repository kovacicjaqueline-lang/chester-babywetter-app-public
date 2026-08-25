import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildOpenMeteoForecastUrl,
  detectPrecipitationType,
  mapOpenMeteoResponse,
  toIsoInstant
} from '../../src/weather/open-meteo.js';

const LOCATION = {
  locationId: 'openmeteo:2766824',
  label: 'Salzburg, Salzburg, Österreich',
  latitude: 47.8095,
  longitude: 13.055,
  timezone: 'Europe/Vienna'
};

function fixture() {
  return {
    latitude: 47.81,
    longitude: 13.06,
    timezone: 'Europe/Vienna',
    timezone_abbreviation: 'CEST',
    utc_offset_seconds: 7200,
    current: {
      time: 1787655600,
      temperature_2m: 18.4,
      apparent_temperature: 17.1,
      wind_speed_10m: 17,
      wind_gusts_10m: 29,
      precipitation: 0,
      rain: 0,
      showers: 0,
      snowfall: 0,
      weather_code: 2,
      cloud_cover: 40,
      is_day: 1
    },
    hourly: {
      time: [1787652000, 1787655600, 1787659200],
      temperature_2m: [18, 18.4, 18.6],
      apparent_temperature: [16.8, 17.1, 17.3],
      wind_speed_10m: [16, 17, 18],
      wind_gusts_10m: [28, 29, 30],
      precipitation_probability: [10, 20, 55],
      precipitation: [0, 0, 0.6],
      rain: [0, 0, 0.6],
      showers: [0, 0, 0],
      snowfall: [0, 0, 0],
      weather_code: [2, 2, 61],
      cloud_cover: [35, 40, 70],
      is_day: [1, 1, 1],
      uv_index: [2.9, 3.2, 2.6]
    }
  };
}

test('maps Open-Meteo current and hourly data into WeatherSnapshot format', () => {
  const now = () => new Date('2026-08-25T11:31:10.000Z');
  const result = mapOpenMeteoResponse(fixture(), LOCATION, { now });

  assert.equal(result.current.source, 'open-meteo');
  assert.equal(result.current.origin, 'api');
  assert.equal(result.current.airTempC, 18.4);
  assert.equal(result.current.apparentTempC, 17.1);
  assert.equal(result.current.apparentTempTrusted, true);
  assert.deepEqual(result.current.apparentTempIncludes, ['wind', 'humidity', 'sun']);
  assert.equal(result.current.windSpeedKmh, 17);
  assert.equal(result.current.windGustKmh, 29);
  assert.equal(result.current.precipProbabilityPct, 20);
  assert.equal(result.current.precipMm, 0);
  assert.equal(result.current.precipitationType, 'none');
  assert.equal(result.current.uvIndex, 3.2);
  assert.equal(result.current.cloudCoverPct, 40);
  assert.equal(result.current.weatherCode, 2);
  assert.equal(result.current.isDay, true);
  assert.equal(result.current.location.timezone, 'Europe/Vienna');
  assert.equal(result.current.fetchedAt, '2026-08-25T11:31:10.000Z');
  assert.equal(result.hourly.length, 3);
  assert.equal(result.hourly[2].precipitationType, 'rain');
  assert.equal(result.hourly[2].weatherCode, 61);
});

test('normalizes Unix provider timestamps to timezone-safe ISO instants', () => {
  assert.equal(toIsoInstant(1787655600, 7200), '2026-08-25T11:00:00.000Z');
  assert.equal(toIsoInstant('2026-08-25T13:00', 7200), '2026-08-25T11:00:00.000Z');
  assert.equal(toIsoInstant('2026-12-25T13:00+01:00', 7200), '2026-12-25T12:00:00.000Z');
});

test('preserves missing optional values as null instead of zero', () => {
  const data = fixture();
  data.current.apparent_temperature = null;
  data.current.wind_gusts_10m = null;
  data.current.precipitation = null;
  data.current.rain = null;
  data.current.showers = null;
  data.current.snowfall = null;
  data.current.weather_code = null;
  data.current.cloud_cover = null;
  data.current.is_day = null;
  data.hourly.precipitation_probability[1] = null;
  data.hourly.uv_index[1] = null;

  const result = mapOpenMeteoResponse(data, LOCATION);
  assert.equal(result.current.apparentTempC, null);
  assert.equal(result.current.apparentTempTrusted, false);
  assert.deepEqual(result.current.apparentTempIncludes, []);
  assert.equal(result.current.windGustKmh, null);
  assert.equal(result.current.precipProbabilityPct, null);
  assert.equal(result.current.precipMm, null);
  assert.equal(result.current.precipitationType, 'unknown');
  assert.equal(result.current.uvIndex, null);
  assert.equal(result.current.cloudCoverPct, null);
  assert.equal(result.current.weatherCode, null);
  assert.equal(result.current.isDay, null);
});

test('detects rain, snow, sleet and dry conditions without outfit thresholds', () => {
  assert.equal(detectPrecipitationType({ rain: 0.4, snowfall: 0, weatherCode: 61 }), 'rain');
  assert.equal(detectPrecipitationType({ rain: 0, snowfall: 0.3, weatherCode: 71 }), 'snow');
  assert.equal(detectPrecipitationType({ rain: 0.2, snowfall: 0.1, weatherCode: 67 }), 'sleet');
  assert.equal(detectPrecipitationType({ rain: 0, snowfall: 0, precipitation: 0, weatherCode: 2 }), 'none');
  assert.equal(detectPrecipitationType({ rain: null, snowfall: null, precipitation: null, weatherCode: null }), 'unknown');
});

test('maps UV values independently of precipitation detection', () => {
  const data = fixture();
  data.hourly.uv_index[1] = 6.7;
  data.hourly.precipitation[1] = 1.2;
  data.hourly.rain[1] = 1.2;
  data.current.precipitation = 1.2;
  data.current.rain = 1.2;
  data.current.weather_code = 63;

  const result = mapOpenMeteoResponse(data, LOCATION);
  assert.equal(result.current.uvIndex, 6.7);
  assert.equal(result.current.precipitationType, 'rain');
});

test('builds an API-key-free forecast request with current and hourly fields', () => {
  const url = buildOpenMeteoForecastUrl(LOCATION);
  assert.equal(url.origin, 'https://api.open-meteo.com');
  assert.equal(url.searchParams.get('timezone'), 'auto');
  assert.equal(url.searchParams.get('timeformat'), 'unixtime');
  assert.match(url.searchParams.get('current'), /temperature_2m/);
  assert.match(url.searchParams.get('current'), /weather_code/);
  assert.match(url.searchParams.get('hourly'), /precipitation_probability/);
  assert.match(url.searchParams.get('hourly'), /uv_index/);
  assert.equal(url.searchParams.has('apikey'), false);
});
