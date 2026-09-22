const SLEEP_VISUAL_PARTS = Object.freeze({
  sleep_under_short_body_plus_light_pajamas: Object.freeze([
    Object.freeze({ itemId: 'sleep_under_short_sleeve_bodysuit', role: 'Basisschicht' }),
    Object.freeze({ itemId: 'sleep_under_light_pajamas', role: 'Schlafanzug' })
  ]),
  sleep_under_long_body_plus_light_pajamas: Object.freeze([
    Object.freeze({ itemId: 'sleep_under_long_sleeve_bodysuit', role: 'Basisschicht' }),
    Object.freeze({ itemId: 'sleep_under_light_pajamas', role: 'Schlafanzug' })
  ])
});

export function visualPartsForItem(itemId) {
  return SLEEP_VISUAL_PARTS[itemId] ?? Object.freeze([Object.freeze({ itemId })]);
}

export function isCompositeSleepVisualItem(itemId) {
  return Boolean(SLEEP_VISUAL_PARTS[itemId]);
}

export function visualRecommendationFor(recommendation) {
  if (!recommendation || !Array.isArray(recommendation.slots)) return recommendation;
  const slots = recommendation.slots.flatMap((slotResult) => {
    const itemId = slotResult?.selected?.itemId;
    const parts = visualPartsForItem(itemId);
    if (parts.length === 1) return [slotResult];
    return parts.map((part, index) => ({
      ...slotResult,
      slot: `${slotResult.slot}__visual_${index + 1}`,
      selected: { ...slotResult.selected, itemId: part.itemId }
    }));
  });
  return { ...recommendation, slots };
}
