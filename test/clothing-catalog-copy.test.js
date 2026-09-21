import test from 'node:test';
import assert from 'node:assert/strict';
import { CLOTHING_CATALOG } from '../src/clothing-catalog.js';

test('every clothing catalog item has one user-facing label and definition',()=>{
  for (const definition of Object.values(CLOTHING_CATALOG)) {
    assert.ok(definition.label, `${definition.itemId} has no label`);
    assert.ok(definition.description, `${definition.itemId} has no description`);
  }
});

test('core clothing definitions use literal language',()=>{
  assert.match(CLOTHING_CATALOG.thin_sweater.description, /langärmlig/i);
  assert.match(CLOTHING_CATALOG.warm_trousers.description, /dicker|gefüttert/i);
  assert.match(CLOTHING_CATALOG.light_transition_jacket.description, /leichte Außenschicht/i);
});
