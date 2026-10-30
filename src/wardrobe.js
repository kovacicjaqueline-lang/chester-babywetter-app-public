import { CLOTHING_CATALOG } from './clothing-catalog.js';

const FIT_STATUSES = new Set(['fits','snug','large','unclear','too_small']);
const AVAILABILITIES = new Set(['available','laundry','wet','packed']);
const CONDITIONS = new Set(['clean','wet','damaged']);
const WARMTH_RANK = Object.freeze({ none:0, light:1, medium:2, warm:3 });
const PROTECTION_RANK = Object.freeze({ none:0, partial:1, full:3 });
const WARMTH_LABEL = Object.freeze(['none','light','medium','warm']);
const PROTECTION_LABEL = Object.freeze(['none','partial','full','full']);
const BODY_ZONES = new Set(['torso','arms','legs','head','ears','hands','feet','ankles']);

function textValue(value, max, field) {
  if (value == null) return null;
  if (typeof value !== 'string' || value.length > max) throw new TypeError(`${field} is invalid`);
  const normalized = value.trim();
  return normalized || null;
}

function protectionValue(value, field) {
  if (!['unknown','none','partial','full'].includes(value)) throw new TypeError(`${field} is invalid`);
  return value;
}

export function validateWardrobeItem(value, index = 0) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`wardrobe[${index}] is invalid`);
  const itemId = value.itemId;
  const definition = CLOTHING_CATALOG[itemId];
  if (!definition || definition.kind === 'sleep_bag' || itemId.endsWith('_none')) throw new TypeError(`wardrobe[${index}].itemId is invalid`);
  const id = textValue(value.id, 120, `wardrobe[${index}].id`);
  if (!id) throw new TypeError(`wardrobe[${index}].id is required`);
  const fitStatus = value.fitStatus ?? 'unclear';
  const availability = value.availability ?? 'available';
  const condition = value.condition ?? 'clean';
  const warmthLevel = value.warmthLevel ?? 'unknown';
  if (!FIT_STATUSES.has(fitStatus)) throw new TypeError(`wardrobe[${index}].fitStatus is invalid`);
  if (!AVAILABILITIES.has(availability)) throw new TypeError(`wardrobe[${index}].availability is invalid`);
  if (!CONDITIONS.has(condition)) throw new TypeError(`wardrobe[${index}].condition is invalid`);
  if (!['unknown','none','light','medium','warm'].includes(warmthLevel)) throw new TypeError(`wardrobe[${index}].warmthLevel is invalid`);
  const windProtection = protectionValue(value.windProtection ?? 'unknown', `wardrobe[${index}].windProtection`);
  const waterProtection = protectionValue(value.waterProtection ?? 'unknown', `wardrobe[${index}].waterProtection`);
  const coverageZones = value.coverageZones === undefined
    ? [...definition.bodyZones]
    : value.coverageZones;
  if (!Array.isArray(coverageZones) || coverageZones.some((zone) => !BODY_ZONES.has(zone))) {
    throw new TypeError(`wardrobe[${index}].coverageZones is invalid`);
  }
  return {
    id,
    itemId,
    label:textValue(value.label,80,`wardrobe[${index}].label`),
    sizeLabel:textValue(value.sizeLabel,40,`wardrobe[${index}].sizeLabel`),
    material:textValue(value.material,80,`wardrobe[${index}].material`),
    lining:textValue(value.lining,80,`wardrobe[${index}].lining`),
    fitStatus,
    availability,
    condition,
    warmthLevel,
    windProtection,
    waterProtection,
    coverageZones:[...new Set(coverageZones)]
  };
}

export function validateWardrobeItems(value) {
  if (!Array.isArray(value)) throw new TypeError('payload.wardrobe must be an array');
  if (value.length > 100) throw new RangeError('payload.wardrobe cannot contain more than 100 items');
  const items = value.map(validateWardrobeItem);
  const ids = new Set();
  for (const item of items) {
    if (ids.has(item.id)) throw new TypeError('payload.wardrobe contains duplicate item IDs');
    ids.add(item.id);
  }
  return items;
}

function warmthRankForWeight(value) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (value <= 1) return 1;
  if (value <= 2) return 2;
  return 3;
}

function protectionRankForWeight(value) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (value <= 1) return 1;
  return 3;
}

function warmthLabel(value) {
  return WARMTH_LABEL[Math.min(WARMTH_LABEL.length - 1, Math.max(0, value))];
}

function protectionLabel(value) {
  return PROTECTION_LABEL[Math.min(PROTECTION_LABEL.length - 1, Math.max(0, value))];
}

function zonesForDefinition(definition) {
  return [...(definition?.bodyZones ?? [])];
}

function itemAllowedInContext(item, context, phase) {
  const definition = CLOTHING_CATALOG[item.itemId];
  const mode = context.mode === 'indoor' ? 'outdoor' : context.mode;
  if (!definition || !definition.allowedSituations.includes(mode)) return false;
  if (context.mode === 'car' && definition.carSeatCompatibility === 'prohibited') return false;
  if (phase === 'in_car' && definition.carSeatCompatibility === 'prohibited') return false;
  return true;
}

function statusEligible(item) {
  return item.availability === 'available'
    && item.condition === 'clean'
    && item.fitStatus === 'fits';
}

function hasZones(item, requiredZones) {
  const zones = new Set(item.coverageZones);
  return requiredZones.every((zone) => zones.has(zone));
}

function candidateIdsForSlot(slot) {
  const ids = [slot.selected?.itemId];
  for (const alternative of slot.alternatives ?? []) ids.push(alternative.itemId);
  return [...new Set(ids.filter((id) => id && !id.endsWith('_none')))];
}

function candidateFailureCode(records, requiredZones, minWarmth, minWind, minWater) {
  if (!records.length) return 'WARDROBE_ITEM_MISSING';
  if (records.every((item) => item.fitStatus === 'too_small')) return 'WARDROBE_ITEM_TOO_SMALL';
  if (records.every((item) => item.fitStatus !== 'fits')) {
    return records.some((item) => ['snug','large'].includes(item.fitStatus)) ? 'WARDROBE_FIT_UNSUITABLE' : 'WARDROBE_FIT_UNCONFIRMED';
  }
  const fitting = records.filter((item) => item.fitStatus === 'fits');
  if (fitting.every((item) => item.availability !== 'available' || item.condition !== 'clean')) return 'WARDROBE_ITEM_UNAVAILABLE';
  const usable = fitting.filter((item) => item.availability === 'available' && item.condition === 'clean');
  if (usable.every((item) => item.warmthLevel === 'unknown')) return 'WARDROBE_WARMTH_UNKNOWN';
  if (usable.every((item) => !hasZones(item, requiredZones))) return 'WARDROBE_COVERAGE_INCOMPLETE';
  if (usable.every((item) => WARMTH_RANK[item.warmthLevel] == null || WARMTH_RANK[item.warmthLevel] < minWarmth)) return 'WARDROBE_WARMTH_INSUFFICIENT';
  if (minWind > 0 && usable.every((item) => PROTECTION_RANK[item.windProtection] == null || PROTECTION_RANK[item.windProtection] < minWind)) return 'WARDROBE_WIND_PROTECTION_INSUFFICIENT';
  if (minWater > 0 && usable.every((item) => PROTECTION_RANK[item.waterProtection] == null || PROTECTION_RANK[item.waterProtection] < minWater)) return 'WARDROBE_WATER_PROTECTION_INSUFFICIENT';
  return 'WARDROBE_NO_SUITABLE_ITEM';
}

function minimumForSlot(slot, definition, { thermalCredit = 0, requireWind = false, requireWater = false } = {}) {
  return {
    warmth:Math.max(0,warmthRankForWeight(definition?.thermalWeight ?? 0) - thermalCredit),
    wind:requireWind ? protectionRankForWeight(definition?.windProtection ?? 0) : 0,
    water:requireWater ? protectionRankForWeight(definition?.rainProtection ?? 0) : 0,
    zones:zonesForDefinition(definition),
    slot:slot.slot
  };
}

function candidateScore(item, slot, minimum) {
  const definition = CLOTHING_CATALOG[item.itemId];
  const baseline = slot.selected?.itemId;
  const isBaseline = item.itemId === baseline;
  const warmth = WARMTH_RANK[item.warmthLevel] ?? -1;
  const protection = Math.min(PROTECTION_RANK[item.windProtection] ?? -1,PROTECTION_RANK[item.waterProtection] ?? -1);
  return [
    isBaseline ? 0 : 1,
    Math.max(0,warmth - minimum.warmth),
    Math.max(0,(definition?.thermalWeight ?? 0) - (CLOTHING_CATALOG[baseline]?.thermalWeight ?? 0)),
    protection
  ];
}

function compareScores(left,right) {
  for (let index=0;index<left.length;index+=1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

function buildGap(slot, neededItemId, code, context, records, minimum = minimumForSlot(slot, CLOTHING_CATALOG[neededItemId])) {
  const definition = CLOTHING_CATALOG[neededItemId];
  const zones = zonesForDefinition(definition);
  let title = 'Passendes Kleidungsstück fehlt';
  let detail = 'Im Kleiderschrank ist kein sauberes, trockenes und passend sitzendes Teil mit bestätigter Wärmeleistung eingetragen.';
  if (code === 'WARDROBE_WARMTH_UNKNOWN') {
    title = 'Wärmeleistung noch offen';
    detail = 'Die Wärmeleistung dieses Teils ist unbekannt. Die App zählt es deshalb nicht als wärmende Schicht.';
  } else if (code === 'WARDROBE_FIT_UNCONFIRMED') {
    title = 'Passform prüfen';
    detail = 'Für dieses Teil ist keine passende Größe bestätigt. Es wird nicht als sichere Abdeckung vorausgesetzt.';
  } else if (code === 'WARDROBE_FIT_UNSUITABLE') {
    title = 'Passform passt nicht';
    detail = 'Als eng oder weit markierte Teile werden nicht als passende Abdeckung vorausgesetzt.';
  } else if (code === 'WARDROBE_ITEM_UNAVAILABLE') {
    title = 'Kleidungsstück gerade nicht verfügbar';
    detail = 'Das passende Teil ist als nass, in der Wäsche oder eingepackt markiert und wird für diese Empfehlung ausgelassen.';
  } else if (code === 'WARDROBE_ITEM_TOO_SMALL') {
    title = 'Kleidungsstück ist zu klein';
    detail = 'Ein zu kleines Teil wird nicht als ausreichende Abdeckung gewertet.';
  } else if (code === 'WARDROBE_COVERAGE_INCOMPLETE') {
    title = 'Körperbereich nicht vollständig bedeckt';
    detail = 'Das eingetragene Teil deckt nicht alle für diese Schicht benötigten Bereiche ab.';
  } else if (code === 'WARDROBE_WARMTH_INSUFFICIENT') {
    title = 'Wärmere Schicht fehlt';
    detail = 'Die vorhandene Schicht erreicht die erforderliche Wärmeleistung nicht.';
  } else if (code === 'WARDROBE_WIND_PROTECTION_INSUFFICIENT') {
    title = 'Windschutz fehlt';
    detail = 'Die ausgewählten Teile bieten nicht den benötigten Windschutz.';
  } else if (code === 'WARDROBE_WATER_PROTECTION_INSUFFICIENT') {
    title = 'Regenschutz fehlt';
    detail = 'Die ausgewählten Teile bieten nicht den benötigten Nässeschutz.';
  } else if (slot.slot === 'mid' && records.some((item) => item.itemId === 'light_transition_jacket' && item.warmthLevel === 'light')) {
    title = 'Isolierende Mittelschicht fehlt';
    detail = 'Die leichte ungefütterte Jacke schützt etwas vor Wind, wärmt aber kaum. Für diese Wetterlage fehlt eine bestätigte isolierende Schicht.';
    code = 'LIGHT_JACKET_NOT_INSULATING';
  } else if (slot.slot === 'footwear' && context.groundContact !== 'none') {
    title = 'Bodenschutz durch Schuhe fehlt';
    detail = 'Die Füße können mit Socken oder Booties warm bleiben; für den geplanten Bodenkontakt fehlt aber ein passendes Paar Schuhe.';
    code = 'GROUND_PROTECTION_MISSING';
  }
  return {
    phase:slot.phase,
    slot:slot.slot,
    zone:zones[0] ?? (slot.slot === 'footwear' ? 'feet' : slot.slot),
    neededItemId,
    reasonCode:code,
    title,
    detail,
    requiredWarmth:warmthLabel(minimum.warmth),
    reasonCodes:[code]
  };
}

export function protectionRequired(recommendation, slot, kind) {
  const reasons=new Set(slot.selected?.reasonCodes??[]);
  if (kind==='wind'&&(reasons.has('WIND_PROTECTION_REQUIRED')||reasons.has('WIND_HEAD_PROTECTION_REQUIRED'))) return true;
  if (kind==='water'&&reasons.has('RAIN_PROTECTION_REQUIRED')) return true;
  if (kind==='water'&&slot.slot==='footwear') {
    return (recommendation.ruleTrace??[]).some((entry)=>entry.reasonCode==='RAIN_PROTECTION_REQUIRED');
  }
  return false;
}

export function buildNeedProfile(recommendation, context) {
  const zones = new Map();
  let minWind = 0;
  let minWater = 0;
  let footThermalRank = 0;
  let groundProtection = 'none';
  const reasonCodes = new Set();
  for (const slot of recommendation.slots ?? []) {
    const definition = CLOTHING_CATALOG[slot.selected?.itemId];
    if (!definition) continue;
    const reasons=new Set(slot.selected.reasonCodes??[]);
    const minimum = minimumForSlot(slot,definition,{
      requireWind:protectionRequired(recommendation,slot,'wind'),
      requireWater:protectionRequired(recommendation,slot,'water')
    });
    minWind = Math.max(minWind,minimum.wind);
    minWater = Math.max(minWater,minimum.water);
    if (['feet','footwear'].includes(slot.slot)) footThermalRank = Math.max(footThermalRank,minimum.warmth);
    if (slot.slot === 'footwear' && ['standing','walking'].includes(context.groundContact)) groundProtection = 'required';
    for (const zone of minimum.zones) {
      const previous = zones.get(zone);
      const rank = minimum.warmth;
      zones.set(zone,{
        zone,
        coverage:'required',
        minWarmth:warmthLabel(Math.max(rank,previous ? WARMTH_RANK[previous.minWarmth] : 0)),
        sourceSlots:[...new Set([...(previous?.sourceSlots ?? []),slot.slot])],
        reasonCodes:[...new Set([...(previous?.reasonCodes ?? []),...(slot.selected.reasonCodes ?? [])])]
      });
    }
    for (const reason of slot.selected.reasonCodes ?? []) reasonCodes.add(reason);
  }
  return {
    schemaVersion:1,
    zoneNeeds:[...zones.values()],
    protection:{ wind:protectionLabel(minWind), water:protectionLabel(minWater) },
    footwear:{ thermalNeed:warmthLabel(footThermalRank), groundProtection },
    confidence:'medium',
    reasonCodes:[...reasonCodes]
  };
}

export function applyWardrobeToRecommendation(recommendation, context, rawItems = []) {
  const wardrobeItems = validateWardrobeItems(rawItems ?? []);
  const result = structuredClone(recommendation);
  result.missingItems = [];
  result.wardrobeNotes = [];
  result.wardrobeMode = wardrobeItems.length ? 'inventory' : 'legacy';
  result.needProfile = buildNeedProfile(result,context);
  result.wardrobeAssumptions = wardrobeItems.length
    ? ['Nur verfügbare, saubere, trockene Teile mit bestätigter Passform und Wärmeleistung werden als Kandidaten verwendet.']
    : ['Es sind noch keine eigenen Kleidungsstücke eingetragen; die App zeigt eine generische Katalogempfehlung.'];
  if (!wardrobeItems.length || result.status === 'blocked') return result;

  const byId = new Map(wardrobeItems.map((item) => [item.id,item]));
  const prepared = (result.slots ?? []).map((slot) => {
    const targetId = slot.selected?.itemId;
    if (!targetId || targetId.endsWith('_none')) return { slot, selectedItem:null, gap:null };
    const targetDef = CLOTHING_CATALOG[targetId];
    const minimum = minimumForSlot(slot,targetDef,{
      requireWind:protectionRequired(result,slot,'wind'),
      requireWater:protectionRequired(result,slot,'water')
    });
    const ids = candidateIdsForSlot(slot);
    const records = wardrobeItems.filter((item) => ids.includes(item.itemId));
    const candidates = records
      .filter((item) => itemAllowedInContext(item,context,slot.phase) && statusEligible(item))
      .filter((item) => {
        const definition = CLOTHING_CATALOG[item.itemId];
        return definition?.slot === slot.slot
          && hasZones(item,minimum.zones)
          && WARMTH_RANK[item.warmthLevel] != null
          && WARMTH_RANK[item.warmthLevel] >= minimum.warmth
          && (minimum.wind === 0 || (PROTECTION_RANK[item.windProtection] ?? -1) >= minimum.wind)
          && (minimum.water === 0 || (PROTECTION_RANK[item.waterProtection] ?? -1) >= minimum.water);
      })
      .sort((left,right)=>compareScores(candidateScore(left,slot,minimum),candidateScore(right,slot,minimum)));
    const selectedItem = candidates[0] ?? null;
    const gap = selectedItem ? null : buildGap(
      slot,
      targetId,
      candidateFailureCode(records,minimum.zones,minimum.warmth,minimum.wind,minimum.water),
      context,
      records,
      minimum
    );
    return { slot, selectedItem, gap, records, minimum };
  });

  const feet = prepared.find((entry)=>entry.slot.slot==='feet')?.selectedItem;
  const feetRank = feet ? (WARMTH_RANK[feet.warmthLevel] ?? 0) : 0;
  for (const entry of prepared) {
    if (entry.slot.slot !== 'footwear' || entry.selectedItem || !entry.records?.length) continue;
    const targetId = entry.slot.selected.itemId;
    const targetDef = CLOTHING_CATALOG[targetId];
    const relaxed = minimumForSlot(entry.slot,targetDef,{
      thermalCredit:feetRank,
      requireWind:protectionRequired(result,entry.slot,'wind'),
      requireWater:protectionRequired(result,entry.slot,'water')
    });
    const candidates = entry.records
      .filter((item)=>itemAllowedInContext(item,context,entry.slot.phase)&&statusEligible(item))
      .filter((item)=>{
        const definition=CLOTHING_CATALOG[item.itemId];
        return definition?.slot==='footwear'
          && hasZones(item,entry.minimum.zones)
          && WARMTH_RANK[item.warmthLevel]!=null
          && WARMTH_RANK[item.warmthLevel]>=relaxed.warmth
          && (entry.minimum.wind===0||(PROTECTION_RANK[item.windProtection]??-1)>=entry.minimum.wind)
          && (entry.minimum.water===0||(PROTECTION_RANK[item.waterProtection]??-1)>=entry.minimum.water);
      })
      .sort((left,right)=>compareScores(candidateScore(left,entry.slot,relaxed),candidateScore(right,entry.slot,relaxed)));
    if (candidates[0]) {
      entry.selectedItem=candidates[0];
      entry.gap=null;
    }
  }

  const midGap = prepared.find((entry)=>entry.slot.slot==='mid'&&entry.gap);
  const outer = prepared.find((entry)=>entry.slot.slot==='outer');
  if (midGap && outer?.selectedItem) {
    const outerRank=WARMTH_RANK[outer.selectedItem.warmthLevel]??0;
    const midDef=CLOTHING_CATALOG[midGap.slot.selected.itemId];
    const midNeed=warmthRankForWeight(midDef?.thermalWeight??0);
    const coversTorso=hasZones(outer.selectedItem,['torso','arms']);
    if (outerRank>=midNeed&&coversTorso) {
      midGap.gap=null;
      midGap.coveredByOtherSlot='outer';
      result.wardrobeNotes.push({
        reasonCode:'WARM_OUTER_LAYER_COVERS_MID_NEED',
        detail:'Die eingetragene wärmere Außenschicht deckt den zusätzlichen Wärmebedarf am Rumpf ab.'
      });
    }
  }
  const lightJacket = outer?.records?.find((item)=>item.itemId==='light_transition_jacket'&&item.warmthLevel==='light');
  if (midGap?.gap&&lightJacket) {
    midGap.gap.reasonCode='LIGHT_JACKET_NOT_INSULATING';
    midGap.gap.reasonCodes=['LIGHT_JACKET_NOT_INSULATING'];
    midGap.gap.title='Isolierende Mittelschicht fehlt';
    midGap.gap.detail='Die leichte ungefütterte Jacke schützt etwas vor Wind, wärmt aber kaum. Für diese Wetterlage fehlt eine bestätigte isolierende Schicht.';
  }

  const slots=[];
  for (const entry of prepared) {
    if (entry.coveredByOtherSlot) continue;
    if (entry.gap) {
      result.missingItems.push(entry.gap);
      continue;
    }
    if (!entry.selectedItem) {
      slots.push(entry.slot);
      continue;
    }
    const selected = {
      ...entry.slot.selected,
      itemId:entry.selectedItem.itemId,
      wardrobeItemId:entry.selectedItem.id,
      wardrobeLabel:entry.selectedItem.label,
      reasonCodes:[...new Set([...(entry.slot.selected.reasonCodes??[]),'WARDROBE_ITEM_SELECTED'])]
    };
    const availableIds=new Set(wardrobeItems.filter((item)=>statusEligible(item)).map((item)=>item.itemId));
    const alternatives=(entry.slot.alternatives??[]).filter((alternative)=>{
      if (!availableIds.has(alternative.itemId)) return false;
      const item=wardrobeItems.find((candidate)=>candidate.itemId===alternative.itemId&&statusEligible(candidate));
      if (!item || !itemAllowedInContext(item,context,entry.slot.phase)) return false;
      const definition=CLOTHING_CATALOG[item.itemId];
      const minimum=minimumForSlot(entry.slot,CLOTHING_CATALOG[entry.slot.selected.itemId],{
        requireWind:protectionRequired(result,entry.slot,'wind'),
        requireWater:protectionRequired(result,entry.slot,'water')
      });
      return hasZones(item,minimum.zones)
        && WARMTH_RANK[item.warmthLevel]>=minimum.warmth
        && (minimum.wind===0||(PROTECTION_RANK[item.windProtection]??-1)>=minimum.wind)
        && (minimum.water===0||(PROTECTION_RANK[item.waterProtection]??-1)>=minimum.water)
        && definition?.slot===entry.slot.slot;
    });
    slots.push({ ...entry.slot, selected, alternatives });
  }

  result.slots=slots;
  result.items=slots.map((entry)=>({
    itemId:entry.selected.itemId,
    phase:entry.phase,
    slot:entry.slot,
    wearPosition:entry.selected.wearPosition,
    selectionSource:entry.selected.selectionSource,
    reasonCodes:[...entry.selected.reasonCodes]
  }));
  if (result.missingItems.length) {
    result.status='partial';
    result.dataQuality.missingFields=[...new Set([...(result.dataQuality.missingFields??[]),...result.missingItems.map((item)=>`wardrobe.${item.slot}`)])];
    for (const phase of result.phases ?? []) {
      if (result.missingItems.some((item)=>item.phase===phase.phase)) phase.status='partial';
    }
    result.notices.push({
      code:'WARDROBE_INCOMPLETE',
      severity:'caution',
      phase:null,
      reasonCodes:[...new Set(result.missingItems.map((item)=>item.reasonCode))],
      data:{ count:result.missingItems.length }
    });
  }
  return result;
}
