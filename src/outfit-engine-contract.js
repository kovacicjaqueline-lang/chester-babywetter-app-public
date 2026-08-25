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
  markWeatherWindowCompleteness(result,input);
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
    const summary = summarizeWeatherWindow(input.weather,check.context.plannedMinutes);
    const thermal = thermalEnvironment(input.weather.current);
    const wind = evaluateWind(summary,thermal,check.context,check.mode);
    const rain = rainRequirement(summary,input.weather.current);
    const conflicts = [];

    const outer = result.slots.find((entry) => entry.phase === check.phase && entry.slot === 'outer');
    if (outer?.selected.selectionSource === 'manual_lock') {
      const accessory = result.slots.find((entry) => entry.phase === check.phase && entry.slot === 'stroller_weather_accessory');
      const outerDef = CLOTHING_CATALOG[outer.selected.itemId];
      const accessoryDef = CLOTHING_CATALOG[accessory?.selected.itemId];
      const actualRainProtection = Math.max(outerDef?.rainProtection ?? 0,accessoryDef?.rainProtection ?? 0);
      const actualWindProtection = Math.max(outerDef?.windProtection ?? 0,accessoryDef?.windProtection ?? 0);
      const rainUnmet = rain.required && actualRainProtection < 3;
      const windUnmet = wind.requiredProtection > actualWindProtection;
      if (rainUnmet || windUnmet) {
        conflicts.push({
          slot:'outer',
          itemId:outer.selected.itemId,
          rainRequired:rain.required,
          requiredRainProtection:rain.required ? 3 : 0,
          actualRainProtection,
          requiredWindProtection:wind.requiredProtection,
          actualWindProtection
        });
      }
    }

    const groundContact = check.context.groundContact;
    const footwear = result.slots.find((entry) => entry.phase === check.phase && entry.slot === 'footwear');
    if (check.mode === 'outdoor'
      && ['standing','walking'].includes(groundContact)
      && footwear?.selected.selectionSource === 'manual_lock'
      && rain.required) {
      const footwearDef = CLOTHING_CATALOG[footwear.selected.itemId];
      const actualRainProtection = footwearDef?.rainProtection ?? 0;
      if (actualRainProtection < 2) {
        conflicts.push({
          slot:'footwear',
          itemId:footwear.selected.itemId,
          rainRequired:true,
          requiredRainProtection:2,
          actualRainProtection,
          requiredWindProtection:0,
          actualWindProtection:footwearDef?.windProtection ?? 0
        });
      }
    }

    if (!conflicts.length) continue;
    addNotice(result,'MANUAL_LOCK_LIMITS_WEATHER_PROTECTION','caution',check.phase,'MANUAL_LOCK_LIMITS_WEATHER_PROTECTION',{
      conflicts
    },'weather.protection.manual_lock');
    markPartial(result,check.phase);
  }
}

function markWeatherWindowCompleteness(result,input) {
  const context = input.context ?? input.situation ?? {};
  const weather = input.weather;
  if (!weather?.current) return;

  const checks = [];
  if (['outdoor','stroller','carrier'].includes(context.mode)) {
    checks.push({ phase:'main', plannedMinutes:context.plannedMinutes ?? null });
  } else if (context.mode === 'car' && context.includeOutdoorTransition) {
    checks.push({ phase:'outdoor_transition', plannedMinutes:context.outsideTransitionMinutes ?? context.plannedMinutes ?? null });
  }

  for (const check of checks) {
    const evaluation = result.phases.find((entry) => entry.phase === check.phase);
    if (!evaluation || evaluation.status === 'blocked') continue;
    const missing = missingWeatherWindowFields(weather,check.plannedMinutes);
    if (!missing.length) continue;

    result.dataQuality.missingFields = [...new Set([...(result.dataQuality.missingFields ?? []),...missing])];
    evaluation.missingFields = [...new Set([...(evaluation.missingFields ?? []),...missing])];
    markPartial(result,check.phase);

    if (!hasNotice(result,'WEATHER_DATA_INCOMPLETE',check.phase)) {
      addNotice(result,'WEATHER_DATA_INCOMPLETE','caution',check.phase,'WEATHER_WINDOW_INCOMPLETE',{
        count:missing.length
      },'weather.window.completeness');
    }
  }
}

function missingWeatherWindowFields(weather,plannedMinutes) {
  const duration = Number.isFinite(plannedMinutes) ? Math.max(0,plannedMinutes) : 120;
  if (duration === 0) return [];

  const start = Date.parse(weather.current.time);
  if (!Number.isFinite(start)) return ['weather.current.time'];
  const end = start + duration * 60000;
  const hourly = (weather.hourly ?? [])
    .filter((point) => Number.isFinite(Date.parse(point.time)))
    .filter((point) => Date.parse(point.time) > start && Date.parse(point.time) <= end)
    .sort((a,b) => Date.parse(a.time) - Date.parse(b.time));

  const missing = [];
  // A positive planned window needs future hourly evidence; current conditions alone are not a complete forecast window.
  if (!hourly.length || Date.parse(hourly.at(-1).time) < end) missing.push('weather.hourly.coverage');
  if (hourly.some((point) => !Number.isFinite(point.precipProbabilityPct))) missing.push('weather.hourly.precipProbabilityPct');
  if (hourly.some((point) => !Number.isFinite(point.windSpeedKmh))) missing.push('weather.hourly.windSpeedKmh');
  if (hourly.some((point) => !Number.isFinite(point.uvIndex))) missing.push('weather.hourly.uvIndex');
  return [...new Set(missing)];
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
