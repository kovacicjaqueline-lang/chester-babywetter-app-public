import test from 'node:test';
import assert from 'node:assert/strict';
import { validateImportEnvelopeV1 } from '../src/integration/settings-import.js';

const NOW = () => new Date('2026-08-27T12:00:00.000Z');

function validEnvelope() {
  return {
    schemaVersion: 1,
    exportedAt: '2026-08-27T10:00:00.000Z',
    appVersion: '0.2.0',
    payload: {
      profile: {
        profileId: 'baby_local',
        displayName: 'Baby',
        birthDate: '2026-01-24',
        warmthBias: 'neutral',
        styleTheme: 'neutral',
        defaultMode: 'stroller',
        createdAt: '2026-01-24T08:00:00.000Z',
        updatedAt: '2026-08-27T10:00:00.000Z'
      },
      settings: {
        defaultMode: 'stroller',
        temperatureUnit: 'celsius',
        weatherMode: 'auto_with_override',
        allowLocation: null,
        weatherCacheMaxAgeMinutes: null
      },
      feedback: []
    }
  };
}

test('valid V1 import is returned as an explicit sanitized payload', () => {
  const input = validEnvelope();
  input.payload.profile.injected = 'drop me';
  input.payload.settings.injected = 'drop me';
  const result = validateImportEnvelopeV1(input, { now: NOW });
  assert.equal(result.schemaVersion, 1);
  assert.equal(result.payload.profile.birthDate, '2026-01-24');
  assert.equal(result.payload.settings.weatherMode, 'auto_with_override');
  assert.equal('injected' in result.payload.profile, false);
  assert.equal('injected' in result.payload.settings, false);
});

test('known feedback events are validated and sanitized', () => {
  const input = validEnvelope();
  input.payload.feedback.push({
    feedbackId: 'feedback_1', profileId: 'baby_local', recommendationId: 'recommendation_1',
    recordedAt: '2026-08-27T10:30:00.000Z', feedback: 'cool', mode: 'outdoor',
    resultingAction: 'increase_insulation', injected: true
  });
  const result = validateImportEnvelopeV1(input, { now: NOW });
  assert.deepEqual(result.payload.feedback[0], {
    feedbackId: 'feedback_1', profileId: 'baby_local', recommendationId: 'recommendation_1',
    recordedAt: '2026-08-27T10:30:00.000Z', feedback: 'cool', mode: 'outdoor',
    resultingAction: 'increase_insulation'
  });
});

test('unsupported schema and unknown enums are rejected', () => {
  const schema = validEnvelope(); schema.schemaVersion = 2;
  assert.throws(() => validateImportEnvelopeV1(schema, { now: NOW }), RangeError);
  const style = validEnvelope(); style.payload.profile.styleTheme = 'pink';
  assert.throws(() => validateImportEnvelopeV1(style, { now: NOW }), TypeError);
  const mode = validEnvelope(); mode.payload.settings.defaultMode = 'crib';
  assert.throws(() => validateImportEnvelopeV1(mode, { now: NOW }), TypeError);
});

test('future, impossible and outside-V1 birth dates are rejected', () => {
  const future = validEnvelope(); future.payload.profile.birthDate = '2026-08-28';
  assert.throws(() => validateImportEnvelopeV1(future, { now: NOW }), RangeError);
  const impossible = validEnvelope(); impossible.payload.profile.birthDate = '2026-02-31';
  assert.throws(() => validateImportEnvelopeV1(impossible, { now: NOW }), TypeError);
  const tooOld = validEnvelope(); tooOld.payload.profile.birthDate = '2024-07-01';
  assert.throws(() => validateImportEnvelopeV1(tooOld, { now: NOW }), RangeError);
});

test('non-finite/negative settings values and malformed timestamps are rejected', () => {
  const cacheAge = validEnvelope(); cacheAge.payload.settings.weatherCacheMaxAgeMinutes = -1;
  assert.throws(() => validateImportEnvelopeV1(cacheAge, { now: NOW }), RangeError);
  const timestamp = validEnvelope(); timestamp.payload.profile.updatedAt = 'yesterday';
  assert.throws(() => validateImportEnvelopeV1(timestamp, { now: NOW }), TypeError);
  const envelopeTime = validEnvelope(); envelopeTime.exportedAt = 'not-a-date';
  assert.throws(() => validateImportEnvelopeV1(envelopeTime, { now: NOW }), TypeError);
  const impossibleTime = validEnvelope(); impossibleTime.exportedAt = '2026-02-30T10:00:00.000Z';
  assert.throws(() => validateImportEnvelopeV1(impossibleTime, { now: NOW }), TypeError);
  const feedback = validEnvelope(); feedback.payload.feedback = [{}];
  assert.throws(() => validateImportEnvelopeV1(feedback, { now: NOW }), TypeError);
});
