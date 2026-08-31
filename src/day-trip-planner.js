import {
  invalidTripResult,
  parseTripTime,
  prepareTripCheckpoints,
  validateTripPlannerRequest
} from './day-trip-planner-weather.js';
import {
  buildTripTimeline,
  plannerRecommendationStatus,
  tripNoticesFrom
} from './day-trip-planner-recommendations.js';

const NON_PACKABLE_STATE_IDS = new Set(['sleep_under_nappy_only']);

function unique(values) {
  return [...new Set(values)];
}

function stateMap(state) {
  return new Map((state?.items ?? []).map((item) => [item.slot, item]));
}

function hardRuleKey(notice) {
  return `${notice.code}|${notice.phase}|${JSON.stringify(notice.reasonCodes ?? [])}|${JSON.stringify(notice.data ?? {})}`;
}

function practicalDiff(before, after) {
  const beforeMap = stateMap(before);
  const afterMap = stateMap(after);
  const slots = unique([...beforeMap.keys(), ...afterMap.keys()]).sort();
  const changes = [];
  for (const slot of slots) {
    const from = beforeMap.get(slot) ?? null;
    const to = afterMap.get(slot) ?? null;
    if (from?.itemId === to?.itemId && from?.wearPosition === to?.wearPosition) continue;
    let kind = 'replace';
    if (!from) kind = 'add';
    else if (!to) kind = 'remove';
    else if (from.itemId === to.itemId) kind = 'reposition';
    changes.push({ slot, kind, from, to });
  }
  return changes;
}

function actionsFromTimeline(timeline) {
  const actions = [];
  let previous = timeline[0] ?? null;
  for (let index = 1; index < timeline.length; index += 1) {
    const current = timeline[index];
    const previousHardRules = new Set((previous?.hardRules ?? []).map(hardRuleKey));
    for (const notice of current.hardRules) {
      if (previousHardRules.has(hardRuleKey(notice))) continue;
      actions.push({
        actionId:`trip-action:${actions.length + 1}`,
        at:current.at,
        segmentId:current.segmentId,
        kind:'safety_instruction',
        phase:current.phase,
        slot:null,
        fromItemId:null,
        toItemId:null,
        fromWearPosition:null,
        toWearPosition:null,
        reasonCodes:[...(notice.reasonCodes ?? [])],
        safetyCritical:true
      });
    }

    for (const change of practicalDiff(previous, current)) {
      const reasonCodes = unique([...(change.from?.reasonCodes ?? []), ...(change.to?.reasonCodes ?? [])]);
      const hardReasons = new Set(current.hardRules.flatMap((notice) => notice.reasonCodes ?? []));
      actions.push({
        actionId:`trip-action:${actions.length + 1}`,
        at:current.at,
        segmentId:current.segmentId,
        kind:change.kind,
        phase:current.phase,
        slot:change.slot,
        fromItemId:change.from?.itemId ?? null,
        toItemId:change.to?.itemId ?? null,
        fromWearPosition:change.from?.wearPosition ?? null,
        toWearPosition:change.to?.wearPosition ?? null,
        reasonCodes,
        safetyCritical:reasonCodes.some((reason) => hardReasons.has(reason))
      });
    }
    previous = current;
  }
  return actions;
}

function startOutfitFrom(timeline) {
  const first = timeline[0];
  if (!first) return null;
  return {
    at:first.at,
    segmentId:first.segmentId,
    sourceRecommendationId:first.recommendationId,
    items:first.items.map(({ reasonCodes, ...item }) => item)
  };
}

function packListFrom(timeline, startOutfit) {
  if (!startOutfit) return [];
  const startIds = new Set(startOutfit.items.map((item) => item.itemId));
  const packed = new Map();
  for (const state of timeline.slice(1)) {
    for (const item of state.items) {
      if (startIds.has(item.itemId) || NON_PACKABLE_STATE_IDS.has(item.itemId)) continue;
      const existing = packed.get(item.itemId);
      if (!existing) {
        packed.set(item.itemId, {
          itemId:item.itemId,
          firstNeededAt:state.at,
          segmentIds:[state.segmentId],
          reasonCodes:[...item.reasonCodes]
        });
        continue;
      }
      if (!existing.segmentIds.includes(state.segmentId)) existing.segmentIds.push(state.segmentId);
      existing.reasonCodes = unique([...existing.reasonCodes, ...item.reasonCodes]);
    }
  }
  return [...packed.values()].sort((left, right) =>
    parseTripTime(left.firstNeededAt) - parseTripTime(right.firstNeededAt) || left.itemId.localeCompare(right.itemId));
}

function dedupeNotices(notices) {
  const seen = new Set();
  return notices.filter((notice) => {
    const key = `${notice.code}|${notice.phase}|${notice.severity}|${JSON.stringify(notice.reasonCodes ?? [])}|${JSON.stringify(notice.data ?? {})}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function tripStatus(checkpoints, coverageIssues, startOutfit) {
  if (!startOutfit) return 'blocked';
  if (coverageIssues.length) return 'partial';
  const statuses = checkpoints.map((checkpoint) => plannerRecommendationStatus(checkpoint.recommendation));
  if (statuses.some((status) => status === 'blocked' || status === 'partial')) return 'partial';
  if (statuses.some((status) => status === 'ready_with_estimate')) return 'ready_with_estimate';
  return 'ready';
}

function coveredUntilFor(request, checkpoints, issues, startOutfit) {
  if (!startOutfit) return null;
  if (!issues.length) return request.plan.endTime;
  const issueStart = parseTripTime(issues[0].startTime);
  const completed = checkpoints.filter((checkpoint) => parseTripTime(checkpoint.endTime) <= issueStart);
  if (completed.length) return completed.at(-1).endTime;
  const first = checkpoints[0];
  if (first && parseTripTime(first.startTime) <= issueStart) return first.startTime;
  return request.plan.startTime;
}

/**
 * Pure day-trip planner over the existing OutfitRecommendation engine.
 * No DOM, storage, weather-provider access, or input mutation occurs here.
 */
export function planDayTrip(request) {
  const validationIssues = validateTripPlannerRequest(request);
  if (validationIssues.length) return invalidTripResult(request, validationIssues);

  const { checkpoints, issues, haltAfterCheckpointId } = prepareTripCheckpoints(request);
  if (!checkpoints.length) {
    return invalidTripResult(request, issues.length ? issues : [{
      startTime:request.plan.startTime,
      endTime:request.plan.endTime,
      code:'invalid_segment',
      segmentId:null
    }]);
  }

  const evaluated = [];
  for (const checkpoint of checkpoints) {
    evaluated.push(checkpoint);
    if (checkpoint.checkpointId === haltAfterCheckpointId) break;
  }

  const timeline = buildTripTimeline(evaluated);
  const firstRecommendation = evaluated[0]?.recommendation;
  const startStatus = firstRecommendation ? plannerRecommendationStatus(firstRecommendation) : 'blocked';
  const startOutfit = startStatus === 'blocked' ? null : startOutfitFrom(timeline);
  const actions = startOutfit ? actionsFromTimeline(timeline) : [];
  const packList = startOutfit ? packListFrom(timeline, startOutfit) : [];
  const notices = startOutfit
    ? dedupeNotices(evaluated.flatMap((checkpoint) => tripNoticesFrom(checkpoint.recommendation)))
    : [];

  return {
    tripResultId:`trip-result:${request.requestId}:${request.plan.tripId}`,
    requestId:request.requestId,
    tripId:request.plan.tripId,
    generatedAt:request.requestedAt,
    status:tripStatus(evaluated, issues, startOutfit),
    startOutfit,
    packList,
    actions,
    notices,
    coverage:{
      plannedStartTime:request.plan.startTime,
      plannedEndTime:request.plan.endTime,
      coveredUntil:coveredUntilFor(request, evaluated, issues, startOutfit),
      issues
    }
  };
}
