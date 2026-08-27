import test from 'node:test';
import assert from 'node:assert/strict';
import {
  V1_ESTIMATED_CABIN_TEMP_C,
  estimateCabinTemperature,
  withEstimatedCabinTemperature
} from '../../src/integration/cabin-temperature.js';

test('V1 cabin estimate is the neutral 20 C climate-controlled assumption', () => {
  assert.equal(V1_ESTIMATED_CABIN_TEMP_C, 20);
  assert.deepEqual(estimateCabinTemperature(), {
    cabinTempC: 20,
    cabinTempSource: 'estimated'
  });
});

test('cabin estimate returns fresh values without hidden mutable state', () => {
  const first = estimateCabinTemperature();
  first.cabinTempC = 7;
  assert.deepEqual(estimateCabinTemperature(), {
    cabinTempC: 20,
    cabinTempSource: 'estimated'
  });
});

test('estimated cabin policy preserves car context and replaces only cabin temperature fields', () => {
  const context = {
    mode: 'car',
    plannedMinutes: 45,
    includeOutdoorTransition: true,
    outsideTransitionMinutes: 8,
    cabinTempC: -4,
    cabinTempSource: 'manual'
  };

  assert.deepEqual(withEstimatedCabinTemperature(context), {
    ...context,
    cabinTempC: 20,
    cabinTempSource: 'estimated'
  });
  assert.equal(context.cabinTempC, -4);
  assert.equal(context.cabinTempSource, 'manual');
});

test('estimated cabin helper is restricted to car integration contexts', () => {
  assert.throws(() => withEstimatedCabinTemperature(null), /car context is required/);
  assert.throws(() => withEstimatedCabinTemperature({ mode: 'outdoor' }), /requires car mode/);
});
