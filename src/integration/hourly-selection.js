const WEATHER_MODES = new Set(['outdoor', 'stroller', 'carrier', 'car']);
const OUTDOOR_DURATION_MODES = new Set(['outdoor', 'stroller', 'carrier']);
const DEFAULT_OPTION_LIMIT = 12;

let selectedStartTime = null;
let weatherIdentity = null;
let snapshot = Object.freeze({ mode: null, selectedTime: null, options: [] });

function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function parseTime(value) {
  const parsed = typeof value === 'string' ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function clone(value) {
  return structuredClone(value);
}

function validForecastPoint(point) {
  return Boolean(point && typeof point === 'object' && parseTime(point.time) !== null && finiteNumber(point.airTempC));
}

function identityFor(weather) {
  if (!weather || typeof weather !== 'object') return null;
  return [weather.weatherId ?? '', weather.fetchedAt ?? '', weather.location?.locationId ?? weather.location?.label ?? ''].join('|');
}

function optionFromPoint(point, kind) {
  return {
    kind,
    time: kind === 'now' ? null : point.time,
    point: clone(point)
  };
}

export function buildHourlySelectionOptions(weather, requestedAt, { limit = DEFAULT_OPTION_LIMIT } = {}) {
  if (!weather || !validForecastPoint(weather.current)) return [];
  const requestedMs = parseTime(requestedAt);
  if (requestedMs === null) return [optionFromPoint(weather.current, 'now')];
  const future = (Array.isArray(weather.hourly) ? weather.hourly : [])
    .filter(validForecastPoint)
    .filter((point) => parseTime(point.time) > requestedMs)
    .sort((left, right) => parseTime(left.time) - parseTime(right.time))
    .slice(0, Math.max(0, Math.trunc(finiteNumber(limit) ? limit : DEFAULT_OPTION_LIMIT)));
  return [optionFromPoint(weather.current, 'now'), ...future.map((point) => optionFromPoint(point, 'forecast'))];
}

export function setHourlySelectionStart(time) {
  if (time == null || time === '') {
    selectedStartTime = null;
    snapshot = Object.freeze({ ...snapshot, selectedTime: null });
    return true;
  }
  if (typeof time !== 'string') return false;
  const selectable = snapshot.options.some((option) => option.kind === 'forecast' && option.time === time);
  if (!selectable) return false;
  selectedStartTime = time;
  snapshot = Object.freeze({ ...snapshot, selectedTime: time });
  return true;
}

export function resetHourlySelection() {
  selectedStartTime = null;
  weatherIdentity = null;
  snapshot = Object.freeze({ mode: null, selectedTime: null, options: [] });
}

export function getHourlySelectionSnapshot() {
  return clone(snapshot);
}

function restorePlannedDuration(context, weather, requestedAt) {
  const restored = clone(context ?? {});
  if (weather?.freshness !== 'stale') return restored;
  const requestMs = parseTime(requestedAt);
  const currentMs = parseTime(weather.current?.time);
  if (requestMs === null || currentMs === null || requestMs <= currentMs) return restored;
  const lagMinutes = (requestMs - currentMs) / 60000;

  if (OUTDOOR_DURATION_MODES.has(restored.mode) && finiteNumber(restored.plannedMinutes)) {
    restored.plannedMinutes = Math.max(0, restored.plannedMinutes - lagMinutes);
  } else if (restored.mode === 'car' && restored.includeOutdoorTransition && finiteNumber(restored.outsideTransitionMinutes)) {
    restored.outsideTransitionMinutes = Math.max(0, restored.outsideTransitionMinutes - lagMinutes);
  }
  return restored;
}

function projectWeatherFromSelectedPoint(weather, selectedTime) {
  const selectedMs = parseTime(selectedTime);
  if (selectedMs === null) return null;
  const selectedPoint = (weather.hourly ?? []).find((point) => validForecastPoint(point) && point.time === selectedTime);
  if (!selectedPoint) return null;
  const hourly = (weather.hourly ?? [])
    .filter(validForecastPoint)
    .filter((point) => parseTime(point.time) > selectedMs)
    .sort((left, right) => parseTime(left.time) - parseTime(right.time))
    .map(clone);
  return {
    ...clone(weather),
    current: clone(selectedPoint),
    hourly
  };
}

export function prepareRequestForHourlySelection(request) {
  if (!request || typeof request !== 'object') return request;
  const mode = request.context?.mode ?? null;
  if (!WEATHER_MODES.has(mode)) {
    snapshot = Object.freeze({ ...snapshot, mode });
    return request;
  }

  const weather = request.weather;
  if (!weather || !validForecastPoint(weather.current)) {
    selectedStartTime = null;
    weatherIdentity = null;
    snapshot = Object.freeze({ mode, selectedTime: null, options: [] });
    return request;
  }

  const identity = identityFor(weather);
  if (identity !== weatherIdentity) {
    weatherIdentity = identity;
    selectedStartTime = null;
  }

  const options = buildHourlySelectionOptions(weather, request.requestedAt);
  const stillSelectable = selectedStartTime == null || options.some((option) => option.time === selectedStartTime);
  if (!stillSelectable) selectedStartTime = null;
  snapshot = Object.freeze({ mode, selectedTime: selectedStartTime, options });

  if (!selectedStartTime) return request;
  const projectedWeather = projectWeatherFromSelectedPoint(weather, selectedStartTime);
  if (!projectedWeather) {
    selectedStartTime = null;
    snapshot = Object.freeze({ mode, selectedTime: null, options });
    return request;
  }

  return {
    ...request,
    context: restorePlannedDuration(request.context, weather, request.requestedAt),
    weather: projectedWeather
  };
}
