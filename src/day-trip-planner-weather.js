const WEATHER_HOURLY_MODES = new Set(['outdoor', 'stroller', 'carrier']);
const SUPPORTED_MODES = new Set(['outdoor', 'stroller', 'carrier', 'car', 'indoor', 'sleep']);
const MAX_WEATHER_STEP_MS = 60 * 60 * 1000;

export function cloneTripValue(value) {
  return structuredClone(value);
}

function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

export function parseTripTime(value) {
  const parsed = typeof value === 'string' ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function minutesBetween(startTime, endTime) {
  return Math.max(0, (parseTripTime(endTime) - parseTripTime(startTime)) / 60000);
}

function coverageIssue(startTime, endTime, code, segmentId = null) {
  return { startTime, endTime, code, segmentId };
}

export function invalidTripResult(request, issues) {
  const requestId = request?.requestId ?? 'request';
  const tripId = request?.plan?.tripId ?? 'trip';
  const startTime = request?.plan?.startTime ?? request?.requestedAt ?? '1970-01-01T00:00:00.000Z';
  const endTime = request?.plan?.endTime ?? startTime;
  return {
    tripResultId:`trip-result:${requestId}:${tripId}`,
    requestId,
    tripId,
    generatedAt:request?.requestedAt ?? startTime,
    status:'blocked',
    startOutfit:null,
    packList:[],
    actions:[],
    notices:[],
    coverage:{
      plannedStartTime:startTime,
      plannedEndTime:endTime,
      coveredUntil:null,
      issues
    }
  };
}

export function validateTripPlannerRequest(request) {
  const plan = request?.plan;
  const fallback = request?.requestedAt ?? '1970-01-01T00:00:00.000Z';
  const startTime = plan?.startTime ?? fallback;
  const endTime = plan?.endTime ?? startTime;
  const invalid = () => [coverageIssue(startTime, endTime, 'invalid_segment', null)];

  if (!request || typeof request !== 'object' || !request.profile || typeof request.profile !== 'object') return invalid();
  if (!plan || typeof plan !== 'object' || !Array.isArray(plan.segments) || plan.segments.length === 0) return invalid();
  const startMs = parseTripTime(plan.startTime);
  const endMs = parseTripTime(plan.endTime);
  if (startMs === null || endMs === null || endMs <= startMs) return invalid();
  if (plan.segments[0]?.startTime !== plan.startTime || plan.segments.at(-1)?.endTime !== plan.endTime) return invalid();

  for (let index = 0; index < plan.segments.length; index += 1) {
    const segment = plan.segments[index];
    const segmentStart = parseTripTime(segment?.startTime);
    const segmentEnd = parseTripTime(segment?.endTime);
    const context = segment?.context;
    if (!segment?.segmentId || segmentStart === null || segmentEnd === null || segmentEnd <= segmentStart) return invalid();
    if (!context || typeof context !== 'object' || !SUPPORTED_MODES.has(context.mode)) return invalid();
    if (index > 0 && plan.segments[index - 1].endTime !== segment.startTime) return invalid();
    if (context.mode === 'car' && (!finiteNumber(context.cabinTempC) || !context.cabinTempSource)) {
      return [coverageIssue(segment.startTime, segment.endTime, 'invalid_segment', segment.segmentId)];
    }
  }
  return [];
}

function weatherRequiredAtSegmentStart(context) {
  return WEATHER_HOURLY_MODES.has(context.mode)
    || (context.mode === 'car' && context.includeOutdoorTransition === true);
}

function usableWeatherPoints(weather) {
  if (!weather || typeof weather !== 'object') return [];
  const candidates = [weather.current, ...(Array.isArray(weather.hourly) ? weather.hourly : [])];
  const byTime = new Map();
  for (const point of candidates) {
    if (!point || typeof point !== 'object' || parseTripTime(point.time) === null || !finiteNumber(point.airTempC)) continue;
    if (!byTime.has(point.time)) byTime.set(point.time, point);
  }
  return [...byTime.values()].sort((left, right) => parseTripTime(left.time) - parseTripTime(right.time));
}

function pointAt(points, time) {
  return points.find((point) => point.time === time) ?? null;
}

function requestedNowPoint(request, time) {
  const current = request.weather?.current;
  if (time !== request.requestedAt || !current || typeof current !== 'object') return null;
  if (parseTripTime(current.time) === null || !finiteNumber(current.airTempC)) return null;
  return current;
}

function weatherPointAt(request, points, time) {
  return requestedNowPoint(request, time) ?? pointAt(points, time);
}

function firstForecastGap(points, startTime, endTime) {
  const startMs = parseTripTime(startTime);
  const endMs = parseTripTime(endTime);
  if (startMs === null || endMs === null || endMs <= startMs) return null;
  const future = points.filter((point) => parseTripTime(point.time) > startMs);
  if (!future.length) return { startMs, endMs };

  let previousMs = startMs;
  for (const point of future) {
    const currentMs = parseTripTime(point.time);
    if (currentMs - previousMs > MAX_WEATHER_STEP_MS) {
      if (previousMs === startMs && endMs - startMs <= MAX_WEATHER_STEP_MS) return { startMs, endMs };
      return { startMs:previousMs + MAX_WEATHER_STEP_MS, endMs:Math.min(currentMs, endMs) };
    }
    if (currentMs >= endMs) return null;
    previousMs = currentMs;
  }
  if (endMs - previousMs > MAX_WEATHER_STEP_MS) {
    return { startMs:previousMs + MAX_WEATHER_STEP_MS, endMs };
  }
  return null;
}

function weatherSlice(weather, currentPoint, checkpointStartTime, checkpointEndTime) {
  const startMs = parseTripTime(checkpointStartTime);
  const endMs = parseTripTime(checkpointEndTime);
  const hourly = (Array.isArray(weather.hourly) ? weather.hourly : [])
    .filter((point) => point && parseTripTime(point.time) !== null && finiteNumber(point.airTempC))
    .filter((point) => {
      const time = parseTripTime(point.time);
      return time > startMs && time < endMs;
    })
    .sort((left, right) => parseTripTime(left.time) - parseTripTime(right.time))
    .map(cloneTripValue);
  return {
    ...cloneTripValue(weather),
    current:cloneTripValue(currentPoint),
    hourly
  };
}

function normalizedContext(context, startTime, endTime) {
  const normalized = cloneTripValue(context);
  delete normalized.plannedMinutes;
  if (['outdoor', 'stroller', 'carrier', 'car'].includes(normalized.mode)) {
    normalized.plannedMinutes = minutesBetween(startTime, endTime);
  }
  return normalized;
}

function buildCheckpoint({ request, segment, startTime, endTime, weatherPoint }) {
  const context = normalizedContext(segment.context, startTime, endTime);
  const derivedWeather = weatherPoint ? weatherSlice(request.weather, weatherPoint, startTime, endTime) : null;
  const checkpointId = `trip-checkpoint:${segment.segmentId}:${startTime}`;
  return {
    checkpointId,
    segmentId:segment.segmentId,
    startTime,
    endTime,
    weatherPointTime:weatherPoint?.time ?? null,
    engineRequest:{
      requestId:`${request.requestId}:${checkpointId}`,
      requestedAt:request.requestedAt,
      profile:cloneTripValue(request.profile),
      context,
      weather:derivedWeather
    },
    recommendation:null
  };
}

function checkpointCoverageEnd(segment, checkpointStartTime, checkpointEndTime) {
  if (segment.context.mode !== 'car' || segment.context.includeOutdoorTransition !== true) return checkpointEndTime;
  const transitionMinutes = finiteNumber(segment.context.outsideTransitionMinutes)
    ? Math.max(0, segment.context.outsideTransitionMinutes)
    : minutesBetween(checkpointStartTime, checkpointEndTime);
  return new Date(parseTripTime(checkpointStartTime) + transitionMinutes * 60000).toISOString();
}

export function prepareTripCheckpoints(request) {
  const points = usableWeatherPoints(request.weather);
  const checkpoints = [];
  const issues = [];
  let haltAfterCheckpointId = null;

  for (const segment of request.plan.segments) {
    if (['indoor', 'sleep'].includes(segment.context.mode) && !finiteNumber(segment.context.roomTempC)) {
      issues.push(coverageIssue(segment.startTime, segment.endTime, 'missing_room_temperature', segment.segmentId));
      break;
    }

    const needsWeather = weatherRequiredAtSegmentStart(segment.context);
    if (needsWeather && !request.weather) {
      issues.push(coverageIssue(segment.startTime, segment.endTime, 'weather_unavailable', segment.segmentId));
      break;
    }

    const startPoint = needsWeather ? weatherPointAt(request, points, segment.startTime) : null;
    if (needsWeather && !startPoint) {
      issues.push(coverageIssue(segment.startTime, segment.endTime, 'missing_thermal_forecast', segment.segmentId));
      break;
    }

    const checkpointTimes = [segment.startTime];
    if (WEATHER_HOURLY_MODES.has(segment.context.mode)) {
      for (const point of points) {
        const pointMs = parseTripTime(point.time);
        if (pointMs > parseTripTime(segment.startTime) && pointMs < parseTripTime(segment.endTime)) checkpointTimes.push(point.time);
      }
    }

    for (let index = 0; index < checkpointTimes.length; index += 1) {
      const startTime = checkpointTimes[index];
      const endTime = checkpointTimes[index + 1] ?? segment.endTime;
      const weatherPoint = needsWeather ? weatherPointAt(request, points, startTime) : null;
      if (needsWeather && !weatherPoint) {
        issues.push(coverageIssue(startTime, endTime, 'missing_thermal_forecast', segment.segmentId));
        break;
      }

      const checkpoint = buildCheckpoint({ request, segment, startTime, endTime, weatherPoint });
      checkpoints.push(checkpoint);

      if (needsWeather) {
        const coverageEnd = checkpointCoverageEnd(segment, startTime, endTime);
        const gap = firstForecastGap(points, startTime, coverageEnd);
        if (gap) {
          issues.push(coverageIssue(new Date(gap.startMs).toISOString(), new Date(gap.endMs).toISOString(), 'forecast_gap', segment.segmentId));
          haltAfterCheckpointId = checkpoint.checkpointId;
          break;
        }
      }
    }
    if (issues.length) break;
  }

  return { checkpoints, issues, haltAfterCheckpointId };
}
