import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession, recommendOutfit, validateWardrobeItem, validateWardrobeItems } from '../src/index.js';

const PROFILE = {
  profileId:'wardrobe_baby', displayName:'Baby', birthDate:'2026-01-24', warmthBias:'neutral',
  styleTheme:'neutral', defaultMode:'outdoor'
};

function weather(overrides = {}) {
  return {
    weatherId:'wardrobe_weather',
    location:{ locationId:'loc', label:'Testort', latitude:47.8, longitude:13, timezone:'Europe/Vienna' },
    origin:'api', source:'test', fetchedAt:'2026-10-28T08:00:00.000Z', freshness:'fresh',
    current:{
      time:'2026-10-28T09:00:00+01:00', airTempC:11, apparentTempC:10, apparentTempTrusted:true,
      apparentTempIncludes:['wind','humidity','sun'], windSpeedKmh:11, windGustKmh:11,
      precipProbabilityPct:8, precipMm:0, precipitationType:'none', uvIndex:0, cloudCoverPct:80, isDay:true,
      ...overrides
    },
    hourly:[]
  };
}

function request({ groundContact='none', mode='outdoor', wardrobe=[], weatherOverrides={}, roomTempC } = {}) {
  const context={ mode, plannedMinutes:60, activity:'normal', activitySource:'user', sunExposure:'shade', groundContact };
  if (mode==='indoor') context.roomTempC=roomTempC??20;
  return {
    requestId:`wardrobe-${mode}-${groundContact}`, requestedAt:'2026-10-28T08:00:00.000Z', profile:PROFILE,
    context, weather:mode==='indoor'?null:weather(weatherOverrides), session:createSession('wardrobe-test'), wardrobe
  };
}

function item(result, slot) {
  return result.slots.find((entry)=>entry.phase==='main'&&entry.slot===slot)?.selected?.itemId??null;
}

function closetItem(itemId, warmthLevel, overrides={}) {
  return {
    id:`wardrobe:${itemId}`, itemId, warmthLevel, fitStatus:'fits', availability:'available', condition:'clean',
    windProtection:'partial', waterProtection:'none', ...overrides
  };
}

test('10 °C gefühlt ergänzt eine isolierende Mittelschicht und trennt Schuhe vom Fußwärmebedarf',()=>{
  const noContact=recommendOutfit(request({groundContact:'none'}));
  const standing=recommendOutfit(request({groundContact:'standing'}));

  for (const result of [noContact,standing]) {
    assert.equal(result.phases[0].thermalReferenceC,10);
    assert.equal(result.phases[0].thermalAdjustment,0);
    assert.equal(item(result,'mid'),'thin_sweater');
    assert.ok(!result.ruleTrace.some((entry)=>entry.reasonCode==='WIND_THERMAL_EFFECT'));
  }
  assert.equal(item(noContact,'feet'),'warm_socks_booties');
  assert.equal(item(noContact,'footwear'),null);
  assert.equal(item(standing,'feet'),'socks');
  assert.equal(item(standing,'footwear'),'warm_shoes');
});

test('eine leichte ungefütterte Übergangsjacke ersetzt bei 10 °C keine isolierende Schicht',()=>{
  const result=recommendOutfit(request({
    wardrobe:[closetItem('light_transition_jacket','light',{windProtection:'partial'})]
  }));

  assert.equal(item(result,'outer'),'light_transition_jacket');
  assert.equal(item(result,'mid'),null);
  assert.ok(result.missingItems.some((gap)=>gap.slot==='mid'&&gap.reasonCode==='LIGHT_JACKET_NOT_INSULATING'));
});

test('bestätigte mittelwarme Jacke kann die Mittelschicht bei passender Abdeckung übernehmen',()=>{
  const result=recommendOutfit(request({
    wardrobe:[closetItem('insulated_transition_jacket','medium',{windProtection:'partial'})]
  }));

  assert.equal(item(result,'outer'),'insulated_transition_jacket');
  assert.equal(item(result,'mid'),null);
  assert.ok(!result.missingItems.some((gap)=>gap.slot==='mid'));
  assert.ok(result.wardrobeNotes.some((note)=>note.reasonCode==='WARM_OUTER_LAYER_COVERS_MID_NEED'));
});

test('zu kleine, nasse oder unbestätigte Teile werden nicht als passende Kleidung gerechnet',()=>{
  const result=recommendOutfit(request({
    wardrobe:[
      closetItem('long_sleeve_bodysuit','medium',{fitStatus:'too_small'}),
      closetItem('trousers','medium',{availability:'wet'}),
      closetItem('thin_sweater','unknown')
    ]
  }));

  assert.equal(item(result,'base_torso'),null);
  assert.equal(item(result,'legs'),null);
  assert.equal(item(result,'mid'),null);
  assert.ok(result.missingItems.some((gap)=>gap.slot==='base_torso'&&gap.reasonCode==='WARDROBE_ITEM_TOO_SMALL'));
  assert.ok(result.missingItems.some((gap)=>gap.slot==='legs'&&gap.reasonCode==='WARDROBE_ITEM_UNAVAILABLE'));
  assert.ok(result.missingItems.some((gap)=>gap.slot==='mid'&&gap.reasonCode==='WARDROBE_WARMTH_UNKNOWN'));
  assert.equal(result.status,'partial');
});

test('der Kleiderschrank funktioniert auch bei einer Drinnen-Empfehlung',()=>{
  const result=recommendOutfit(request({
    mode:'indoor', roomTempC:20,
    wardrobe:[closetItem('long_sleeve_bodysuit','medium')]
  }));

  assert.equal(result.mode,'indoor');
  assert.equal(item(result,'base_torso'),'long_sleeve_bodysuit');
  assert.ok(!result.missingItems.some((gap)=>gap.slot==='base_torso'));
});

test('Kleiderschrank-Import prüft Katalog, Enum-Werte, Schlafsäcke und doppelte IDs',()=>{
  assert.throws(()=>validateWardrobeItem({id:'bad',itemId:'not_a_catalog_item'}),/itemId/);
  assert.throws(()=>validateWardrobeItem({id:'sleep',itemId:'sleep_bag_1_0'}),/itemId/);
  assert.throws(()=>validateWardrobeItem({id:'bad',itemId:'socks',warmthLevel:'very_warm'}),/warmthLevel/);
  assert.throws(()=>validateWardrobeItems([
    closetItem('socks','light'), closetItem('warm_socks_booties','medium',{id:'wardrobe:socks'})
  ]),/duplicate/);
  assert.throws(()=>validateWardrobeItems(Array.from({length:101},(_,index)=>closetItem('socks','light',{id:`sock:${index}`}))),/100/);
});
