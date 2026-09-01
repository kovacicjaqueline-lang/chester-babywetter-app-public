import test from 'node:test';
import assert from 'node:assert/strict';
import { planDayTrip } from '../src/day-trip-planner.js';

const PROFILE = Object.freeze({
  profileId:'trip_protection_baby',
  displayName:'Baby',
  birthDate:'2026-01-24',
  mobilityStage:'crawling',
  warmthBias:'neutral',
  styleTheme:'neutral',
  defaultMode:'outdoor',
  createdAt:'2026-08-31T08:00:00.000Z',
  updatedAt:'2026-08-31T08:00:00.000Z'
});

function point(time, uvIndex) {
  return {
    time,
    airTempC:24,
    apparentTempC:null,
    apparentTempTrusted:false,
    apparentTempIncludes:[],
    windSpeedKmh:5,
    windGustKmh:8,
    precipProbabilityPct:0,
    precipMm:0,
    precipitationType:'none',
    uvIndex,
    cloudCoverPct:20,
    isDay:true
  };
}

function weather() {
  return {
    weatherId:'trip_uv_protection',
    location:{ locationId:'salzburg', label:'Salzburg', latitude:47.8, longitude:13.0, timezone:'Europe/Vienna' },
    origin:'api',
    source:'test',
    fetchedAt:'2026-08-31T08:00:00.000Z',
    freshness:'fresh',
    current:point('2026-08-31T10:00:00.000Z',1),
    hourly:[
      point('2026-08-31T11:00:00.000Z',5),
      point('2026-08-31T12:00:00.000Z',5)
    ]
  };
}

test('equivalent continuity cannot keep short sleeves when UV requires the engine-selected long-sleeve coverage', () => {
  const result = planDayTrip({
    requestId:'trip_uv_protection_request',
    requestedAt:'2026-08-31T08:00:00.000Z',
    profile:{...PROFILE},
    plan:{
      tripId:'trip_uv_protection',
      startTime:'2026-08-31T10:00:00.000Z',
      endTime:'2026-08-31T12:00:00.000Z',
      segments:[{
        segmentId:'outdoor_uv',
        startTime:'2026-08-31T10:00:00.000Z',
        endTime:'2026-08-31T12:00:00.000Z',
        context:{
          mode:'outdoor',
          activity:'normal',
          activitySource:'user',
          sunExposure:'unknown',
          groundContact:'none'
        }
      }]
    },
    weather:weather()
  });

  assert.equal(result.status,'ready');
  assert.ok(result.startOutfit.items.some((item) => item.slot === 'base_torso' && item.itemId === 'short_sleeve_bodysuit'));
  assert.ok(result.packList.some((item) => item.itemId === 'light_long_sleeve_shirt' && item.firstNeededAt === '2026-08-31T11:00:00.000Z'));
  assert.ok(result.actions.some((action) =>
    action.at === '2026-08-31T11:00:00.000Z'
    && action.slot === 'base_torso'
    && action.kind === 'replace'
    && action.fromItemId === 'short_sleeve_bodysuit'
    && action.toItemId === 'light_long_sleeve_shirt'));
  assert.ok(result.actions.some((action) =>
    action.at === '2026-08-31T11:00:00.000Z'
    && action.slot === 'head'
    && action.toItemId === 'sun_hat'));
});
