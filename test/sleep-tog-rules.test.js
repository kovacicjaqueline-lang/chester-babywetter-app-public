import test from 'node:test';
import assert from 'node:assert/strict';
import { CLOTHING_CATALOG, GENERIC_TOG_TABLE, SLEEP_BAG_IDS, createSession, genericTogGuidanceForRoomTemp, lockItem, recommendOutfit, setWarmthOffset } from '../src/index.js';

const profile={profileId:'p',displayName:null,birthDate:'2026-01-24',warmthBias:'neutral',styleTheme:'neutral',defaultMode:'sleep',createdAt:'x',updatedAt:'x'};
const req=(roomTempC,session=createSession('sleep'),extra={})=>({requestId:'sleep_req',requestedAt:'2026-08-25T20:00:00Z',profile:{...profile,...(extra.profile??{})},context:{mode:'sleep',roomTempC},weather:extra.weather??null,session,neckFeedback:extra.neckFeedback??null});
const id=(r,slot)=>r.slots.find(s=>s.slot===slot)?.selected.itemId;
const notices=(r)=>r.notices.map(n=>n.code);

function assertNoLooseSleepBedding(result) {
  assert.ok(result.slots.every((slotResult) => ['sleep_bag','sleep_underlayer'].includes(slotResult.slot)));
  assert.ok(result.slots.every((slotResult) => CLOTHING_CATALOG[slotResult.selected.itemId]?.sleepSafe));
  assert.ok(!result.slots.some((slotResult) => {
    const definition = CLOTHING_CATALOG[slotResult.selected.itemId];
    return definition?.category === 'blanket' || /(?:blanket|bedding|duvet|pillow)/.test(slotResult.selected.itemId);
  }));
  const safetyNotice = result.notices.find((notice) => notice.code === 'SLEEP_NO_LOOSE_BEDDING');
  assert.ok(safetyNotice);
  assert.ok(safetyNotice.reasonCodes.includes('SAFE_SLEEP_NO_LOOSE_BEDDING'));
  assert.ok(!result.notices.some((notice) => notice.code === 'SLEEP_NO_LOOSE_BLANKET_OVER_BAG'));
}

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

test('sleep never recommends loose bedding or a hat and emits broad safety semantics',()=>{
  const r=recommendOutfit(req(16));
  assertNoLooseSleepBedding(r);
  assert.ok(!r.slots.some(s=>s.slot==='head'));
  assert.ok(notices(r).includes('SLEEP_NO_HAT'));
  assert.ok(notices(r).includes('SLEEP_NO_WEIGHTED_PRODUCTS'));
});

test('sleep_bag_none stays free of loose bedding for every selection path',()=>{
  const fromGuidance=recommendOutfit(req(28));

  const bagLock=lockItem(createSession('none-lock'),{slot:'sleep_bag',itemId:'sleep_bag_none'});
  const fromBagLock=recommendOutfit(req(19,bagLock));

  const underlayerLock=lockItem(createSession('underlayer-lock'),{slot:'sleep_underlayer',itemId:'sleep_under_long_body_plus_light_pajamas'});
  const fromUnderlayerRebalance=recommendOutfit(req(25,underlayerLock));

  for (const result of [fromGuidance,fromBagLock,fromUnderlayerRebalance]) {
    assert.equal(id(result,'sleep_bag'),'sleep_bag_none');
    assertNoLooseSleepBedding(result);
  }

  const noneBag=fromGuidance.slots.find((slotResult)=>slotResult.slot==='sleep_bag');
  assert.ok(noneBag.alternatives.every((alternative)=>
    alternative.projectedChanges.every((change)=>
      !/(?:blanket|bedding|duvet|pillow)/.test(`${change.fromItemId ?? ''} ${change.toItemId ?? ''}`)
    )
  ));
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
