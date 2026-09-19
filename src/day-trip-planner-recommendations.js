import { CLOTHING_CATALOG } from './clothing-catalog.js';
import { createSession, lockItem } from './outfit-engine.js';
import { recommendOutfit } from './recommendation-mode-adapter.js';

const FALSE_BOUNDED_COVERAGE_FIELD = 'weather.hourly.coverage';
const CAR_SEAT_COMPATIBILITY_RANK = Object.freeze({ prohibited:0, conditional:1, allowed:2 });
const FIXED_TRIP_UNDERLAYER_SLOTS = new Set(['base_torso', 'legs']);
const FIXED_UNDERLAYER_PREFERENCE = Object.freeze({
  base_torso: Object.freeze(['short_sleeve_bodysuit', 't_shirt', 'light_long_sleeve_shirt', 'long_sleeve_bodysuit']),
  legs: Object.freeze(['light_trousers', 'trousers', 'leggings', 'tights', 'warm_trousers'])
});

function phaseOrderFor(context, recommendation) {
  if (context.mode === 'car') {
    return ['in_car'].filter((phase) => recommendation.slots.some((entry) => entry.phase === phase));
  }
  return ['main'].filter((phase) => recommendation.slots.some((entry) => entry.phase === phase));
}

function boundedCoverageArtifactOnly(recommendation) {
  if (recommendation.status !== 'partial') return false;
  const remainingMissing = (recommendation.dataQuality?.missingFields ?? [])
    .filter((field) => field !== FALSE_BOUNDED_COVERAGE_FIELD);
  if (remainingMissing.length) return false;
  if (recommendation.phases.some((phase) => phase.status === 'blocked')) return false;
  if (recommendation.notices.some((notice) => ['WEATHER_DATA_STALE', 'MANUAL_LOCK_LIMITS_WEATHER_PROTECTION'].includes(notice.code))) return false;
  return recommendation.dataQuality?.missingFields?.includes(FALSE_BOUNDED_COVERAGE_FIELD) === true;
}

export function plannerRecommendationStatus(recommendation) {
  if (recommendation.status === 'blocked') return 'blocked';
  if (boundedCoverageArtifactOnly(recommendation)) {
    return recommendation.dataQuality?.usedEstimatedCabinTemperature ? 'ready_with_estimate' : 'ready';
  }
  return recommendation.status;
}

export function tripNoticesFrom(recommendation) {
  const hideCoverageOnlyNotice = boundedCoverageArtifactOnly(recommendation);
  return recommendation.notices.filter((notice) => !(hideCoverageOnlyNotice
    && notice.code === 'WEATHER_DATA_INCOMPLETE'
    && notice.reasonCodes?.includes('WEATHER_WINDOW_INCOMPLETE')
    && notice.data?.count === 1));
}

function physicalItem(itemId) {
  const definition = CLOTHING_CATALOG[itemId];
  return Boolean(definition) && definition.category !== 'none' && itemId !== 'sleep_bag_none';
}

function stateFromRecommendation(recommendation, phase, checkpoint) {
  const items = recommendation.slots
    .filter((entry) => entry.phase === phase && physicalItem(entry.selected.itemId))
    .map((entry) => ({
      phase,
      slot:entry.slot,
      itemId:entry.selected.itemId,
      wearPosition:entry.selected.wearPosition,
      reasonCodes:entry.selected.reasonCodes.filter((reason) => reason !== 'MANUAL_ITEM_LOCK')
    }));
  const hardRules = tripNoticesFrom(recommendation)
    .filter((notice) => notice.severity === 'hard_rule' && notice.phase === phase);
  return {
    at:checkpoint.startTime,
    segmentId:checkpoint.segmentId,
    phase,
    recommendationId:recommendation.recommendationId,
    recommendation,
    items,
    hardRules
  };
}

function stateMap(state) {
  return new Map((state?.items ?? []).map((item) => [item.slot, item]));
}

function qualityRank(recommendation) {
  const status = plannerRecommendationStatus(recommendation);
  if (status === 'blocked') return 2;
  if (status === 'partial') return 1;
  return 0;
}

function candidateIdsForSlot(recommendation, phase, slot, currentState, carriedBySlot) {
  const slotResult = recommendation.slots.find((entry) => entry.phase === phase && entry.slot === slot);
  if (!slotResult) return [];
  const equivalentIds = new Set(slotResult.alternatives
    .filter((alternative) => alternative.relation === 'equivalent')
    .map((alternative) => alternative.itemId));
  const ids = [];
  const current = stateMap(currentState).get(slot)?.itemId;
  if (current && equivalentIds.has(current)) ids.push(current);
  for (const itemId of carriedBySlot.get(slot) ?? []) {
    if (equivalentIds.has(itemId) && !ids.includes(itemId)) ids.push(itemId);
  }
  return ids;
}

function selectedItemId(recommendation, phase, slot) {
  return recommendation.slots.find((entry) => entry.phase === phase && entry.slot === slot)?.selected.itemId ?? null;
}

function phaseEntries(recommendation, phase) {
  return recommendation.slots.filter((entry) => entry.phase === phase);
}

function protectionMaximum(entries, field) {
  return entries.reduce((maximum, entry) => Math.max(maximum, CLOTHING_CATALOG[entry.selected.itemId]?.[field] ?? 0), 0);
}

function selectedProtection(entry, field) {
  return CLOTHING_CATALOG[entry?.selected.itemId]?.[field] ?? 0;
}

function hasReason(entry, reasonCode) {
  return entry?.selected.reasonCodes?.includes(reasonCode) === true;
}

function phaseNotice(recommendation, phase, code) {
  return tripNoticesFrom(recommendation).some((notice) => notice.phase === phase && notice.code === code);
}

function phaseTrace(recommendation, phase, ruleId) {
  return (recommendation.ruleTrace ?? []).some((trace) => trace.phase === phase && trace.ruleId === ruleId);
}

/**
 * Continuity optimization may only reuse an Engine-provided equivalent item
 * when doing so preserves the concrete protection and safety already selected
 * by the Engine for this checkpoint.
 */
export function preservesFunctionalProtection(before, after, phase) {
  const beforeEntries = phaseEntries(before, phase);
  const afterEntries = phaseEntries(after, phase);
  const afterBySlot = new Map(afterEntries.map((entry) => [entry.slot, entry]));
  const rainRequired = phaseTrace(before, phase, 'weather.rain.required')
    || phaseNotice(before, phase, 'STROLLER_RAIN_COVER');
  const windRequired = phaseTrace(before, phase, 'weather.wind.protection');
  const uvRequired = phaseNotice(before, phase, 'UV_SHADE_AND_COVERAGE');

  if (rainRequired && protectionMaximum(afterEntries, 'rainProtection') < protectionMaximum(beforeEntries, 'rainProtection')) {
    return false;
  }
  if (windRequired && protectionMaximum(afterEntries, 'windProtection') < protectionMaximum(beforeEntries, 'windProtection')) {
    return false;
  }

  for (const beforeEntry of beforeEntries) {
    const afterEntry = afterBySlot.get(beforeEntry.slot) ?? null;
    const beforeDefinition = CLOTHING_CATALOG[beforeEntry.selected.itemId];
    const afterDefinition = CLOTHING_CATALOG[afterEntry?.selected.itemId];
    if (!beforeDefinition) continue;

    const rainSlotRequired = rainRequired && (
      hasReason(beforeEntry, 'RAIN_PROTECTION_REQUIRED')
      || hasReason(beforeEntry, 'STROLLER_RAIN_COVER')
      || (beforeEntry.slot === 'footwear' && beforeDefinition.rainProtection > 0)
    );
    if (rainSlotRequired && selectedProtection(afterEntry, 'rainProtection') < beforeDefinition.rainProtection) return false;

    const windSlotRequired = windRequired && hasReason(beforeEntry, 'WIND_PROTECTION_REQUIRED');
    if (windSlotRequired && selectedProtection(afterEntry, 'windProtection') < beforeDefinition.windProtection) return false;

    if (uvRequired && beforeDefinition.sunCoverage > 0
      && selectedProtection(afterEntry, 'sunCoverage') < beforeDefinition.sunCoverage) {
      return false;
    }

    if (beforeEntry.selected.wearPosition === 'under_harness'
      && afterEntry?.selected.wearPosition === 'under_harness'
      && afterDefinition) {
      const beforeRank = CAR_SEAT_COMPATIBILITY_RANK[beforeDefinition.carSeatCompatibility] ?? 0;
      const afterRank = CAR_SEAT_COMPATIBILITY_RANK[afterDefinition.carSeatCompatibility] ?? 0;
      if (afterRank < beforeRank) return false;
    }
  }
  return true;
}

function acceptableEquivalentProjection(before, after, phase, slot, itemId) {
  if (selectedItemId(after, phase, slot) !== itemId) return false;
  if (qualityRank(after) > qualityRank(before)) return false;
  if (!preservesFunctionalProtection(before, after, phase)) return false;
  return !tripNoticesFrom(after).some((notice) =>
    ['MANUAL_LOCK_LIMITS_WEATHER_PROTECTION', 'MANUAL_LOCK_OVERRIDDEN_FOR_SAFETY'].includes(notice.code));
}

function sessionWithFixedUnderlayers(checkpoint, recommendation, fixedUnderlayers, lockedAt) {
  let session = createSession(`trip:${recommendation.recommendationId}:underlayers`);
  for (const phase of phaseOrderFor(checkpoint.engineRequest.context, recommendation)) {
    for (const [slot, itemId] of fixedUnderlayers) {
      if (!itemId || !FIXED_TRIP_UNDERLAYER_SLOTS.has(slot)) continue;
      session = lockItem(session, { phase, slot, itemId, lockedAt });
    }
  }
  return session;
}

function fixedUnderlayerCandidates(recommendations, slot) {
  const candidates = new Map();
  for (const recommendation of recommendations) {
    for (const entry of recommendation.slots) {
      if (entry.slot !== slot) continue;
      const itemId = entry.selected.itemId;
      const thermalWeight = CLOTHING_CATALOG[itemId]?.thermalWeight ?? Infinity;
      const preference = FIXED_UNDERLAYER_PREFERENCE[slot]?.indexOf(itemId) ?? Infinity;
      const current = candidates.get(entry.slot);
      if (!current || thermalWeight < current.thermalWeight
        || (thermalWeight === current.thermalWeight && preference < current.preference)) {
        candidates.set(entry.slot, { itemId, thermalWeight, preference });
      }
    }
  }
  return [...candidates.values()]
    .sort((left, right) => left.thermalWeight - right.thermalWeight || left.preference - right.preference)
    .map((candidate) => candidate.itemId);
}

function legThermalSupport(recommendation, phase) {
  return recommendation.slots
    .filter((entry) => entry.phase === phase)
    .reduce((support, entry) => {
      const definition = CLOTHING_CATALOG[entry.selected.itemId];
      if (!definition?.bodyZones.includes('legs')) return support;
      if (entry.slot === 'legs') return support + (definition.thermalWeight ?? 0);
      const isExternalAccessory = ['stroller_thermal_accessory', 'carrier_accessory', 'car_thermal_accessory'].includes(entry.slot);
      return support + (isExternalAccessory
        ? (definition.thermalStepCredit ?? 0)
        : (definition.thermalWeight ?? 0));
    }, 0);
}

function primaryLegThermalWeight(recommendation, phase) {
  const entry = recommendation.slots.find((slot) => slot.phase === phase && slot.slot === 'legs');
  return entry ? (CLOTHING_CATALOG[entry.selected.itemId]?.thermalWeight ?? 0) : 0;
}

function fixedUnderlayersFrom(checkpoints, recommendations) {
  const fixedUnderlayers = new Map();
  const baseTorso = fixedUnderlayerCandidates(recommendations, 'base_torso')[0];
  if (baseTorso) fixedUnderlayers.set('base_torso', baseTorso);

  const legCandidates = fixedUnderlayerCandidates(recommendations, 'legs');
  for (const legCandidate of legCandidates) {
    const candidateUnderlayers = new Map([...fixedUnderlayers, ['legs', legCandidate]]);
    const supportsEveryColdCheckpoint = checkpoints.every((checkpoint, index) => {
      const primary = recommendations[index];
      const session = sessionWithFixedUnderlayers(
        checkpoint,
        primary,
        candidateUnderlayers,
        checkpoint.startTime
      );
      const projected = recommendOutfit({ ...checkpoint.engineRequest, session });
      return phaseOrderFor(checkpoint.engineRequest.context, primary).every((phase) =>
        legThermalSupport(projected, phase) >= primaryLegThermalWeight(primary, phase));
    });
    if (supportsEveryColdCheckpoint) {
      fixedUnderlayers.set('legs', legCandidate);
      break;
    }
  }
  if (!fixedUnderlayers.has('legs') && legCandidates.length) {
    fixedUnderlayers.set('legs', legCandidates.at(-1));
  }
  return fixedUnderlayers;
}

function addStateToCarried(state, carriedBySlot) {
  for (const item of state.items) {
    if (!carriedBySlot.has(item.slot)) carriedBySlot.set(item.slot, []);
    const itemIds = carriedBySlot.get(item.slot);
    if (!itemIds.includes(item.itemId)) itemIds.push(item.itemId);
  }
}

function optimizeRecommendation(checkpoint, recommendation, currentState, carriedBySlot, fixedUnderlayers) {
  let session = fixedUnderlayers.size
    ? sessionWithFixedUnderlayers(checkpoint, recommendation, fixedUnderlayers, checkpoint.startTime)
    : createSession(`trip:${checkpoint.checkpointId}`);
  let working = fixedUnderlayers.size
    ? recommendOutfit({ ...checkpoint.engineRequest, session })
    : recommendation;
  if (!currentState) return working;
  let simulatedState = currentState;
  const simulatedCarried = new Map([...carriedBySlot].map(([slot, ids]) => [slot, [...ids]]));

  for (const phase of phaseOrderFor(checkpoint.engineRequest.context, working)) {
    const slots = working.slots.filter((entry) => entry.phase === phase).map((entry) => entry.slot);
    for (const slot of slots) {
      if (FIXED_TRIP_UNDERLAYER_SLOTS.has(slot) && fixedUnderlayers.has(slot)) continue;
      const candidates = candidateIdsForSlot(working, phase, slot, simulatedState, simulatedCarried);
      for (const itemId of candidates) {
        const nextSession = lockItem(session, { phase, slot, itemId, lockedAt:checkpoint.startTime });
        const projected = recommendOutfit({ ...checkpoint.engineRequest, session:nextSession });
        if (!acceptableEquivalentProjection(working, projected, phase, slot, itemId)) continue;
        session = nextSession;
        working = projected;
        break;
      }
    }
    simulatedState = stateFromRecommendation(working, phase, checkpoint);
    addStateToCarried(simulatedState, simulatedCarried);
  }
  return fixedUnderlayers.size
    ? recommendOutfit({ ...checkpoint.engineRequest, session })
    : working;
}

export function buildTripTimeline(checkpoints) {
  const timeline = [];
  const carriedBySlot = new Map();
  let currentState = null;
  const primaryRecommendations = checkpoints.map((checkpoint) => recommendOutfit(checkpoint.engineRequest));
  const fixedUnderlayers = fixedUnderlayersFrom(checkpoints, primaryRecommendations);

  for (const [index, checkpoint] of checkpoints.entries()) {
    const optimized = optimizeRecommendation(
      checkpoint,
      primaryRecommendations[index],
      currentState,
      carriedBySlot,
      fixedUnderlayers
    );

    checkpoint.recommendation = optimized;

    for (const phase of phaseOrderFor(checkpoint.engineRequest.context, optimized)) {
      const state = stateFromRecommendation(optimized, phase, checkpoint);
      timeline.push(state);
      currentState = state;
      addStateToCarried(state, carriedBySlot);
    }
  }
  return timeline;
}
