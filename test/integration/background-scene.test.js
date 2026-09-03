import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveBackgroundScene,
  localSceneHour,
  sceneTimeOfDay,
  sceneWeatherCondition
} from '../../src/integration/background-scene.js';

const vienna = { locationId: 'vienna', label: 'Wien', timezone: 'Europe/Vienna' };
const point = (time, weatherCode, overrides = {}) => ({
  time,
  airTempC: 18,
  weatherCode,
  cloudCoverPct: 20,
  precipitationType: 'none',
  precipMm: 0,
  isDay: true,
  ...overrides
});

const scene = (weatherPoint, selection = null) => deriveBackgroundScene({
  weather: { location: vienna, current: weatherPoint, hourly: [] },
  selection
});

test('uses the displayed weather location timezone for local scene hours', () => {
  assert.equal(localSceneHour('2026-09-02T05:30:00.000Z', 'Europe/Vienna'), 7);
  assert.equal(localSceneHour('2026-01-02T05:30:00.000Z', 'Europe/Vienna'), 6);
  assert.equal(localSceneHour('2026-09-02T05:30:00+02:00', null), 5);
});

test('covers clear morning and clear day', () => {
  assert.deepEqual(scene(point('2026-09-02T05:30:00.000Z', 0)), {
    timeOfDay: 'morning', weather: 'clear', pointTime: '2026-09-02T05:30:00.000Z', source: 'current'
  });
  assert.equal(scene(point('2026-09-02T11:00:00.000Z', 0)).timeOfDay, 'day');
});

test('covers cloudy, rain, storm and snow weather classes', () => {
  assert.equal(sceneWeatherCondition(point('2026-09-02T11:00:00.000Z', 3)), 'cloudy');
  assert.equal(sceneWeatherCondition(point('2026-09-02T11:00:00.000Z', 61)), 'rain');
  assert.equal(sceneWeatherCondition(point('2026-09-02T11:00:00.000Z', 95)), 'storm');
  assert.equal(sceneWeatherCondition(point('2026-09-02T11:00:00.000Z', 75)), 'snow');
});

test('covers evening, winter nightfall, clear night and rainy night', () => {
  assert.equal(scene(point('2026-09-02T17:30:00.000Z', 0)).timeOfDay, 'evening');
  assert.equal(scene(point('2026-01-02T18:00:00+01:00', 0, { isDay: false })).timeOfDay, 'night');
  const clearNight = scene(point('2026-09-02T20:30:00.000Z', 0, { isDay: false }));
  assert.equal(clearNight.timeOfDay, 'night');
  assert.equal(clearNight.weather, 'clear');
  const rainyNight = scene(point('2026-09-02T20:30:00.000Z', 61, { isDay: false }));
  assert.equal(rainyNight.timeOfDay, 'night');
  assert.equal(rainyNight.weather, 'rain');
});

test('selected forecast hour overrides current point without mutating weather', () => {
  const current = point('2026-09-02T11:00:00.000Z', 0);
  const selected = point('2026-09-02T20:30:00.000Z', 61, { isDay: false });
  const weather = { location: vienna, current, hourly: [selected] };
  const selection = {
    mode: 'stroller',
    selectedTime: selected.time,
    options: [{ kind: 'forecast', time: selected.time, point: selected }]
  };
  const result = deriveBackgroundScene({ weather, selection });
  assert.equal(result.source, 'selected');
  assert.equal(result.pointTime, selected.time);
  assert.equal(result.timeOfDay, 'night');
  assert.equal(result.weather, 'rain');
  assert.equal(weather.current.time, current.time);
});

test('weather-independent modes ignore an old selected forecast hour for the scene', () => {
  const current = point('2026-09-02T11:00:00.000Z', 2);
  const selected = point('2026-09-02T20:30:00.000Z', 61, { isDay: false });
  const result = deriveBackgroundScene({
    weather: { location: vienna, current, hourly: [selected] },
    selection: { mode: 'sleep', selectedTime: selected.time, options: [{ time: selected.time, point: selected }] }
  });
  assert.equal(result.source, 'current');
  assert.equal(result.timeOfDay, 'day');
  assert.equal(result.weather, 'partlyCloudy');
});

test('unknown codes and missing or invalid weather fail safely to neutral/day', () => {
  assert.equal(sceneWeatherCondition(point('2026-09-02T11:00:00.000Z', 777)), 'neutral');
  assert.deepEqual(deriveBackgroundScene(), { timeOfDay: 'day', weather: 'neutral', pointTime: null, source: 'fallback' });
  assert.equal(sceneTimeOfDay(point('not-a-date', 0), vienna), 'day');
});

test('uses normalized precipitation and cloud cover only when weatherCode is absent', () => {
  assert.equal(sceneWeatherCondition(point('2026-09-02T11:00:00.000Z', null, { precipitationType: 'rain' })), 'rain');
  assert.equal(sceneWeatherCondition(point('2026-09-02T11:00:00.000Z', null, { precipitationType: 'snow' })), 'snow');
  assert.equal(sceneWeatherCondition(point('2026-09-02T11:00:00.000Z', null, { cloudCoverPct: 55 })), 'partlyCloudy');
  assert.equal(sceneWeatherCondition(point('2026-09-02T11:00:00.000Z', null, { cloudCoverPct: 90 })), 'cloudy');
});
