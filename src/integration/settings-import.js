import { WEATHER_CACHE_MAX_AGE_MINUTES, WEATHER_FRESH_MAX_AGE_MINUTES } from './weather-series.js';

const MODES = new Set(['outdoor', 'stroller', 'carrier', 'car', 'indoor', 'sleep']);
const STYLES = new Set(['neutral', 'boy', 'girl']);
const BIASES = new Set(['runs_cool', 'neutral', 'runs_warm']);
const MOBILITY_STAGES = new Set(['low_mobility', 'crawling', 'walking']);
const FEEDBACK = new Set(['warm_dry', 'hot_sweaty', 'cool']);
const FEEDBACK_ACTIONS = new Set(['keep', 'reduce_insulation', 'increase_insulation']);
const ISO_INSTANT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$/;

function isObject(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function requiredString(value, field, { max = 200 } = {}) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new TypeError(`${field} is invalid`);
  return value;
}

function nullableString(value, field, { max = 200 } = {}) {
  if (value === null) return null;
  if (typeof value !== 'string' || value.length > max) throw new TypeError(`${field} is invalid`);
  return value;
}

function enumValue(value, allowed, field) {
  if (!allowed.has(value)) throw new TypeError(`${field} is invalid`);
  return value;
}

function isValidCalendarDate(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function isoTimestamp(value, field) {
  requiredString(value, field);
  const match = ISO_INSTANT.exec(value);
  if (!match) throw new TypeError(`${field} is invalid`);
  const [, yearText, monthText, dayText] = match;
  if (!isValidCalendarDate(Number(yearText), Number(monthText), Number(dayText)) || !Number.isFinite(Date.parse(value))) {
    throw new TypeError(`${field} is invalid`);
  }
  return value;
}

function birthDateValue(value, now) {
  if (value === null) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new TypeError('profile.birthDate is invalid');
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (!isValidCalendarDate(year, month, day)) throw new TypeError('profile.birthDate is invalid');
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (date > today) throw new RangeError('profile.birthDate cannot be in the future');
  let ageMonths = (today.getUTCFullYear() - year) * 12 + (today.getUTCMonth() - (month - 1));
  if (today.getUTCDate() < day) ageMonths -= 1;
  if (ageMonths > 24) throw new RangeError('profile.birthDate is outside the V1 age range');
  return value;
}

function validateProfile(value, now) {
  if (value === null) return null;
  if (!isObject(value)) throw new TypeError('payload.profile is invalid');
  return {
    profileId: requiredString(value.profileId, 'profile.profileId', { max: 100 }),
    displayName: nullableString(value.displayName, 'profile.displayName', { max: 40 }),
    birthDate: birthDateValue(value.birthDate, now),
    mobilityStage: value.mobilityStage === undefined
      ? 'low_mobility'
      : enumValue(value.mobilityStage, MOBILITY_STAGES, 'profile.mobilityStage'),
    warmthBias: enumValue(value.warmthBias, BIASES, 'profile.warmthBias'),
    styleTheme: enumValue(value.styleTheme, STYLES, 'profile.styleTheme'),
    defaultMode: enumValue(value.defaultMode, MODES, 'profile.defaultMode'),
    createdAt: isoTimestamp(value.createdAt, 'profile.createdAt'),
    updatedAt: isoTimestamp(value.updatedAt, 'profile.updatedAt')
  };
}

function weatherCacheMaxAge(value) {
  if (value === null) return WEATHER_CACHE_MAX_AGE_MINUTES;
  if (!Number.isFinite(value)) throw new RangeError('settings.weatherCacheMaxAgeMinutes is invalid');
  return Math.min(WEATHER_CACHE_MAX_AGE_MINUTES, Math.max(WEATHER_FRESH_MAX_AGE_MINUTES, Math.round(value)));
}

function validateSettings(value) {
  if (!isObject(value)) throw new TypeError('payload.settings is required');
  if (value.allowLocation !== null && typeof value.allowLocation !== 'boolean') throw new TypeError('settings.allowLocation is invalid');
  if (value.temperatureUnit !== 'celsius') throw new TypeError('settings.temperatureUnit is invalid');
  if (value.weatherMode !== 'auto_with_override') throw new TypeError('settings.weatherMode is invalid');
  return {
    defaultMode: enumValue(value.defaultMode, MODES, 'settings.defaultMode'),
    temperatureUnit: 'celsius',
    weatherMode: 'auto_with_override',
    allowLocation: value.allowLocation,
    weatherCacheMaxAgeMinutes: weatherCacheMaxAge(value.weatherCacheMaxAgeMinutes)
  };
}

function validateFeedbackEntry(value, index) {
  if (!isObject(value)) throw new TypeError(`feedback[${index}] is invalid`);
  return {
    feedbackId: requiredString(value.feedbackId, `feedback[${index}].feedbackId`, { max: 120 }),
    profileId: requiredString(value.profileId, `feedback[${index}].profileId`, { max: 100 }),
    recommendationId: requiredString(value.recommendationId, `feedback[${index}].recommendationId`, { max: 160 }),
    recordedAt: isoTimestamp(value.recordedAt, `feedback[${index}].recordedAt`),
    feedback: enumValue(value.feedback, FEEDBACK, `feedback[${index}].feedback`),
    mode: enumValue(value.mode, MODES, `feedback[${index}].mode`),
    resultingAction: enumValue(value.resultingAction, FEEDBACK_ACTIONS, `feedback[${index}].resultingAction`)
  };
}

export function validateImportEnvelopeV1(value, { now = () => new Date() } = {}) {
  if (!isObject(value)) throw new TypeError('Import envelope is invalid');
  if (value.schemaVersion !== 1) throw new RangeError('Unsupported schemaVersion');
  if (!isObject(value.payload)) throw new TypeError('payload is required');
  if (!Array.isArray(value.payload.feedback)) throw new TypeError('payload.feedback must be an array');
  const current = now();
  if (!(current instanceof Date) || !Number.isFinite(current.getTime())) throw new TypeError('now must return a valid Date');
  const appVersion = value.appVersion === undefined ? undefined : requiredString(value.appVersion, 'appVersion', { max: 40 });
  const envelope = {
    schemaVersion: 1,
    exportedAt: isoTimestamp(value.exportedAt, 'exportedAt'),
    payload: {
      profile: validateProfile(value.payload.profile, current),
      settings: validateSettings(value.payload.settings),
      feedback: value.payload.feedback.map(validateFeedbackEntry)
    }
  };
  if (appVersion !== undefined) envelope.appVersion = appVersion;
  return envelope;
}
