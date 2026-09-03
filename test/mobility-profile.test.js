import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession, recommendOutfit } from '../src/index.js';

const REQUESTED_AT = '2026-08-29T12:00:00.000Z';

function profile(mobilityStage) {
  return {
    profileId:'baby_mobility_test',
    displayName:'Baby',
    birthDate:'2026-01-24',
    mobilityStage,
    warmthBias:'neutral',
    styleTheme:'neutral',
    defaultMode:'outdoor',
    createdAt:REQUESTED_AT,
    updatedAt:REQUESTED_AT
  };
}

function weather() {
  return {
    weatherId:'weather_mobility_test',
    location:{ locationId:'loc',label:'Testort',latitude:47.8,longitude:13,timezone:'Europe/Vienna' },
    origin:'api',
    source:'test',
    fetchedAt:REQUESTED_AT,
    freshness:'fresh',
    current:{
      time:'2026-08-29T14:00:00+02:00',
      airTempC:18,
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

function request(mobilityStage, context) {
  return {
    requestId:`req_${mobilityStage}_${context.mode}_${context.activity ?? 'none'}`,
    requestedAt:REQUESTED_AT,
    profile:profile(mobilityStage),
    context,
    weather:weather(),
    session:createSession(`session_${mobilityStage}_${context.activity ?? 'none'}`),
    neckFeedback:null
  };
}

function selectedIds(result, phase='main') {
  return result.slots.filter((entry) => entry.phase === phase).map((entry) => entry.selected.itemId);
}

const normalOutdoor = { mode:'outdoor', plannedMinutes:60, activity:'normal', activitySource:'user', sunExposure:'shade', groundContact:'none' };
const activeOutdoor = { ...normalOutdoor, activity:'active' };

test('mobility stage alone does not change the thermal recommendation',()=>{
  const lowMobility = recommendOutfit(request('low_mobility',normalOutdoor));
  const crawling = recommendOutfit(request('crawling',normalOutdoor));
  const walking = recommendOutfit(request('walking',normalOutdoor));

  assert.equal(lowMobility.phases[0].thermalAdjustment,0);
  assert.equal(crawling.phases[0].thermalAdjustment,0);
  assert.equal(walking.phases[0].thermalAdjustment,0);
  assert.deepEqual(selectedIds(lowMobility),selectedIds(crawling));
  assert.deepEqual(selectedIds(lowMobility),selectedIds(walking));
});

test('a walking child becomes thermally lighter only through current active activity',()=>{
  const normal = recommendOutfit(request('walking',normalOutdoor));
  const active = recommendOutfit(request('walking',activeOutdoor));

  assert.equal(normal.phases[0].thermalAdjustment,0);
  assert.equal(active.phases[0].thermalAdjustment,-1);
  assert.notDeepEqual(selectedIds(normal),selectedIds(active));
});

test('stroller sleep remains independent of mobility and ignores active movement state',()=>{
  const asleep = { mode:'stroller', plannedMinutes:60, strollerState:'asleep', activity:'active', activitySource:'user', sunExposure:'shade', windProtection:'partial' };
  const lowMobility = recommendOutfit(request('low_mobility',asleep));
  const walking = recommendOutfit(request('walking',asleep));

  assert.equal(lowMobility.phases[0].thermalAdjustment,0);
  assert.equal(walking.phases[0].thermalAdjustment,0);
  assert.deepEqual(selectedIds(lowMobility),selectedIds(walking));
});
