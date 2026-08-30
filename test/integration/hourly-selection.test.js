import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildHourlySelectionOptions,
  getHourlySelectionSnapshot,
  prepareRequestForHourlySelection,
  resetHourlySelection,
  setHourlySelectionStart
} from '../../src/integration/hourly-selection.js';

const point = (time, airTempC, overrides = {}) => ({
  time,
  airTempC,
  apparentTempC: airTempC - 0.5,
  apparentTempTrusted: true,
  apparentTempIncludes: ['wind', 'humidity', 'sun'],
  windSpeedKmh: 10,
  windGustKmh: 20,
  precipProbabilityPct: 10,
  precipMm: 0,
  precipitationType: 'none',
  uvIndex: 2,
  cloudCoverPct: 20,
  isDay: true,
  ...overrides
});

function weather(overrides = {}) {
  return {
    weatherId: 'weather-1',
    fetchedAt: '2026-08-29T10:00:00.000Z',
    freshness: 'fresh',
    location: { locationId: 'salzburg', label: 'Salzburg' },
    current: point('2026-08-29T10:00:00.000Z', 18),
    hourly: [
      point('2026-08-29T10:30:00.000Z', 18),
      point('invalid', 99),
      { time: '2026-08-29T12:00:00.000Z', airTempC: null },
      point('2026-08-29T11:00:00.000Z', 17, { precipProbabilityPct: 20 }),
      point('2026-08-29T12:00:00.000Z', 15, { precipProbabilityPct: 80, windGustKmh: 55, uvIndex: 5 }),
      point('2026-08-29T13:00:00.000Z', 16, { precipProbabilityPct: 30 })
    ],
    ...overrides
  };
}

function request({ mode = 'outdoor', weatherValue = weather(), context = null, requestedAt = '2026-08-29T10:45:00.000Z' } = {}) {
  return {
    requestId: 'r1',
    requestedAt,
    context: context ?? { mode, plannedMinutes: 60, activity: 'normal' },
    weather: weatherValue
  };
}

test.afterEach(() => resetHourlySelection());

test('offers Jetzt plus only valid future forecast points', () => {
  const options = buildHourlySelectionOptions(weather(), '2026-08-29T10:45:00.000Z');
  assert.deepEqual(options.map((option) => option.time), [null, '2026-08-29T11:00:00.000Z', '2026-08-29T12:00:00.000Z', '2026-08-29T13:00:00.000Z']);
});

test('selected hour becomes thermal start and keeps later points for the full risk window', () => {
  const original = request();
  prepareRequestForHourlySelection(original);
  assert.equal(setHourlySelectionStart('2026-08-29T11:00:00.000Z'), true);
  const prepared = prepareRequestForHourlySelection(original);
  assert.equal(prepared.weather.current.time, '2026-08-29T11:00:00.000Z');
  assert.equal(prepared.weather.current.airTempC, 17);
  assert.deepEqual(prepared.weather.hourly.map((entry) => entry.time), ['2026-08-29T12:00:00.000Z', '2026-08-29T13:00:00.000Z']);
  assert.equal(prepared.weather.hourly[0].precipProbabilityPct, 80);
  assert.equal(prepared.weather.hourly[0].windGustKmh, 55);
  assert.equal(prepared.weather.hourly[0].uvIndex, 5);
  assert.equal(prepared.context.plannedMinutes, 60);
  assert.equal(original.weather.current.time, '2026-08-29T10:00:00.000Z');
});

test('stale compensation is removed before a future selection so plannedMinutes starts at the chosen hour', () => {
  const stale = weather({ freshness: 'stale', current: point('2026-08-29T10:00:00.000Z', 18) });
  const original = request({
    weatherValue: stale,
    requestedAt: '2026-08-29T10:45:00.000Z',
    context: { mode: 'outdoor', plannedMinutes: 105, activity: 'normal' }
  });
  prepareRequestForHourlySelection(original);
  setHourlySelectionStart('2026-08-29T11:00:00.000Z');
  const prepared = prepareRequestForHourlySelection(original);
  assert.equal(prepared.context.plannedMinutes, 60);
  assert.equal(prepared.weather.current.time, '2026-08-29T11:00:00.000Z');
});

test('past selection expires automatically and indoor/sleep requests are unchanged', () => {
  const original = request({ requestedAt: '2026-08-29T10:45:00.000Z' });
  prepareRequestForHourlySelection(original);
  setHourlySelectionStart('2026-08-29T11:00:00.000Z');
  const later = request({ requestedAt: '2026-08-29T11:05:00.000Z' });
  const preparedLater = prepareRequestForHourlySelection(later);
  assert.equal(preparedLater.weather.current.time, '2026-08-29T10:00:00.000Z');
  assert.equal(getHourlySelectionSnapshot().selectedTime, null);

  const indoor = request({ mode: 'indoor', weatherValue: null, context: { mode: 'indoor', roomTempC: 20, activity: 'normal' } });
  const sleep = request({ mode: 'sleep', weatherValue: null, context: { mode: 'sleep', roomTempC: 18 } });
  assert.equal(prepareRequestForHourlySelection(indoor), indoor);
  assert.equal(prepareRequestForHourlySelection(sleep), sleep);
});
