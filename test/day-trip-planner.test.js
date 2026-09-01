import test from 'node:test';
import assert from 'node:assert/strict';
import { planDayTrip } from '../src/day-trip-planner.js';

const PROFILE = Object.freeze({
  profileId:'trip_baby',
  displayName:'Baby',
  birthDate:'2026-01-24',
  mobilityStage:'crawling',
  warmthBias:'neutral',
  styleTheme:'neutral',
  defaultMode:'outdoor',
  createdAt:'2026-08-31T08:00:00.000Z',
  updatedAt:'2026-08-31T08:00:00.000Z'
});

function point(time, airTempC, overrides = {}) {
  return {
    time,
    airTempC,
    apparentTempC:null,
    apparentTempTrusted:false,
    apparentTempIncludes:[],
    windSpeedKmh:5,
    windGustKmh:8,
    precipProbabilityPct:0,
    precipMm:0,
    precipitationType:'none',
    uvIndex:1,
    cloudCoverPct:20,
    isDay:true,
    ...overrides
  };
}

function weather(points) {
  return {
    weatherId:'trip_weather',
    location:{ locationId:'salzburg', label:'Salzburg', latitude:47.8, longitude:13.0, timezone:'Europe/Vienna' },
    origin:'api',
    source:'test',
    fetchedAt:'2026-08-31T08:00:00.000Z',
    freshness:'fresh',
    current:points[0],
    hourly:points.slice(1)
  };
}

const outdoor = (overrides = {}) => ({
  mode:'outdoor',
  activity:'normal',
  activitySource:'user',
  sunExposure:'shade',
  groundContact:'none',
  ...overrides
});

const stroller = (overrides = {}) => ({
  mode:'stroller',
  strollerState:'awake',
  activity:'normal',
  activitySource:'user',
  sunExposure:'shade',
  windProtection:'none',
  ...overrides
});

const carrier = (overrides = {}) => ({
  mode:'carrier',
  sunExposure:'shade',
  placement:'over_wearer_outerwear',
  ...overrides
});

const car = (overrides = {}) => ({
  mode:'car',
  includeOutdoorTransition:false,
  outsideTransitionMinutes:null,
  cabinTempC:20,
  cabinTempSource:'manual',
  ...overrides
});

function request({
  start='2026-08-31T10:00:00.000Z',
  end='2026-08-31T12:00:00.000Z',
  segments=null,
  weatherValue,
  profile={...PROFILE}
}) {
  return {
    requestId:'trip_request',
    requestedAt:'2026-08-31T08:00:00.000Z',
    profile,
    plan:{
      tripId:'trip_1',
      startTime:start,
      endTime:end,
      segments:segments ?? [{ segmentId:'segment_1', startTime:start, endTime:end, context:outdoor() }]
    },
    weather:weatherValue
  };
}

const startIds = (result) => result.startOutfit?.items.map((item) => item.itemId) ?? [];
const actionAt = (result, at) => result.actions.filter((action) => action.at === at);

function semanticResult(result) {
  return {
    status:result.status,
    start:startIds(result).sort(),
    pack:result.packList.map((item) => item.itemId).sort(),
    actions:result.actions.map((action) => ({
      at:action.at,
      kind:action.kind,
      slot:action.slot,
      fromItemId:action.fromItemId,
      toItemId:action.toItemId,
      fromWearPosition:action.fromWearPosition,
      toWearPosition:action.toWearPosition,
      safetyCritical:action.safetyCritical
    }))
  };
}

test('unchanged weather produces no artificial outfit change and does not mutate input', () => {
  const w = weather([
    point('2026-08-31T10:00:00.000Z',18),
    point('2026-08-31T11:00:00.000Z',18),
    point('2026-08-31T12:00:00.000Z',18)
  ]);
  const input = request({ weatherValue:w });
  const before = structuredClone(input);
  const result = planDayTrip(input);

  assert.equal(result.status,'ready');
  assert.ok(result.startOutfit);
  assert.deepEqual(result.actions,[]);
  assert.deepEqual(result.packList,[]);
  assert.equal(result.coverage.coveredUntil,'2026-08-31T12:00:00.000Z');
  assert.deepEqual(input,before);
});

test('cool morning, warm midday, cool later removes and reuses layers instead of packing the start layer again', () => {
  const w = weather([
    point('2026-08-31T10:00:00.000Z',18),
    point('2026-08-31T11:00:00.000Z',22),
    point('2026-08-31T12:00:00.000Z',18),
    point('2026-08-31T13:00:00.000Z',18)
  ]);
  const result = planDayTrip(request({ end:'2026-08-31T13:00:00.000Z', weatherValue:w }));
  const start = new Set(startIds(result));

  assert.equal(result.status,'ready');
  assert.ok(actionAt(result,'2026-08-31T11:00:00.000Z').some((action) => action.kind === 'remove' && action.fromItemId === 'thin_sweater'));
  assert.ok(actionAt(result,'2026-08-31T12:00:00.000Z').some((action) => action.kind === 'add' && action.toItemId === 'thin_sweater'));
  assert.ok(!result.packList.some((item) => item.itemId === 'thin_sweater'));
  assert.ok(result.packList.every((item) => !start.has(item.itemId)));
  assert.equal(new Set(result.packList.map((item) => item.itemId)).size,result.packList.length);
});

test('rain beginning at the next checkpoint is packed and acted on at that checkpoint, not one interval early', () => {
  const w = weather([
    point('2026-08-31T10:00:00.000Z',18),
    point('2026-08-31T11:00:00.000Z',18,{ precipProbabilityPct:80, precipMm:1, precipitationType:'rain' }),
    point('2026-08-31T12:00:00.000Z',18,{ precipProbabilityPct:80, precipMm:1, precipitationType:'rain' })
  ]);
  const result = planDayTrip(request({ weatherValue:w }));

  assert.ok(!startIds(result).includes('rain_jacket'));
  assert.ok(result.packList.some((item) => item.itemId === 'rain_jacket' && item.firstNeededAt === '2026-08-31T11:00:00.000Z'));
  assert.ok(actionAt(result,'2026-08-31T11:00:00.000Z').some((action) => action.toItemId === 'rain_jacket'));
});

test('UV increase adds sun protection only when the local checkpoint requires it', () => {
  const context = outdoor({ sunExposure:'unknown' });
  const w = weather([
    point('2026-08-31T10:00:00.000Z',22,{ uvIndex:1 }),
    point('2026-08-31T11:00:00.000Z',22,{ uvIndex:5 }),
    point('2026-08-31T12:00:00.000Z',22,{ uvIndex:5 })
  ]);
  const result = planDayTrip(request({
    weatherValue:w,
    segments:[{ segmentId:'outdoor_uv', startTime:'2026-08-31T10:00:00.000Z', endTime:'2026-08-31T12:00:00.000Z', context }]
  }));

  assert.ok(!startIds(result).includes('sun_hat'));
  assert.ok(result.packList.some((item) => item.itemId === 'sun_hat'));
  assert.ok(actionAt(result,'2026-08-31T11:00:00.000Z').some((action) => action.kind === 'add' && action.toItemId === 'sun_hat'));
});

test('asleep stroller remains stroller logic and includes the stroller thermal accessory', () => {
  const w = weather([
    point('2026-08-31T10:00:00.000Z',12),
    point('2026-08-31T11:00:00.000Z',12)
  ]);
  const result = planDayTrip(request({
    end:'2026-08-31T11:00:00.000Z',
    weatherValue:w,
    segments:[{
      segmentId:'stroller_sleep',
      startTime:'2026-08-31T10:00:00.000Z',
      endTime:'2026-08-31T11:00:00.000Z',
      context:stroller({ strollerState:'asleep', activity:'active' })
    }]
  }));

  assert.equal(result.status,'ready');
  assert.ok(result.startOutfit.items.some((item) => item.slot === 'stroller_thermal_accessory' && item.itemId === 'stroller_light_footmuff'));
  assert.ok(!result.startOutfit.items.some((item) => item.slot === 'sleep_bag'));
});

test('carrier segment delegates body heat and carrier accessory selection to the existing engine', () => {
  const w = weather([
    point('2026-08-31T10:00:00.000Z',10),
    point('2026-08-31T11:00:00.000Z',10)
  ]);
  const result = planDayTrip(request({
    end:'2026-08-31T11:00:00.000Z',
    weatherValue:w,
    segments:[{
      segmentId:'carrier',
      startTime:'2026-08-31T10:00:00.000Z',
      endTime:'2026-08-31T11:00:00.000Z',
      context:carrier()
    }]
  }));

  assert.equal(result.status,'ready');
  assert.ok(result.startOutfit.items.some((item) => item.slot === 'carrier_accessory' && item.itemId === 'carrier_cover_light'));
  assert.ok(result.notices.some((notice) => notice.code === 'CHECK_NECK'));
});

test('entering a car segment keeps harness safety visible and prioritized over continuity', () => {
  const w = weather([
    point('2026-08-31T10:00:00.000Z',4),
    point('2026-08-31T11:00:00.000Z',4),
    point('2026-08-31T12:00:00.000Z',4)
  ]);
  const result = planDayTrip(request({
    weatherValue:w,
    segments:[
      { segmentId:'outside', startTime:'2026-08-31T10:00:00.000Z', endTime:'2026-08-31T11:00:00.000Z', context:outdoor() },
      { segmentId:'car', startTime:'2026-08-31T11:00:00.000Z', endTime:'2026-08-31T12:00:00.000Z', context:car({ includeOutdoorTransition:true, outsideTransitionMinutes:5 }) }
    ]
  }));
  const carActions = actionAt(result,'2026-08-31T11:00:00.000Z');

  assert.equal(result.status,'ready');
  assert.ok(carActions.some((action) => action.kind === 'safety_instruction' && action.safetyCritical));
  assert.ok(carActions.some((action) => action.phase === 'in_car' && ['remove','replace','reposition'].includes(action.kind)));
  assert.ok(result.notices.some((notice) => notice.code === 'CAR_SEAT_NO_BULKY_LAYERS'));
});

test('missing thermal forecast at trip start blocks, while a later forecast gap is partial without invented later actions', () => {
  const missingStartWeather = weather([
    point('2026-08-31T09:00:00.000Z',18),
    point('2026-08-31T11:00:00.000Z',18)
  ]);
  const blocked = planDayTrip(request({ weatherValue:missingStartWeather }));
  assert.equal(blocked.status,'blocked');
  assert.equal(blocked.startOutfit,null);
  assert.ok(blocked.coverage.issues.some((entry) => entry.code === 'missing_thermal_forecast'));

  const laterGapWeather = weather([
    point('2026-08-31T10:00:00.000Z',18),
    point('2026-08-31T11:00:00.000Z',18)
  ]);
  const partial = planDayTrip(request({ end:'2026-08-31T13:00:00.000Z', weatherValue:laterGapWeather }));
  assert.equal(partial.status,'partial');
  assert.ok(partial.startOutfit);
  assert.equal(partial.coverage.coveredUntil,'2026-08-31T11:00:00.000Z');
  assert.ok(partial.coverage.issues.some((entry) => entry.code === 'forecast_gap'));
  assert.ok(partial.actions.every((action) => Date.parse(action.at) <= Date.parse('2026-08-31T11:00:00.000Z')));
});

test('segment gaps are rejected instead of being silently normalized inside the core planner', () => {
  const w = weather([
    point('2026-08-31T10:00:00.000Z',18),
    point('2026-08-31T11:00:00.000Z',18),
    point('2026-08-31T12:00:00.000Z',18)
  ]);
  const result = planDayTrip(request({
    weatherValue:w,
    segments:[
      { segmentId:'a', startTime:'2026-08-31T10:00:00.000Z', endTime:'2026-08-31T11:00:00.000Z', context:outdoor() },
      { segmentId:'b', startTime:'2026-08-31T11:30:00.000Z', endTime:'2026-08-31T12:00:00.000Z', context:outdoor() }
    ]
  }));

  assert.equal(result.status,'blocked');
  assert.ok(result.coverage.issues.some((entry) => entry.code === 'invalid_segment'));
});

test('style theme cannot affect thermal planner output', () => {
  const w = weather([
    point('2026-08-31T10:00:00.000Z',18),
    point('2026-08-31T11:00:00.000Z',22),
    point('2026-08-31T12:00:00.000Z',18)
  ]);
  const neutral = planDayTrip(request({ weatherValue:w, profile:{...PROFILE,styleTheme:'neutral'} }));
  const boy = planDayTrip(request({ weatherValue:w, profile:{...PROFILE,styleTheme:'boy'} }));
  const girl = planDayTrip(request({ weatherValue:w, profile:{...PROFILE,styleTheme:'girl'} }));

  assert.deepEqual(semanticResult(boy),semanticResult(neutral));
  assert.deepEqual(semanticResult(girl),semanticResult(neutral));
});

test('estimated car temperature lifts an otherwise complete trip to ready_with_estimate', () => {
  const result = planDayTrip(request({
    weatherValue:null,
    end:'2026-08-31T11:00:00.000Z',
    segments:[{
      segmentId:'car_only',
      startTime:'2026-08-31T10:00:00.000Z',
      endTime:'2026-08-31T11:00:00.000Z',
      context:car({ cabinTempC:20, cabinTempSource:'estimated' })
    }]
  }));

  assert.equal(result.status,'ready_with_estimate');
  assert.ok(result.notices.some((notice) => notice.code === 'CAR_CABIN_TEMPERATURE_ESTIMATED'));
});
