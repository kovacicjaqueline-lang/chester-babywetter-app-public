const MODES = new Set(['outdoor', 'stroller', 'carrier', 'car', 'sleep']);
const STYLES = new Set(['neutral', 'boy', 'girl']);
const BIASES = new Set(['runs_cool', 'neutral', 'runs_warm']);
const FEEDBACK = new Set(['warm_dry', 'hot_sweaty', 'cool']);
const FEEDBACK_ACTIONS = new Set(['keep', 'reduce_insulation', 'increase_insulation']);

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

function isoTimestamp(value, field) {
  requiredString(value, field);
  if (!Number.isFinite(Date.parse(value))) throw new TypeError(`${field} is invalid`);
  return value;
}

function birthDateValue(value, now) {
  if (value === null) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new TypeError('profile.birthDate is invalid');
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) throw new TypeError('profile.birthDate is invalid');
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (date > today) throw new RangeError('profile.birthDate cannot be in the future');
  let ageMonths = (today.getUTCFullYear() - year) * 12 + (today.getUTCMonth() - (month - 1));
  if (today.getUTCDate() < day) ageMonths -= 1;
  if (ageMonths > 24) throw new RangeError('profile.birthDate is outside the V1 age range');
  return value;
}

function validateProfile(value, now) {
  if (!isObject(value)) throw new TypeError('payload.profile is required');
  return {
    profileId: requiredString(value.profileId, 'profile.profileId', { max: 100 }),
    displayName: nullableString(value.displayName, 'profile.displayName', { max: 40 }),
    birthDate: birthDateValue(value.birthDate, now),
    warmthBias: enumValue(value.warmthBias, BIASES, 'profile.warmthBias'),
    styleTheme: enumValue(value.styleTheme, STYLES, 'profile.styleTheme'),
    defaultMode: enumValue(value.defaultMode, MODES, 'profile.defaultMode'),
    createdAt: isoTimestamp(value.createdAt, 'profile.createdAt'),
    updatedAt: isoTimestamp(value.updatedAt, 'profile.updatedAt')
  };
}

function validateSettings(value) {
  if (!isObject(value)) throw new TypeError('payload.settings is required');
  const cacheAge = value.weatherCacheMaxAgeMinutes;
  if (cacheAge !== null && (!Number.isFinite(cacheAge) || cacheAge < 0)) throw new RangeError('settings.weatherCacheMaxAgeMinutes is invalid');
  if (value.allowLocation !== null && typeof value.allowLocation !== 'boolean') throw new TypeError('settings.allowLocation is invalid');
  if (value.temperatureUnit !== 'celsius') throw new TypeError('settings.temperatureUnit is invalid');
  if (value.weatherMode !== 'auto_with_override') throw new TypeError('settings.weatherMode is invalid');
  return {
    defaultMode: enumValue(value.defaultMode, MODES, 'settings.defaultMode'),
    temperatureUnit: 'celsius',
    weatherMode: 'auto_with_override',
    allowLocation: value.allowLocation,
    weatherCacheMaxAgeMinutes: cacheAge
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

  return {
    schemaVersion: 1,
    exportedAt: typeof value.exportedAt === 'string' && Number.isFinite(Date.parse(value.exportedAt)) ? value.exportedAt : null,
    appVersion: typeof value.appVersion === 'string' ? value.appVersion : null,
    payload: {
      profile: validateProfile(value.payload.profile, current),
      settings: validateSettings(value.payload.settings),
      feedback: value.payload.feedback.map(validateFeedbackEntry)
    }
  };
}
