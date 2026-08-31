import { CLOTHING_CATALOG } from './clothing-catalog.js';
import { createSession, lockItem } from './outfit-engine.js';
import { recommendOutfit } from './recommendation-mode-adapter.js';

const FALSE_BOUNDED_COVERAGE_FIELD = 'weather.hourly.coverage';

function phaseOrderFor(context, recommendation) {
  if (context.mode === 'car') {
    const order = context.includeOutdoorTransition ? ['outdoor_transition', 'in_car'] : ['in_car'];
    return order.filter((phase) => recommendation.slots.some((entry) => entry.phase === phase));
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

function acceptableEquivalentProjection(before, after, phase, slot, itemId) {
  if (selectedItemId(after, phase, slot) !== itemId) return false;
  if (qualityRank(after) > qualityRank(before)) return false;
  return !tripNoticesFrom(after).some((notice) =>
    ['MANUAL_LOCK_LIMITS_WEATHER_PROTECTION', 'MANUAL_LOCK_OVERRIDDEN_FOR_SAFETY'].includes(notice.code));
}

function addStateToCarried(state, carriedBySlot) {
  for (const item of state.items) {
    if (!carriedBySlot.has(item.slot)) carriedBySlot.set(item.slot, []);
    const itemIds = carriedBySlot.get(item.slot);
    if (!itemIds.includes(item.itemId)) itemIds.push(item.itemId);
  }
}

function optimizeRecommendation(checkpoint, recommendation, currentState, carriedBySlot) {
  if (!currentState) return recommendation;
  let working = recommendation;
  let session = createSession(`trip:${checkpoint.checkpointId}`);
  let simulatedState = currentState;
  const simulatedCarried = new Map([...carriedBySlot].map(([slot, ids]) => [slot, [...ids]]));

  for (const phase of phaseOrderFor(checkpoint.engineRequest.context, working)) {
    const slots = working.slots.filter((entry) => entry.phase === phase).map((entry) => entry.slot);
    for (const slot of slots) {
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
  return working;
}

export function buildTripTimeline(checkpoints) {
  const timeline = [];
  const carriedBySlot = new Map();
  let currentState = null;

  for (const checkpoint of checkpoints) {
    const primary = recommendOutfit(checkpoint.engineRequest);
    const optimized = optimizeRecommendation(checkpoint, primary, currentState, carriedBySlot);
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
