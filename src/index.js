import { recommendOutfit as recommendOutfitBase } from './recommendation-mode-adapter.js';
import { prepareRequestForHourlySelection } from './integration/hourly-selection.js';

export { CLOTHING_CATALOG, SLOT_ITEMS } from './clothing-catalog.js';
export { GENERIC_TOG_TABLE, SLEEP_BAG_IDS, SLEEP_UNDERLAYER_IDS, genericTogGuidanceForRoomTemp } from './sleep-tog-rules.js';
export { TEMPERATURE_BANDS, temperatureBandFor, createSession, setWarmthOffset, lockItem } from './outfit-engine.js';
export { buildVisualCatalog, nextVisualSeed, selectVisualLook, selectVisualVariant } from './visual-outfit.js';

export function recommendOutfit(request) {
  return recommendOutfitBase(prepareRequestForHourlySelection(request));
}
