import test from 'node:test';
import assert from 'node:assert/strict';
import { formatPrecipitation, formatTemperature, precipitationLabelFor } from '../ui/weather-copy.js';

test('weather copy keeps precipitation type and probability consistent', () => {
  assert.equal(formatPrecipitation({ precipitationType: 'rain', precipProbabilityPct: 70 }), 'Regen 70%');
  assert.equal(formatPrecipitation({ precipitationType: 'snow', precipProbabilityPct: 70 }), 'Schnee 70%');
  assert.equal(formatPrecipitation({ precipitationType: 'sleet', precipProbabilityPct: 70 }), 'Schneeregen 70%');
  assert.equal(formatPrecipitation({ precipitationType: 'none', precipProbabilityPct: 0 }), 'Niederschlag 0%');
  assert.equal(formatPrecipitation({ precipitationType: 'unknown', precipProbabilityPct: null }), 'Niederschlag –');
  assert.equal(precipitationLabelFor({ precipitationType: 'snow' }), 'Schnee');
});

test('temperature copy preserves half-degree values', () => {
  assert.equal(formatTemperature(18.5), '18.5°');
  assert.equal(formatTemperature(18), '18°');
  assert.equal(formatTemperature(null), '–');
});
