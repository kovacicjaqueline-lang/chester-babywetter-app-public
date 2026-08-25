import { CLOTHING_CATALOG, SLOT_ITEMS } from './clothing-catalog.js';
import { SLEEP_UNDERLAYER_IDS } from './sleep-tog-rules.js';

export const TEMPERATURE_BANDS = Object.freeze([
  Object.freeze({ id:'below_0', min:-Infinity, max:0, label:'< 0 °C' }),
  Object.freeze({ id:'0_to_3', min:0, max:3, label:'0 bis < 3 °C' }),
  Object.freeze({ id:'3_to_8', min:3, max:8, label:'3 bis < 8 °C' }),
  Object.freeze({ id:'8_to_12', min:8, max:12, label:'8 bis < 12 °C' }),
  Object.freeze({ id:'12_to_16', min:12, max:16, label:'12 bis < 16 °C' }),
  Object.freeze({ id:'16_to_20', min:16, max:20, label:'16 bis < 20 °C' }),
  Object.freeze({ id:'20_to_24', min:20, max:24, label:'20 bis < 24 °C' }),
  Object.freeze({ id:'24_to_28', min:24, max:28, label:'24 bis < 28 °C' }),
  Object.freeze({ id:'28_to_30', min:28, max:30, label:'28 bis < 30 °C' }),
  Object.freeze({ id:'30_plus', min:30, max:Infinity, label:'≥ 30 °C' })
]);

export const BASELINE = Object.freeze({
  below_0: Object.freeze({ base_torso:'long_sleeve_bodysuit', legs:'warm_trousers', mid:'fleece_jacket', outer:'winter_overall', feet:'warm_socks_booties', head:'warm_hat', hands:'gloves' }),
  '0_to_3': Object.freeze({ base_torso:'long_sleeve_bodysuit', legs:'warm_trousers', mid:'fleece_jacket', outer:'winter_overall', feet:'warm_socks_booties', head:'warm_hat', hands:'gloves' }),
  '3_to_8': Object.freeze({ base_torso:'long_sleeve_bodysuit', legs:'warm_trousers', mid:'fleece_jacket', outer:'transition_overall', feet:'warm_socks_booties', head:'warm_hat', hands:'gloves' }),
  '8_to_12': Object.freeze({ base_torso:'long_sleeve_bodysuit', legs:'warm_trousers', mid:'fleece_jacket', outer:'softshell_jacket', feet:'warm_socks_booties', head:'warm_hat', hands:'gloves' }),
  '12_to_16': Object.freeze({ base_torso:'long_sleeve_bodysuit', legs:'trousers', mid:'thin_sweater', outer:'softshell_jacket', feet:'socks', head:'thin_hat' }),
  '16_to_20': Object.freeze({ base_torso:'long_sleeve_bodysuit', legs:'trousers', mid:'thin_sweater', feet:'socks' }),
  '20_to_24': Object.freeze({ base_torso:'long_sleeve_bodysuit', legs:'light_trousers', feet:'socks' }),
  '24_to_28': Object.freeze({ base_torso:'short_sleeve_bodysuit', legs:'light_trousers' }),
  '28_to_30': Object.freeze({ base_torso:'short_sleeve_bodysuit' }),
  '30_plus': Object.freeze({ base_torso:'short_sleeve_bodysuit' })
});

export const THERMAL_LADDERS = Object.freeze({
  base_torso: Object.freeze(['short_sleeve_bodysuit','long_sleeve_bodysuit']),
  legs: Object.freeze([null,'light_trousers','trousers','warm_trousers']),
  mid: Object.freeze([null,'thin_sweater','fleece_jacket']),
  outer: Object.freeze([null,'light_transition_jacket','softshell_jacket','winter_overall']),
  feet: Object.freeze([null,'socks','warm_socks_booties']),
  head: Object.freeze([null,'thin_hat','warm_hat']),
  hands: Object.freeze([null,'gloves'])
});

export const BODY_SLOTS = Object.freeze(['base_torso','legs','mid','outer','feet','head','hands']);
export const QUICK_WARM_PRIORITY = Object.freeze(['mid','outer','base_torso','legs','feet','head','hands']);
export const QUICK_COOL_PRIORITY = Object.freeze(['outer','mid','legs','base_torso','feet','head','hands']);
export const RELATION_ORDER = Object.freeze({ equivalent:0, warmer:1, cooler:2 });

export function createSession(sessionId = 'session') {
  return { sessionId, manualLocks: [], warmthOffset: 0 };
}

export function setWarmthOffset(session, direction) {
  const offset = direction === 'warmer' ? 1 : direction === 'cooler' ? -1 : 0;
  return { ...session, manualLocks:[...(session?.manualLocks ?? [])], warmthOffset:offset };
}

export function lockItem(session, { phase = 'main', slot, itemId, lockedAt = '1970-01-01T00:00:00.000Z' }) {
  if (!slot || !itemId) throw new TypeError('slot and itemId are required');
  const locks = (session?.manualLocks ?? []).filter((lock) => !(lock.phase === phase && lock.slot === slot));
  locks.push({ phase, slot, itemId, lockedAt });
  return { ...(session ?? createSession()), manualLocks:locks };
}

export function temperatureBandFor(value) {
  if (!isFiniteNumber(value)) throw new TypeError('temperature must be a finite number');
  return TEMPERATURE_BANDS.find((band) => value >= band.min && value < band.max);
}

export function seedBaseline(state, bandId, mode) {
  const baseline = BASELINE[bandId];
  for (const [slot,itemId] of Object.entries(baseline)) {
    if (!allowedInMode(itemId,mode)) continue;
    setSelected(state,slot,itemId,'engine','on_body',[`BASELINE_${bandId.toUpperCase()}`]);
  }
}

export function makeCarSafeBaseline(state) {
  for (const slot of [...state.map.keys()]) {
    if (!BODY_SLOTS.includes(slot)) continue;
    const selection = state.map.get(slot);
    const definition = CLOTHING_CATALOG[selection.itemId];
    if (!definition) continue;
    if (slot === 'outer') { state.map.delete(slot); continue; }
    if (definition.carSeatCompatibility === 'conditional') {
      if (slot === 'mid') setSelected(state,'mid','thin_sweater','engine','under_harness',['IN_CAR_THERMAL_BASELINE']);
      else state.map.delete(slot);
    } else if (definition.carSeatCompatibility === 'prohibited') {
      state.map.delete(slot);
    } else {
      selection.wearPosition = 'under_harness';
      selection.reasonCodes = unique([...selection.reasonCodes,'IN_CAR_THERMAL_BASELINE']);
    }
  }
}

export function applyCarrierTorsoReduction(state, credit, mode) {
  if (credit <= 0) return;
  applyThermalDelta(state,-credit,new Set(['legs','feet','head','hands']),mode,['mid','outer','base_torso']);
}

export function protectCarrierExposedAreas(state,temp) {
  if (temp < 12) {
    setSelected(state,'feet','warm_socks_booties','engine','on_body',['CARRIER_EXPOSED_FEET']);
    setSelected(state,'head','warm_hat','engine','on_body',['CARRIER_EXPOSED_HEAD']);
  } else if (temp < 16) {
    setSelected(state,'feet','warm_socks_booties','engine','on_body',['CARRIER_EXPOSED_FEET']);
    setSelected(state,'head','thin_hat','engine','on_body',['CARRIER_EXPOSED_HEAD']);
  } else if (temp < 22) {
    setSelected(state,'feet','socks','engine','on_body',['CARRIER_EXPOSED_FEET']);
  }
}

export function selectStrollerThermalAccessory(request,temp,phase) {
  const lock = findLock(request.session,phase,'stroller_thermal_accessory');
  if (lock && CLOTHING_CATALOG[lock.itemId]?.slot === 'stroller_thermal_accessory') return { itemId:lock.itemId, source:'manual_lock', reasons:['MANUAL_ITEM_LOCK'] };
  const { strollerState, activity } = request.context;
  let itemId = 'stroller_thermal_none';
  if (temp >= 18) itemId = 'stroller_thermal_none';
  else if (temp >= 14) itemId = strollerState === 'asleep' || activity !== 'active' ? 'stroller_light_blanket' : 'stroller_thermal_none';
  else if (temp >= 10) itemId = strollerState === 'awake' && activity === 'active' ? 'stroller_light_blanket' : 'stroller_light_footmuff';
  else if (temp >= 5) itemId = strollerState === 'awake' && activity === 'active' ? 'stroller_light_footmuff' : 'stroller_warm_footmuff';
  else itemId = 'stroller_warm_footmuff';
  return { itemId, source:'engine', reasons:['STROLLER_EXTERNAL_INSULATION'] };
}

export function selectStrollerWeatherAccessory(request,rainRequired,sunActive,phase) {
  const lock = findLock(request.session,phase,'stroller_weather_accessory');
  if (lock && CLOTHING_CATALOG[lock.itemId]?.slot === 'stroller_weather_accessory') return { itemId:lock.itemId, source:'manual_lock', reasons:['MANUAL_ITEM_LOCK'] };
  if (rainRequired) return { itemId:'stroller_rain_cover', source:'engine', reasons:['STROLLER_RAIN_COVER'] };
  if (sunActive) return { itemId:'stroller_sunshade', source:'engine', reasons:['STROLLER_SUNSHADE'] };
  return { itemId:'stroller_weather_none', source:'engine', reasons:['NO_STROLLER_WEATHER_ACCESSORY_REQUIRED'] };
}

export function selectCarrierAccessory(request,temp,phase) {
  const lock = findLock(request.session,phase,'carrier_accessory');
  if (lock && CLOTHING_CATALOG[lock.itemId]?.slot === 'carrier_accessory') return { itemId:lock.itemId, source:'manual_lock', reasons:['MANUAL_ITEM_LOCK'] };
  let itemId = 'carrier_cover_none';
  if (temp < 8) itemId = 'carrier_cover_warm';
  else if (temp < 14) itemId = 'carrier_cover_light';
  return { itemId, source:'engine', reasons:['CARRIER_COVER_OPTION'] };
}

export function carrierThermalCredit(context,coverCredit) {
  let credit = 1 + coverCredit;
  if (context.placement === 'under_wearer_outerwear') credit += 0.5;
  return Math.min(2,credit);
}

export function activityAdjustmentFor(context,mode) {
  if (mode !== 'outdoor') return 0;
  if (context.activity === 'calm') return 0.5;
  if (context.activity === 'active') return -1;
  return 0;
}

export function strollerStateAdjustment(context) {
  if (context.strollerState === 'asleep') return 1;
  if (context.activity === 'active') return 0;
  return 0.5;
}

export function warmthBiasAdjustment(bias) {
  if (bias === 'runs_cool') return 0.5;
  if (bias === 'runs_warm') return -0.5;
  return 0;
}

export function neckFeedbackAdjustment(feedback) {
  if (feedback === 'cool') return 1;
  if (feedback === 'hot_sweaty') return -1;
  return 0;
}

export function thermalEnvironment(point) {
  if (point.apparentTempTrusted === true && isFiniteNumber(point.apparentTempC)) {
    return { thermalReferenceC:point.apparentTempC, referenceSource:'apparent_temp', included:new Set(point.apparentTempIncludes ?? []) };
  }
  return { thermalReferenceC:point.airTempC, referenceSource:'air_temp', included:new Set() };
}

export function summarizeWeatherWindow(weather,plannedMinutes) {
  const point = weather.current;
  const duration = isFiniteNumber(plannedMinutes) ? Math.max(0,plannedMinutes) : 120;
  const startMs = Date.parse(point.time);
  const endMs = Number.isFinite(startMs) ? startMs + duration * 60000 : Infinity;
  const points = [point, ...(weather.hourly ?? []).filter((entry) => {
    const time = Date.parse(entry.time);
    return !Number.isFinite(startMs) || !Number.isFinite(time) || (time >= startMs && time <= endMs);
  })];
  return {
    startTime:point.time,
    endTime:Number.isFinite(endMs) ? new Date(endMs).toISOString() : point.time,
    maxPrecipProbabilityPct:maxFinite(points.map((p) => p.precipProbabilityPct)),
    totalPrecipMm:sumFinite(points.map((p) => p.precipMm)),
    maxWindSpeedKmh:maxFinite(points.map((p) => p.windSpeedKmh)),
    maxWindGustKmh:maxFinite(points.map((p) => p.windGustKmh)),
    maxUvIndex:maxFinite(points.map((p) => p.uvIndex)),
    missingFields:[]
  };
}

export function evaluateWind(weatherWindow,thermal,context,mode) {
  const speed = weatherWindow.maxWindSpeedKmh;
  const gust = weatherWindow.maxWindGustKmh;
  let level = 0;
  if (isFiniteNumber(speed)) {
    if (speed >= 39) level = 3;
    else if (speed >= 29) level = 2;
    else if (speed >= 20) level = 1;
  }
  if (isFiniteNumber(gust)) {
    if (gust >= 50) level = Math.max(level,3);
    else if (gust >= 39) level = Math.max(level,2);
  }
  let thermalAdjustment = 0;
  if (!thermal.included.has('wind') && isFiniteNumber(speed)) {
    if (speed >= 50) thermalAdjustment = 2;
    else if (speed >= 39) thermalAdjustment = 1.5;
    else if (speed >= 29) thermalAdjustment = 1;
    else if (speed >= 20) thermalAdjustment = 0.5;
  }
  if (mode === 'stroller' && thermalAdjustment > 0) {
    if (context.windProtection === 'partial') thermalAdjustment = Math.max(0,thermalAdjustment - 0.5);
    if (context.windProtection === 'good') thermalAdjustment = Math.max(0,thermalAdjustment - 1);
  }
  return { requiredProtection:level, thermalAdjustment, strongCaution:(speed ?? 0) >= 50 || (gust ?? 0) >= 60 };
}

export function rainRequirement(weatherWindow,point) {
  const current = (isFiniteNumber(point.precipMm) && point.precipMm > 0) || ['rain','snow','sleet'].includes(point.precipitationType);
  const probability = weatherWindow.maxPrecipProbabilityPct;
  return { required:current || (isFiniteNumber(probability) && probability >= 60), optional:!current && isFiniteNumber(probability) && probability >= 40 && probability < 60 };
}

export function sunRequirement(weatherWindow,context) {
  const uv = weatherWindow.maxUvIndex;
  return { active:context.sunExposure === 'direct' || (isFiniteNumber(uv) && uv >= 3 && context.sunExposure !== 'shade'), uvIndex:uv };
}

export function applyRainProtection(state,result,request,rain,phase,mode) {
  if (rain.optional) addNotice(result,'RAIN_PROTECTION_OPTIONAL','info',phase,['RAIN_PROBABILITY_40_TO_59'],{});
  if (!rain.required) return;
  if (mode === 'stroller' && state.map.get('stroller_weather_accessory')?.itemId === 'stroller_rain_cover') return;
  ensureFunctionalOuter(state,'rain',3);
  addTrace(result,'weather.rain.required',phase,'protect','outer',null,'RAIN_PROTECTION_REQUIRED');
}

export function applyWindProtection(state,result,wind,phase,mode) {
  if (!wind.requiredProtection) return;
  const accessoryWind = mode === 'stroller' ? CLOTHING_CATALOG[state.map.get('stroller_weather_accessory')?.itemId]?.windProtection ?? 0 : 0;
  if (accessoryWind < wind.requiredProtection) ensureFunctionalOuter(state,'wind',wind.requiredProtection);
  addTrace(result,'weather.wind.protection',phase,'protect','outer',wind.requiredProtection,'WIND_PROTECTION_REQUIRED');
}

export function ensureFunctionalOuter(state,type,level) {
  const existing = state.map.get('outer');
  const def = existing ? CLOTHING_CATALOG[existing.itemId] : null;
  const currentProtection = type === 'rain' ? def?.rainProtection ?? 0 : def?.windProtection ?? 0;
  if (currentProtection >= level) return;
  if (type === 'rain') setSelected(state,'outer','rain_jacket','engine','on_body',['RAIN_PROTECTION_REQUIRED']);
  else setSelected(state,'outer',level >= 2 ? 'softshell_jacket' : 'light_transition_jacket','engine','on_body',['WIND_PROTECTION_REQUIRED']);
}

export function applySunProtection(state,result,request,uv,temp,phase,mode) {
  const exposure = request.context.sunExposure ?? 'unknown';
  if (exposure === 'direct') {
    const age = ageMonths(request.profile.birthDate, request.weather?.current?.time ?? request.requestedAt);
    if (age == null) addNotice(result,'AGE_UNKNOWN_DIRECT_SUN_CONSERVATIVE_RULE','caution',phase,['DIRECT_SUN_AVOIDANCE'],{});
    else if (age < 12) addNotice(result,'INFANT_UNDER_12M_AVOID_DIRECT_SUN','caution',phase,['DIRECT_SUN_AVOIDANCE'],{ ageMonths:age });
  }
  if (!uv.active || mode === 'car') return;
  addNotice(result,'UV_SHADE_AND_COVERAGE','caution',phase,['UV_SHADE_AND_COVERAGE'],{ uvIndex:uv.uvIndex ?? null });
  if (mode !== 'sleep') setSelected(state,'head','sun_hat','engine','on_body',['UV_SHADE_AND_COVERAGE']);
  if (temp >= 24) {
    setSelected(state,'base_torso','light_long_sleeve_shirt','engine','on_body',['UV_LIGHT_COVERAGE']);
    if (!state.map.has('legs')) setSelected(state,'legs','light_trousers','engine','on_body',['UV_LIGHT_COVERAGE']);
  }
}

export function applyGroundContact(state,rain,temp,context,mode) {
  if (mode !== 'outdoor') return;
  if (!['standing','walking'].includes(context.groundContact)) { state.map.delete('footwear'); return; }
  let itemId = 'light_shoes';
  if (rain.required) itemId = 'weatherproof_shoes';
  else if (temp < 12) itemId = 'warm_shoes';
  setSelected(state,'footwear',itemId,'engine','on_body',['GROUND_CONTACT_FOOTWEAR']);
}

export function applyBodyLocksAndRebalance(state,result,request,phase,mode) {
  const locks = request.session.manualLocks.filter((lock) => lock.phase === phase && BODY_SLOTS.includes(lock.slot));
  for (const lock of locks) {
    const definition = CLOTHING_CATALOG[lock.itemId];
    if (!definition || definition.slot !== lock.slot || !definition.allowedSituations.includes(mode)) continue;
    if (phase === 'in_car' && definition.carSeatCompatibility === 'prohibited') {
      overrideUnsafeLock(result,lock,phase,'CAR_SEAT_PROHIBITED_LAYER');
      continue;
    }
    const before = state.map.get(lock.slot)?.itemId ?? null;
    const beforeWeight = before ? CLOTHING_CATALOG[before]?.thermalWeight ?? 0 : 0;
    const delta = definition.thermalWeight - beforeWeight;
    const wearPosition = phase === 'in_car' ? 'under_harness' : 'on_body';
    setSelected(state,lock.slot,lock.itemId,'manual_lock',wearPosition,['MANUAL_ITEM_LOCK']);
    addTrace(result,'swap.manual_lock',phase,'lock',lock.itemId,delta,'MANUAL_ITEM_LOCK');
    if (phase === 'in_car' && definition.carSeatCompatibility === 'conditional') {
      addNotice(result,'CAR_SEAT_CONDITIONAL_LAYER_CHECK_FIT','caution',phase,['CAR_SEAT_CONDITIONAL_LAYER_CHECK_FIT'],{ itemId:lock.itemId });
    }
    if (delta) rebalanceOtherSlots(state,-delta,new Set(locks.map((entry) => entry.slot)),mode,lock.slot);
  }
}

export function enforceCarSafetyAfterLocks(state,result,request,phase) {
  for (const [slot,selection] of [...state.map.entries()]) {
    if (!BODY_SLOTS.includes(slot)) continue;
    const def = CLOTHING_CATALOG[selection.itemId];
    if (def?.carSeatCompatibility === 'prohibited') {
      state.map.delete(slot);
      const lock = findLock(request.session,phase,slot);
      if (lock?.itemId === selection.itemId) overrideUnsafeLock(result,lock,phase,'CAR_SEAT_PROHIBITED_LAYER');
      addTrace(result,'safety.car.harness',phase,'remove',selection.itemId,null,'CAR_SEAT_NO_BULKY_LAYERS');
    }
  }
}

export function overrideUnsafeLock(result,lock,phase,reasonCode) {
  addNotice(result,'MANUAL_LOCK_OVERRIDDEN_FOR_SAFETY','hard_rule',phase,[reasonCode],{ slot:lock.slot, itemId:lock.itemId });
  addTrace(result,'safety.override_lock',phase,'override_lock',lock.itemId,null,'MANUAL_LOCK_OVERRIDDEN_FOR_SAFETY');
}

export function applyQuickCorrection(state,result,offset,phase,mode,request) {
  if (!offset) return;
  const locked = new Set(request.session.manualLocks.filter((lock) => lock.phase === phase).map((lock) => lock.slot));
  const changed = applyThermalDelta(state,offset,locked,mode,offset > 0 ? QUICK_WARM_PRIORITY : QUICK_COOL_PRIORITY,true);
  addTrace(result,'quick.warmth',phase,offset > 0 ? 'thermal_up' : 'thermal_down',changed ?? null,offset,offset > 0 ? 'QUICK_WARMER' : 'QUICK_COOLER');
}

export function applyThermalDelta(state,delta,locked,mode,priority = null,stopAfterOne = false) {
  if (!delta) return null;
  const direction = delta > 0 ? 1 : -1;
  let moves = Math.max(1,Math.ceil(Math.abs(delta)));
  const order = priority ?? (direction > 0 ? QUICK_WARM_PRIORITY : QUICK_COOL_PRIORITY);
  let firstChanged = null;
  while (moves > 0) {
    let changed = false;
    for (const slot of order) {
      if (locked.has(slot)) continue;
      const next = nextThermalItem(state.map.get(slot)?.itemId ?? null,slot,direction,mode);
      if (next === undefined) continue;
      if (next === null) state.map.delete(slot);
      else setSelected(state,slot,next,'engine',state.phase === 'in_car' ? 'under_harness' : 'on_body',['THERMAL_REBALANCE']);
      firstChanged ??= slot;
      changed = true;
      break;
    }
    if (!changed) break;
    moves -= 1;
    if (stopAfterOne) break;
  }
  return firstChanged;
}

export function rebalanceOtherSlots(state,delta,locked,mode,excludeSlot) {
  const localLocks = new Set([...locked,excludeSlot]);
  applyThermalDelta(state,delta,localLocks,mode);
}

export function nextThermalItem(current,slot,direction,mode) {
  const ladder = THERMAL_LADDERS[slot];
  if (!ladder) return undefined;
  let index = ladder.indexOf(current);
  if (index < 0) index = current == null ? 0 : -1;
  if (index < 0) return undefined;
  for (let nextIndex = index + direction; nextIndex >= 0 && nextIndex < ladder.length; nextIndex += direction) {
    const candidate = ladder[nextIndex];
    if (candidate == null) {
      if (slot === 'base_torso') continue;
      return null;
    }
    if (allowedInMode(candidate,mode) && !(mode === 'car' && CLOTHING_CATALOG[candidate].carSeatCompatibility === 'prohibited')) return candidate;
  }
  return undefined;
}

export function nearestSleepUnderlayer(target) {
  return [...SLEEP_UNDERLAYER_IDS].sort((a,b) => {
    const aw = CLOTHING_CATALOG[a].sleepWarmthWeight;
    const bw = CLOTHING_CATALOG[b].sleepWarmthWeight;
    return Math.abs(aw-target) - Math.abs(bw-target) || aw-bw;
  })[0];
}


export function alternativeCandidateIds(slotResult,mode) {
  return (SLOT_ITEMS[slotResult.slot] ?? []).filter((itemId) => {
    const def = CLOTHING_CATALOG[itemId];
    if (!def.allowedSituations.includes(mode)) return false;
    if (slotResult.phase === 'in_car' && def.carSeatCompatibility === 'prohibited') return false;
    if (mode === 'sleep' && !def.sleepSafe) return false;
    return true;
  });
}

export function thermalSignature(result,phase) {
  let score = 0;
  for (const entry of result.slots.filter((slot) => slot.phase === phase)) {
    const def = CLOTHING_CATALOG[entry.selected.itemId];
    if (!def) continue;
    if (def.slot === 'sleep_bag' || def.slot === 'sleep_underlayer') score += def.sleepWarmthWeight ?? 0;
    else if (def.slot === 'stroller_thermal_accessory' || def.slot === 'carrier_accessory') score += (def.thermalStepCredit ?? 0) * 2;
    else if (BODY_SLOTS.includes(def.slot)) score += def.thermalWeight ?? 0;
  }
  return score;
}

export function diffRecommendations(before,after,phase) {
  const a = new Map(before.slots.filter((slot) => slot.phase === phase).map((slot) => [slot.slot,slot.selected.itemId]));
  const b = new Map(after.slots.filter((slot) => slot.phase === phase).map((slot) => [slot.slot,slot.selected.itemId]));
  const slots = unique([...a.keys(),...b.keys()]);
  return slots.filter((slot) => a.get(slot) !== b.get(slot)).map((slot) => ({ phase, slot, fromItemId:a.get(slot) ?? null, toItemId:b.get(slot) ?? null, reasonCode:slot === [...slots][0] ? 'MANUAL_ITEM_LOCK' : 'OUTFIT_REBALANCED_AFTER_SWAP' }));
}

export function applyWeatherQuality(result,weather,point,weatherWindow,phase) {
  if (weather.freshness === 'stale') {
    result.status = 'partial';
    addNotice(result,'WEATHER_DATA_STALE','caution',phase,['STALE_WEATHER_USED'],{});
  }
  const missing = [];
  if (!isFiniteNumber(weatherWindow.maxWindSpeedKmh)) missing.push('weather.windSpeedKmh');
  const precipKnown = isFiniteNumber(weatherWindow.maxPrecipProbabilityPct) || isFiniteNumber(point.precipMm) || ['none','rain','snow','sleet'].includes(point.precipitationType);
  if (!precipKnown) missing.push('weather.precipitation');
  if (!isFiniteNumber(weatherWindow.maxUvIndex)) missing.push('weather.uvIndex');
  if (missing.length) {
    result.status = 'partial';
    result.dataQuality.missingFields.push(...missing);
    addNotice(result,'WEATHER_DATA_INCOMPLETE','caution',phase,['OPTIONAL_WEATHER_HAZARD_DATA_MISSING'],{ count:missing.length });
  }
}

export function createPhaseState(result,phase,mode) {
  return { result, phase, mode, map:new Map() };
}

export function setSelected(state,slot,itemId,selectionSource='engine',wearPosition='on_body',reasonCodes=[]) {
  if (!itemId) { state.map.delete(slot); return; }
  state.map.set(slot,{ itemId, selectionSource, wearPosition, reasonCodes:unique(reasonCodes) });
}

export function finalizePhase(state) {
  const existing = new Set(state.result.slots.map((slot) => `${slot.phase}|${slot.slot}`));
  for (const [slot,selected] of state.map.entries()) {
    const key = `${state.phase}|${slot}`;
    if (existing.has(key)) continue;
    state.result.slots.push({ phase:state.phase, slot, selected:{ ...selected, reasonCodes:[...selected.reasonCodes] }, alternatives:[] });
  }
}

export function blockPhase(result,phase,missingFields) {
  result.status = 'blocked';
  result.dataQuality.missingFields.push(...missingFields);
  result.phases.push({ phase, status:'blocked', thermalReferenceC:null, thermalReferenceSource:null, thermalBand:null, thermalAdjustment:0, missingFields:[...missingFields] });
}

export function addNotice(result,code,severity,phase,reasonCodes,data) {
  if (result.notices.some((notice) => notice.code === code && notice.phase === phase && JSON.stringify(notice.data) === JSON.stringify(data))) return;
  result.notices.push({ code, severity, phase, reasonCodes:unique(reasonCodes), data:{...data} });
  addTrace(result,`notice.${code.toLowerCase()}`,phase,'notice',code,null,reasonCodes[0] ?? code);
}

export function addTrace(result,ruleId,phase,effect,target,delta,reasonCode) {
  result.ruleTrace.push({ ruleId, phase, effect, target, delta, reasonCode });
}

export function traceThermal(result,ruleId,phase,delta,reasonCode) {
  if (!delta) return;
  addTrace(result,ruleId,phase,delta > 0 ? 'thermal_up' : 'thermal_down',null,delta,reasonCode);
}

export function mergeResult(target,source,phase) {
  target.slots.push(...source.slots.filter((slot) => slot.phase === phase));
  target.notices.push(...source.notices.filter((notice) => notice.phase === phase && notice.code !== 'CHECK_NECK'));
  target.ruleTrace.push(...source.ruleTrace.filter((trace) => trace.phase === phase));
  target.phases.push(...source.phases.filter((entry) => entry.phase === phase));
  target.dataQuality.missingFields.push(...source.dataQuality.missingFields);
  if (source.status === 'partial') target.status = 'partial';
}

export function phaseStatusFromResult(result) {
  return result.status === 'partial' ? 'partial' : result.status === 'ready_with_estimate' ? 'ready_with_estimate' : 'ready';
}

export function findLock(session,phase,slot) {
  return (session.manualLocks ?? []).find((lock) => lock.phase === phase && lock.slot === slot) ?? null;
}

export function allowedInMode(itemId,mode) {
  return CLOTHING_CATALOG[itemId]?.allowedSituations.includes(mode) ?? false;
}

export function ageMonths(birthDate,at) {
  if (!birthDate || !at) return null;
  const birth = new Date(`${birthDate}T00:00:00Z`);
  const observed = new Date(at);
  if (Number.isNaN(birth.getTime()) || Number.isNaN(observed.getTime()) || observed < birth) return null;
  let months = (observed.getUTCFullYear()-birth.getUTCFullYear())*12 + observed.getUTCMonth()-birth.getUTCMonth();
  if (observed.getUTCDate() < birth.getUTCDate()) months -= 1;
  return months;
}

export function maxFinite(values) {
  const finite = values.filter(isFiniteNumber);
  return finite.length ? Math.max(...finite) : null;
}

export function sumFinite(values) {
  const finite = values.filter(isFiniteNumber);
  return finite.length ? finite.reduce((sum,value) => sum + value,0) : null;
}

export function isFiniteNumber(value) { return typeof value === 'number' && Number.isFinite(value); }
export function unique(values) { return [...new Set(values)]; }
export function clamp(value,min,max) { return Math.max(min,Math.min(max,value)); }
export function roundHalf(value) { return Math.round(value*2)/2; }
