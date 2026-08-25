import test from 'node:test';
import assert from 'node:assert/strict';
import { CLOTHING_CATALOG, createSession, lockItem, recommendOutfit, setWarmthOffset } from '../src/index.js';

const PROFILE = Object.freeze({
  profileId:'review_baby', displayName:null, birthDate:'2026-01-24', warmthBias:'neutral', styleTheme:'neutral', defaultMode:'outdoor',
  createdAt:'2026-08-25T12:00:00.000Z', updatedAt:'2026-08-25T12:00:00.000Z'
});

function point(temp, overrides={}) {
  return {
    time:'2026-08-25T14:00:00+02:00', airTempC:temp, apparentTempC:null, apparentTempTrusted:false, apparentTempIncludes:[],
    windSpeedKmh:5, windGustKmh:8, precipProbabilityPct:0, precipMm:0, precipitationType:'none', uvIndex:1, cloudCoverPct:20, isDay:true,
    ...overrides
  };
}

function weather(temp, overrides={}) {
  return {
    weatherId:'review_weather', location:{locationId:'loc',label:'Test',latitude:47.8,longitude:13,timezone:'Europe/Vienna'},
    origin:'api', source:'test', fetchedAt:'2026-08-25T12:00:00.000Z', freshness:'fresh', current:point(temp,overrides), hourly:[]
  };
}

function request(context, { w=null, session=createSession('review_session') }={}) {
  return {
    requestId:'review_request', requestedAt:'2026-08-25T12:00:00.000Z', profile:{...PROFILE}, context, weather:w, session, neckFeedback:null
  };
}

function slot(result, name, phase='main') {
  return result.slots.find((entry) => entry.phase === phase && entry.slot === name);
}

function bodyThermalWeight(result, phase='main') {
  const bodySlots = new Set(['base_torso','legs','mid','outer','feet','head','hands']);
  return result.slots
    .filter((entry) => entry.phase === phase && bodySlots.has(entry.slot))
    .reduce((sum,entry) => sum + (CLOTHING_CATALOG[entry.selected.itemId]?.thermalWeight ?? 0),0);
}

test('car with missing transition weather is partial while in_car remains ready', () => {
  const result = recommendOutfit(request({
    mode:'car', plannedMinutes:30, includeOutdoorTransition:true, outsideTransitionMinutes:5,
    cabinTempC:21, cabinTempSource:'manual'
  }));
  assert.equal(result.status,'partial');
  assert.equal(result.phases.find((phase) => phase.phase === 'outdoor_transition')?.status,'blocked');
  assert.equal(result.phases.find((phase) => phase.phase === 'in_car')?.status,'ready');
});

test('automatic warmer correction in car never selects conditional/prohibited under harness layers', () => {
  const session = setWarmthOffset(createSession('car_warmer'),'warmer');
  const result = recommendOutfit(request({
    mode:'car', plannedMinutes:30, includeOutdoorTransition:false, outsideTransitionMinutes:null,
    cabinTempC:14, cabinTempSource:'manual'
  }, { session }));
  const underHarness = result.slots.filter((entry) => entry.phase === 'in_car' && entry.selected.wearPosition === 'under_harness');
  assert.ok(underHarness.length > 0);
  for (const entry of underHarness) {
    assert.equal(CLOTHING_CATALOG[entry.selected.itemId].carSeatCompatibility,'allowed',entry.selected.itemId);
  }
});

test('required rain and strong wind finish with one shell satisfying both protections', () => {
  const result = recommendOutfit(request({
    mode:'outdoor', plannedMinutes:60, activity:'normal', activitySource:'user', sunExposure:'shade', groundContact:'none'
  }, { w:weather(18,{windSpeedKmh:40,precipProbabilityPct:70}) }));
  const outer = CLOTHING_CATALOG[slot(result,'outer').selected.itemId];
  assert.ok(outer.rainProtection >= 3);
  assert.ok(outer.windProtection >= 3);
});

test('functional wind shell is thermally rebalanced when apparent temperature already contains wind', () => {
  const context = { mode:'outdoor', plannedMinutes:60, activity:'normal', activitySource:'user', sunExposure:'shade', groundContact:'none' };
  const calm = recommendOutfit(request(context,{ w:weather(18) }));
  const windy = recommendOutfit(request(context,{ w:weather(18,{
    apparentTempC:18, apparentTempTrusted:true, apparentTempIncludes:['wind','humidity','sun'], windSpeedKmh:35
  }) }));
  assert.equal(windy.phases[0].thermalAdjustment,0);
  assert.ok(CLOTHING_CATALOG[slot(windy,'outer').selected.itemId].windProtection >= 2);
  assert.ok(Math.abs(bodyThermalWeight(windy)-bodyThermalWeight(calm)) <= 1);
});

test('manual sleep underlayer lock rebalances the unlocked sleep bag', () => {
  const session = lockItem(createSession('sleep_under_lock'),{
    slot:'sleep_underlayer', itemId:'sleep_under_long_sleeve_bodysuit'
  });
  const result = recommendOutfit(request({ mode:'sleep', roomTempC:18.5 },{ session }));
  assert.equal(slot(result,'sleep_underlayer').selected.itemId,'sleep_under_long_sleeve_bodysuit');
  assert.equal(slot(result,'sleep_underlayer').selected.selectionSource,'manual_lock');
  assert.equal(slot(result,'sleep_bag').selected.itemId,'sleep_bag_1_5');
});

test('projected swap changes identify the locked slot separately from rebalanced slots', () => {
  const result = recommendOutfit(request({
    mode:'outdoor', plannedMinutes:60, activity:'normal', activitySource:'user', sunExposure:'shade', groundContact:'none'
  }, { w:weather(14) }));
  const fleece = slot(result,'mid').alternatives.find((option) => option.itemId === 'fleece_jacket');
  assert.ok(fleece);
  assert.equal(fleece.projectedChanges.find((change) => change.slot === 'mid')?.reasonCode,'MANUAL_ITEM_LOCK');
  assert.equal(fleece.projectedChanges.find((change) => change.slot === 'outer')?.reasonCode,'OUTFIT_REBALANCED_AFTER_SWAP');
});
