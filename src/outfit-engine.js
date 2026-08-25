import { CLOTHING_CATALOG, itemsForSlot } from './clothing-catalog.js';
import {
  SLEEP_BAG_ITEM_IDS,
  SLEEP_UNDERLAYER_ITEM_IDS,
  SLEEP_WARMTH_WEIGHTS,
  genericTogGuidanceForRoomTemp,
  targetSleepWarmthForRoomTemp
} from './sleep-tog-rules.js';

export const OUTFIT_SLOTS = Object.freeze([
  'base_torso', 'legs', 'mid', 'outer', 'feet', 'head', 'hands', 'footwear',
  'stroller_thermal_accessory', 'stroller_weather_accessory', 'carrier_accessory',
  'sleep_bag', 'sleep_underlayer'
]);

export const NOTICE_CODES = Object.freeze([
  'CHECK_NECK',
  'CAR_SEAT_NO_BULKY_LAYERS',
  'CAR_SEAT_REMOVE_OUTER_BEFORE_HARNESS',
  'CAR_SEAT_BLANKET_OVER_HARNESS_ONLY',
  'CAR_SEAT_CONDITIONAL_LAYER_CHECK_FIT',
  'CAR_CABIN_TEMPERATURE_ESTIMATED',
  'SLEEP_NO_HAT',
  'SLEEP_NO_LOOSE_BLANKET_OVER_BAG',
  'SLEEP_NO_WEIGHTED_PRODUCTS',
  'SLEEP_USE_ROOM_TEMPERATURE',
  'SLEEP_GENERIC_TOG_ORIENTATION',
  'STROLLER_DO_NOT_COVER_AIRFLOW',
  'STROLLER_RAIN_COVER',
  'STROLLER_SUNSHADE',
  'INFANT_UNDER_12M_AVOID_DIRECT_SUN',
  'AGE_UNKNOWN_DIRECT_SUN_CONSERVATIVE_RULE',
  'UV_SHADE_AND_COVERAGE',
  'WEATHER_DATA_STALE',
  'WEATHER_DATA_INCOMPLETE',
  'EXTREME_COLD_CAUTION',
  'EXTREME_HEAT_CAUTION',
  'STRONG_WIND_CAUTION',
  'MANUAL_LOCK_OVERRIDDEN_FOR_SAFETY',
  'RAIN_PROTECTION_OPTIONAL',
  'RAIN_PROTECTION_REQUIRED',
  'SLEEP_ROOM_BELOW_ORIENTATION_RANGE'
]);

export const TEMPERATURE_BANDS = Object.freeze([
  band('below_0', -Infinity, 0),
  band('0_to_3', 0, 3),
  band('3_to_8', 3, 8),
  band('8_to_12', 8, 12),
  band('12_to_16', 12, 16),
  band('16_to_20', 16, 20),
  band('20_to_24', 20, 24),
  band('24_to_28', 24, 28),
  band('28_to_30', 28, 30),
  band('30_plus', 30, Infinity)
]);

const BODY_SLOTS = Object.freeze(['base_torso', 'legs', 'mid', 'outer']);
const OPTIONAL_SLOTS = new Set(['mid', 'outer', 'stroller_thermal_accessory', 'stroller_weather_accessory', 'carrier_accessory']);

const BASELINE = Object.freeze({
  below_0: Object.freeze({ base_torso: 'long_sleeve_bodysuit', legs: 'warm_trousers', mid: 'fleece_jacket', outer: 'winter_overall' }),
  '0_to_3': Object.freeze({ base_torso: 'long_sleeve_bodysuit', legs: 'warm_trousers', mid: 'fleece_jacket', outer: 'winter_overall' }),
  '3_to_8': Object.freeze({ base_torso: 'long_sleeve_bodysuit', legs: 'warm_trousers', mid: 'fleece_jacket', outer: 'transition_overall' }),
  '8_to_12': Object.freeze({ base_torso: 'long_sleeve_bodysuit', legs: 'warm_trousers', mid: 'fleece_jacket', outer: 'softshell_jacket' }),
  '12_to_16': Object.freeze({ base_torso: 'long_sleeve_bodysuit', legs: 'trousers', mid: 'thin_sweater', outer: 'softshell_jacket' }),
  '16_to_20': Object.freeze({ base_torso: 'long_sleeve_bodysuit', legs: 'trousers', mid: 'thin_sweater', outer: null }),
  '20_to_24': Object.freeze({ base_torso: 'long_sleeve_bodysuit', legs: 'light_trousers', mid: null, outer: null }),
  '24_to_28': Object.freeze({ base_torso: 'short_sleeve_bodysuit', legs: 'light_trousers', mid: null, outer: null }),
  '28_to_30': Object.freeze({ base_torso: 'short_sleeve_bodysuit', legs: 'light_trousers', mid: null, outer: null }),
  '30_plus': Object.freeze({ base_torso: 'short_sleeve_bodysuit', legs: null, mid: null, outer: null })
});

function band(id, min, max) {
  return Object.freeze({ id, min, max, label: id.replaceAll('_', ' ') });
}

export function temperatureBandFor(tempC) {
  if (!Number.isFinite(tempC)) throw new TypeError('temperature must be finite');
  return TEMPERATURE_BANDS.find((entry) => tempC >= entry.min && tempC < entry.max);
}

export function createItemLock(session, { phase = 'main', slot, itemId, lockedAt }) {
  if (!slot || !lockedAt) throw new TypeError('slot and lockedAt are required');
  const current = normalizeSession(session);
  return {
    ...current,
    manualLocks: [
      ...current.manualLocks.filter((lock) => !(lock.phase === phase && lock.slot === slot)),
      { phase, slot, itemId, lockedAt }
    ]
  };
}

export function adjustWarmthSession(session, direction) {
  const current = normalizeSession(session);
  if (!['warmer', 'cooler', 'neutral'].includes(direction)) throw new RangeError('direction must be warmer, cooler or neutral');
  const warmthOffset = direction === 'warmer' ? 1 : direction === 'cooler' ? -1 : 0;
  return { ...current, warmthOffset };
}

/** Pure deterministic outfit evaluator: no DOM, storage, network, clock or random access. */
export function recommendOutfit(input) {
  if (!input || typeof input !== 'object') throw new TypeError('input is required');
  const profile = input.profile ?? {};
  const context = input.context ?? input.situation;
  if (!context?.mode) throw new TypeError('context.mode is required');
  const session = normalizeSession(input.session);
  const request = {
    requestId: input.requestId ?? 'request',
    requestedAt: input.requestedAt ?? null,
    profile,
    context,
    weather: input.weather ?? null,
    session,
    neckFeedback: input.neckFeedback ?? null
  };
  return computeRecommendation(request, true);
}

function computeRecommendation(request, includeAlternatives) {
  let result;
  if (request.context.mode === 'sleep') result = evaluateSleep(request);
  else if (request.context.mode === 'car') result = evaluateCar(request);
  else if (['outdoor', 'stroller', 'carrier'].includes(request.context.mode)) result = evaluateOutdoorLike(request, 'main');
  else throw new RangeError(`unsupported situation mode: ${request.context.mode}`);

  if (includeAlternatives && result.status !== 'blocked') {
    attachAlternatives(result, request);
  }
  result.items = result.slots.map((slotResult) => ({
    itemId: slotResult.selected.itemId,
    phase: slotResult.phase,
    role: slotResult.slot,
    wearPosition: slotResult.selected.wearPosition,
    optional: false,
    reasonCodes: [...slotResult.selected.reasonCodes],
    selectionSource: slotResult.selected.selectionSource
  }));
  return result;
}

function evaluateOutdoorLike(request, phase) {
  const { profile, context, session, neckFeedback } = request;
  const result = createResult(request, context.mode);
  const current = weatherCurrent(request.weather);
  if (!current || !Number.isFinite(current.airTempC)) {
    blockForMissingWeather(result, phase);
    return result;
  }

  const thermal = thermalEnvironment(current);
  const tempBand = temperatureBandFor(thermal.thermalReferenceC);
  const weatherWindow = summarizeWeatherWindow(request.weather, context.plannedMinutes);
  const protection = weatherProtectionRequirements(current, weatherWindow);
  const windThermal = windThermalAdjustment(current, weatherWindow, thermal, context);
  const activity = activityAdjustment(context);
  const bias = warmthBiasAdjustment(profile.warmthBias);
  const neck = neckFeedbackAdjustment(neckFeedback);
  let thermalAdjustment = activity + windThermal + bias + session.warmthOffset + neck;

  traceAdjustment(result, phase, 'activity.context', activity, activity > 0 ? 'ACTIVITY_WARMER' : 'ACTIVITY_COOLER');
  traceAdjustment(result, phase, 'weather.wind.thermal', windThermal, 'WIND_THERMAL_EFFECT');
  traceAdjustment(result, phase, 'profile.warmth_bias', bias, bias > 0 ? 'BABY_RUNS_COOL' : 'BABY_RUNS_WARM');
  traceAdjustment(result, phase, 'session.warmth_offset', session.warmthOffset, session.warmthOffset > 0 ? 'QUICK_WARMER' : 'QUICK_COOLER');
  traceAdjustment(result, phase, 'feedback.neck', neck, neck > 0 ? 'NECK_COOL' : 'NECK_HOT_SWEATY');

  const lockInfo = locksForPhase(session, phase);
  const accessoryState = selectSituationAccessories({ result, request, phase, thermal, protection, lockInfo });
  thermalAdjustment += accessoryState.bodyThermalDelta;

  const canonical = BASELINE[tempBand.id];
  let targetScore = bodyScore(canonical) + thermalAdjustment;
  if (context.mode === 'carrier') {
    const carrierCredit = carrierBodyHeatCredit(context, accessoryState.carrierCoverItemId);
    targetScore += carrierCredit;
    addTrace(result, 'situation.carrier.body_heat', 'thermal_down', 'torso', phase, carrierCredit, 'CARRIER_BODY_HEAT');
  }

  const bodyRequirements = {
    wind: requiredBodyWindProtection(protection.windLevel, context, accessoryState),
    rain: requiredBodyRainProtection(protection.rainRequired, context, accessoryState),
    sun: protection.uvActive || context.sunExposure === 'direct'
  };
  const bodyThermalAdjustment = targetScore - bodyScore(canonical);
  const optimized = optimizeBodyPlan({
    mode: context.mode,
    phase,
    canonical,
    targetScore,
    locks: lockInfo,
    requirements: bodyRequirements,
    result
  });
  addBodySlots(result, optimized.plan, phase, lockInfo, optimized.safetyOverrideSlots, canonical, bodyRequirements);

  addExposureAccessories(result, { request, phase, thermal, protection, lockInfo });
  applyWeatherSafetyNotices(result, { request, phase, thermal, protection, weatherWindow });
  applyCommonNotices(result, phase);
  applyDataQuality(result, request.weather, weatherWindow);

  const phaseStatus = result.status === 'partial' ? 'partial' : 'ready';
  result.phases.push({
    phase,
    status: phaseStatus,
    thermalReferenceC: thermal.thermalReferenceC,
    thermalReferenceSource: thermal.referenceSource,
    thermalBand: tempBand.id,
    thermalAdjustment: bodyThermalAdjustment,
    missingFields: [...result.dataQuality.missingFields]
  });
  result.status = result.status === 'partial' ? 'partial' : 'ready';
  result.explanation = `Thermische Referenz ${thermal.thermalReferenceC} °C (${tempBand.id}); effektive Anpassung ${roundHalf(bodyThermalAdjustment)} Schritte. Das Outfit wurde als Ganzes ausbalanciert.`;
  return result;
}

function evaluateCar(request) {
  const { context, session, profile, neckFeedback } = request;
  const result = createResult(request, 'car');
  addNotice(result, 'CAR_SEAT_NO_BULKY_LAYERS', 'hard_rule', 'in_car', ['CAR_HARNESS_SAFETY']);

  if (context.includeOutdoorTransition) {
    const transitionContext = {
      mode: 'outdoor',
      plannedMinutes: context.outsideTransitionMinutes ?? null,
      activity: 'normal', activitySource: 'default', sunExposure: 'unknown', groundContact: 'none'
    };
    const transitionRequest = { ...request, context: transitionContext, session: sessionForPhase(session, 'outdoor_transition') };
    const transition = evaluateOutdoorLike(transitionRequest, 'outdoor_transition');
    mergeResult(result, transition);
    if (transition.slots.some((slot) => {
      const def = CLOTHING_CATALOG[slot.selected.itemId];
      return def && def.carSeatCompatibility !== 'allowed';
    })) {
      addNotice(result, 'CAR_SEAT_REMOVE_OUTER_BEFORE_HARNESS', 'hard_rule', 'outdoor_transition', ['CAR_HARNESS_SAFETY']);
    }
  }

  if (!Number.isFinite(context.cabinTempC)) {
    result.phases.push(blockedPhase('in_car', ['context.cabinTempC']));
    result.dataQuality.missingFields.push('context.cabinTempC');
    result.status = context.includeOutdoorTransition && result.slots.length ? 'partial' : 'blocked';
    return result;
  }

  const phase = 'in_car';
  const tempBand = temperatureBandFor(context.cabinTempC);
  const canonical = { ...BASELINE[tempBand.id], outer: null };
  const lockInfo = locksForPhase(session, phase);
  const targetScore = bodyScore(canonical) + warmthBiasAdjustment(profile.warmthBias) + session.warmthOffset + neckFeedbackAdjustment(neckFeedback);
  const optimized = optimizeBodyPlan({
    mode: 'car', phase, canonical, targetScore, locks: lockInfo,
    requirements: { wind: 0, rain: 0, sun: false }, result, inCar: true
  });
  addBodySlots(result, optimized.plan, phase, lockInfo, optimized.safetyOverrideSlots, canonical, { wind: 0, rain: 0, sun: false }, true);

  if (context.cabinTempSource === 'estimated') {
    addNotice(result, 'CAR_CABIN_TEMPERATURE_ESTIMATED', 'caution', phase, ['CAR_CABIN_TEMP_ESTIMATE'], { cabinTempC: context.cabinTempC });
    result.dataQuality.usedEstimatedCabinTemperature = true;
  }
  addNotice(result, 'CAR_SEAT_BLANKET_OVER_HARNESS_ONLY', 'hard_rule', phase, ['CAR_HARNESS_SAFETY']);
  applyCommonNotices(result, phase);
  const inCarStatus = context.cabinTempSource === 'estimated' ? 'ready_with_estimate' : 'ready';
  result.phases.push({
    phase,
    status: inCarStatus,
    thermalReferenceC: context.cabinTempC,
    thermalReferenceSource: 'cabin_temp',
    thermalBand: tempBand.id,
    thermalAdjustment: targetScore - bodyScore(canonical),
    missingFields: []
  });
  if (result.status !== 'partial' && result.status !== 'blocked') result.status = inCarStatus;
  result.explanation = `Autositz-Phase mit ${context.cabinTempC} °C Innenraumtemperatur; nur gurttaugliche Schichten unter dem Gurt.`;
  return result;
}

function evaluateSleep(request) {
  const { context, session, profile, neckFeedback } = request;
  const result = createResult(request, 'sleep');
  const phase = 'main';
  addNotice(result, 'SLEEP_NO_HAT', 'hard_rule', phase, ['SLEEP_HEAD_UNCOVERED']);
  addNotice(result, 'SLEEP_NO_LOOSE_BLANKET_OVER_BAG', 'hard_rule', phase, ['SLEEP_SAFE_SLEEP']);
  addNotice(result, 'SLEEP_NO_WEIGHTED_PRODUCTS', 'hard_rule', phase, ['SLEEP_SAFE_SLEEP']);
  addNotice(result, 'SLEEP_USE_ROOM_TEMPERATURE', 'hard_rule', phase, ['SLEEP_ROOM_TEMP_ONLY']);
  addNotice(result, 'SLEEP_GENERIC_TOG_ORIENTATION', 'caution', phase, ['SLEEP_GENERIC_V1_ORIENTATION']);
  applyCommonNotices(result, phase);

  if (!Number.isFinite(context.roomTempC)) {
    result.status = 'blocked';
    result.phases.push(blockedPhase(phase, ['context.roomTempC']));
    result.dataQuality.missingFields.push('context.roomTempC');
    result.explanation = 'Für den Schlafmodus ist die Raumtemperatur erforderlich.';
    return result;
  }

  const locks = locksForPhase(session, phase);
  for (const lock of locks.values()) {
    if (!['sleep_bag', 'sleep_underlayer'].includes(lock.slot)) {
      recordSafetyLockOverride(result, lock, phase, 'SLEEP_UNSAFE_LOCK');
    }
  }

  const guidance = genericTogGuidanceForRoomTemp(context.roomTempC);
  let target = targetSleepWarmthForRoomTemp(context.roomTempC);
  target += warmthBiasAdjustment(profile.warmthBias) + session.warmthOffset + neckFeedbackAdjustment(neckFeedback);

  const bagLock = validSleepLock(locks.get('sleep_bag'), SLEEP_BAG_ITEM_IDS, result, phase);
  const underLock = validSleepLock(locks.get('sleep_underlayer'), SLEEP_UNDERLAYER_ITEM_IDS, result, phase);
  const pair = optimizeSleepPair(target, guidance, bagLock?.itemId ?? null, underLock?.itemId ?? null);
  addSlot(result, phase, 'sleep_bag', pair.bag, bagLock ? 'manual_lock' : 'engine', 'on_body', [bagLock ? 'MANUAL_ITEM_LOCK' : 'SLEEP_GENERIC_TOG_ORIENTATION']);
  addSlot(result, phase, 'sleep_underlayer', pair.underlayer, underLock ? 'manual_lock' : 'engine', 'on_body', [underLock ? 'MANUAL_ITEM_LOCK' : 'SLEEP_UNDERLAYER_REBALANCE']);
  if (bagLock) addTrace(result, 'swap.sleep_bag', 'lock', pair.bag, phase, null, 'MANUAL_ITEM_LOCK');
  if (underLock) addTrace(result, 'swap.sleep_underlayer', 'lock', pair.underlayer, phase, null, 'MANUAL_ITEM_LOCK');

  if (context.roomTempC < 16) {
    addNotice(result, 'SLEEP_ROOM_BELOW_ORIENTATION_RANGE', 'caution', phase, ['SLEEP_ROOM_TEMP_BELOW_16']);
  }
  result.phases.push({
    phase, status: 'ready', thermalReferenceC: context.roomTempC, thermalReferenceSource: 'room_temp',
    thermalBand: `sleep_${guidance.id}`, thermalAdjustment: target - targetSleepWarmthForRoomTemp(context.roomTempC), missingFields: []
  });
  result.status = 'ready';
  result.explanation = `Schlafempfehlung nach ${context.roomTempC} °C Raumtemperatur mit generischer V1-TOG-Orientierung; Außentemperatur wurde nicht verwendet.`;
  return result;
}

function optimizeSleepPair(target, guidance, lockedBag, lockedUnderlayer) {
  const bags = lockedBag ? [lockedBag] : SLEEP_BAG_ITEM_IDS;
  const underlayers = lockedUnderlayer ? [lockedUnderlayer] : SLEEP_UNDERLAYER_ITEM_IDS;
  let best = null;
  for (const bag of bags) {
    for (const underlayer of underlayers) {
      const score = SLEEP_WARMTH_WEIGHTS[bag] + SLEEP_WARMTH_WEIGHTS[underlayer];
      const delta = Math.abs(score - target);
      const changes = (bag === guidance.sleepBagItemId ? 0 : 1) + (underlayer === guidance.underlayerItemId ? 0 : 1);
      const overheatPenalty = score > target ? (score - target) * 0.2 : 0;
      const rank = delta * 100 + changes * 3 + overheatPenalty;
      if (!best || rank < best.rank) best = { bag, underlayer, score, rank };
    }
  }
  return best;
}

function validSleepLock(lock, allowedIds, result, phase) {
  if (!lock) return null;
  if (!allowedIds.includes(lock.itemId)) {
    recordSafetyLockOverride(result, lock, phase, 'SLEEP_UNSAFE_LOCK');
    return null;
  }
  return lock;
}

function selectSituationAccessories({ result, request, phase, thermal, protection, lockInfo }) {
  const context = request.context;
  let bodyThermalDelta = 0;
  let strollerThermalItemId = null;
  let strollerWeatherItemId = null;
  let carrierCoverItemId = null;

  if (context.mode === 'stroller') {
    const defaultThermal = defaultStrollerThermalAccessory(thermal.thermalReferenceC, context);
    const thermalLock = lockInfo.get('stroller_thermal_accessory');
    strollerThermalItemId = lockedOrDefaultAccessory(thermalLock, defaultThermal, 'stroller_thermal_accessory', 'stroller', result, phase);
    if (strollerThermalItemId) {
      const def = CLOTHING_CATALOG[strollerThermalItemId];
      bodyThermalDelta -= def.thermalStepCredit;
      addSlot(result, phase, 'stroller_thermal_accessory', strollerThermalItemId, thermalLock ? 'manual_lock' : 'engine', 'external', [thermalLock ? 'MANUAL_ITEM_LOCK' : 'STROLLER_EXTERNAL_INSULATION']);
    }

    const defaultWeather = protection.rainRequired
      ? 'stroller_rain_cover'
      : (context.sunExposure === 'direct' || protection.uvActive ? 'stroller_sunshade' : null);
    const weatherLock = lockInfo.get('stroller_weather_accessory');
    strollerWeatherItemId = lockedOrDefaultAccessory(weatherLock, defaultWeather, 'stroller_weather_accessory', 'stroller', result, phase);
    if (strollerWeatherItemId) {
      const reason = strollerWeatherItemId === 'stroller_rain_cover' ? 'STROLLER_RAIN_COVER' : 'STROLLER_SUNSHADE';
      addSlot(result, phase, 'stroller_weather_accessory', strollerWeatherItemId, weatherLock ? 'manual_lock' : 'engine', 'external', [weatherLock ? 'MANUAL_ITEM_LOCK' : reason]);
      addNotice(result, reason, 'info', phase, [reason]);
    }
    addNotice(result, 'STROLLER_DO_NOT_COVER_AIRFLOW', 'hard_rule', phase, ['STROLLER_AIRFLOW_SAFETY']);
  }

  if (context.mode === 'carrier') {
    const defaultCover = thermal.thermalReferenceC < 5 ? 'carrier_cover_warm' : thermal.thermalReferenceC < 12 ? 'carrier_cover_light' : null;
    const coverLock = lockInfo.get('carrier_accessory');
    carrierCoverItemId = lockedOrDefaultAccessory(coverLock, defaultCover, 'carrier_accessory', 'carrier', result, phase);
    if (carrierCoverItemId) {
      addSlot(result, phase, 'carrier_accessory', carrierCoverItemId, coverLock ? 'manual_lock' : 'engine', 'external', [coverLock ? 'MANUAL_ITEM_LOCK' : 'CARRIER_COVER']);
    }
  }

  return { bodyThermalDelta, strollerThermalItemId, strollerWeatherItemId, carrierCoverItemId };
}

function lockedOrDefaultAccessory(lock, defaultItemId, slot, mode, result, phase) {
  if (!lock) return defaultItemId;
  if (lock.itemId === 'none' || lock.itemId === null) {
    addTrace(result, `swap.${slot}`, 'lock', null, phase, null, 'MANUAL_ITEM_LOCK');
    return null;
  }
  const def = CLOTHING_CATALOG[lock.itemId];
  if (!def || def.slot !== slot || !def.allowedSituations.includes(mode)) {
    recordSafetyLockOverride(result, lock, phase, 'INVALID_LOCK_FOR_SITUATION');
    return defaultItemId;
  }
  addTrace(result, `swap.${slot}`, 'lock', lock.itemId, phase, null, 'MANUAL_ITEM_LOCK');
  return lock.itemId;
}

function defaultStrollerThermalAccessory(tempC, context) {
  const asleep = context.strollerState === 'asleep';
  const activity = context.activity ?? 'normal';
  if (tempC >= 18) return null;
  if (tempC >= 14) return asleep || activity !== 'active' ? 'stroller_light_blanket' : null;
  if (tempC >= 10) return activity === 'active' && !asleep ? 'stroller_light_blanket' : 'stroller_light_footmuff';
  if (tempC >= 5) return activity === 'active' && !asleep ? 'stroller_light_footmuff' : 'stroller_warm_footmuff';
  return 'stroller_warm_footmuff';
}

function carrierBodyHeatCredit(context, coverItemId) {
  let credit = -1;
  if (context.placement === 'under_wearer_outerwear') credit -= 0.5;
  if (coverItemId) credit -= CLOTHING_CATALOG[coverItemId].thermalStepCredit;
  return Math.max(-2, credit);
}

function optimizeBodyPlan({ mode, phase, canonical, targetScore, locks, requirements, result, inCar = false }) {
  const candidates = Object.fromEntries(BODY_SLOTS.map((slot) => [slot, bodyCandidates(slot, mode, inCar)]));
  const validLocks = new Map();
  const safetyOverrideSlots = new Set();

  for (const slot of BODY_SLOTS) {
    const lock = locks.get(slot);
    if (!lock) continue;
    if (lock.itemId === 'none' && OPTIONAL_SLOTS.has(slot)) {
      validLocks.set(slot, lock);
      continue;
    }
    const def = CLOTHING_CATALOG[lock.itemId];
    const allowed = def && def.slot === slot && def.allowedSituations.includes(mode) && (!inCar || def.carSeatCompatibility === 'allowed');
    if (!allowed) {
      safetyOverrideSlots.add(slot);
      if (inCar && def?.carSeatCompatibility === 'conditional') {
        addNotice(result, 'CAR_SEAT_CONDITIONAL_LAYER_CHECK_FIT', 'caution', phase, ['CAR_HARNESS_FIT_REQUIRED'], { itemId: lock.itemId });
      }
      recordSafetyLockOverride(result, lock, phase, inCar ? 'CAR_HARNESS_SAFETY' : 'INVALID_LOCK_FOR_SITUATION');
      continue;
    }
    validLocks.set(slot, lock);
  }

  let best = null;
  for (const base of candidates.base_torso) {
    for (const legs of candidates.legs) {
      for (const mid of candidates.mid) {
        for (const outer of candidates.outer) {
          const plan = { base_torso: base, legs, mid, outer };
          if (!locksSatisfied(plan, validLocks)) continue;
          if (protectionOf(plan, 'windProtection') < requirements.wind) continue;
          if (protectionOf(plan, 'rainProtection') < requirements.rain) continue;
          if (requirements.sun) {
            const baseDef = plan.base_torso ? CLOTHING_CATALOG[plan.base_torso] : null;
            const legsDef = plan.legs ? CLOTHING_CATALOG[plan.legs] : null;
            if (!baseDef || baseDef.sunCoverage < 2 || !legsDef || legsDef.sunCoverage < 2) continue;
          }
          const score = bodyScore(plan);
          const diff = Math.abs(score - targetScore);
          const changes = countChanges(plan, canonical);
          const changePenalty = bodyChangePenalty(plan, canonical);
          const itemCount = BODY_SLOTS.filter((slot) => plan[slot]).length;
          const overPenalty = score > targetScore ? (score - targetScore) * 10 : 0;
          const rank = diff * 100 + changePenalty * 4 + changes * 0.01 + itemCount * 0.05 + overPenalty;
          if (!best || rank < best.rank) best = { plan, score, rank };
        }
      }
    }
  }
  if (!best) {
    best = { plan: { ...canonical }, score: bodyScore(canonical), rank: Infinity };
  }
  return { ...best, safetyOverrideSlots };
}

function bodyCandidates(slot, mode, inCar) {
  let candidates = itemsForSlot(slot, mode)
    .filter((item) => !inCar || item.carSeatCompatibility === 'allowed')
    .map((item) => item.itemId);
  if (slot === 'mid' || slot === 'outer' || slot === 'legs') candidates = [null, ...candidates];
  return candidates;
}

function locksSatisfied(plan, locks) {
  for (const [slot, lock] of locks) {
    const wanted = lock.itemId === 'none' ? null : lock.itemId;
    if (plan[slot] !== wanted) return false;
  }
  return true;
}

function addBodySlots(result, plan, phase, locks, safetyOverrideSlots, canonical, requirements, inCar = false) {
  for (const slot of BODY_SLOTS) {
    const itemId = plan[slot];
    if (!itemId) continue;
    const lock = locks.get(slot);
    const locked = lock && lock.itemId === itemId && !safetyOverrideSlots.has(slot);
    const source = safetyOverrideSlots.has(slot) ? 'safety_override' : locked ? 'manual_lock' : 'engine';
    const reasons = [];
    if (locked) reasons.push('MANUAL_ITEM_LOCK');
    else if (canonical[slot] === itemId) reasons.push('THERMAL_BASELINE');
    else reasons.push('OUTFIT_REBALANCED');
    if (slot === 'outer' && CLOTHING_CATALOG[itemId].rainProtection >= requirements.rain && requirements.rain > 0) reasons.push('RAIN_PROTECTION');
    if (slot === 'outer' && CLOTHING_CATALOG[itemId].windProtection >= requirements.wind && requirements.wind > 0) reasons.push('WIND_PROTECTION');
    addSlot(result, phase, slot, itemId, source, inCar ? 'under_harness' : 'on_body', reasons);
    if (locked) addTrace(result, `swap.${slot}`, 'lock', itemId, phase, null, 'MANUAL_ITEM_LOCK');
  }
}

function addExposureAccessories(result, { request, phase, thermal, protection, lockInfo }) {
  const { context } = request;
  const temp = thermal.thermalReferenceC;
  const directOrUv = context.sunExposure === 'direct' || protection.uvActive;

  if (context.mode === 'carrier') {
    if (temp < 16) addAccessoryRespectingLock(result, phase, 'feet', temp < 12 ? 'warm_socks_booties' : 'socks', lockInfo, context.mode);
    if (temp < 12) addAccessoryRespectingLock(result, phase, 'head', temp < 8 ? 'warm_hat' : 'thin_hat', lockInfo, context.mode);
    else if (directOrUv) addAccessoryRespectingLock(result, phase, 'head', 'sun_hat', lockInfo, context.mode);
    if (temp < 8) addAccessoryRespectingLock(result, phase, 'hands', 'gloves', lockInfo, context.mode);
    return;
  }

  if (temp < 20) addAccessoryRespectingLock(result, phase, 'feet', temp < 12 ? 'warm_socks_booties' : 'socks', lockInfo, context.mode);
  if (temp < 12) addAccessoryRespectingLock(result, phase, 'head', temp < 8 ? 'warm_hat' : 'thin_hat', lockInfo, context.mode);
  else if (directOrUv && ['outdoor', 'stroller'].includes(context.mode)) addAccessoryRespectingLock(result, phase, 'head', 'sun_hat', lockInfo, context.mode);
  if (temp < 8 && ['outdoor', 'stroller'].includes(context.mode)) addAccessoryRespectingLock(result, phase, 'hands', 'gloves', lockInfo, context.mode);

  if (context.mode === 'outdoor' && ['standing', 'walking'].includes(context.groundContact)) {
    const footwear = context.groundContact === 'walking' || protection.rainRequired || temp < 12 ? 'weather_shoes' : 'soft_shoes';
    addAccessoryRespectingLock(result, phase, 'footwear', footwear, lockInfo, context.mode);
  }
}

function addAccessoryRespectingLock(result, phase, slot, defaultItemId, locks, mode) {
  const lock = locks.get(slot);
  let itemId = defaultItemId;
  let source = 'engine';
  if (lock) {
    const def = CLOTHING_CATALOG[lock.itemId];
    if (def && def.slot === slot && def.allowedSituations.includes(mode)) {
      itemId = lock.itemId;
      source = 'manual_lock';
    } else {
      recordSafetyLockOverride(result, lock, phase, 'INVALID_LOCK_FOR_SITUATION');
      source = 'safety_override';
    }
  }
  addSlot(result, phase, slot, itemId, source, 'on_body', [source === 'manual_lock' ? 'MANUAL_ITEM_LOCK' : 'EXPOSED_AREA_PROTECTION']);
}

function requiredBodyWindProtection(level, context, accessoryState) {
  if (!level) return 0;
  if (context.mode === 'stroller') {
    const external = accessoryState.strollerWeatherItemId ? CLOTHING_CATALOG[accessoryState.strollerWeatherItemId].windProtection : 0;
    const stroller = context.windProtection === 'good' ? 2 : context.windProtection === 'partial' ? 1 : 0;
    return Math.max(0, level - Math.max(external, stroller));
  }
  if (context.mode === 'carrier' && accessoryState.carrierCoverItemId) {
    return Math.max(0, level - CLOTHING_CATALOG[accessoryState.carrierCoverItemId].windProtection);
  }
  return level;
}

function requiredBodyRainProtection(rainRequired, context, accessoryState) {
  if (!rainRequired) return 0;
  if (context.mode === 'stroller' && accessoryState.strollerWeatherItemId === 'stroller_rain_cover') return 0;
  return 3;
}

function weatherProtectionRequirements(current, weatherWindow) {
  const speed = maxFinite(current.windSpeedKmh, weatherWindow.maxWindSpeedKmh) ?? 0;
  const gust = maxFinite(current.windGustKmh, weatherWindow.maxWindGustKmh) ?? 0;
  let windLevel = speed >= 39 ? 3 : speed >= 29 ? 2 : speed >= 20 ? 1 : 0;
  if (gust >= 50) windLevel = Math.max(windLevel, 3);
  else if (gust >= 39) windLevel = Math.max(windLevel, 2);
  const rainRequired = (current.precipMm ?? 0) > 0 || ['rain', 'sleet', 'snow'].includes(current.precipitationType) || (weatherWindow.maxPrecipProbabilityPct ?? -1) >= 60;
  const rainOptional = !rainRequired && (weatherWindow.maxPrecipProbabilityPct ?? -1) >= 40;
  const uvActive = (weatherWindow.maxUvIndex ?? current.uvIndex ?? -1) >= 3;
  return { windLevel, rainRequired, rainOptional, uvActive, speed, gust };
}

function windThermalAdjustment(current, weatherWindow, thermal, context) {
  if (thermal.alreadyIncludedFactors.includes('wind')) return 0;
  const speed = maxFinite(current.windSpeedKmh, weatherWindow.maxWindSpeedKmh);
  if (!Number.isFinite(speed)) return 0;
  let adjustment = speed >= 50 ? 2 : speed >= 39 ? 1.5 : speed >= 29 ? 1 : speed >= 20 ? 0.5 : 0;
  if (context.mode === 'stroller') {
    const reduction = context.windProtection === 'good' ? 1 : context.windProtection === 'partial' ? 0.5 : 0;
    adjustment = Math.max(0, adjustment - reduction);
  }
  return adjustment;
}

function activityAdjustment(context) {
  if (context.mode === 'stroller') {
    if (context.strollerState === 'asleep') return 1;
    return context.activity === 'active' ? 0 : 0.5;
  }
  if (context.mode === 'outdoor') {
    return context.activity === 'active' ? -1 : context.activity === 'calm' ? 0.5 : 0;
  }
  return 0;
}

function warmthBiasAdjustment(bias) {
  return bias === 'runs_cool' ? 0.5 : bias === 'runs_warm' ? -0.5 : 0;
}

function neckFeedbackAdjustment(feedback) {
  return feedback === 'cool' ? 1 : feedback === 'hot_sweaty' ? -1 : 0;
}

function thermalEnvironment(current) {
  if (current.apparentTempTrusted && Number.isFinite(current.apparentTempC)) {
    return {
      thermalReferenceC: current.apparentTempC,
      referenceSource: 'apparent_temp',
      alreadyIncludedFactors: Array.isArray(current.apparentTempIncludes) ? [...current.apparentTempIncludes] : []
    };
  }
  return { thermalReferenceC: current.airTempC, referenceSource: 'air_temp', alreadyIncludedFactors: [] };
}

function summarizeWeatherWindow(weather, plannedMinutes) {
  const current = weatherCurrent(weather);
  const duration = Number.isFinite(plannedMinutes) ? plannedMinutes : 120;
  const startMs = Date.parse(current?.time ?? '');
  const endMs = Number.isFinite(startMs) ? startMs + duration * 60000 : null;
  const hourly = Array.isArray(weather?.hourly) ? weather.hourly : [];
  const points = [current, ...hourly.filter((point) => {
    if (!point) return false;
    if (endMs === null) return true;
    const pointMs = Date.parse(point.time ?? '');
    return Number.isFinite(pointMs) && pointMs >= startMs && pointMs <= endMs;
  })].filter(Boolean);
  return {
    startTime: current?.time ?? null,
    endTime: endMs === null ? null : new Date(endMs).toISOString(),
    maxPrecipProbabilityPct: maxFrom(points, 'precipProbabilityPct'),
    totalPrecipMm: sumFinite(points, 'precipMm'),
    maxWindSpeedKmh: maxFrom(points, 'windSpeedKmh'),
    maxWindGustKmh: maxFrom(points, 'windGustKmh'),
    maxUvIndex: maxFrom(points, 'uvIndex'),
    missingFields: []
  };
}

function applyWeatherSafetyNotices(result, { request, phase, thermal, protection, weatherWindow }) {
  const { context, profile } = request;
  if (protection.rainOptional) addNotice(result, 'RAIN_PROTECTION_OPTIONAL', 'info', phase, ['PRECIP_PROBABILITY_40_TO_59'], { maxPrecipProbabilityPct: weatherWindow.maxPrecipProbabilityPct });
  if (protection.rainRequired && context.mode !== 'stroller') addNotice(result, 'RAIN_PROTECTION_REQUIRED', 'info', phase, ['PRECIPITATION_PROTECTION']);
  if (protection.uvActive) addNotice(result, 'UV_SHADE_AND_COVERAGE', 'caution', phase, ['UV_INDEX_AT_LEAST_3'], { maxUvIndex: weatherWindow.maxUvIndex });

  if (context.sunExposure === 'direct') {
    const ageMonths = ageMonthsAt(profile.birthDate, request.requestedAt ?? weatherCurrent(request.weather)?.time);
    if (ageMonths === null) addNotice(result, 'AGE_UNKNOWN_DIRECT_SUN_CONSERVATIVE_RULE', 'caution', phase, ['DIRECT_SUN_AGE_UNKNOWN']);
    else if (ageMonths < 12) addNotice(result, 'INFANT_UNDER_12M_AVOID_DIRECT_SUN', 'caution', phase, ['INFANT_DIRECT_SUN']);
  }

  if (thermal.thermalReferenceC < 0) addNotice(result, 'EXTREME_COLD_CAUTION', 'caution', phase, ['EXTREME_COLD']);
  if (thermal.thermalReferenceC >= 30 || (context.mode === 'carrier' && thermal.thermalReferenceC >= 28) || (context.sunExposure === 'direct' && thermal.thermalReferenceC >= 28)) {
    addNotice(result, 'EXTREME_HEAT_CAUTION', 'caution', phase, ['EXTREME_HEAT']);
  }
  if (protection.speed >= 50 || protection.gust >= 60) addNotice(result, 'STRONG_WIND_CAUTION', 'caution', phase, ['STRONG_WIND']);
}

function applyCommonNotices(result, phase) {
  addNotice(result, 'CHECK_NECK', 'info', phase, ['THERMAL_FEEDBACK']);
}

function applyDataQuality(result, weather, weatherWindow) {
  if (!weather) return;
  result.dataQuality.weatherFreshness = weather.freshness ?? null;
  result.dataQuality.usedManualWeather = ['manual', 'api_with_manual_override'].includes(weather.origin);
  if (weather.freshness === 'stale') {
    result.status = 'partial';
    addNotice(result, 'WEATHER_DATA_STALE', 'caution', null, ['WEATHER_STALE']);
  }
  const current = weatherCurrent(weather);
  for (const field of ['windSpeedKmh', 'precipProbabilityPct', 'uvIndex']) {
    if (current?.[field] == null) result.dataQuality.missingFields.push(`weather.current.${field}`);
  }
  result.dataQuality.missingFields.push(...weatherWindow.missingFields);
  result.dataQuality.missingFields = [...new Set(result.dataQuality.missingFields)];
  if (result.dataQuality.missingFields.length) {
    if (result.status === 'ready') result.status = 'partial';
    addNotice(result, 'WEATHER_DATA_INCOMPLETE', 'caution', null, ['OPTIONAL_WEATHER_FIELDS_MISSING'], { count: result.dataQuality.missingFields.length });
  }
}

function attachAlternatives(result, request) {
  const baseSlots = result.slots.map((entry) => ({ ...entry, alternatives: [] }));
  result.slots = baseSlots;
  for (const slotResult of result.slots) {
    const candidates = alternativeCandidates(slotResult, result.mode);
    const alternatives = [];
    for (const candidateId of candidates) {
      if (candidateId === slotResult.selected.itemId) continue;
      const lockedSession = createItemLock(request.session, {
        phase: slotResult.phase,
        slot: slotResult.slot,
        itemId: candidateId,
        lockedAt: request.requestedAt ?? 'session'
      });
      const projected = computeRecommendation({ ...request, session: lockedSession }, false);
      const projectedChanges = diffSlots(result.slots, projected.slots);
      const thermalDelta = relativeThermalDelta(slotResult.selected.itemId, candidateId);
      alternatives.push({
        itemId: candidateId,
        relation: thermalDelta === 0 ? 'equivalent' : thermalDelta > 0 ? 'warmer' : 'cooler',
        relativeThermalDelta: thermalDelta,
        projectedChanges
      });
    }
    alternatives.sort((a, b) => relationRank(a.relation) - relationRank(b.relation) || a.projectedChanges.length - b.projectedChanges.length || Math.abs(a.relativeThermalDelta) - Math.abs(b.relativeThermalDelta));
    slotResult.alternatives = alternatives;
  }
}

function alternativeCandidates(slotResult, mode) {
  const slot = slotResult.slot;
  if (slot === 'sleep_bag') return [...SLEEP_BAG_ITEM_IDS];
  if (slot === 'sleep_underlayer') return [...SLEEP_UNDERLAYER_ITEM_IDS];
  const ids = itemsForSlot(slot, mode).map((entry) => entry.itemId);
  if (OPTIONAL_SLOTS.has(slot)) ids.push('none');
  return [...new Set(ids)];
}

function relativeThermalDelta(fromId, toId) {
  const from = CLOTHING_CATALOG[fromId];
  const to = toId === 'none' ? null : CLOTHING_CATALOG[toId];
  if (from?.slot === 'sleep_bag' || from?.slot === 'sleep_underlayer') return (to?.sleepWarmthWeight ?? 0) - (from?.sleepWarmthWeight ?? 0);
  if (from?.kind === 'stroller_accessory' || from?.kind === 'carrier_accessory') return (to?.thermalStepCredit ?? 0) - (from?.thermalStepCredit ?? 0);
  return (to?.thermalWeight ?? 0) - (from?.thermalWeight ?? 0);
}

function diffSlots(before, after) {
  const beforeMap = new Map(before.map((entry) => [`${entry.phase}:${entry.slot}`, entry.selected.itemId]));
  const afterMap = new Map(after.map((entry) => [`${entry.phase}:${entry.slot}`, entry.selected.itemId]));
  const keys = new Set([...beforeMap.keys(), ...afterMap.keys()]);
  const changes = [];
  for (const key of keys) {
    const fromItemId = beforeMap.get(key) ?? null;
    const toItemId = afterMap.get(key) ?? null;
    if (fromItemId === toItemId) continue;
    const [phase, slot] = key.split(':');
    changes.push({ phase, slot, fromItemId, toItemId, reasonCode: 'OUTFIT_REBALANCED_AFTER_SWAP' });
  }
  return changes;
}

function relationRank(relation) {
  return relation === 'equivalent' ? 0 : relation === 'warmer' ? 1 : 2;
}

function createResult(request, mode) {
  return {
    recommendationId: `${request.requestId}:recommendation`,
    requestId: request.requestId,
    generatedAt: request.requestedAt,
    sessionId: request.session.sessionId,
    mode,
    status: 'ready',
    phases: [], slots: [], notices: [], ruleTrace: [],
    dataQuality: {
      weatherFreshness: request.weather?.freshness ?? null,
      missingFields: [], usedManualWeather: false, usedEstimatedCabinTemperature: false
    },
    items: [], explanation: ''
  };
}

function addSlot(result, phase, slot, itemId, selectionSource, wearPosition, reasonCodes) {
  if (!itemId || itemId === 'none') return;
  const existing = result.slots.findIndex((entry) => entry.phase === phase && entry.slot === slot);
  const slotResult = { phase, slot, selected: { itemId, selectionSource, wearPosition, reasonCodes: [...new Set(reasonCodes)] }, alternatives: [] };
  if (existing >= 0) result.slots[existing] = slotResult;
  else result.slots.push(slotResult);
}

function addNotice(result, code, severity, phase, reasonCodes, data = {}) {
  if (result.notices.some((notice) => notice.code === code && notice.phase === phase)) return;
  result.notices.push({ code, severity, phase, reasonCodes, data });
}

function addTrace(result, ruleId, effect, target, phase, delta, reasonCode) {
  result.ruleTrace.push({ ruleId, phase, effect, target, delta, reasonCode });
}

function traceAdjustment(result, phase, ruleId, delta, reasonCode) {
  if (!delta) return;
  addTrace(result, ruleId, delta > 0 ? 'thermal_up' : 'thermal_down', null, phase, delta, reasonCode);
}

function recordSafetyLockOverride(result, lock, phase, reasonCode) {
  addNotice(result, 'MANUAL_LOCK_OVERRIDDEN_FOR_SAFETY', 'hard_rule', phase, [reasonCode], { slot: lock.slot, itemId: lock.itemId });
  addTrace(result, `safety.lock.${lock.slot}`, 'override_lock', lock.itemId, phase, null, reasonCode);
}

function locksForPhase(session, phase) {
  return new Map(session.manualLocks.filter((lock) => lock.phase === phase).map((lock) => [lock.slot, lock]));
}

function sessionForPhase(session, phase) {
  return { ...session, manualLocks: session.manualLocks.filter((lock) => lock.phase === phase) };
}

function normalizeSession(session) {
  const warmthOffset = [-1, 0, 1].includes(session?.warmthOffset) ? session.warmthOffset : 0;
  return {
    sessionId: session?.sessionId ?? 'session',
    manualLocks: Array.isArray(session?.manualLocks) ? session.manualLocks.map((lock) => ({ ...lock })) : [],
    warmthOffset
  };
}

function bodyScore(plan) {
  return BODY_SLOTS.reduce((sum, slot) => sum + (plan[slot] ? CLOTHING_CATALOG[plan[slot]]?.thermalWeight ?? 0 : 0), 0);
}

function protectionOf(plan, property) {
  return BODY_SLOTS.reduce((max, slot) => Math.max(max, plan[slot] ? CLOTHING_CATALOG[plan[slot]]?.[property] ?? 0 : 0), 0);
}

function countChanges(plan, canonical) {
  return BODY_SLOTS.reduce((count, slot) => count + (plan[slot] === canonical[slot] ? 0 : 1), 0);
}

function bodyChangePenalty(plan, canonical) {
  const weights = { base_torso: 5, legs: 4, mid: 3, outer: 1 };
  return BODY_SLOTS.reduce((sum, slot) => sum + (plan[slot] === canonical[slot] ? 0 : weights[slot]), 0);
}

function weatherCurrent(weather) {
  if (!weather) return null;
  return weather.current ?? weather;
}

function maxFrom(points, property) {
  const values = points.map((point) => point?.[property]).filter(Number.isFinite);
  return values.length ? Math.max(...values) : null;
}

function sumFinite(points, property) {
  const values = points.map((point) => point?.[property]).filter(Number.isFinite);
  return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
}

function maxFinite(...values) {
  const finite = values.filter(Number.isFinite);
  return finite.length ? Math.max(...finite) : null;
}

function ageMonthsAt(birthDate, at) {
  if (!birthDate || !at) return null;
  const birth = new Date(birthDate);
  const date = new Date(at);
  if (!Number.isFinite(birth.getTime()) || !Number.isFinite(date.getTime())) return null;
  let months = (date.getUTCFullYear() - birth.getUTCFullYear()) * 12 + date.getUTCMonth() - birth.getUTCMonth();
  if (date.getUTCDate() < birth.getUTCDate()) months -= 1;
  return months;
}

function roundHalf(value) {
  return Math.round(value * 2) / 2;
}

function blockForMissingWeather(result, phase) {
  result.status = 'blocked';
  result.phases.push(blockedPhase(phase, ['weather.current.airTempC']));
  result.dataQuality.missingFields.push('weather.current.airTempC');
  addNotice(result, 'WEATHER_DATA_INCOMPLETE', 'caution', phase, ['OUTDOOR_WEATHER_REQUIRED']);
  result.explanation = 'Für diese Situation fehlt eine verwertbare Außentemperatur.';
}

function blockedPhase(phase, missingFields) {
  return { phase, status: 'blocked', thermalReferenceC: null, thermalReferenceSource: null, thermalBand: null, thermalAdjustment: 0, missingFields };
}

function mergeResult(target, source) {
  target.slots.push(...source.slots);
  target.phases.push(...source.phases);
  for (const notice of source.notices) if (!target.notices.some((n) => n.code === notice.code && n.phase === notice.phase)) target.notices.push(notice);
  target.ruleTrace.push(...source.ruleTrace);
  target.dataQuality.missingFields.push(...source.dataQuality.missingFields);
  target.dataQuality.missingFields = [...new Set(target.dataQuality.missingFields)];
  target.dataQuality.weatherFreshness = source.dataQuality.weatherFreshness ?? target.dataQuality.weatherFreshness;
  target.dataQuality.usedManualWeather ||= source.dataQuality.usedManualWeather;
  if (source.status === 'blocked' || source.status === 'partial') target.status = 'partial';
}
