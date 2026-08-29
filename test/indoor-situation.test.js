import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession, recommendOutfit } from '../src/index.js';

const profile = {
  profileId:'baby_test',
  displayName:'Baby',
  birthDate:'2026-01-24',
  warmthBias:'neutral',
  styleTheme:'neutral',
  defaultMode:'indoor',
  createdAt:'2026-08-29T10:00:00.000Z',
  updatedAt:'2026-08-29T10:00:00.000Z'
};

function request(context) {
  return {
    requestId:'indoor_test',
    requestedAt:'2026-08-29T10:00:00.000Z',
    profile,
    context,
    weather:null,
    session:createSession('indoor_session'),
    neckFeedback:null
  };
}

const selected = (result, slot) => result.slots.find((entry) => entry.phase === 'main' && entry.slot === slot)?.selected.itemId ?? null;

test('indoor recommendation uses room temperature without outdoor weather', () => {
  const result = recommendOutfit(request({ mode:'indoor', roomTempC:20, activity:'normal', activitySource:'user' }));
  assert.equal(result.status, 'ready');
  assert.equal(result.mode, 'indoor');
  assert.equal(result.phases[0].thermalReferenceC, 20);
  assert.equal(result.phases[0].thermalReferenceSource, 'room_temp');
  assert.equal(result.dataQuality.weatherFreshness, null);
  assert.equal(result.dataQuality.usedManualWeather, false);
  assert.equal(selected(result, 'outer'), null);
  assert.equal(selected(result, 'head'), null);
  assert.equal(selected(result, 'hands'), null);
});

test('very active indoor baby is evaluated lighter than normal', () => {
  const normal = recommendOutfit(request({ mode:'indoor', roomTempC:20, activity:'normal', activitySource:'user' }));
  const active = recommendOutfit(request({ mode:'indoor', roomTempC:20, activity:'active', activitySource:'user' }));
  assert.equal(normal.phases[0].thermalAdjustment, 0);
  assert.equal(active.phases[0].thermalAdjustment, -1);
  assert.notDeepEqual(normal.items, active.items);
});

test('missing indoor room temperature blocks instead of using outside weather', () => {
  const result = recommendOutfit(request({ mode:'indoor', roomTempC:null, activity:'normal', activitySource:'user' }));
  assert.equal(result.status, 'blocked');
  assert.deepEqual(result.dataQuality.missingFields, ['context.roomTempC']);
  assert.equal(result.phases[0].thermalReferenceSource, null);
});
