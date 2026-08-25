import { recommendOutfit as recommendBaseOutfit, TEMPERATURE_BANDS, temperatureBandFor } from './outfit-engine.js';
import { applyGenericTogFallback, GENERIC_TOG_TABLE, genericTogGuidanceForRoomTemp } from './sleep-tog-rules.js';

export { CLOTHING_CATALOG } from './clothing-catalog.js';
export { TEMPERATURE_BANDS, temperatureBandFor, GENERIC_TOG_TABLE, genericTogGuidanceForRoomTemp };

export function recommendOutfit(input) {
  return applyGenericTogFallback(recommendBaseOutfit(input), input);
}
