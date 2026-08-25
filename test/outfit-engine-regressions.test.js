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

function weather(temp) {
  return {
    weatherId:'weather_test', location:{locationId:'loc',label:'Testort',latitude:47.8,longitude:13,timezone:'Europe/Vienna'},
    origin:'api', source:'test', fetchedAt:'2026-08-25T12:00:00.000Z', freshness:'fresh', current:point(temp), hourly:[]
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
