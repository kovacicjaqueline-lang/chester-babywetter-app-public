export const GENERIC_TOG_TABLE = Object.freeze([
  row('below_16', -Infinity, 16, '< 16 °C', 3.5, ['long_sleeve_bodysuit', 'sleep_suit'], 'manufacturer_edge'),
  row('16_to_18', 16, 18, '16 bis < 18 °C', 2.5, ['long_sleeve_bodysuit', 'sleep_suit'], 'nhs_standard'),
  row('18_to_20', 18, 20, '18 bis < 20 °C', 2.5, ['sleep_suit'], 'nhs_standard'),
  row('20_to_22', 20, 22, '20 bis < 22 °C', 1.0, ['sleep_suit'], 'nhs_standard'),
  row('22_to_24', 22, 24, '22 bis < 24 °C', 1.0, ['short_sleeve_bodysuit'], 'nhs_standard'),
  row('24_to_27', 24, 27, '24 bis < 27 °C', 0.5, ['short_sleeve_bodysuit'], 'nhs_standard'),
  row('27_plus', 27, Infinity, '≥ 27 °C', 0.2, [], 'manufacturer_edge')
]);

const SLEEP_ITEM_ROLES = Object.freeze({
  short_sleeve_bodysuit: 'base',
  long_sleeve_bodysuit: 'base',
  sleep_suit: 'base'
});

export function genericTogGuidanceForRoomTemp(roomTempC) {
  if (!isFiniteNumber(roomTempC)) {
    throw new TypeError('roomTempC must be a finite number');
  }
  const match = GENERIC_TOG_TABLE.find((entry) => roomTempC >= entry.minRoomTempC && roomTempC < entry.maxRoomTempC);
  return {
    ...match,
    underlayerItemIds: [...match.underlayerItemIds]
  };
}

export function applyGenericTogFallback(result, { profile, situation }) {
  if (!result || situation?.mode !== 'sleep' || !isFiniteNumber(situation.roomTempC) || result.status === 'blocked') {
    return result;
  }

  const selectedBag = profile?.sleepBagInventory?.find((bag) => bag.sleepBagId === situation.selectedSleepBagId) ?? null;
  if (selectedBag && hasMatchingManufacturerGuidance(selectedBag, situation.roomTempC)) {
    return result;
  }

  const generic = genericTogGuidanceForRoomTemp(situation.roomTempC);
  const selectedTog = isFiniteNumber(selectedBag?.tog) ? selectedBag.tog : null;
  const selectedTogMatches = selectedTog === null ? null : Math.abs(selectedTog - generic.recommendedTog) < 0.05;
  const guidance = {
    code: 'SLEEP_GENERIC_TOG_TABLE',
    source: 'generic_fallback',
    evidenceClass: generic.evidenceClass,
    roomTempC: situation.roomTempC,
    roomTempBand: generic.id,
    recommendedTog: generic.recommendedTog,
    recommendedUnderlayers: [...generic.underlayerItemIds],
    selectedTog,
    selectedTogMatches
  };

  const next = {
    ...result,
    guidance: [...(result.guidance ?? []), guidance],
    alternatives: [...(result.alternatives ?? [])],
    notices: [...(result.notices ?? [])],
    uncertainty: [...(result.uncertainty ?? [])],
    confidence: result.confidence ? { ...result.confidence, reasons: [...(result.confidence.reasons ?? [])] } : result.confidence
  };

  pushNotice(next, 'SLEEP_GENERIC_TOG_GUIDANCE_USED', 'caution', ['SLEEP_GENERIC_TOG_FALLBACK'], {
    recommendedTog: generic.recommendedTog,
    roomTempBand: generic.id
  });
  next.uncertainty.push('GENERIC_TOG_TABLE_IS_FALLBACK_HEURISTIC');

  if (selectedBag && selectedTogMatches) {
    next.alternatives.push({
      alternativeId: `generic_tog_${generic.id}`,
      phase: 'main',
      replacesItemIds: [],
      items: generic.underlayerItemIds.map((itemId) => ({
        itemId,
        quantity: 1,
        role: SLEEP_ITEM_ROLES[itemId] ?? 'base',
        reasonCodes: ['SLEEP_GENERIC_TOG_FALLBACK'],
        phase: 'main',
        wearPosition: 'on_body',
        optional: false
      })),
      reasonCodes: ['SLEEP_GENERIC_TOG_FALLBACK'],
      recommendedTog: generic.recommendedTog
    });
    next.confidence = {
      level: 'medium',
      reasons: ['GENERIC_TOG_TABLE_IS_FALLBACK_HEURISTIC']
    };
    next.explanation = `${result.explanation} Als generischer TOG-Fallback passen bei ${formatTemp(situation.roomTempC)} ungefähr ${generic.recommendedTog} TOG; die vorgeschlagene Unterkleidung ist als Alternative hinterlegt.`;
  } else if (selectedBag && selectedTog !== null) {
    pushNotice(next, 'SLEEP_SELECTED_TOG_OUTSIDE_GENERIC_RANGE', 'caution', ['SLEEP_GENERIC_TOG_MISMATCH'], {
      selectedTog,
      recommendedTog: generic.recommendedTog,
      roomTempBand: generic.id
    });
    next.confidence = {
      level: 'low',
      reasons: ['SELECTED_TOG_DIFFERS_FROM_GENERIC_GUIDANCE']
    };
    next.explanation = `${result.explanation} Die generische TOG-Tabelle würde für ${formatTemp(situation.roomTempC)} ungefähr ${generic.recommendedTog} TOG vorsehen; der ausgewählte Schlafsack hat ${selectedTog} TOG.`;
  } else if (selectedBag) {
    pushNotice(next, 'SLEEP_SELECTED_TOG_UNKNOWN', 'caution', ['SLEEP_GENERIC_TOG_CANNOT_COMPARE'], {
      recommendedTog: generic.recommendedTog,
      roomTempBand: generic.id
    });
  } else {
    next.explanation = `${result.explanation} Die generische TOG-Tabelle empfiehlt für ${formatTemp(situation.roomTempC)} ungefähr ${generic.recommendedTog} TOG.`;
  }

  next.uncertainty = [...new Set(next.uncertainty)];
  return next;
}

function row(id, minRoomTempC, maxRoomTempC, label, recommendedTog, underlayerItemIds, evidenceClass) {
  return Object.freeze({
    id,
    minRoomTempC,
    maxRoomTempC,
    label,
    recommendedTog,
    underlayerItemIds: Object.freeze([...underlayerItemIds]),
    evidenceClass
  });
}

function hasMatchingManufacturerGuidance(bag, roomTempC) {
  if (!Array.isArray(bag.guidanceBands)) return false;
  return bag.guidanceBands.some((band) => {
    const minOk = band.minRoomTempC == null || roomTempC >= band.minRoomTempC;
    const maxOk = band.maxRoomTempC == null || roomTempC < band.maxRoomTempC;
    return minOk && maxOk && Array.isArray(band.recommendedUnderlayers) && band.recommendedUnderlayers.length > 0;
  });
}

function pushNotice(result, code, severity, reasonCodes, data) {
  if (result.notices.some((notice) => notice.code === code)) return;
  result.notices.push({ code, severity, reasonCodes, data });
}

function formatTemp(value) {
  return `${Number.isInteger(value) ? value : value.toFixed(1)} °C`;
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}
