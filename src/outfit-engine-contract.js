import { recommendOutfit as recommendOutfitCore } from './outfit-engine.js';

/**
 * Public calibrated V1 entry point. Keep only postconditions that are not part
 * of the core optimizer itself so fachliche rules are not duplicated.
 */
export function recommendOutfit(input) {
  const result = recommendOutfitCore(input);
  const context = input.context ?? input.situation ?? {};
  const main = result.phases.find((phase) => phase.phase === 'main');

  if (context.sunExposure === 'direct'
    && Number.isFinite(main?.thermalReferenceC)
    && main.thermalReferenceC >= 28
    && !result.notices.some((notice) => notice.code === 'EXTREME_HEAT_CAUTION' && notice.phase === 'main')) {
    result.notices.push({
      code:'EXTREME_HEAT_CAUTION',
      severity:'caution',
      phase:'main',
      reasonCodes:['EXTREME_HEAT_CAUTION'],
      data:{ thermalReferenceC:main.thermalReferenceC }
    });
    result.ruleTrace.push({
      ruleId:'weather.heat.direct_sun',
      phase:'main',
      effect:'notice',
      target:'EXTREME_HEAT_CAUTION',
      delta:null,
      reasonCode:'EXTREME_HEAT_CAUTION'
    });
  }

  return result;
}
