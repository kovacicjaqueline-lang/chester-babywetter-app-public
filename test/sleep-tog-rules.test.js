import test from 'node:test';
import assert from 'node:assert/strict';
import { CLOTHING_CATALOG, GENERIC_TOG_TABLE, SLEEP_BAG_IDS, createSession, genericTogGuidanceForRoomTemp, lockItem, recommendOutfit, setWarmthOffset } from '../src/index.js';

const profile={profileId:'p',displayName:null,birthDate:'2026-01-24',warmthBias:'neutral',styleTheme:'neutral',defaultMode:'sleep',createdAt:'x',updatedAt:'x'};
const req=(roomTempC,session=createSession('sleep'),extra={})=>({requestId:'sleep_req',requestedAt:'2026-08-25T20:00:00Z',profile:{...profile,...(extra.profile??{})},context:{mode:'sleep',roomTempC},weather:extra.weather??null,session,neckFeedback:extra.neckFeedback??null});
const id=(r,slot)=>r.slots.find(s=>s.slot===slot)?.selected.itemId;
const notices=(r)=>r.notices.map(n=>n.code);

test('generic V1 TOG orientation has calibrated bands',()=>{
  assert.equal(genericTogGuidanceForRoomTemp(28).sleepBagId,'sleep_bag_none');
  assert.equal(genericTogGuidanceForRoomTemp(25).sleepBagId,'sleep_bag_0_5');
  assert.equal(genericTogGuidanceForRoomTemp(23).sleepBagId,'sleep_bag_1_0');
  assert.equal(genericTogGuidanceForRoomTemp(21).sleepBagId,'sleep_bag_1_5');
  assert.equal(genericTogGuidanceForRoomTemp(19).sleepBagId,'sleep_bag_2_5');
  assert.equal(genericTogGuidanceForRoomTemp(15).sleepBagId,'sleep_bag_3_5');
  assert.equal(GENERIC_TOG_TABLE.length,7);
});

test('sleep uses room temperature and ignores outside weather',()=>{
  const coldWeather={weatherId:'w',freshness:'fresh',origin:'api',current:{airTempC:-20},hourly:[]};
  const a=recommendOutfit(req(19,createSession('a'),{weather:null}));
  const b=recommendOutfit(req(19,createSession('a'),{weather:coldWeather}));
  assert.deepEqual(a.slots,b.slots);
  assert.equal(a.phases[0].thermalReferenceSource,'room_temp');
});

test('sleep blocks without roomTempC',()=>{
  const r=recommendOutfit(req(null));
  assert.equal(r.status,'blocked');
  assert.ok(r.dataQuality.missingFields.includes('context.roomTempC'));
});

test('all five TOGs plus none are exchangeable alternatives',()=>{
  const r=recommendOutfit(req(19));
  const bag=r.slots.find(s=>s.slot==='sleep_bag');
  const ids=new Set([bag.selected.itemId,...bag.alternatives.map(a=>a.itemId)]);
  assert.deepEqual(new Set(SLEEP_BAG_IDS),ids);
});

test('2.5 TOG to 1.0 TOG lock produces warmer underclothing',()=>{
  const base=recommendOutfit(req(18.5));
  const session=lockItem(createSession('sleep'),{slot:'sleep_bag',itemId:'sleep_bag_1_0'});
  const swapped=recommendOutfit(req(18.5,session));
  assert.equal(id(base,'sleep_bag'),'sleep_bag_2_5');
  assert.equal(id(base,'sleep_underlayer'),'sleep_under_short_sleeve_bodysuit');
  assert.equal(id(swapped,'sleep_bag'),'sleep_bag_1_0');
  assert.ok((CLOTHING_CATALOG[id(swapped,'sleep_underlayer')].sleepWarmthWeight ?? 0) > (CLOTHING_CATALOG[id(base,'sleep_underlayer')].sleepWarmthWeight ?? 0));
});

test('sleep bag lock remains manual and alternatives project underlayer changes',()=>{
  const session=lockItem(createSession('sleep'),{slot:'sleep_bag',itemId:'sleep_bag_1_0'});
  const r=recommendOutfit(req(18.5,session));
  const bag=r.slots.find(s=>s.slot==='sleep_bag');
  assert.equal(bag.selected.selectionSource,'manual_lock');
  assert.ok(bag.alternatives.some(a=>a.projectedChanges.some(c=>c.slot==='sleep_underlayer')));
});

test('sleep never recommends loose blanket or hat and emits safety codes',()=>{
  const r=recommendOutfit(req(16));
  assert.ok(!r.slots.some(s=>['head'].includes(s.slot) || /blanket/.test(s.selected.itemId)));
  assert.ok(notices(r).includes('SLEEP_NO_HAT'));
  assert.ok(notices(r).includes('SLEEP_NO_LOOSE_BLANKET_OVER_BAG'));
  assert.ok(notices(r).includes('SLEEP_NO_WEIGHTED_PRODUCTS'));
});

test('warmer/cooler sleep correction prefers underlayer single-slot change',()=>{
  const base=recommendOutfit(req(18.5));
  const warmer=recommendOutfit(req(18.5,setWarmthOffset(createSession('sleep'),'warmer')));
  const cooler=recommendOutfit(req(18.5,setWarmthOffset(createSession('sleep'),'cooler')));
  assert.equal(id(base,'sleep_bag'),id(warmer,'sleep_bag'));
  assert.equal(id(base,'sleep_bag'),id(cooler,'sleep_bag'));
  assert.notEqual(id(base,'sleep_underlayer'),id(warmer,'sleep_underlayer'));
  assert.notEqual(id(base,'sleep_underlayer'),id(cooler,'sleep_underlayer'));
});

test('legacy personal sleep-bag inventory/manufacturer data is ignored in V1',()=>{
  const legacyProfile={ ...profile, sleepBagInventory:[{sleepBagId:'custom',tog:2.5,manufacturer:'Legacy',guidanceBands:[{minRoomTempC:18,maxRoomTempC:20,recommendedUnderlayers:[]}]}] };
  const a=recommendOutfit(req(19));
  const b=recommendOutfit({ ...req(19), profile:legacyProfile });
  assert.equal(id(a,'sleep_bag'),'sleep_bag_2_5');
  assert.equal(id(b,'sleep_bag'),'sleep_bag_2_5');
  assert.deepEqual(a.slots,b.slots);
});

test('sleep warmth bias and neck feedback remain current-request adjustments only',()=>{
  const r=recommendOutfit(req(19,createSession('s'),{profile:{warmthBias:'runs_cool'},neckFeedback:'cool'}));
  assert.ok(r.phases[0].thermalAdjustment>0);
  assert.equal(profile.warmthBias,'neutral');
});
