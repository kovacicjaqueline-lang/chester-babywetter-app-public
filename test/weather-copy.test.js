import test from 'node:test';
import assert from 'node:assert/strict';
import { formatPrecipitation, formatTemperature, formatTemperatureC, formatUvIndex, precipitationLabelFor } from '../ui/weather-copy.js';

test('weather copy keeps precipitation type and probability consistent', () => {
  assert.equal(formatPrecipitation({ precipitationType: 'rain', precipProbabilityPct: 70 }), 'Regen 70%');
  assert.equal(formatPrecipitation({ precipitationType: 'snow', precipProbabilityPct: 70 }), 'Schnee 70%');
  assert.equal(formatPrecipitation({ precipitationType: 'sleet', precipProbabilityPct: 70 }), 'Schneeregen 70%');
  assert.equal(formatPrecipitation({ precipitationType: 'none', precipProbabilityPct: 0 }), 'Niederschlag 0%');
  assert.equal(formatPrecipitation({ precipitationType: 'unknown', precipProbabilityPct: null }), 'Niederschlag –');
  assert.equal(precipitationLabelFor({ precipitationType: 'snow' }), 'Schnee');
});

test('temperature copy rounds visible values to whole degrees', () => {
  assert.equal(formatTemperature(18.4), '18°');
  assert.equal(formatTemperature(18.5), '19°');
  assert.equal(formatTemperature(18.6), '19°');
  assert.equal(formatTemperature(18), '18°');
  assert.equal(formatTemperature(null), '–');
});

test('temperature and UV copy expose whole-number values', () => {
  assert.equal(formatTemperatureC(18.5), '19 °C');
  assert.equal(formatTemperatureC(null), '–');
  assert.equal(formatUvIndex(0), '0');
  assert.equal(formatUvIndex(5.6), '6');
  assert.equal(formatUvIndex(null), '–');
});
