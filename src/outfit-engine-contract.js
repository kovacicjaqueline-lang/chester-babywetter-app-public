import { CLOTHING_CATALOG } from './clothing-catalog.js';
import { recommendOutfit as recommendOutfitCore } from './outfit-engine.js';

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
  return result;
}

function markManualWeatherProtectionConflicts(result,input) {
  const context = input.context ?? input.situation ?? {};
  if (!input.weather?.current) return;

  const checks = [];
  if (['outdoor','stroller','carrier'].includes(context.mode)) {
    checks.push({ phase:'main', context });
  } else if (context.mode === 'car' && context.includeOutdoorTransition) {
    checks.push({
      phase:'outdoor_transition',
      context:{ plannedMinutes:context.outsideTransitionMinutes ?? context.plannedMinutes ?? null }
    });
  }

  for (const check of checks) {
    const outer = result.slots.find((entry) => entry.phase === check.phase && entry.slot === 'outer');
    if (outer?.selected.selectionSource !== 'manual_lock') continue;

    const requirement = weatherProtectionRequirement(input.weather,check.context.plannedMinutes);
    const accessory = result.slots.find((entry) => entry.phase === check.phase && entry.slot === 'stroller_weather_accessory');
    const outerDef = CLOTHING_CATALOG[outer.selected.itemId];
    const accessoryDef = CLOTHING_CATALOG[accessory?.selected.itemId];
    const actualRainProtection = Math.max(outerDef?.rainProtection ?? 0,accessoryDef?.rainProtection ?? 0);
    const actualWindProtection = Math.max(outerDef?.windProtection ?? 0,accessoryDef?.windProtection ?? 0);
    const rainUnmet = requirement.rainRequired && actualRainProtection < 3;
    const windUnmet = requirement.requiredWindProtection > actualWindProtection;
    if (!rainUnmet && !windUnmet) continue;

    addNotice(result,'MANUAL_LOCK_LIMITS_WEATHER_PROTECTION','caution',check.phase,'MANUAL_LOCK_LIMITS_WEATHER_PROTECTION',{
      itemId:outer.selected.itemId,
      rainRequired:requirement.rainRequired,
      requiredWindProtection:requirement.requiredWindProtection,
      actualRainProtection,
      actualWindProtection
    },'weather.protection.manual_lock');
    markPartial(result,check.phase);
  }
}

function weatherProtectionRequirement(weather,plannedMinutes) {
  const current = weather.current;
  const duration = Number.isFinite(plannedMinutes) ? Math.max(0,plannedMinutes) : 120;
  const start = Date.parse(current.time);
  const end = Number.isFinite(start) ? start + duration * 60000 : Infinity;
  const points = [current,...(weather.hourly ?? []).filter((point) => {
    const time = Date.parse(point.time);
    return !Number.isFinite(start) || !Number.isFinite(time) || (time >= start && time <= end);
  })];
  const maxPrecipProbabilityPct = maxFinite(points.map((point) => point.precipProbabilityPct));
  const maxWindSpeedKmh = maxFinite(points.map((point) => point.windSpeedKmh));
  const maxWindGustKmh = maxFinite(points.map((point) => point.windGustKmh));
  const rainCurrent = (Number.isFinite(current.precipMm) && current.precipMm > 0)
    || ['rain','snow','sleet'].includes(current.precipitationType);

  let requiredWindProtection = 0;
  if (Number.isFinite(maxWindSpeedKmh)) {
    if (maxWindSpeedKmh >= 39) requiredWindProtection = 3;
    else if (maxWindSpeedKmh >= 29) requiredWindProtection = 2;
    else if (maxWindSpeedKmh >= 20) requiredWindProtection = 1;
  }
  if (Number.isFinite(maxWindGustKmh)) {
    if (maxWindGustKmh >= 50) requiredWindProtection = Math.max(requiredWindProtection,3);
    else if (maxWindGustKmh >= 39) requiredWindProtection = Math.max(requiredWindProtection,2);
  }

  return {
    rainRequired:rainCurrent || (Number.isFinite(maxPrecipProbabilityPct) && maxPrecipProbabilityPct >= 60),
    requiredWindProtection
  };
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

function maxFinite(values) {
  const finite = values.filter(Number.isFinite);
  return finite.length ? Math.max(...finite) : null;
}
