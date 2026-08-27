export const V1_ESTIMATED_CABIN_TEMP_C = 20;

/**
 * V1 deliberately uses a neutral climate-controlled cabin assumption instead of
 * deriving a pseudo-precise cabin temperature from outdoor weather. The current
 * data contract has no HVAC, pre-conditioning, parking, solar-heating or actual
 * cabin-state input that could support a trustworthy dynamic estimate.
 */
export function estimateCabinTemperature() {
  return {
    cabinTempC: V1_ESTIMATED_CABIN_TEMP_C,
    cabinTempSource: 'estimated'
  };
}

export function withEstimatedCabinTemperature(context) {
  if (!context || typeof context !== 'object') throw new TypeError('car context is required');
  if (context.mode !== 'car') throw new RangeError('estimated cabin temperature requires car mode');
  return { ...context, ...estimateCabinTemperature() };
}
