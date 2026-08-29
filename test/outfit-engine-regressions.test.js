import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession, recommendOutfit } from '../src/index.js';

const profile = {
  profileId:'baby_test', displayName:'Baby', birthDate:'2026-01-24', warmthBias:'neutral', styleTheme:'neutral', defaultMode:'outdoor',
  createdAt:'2026-08-25T10:00:00.000Z', updatedAt:'2026-08-25T10:00:00.000Z'
};

function point(temp, overrides={}) {
  return {
    time:'2026-08-25T14:00:00+02:00', airTempC:temp, apparentTempC:null, apparentTempTrusted:false, apparentTempIncludes:[],
    windSpeedKmh:5, windGustKmh:8, precipProbabilityPct:0, precipMm:0, precipitationType:'none', uvIndex:1,
    cloudCoverPct:20, isDay:true, ...overrides
  };
}

function weather(temp, overrides={}) {
  return {
    weatherId:'weather_test', location:{locationId:'loc',label:'Testort',latitude:47.8,longitude:13,timezone:'Europe/Vienna'},
    origin:'api', source:'test', fetchedAt:'2026-08-25T12:00:00.000Z', freshness:'fresh', current:point(temp, overrides), hourly:[]
  };
}

function request(context, w) {
  return {
    requestId:'req_test', requestedAt:'2026-08-25T12:00:00.000Z', profile, context, weather:w,
    session:createSession('session_test'), neckFeedback:null
  };
}

test('direct sun at 28C or warmer emits extreme heat caution', () => {
  const result = recommendOutfit(request({
    mode:'outdoor', plannedMinutes:60, activity:'normal', activitySource:'user', sunExposure:'direct', groundContact:'none'
  }, weather(28)));
  assert.ok(result.notices.some((notice) => notice.code === 'EXTREME_HEAT_CAUTION' && notice.phase === 'main'));
});

test('car stays partial when outdoor transition is blocked but in-car is ready', () => {
  const result = recommendOutfit(request({
    mode:'car', plannedMinutes:30, includeOutdoorTransition:true, outsideTransitionMinutes:5,
    cabinTempC:21, cabinTempSource:'manual'
  }, null));
  assert.equal(result.phases.find((phase) => phase.phase === 'outdoor_transition')?.status, 'blocked');
  assert.equal(result.phases.find((phase) => phase.phase === 'in_car')?.status, 'ready');
  assert.equal(result.status, 'partial');
});

test('warm stroller wind protection keeps light leg coverage and avoids insulated softshell', () => {
  const result = recommendOutfit(request({
    mode:'stroller', plannedMinutes:60, strollerState:'awake', activity:'normal', activitySource:'user',
    windProtection:'none', sunExposure:'shade'
  }, weather(26, { windSpeedKmh:14, windGustKmh:40 })));
  const selected = new Set(result.slots.filter((slot) => slot.phase === 'main').map((slot) => slot.selected.itemId));

  assert.ok(selected.has('short_sleeve_bodysuit'));
  assert.ok(selected.has('light_trousers'));
  assert.ok(selected.has('rain_jacket'));
  assert.ok(!selected.has('softshell_jacket'));
});

test('warm outdoor wind protection keeps light leg coverage and avoids insulated softshell', () => {
  const result = recommendOutfit(request({
    mode:'outdoor', plannedMinutes:60, activity:'normal', activitySource:'user', sunExposure:'shade', groundContact:'none'
  }, weather(26, { windSpeedKmh:14, windGustKmh:40 })));
  const selected = new Set(result.slots.filter((slot) => slot.phase === 'main').map((slot) => slot.selected.itemId));

  assert.ok(selected.has('short_sleeve_bodysuit'));
  assert.ok(selected.has('light_trousers'));
  assert.ok(selected.has('rain_jacket'));
  assert.ok(!selected.has('softshell_jacket'));
});
