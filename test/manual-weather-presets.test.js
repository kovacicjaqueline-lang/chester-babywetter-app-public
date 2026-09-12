import test from 'node:test';
import assert from 'node:assert/strict';
import { manualWeatherValuesFromPresets, precipitationPresetForWeather, sunPresetForWeather, windPresetForWeather } from '../src/integration/manual-weather-presets.js';

test('manual weather presets map to existing engine thresholds', () => {
  assert.deepEqual(manualWeatherValuesFromPresets({ temperatureC: 5, wind:'windy', precipitation:'rain', sun:'bright' }), {
    airTempC:5, windSpeedKmh:29, windGustKmh:38, precipProbabilityPct:70, precipMm:1, precipitationType:'rain', uvIndex:3
  });
  assert.deepEqual(manualWeatherValuesFromPresets({ temperatureC: 5, wind:'very_strong', precipitation:'snow', sun:'sunny' }), {
    airTempC:5, windSpeedKmh:50, windGustKmh:60, precipProbabilityPct:70, precipMm:1, precipitationType:'snow', uvIndex:6
  });
});

test('current weather is reduced to understandable states without dropping safety-relevant thresholds', () => {
  assert.equal(windPresetForWeather({ windSpeedKmh:14, windGustKmh:22 }), 'light');
  assert.equal(windPresetForWeather({ windSpeedKmh:29, windGustKmh:38 }), 'windy');
  assert.equal(windPresetForWeather({ windSpeedKmh:39, windGustKmh:49 }), 'strong');
  assert.equal(windPresetForWeather({ windSpeedKmh:50, windGustKmh:60 }), 'very_strong');
  assert.equal(windPresetForWeather({ windSpeedKmh:null, windGustKmh:null }), 'unknown');
  assert.equal(precipitationPresetForWeather({ precipitationType:'sleet' }), 'sleet');
  assert.equal(precipitationPresetForWeather({ precipitationType:'none', precipProbabilityPct:70, precipMm:0 }), 'rain');
  assert.equal(precipitationPresetForWeather({ precipitationType:'none', precipProbabilityPct:0, precipMm:2 }), 'rain');
  assert.equal(precipitationPresetForWeather({ precipitationType:'unknown' }), 'unknown');
  assert.equal(sunPresetForWeather({ uvIndex:2.9 }), 'cloudy');
  assert.equal(sunPresetForWeather({ uvIndex:3 }), 'bright');
  assert.equal(sunPresetForWeather({ uvIndex:6 }), 'sunny');
});

test('unknown selections remain unknown instead of becoming zero', () => {
  assert.deepEqual(manualWeatherValuesFromPresets({ temperatureC:18 }), {
    airTempC:18, windSpeedKmh:null, windGustKmh:null, precipProbabilityPct:null, precipMm:null, precipitationType:'unknown', uvIndex:null
  });
});
