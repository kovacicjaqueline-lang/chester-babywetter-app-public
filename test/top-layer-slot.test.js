import test from 'node:test';
import assert from 'node:assert/strict';
import { CLOTHING_CATALOG, createSession, lockItem, recommendOutfit } from '../src/index.js';

const PROFILE = Object.freeze({
  profileId:'baby_test',
  displayName:'Baby',
  birthDate:'2026-01-24',
  warmthBias:'neutral',
  styleTheme:'neutral',
  defaultMode:'outdoor',
  createdAt:'2026-09-23T10:00:00.000Z',
  updatedAt:'2026-09-23T10:00:00.000Z'
});

function weather(temp, overrides = {}) {
  return {
    weatherId:'weather_test',
    location:{ locationId:'loc', label:'Testort', latitude:47.8, longitude:13, timezone:'Europe/Vienna' },
    origin:'api',
    source:'test',
    fetchedAt:'2026-09-23T10:00:00.000Z',
    freshness:'fresh',
    current:{
      time:'2026-09-23T12:00:00+02:00',
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
      isDay:true,
      ...overrides
    },
    hourly:[]
  };
}

function outdoor(overrides = {}) {
  return {
    mode:'outdoor',
    plannedMinutes:0,
    activity:'normal',
    activitySource:'user',
    sunExposure:'shade',
    groundContact:'none',
    ...overrides
  };
}

function request(context, temp, session = createSession('top_test'), weatherOverrides = {}) {
  return {
    requestId:'top_test',
    requestedAt:'2026-09-23T10:00:00.000Z',
    profile:PROFILE,
    context,
    weather:weather(temp,weatherOverrides),
    session,
    neckFeedback:null
  };
}

function item(result, slot) {
  return result.slots.find((entry) => entry.phase === 'main' && entry.slot === slot)?.selected.itemId ?? null;
}

function slot(result, name) {
  return result.slots.find((entry) => entry.phase === 'main' && entry.slot === name);
}

test('bodies and lightweight tops use separate semantic slots', () => {
  assert.equal(CLOTHING_CATALOG.short_sleeve_bodysuit.slot,'base_torso');
  assert.equal(CLOTHING_CATALOG.long_sleeve_bodysuit.slot,'base_torso');
  assert.equal(CLOTHING_CATALOG.t_shirt.slot,'top');
  assert.equal(CLOTHING_CATALOG.light_long_sleeve_shirt.slot,'top');
});

test('20-24 C short-body swap is balanced with a light long-sleeve top, not a sweater', () => {
  const base = recommendOutfit(request(outdoor(),22));
  assert.equal(item(base,'base_torso'),'long_sleeve_bodysuit');
  assert.equal(item(base,'top'),null);
  assert.equal(item(base,'mid'),null);

  const shortBodyAlternative = slot(base,'base_torso').alternatives.find((option) => option.itemId === 'short_sleeve_bodysuit');
  assert.equal(shortBodyAlternative?.relation,'equivalent');
  assert.ok(shortBodyAlternative?.projectedChanges.some((change) =>
    change.slot === 'top'
      && change.fromItemId === null
      && change.toItemId === 'light_long_sleeve_shirt'
  ));

  const session = lockItem(createSession('top_swap'),{
    slot:'base_torso',
    itemId:'short_sleeve_bodysuit',
    lockedAt:'2026-09-23T10:00:00.000Z'
  });
  const swapped = recommendOutfit(request(outdoor(),22,session));
  assert.equal(item(swapped,'base_torso'),'short_sleeve_bodysuit');
  assert.equal(item(swapped,'top'),'light_long_sleeve_shirt');
  assert.equal(item(swapped,'mid'),null);
});

test('light long-sleeve top keeps equivalent T-shirt alternatives within the top slot', () => {
  const session = lockItem(createSession('top_swap'),{
    slot:'base_torso',
    itemId:'short_sleeve_bodysuit',
    lockedAt:'2026-09-23T10:00:00.000Z'
  });
  const result = recommendOutfit(request(outdoor(),22,session));
  const tShirt = slot(result,'top').alternatives.find((option) => option.itemId === 't_shirt');
  assert.equal(tShirt?.relation,'equivalent');
  assert.ok(tShirt?.projectedChanges.some((change) => change.slot === 'top'));
  assert.ok(!tShirt?.projectedChanges.some((change) => change.slot === 'mid'));
});

test('warm UV coverage can use the light long-sleeve top without forcing a body underneath', () => {
  const result = recommendOutfit(request(
    outdoor({ sunExposure:'direct' }),
    26,
    createSession('uv_top'),
    { uvIndex:5 }
  ));
  assert.equal(item(result,'top'),'light_long_sleeve_shirt');
  assert.equal(item(result,'base_torso'),null);
  assert.equal(item(result,'mid'),null);
  assert.equal(CLOTHING_CATALOG[item(result,'top')].sunCoverage,3);
});
