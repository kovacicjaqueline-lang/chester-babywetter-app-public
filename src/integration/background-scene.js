const WEATHER_SELECTION_MODES = new Set(['outdoor', 'stroller', 'carrier', 'car']);
const STORM_CODES = new Set([95, 96, 99]);
const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86]);
const FOG_CODES = new Set([45, 48]);

function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function validTime(value) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function numericWeatherCode(value) {
  return finiteNumber(value) ? Math.trunc(value) : null;
}

function hourFromExplicitOffset(value) {
  if (typeof value !== 'string' || !/[+-]\d{2}:?\d{2}$/.test(value)) return null;
  const match = value.match(/T(\d{2}):/);
  return match ? Number(match[1]) : null;
}

export function localSceneHour(time, timezone) {
  if (!validTime(time)) return null;
  if (typeof timezone === 'string' && timezone.trim()) {
    try {
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: timezone,
        hour: '2-digit',
        hourCycle: 'h23'
      }).formatToParts(new Date(time));
      const hour = Number(parts.find((part) => part.type === 'hour')?.value);
      if (Number.isInteger(hour) && hour >= 0 && hour <= 23) return hour;
    } catch {
      // Fall through to an explicit ISO offset when no usable IANA timezone exists.
    }
  }
  const offsetHour = hourFromExplicitOffset(time);
  return Number.isInteger(offsetHour) && offsetHour >= 0 && offsetHour <= 23 ? offsetHour : null;
}

export function sceneTimeOfDay(point, location = null) {
  if (!point || typeof point !== 'object' || !validTime(point.time)) return 'day';
  const hour = localSceneHour(point.time, location?.timezone ?? null);
  if (hour === null) return point.isDay === false ? 'night' : 'day';

  if (hour < 5 || hour >= 21) return 'night';
  if (hour < 10) return point.isDay === false ? 'night' : 'morning';
  if (hour < 16) return point.isDay === false ? 'night' : 'day';
  if (hour < 18) return point.isDay === false ? 'evening' : 'day';
  return 'evening';
}

export function sceneWeatherCondition(point) {
  if (!point || typeof point !== 'object') return 'neutral';
  const code = numericWeatherCode(point.weatherCode);
  if (code !== null) {
    if (STORM_CODES.has(code)) return 'storm';
    if (SNOW_CODES.has(code)) return 'snow';
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
    if (FOG_CODES.has(code)) return 'fog';
    if (code === 0) return 'clear';
    if (code === 1 || code === 2) return 'partlyCloudy';
    if (code === 3) return 'cloudy';
    return 'neutral';
  }

  if (point.precipitationType === 'snow') return 'snow';
  if (point.precipitationType === 'rain' || point.precipitationType === 'sleet') return 'rain';
  if (finiteNumber(point.precipMm) && point.precipMm > 0) return 'rain';
  if (finiteNumber(point.cloudCoverPct)) {
    if (point.cloudCoverPct <= 20) return 'clear';
    if (point.cloudCoverPct < 75) return 'partlyCloudy';
    return 'cloudy';
  }
  return 'neutral';
}

export function resolveScenePoint(weather, selection = null) {
  if (!weather || typeof weather !== 'object') return { point: null, source: 'fallback' };
  const selectedTime = selection?.selectedTime;
  if (WEATHER_SELECTION_MODES.has(selection?.mode) && validTime(selectedTime)) {
    const optionPoint = Array.isArray(selection?.options)
      ? selection.options.find((option) => option?.time === selectedTime)?.point
      : null;
    const hourlyPoint = Array.isArray(weather.hourly)
      ? weather.hourly.find((point) => point?.time === selectedTime)
      : null;
    const selectedPoint = optionPoint ?? hourlyPoint;
    if (selectedPoint && typeof selectedPoint === 'object') return { point: selectedPoint, source: 'selected' };
  }
  return weather.current && typeof weather.current === 'object'
    ? { point: weather.current, source: 'current' }
    : { point: null, source: 'fallback' };
}

export function deriveBackgroundScene({ weather = null, selection = null, location = null } = {}) {
  const resolved = resolveScenePoint(weather, selection);
  if (!resolved.point) {
    return Object.freeze({ timeOfDay: 'day', weather: 'neutral', pointTime: null, source: 'fallback' });
  }
  const sceneLocation = location ?? weather?.location ?? null;
  return Object.freeze({
    timeOfDay: sceneTimeOfDay(resolved.point, sceneLocation),
    weather: sceneWeatherCondition(resolved.point),
    pointTime: validTime(resolved.point.time) ? resolved.point.time : null,
    source: resolved.source
  });
}
