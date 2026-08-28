import { CLOTHING_CATALOG } from './clothing-catalog.js';
import { SLEEP_BAG_IDS, genericTogGuidanceForRoomTemp } from './sleep-tog-rules.js';
import {
  TEMPERATURE_BANDS, RELATION_ORDER, createSession, setWarmthOffset, lockItem, temperatureBandFor,
  createPhaseState, seedBaseline, activityAdjustmentFor, traceThermal, strollerStateAdjustment,
  evaluateWind, warmthBiasAdjustment, neckFeedbackAdjustment, selectStrollerThermalAccessory, selectCarrierAccessory,
  setSelected, carrierThermalCredit, applyThermalDelta, applyCarrierTorsoReduction,
  protectCarrierExposedAreas, rainRequirement, sunRequirement, selectStrollerWeatherAccessory,
  addNotice, applyRainProtection, applyWindProtection, applySunProtection, applyGroundContact,
  applyBodyLocksAndRebalance, applyQuickCorrection, applyWeatherQuality, finalizePhase,
  phaseStatusFromResult, summarizeWeatherWindow, thermalEnvironment, makeCarSafeBaseline,
  mergeResult, enforceCarSafetyAfterLocks, findLock, nearestSleepUnderlayer, overrideUnsafeLock,
  blockPhase, alternativeCandidateIds, thermalSignature, diffRecommendations, addTrace, roundHalf,
  isFiniteNumber, clamp
} from './outfit-engine-support.js';

export { TEMPERATURE_BANDS, createSession, setWarmthOffset, lockItem, temperatureBandFor } from './outfit-engine-support.js';

const BODY_THERMAL_SLOTS = Object.freeze(['base_torso','legs','mid','outer','feet','head','hands']);
const PROTECTION_REBALANCE_PRIORITY = Object.freeze(['mid','legs','base_torso','feet','head','hands']);
const CARRIER_PROTECTION_REBALANCE_PRIORITY = Object.freeze(['mid','base_torso']);
// Keep the V1 wire code until DATA_CONTRACT and UI copy migrate together; the engine semantics are already broader.
const SLEEP_NO_LOOSE_BEDDING_NOTICE_CODE = 'SLEEP_NO_LOOSE_BLANKET_OVER_BAG';

export function recommendOutfit(input) {
  const request = normalizeRequest(input);
  const result = recommendCore(request);
  if (result.status !== 'blocked') attachAlternatives(result, request);
  result.items = result.slots.map((entry) => ({
    itemId:entry.selected.itemId,
    phase:entry.phase,
    slot:entry.slot,
    wearPosition:entry.selected.wearPosition,
    selectionSource:entry.selected.selectionSource,
    reasonCodes:[...entry.selected.reasonCodes]
  }));
  return result;
}

function normalizeRequest(input) {
  if (!input || typeof input !== 'object') throw new TypeError('request is required');
  const profile = input.profile;
  const context = input.context ?? input.situation;
  if (!profile || typeof profile !== 'object') throw new TypeError('profile is required');
  if (!context || typeof context !== 'object' || !context.mode) throw new TypeError('context.mode is required');
  const session = input.session ?? createSession('session_default');
  if (![-1,0,1].includes(session.warmthOffset ?? 0)) throw new RangeError('session.warmthOffset must be -1, 0 or 1');
  return {
    requestId:input.requestId ?? 'request',
    requestedAt:input.requestedAt ?? '1970-01-01T00:00:00.000Z',
    profile,
    context,
    weather:input.weather ?? null,
    session:{
      sessionId:session.sessionId ?? 'session_default',
      manualLocks:[...(session.manualLocks ?? [])],
      warmthOffset:session.warmthOffset ?? 0
    },
    neckFeedback:input.neckFeedback ?? null
  };
}

function recommendCore(request) {
  const result = createResult(request);
  switch (request.context.mode) {
    case 'sleep': return evaluateSleep(result, request);
    case 'car': return evaluateCar(result, request);
    case 'outdoor':
    case 'stroller':
    case 'carrier': return evaluateOutdoorLike(result, request, 'main', request.context.mode);
    default: throw new RangeError(`unsupported mode: ${request.context.mode}`);
  }
}

function createResult(request) {
  return {
    recommendationId:`recommendation:${request.requestId}`,
    requestId:request.requestId,
    generatedAt:request.requestedAt,
    sessionId:request.session.sessionId,
    mode:request.context.mode,
    status:'ready',
    phases:[],
    slots:[],
    notices:[],
    ruleTrace:[],
    dataQuality:{
      weatherFreshness:request.weather?.freshness ?? null,
      missingFields:[],
      usedManualWeather:['manual','api_with_manual_override'].includes(request.weather?.origin),
      usedEstimatedCabinTemperature:false
    }
  };
}

function evaluateOutdoorLike(result, request, phase, effectiveMode) {
  const { context, profile, weather, session, neckFeedback } = request;
  const point = weather?.current ?? null;
  if (!point || !isFiniteNumber(point.airTempC)) {
    blockPhase(result, phase, ['weather.current.airTempC']);
    addNotice(result,'WEATHER_DATA_INCOMPLETE','caution',phase,['OUTDOOR_WEATHER_REQUIRED'],{});
    return result;
  }

  const thermal = thermalEnvironment(point);
  const band = temperatureBandFor(thermal.thermalReferenceC);
  const weatherWindow = summarizeWeatherWindow(weather, context.plannedMinutes);
  const state = createPhaseState(result, phase, effectiveMode);
  seedBaseline(state, band.id, effectiveMode);

  let adjustment = 0;
  const activityAdjustment = activityAdjustmentFor(context, effectiveMode);
  adjustment += activityAdjustment;
  if (activityAdjustment) traceThermal(result,'activity.level',phase,activityAdjustment,activityAdjustment > 0 ? 'ACTIVITY_WARMER' : 'ACTIVITY_COOLER');

  if (effectiveMode === 'stroller') {
    const strollerAdjustment = strollerStateAdjustment(context);
    adjustment += strollerAdjustment;
    traceThermal(result,'situation.stroller.state',phase,strollerAdjustment,'STROLLER_STATE_THERMAL_ADJUSTMENT');
  }

  const wind = evaluateWind(weatherWindow, thermal, context, effectiveMode);
  adjustment += wind.thermalAdjustment;
  if (wind.thermalAdjustment) traceThermal(result,'weather.wind.thermal',phase,wind.thermalAdjustment,'WIND_THERMAL_EFFECT');

  const bias = warmthBiasAdjustment(profile.warmthBias);
  adjustment += bias;
  if (bias) traceThermal(result,'profile.warmth_bias',phase,bias,bias > 0 ? 'BABY_RUNS_COOL' : 'BABY_RUNS_WARM');

  const neck = neckFeedbackAdjustment(neckFeedback);

  let accessoryCredit = 0;
  if (effectiveMode === 'stroller') {
    const thermalAccessory = selectStrollerThermalAccessory(request, thermal.thermalReferenceC, phase);
    setSelected(state,'stroller_thermal_accessory',thermalAccessory.itemId,thermalAccessory.source,'external',thermalAccessory.reasons);
    accessoryCredit = CLOTHING_CATALOG[thermalAccessory.itemId].thermalStepCredit;
    if (accessoryCredit) addTrace(result,'situation.stroller.external_isolation',phase,'thermal_down',thermalAccessory.itemId,-accessoryCredit,'STROLLER_EXTERNAL_ISOLATION_CREDIT');
  }

  let carrierTorsoCredit = 0;
  if (effectiveMode === 'carrier') {
    const carrier = selectCarrierAccessory(request, thermal.thermalReferenceC, phase);
    setSelected(state,'carrier_accessory',carrier.itemId,carrier.source,'external',carrier.reasons);
    carrierTorsoCredit = carrierThermalCredit(context, CLOTHING_CATALOG[carrier.itemId].thermalStepCredit);
    addTrace(result,'situation.carrier.body_heat',phase,'thermal_down',carrier.itemId,-carrierTorsoCredit,'CARRIER_BODY_HEAT');
  }

  const bodyAdjustment = adjustment - accessoryCredit;
  applyThermalDelta(state, bodyAdjustment, new Set(), effectiveMode);

  if (effectiveMode === 'carrier') {
    applyCarrierTorsoReduction(state, carrierTorsoCredit, effectiveMode);
    protectCarrierExposedAreas(state, thermal.thermalReferenceC);
    addNotice(result,'CHECK_NECK','info',phase,['THERMAL_FEEDBACK_REQUIRED'],{});
  }

  const rain = rainRequirement(weatherWindow, point);
  const uv = sunRequirement(weatherWindow, context);

  if (effectiveMode === 'stroller') {
    const weatherAccessory = selectStrollerWeatherAccessory(request, rain.required, uv.active, phase);
    setSelected(state,'stroller_weather_accessory',weatherAccessory.itemId,weatherAccessory.source,'external',weatherAccessory.reasons);
    if (weatherAccessory.itemId === 'stroller_rain_cover') addNotice(result,'STROLLER_RAIN_COVER','info',phase,['STROLLER_RAIN_COVER'],{});
    if (weatherAccessory.itemId === 'stroller_sunshade') addNotice(result,'STROLLER_SUNSHADE','info',phase,['STROLLER_SUNSHADE'],{});
    addNotice(result,'STROLLER_DO_NOT_COVER_AIRFLOW','hard_rule',phase,['STROLLER_AIRFLOW_SAFETY'],{});
  }

  const thermalWeightBeforeProtection = bodyThermalWeight(state);
  applyRainProtection(state, result, request, rain, phase, effectiveMode);
  applyWindProtection(state, result, wind, phase, effectiveMode);
  preferLightWindShellInWarmWeather(state, thermal.thermalReferenceC, rain, wind, effectiveMode);
  rebalanceFunctionalProtection(state, thermalWeightBeforeProtection, effectiveMode);

  applySunProtection(state, result, request, uv, thermal.thermalReferenceC, phase, effectiveMode);
  applyGroundContact(state, rain, thermal.thermalReferenceC, context, effectiveMode);

  applyBodyLocksAndRebalance(state, result, request, phase, effectiveMode);

  const protectedQuickSlots = functionalProtectionSlots(state, rain, wind, effectiveMode, uv);
  const quickRequest = withProtectedSlots(request, phase, protectedQuickSlots);
  applyQuickCorrection(state, result, session.warmthOffset, phase, effectiveMode, quickRequest);
  applyNeckCorrection(state,result,request,phase,effectiveMode,neckFeedback,neck,protectedQuickSlots);

  if (thermal.thermalReferenceC < 0) addNotice(result,'EXTREME_COLD_CAUTION','caution',phase,['EXTREME_COLD_CAUTION'],{ thermalReferenceC:thermal.thermalReferenceC });
  if (thermal.thermalReferenceC >= 30 || (effectiveMode === 'carrier' && thermal.thermalReferenceC >= 28)) addNotice(result,'EXTREME_HEAT_CAUTION','caution',phase,['EXTREME_HEAT_CAUTION'],{ thermalReferenceC:thermal.thermalReferenceC });
  if (wind.strongCaution) addNotice(result,'STRONG_WIND_CAUTION','caution',phase,['STRONG_WIND_CAUTION'],{ maxWindSpeedKmh:weatherWindow.maxWindSpeedKmh, maxWindGustKmh:weatherWindow.maxWindGustKmh });
  if (!result.notices.some((notice) => notice.code === 'CHECK_NECK' && notice.phase === phase)) addNotice(result,'CHECK_NECK','info',phase,['THERMAL_FEEDBACK_REQUIRED'],{});

  applyWeatherQuality(result, weather, point, weatherWindow, phase);
  finalizePhase(state);
  result.phases.push({
    phase,
    status:phaseStatusFromResult(result),
    thermalReferenceC:thermal.thermalReferenceC,
    thermalReferenceSource:thermal.referenceSource,
    thermalBand:band.id,
    thermalAdjustment:roundHalf(adjustment + neck - accessoryCredit - (effectiveMode === 'carrier' ? carrierTorsoCredit : 0) + session.warmthOffset),
    missingFields:[...new Set(result.dataQuality.missingFields)]
  });
  return result;
}

function evaluateCar(result, request) {
  const { context, profile, session, neckFeedback } = request;
  addNotice(result,'CAR_SEAT_NO_BULKY_LAYERS','hard_rule','in_car',['CAR_HARNESS_SAFETY'],{});

  if (context.includeOutdoorTransition) {
    const transitionContext = {
      mode:'outdoor',
      plannedMinutes:context.outsideTransitionMinutes ?? context.plannedMinutes ?? null,
      activity:'normal',
      activitySource:'default',
      sunExposure:'unknown',
      groundContact:'none'
    };
    const subRequest = {
      ...request,
      context:transitionContext,
      session:{ ...session, manualLocks:session.manualLocks.filter((lock) => lock.phase === 'outdoor_transition') }
    };
    const transitionResult = createResult({ ...request, context:{ ...request.context, mode:'car'} });
    evaluateOutdoorLike(transitionResult, subRequest, 'outdoor_transition', 'outdoor');
    mergeResult(result, transitionResult, 'outdoor_transition');
    if (transitionResult.status === 'blocked') result.status = 'partial';
    if (result.slots.some((slot) => slot.phase === 'outdoor_transition' && CLOTHING_CATALOG[slot.selected.itemId]?.carSeatCompatibility === 'prohibited')) {
      addNotice(result,'CAR_SEAT_REMOVE_OUTER_BEFORE_HARNESS','hard_rule','outdoor_transition',['CAR_HARNESS_SAFETY'],{});
    }
  }

  if (!isFiniteNumber(context.cabinTempC)) {
    blockPhase(result,'in_car',['context.cabinTempC']);
    result.status = 'blocked';
    return result;
  }

  const band = temperatureBandFor(context.cabinTempC);
  const state = createPhaseState(result,'in_car','car');
  seedBaseline(state, band.id, 'car');
  makeCarSafeBaseline(state);

  const bias = warmthBiasAdjustment(profile.warmthBias);
  const neck = neckFeedbackAdjustment(neckFeedback);
  applyThermalDelta(state, bias, new Set(), 'car');
  makeCarSafeBaseline(state);

  applyBodyLocksAndRebalance(state,result,request,'in_car','car');
  sanitizeAutomaticConditionalCarLayers(state);
  enforceCarSafetyAfterLocks(state,result,request,'in_car');

  const carQuickRequest = withProtectedSlots(request,'in_car',new Set(['mid','outer']));
  applyQuickCorrection(state,result,session.warmthOffset,'in_car','car',carQuickRequest);
  sanitizeAutomaticConditionalCarLayers(state);
  enforceCarSafetyAfterLocks(state,result,request,'in_car');

  const carNeckProtected = neck > 0 ? new Set(['mid','outer']) : new Set(['outer']);
  applyNeckCorrection(state,result,request,'in_car','car',neckFeedback,neck,carNeckProtected);
  sanitizeAutomaticConditionalCarLayers(state);
  enforceCarSafetyAfterLocks(state,result,request,'in_car');

  addNotice(result,'CAR_SEAT_BLANKET_OVER_HARNESS_ONLY','hard_rule','in_car',['CAR_HARNESS_SAFETY'],{});
  addNotice(result,'CHECK_NECK','info','in_car',['THERMAL_FEEDBACK_REQUIRED'],{});
  if (context.cabinTempSource === 'estimated') {
    result.dataQuality.usedEstimatedCabinTemperature = true;
    addNotice(result,'CAR_CABIN_TEMPERATURE_ESTIMATED','info','in_car',['CAR_CABIN_TEMPERATURE_ESTIMATED'],{ cabinTempC:context.cabinTempC });
  }

  finalizePhase(state);
  const inCarStatus = context.cabinTempSource === 'estimated' ? 'ready_with_estimate' : 'ready';
  result.phases.push({
    phase:'in_car',
    status:inCarStatus,
    thermalReferenceC:context.cabinTempC,
    thermalReferenceSource:'cabin_temp',
    thermalBand:band.id,
    thermalAdjustment:roundHalf(bias + neck + session.warmthOffset),
    missingFields:[]
  });
  if (result.status !== 'partial' && result.status !== 'blocked') result.status = inCarStatus;
  return result;
}

function evaluateSleep(result, request) {
  const { context, profile, session, neckFeedback } = request;
  addNotice(result,'SLEEP_NO_HAT','hard_rule','main',['SAFE_SLEEP_HEAD_UNCOVERED'],{});
  addNotice(result,SLEEP_NO_LOOSE_BEDDING_NOTICE_CODE,'hard_rule','main',['SAFE_SLEEP_NO_LOOSE_BEDDING'],{});
  addNotice(result,'SLEEP_NO_WEIGHTED_PRODUCTS','hard_rule','main',['SAFE_SLEEP_NO_WEIGHTED_PRODUCTS'],{});
  addNotice(result,'SLEEP_USE_ROOM_TEMPERATURE','hard_rule','main',['SLEEP_ROOM_TEMP_ONLY'],{});
  addNotice(result,'SLEEP_GENERIC_TOG_ORIENTATION','info','main',['SLEEP_GENERIC_TOG_ORIENTATION'],{});
  addNotice(result,'CHECK_NECK','info','main',['THERMAL_FEEDBACK_REQUIRED'],{});

  if (!isFiniteNumber(context.roomTempC)) {
    blockPhase(result,'main',['context.roomTempC']);
    return result;
  }

  const guidance = genericTogGuidanceForRoomTemp(context.roomTempC);
  const state = createPhaseState(result,'main','sleep');
  const bagLock = findLock(session,'main','sleep_bag');
  const underLock = findLock(session,'main','sleep_underlayer');

  let bagId = guidance.sleepBagId;
  let bagSource = 'engine';
  let bagLocked = false;
  if (bagLock) {
    if (SLEEP_BAG_IDS.includes(bagLock.itemId)) {
      bagId = bagLock.itemId;
      bagSource = 'manual_lock';
      bagLocked = true;
      addTrace(result,'swap.sleep_bag','main','lock',bagId,null,'MANUAL_ITEM_LOCK');
    } else {
      overrideUnsafeLock(result,bagLock,'main','SLEEP_INVALID_BAG_LOCK');
    }
  }

  let lockedUnderlayerId = null;
  if (underLock) {
    const definition = CLOTHING_CATALOG[underLock.itemId];
    if (definition?.slot === 'sleep_underlayer' && definition.sleepSafe) {
      lockedUnderlayerId = underLock.itemId;
      addTrace(result,'swap.sleep_underlayer','main','lock',underLock.itemId,null,'MANUAL_ITEM_LOCK');
    } else {
      overrideUnsafeLock(result,underLock,'main','SLEEP_UNSAFE_UNDERLAYER_LOCK');
    }
  }

  let targetWarmth = guidance.targetWarmth + warmthBiasAdjustment(profile.warmthBias) + neckFeedbackAdjustment(neckFeedback) + session.warmthOffset;
  targetWarmth = clamp(targetWarmth,0,9);

  if (lockedUnderlayerId && !bagLocked) {
    const underWeight = CLOTHING_CATALOG[lockedUnderlayerId].sleepWarmthWeight ?? 0;
    bagId = nearestSleepBag(targetWarmth - underWeight, guidance.sleepBagId);
  }

  const bagWeight = CLOTHING_CATALOG[bagId].sleepWarmthWeight ?? 0;
  const underlayerId = lockedUnderlayerId ?? nearestSleepUnderlayer(targetWarmth - bagWeight);
  const bagReason = bagSource === 'manual_lock'
    ? 'MANUAL_ITEM_LOCK'
    : lockedUnderlayerId
      ? 'SLEEP_BAG_REBALANCED'
      : 'SLEEP_GENERIC_TOG_ORIENTATION';

  setSelected(state,'sleep_bag',bagId,bagSource,'external',[bagReason]);
  setSelected(
    state,
    'sleep_underlayer',
    underlayerId,
    lockedUnderlayerId ? 'manual_lock' : 'engine',
    'on_body',
    [lockedUnderlayerId ? 'MANUAL_ITEM_LOCK' : 'SLEEP_UNDERLAYER_REBALANCED']
  );

  finalizePhase(state);
  if (context.roomTempC < 16) addNotice(result,'SLEEP_ROOM_BELOW_ORIENTATION_RANGE','caution','main',['SLEEP_ROOM_BELOW_16'],{ roomTempC:context.roomTempC });
  result.phases.push({
    phase:'main',
    status:'ready',
    thermalReferenceC:context.roomTempC,
    thermalReferenceSource:'room_temp',
    thermalBand:guidance.id,
    thermalAdjustment:roundHalf(targetWarmth - guidance.targetWarmth),
    missingFields:[]
  });
  return result;
}

function attachAlternatives(result,request) {
  for (const slotResult of result.slots) {
    const candidates = alternativeCandidateIds(slotResult,request.context.mode);
    const baselineScore = thermalSignature(result,slotResult.phase);
    const options = [];
    for (const itemId of candidates) {
      if (itemId === slotResult.selected.itemId) continue;
      const session = lockItem(request.session,{ phase:slotResult.phase, slot:slotResult.slot, itemId, lockedAt:request.requestedAt });
      const projected = recommendCore({ ...request, session });
      if (projected.status === 'blocked') continue;
      const projectedSelection = projected.slots.find((entry) => entry.phase === slotResult.phase && entry.slot === slotResult.slot);
      if (!projectedSelection || projectedSelection.selected.itemId !== itemId) continue;
      const projectedScore = thermalSignature(projected,slotResult.phase);
      const delta = roundHalf(projectedScore - baselineScore);
      const relation = Math.abs(delta) < 0.25 ? 'equivalent' : delta > 0 ? 'warmer' : 'cooler';
      const projectedChanges = diffRecommendations(result,projected,slotResult.phase).map((change) => ({
        ...change,
        reasonCode:change.slot === slotResult.slot ? 'MANUAL_ITEM_LOCK' : 'OUTFIT_REBALANCED_AFTER_SWAP'
      }));
      options.push({ itemId, relation, relativeThermalDelta:delta, projectedChanges });
    }
    options.sort((a,b) => RELATION_ORDER[a.relation] - RELATION_ORDER[b.relation]
      || Math.abs(a.relativeThermalDelta) - Math.abs(b.relativeThermalDelta)
      || a.projectedChanges.length - b.projectedChanges.length
      || a.itemId.localeCompare(b.itemId));
    slotResult.alternatives = options;
  }
}

function bodyThermalWeight(state) {
  let total = 0;
  for (const [slot,selection] of state.map.entries()) {
    if (!BODY_THERMAL_SLOTS.includes(slot)) continue;
    total += CLOTHING_CATALOG[selection.itemId]?.thermalWeight ?? 0;
  }
  return total;
}

function preferLightWindShellInWarmWeather(state, temp, rain, wind, mode) {
  if (!['outdoor','stroller'].includes(mode) || temp < 24 || rain.required || wind.requiredProtection <= 0) return;
  const outer = state.map.get('outer');
  if (!outer || !['light_transition_jacket','softshell_jacket'].includes(outer.itemId)) return;
  if (!outer.reasonCodes.includes('WIND_PROTECTION_REQUIRED')) return;
  setSelected(state,'outer','rain_jacket','engine','on_body',['WIND_PROTECTION_REQUIRED','WARM_WEATHER_LIGHT_SHELL']);
}

function rebalanceFunctionalProtection(state, thermalWeightBeforeProtection, mode) {
  const delta = bodyThermalWeight(state) - thermalWeightBeforeProtection;
  if (!delta) return;
  const priority = mode === 'carrier' ? CARRIER_PROTECTION_REBALANCE_PRIORITY : PROTECTION_REBALANCE_PRIORITY;
  applyThermalDelta(state,-delta,new Set(['outer']),mode,priority);
}

function functionalProtectionSlots(state, rain, wind, mode, uv) {
  const protectedSlots = new Set();
  const outer = state.map.get('outer');
  if (outer) {
    const outerDefinition = CLOTHING_CATALOG[outer.itemId];
    const strollerWeatherDefinition = mode === 'stroller'
      ? CLOTHING_CATALOG[state.map.get('stroller_weather_accessory')?.itemId]
      : null;
    const rainNeedsOuter = rain.required && (strollerWeatherDefinition?.rainProtection ?? 0) < 3;
    const windNeedsOuter = wind.requiredProtection > (strollerWeatherDefinition?.windProtection ?? 0);
    if ((rainNeedsOuter && (outerDefinition?.rainProtection ?? 0) >= 3)
      || (windNeedsOuter && (outerDefinition?.windProtection ?? 0) >= wind.requiredProtection)) {
      protectedSlots.add('outer');
    }
  }

  if (uv.active && mode !== 'car') {
    for (const slot of ['head','base_torso','legs']) {
      if (state.map.has(slot)) protectedSlots.add(slot);
    }
  }
  return protectedSlots;
}

function applyNeckCorrection(state,result,request,phase,mode,feedback,delta,protectedSlots = new Set()) {
  if (!delta) {
    if (feedback === 'warm_dry') addTrace(result,'feedback.neck',phase,'no_change',null,0,'NECK_WARM_DRY_KEEP');
    return;
  }
  const locked = new Set([
    ...request.session.manualLocks.filter((lock) => lock.phase === phase).map((lock) => lock.slot),
    ...protectedSlots
  ]);
  const changed = applyThermalDelta(state,delta,locked,mode,null,true);
  addTrace(
    result,
    'feedback.neck',
    phase,
    delta > 0 ? 'thermal_up' : 'thermal_down',
    changed ?? null,
    delta,
    delta > 0 ? 'NECK_COOL' : 'NECK_HOT_SWEATY'
  );
}

function withProtectedSlots(request, phase, slots) {
  if (!slots.size) return request;
  const existing = new Set(request.session.manualLocks.filter((lock) => lock.phase === phase).map((lock) => lock.slot));
  const syntheticLocks = [...slots]
    .filter((slot) => !existing.has(slot))
    .map((slot) => ({ phase, slot, itemId:'__protected__', lockedAt:request.requestedAt }));
  return {
    ...request,
    session:{ ...request.session, manualLocks:[...request.session.manualLocks,...syntheticLocks] }
  };
}

function sanitizeAutomaticConditionalCarLayers(state) {
  for (const [slot,selection] of [...state.map.entries()]) {
    const definition = CLOTHING_CATALOG[selection.itemId];
    if (definition?.carSeatCompatibility !== 'conditional' || selection.selectionSource === 'manual_lock') continue;
    if (slot === 'mid') setSelected(state,'mid','thin_sweater','engine','under_harness',['IN_CAR_THERMAL_BASELINE']);
    else state.map.delete(slot);
  }
}

function nearestSleepBag(targetWeight, preferredId) {
  return [...SLEEP_BAG_IDS].sort((a,b) => {
    const aw = CLOTHING_CATALOG[a].sleepWarmthWeight ?? 0;
    const bw = CLOTHING_CATALOG[b].sleepWarmthWeight ?? 0;
    const distance = Math.abs(aw-targetWeight) - Math.abs(bw-targetWeight);
    if (distance) return distance;
    if (a === preferredId) return -1;
    if (b === preferredId) return 1;
    return aw-bw;
  })[0];
}
