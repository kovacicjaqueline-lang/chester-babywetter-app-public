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

function request(context, { w=null, session=createSession('review_session'), p=PROFILE, neckFeedback=null }={}) {
  return {
    requestId:'review_request', requestedAt:'2026-08-25T12:00:00.000Z', profile:{...p}, context, weather:w, session, neckFeedback
  };
}

function slot(result, name, phase='main') {
  return result.slots.find((entry) => entry.phase === phase && entry.slot === name);
}

function selectedIds(result,phase='main') {
  return result.slots.filter((entry) => entry.phase === phase).map((entry) => entry.selected.itemId);
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

test('half thermal step is a smaller distinct outfit change than a full step', () => {
  const context = { mode:'outdoor', plannedMinutes:60, activity:'normal', activitySource:'user', sunExposure:'shade', groundContact:'none' };
  const half = recommendOutfit(request(context,{
    w:weather(18),
    p:{...PROFILE,warmthBias:'runs_cool'}
  }));
  const full = recommendOutfit(request(context,{
    w:weather(18),
    neckFeedback:'cool'
  }));
  assert.equal(half.phases[0].thermalAdjustment,0.5);
  assert.equal(full.phases[0].thermalAdjustment,1);
  assert.notDeepEqual(selectedIds(half),selectedIds(full));
  assert.equal(slot(half,'mid').selected.itemId,'thin_sweater');
  assert.equal(slot(half,'feet').selected.itemId,'warm_socks_booties');
  assert.equal(slot(full,'mid').selected.itemId,'fleece_jacket');
});

test('footwear manual lock is retained and footwear alternatives remain available', () => {
  const context = { mode:'outdoor', plannedMinutes:60, activity:'normal', activitySource:'user', sunExposure:'shade', groundContact:'walking' };
  const session = lockItem(createSession('footwear_lock'),{ slot:'footwear', itemId:'warm_shoes' });
  const result = recommendOutfit(request(context,{ w:weather(20),session }));
  const footwear = slot(result,'footwear');
  assert.equal(footwear.selected.itemId,'warm_shoes');
  assert.equal(footwear.selected.selectionSource,'manual_lock');
  assert.equal(footwear.alternatives.find((option) => option.itemId === 'light_shoes')?.relation,'cooler');
  assert.equal(footwear.alternatives.find((option) => option.itemId === 'weatherproof_shoes')?.relation,'cooler');
});

test('missing precipitation probability is reported even when current precipitation is known dry', () => {
  const context = { mode:'outdoor', plannedMinutes:60, activity:'normal', activitySource:'user', sunExposure:'shade', groundContact:'none' };
  const result = recommendOutfit(request(context,{
    w:weather(18,{ precipProbabilityPct:null,precipMm:0,precipitationType:'none' })
  }));
  assert.equal(result.status,'partial');
  assert.ok(result.dataQuality.missingFields.includes('weather.precipProbabilityPct'));
  assert.ok(result.notices.some((notice) => notice.code === 'WEATHER_DATA_INCOMPLETE'));
});

test('manual outer lock that cannot satisfy required wind remains locked but makes result partial', () => {
  const context = { mode:'outdoor', plannedMinutes:60, activity:'normal', activitySource:'user', sunExposure:'shade', groundContact:'none' };
  const session = lockItem(createSession('weather_lock'),{ slot:'outer', itemId:'light_transition_jacket' });
  const result = recommendOutfit(request(context,{
    w:weather(18,{ windSpeedKmh:40 }),
    session
  }));
  assert.equal(slot(result,'outer').selected.itemId,'light_transition_jacket');
  assert.equal(slot(result,'outer').selected.selectionSource,'manual_lock');
  assert.equal(result.status,'partial');
  assert.equal(result.phases.find((phase) => phase.phase === 'main')?.status,'partial');
  assert.ok(result.notices.some((notice) => notice.code === 'MANUAL_LOCK_LIMITS_WEATHER_PROTECTION'));
});
