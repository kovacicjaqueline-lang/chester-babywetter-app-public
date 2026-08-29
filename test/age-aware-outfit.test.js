import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession, recommendOutfit } from '../src/index.js';

const REQUESTED_AT = '2026-08-25T12:00:00.000Z';

function profile(birthDate) {
  return {
    profileId:'baby_age_test',
    displayName:'Baby',
    birthDate,
    warmthBias:'neutral',
    styleTheme:'neutral',
    defaultMode:'outdoor',
    createdAt:REQUESTED_AT,
    updatedAt:REQUESTED_AT
  };
}

function weather(temp) {
  return {
    weatherId:'weather_age_test',
    location:{ locationId:'loc',label:'Testort',latitude:47.8,longitude:13,timezone:'Europe/Vienna' },
    origin:'api',
    source:'test',
    fetchedAt:REQUESTED_AT,
    freshness:'fresh',
    current:{
      time:'2026-08-25T14:00:00+02:00',
      airTempC:temp,
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
      isDay:true
    },
    hourly:[]
  };
}

function request({ birthDate, context, temp=18, weatherOverride }) {
  return {
    requestId:'req_age_test',
    requestedAt:REQUESTED_AT,
    profile:profile(birthDate),
    context,
    weather:weatherOverride === undefined ? weather(temp) : weatherOverride,
    session:createSession('session_age_test'),
    neckFeedback:null
  };
}

function selectedIds(result, phase='main') {
  return result.slots
    .filter((entry) => entry.phase === phase)
    .map((entry) => entry.selected.itemId);
}

const outdoor = { mode:'outdoor', plannedMinutes:60, activity:'normal', activitySource:'user', sunExposure:'shade', groundContact:'none' };

test('a one-month-old gets a modest +0.5 age adjustment compared with a seven-month-old',()=>{
  const oneMonth = recommendOutfit(request({ birthDate:'2026-07-24', context:outdoor }));
  const sevenMonths = recommendOutfit(request({ birthDate:'2026-01-24', context:outdoor }));

  assert.equal(oneMonth.phases[0].thermalAdjustment,0.5);
  assert.equal(sevenMonths.phases[0].thermalAdjustment,0);
  assert.notDeepEqual(selectedIds(oneMonth),selectedIds(sevenMonths));
  assert.ok(oneMonth.ruleTrace.some((entry) => entry.ruleId === 'profile.age' && entry.delta === 0.5));
  assert.ok(!sevenMonths.ruleTrace.some((entry) => entry.ruleId === 'profile.age'));
});

test('age correction stops at three completed months',()=>{
  const beforeThreshold = recommendOutfit(request({ birthDate:'2026-05-26', context:outdoor }));
  const atThreshold = recommendOutfit(request({ birthDate:'2026-05-25', context:outdoor }));

  assert.equal(beforeThreshold.phases[0].thermalAdjustment,0.5);
  assert.equal(atThreshold.phases[0].thermalAdjustment,0);
});

test('young infant age does not add insulation in very warm conditions',()=>{
  const result = recommendOutfit(request({ birthDate:'2026-07-24', context:outdoor, temp:28 }));

  assert.equal(result.phases[0].thermalAdjustment,0);
  assert.ok(!result.ruleTrace.some((entry) => entry.ruleId === 'profile.age'));
});

test('unknown birth date does not invent a thermal age adjustment',()=>{
  const result = recommendOutfit(request({ birthDate:null, context:outdoor }));

  assert.equal(result.phases[0].thermalAdjustment,0);
  assert.ok(!result.ruleTrace.some((entry) => entry.ruleId === 'profile.age'));
});

test('sleep remains room-temperature and TOG based regardless of age',()=>{
  const context = { mode:'sleep', roomTempC:18.5 };
  const oneMonth = recommendOutfit(request({ birthDate:'2026-07-24', context, weatherOverride:null }));
  const sevenMonths = recommendOutfit(request({ birthDate:'2026-01-24', context, weatherOverride:null }));

  assert.deepEqual(selectedIds(oneMonth),selectedIds(sevenMonths));
  assert.equal(oneMonth.phases[0].thermalAdjustment,sevenMonths.phases[0].thermalAdjustment);
  assert.ok(!oneMonth.ruleTrace.some((entry) => entry.ruleId === 'profile.age'));
});

test('in-car age adjustment preserves harness safety',()=>{
  const context = { mode:'car', plannedMinutes:30, includeOutdoorTransition:false, outsideTransitionMinutes:null, cabinTempC:20, cabinTempSource:'manual' };
  const oneMonth = recommendOutfit(request({ birthDate:'2026-07-24', context }));
  const sevenMonths = recommendOutfit(request({ birthDate:'2026-01-24', context }));

  assert.equal(oneMonth.phases[0].thermalAdjustment,0.5);
  assert.equal(sevenMonths.phases[0].thermalAdjustment,0);
  assert.ok(oneMonth.notices.some((notice) => notice.code === 'CAR_SEAT_NO_BULKY_LAYERS'));
  assert.ok(oneMonth.slots.every((entry) => entry.phase !== 'in_car' || entry.selected.itemId !== 'winter_overall'));
});
