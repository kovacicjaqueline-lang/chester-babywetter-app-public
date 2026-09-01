import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareTripCheckpoints } from '../src/day-trip-planner-weather.js';

const PROFILE = Object.freeze({
  profileId:'trip_now_baby',
  displayName:'Baby',
  birthDate:'2026-01-24',
  mobilityStage:'crawling',
  warmthBias:'neutral',
  styleTheme:'neutral',
  defaultMode:'outdoor',
  createdAt:'2026-09-01T08:00:00.000Z',
  updatedAt:'2026-09-01T08:00:00.000Z'
});

function point(time, airTempC) {
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
    isDay:true
  };
}

test('trip start at requestedAt keeps stale current timestamp as thermal reference without moving plan start into the past', () => {
  const requestedAt = '2026-09-01T10:30:00.000Z';
  const staleCurrentTime = '2026-09-01T09:30:00.000Z';
  const request = {
    requestId:'trip_now_request',
    requestedAt,
    profile:{ ...PROFILE },
    plan:{
      tripId:'trip_now',
      startTime:requestedAt,
      endTime:'2026-09-01T12:00:00.000Z',
      segments:[{
        segmentId:'segment_now',
        startTime:requestedAt,
        endTime:'2026-09-01T12:00:00.000Z',
        context:{
          mode:'outdoor',
          activity:'normal',
          activitySource:'user',
          sunExposure:'shade',
          groundContact:'none'
        }
      }]
    },
    weather:{
      weatherId:'stale_now_weather',
      location:{ locationId:'salzburg', label:'Salzburg', latitude:47.8, longitude:13.0, timezone:'Europe/Vienna' },
      origin:'cache',
      source:'test',
      fetchedAt:staleCurrentTime,
      freshness:'stale',
      current:point(staleCurrentTime,16),
      hourly:[
        point('2026-09-01T11:00:00.000Z',17),
        point('2026-09-01T12:00:00.000Z',18)
      ]
    }
  };

  const prepared = prepareTripCheckpoints(request);

  assert.deepEqual(prepared.issues,[]);
  assert.equal(prepared.checkpoints[0].startTime,requestedAt);
  assert.equal(prepared.checkpoints[0].weatherPointTime,staleCurrentTime);
  assert.equal(prepared.checkpoints[0].engineRequest.weather.current.time,staleCurrentTime);
  assert.equal(prepared.checkpoints[0].engineRequest.context.plannedMinutes,30);
  assert.ok(prepared.checkpoints[0].engineRequest.weather.hourly.every((entry) => Date.parse(entry.time) > Date.parse(requestedAt)));
  assert.equal(prepared.checkpoints[1].startTime,'2026-09-01T11:00:00.000Z');
  assert.equal(prepared.checkpoints[1].weatherPointTime,'2026-09-01T11:00:00.000Z');
});
