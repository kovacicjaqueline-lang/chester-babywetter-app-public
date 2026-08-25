import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CLOTHING_CATALOG,
  recommendOutfit,
  createItemLock,
  adjustWarmthSession
} from '../src/index.js';

const NOW = '2026-08-25T14:00:00+02:00';

function profile(overrides = {}) {
  return {
    profileId: 'baby_1', displayName: 'Baby', birthDate: '2026-01-24',
    warmthBias: 'neutral', styleTheme: 'neutral', defaultMode: 'outdoor',
    createdAt: NOW, updatedAt: NOW, ...overrides
  };
}

function session(overrides = {}) {
  return { sessionId: 's1', manualLocks: [], warmthOffset: 0, ...overrides };
}

function point(overrides = {}) {
  return {
    time: NOW, airTempC: 16, apparentTempC: 16, apparentTempTrusted: true,
    apparentTempIncludes: ['wind', 'humidity', 'sun'], windSpeedKmh: 5, windGustKmh: 10,
    precipProbabilityPct: 10, precipMm: 0, precipitationType: 'none', uvIndex: 1,
    cloudCoverPct: 40, isDay: true, ...overrides
  };
}

function weather(currentOverrides = {}, hourly = [], overrides = {}) {
  return {
    weatherId: 'w1', location: { locationId: 'x', label: 'Salzburg', latitude: 47.8, longitude: 13.0, timezone: 'Europe/Vienna' },
    origin: 'api', source: 'open_meteo', fetchedAt: NOW, freshness: 'fresh',
    current: point(currentOverrides), hourly, ...overrides
  };
}

function outdoor(overrides = {}) {
  return { mode: 'outdoor', plannedMinutes: 90, activity: 'normal', activitySource: 'user', sunExposure: 'shade', groundContact: 'none', ...overrides };
}

function stroller(overrides = {}) {
  return { mode: 'stroller', plannedMinutes: 90, strollerState: 'awake', activity: 'normal', activitySource: 'user', sunExposure: 'shade', windProtection: 'partial', ...overrides };
}

function carrier(overrides = {}) {
  return { mode: 'carrier', plannedMinutes: 90, sunExposure: 'shade', placement: 'over_wearer_outerwear', ...overrides };
}

function req(context, weatherValue = weather(), overrides = {}) {
  return { requestId: 'r1', requestedAt: NOW, profile: profile(), context, weather: weatherValue, session: session(), neckFeedback: null, ...overrides };
}

function selected(result, slot, phase = 'main') {
  return result.slots.find((entry) => entry.phase === phase && entry.slot === slot)?.selected?.itemId ?? null;
}

function bodyScore(result, phase = 'main') {
  return result.slots
    .filter((entry) => entry.phase === phase && ['base_torso', 'legs', 'mid', 'outer'].includes(entry.slot))
    .reduce((sum, entry) => sum + (CLOTHING_CATALOG[entry.selected.itemId]?.thermalWeight ?? 0), 0);
}

function noticeCodes(result) {
  return result.notices.map((notice) => notice.code);
}

function slotIds(result, phase = 'main') {
  return Object.fromEntries(result.slots.filter((entry) => entry.phase === phase).map((entry) => [entry.slot, entry.selected.itemId]));
}

function changedSlots(a, b, phase = 'main') {
  const before = slotIds(a, phase); const after = slotIds(b, phase);
  return new Set([...Object.keys(before), ...Object.keys(after)].filter((key) => before[key] !== after[key]));
}

test('stroller does not force passive: awake active is lighter than asleep', () => {
  const w = weather({ airTempC: 15, apparentTempC: 15 });
  const active = recommendOutfit(req(stroller({ strollerState: 'awake', activity: 'active' }), w));
  const asleep = recommendOutfit(req(stroller({ strollerState: 'asleep', activity: 'active' }), w));
  assert.equal(selected(active, 'stroller_thermal_accessory'), null);
  assert.equal(selected(asleep, 'stroller_thermal_accessory'), 'stroller_light_blanket');
  assert.ok(bodyScore(asleep) + 0.5 >= bodyScore(active));
});

test('awake active and awake calm stroller can differ', () => {
  const w = weather({ airTempC: 15, apparentTempC: 15 });
  const active = recommendOutfit(req(stroller({ activity: 'active' }), w));
  const calm = recommendOutfit(req(stroller({ activity: 'calm' }), w));
  assert.notDeepEqual(slotIds(active), slotIds(calm));
});

test('warm footmuff can replace body warmth', () => {
  const w = weather({ airTempC: 7, apparentTempC: 7 });
  const withFootmuff = recommendOutfit(req(stroller({ strollerState: 'asleep' }), w));
  const noExternalSession = createItemLock(session(), { phase: 'main', slot: 'stroller_thermal_accessory', itemId: 'none', lockedAt: NOW });
  const without = recommendOutfit(req(stroller({ strollerState: 'asleep' }), w, { session: noExternalSession }));
  assert.equal(selected(withFootmuff, 'stroller_thermal_accessory'), 'stroller_warm_footmuff');
  assert.ok(bodyScore(withFootmuff) < bodyScore(without));
});

test('footmuff swap to light blanket triggers full outfit rebalance', () => {
  const w = weather({ airTempC: 7, apparentTempC: 7 });
  const base = recommendOutfit(req(stroller({ strollerState: 'asleep' }), w));
  const locked = createItemLock(session(), { phase: 'main', slot: 'stroller_thermal_accessory', itemId: 'stroller_light_blanket', lockedAt: NOW });
  const swapped = recommendOutfit(req(stroller({ strollerState: 'asleep' }), w, { session: locked }));
  assert.equal(selected(swapped, 'stroller_thermal_accessory'), 'stroller_light_blanket');
  assert.ok(changedSlots(base, swapped).size >= 2, 'accessory plus at least one body slot should change');
  assert.ok(bodyScore(swapped) > bodyScore(base));
});

test('pullover to fleece rebalances outer layer', () => {
  const w = weather({ airTempC: 13, apparentTempC: 13 });
  const base = recommendOutfit(req(outdoor(), w));
  assert.equal(selected(base, 'mid'), 'thin_sweater');
  const locked = createItemLock(session(), { phase: 'main', slot: 'mid', itemId: 'fleece_jacket', lockedAt: NOW });
  const swapped = recommendOutfit(req(outdoor(), w, { session: locked }));
  assert.equal(selected(swapped, 'mid'), 'fleece_jacket');
  assert.notEqual(selected(swapped, 'outer'), selected(base, 'outer'));
});

test('stroller rain cover avoids redundant rain jacket', () => {
  const w = weather({ airTempC: 16, apparentTempC: 16, precipProbabilityPct: 70 });
  const result = recommendOutfit(req(stroller(), w));
  assert.equal(selected(result, 'stroller_weather_accessory'), 'stroller_rain_cover');
  assert.notEqual(selected(result, 'outer'), 'rain_jacket');
});

test('removing stroller rain cover requires rain jacket', () => {
  const w = weather({ airTempC: 16, apparentTempC: 16, precipProbabilityPct: 70 });
  const locked = createItemLock(session(), { phase: 'main', slot: 'stroller_weather_accessory', itemId: 'none', lockedAt: NOW });
  const result = recommendOutfit(req(stroller(), w, { session: locked }));
  assert.equal(selected(result, 'stroller_weather_accessory'), null);
  assert.equal(selected(result, 'outer'), 'rain_jacket');
});

test('direct sun in stroller prefers sunshade', () => {
  const result = recommendOutfit(req(stroller({ sunExposure: 'direct' }), weather({ uvIndex: 5 })));
  assert.equal(selected(result, 'stroller_weather_accessory'), 'stroller_sunshade');
  assert.ok(noticeCodes(result).includes('STROLLER_SUNSHADE'));
});

test('Open-Meteo apparent temperature does not double-count wind thermally', () => {
  const included = recommendOutfit(req(outdoor(), weather({ apparentTempC: 10, airTempC: 12, windSpeedKmh: 35, apparentTempIncludes: ['wind', 'humidity', 'sun'] })));
  const notIncluded = recommendOutfit(req(outdoor(), weather({ apparentTempC: 10, airTempC: 12, windSpeedKmh: 35, apparentTempIncludes: ['humidity', 'sun'] })));
  const a = included.phases[0].thermalAdjustment;
  const b = notIncluded.phases[0].thermalAdjustment;
  assert.equal(a, 0);
  assert.equal(b, 1);
});

test('wind protection remains required even when wind is in apparent temperature', () => {
  const result = recommendOutfit(req(outdoor(), weather({ apparentTempC: 16, airTempC: 17, windSpeedKmh: 35, apparentTempIncludes: ['wind', 'humidity', 'sun'] })));
  const outer = CLOTHING_CATALOG[selected(result, 'outer')];
  assert.ok(outer && outer.windProtection >= 2);
});

test('precip probability below 40 alone adds no rain element', () => {
  const result = recommendOutfit(req(outdoor(), weather({ precipProbabilityPct: 39 })));
  assert.notEqual(selected(result, 'outer'), 'rain_jacket');
  assert.ok(!noticeCodes(result).includes('RAIN_PROTECTION_REQUIRED'));
});

test('precip probability 40-59 is optional, not automatic', () => {
  const result = recommendOutfit(req(outdoor(), weather({ precipProbabilityPct: 50 })));
  assert.notEqual(selected(result, 'outer'), 'rain_jacket');
  assert.ok(noticeCodes(result).includes('RAIN_PROTECTION_OPTIONAL'));
});

test('precip probability >=60 in relevant window requires rain protection', () => {
  const hour = point({ time: '2026-08-25T15:00:00+02:00', precipProbabilityPct: 65 });
  const result = recommendOutfit(req(outdoor(), weather({ precipProbabilityPct: 20 }, [hour])));
  assert.equal(selected(result, 'outer'), 'rain_jacket');
});

test('carrier body heat reduces torso insulation but exposed areas remain protected', () => {
  const w = weather({ airTempC: 10, apparentTempC: 10 });
  const out = recommendOutfit(req(outdoor(), w));
  const carried = recommendOutfit(req(carrier(), w));
  assert.ok(bodyScore(carried) < bodyScore(out));
  assert.equal(selected(carried, 'feet'), 'warm_socks_booties');
  assert.equal(selected(carried, 'head'), 'thin_hat');
});

test('wearer outerwear plus warm carrier cover is capped at -2 thermal steps', () => {
  const locked = createItemLock(session(), { phase: 'main', slot: 'carrier_accessory', itemId: 'carrier_cover_warm', lockedAt: NOW });
  const result = recommendOutfit(req(carrier({ placement: 'under_wearer_outerwear' }), weather({ airTempC: 5, apparentTempC: 5 }), { session: locked }));
  const trace = result.ruleTrace.find((entry) => entry.ruleId === 'situation.carrier.body_heat');
  assert.equal(trace.delta, -2);
});

test('car has separate outdoor_transition and in_car phases', () => {
  const context = { mode: 'car', plannedMinutes: 30, includeOutdoorTransition: true, outsideTransitionMinutes: 5, cabinTempC: 20, cabinTempSource: 'manual' };
  const result = recommendOutfit(req(context, weather({ airTempC: 5, apparentTempC: 5 })));
  assert.ok(result.phases.some((phase) => phase.phase === 'outdoor_transition'));
  assert.ok(result.phases.some((phase) => phase.phase === 'in_car'));
});

test('winter overall is never under harness', () => {
  const context = { mode: 'car', plannedMinutes: 30, includeOutdoorTransition: false, outsideTransitionMinutes: null, cabinTempC: 0, cabinTempSource: 'manual' };
  const locked = createItemLock(session(), { phase: 'in_car', slot: 'outer', itemId: 'winter_overall', lockedAt: NOW });
  const result = recommendOutfit(req(context, null, { session: locked }));
  assert.ok(!result.slots.some((entry) => entry.phase === 'in_car' && entry.selected.itemId === 'winter_overall'));
  assert.ok(noticeCodes(result).includes('MANUAL_LOCK_OVERRIDDEN_FOR_SAFETY'));
});

test('estimated cabin temperature is propagated visibly', () => {
  const context = { mode: 'car', plannedMinutes: 30, includeOutdoorTransition: false, outsideTransitionMinutes: null, cabinTempC: 20, cabinTempSource: 'estimated' };
  const result = recommendOutfit(req(context, null));
  assert.equal(result.status, 'ready_with_estimate');
  assert.equal(result.phases.find((phase) => phase.phase === 'in_car').status, 'ready_with_estimate');
  assert.ok(noticeCodes(result).includes('CAR_CABIN_TEMPERATURE_ESTIMATED'));
  assert.equal(result.dataQuality.usedEstimatedCabinTemperature, true);
});

test('sleep uses room temperature and ignores outdoor weather', () => {
  const context = { mode: 'sleep', roomTempC: 18.5 };
  const coldOutside = recommendOutfit(req(context, weather({ airTempC: -10, apparentTempC: -20 })));
  const hotOutside = recommendOutfit(req(context, weather({ airTempC: 35, apparentTempC: 38 })));
  assert.deepEqual(slotIds(coldOutside), slotIds(hotOutside));
  assert.equal(coldOutside.phases[0].thermalReferenceSource, 'room_temp');
});

test('all five TOGs plus no sleep bag are interchangeable', () => {
  const result = recommendOutfit(req({ mode: 'sleep', roomTempC: 19 }, null));
  const bagSlot = result.slots.find((entry) => entry.slot === 'sleep_bag');
  const ids = new Set([bagSlot.selected.itemId, ...bagSlot.alternatives.map((entry) => entry.itemId)]);
  assert.deepEqual(ids, new Set(['sleep_bag_none', 'sleep_bag_0_5', 'sleep_bag_1_0', 'sleep_bag_1_5', 'sleep_bag_2_5', 'sleep_bag_3_5']));
});

test('TOG 2.5 to 1.0 rebalances to warmer sleep underlayer', () => {
  const context = { mode: 'sleep', roomTempC: 18.5 };
  const base = recommendOutfit(req(context, null));
  assert.equal(selected(base, 'sleep_bag'), 'sleep_bag_2_5');
  assert.equal(selected(base, 'sleep_underlayer'), 'sleep_underlayer_short_sleeve_bodysuit');
  const locked = createItemLock(session(), { phase: 'main', slot: 'sleep_bag', itemId: 'sleep_bag_1_0', lockedAt: NOW });
  const swapped = recommendOutfit(req(context, null, { session: locked }));
  assert.equal(selected(swapped, 'sleep_bag'), 'sleep_bag_1_0');
  assert.equal(selected(swapped, 'sleep_underlayer'), 'sleep_underlayer_short_bodysuit_plus_light_pajamas');
});

test('sleep never recommends loose blanket over sleep bag', () => {
  const result = recommendOutfit(req({ mode: 'sleep', roomTempC: 15 }, null));
  assert.ok(!result.items.some((entry) => entry.itemId.includes('blanket')));
  assert.ok(noticeCodes(result).includes('SLEEP_NO_LOOSE_BLANKET_OVER_BAG'));
});

test('styleTheme does not alter fach item ids or safety codes', () => {
  const baseReq = req(outdoor(), weather({ airTempC: 12, apparentTempC: 12 }));
  const neutral = recommendOutfit({ ...baseReq, profile: profile({ styleTheme: 'neutral' }) });
  const boy = recommendOutfit({ ...baseReq, profile: profile({ styleTheme: 'boy' }) });
  const girl = recommendOutfit({ ...baseReq, profile: profile({ styleTheme: 'girl' }) });
  assert.deepEqual(slotIds(neutral), slotIds(boy));
  assert.deepEqual(slotIds(neutral), slotIds(girl));
  assert.deepEqual(noticeCodes(neutral), noticeCodes(boy));
});

test('manual item lock remains selected in same session', () => {
  const locked = createItemLock(session(), { phase: 'main', slot: 'mid', itemId: 'fleece_jacket', lockedAt: NOW });
  const result = recommendOutfit(req(outdoor(), weather({ airTempC: 17, apparentTempC: 17 }), { session: locked }));
  const mid = result.slots.find((entry) => entry.slot === 'mid');
  assert.equal(mid.selected.itemId, 'fleece_jacket');
  assert.equal(mid.selected.selectionSource, 'manual_lock');
});

test('safety may override a lock and records structured reason', () => {
  const context = { mode: 'car', plannedMinutes: 30, includeOutdoorTransition: false, outsideTransitionMinutes: null, cabinTempC: 18, cabinTempSource: 'manual' };
  const locked = createItemLock(session(), { phase: 'in_car', slot: 'outer', itemId: 'winter_overall', lockedAt: NOW });
  const result = recommendOutfit(req(context, null, { session: locked }));
  const notice = result.notices.find((entry) => entry.code === 'MANUAL_LOCK_OVERRIDDEN_FOR_SAFETY');
  assert.ok(notice);
  assert.equal(notice.data.slot, 'outer');
  assert.ok(result.ruleTrace.some((entry) => entry.effect === 'override_lock' && entry.target === 'winter_overall'));
});

test('warmer quick correction changes the minimum sensible number of slots', () => {
  const context = outdoor(); const w = weather({ airTempC: 17, apparentTempC: 17 });
  const base = recommendOutfit(req(context, w));
  const warmer = recommendOutfit(req(context, w, { session: adjustWarmthSession(session(), 'warmer') }));
  assert.equal(changedSlots(base, warmer).size, 1);
  assert.ok(bodyScore(warmer) >= bodyScore(base));
});

test('cooler quick correction changes the minimum sensible number of slots', () => {
  const context = outdoor(); const w = weather({ airTempC: 17, apparentTempC: 17 });
  const base = recommendOutfit(req(context, w));
  const cooler = recommendOutfit(req(context, w, { session: adjustWarmthSession(session(), 'cooler') }));
  assert.equal(changedSlots(base, cooler).size, 1);
  assert.ok(bodyScore(cooler) <= bodyScore(base));
});

test('hot_sweaty never increases isolation and cool never reduces it', () => {
  const baseReq = req(outdoor(), weather({ airTempC: 17, apparentTempC: 17 }));
  const normal = recommendOutfit(baseReq);
  const hot = recommendOutfit({ ...baseReq, neckFeedback: 'hot_sweaty' });
  const cool = recommendOutfit({ ...baseReq, neckFeedback: 'cool' });
  assert.ok(bodyScore(hot) <= bodyScore(normal));
  assert.ok(bodyScore(cool) >= bodyScore(normal));
});

test('neck feedback does not learn or mutate persistent warmthBias', () => {
  const p = profile({ warmthBias: 'neutral' });
  const baseReq = req(outdoor(), weather(), { profile: p });
  recommendOutfit({ ...baseReq, neckFeedback: 'cool' });
  assert.equal(p.warmthBias, 'neutral');
  assert.equal(recommendOutfit(baseReq).phases[0].thermalAdjustment, 0);
});

test('groundContact none does not add footwear', () => {
  const result = recommendOutfit(req(outdoor({ groundContact: 'none' }), weather({ airTempC: 8, apparentTempC: 8 })));
  assert.equal(selected(result, 'footwear'), null);
});

test('walking ground contact adds weather-appropriate footwear', () => {
  const result = recommendOutfit(req(outdoor({ groundContact: 'walking' }), weather({ airTempC: 18, apparentTempC: 18 })));
  assert.equal(selected(result, 'footwear'), 'weather_shoes');
});

test('warmth bias is calibrated to +/-0.5', () => {
  const base = req(outdoor(), weather({ airTempC: 17, apparentTempC: 17 }));
  const cool = recommendOutfit({ ...base, profile: profile({ warmthBias: 'runs_cool' }) });
  const warm = recommendOutfit({ ...base, profile: profile({ warmthBias: 'runs_warm' }) });
  assert.equal(cool.phases[0].thermalAdjustment, 0.5);
  assert.equal(warm.phases[0].thermalAdjustment, -0.5);
});

test('missing optional weather is not interpreted as zero', () => {
  const w = weather({ windSpeedKmh: null, windGustKmh: null, precipProbabilityPct: null, uvIndex: null });
  const result = recommendOutfit(req(outdoor(), w));
  assert.equal(result.status, 'partial');
  assert.ok(noticeCodes(result).includes('WEATHER_DATA_INCOMPLETE'));
  assert.ok(result.dataQuality.missingFields.includes('weather.current.windSpeedKmh'));
});

test('alternative ordering is equivalent then warmer then cooler', () => {
  const result = recommendOutfit(req(outdoor(), weather({ airTempC: 17, apparentTempC: 17 })));
  const mid = result.slots.find((entry) => entry.slot === 'mid');
  const ranks = mid.alternatives.map((entry) => ({ equivalent: 0, warmer: 1, cooler: 2 })[entry.relation]);
  assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b));
});

test('alternative projected changes expose total rebalancing impact', () => {
  const result = recommendOutfit(req(stroller({ strollerState: 'asleep' }), weather({ airTempC: 7, apparentTempC: 7 })));
  const accessory = result.slots.find((entry) => entry.slot === 'stroller_thermal_accessory');
  const blanket = accessory.alternatives.find((entry) => entry.itemId === 'stroller_light_blanket');
  assert.ok(blanket.projectedChanges.some((change) => ['base_torso', 'legs', 'mid', 'outer'].includes(change.slot)));
});
