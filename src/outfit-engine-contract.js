import { recommendOutfit as recommendOutfitCore } from './outfit-engine.js';

function hasNotice(result, code, phase) {
  return result.notices.some((notice) => notice.code === code && notice.phase === phase);
}

function addNotice(result, code, severity, phase, reasonCode, data = {}) {
  if (hasNotice(result, code, phase)) return;
  result.notices.push({ code, severity, phase, reasonCodes:[reasonCode], data:{...data} });
  result.ruleTrace.push({
    ruleId:`notice.${code.toLowerCase()}`,
    phase,
    effect:'notice',
    target:code,
    delta:null,
    reasonCode
  });
}

function enforceCalibratedPostconditions(result, input) {
  const context = input.context ?? input.situation ?? {};

  if (context.sunExposure === 'direct') {
    const main = result.phases.find((phase) => phase.phase === 'main');
    if (Number.isFinite(main?.thermalReferenceC) && main.thermalReferenceC >= 28) {
      addNotice(
        result,
        'EXTREME_HEAT_CAUTION',
        'caution',
        'main',
        'EXTREME_HEAT_CAUTION',
        { thermalReferenceC:main.thermalReferenceC }
      );
    }
  }

  if (result.mode === 'car') {
    const blocked = result.phases.filter((phase) => phase.status === 'blocked');
    const usable = result.phases.filter((phase) => ['ready','ready_with_estimate','partial'].includes(phase.status));
    if (blocked.length && usable.length) result.status = 'partial';
  }

  return result;
}

/**
 * Public calibrated V1 entry point. The core evaluator stays pure; these
 * postconditions reconcile cross-phase/status invariants from DATA_CONTRACT.
 */
export function recommendOutfit(input) {
  return enforceCalibratedPostconditions(recommendOutfitCore(input), input);
}
