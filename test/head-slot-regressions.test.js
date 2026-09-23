import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession, lockItem, recommendOutfit } from '../src/index.js';

const PROFILE = Object.freeze({
  profileId:'baby_test',
  displayName:'Baby',
  birthDate:'2026-01-24',
  warmthBias:'neutral',
  styleTheme:'neutral',
  defaultMode:'outdoor',
  createdAt:'2026-08-25T10:00:00.000Z',
  updatedAt:'2026-08-25T10:00:00.000Z'
});

function weather(temp, overrides={}) {
  return {
    weatherId:'weather_test',
    location:{ locationId:'loc', label:'Testort', latitude:47.8, longitude:13, timezone:'Europe/Vienna' },
    origin:'api',
    source:'test',
    fetchedAt:'2026-08-25T12:00:00.000Z',
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
      uvIndex:5,
      cloudCoverPct:20,
      isDay:true,
      ...overrides
    },
    hourly:[]
  };
}

function request(context, temp, session=createSession('head_slot_test')) {
  return {
    requestId:'head_slot_test',
    requestedAt:'2026-08-25T12:00:00.000Z',
    profile:PROFILE,
    context,
    weather:weather(temp),
    session,
    neckFeedback:null
  };
}

const outdoor = (overrides={}) => ({
  mode:'outdoor',
  plannedMinutes:60,
  activity:'normal',
  activitySource:'user',
  sunExposure:'partial',
  groundContact:'none',
  ...overrides
});

const stroller = (overrides={}) => ({
  mode:'stroller',
  plannedMinutes:60,
  strollerState:'awake',
  activity:'normal',
  activitySource:'user',
  sunExposure:'partial',
  windProtection:'none',
  ...overrides
});

const carrier = (overrides={}) => ({
  mode:'carrier',
  plannedMinutes:60,
  sunExposure:'partial',
  placement:'over_wearer_outerwear',
  ...overrides
});

const itemId = (result, slotName) => result.slots.find((entry) => entry.phase === 'main' && entry.slot === slotName)?.selected.itemId ?? null;

function bodySnapshot(result) {
  return Object.fromEntries(['base_torso','legs','mid','outer','feet','hands'].map((slotName) => [slotName,itemId(result,slotName)]));
}

test('UV protection does not replace a thermally required hat in cool weather',()=>{
  const cases = [
    [outdoor(),10,'thin_hat'],
    [stroller(),10,'thin_hat'],
    [carrier(),10,'warm_hat']
  ];

  for (const [context,temp,expectedHead] of cases) {
    const result = recommendOutfit(request(context,temp));
    assert.equal(itemId(result,'head'),expectedHead,`${context.mode} should keep ${expectedHead}`);
    assert.ok(result.notices.some((notice) => notice.code === 'UV_SHADE_AND_COVERAGE'));
  }
});

test('UV protection still selects a sun hat when no thermal hat is needed',()=>{
  const result = recommendOutfit(request(outdoor(),24));
  assert.equal(itemId(result,'head'),'sun_hat');
});

test('manual head-slot changes do not rebalance torso or outerwear',()=>{
  const context = outdoor({ sunExposure:'shade' });
  const base = recommendOutfit(request(context,10));
  assert.equal(itemId(base,'head'),'thin_hat');
  assert.equal(itemId(base,'outer'),'light_transition_jacket');

  for (const replacement of ['warm_hat','sun_hat']) {
    const session = lockItem(createSession(`head_${replacement}`),{ slot:'head', itemId:replacement });
    const changed = recommendOutfit(request(context,10,session));
    assert.equal(itemId(changed,'head'),replacement);
    assert.deepEqual(bodySnapshot(changed),bodySnapshot(base),`${replacement} must not rebalance body slots`);
  }
});
