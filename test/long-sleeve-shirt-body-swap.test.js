import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession, lockItem, recommendOutfit } from '../src/index.js';

const PROFILE = Object.freeze({
  profileId:'baby_test',
  displayName:'Baby',
  birthDate:'2026-01-24',
  mobilityStage:'crawling',
  warmthBias:'neutral',
  paletteMode:'all',
  styleTheme:'neutral',
  defaultMode:'outdoor',
  createdAt:'2026-08-25T10:00:00.000Z',
  updatedAt:'2026-08-25T10:00:00.000Z'
});

function weather(temp, uvIndex = 1) {
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
      uvIndex,
      cloudCoverPct:20,
      isDay:true
    },
    hourly:[]
  };
}

function request(temp, session = createSession('swap_test'), contextOverrides = {}, uvIndex = 1) {
  return {
    requestId:'swap_test',
    requestedAt:'2026-08-25T12:00:00.000Z',
    profile:{ ...PROFILE },
    context:{
      mode:'outdoor',
      plannedMinutes:60,
      activity:'normal',
      activitySource:'user',
      sunExposure:'shade',
      groundContact:'none',
      ...contextOverrides
    },
    weather:weather(temp,uvIndex),
    session,
    neckFeedback:null
  };
}

function selected(result, slot) {
  return result.slots.find((entry) => entry.phase === 'main' && entry.slot === slot)?.selected.itemId ?? null;
}

function alternative(result, slot, itemId) {
  return result.slots
    .find((entry) => entry.phase === 'main' && entry.slot === slot)
    ?.alternatives.find((entry) => entry.itemId === itemId) ?? null;
}

test('Langarmbody can be swapped directly to Langarmshirt with thermal rebalance', () => {
  const base = recommendOutfit(request(22));
  assert.equal(selected(base,'base_torso'),'long_sleeve_bodysuit');

  const shirtAlternative = alternative(base,'base_torso','light_long_sleeve_shirt');
  assert.ok(shirtAlternative);
  assert.equal(shirtAlternative.relation,'equivalent');
  assert.ok(shirtAlternative.projectedChanges.some((change) => change.slot === 'top' && change.toItemId === 'light_long_sleeve_shirt'));
  assert.ok(shirtAlternative.projectedChanges.some((change) => change.slot === 'base_torso' && change.toItemId === 'short_sleeve_bodysuit'));

  const session = lockItem(createSession('swap_test'),{
    slot:'base_torso',
    itemId:'light_long_sleeve_shirt'
  });
  assert.deepEqual(session.manualLocks.map(({ slot,itemId }) => ({ slot,itemId })),[
    { slot:'top', itemId:'light_long_sleeve_shirt' }
  ]);

  const swapped = recommendOutfit(request(22,session));
  assert.equal(selected(swapped,'top'),'light_long_sleeve_shirt');
  assert.equal(selected(swapped,'base_torso'),'short_sleeve_bodysuit');
});

test('Langarmshirt can be swapped back to Langarmbody and replaces the old cross-slot lock', () => {
  let session = lockItem(createSession('swap_test'),{
    slot:'base_torso',
    itemId:'light_long_sleeve_shirt'
  });
  const shirtOutfit = recommendOutfit(request(22,session));
  assert.equal(selected(shirtOutfit,'top'),'light_long_sleeve_shirt');

  const bodyAlternative = alternative(shirtOutfit,'top','long_sleeve_bodysuit');
  assert.ok(bodyAlternative);
  assert.equal(bodyAlternative.relation,'equivalent');

  session = lockItem(session,{
    slot:'top',
    itemId:'long_sleeve_bodysuit'
  });
  assert.deepEqual(session.manualLocks.map(({ slot,itemId }) => ({ slot,itemId })),[
    { slot:'base_torso', itemId:'long_sleeve_bodysuit' }
  ]);

  const swappedBack = recommendOutfit(request(22,session));
  assert.equal(selected(swappedBack,'base_torso'),'long_sleeve_bodysuit');
  assert.equal(selected(swappedBack,'top'),null);
});

test('sun-covering Langarmshirt can be replaced by Langarmbody while preserving UV leg coverage', () => {
  const sunny = recommendOutfit(request(26,createSession('sunny_swap'),{ sunExposure:'partial' },6));
  assert.equal(selected(sunny,'top'),'light_long_sleeve_shirt');
  assert.equal(selected(sunny,'legs'),'light_trousers');

  const bodyAlternative = alternative(sunny,'top','long_sleeve_bodysuit');
  assert.ok(bodyAlternative);
  assert.equal(bodyAlternative.relation,'warmer');

  const session = lockItem(createSession('sunny_swap'),{
    slot:'top',
    itemId:'long_sleeve_bodysuit'
  });
  const swapped = recommendOutfit(request(26,session,{ sunExposure:'partial' },6));
  assert.equal(selected(swapped,'base_torso'),'long_sleeve_bodysuit');
  assert.equal(selected(swapped,'top'),null);
  assert.equal(selected(swapped,'legs'),'light_trousers');
  assert.ok(swapped.notices.some((notice) => notice.code === 'UV_SHADE_AND_COVERAGE'));
});
