import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CLOTHING_CATALOG, TEMPERATURE_BANDS, createSession, lockItem, recommendOutfit, setWarmthOffset, temperatureBandFor
} from '../src/index.js';

const BASE_PROFILE = Object.freeze({
  profileId:'baby_test', displayName:'Baby', birthDate:'2026-01-24', warmthBias:'neutral', styleTheme:'neutral', defaultMode:'stroller',
  createdAt:'2026-08-25T10:00:00.000Z', updatedAt:'2026-08-25T10:00:00.000Z'
});
const profile = (overrides={}) => ({ ...BASE_PROFILE, ...overrides });
const point = (temp,overrides={}) => ({
  time:'2026-08-25T14:00:00+02:00', airTempC:temp, apparentTempC:null, apparentTempTrusted:false, apparentTempIncludes:[],
  windSpeedKmh:5, windGustKmh:8, precipProbabilityPct:0, precipMm:0, precipitationType:'none', uvIndex:1, cloudCoverPct:20, isDay:true,
  ...overrides
});
function weather(temp, currentOverrides={}, hourly=[]) {
  return {
    weatherId:'weather_test', location:{ locationId:'loc',label:'Testort',latitude:47.8,longitude:13,timezone:'Europe/Vienna' },
    origin:'api', source:'test', fetchedAt:'2026-08-25T12:00:00.000Z', freshness:'fresh', current:point(temp,currentOverrides), hourly
  };
}
const outdoor = (overrides={}) => ({ mode:'outdoor', plannedMinutes:60, activity:'normal', activitySource:'user', sunExposure:'shade', groundContact:'none', ...overrides });
const stroller = (overrides={}) => ({ mode:'stroller', plannedMinutes:60, strollerState:'awake', activity:'normal', activitySource:'user', sunExposure:'shade', windProtection:'none', ...overrides });
const carrier = (overrides={}) => ({ mode:'carrier', plannedMinutes:60, sunExposure:'shade', placement:'over_wearer_outerwear', ...overrides });
const car = (overrides={}) => ({ mode:'car', plannedMinutes:30, includeOutdoorTransition:false, outsideTransitionMinutes:null, cabinTempC:20, cabinTempSource:'manual', ...overrides });
const sleep = (overrides={}) => ({ mode:'sleep', roomTempC:18.5, ...overrides });
function request(context,{ w=context.mode==='sleep'?null:weather(18), p=profile(), session=createSession('session_test'), neckFeedback=null }={}) {
  return { requestId:'req_test', requestedAt:'2026-08-25T12:00:00.000Z', profile:p, context, weather:w, session, neckFeedback };
}
const slot = (result,name,phase='main') => result.slots.find((entry) => entry.phase===phase && entry.slot===name);
const id = (result,name,phase='main') => slot(result,name,phase)?.selected.itemId ?? null;
const notices = (result) => result.notices.map((n) => n.code);
const selectedIds = (result,phase='main') => result.slots.filter((s)=>s.phase===phase).map((s)=>s.selected.itemId);
const changedSlots = (a,b,phase='main') => {
  const am=new Map(a.slots.filter(s=>s.phase===phase).map(s=>[s.slot,s.selected.itemId]));
  const bm=new Map(b.slots.filter(s=>s.phase===phase).map(s=>[s.slot,s.selected.itemId]));
  return [...new Set([...am.keys(),...bm.keys()])].filter(k=>am.get(k)!==bm.get(k));
};

test('engine is deterministic for identical input',()=>{ const r=request(outdoor()); assert.deepEqual(recommendOutfit(r),recommendOutfit(r)); });

test('calibrated temperature bands are exact',()=>{
  const cases=[[-5,'below_0'],[-0.01,'below_0'],[0,'0_to_3'],[2.99,'0_to_3'],[3,'3_to_8'],[8,'8_to_12'],[12,'12_to_16'],[16,'16_to_20'],[20,'20_to_24'],[24,'24_to_28'],[28,'28_to_30'],[30,'30_plus'],[40,'30_plus']];
  for (const [t,expected] of cases) assert.equal(temperatureBandFor(t).id,expected);
  assert.equal(TEMPERATURE_BANDS.length,10);
});

test('trusted apparent temperature is thermal reference and wind is not double-counted',()=>{
  const w=weather(22,{ apparentTempC:17,apparentTempTrusted:true,apparentTempIncludes:['wind','humidity','sun'],windSpeedKmh:35 });
  const r=recommendOutfit(request(outdoor(),{w}));
  assert.equal(r.phases[0].thermalReferenceC,17);
  assert.equal(r.phases[0].thermalReferenceSource,'apparent_temp');
  assert.equal(r.phases[0].thermalAdjustment,0);
});

test('wind protection remains required when apparent temperature already contains wind',()=>{
  const w=weather(22,{ apparentTempC:17,apparentTempTrusted:true,apparentTempIncludes:['wind'],windSpeedKmh:35 });
  const r=recommendOutfit(request(outdoor(),{w}));
  assert.ok((CLOTHING_CATALOG[id(r,'outer')]?.windProtection ?? 0)>=2);
});

test('untrusted apparent temperature falls back to air temperature',()=>{
  const w=weather(22,{ apparentTempC:10,apparentTempTrusted:false,windSpeedKmh:5 });
  const r=recommendOutfit(request(outdoor(),{w}));
  assert.equal(r.phases[0].thermalReferenceC,22);
  assert.equal(r.phases[0].thermalReferenceSource,'air_temp');
});

test('outdoor calm adds +0.5 and active adds -1',()=>{
  const calm=recommendOutfit(request(outdoor({activity:'calm'})));
  const active=recommendOutfit(request(outdoor({activity:'active'})));
  assert.equal(calm.phases[0].thermalAdjustment,0.5);
  assert.equal(active.phases[0].thermalAdjustment,-1);
});

test('stroller does not force activity to passive/calm',()=>{
  const r=recommendOutfit(request(stroller({strollerState:'awake',activity:'active'}),{w:weather(12)}));
  assert.equal(r.phases[0].thermalAdjustment,-0.5);
  assert.equal(id(r,'stroller_thermal_accessory'),'stroller_light_blanket');
});

test('awake active stroller differs from asleep stroller at same weather',()=>{
  const w=weather(12);
  const awake=recommendOutfit(request(stroller({strollerState:'awake',activity:'active'}),{w}));
  const asleep=recommendOutfit(request(stroller({strollerState:'asleep',activity:'active'}),{w}));
  assert.notEqual(id(awake,'stroller_thermal_accessory'),id(asleep,'stroller_thermal_accessory'));
  assert.equal(id(awake,'stroller_thermal_accessory'),'stroller_light_blanket');
  assert.equal(id(asleep,'stroller_thermal_accessory'),'stroller_light_footmuff');
});

test('asleep stroller ignores activity thermally',()=>{
  const w=weather(12);
  const calm=recommendOutfit(request(stroller({strollerState:'asleep',activity:'calm'}),{w}));
  const active=recommendOutfit(request(stroller({strollerState:'asleep',activity:'active'}),{w}));
  assert.deepEqual(selectedIds(calm),selectedIds(active));
});

test('stroller accessories are engine recommendations, not inventory inputs',()=>{
  const r=recommendOutfit(request(stroller(),{w:weather(7)}));
  assert.equal(id(r,'stroller_thermal_accessory'),'stroller_warm_footmuff');
});

test('warm footmuff can replace body insulation',()=>{
  const w=weather(4);
  const r=recommendOutfit(request(stroller({strollerState:'asleep'}),{w}));
  assert.equal(id(r,'stroller_thermal_accessory'),'stroller_warm_footmuff');
  assert.notEqual(id(r,'outer'),'winter_overall');
});

test('warm footmuff to warm blanket swap rebalances body outfit warmer',()=>{
  const w=weather(4);
  const base=recommendOutfit(request(stroller({strollerState:'asleep'}),{w}));
  const session=lockItem(createSession('session_test'),{slot:'stroller_thermal_accessory',itemId:'stroller_warm_blanket'});
  const swapped=recommendOutfit(request(stroller({strollerState:'asleep'}),{w,session}));
  assert.equal(id(base,'stroller_thermal_accessory'),'stroller_warm_footmuff');
  assert.equal(id(swapped,'stroller_thermal_accessory'),'stroller_warm_blanket');
  assert.notDeepEqual(selectedIds(base),selectedIds(swapped));
});

test('manual stroller accessory lock remains in same session',()=>{
  const session=lockItem(createSession('same'),{slot:'stroller_thermal_accessory',itemId:'stroller_light_blanket'});
  const a=recommendOutfit(request(stroller(),{w:weather(7),session}));
  const b=recommendOutfit(request(stroller(),{w:weather(7),session}));
  assert.equal(id(a,'stroller_thermal_accessory'),'stroller_light_blanket');
  assert.equal(slot(b,'stroller_thermal_accessory').selected.selectionSource,'manual_lock');
});

test('thin sweater to fleece lock rebalances outer layer',()=>{
  const w=weather(14);
  const base=recommendOutfit(request(outdoor(),{w}));
  const session=lockItem(createSession('s'),{slot:'mid',itemId:'fleece_jacket'});
  const swapped=recommendOutfit(request(outdoor(),{w,session}));
  assert.equal(id(base,'mid'),'thin_sweater');
  assert.equal(id(swapped,'mid'),'fleece_jacket');
  assert.equal(id(base,'outer'),'softshell_jacket');
  assert.equal(id(swapped,'outer'),'light_transition_jacket');
});

test('alternatives are ordered equivalent then warmer then cooler',()=>{
  const r=recommendOutfit(request(outdoor(),{w:weather(14)}));
  const alternatives=slot(r,'mid').alternatives;
  const order={equivalent:0,warmer:1,cooler:2};
  for(let i=1;i<alternatives.length;i++) assert.ok(order[alternatives[i-1].relation] <= order[alternatives[i].relation]);
});

test('alternative projectedChanges contains whole-outfit rebalancing',()=>{
  const r=recommendOutfit(request(outdoor(),{w:weather(14)}));
  const fleece=slot(r,'mid').alternatives.find(a=>a.itemId==='fleece_jacket');
  assert.ok(fleece.projectedChanges.some(change=>change.slot==='mid'));
  assert.ok(fleece.projectedChanges.some(change=>change.slot==='outer'));
});

test('precip probability below 40 alone adds no rain element',()=>{
  const r=recommendOutfit(request(outdoor(),{w:weather(18,{precipProbabilityPct:39})}));
  assert.notEqual(id(r,'outer'),'rain_jacket');
});

test('precip probability 40-59 is optional only',()=>{
  const r=recommendOutfit(request(outdoor(),{w:weather(18,{precipProbabilityPct:50})}));
  assert.ok(notices(r).includes('RAIN_PROTECTION_OPTIONAL'));
  assert.notEqual(id(r,'outer'),'rain_jacket');
});

test('precip probability >=60 requires rain protection',()=>{
  const r=recommendOutfit(request(outdoor(),{w:weather(18,{precipProbabilityPct:60})}));
  assert.equal(id(r,'outer'),'rain_jacket');
});

test('hourly precipitation within planned window can trigger protection',()=>{
  const hourly=[point(18,{time:'2026-08-25T15:00:00+02:00',precipProbabilityPct:80})];
  const r=recommendOutfit(request(outdoor({plannedMinutes:120}),{w:weather(18,{},hourly)}));
  assert.equal(id(r,'outer'),'rain_jacket');
});

test('stroller rain cover replaces unnecessary baby rain jacket',()=>{
  const r=recommendOutfit(request(stroller(),{w:weather(18,{precipProbabilityPct:70})}));
  assert.equal(id(r,'stroller_weather_accessory'),'stroller_rain_cover');
  assert.notEqual(id(r,'outer'),'rain_jacket');
});

test('removing stroller rain cover requires baby rain jacket',()=>{
  const session=lockItem(createSession('s'),{slot:'stroller_weather_accessory',itemId:'stroller_weather_none'});
  const r=recommendOutfit(request(stroller(),{w:weather(18,{precipProbabilityPct:70}),session}));
  assert.equal(id(r,'stroller_weather_accessory'),'stroller_weather_none');
  assert.equal(id(r,'outer'),'rain_jacket');
});

test('direct sun in stroller prefers sunshade/parasol and airflow warning',()=>{
  const r=recommendOutfit(request(stroller({sunExposure:'direct'}),{w:weather(22,{uvIndex:5})}));
  assert.equal(id(r,'stroller_weather_accessory'),'stroller_sunshade');
  assert.ok(notices(r).includes('STROLLER_SUNSHADE'));
  assert.ok(notices(r).includes('STROLLER_DO_NOT_COVER_AIRFLOW'));
});

test('under-12 direct sun creates avoidance notice',()=>{
  const r=recommendOutfit(request(outdoor({sunExposure:'direct'}),{w:weather(22,{uvIndex:1})}));
  assert.ok(notices(r).includes('INFANT_UNDER_12M_AVOID_DIRECT_SUN'));
});

test('unknown age direct sun uses conservative notice',()=>{
  const r=recommendOutfit(request(outdoor({sunExposure:'direct'}),{w:weather(22,{uvIndex:1}),p:profile({birthDate:null})}));
  assert.ok(notices(r).includes('AGE_UNKNOWN_DIRECT_SUN_CONSERVATIVE_RULE'));
});

test('UV >=3 uses light coverage, not heavy extra insulation in warmth',()=>{
  const r=recommendOutfit(request(outdoor({sunExposure:'direct'}),{w:weather(27,{uvIndex:6})}));
  assert.equal(id(r,'base_torso'),'light_long_sleeve_shirt');
  assert.equal(id(r,'head'),'sun_hat');
  assert.notEqual(id(r,'mid'),'fleece_jacket');
});

test('wind thresholds use calibrated 20/29/39/50 levels',()=>{
  const r20=recommendOutfit(request(outdoor(),{w:weather(22,{windSpeedKmh:20})}));
  const r29=recommendOutfit(request(outdoor(),{w:weather(22,{windSpeedKmh:29})}));
  const r39=recommendOutfit(request(outdoor(),{w:weather(22,{windSpeedKmh:39})}));
  const r50=recommendOutfit(request(outdoor(),{w:weather(22,{windSpeedKmh:50})}));
  assert.equal(r20.phases[0].thermalAdjustment,0.5);
  assert.equal(r29.phases[0].thermalAdjustment,1);
  assert.equal(r39.phases[0].thermalAdjustment,1.5);
  assert.equal(r50.phases[0].thermalAdjustment,2);
  assert.ok(notices(r50).includes('STRONG_WIND_CAUTION'));
});

test('stroller wind protection reduces thermal wind modifier without erasing functional wind',()=>{
  const none=recommendOutfit(request(stroller({windProtection:'none'}),{w:weather(18,{windSpeedKmh:39})}));
  const good=recommendOutfit(request(stroller({windProtection:'good'}),{w:weather(18,{windSpeedKmh:39})}));
  assert.ok(good.phases[0].thermalAdjustment < none.phases[0].thermalAdjustment);
  assert.ok((CLOTHING_CATALOG[id(good,'outer')]?.windProtection ?? CLOTHING_CATALOG[id(good,'stroller_weather_accessory')]?.windProtection ?? 0)>=1);
});

test('carrier body heat reduces torso insulation but retains exposed feet/head protection',()=>{
  const w=weather(10);
  const out=recommendOutfit(request(outdoor(),{w}));
  const carry=recommendOutfit(request(carrier(),{w}));
  assert.notDeepEqual([id(out,'mid'),id(out,'outer')],[id(carry,'mid'),id(carry,'outer')]);
  assert.equal(id(carry,'feet'),'warm_socks_booties');
  assert.equal(id(carry,'head'),'warm_hat');
});

test('carrier under wearer outerwear adds shared warmth credit',()=>{
  const w=weather(14);
  const over=recommendOutfit(request(carrier({placement:'over_wearer_outerwear'}),{w}));
  const under=recommendOutfit(request(carrier({placement:'under_wearer_outerwear'}),{w}));
  assert.ok(under.phases[0].thermalAdjustment <= over.phases[0].thermalAdjustment);
});

test('carrier jacket plus warm cover credit is capped at two steps',()=>{
  const session=lockItem(createSession('s'),{slot:'carrier_accessory',itemId:'carrier_cover_warm'});
  const r=recommendOutfit(request(carrier({placement:'under_wearer_outerwear'}),{w:weather(10),session}));
  assert.ok(r.ruleTrace.some(t=>t.ruleId==='situation.carrier.body_heat' && t.delta===-2));
});

test('estimated cabin temperature is consumed, not calculated, and marked',()=>{
  const r=recommendOutfit(request(car({cabinTempC:21,cabinTempSource:'estimated'}),{w:null}));
  assert.equal(r.status,'ready_with_estimate');
  assert.equal(r.phases[0].thermalReferenceC,21);
  assert.ok(notices(r).includes('CAR_CABIN_TEMPERATURE_ESTIMATED'));
  assert.equal(r.dataQuality.usedEstimatedCabinTemperature,true);
});

test('car blocks if cabin temperature is absent instead of estimating internally',()=>{
  const r=recommendOutfit(request(car({cabinTempC:null}),{w:null}));
  assert.equal(r.status,'blocked');
  assert.ok(r.dataQuality.missingFields.includes('context.cabinTempC'));
});

test('car can emit outdoor_transition and in_car phases',()=>{
  const r=recommendOutfit(request(car({includeOutdoorTransition:true,cabinTempC:20}),{w:weather(5)}));
  assert.ok(r.phases.some(p=>p.phase==='outdoor_transition'));
  assert.ok(r.phases.some(p=>p.phase==='in_car'));
  assert.ok(notices(r).includes('CAR_SEAT_REMOVE_OUTER_BEFORE_HARNESS'));
});

test('winter overall is never under harness',()=>{
  const r=recommendOutfit(request(car({cabinTempC:5}),{w:null}));
  assert.ok(!r.slots.some(s=>s.phase==='in_car' && s.selected.itemId==='winter_overall'));
  assert.ok(!r.slots.some(s=>s.phase==='in_car' && CLOTHING_CATALOG[s.selected.itemId]?.carSeatCompatibility==='prohibited'));
});

test('safety overrides a prohibited manual car lock with structured reason',()=>{
  const session=lockItem(createSession('s'),{phase:'in_car',slot:'outer',itemId:'winter_overall'});
  const r=recommendOutfit(request(car({cabinTempC:8}),{w:null,session}));
  assert.ok(notices(r).includes('MANUAL_LOCK_OVERRIDDEN_FOR_SAFETY'));
  assert.ok(r.ruleTrace.some(t=>t.effect==='override_lock'));
  assert.notEqual(id(r,'outer','in_car'),'winter_overall');
});

test('conditional manual car layer remains with explicit fit warning',()=>{
  const session=lockItem(createSession('s'),{phase:'in_car',slot:'mid',itemId:'fleece_jacket'});
  const r=recommendOutfit(request(car({cabinTempC:10}),{w:null,session}));
  assert.equal(id(r,'mid','in_car'),'fleece_jacket');
  assert.ok(notices(r).includes('CAR_SEAT_CONDITIONAL_LAYER_CHECK_FIT'));
});

test('warmth bias uses +0.5 / 0 / -0.5 and does not learn',()=>{
  const cool=recommendOutfit(request(outdoor(),{p:profile({warmthBias:'runs_cool'})}));
  const neutral=recommendOutfit(request(outdoor(),{p:profile({warmthBias:'neutral'})}));
  const warm=recommendOutfit(request(outdoor(),{p:profile({warmthBias:'runs_warm'})}));
  assert.equal(cool.phases[0].thermalAdjustment,0.5);
  assert.equal(neutral.phases[0].thermalAdjustment,0);
  assert.equal(warm.phases[0].thermalAdjustment,-0.5);
  assert.equal(profile().warmthBias,'neutral');
});

test('hot_sweaty never increases isolation and cool never decreases it',()=>{
  const base=recommendOutfit(request(outdoor()));
  const hot=recommendOutfit(request(outdoor(),{neckFeedback:'hot_sweaty'}));
  const cool=recommendOutfit(request(outdoor(),{neckFeedback:'cool'}));
  assert.ok(hot.phases[0].thermalAdjustment <= base.phases[0].thermalAdjustment);
  assert.ok(cool.phases[0].thermalAdjustment >= base.phases[0].thermalAdjustment);
});

test('neck feedback does not permanently change profile warmth bias',()=>{
  const p=profile(); recommendOutfit(request(outdoor(),{p,neckFeedback:'cool'})); assert.equal(p.warmthBias,'neutral');
});

test('warmer quick correction changes at most one unlocked slot',()=>{
  const base=recommendOutfit(request(outdoor(),{w:weather(18)}));
  const warmer=recommendOutfit(request(outdoor(),{w:weather(18),session:setWarmthOffset(createSession('s'),'warmer')}));
  assert.ok(changedSlots(base,warmer).length<=1);
});

test('cooler quick correction changes at most one unlocked slot',()=>{
  const base=recommendOutfit(request(outdoor(),{w:weather(18)}));
  const cooler=recommendOutfit(request(outdoor(),{w:weather(18),session:setWarmthOffset(createSession('s'),'cooler')}));
  assert.ok(changedSlots(base,cooler).length<=1);
});

test('quick correction respects manual lock',()=>{
  let session=lockItem(createSession('s'),{slot:'mid',itemId:'fleece_jacket'});
  session=setWarmthOffset(session,'cooler');
  const r=recommendOutfit(request(outdoor(),{w:weather(14),session}));
  assert.equal(id(r,'mid'),'fleece_jacket');
});

test('styleTheme does not alter fach item IDs or safety codes',()=>{
  const a=recommendOutfit(request(outdoor(),{p:profile({styleTheme:'neutral'})}));
  const b=recommendOutfit(request(outdoor(),{p:profile({styleTheme:'boy'})}));
  const c=recommendOutfit(request(outdoor(),{p:profile({styleTheme:'girl'})}));
  assert.deepEqual(selectedIds(a),selectedIds(b));
  assert.deepEqual(selectedIds(a),selectedIds(c));
  assert.deepEqual(notices(a),notices(b));
});

test('missing optional weather is partial and is not interpreted as zero',()=>{
  const w=weather(18,{windSpeedKmh:null,windGustKmh:null,precipProbabilityPct:null,precipMm:null,precipitationType:'unknown',uvIndex:null});
  const r=recommendOutfit(request(outdoor(),{w}));
  assert.equal(r.status,'partial');
  assert.ok(notices(r).includes('WEATHER_DATA_INCOMPLETE'));
  assert.ok(r.dataQuality.missingFields.length>=3);
});

test('stale weather stays usable but produces partial status',()=>{
  const w=weather(18); w.freshness='stale';
  const r=recommendOutfit(request(outdoor(),{w}));
  assert.equal(r.status,'partial');
  assert.ok(notices(r).includes('WEATHER_DATA_STALE'));
});

test('groundContact none never adds shoes',()=>{
  const r=recommendOutfit(request(outdoor({groundContact:'none'}),{w:weather(5)}));
  assert.equal(id(r,'footwear'),null);
});

test('standing/walking can add weather-appropriate shoes',()=>{
  const dry=recommendOutfit(request(outdoor({groundContact:'standing'}),{w:weather(20)}));
  const wet=recommendOutfit(request(outdoor({groundContact:'walking'}),{w:weather(20,{precipProbabilityPct:70})}));
  assert.equal(id(dry,'footwear'),'light_shoes');
  assert.equal(id(wet,'footwear'),'weatherproof_shoes');
});

test('cold hands or feet flags alone do not change global recommendation',()=>{
  const base=recommendOutfit(request(outdoor(),{w:weather(18)}));
  const withPeripheralFlags=recommendOutfit({ ...request(outdoor(),{w:weather(18)}), handsCold:true, feetCold:true });
  assert.deepEqual(selectedIds(base),selectedIds(withPeripheralFlags));
});

test('extreme cold, heat and strong wind produce caution codes',()=>{
  assert.ok(notices(recommendOutfit(request(outdoor(),{w:weather(-1)}))).includes('EXTREME_COLD_CAUTION'));
  assert.ok(notices(recommendOutfit(request(outdoor(),{w:weather(30)}))).includes('EXTREME_HEAT_CAUTION'));
  assert.ok(notices(recommendOutfit(request(outdoor(),{w:weather(18,{windGustKmh:60})}))).includes('STRONG_WIND_CAUTION'));
});

test('all recommendation slots are unique per phase and use known catalog items',()=>{
  const scenarios=[outdoor(),stroller(),carrier(),car({includeOutdoorTransition:true}),sleep()];
  for (const context of scenarios) {
    const r=recommendOutfit(request(context,{w:context.mode==='sleep'?null:weather(12)}));
    const keys=r.slots.map(s=>`${s.phase}|${s.slot}`);
    assert.equal(new Set(keys).size,keys.length);
    for (const s of r.slots) assert.ok(CLOTHING_CATALOG[s.selected.itemId],s.selected.itemId);
  }
});
