import { CLOTHING_CATALOG } from './clothing-catalog.js';
import { recommendOutfit as recommendOutfitCore } from './outfit-engine.js';
import { RELATION_ORDER, evaluateWind, rainRequirement, summarizeWeatherWindow, thermalEnvironment } from './outfit-engine-support.js';

/**
 * Public calibrated V1 entry point. Keep cross-cutting postconditions here when
 * they describe result quality rather than changing the core thermal optimizer.
 */
export function recommendOutfit(input) {
  const result = recommendOutfitCore(input);
  const context = input.context ?? input.situation ?? {};
  const main = result.phases.find((phase) => phase.phase === 'main');

  if (context.sunExposure === 'direct'
    && Number.isFinite(main?.thermalReferenceC)
    && main.thermalReferenceC >= 28
    && !hasNotice(result,'EXTREME_HEAT_CAUTION','main')) {
    addNotice(result,'EXTREME_HEAT_CAUTION','caution','main','EXTREME_HEAT_CAUTION',{
      thermalReferenceC:main.thermalReferenceC
    },'weather.heat.direct_sun');
  }

  markManualWeatherProtectionConflicts(result,input);
  calibrateFootwearAlternatives(result);
  return result;
}

function markManualWeatherProtectionConflicts(result,input) {
  const context = input.context ?? input.situation ?? {};
  if (!input.weather?.current) return;

  const checks = [];
  if (['outdoor','stroller','carrier'].includes(context.mode)) {
    checks.push({ phase:'main', context, mode:context.mode });
  } else if (context.mode === 'car' && context.includeOutdoorTransition) {
    checks.push({
      phase:'outdoor_transition',
      context:{ plannedMinutes:context.outsideTransitionMinutes ?? context.plannedMinutes ?? null },
      mode:'outdoor'
    });
  }

  for (const check of checks) {
    const outer = result.slots.find((entry) => entry.phase === check.phase && entry.slot === 'outer');
    if (outer?.selected.selectionSource !== 'manual_lock') continue;

    const summary = summarizeWeatherWindow(input.weather,check.context.plannedMinutes);
    const thermal = thermalEnvironment(input.weather.current);
    const wind = evaluateWind(summary,thermal,check.context,check.mode);
    const rain = rainRequirement(summary,input.weather.current);
    const accessory = result.slots.find((entry) => entry.phase === check.phase && entry.slot === 'stroller_weather_accessory');
    const outerDef = CLOTHING_CATALOG[outer.selected.itemId];
    const accessoryDef = CLOTHING_CATALOG[accessory?.selected.itemId];
    const actualRainProtection = Math.max(outerDef?.rainProtection ?? 0,accessoryDef?.rainProtection ?? 0);
    const actualWindProtection = Math.max(outerDef?.windProtection ?? 0,accessoryDef?.windProtection ?? 0);
    const rainUnmet = rain.required && actualRainProtection < 3;
    const windUnmet = wind.requiredProtection > actualWindProtection;
    if (!rainUnmet && !windUnmet) continue;

    addNotice(result,'MANUAL_LOCK_LIMITS_WEATHER_PROTECTION','caution',check.phase,'MANUAL_LOCK_LIMITS_WEATHER_PROTECTION',{
      itemId:outer.selected.itemId,
      rainRequired:rain.required,
      requiredWindProtection:wind.requiredProtection,
      actualRainProtection,
      actualWindProtection
    },'weather.protection.manual_lock');
    markPartial(result,check.phase);
  }
}

function calibrateFootwearAlternatives(result) {
  for (const slotResult of result.slots.filter((entry) => entry.slot === 'footwear')) {
    const currentWeight = CLOTHING_CATALOG[slotResult.selected.itemId]?.thermalWeight ?? 0;
    for (const option of slotResult.alternatives) {
      const candidateWeight = CLOTHING_CATALOG[option.itemId]?.thermalWeight ?? currentWeight;
      const delta = candidateWeight - currentWeight;
      option.relativeThermalDelta = delta;
      option.relation = delta === 0 ? 'equivalent' : delta > 0 ? 'warmer' : 'cooler';
    }
    slotResult.alternatives.sort((a,b) =>
      RELATION_ORDER[a.relation] - RELATION_ORDER[b.relation]
      || Math.abs(a.relativeThermalDelta) - Math.abs(b.relativeThermalDelta)
      || a.projectedChanges.length - b.projectedChanges.length
      || a.itemId.localeCompare(b.itemId)
    );
  }
}

function markPartial(result,phase) {
  if (result.status !== 'blocked') result.status = 'partial';
  const evaluation = result.phases.find((entry) => entry.phase === phase);
  if (evaluation && evaluation.status !== 'blocked') evaluation.status = 'partial';
}

function hasNotice(result,code,phase) {
  return result.notices.some((notice) => notice.code === code && notice.phase === phase);
}

function addNotice(result,code,severity,phase,reasonCode,data,ruleId) {
  if (hasNotice(result,code,phase)) return;
  result.notices.push({ code, severity, phase, reasonCodes:[reasonCode], data:{...data} });
  result.ruleTrace.push({
    ruleId,
    phase,
    effect:'notice',
    target:code,
    delta:null,
    reasonCode
  });
}
