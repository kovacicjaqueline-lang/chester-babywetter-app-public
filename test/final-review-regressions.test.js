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

function weather({hourly=[],temp=18,currentOverrides={}}={}) {
  return {
    weatherId:'final_weather', location:{locationId:'loc',label:'Test',latitude:47.8,longitude:13,timezone:'Europe/Vienna'},
    origin:'api', source:'test', fetchedAt:'2026-08-25T12:00:00.000Z', freshness:'fresh',
    current:point('2026-08-25T14:00:00+02:00',temp,currentOverrides), hourly
  };
}

function request({session=createSession('final'),neckFeedback=null,w=weather(),context={}}={}) {
  return {
    requestId:'final_request', requestedAt:'2026-08-25T12:00:00.000Z', profile:{...PROFILE},
    context:{mode:'outdoor',plannedMinutes:60,activity:'normal',activitySource:'user',sunExposure:'shade',groundContact:'none',...context},
    weather:w, session, neckFeedback
  };
}

const selected = (result) => result.slots
  .filter((entry) => entry.phase === 'main')
  .map((entry) => `${entry.slot}:${entry.selected.itemId}`)
  .sort();

test('neck feedback is actually applied after global warmth quick correction', () => {
  const coveredWeather = weather({temp:20,hourly:[point('2026-08-25T15:00:00+02:00',20)]});
  const balanced = recommendOutfit(request({w:coveredWeather}));
  const session = setWarmthOffset(createSession('neck_order'),'warmer');
  const combined = recommendOutfit(request({session,neckFeedback:'hot_sweaty',w:coveredWeather}));

  assert.deepEqual(selected(combined),selected(balanced));
  const quickIndex = combined.ruleTrace.findIndex((entry) => entry.ruleId === 'quick.warmth' && entry.phase === 'main');
  const neckIndex = combined.ruleTrace.findIndex((entry) => entry.ruleId === 'feedback.neck' && entry.phase === 'main');
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

test('gap inside a longer planned weather window is reported as incomplete coverage', () => {
  const result = recommendOutfit(request({
    context:{plannedMinutes:240},
    w:weather({hourly:[
      point('2026-08-25T15:00:00+02:00',18),
      point('2026-08-25T18:00:00+02:00',18)
    ]})
  }));
  assert.equal(result.status,'partial');
  assert.ok(result.dataQuality.missingFields.includes('weather.hourly.coverage'));
});

test('short car transition accepts the next hourly point as coverage anchor', () => {
  const result = recommendOutfit(request({
    context:{
      mode:'car',
      plannedMinutes:30,
      includeOutdoorTransition:true,
      outsideTransitionMinutes:5,
      cabinTempC:22,
      cabinTempSource:'measured'
    },
    w:weather({hourly:[point('2026-08-25T15:00:00+02:00',18)]})
  }));
  const transition = result.phases.find((phase) => phase.phase === 'outdoor_transition');
  assert.ok(transition);
  assert.ok(!transition.missingFields.includes('weather.hourly.coverage'));
  assert.ok(!result.notices.some((notice) => notice.code === 'WEATHER_DATA_INCOMPLETE' && notice.phase === 'outdoor_transition'));
});

test('missing hourly hazard value inside covered window remains partial', () => {
  const result = recommendOutfit(request({w:weather({hourly:[
    point('2026-08-25T15:00:00+02:00',18,{uvIndex:null})
  ]})}));
  assert.equal(result.status,'partial');
  assert.ok(result.dataQuality.missingFields.includes('weather.hourly.uvIndex'));
});

test('global cooler correction does not strip UV body coverage', () => {
  const session = setWarmthOffset(createSession('uv_cooler'),'cooler');
  const result = recommendOutfit(request({
    session,
    context:{sunExposure:'direct'},
    w:weather({
      temp:27,
      currentOverrides:{uvIndex:6},
      hourly:[point('2026-08-25T15:00:00+02:00',27,{uvIndex:6})]
    })
  }));
  assert.ok(result.slots.some((entry) => entry.phase === 'main' && entry.slot === 'head' && entry.selected.itemId === 'sun_hat'));
  assert.ok(result.slots.some((entry) => entry.phase === 'main' && entry.slot === 'base_torso' && entry.selected.itemId === 'light_long_sleeve_shirt'));
  assert.ok(result.slots.some((entry) => entry.phase === 'main' && entry.slot === 'legs'));
});
