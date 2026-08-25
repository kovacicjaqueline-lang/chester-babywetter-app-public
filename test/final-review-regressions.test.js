import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession, recommendOutfit, setWarmthOffset } from '../src/index.js';

const PROFILE = Object.freeze({
  profileId:'final_review', displayName:null, birthDate:'2026-01-24', warmthBias:'neutral', styleTheme:'neutral', defaultMode:'outdoor',
  createdAt:'2026-08-25T12:00:00.000Z', updatedAt:'2026-08-25T12:00:00.000Z'
});

function point(time,temp,overrides={}) {
  return {
    time, airTempC:temp, apparentTempC:null, apparentTempTrusted:false, apparentTempIncludes:[],
    windSpeedKmh:5, windGustKmh:8, precipProbabilityPct:0, precipMm:0, precipitationType:'none', uvIndex:1,
    cloudCoverPct:20, isDay:true, ...overrides
  };
}

function weather({hourly=[]}={}) {
  return {
    weatherId:'final_weather', location:{locationId:'loc',label:'Test',latitude:47.8,longitude:13,timezone:'Europe/Vienna'},
    origin:'api', source:'test', fetchedAt:'2026-08-25T12:00:00.000Z', freshness:'fresh',
    current:point('2026-08-25T14:00:00+02:00',18), hourly
  };
}

function request({session=createSession('final'),neckFeedback=null,w=weather()}={}) {
  return {
    requestId:'final_request', requestedAt:'2026-08-25T12:00:00.000Z', profile:{...PROFILE},
    context:{mode:'outdoor',plannedMinutes:60,activity:'normal',activitySource:'user',sunExposure:'shade',groundContact:'none'},
    weather:w, session, neckFeedback
  };
}

test('neck feedback trace is applied after global warmth quick correction', () => {
  const session = setWarmthOffset(createSession('neck_order'),'warmer');
  const result = recommendOutfit(request({session,neckFeedback:'hot_sweaty',w:weather({hourly:[
    point('2026-08-25T15:00:00+02:00',18)
  ]})}));
  const quickIndex = result.ruleTrace.findIndex((entry) => entry.ruleId === 'quick.warmth' && entry.phase === 'main');
  const neckIndex = result.ruleTrace.findIndex((entry) => entry.ruleId === 'feedback.neck' && entry.phase === 'main');
  assert.ok(quickIndex >= 0);
  assert.ok(neckIndex > quickIndex);
});

test('planned weather window without hourly coverage is partial, never silently treated as complete', () => {
  const result = recommendOutfit(request({w:weather({hourly:[]})}));
  assert.equal(result.status,'partial');
  assert.equal(result.phases.find((phase) => phase.phase === 'main')?.status,'partial');
  assert.ok(result.dataQuality.missingFields.includes('weather.hourly.coverage'));
  assert.ok(result.notices.some((notice) => notice.code === 'WEATHER_DATA_INCOMPLETE'));
});

test('complete hourly coverage keeps weather-window coverage out of missing fields', () => {
  const result = recommendOutfit(request({w:weather({hourly:[
    point('2026-08-25T15:00:00+02:00',18)
  ]})}));
  assert.ok(!result.dataQuality.missingFields.includes('weather.hourly.coverage'));
});

test('missing hourly hazard value inside covered window remains partial', () => {
  const result = recommendOutfit(request({w:weather({hourly:[
    point('2026-08-25T15:00:00+02:00',18,{uvIndex:null})
  ]})}));
  assert.equal(result.status,'partial');
  assert.ok(result.dataQuality.missingFields.includes('weather.hourly.uvIndex'));
});
