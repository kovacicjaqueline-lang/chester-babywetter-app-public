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

test('16 to below 18 C keeps a thin thermal hat; from 18 C calm weather does not',()=>{
  const contexts = [
    outdoor({ sunExposure:'shade' }),
    stroller({ sunExposure:'shade' }),
    carrier({ sunExposure:'shade' })
  ];

  for (const context of contexts) {
    for (const temp of [16,17.9]) {
      const result = recommendOutfit(request(context,temp));
      assert.equal(itemId(result,'head'),'thin_hat',`${context.mode} at ${temp} C should keep a thin hat`);
    }

    const mild = recommendOutfit(request(context,18));
    assert.equal(itemId(mild,'head'),null,`${context.mode} at 18 C should not add a thermal hat in calm weather`);
  }
});

test('18 to below 20 C still adds a thin hat when wind protection requires it',()=>{
  const contexts = [
    outdoor({ sunExposure:'shade' }),
    stroller({ sunExposure:'shade' }),
    carrier({ sunExposure:'shade' })
  ];

  for (const context of contexts) {
    const req = request(context,18);
    req.weather.current.windSpeedKmh = 20;
    req.weather.current.windGustKmh = 22;
    const result = recommendOutfit(req);
    assert.equal(itemId(result,'head'),'thin_hat',`${context.mode} should add a thin hat for wind at 18 C`);
    assert.ok(result.ruleTrace.some((entry) => entry.reasonCode === 'WIND_HEAD_PROTECTION_REQUIRED'));
  }
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
