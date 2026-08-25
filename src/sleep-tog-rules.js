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

/**
 * Structured sleep-bag decision for consumers/UI.
 * Manufacturer guidance wins; otherwise the generic TOG table is used.
 */
export function sleepBagRecommendationFor({ profile, situation }) {
  if (situation?.mode !== 'sleep' || !isFiniteNumber(situation.roomTempC)) {
    return null;
  }

  const inventory = Array.isArray(profile?.sleepBagInventory) ? profile.sleepBagInventory : [];
  const selectedBag = inventory.find((bag) => bag.sleepBagId === situation.selectedSleepBagId) ?? null;
  const generic = genericTogGuidanceForRoomTemp(situation.roomTempC);

  if (selectedBag && hasMatchingManufacturerGuidance(selectedBag, situation.roomTempC)) {
    return {
      action: 'keep',
      basis: 'manufacturer_guidance',
      targetTog: selectedBag.tog ?? null,
      currentSleepBagId: selectedBag.sleepBagId,
      inventoryOption: sleepBagOption(selectedBag, situation.roomTempC, generic),
      genericTarget: genericTarget(generic)
    };
  }

  const selectedTog = isFiniteNumber(selectedBag?.tog) ? selectedBag.tog : null;
  const selectedMatchesGeneric = selectedTog !== null && togMatches(selectedTog, generic.recommendedTog);
  if (selectedBag && selectedMatchesGeneric) {
    return {
      action: 'keep',
      basis: 'generic_tog',
      targetTog: generic.recommendedTog,
      currentSleepBagId: selectedBag.sleepBagId,
      inventoryOption: sleepBagOption(selectedBag, situation.roomTempC, generic),
      genericTarget: genericTarget(generic)
    };
  }

  const replacement = findBestInventorySleepBag(
    inventory,
    selectedBag?.sleepBagId ?? null,
    situation.roomTempC,
    generic
  );

  return {
    action: selectedBag ? 'replace' : 'select',
    basis: replacement?.matchBasis ?? 'generic_target',
    targetTog: replacement?.tog ?? generic.recommendedTog,
    currentSleepBagId: selectedBag?.sleepBagId ?? null,
    inventoryOption: replacement,
    genericTarget: genericTarget(generic)
  };
}

export function applyGenericTogFallback(result, { profile, situation }) {
  if (!result || situation?.mode !== 'sleep' || !isFiniteNumber(situation.roomTempC) || result.status === 'blocked') {
    return result;
  }

  const inventory = Array.isArray(profile?.sleepBagInventory) ? profile.sleepBagInventory : [];
  const selectedBag = inventory.find((bag) => bag.sleepBagId === situation.selectedSleepBagId) ?? null;
  const sleepBagRecommendation = sleepBagRecommendationFor({ profile, situation });

  if (selectedBag && hasMatchingManufacturerGuidance(selectedBag, situation.roomTempC)) {
    return {
      ...result,
      guidance: [...(result.guidance ?? []), {
        code: 'SLEEP_BAG_RECOMMENDATION',
        source: 'manufacturer_guidance',
        ...sleepBagRecommendation
      }]
    };
  }

  const generic = genericTogGuidanceForRoomTemp(situation.roomTempC);
  const selectedTog = isFiniteNumber(selectedBag?.tog) ? selectedBag.tog : null;
  const selectedTogMatches = selectedTog === null ? null : togMatches(selectedTog, generic.recommendedTog);
  const guidance = {
    code: 'SLEEP_GENERIC_TOG_TABLE',
    source: 'generic_fallback',
    evidenceClass: generic.evidenceClass,
    roomTempC: situation.roomTempC,
    roomTempBand: generic.id,
    recommendedTog: generic.recommendedTog,
    recommendedUnderlayers: [...generic.underlayerItemIds],
    selectedTog,
    selectedTogMatches,
    sleepBagRecommendation
  };

  const next = {
    ...result,
    guidance: [...(result.guidance ?? []), guidance, {
      code: 'SLEEP_BAG_RECOMMENDATION',
      source: sleepBagRecommendation?.basis ?? 'generic_target',
      ...sleepBagRecommendation
    }],
    alternatives: [...(result.alternatives ?? [])],
    notices: [...(result.notices ?? [])],
    uncertainty: [...(result.uncertainty ?? [])],
    confidence: result.confidence
      ? { ...result.confidence, reasons: [...(result.confidence.reasons ?? [])] }
      : result.confidence
  };

  pushNotice(next, 'SLEEP_GENERIC_TOG_GUIDANCE_USED', 'caution', ['SLEEP_GENERIC_TOG_FALLBACK'], {
    recommendedTog: generic.recommendedTog,
    roomTempBand: generic.id
  });
  next.uncertainty.push('GENERIC_TOG_TABLE_IS_FALLBACK_HEURISTIC');

  if (selectedBag && selectedTogMatches) {
    next.alternatives.push(genericUnderlayerAlternative(generic));
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
    addSleepBagSwapAlternative(next, sleepBagRecommendation, generic);

    if (sleepBagRecommendation?.inventoryOption) {
      pushNotice(next, 'SLEEP_BAG_SWAP_RECOMMENDED', 'info', ['SLEEP_BAG_BETTER_MATCH_AVAILABLE'], {
        currentSleepBagId: selectedBag.sleepBagId,
        recommendedSleepBagId: sleepBagRecommendation.inventoryOption.sleepBagId,
        recommendedTog: sleepBagRecommendation.inventoryOption.tog
      });
      next.explanation = `${result.explanation} Die generische TOG-Tabelle würde für ${formatTemp(situation.roomTempC)} ungefähr ${generic.recommendedTog} TOG vorsehen; statt des ausgewählten Schlafsacks kann „${sleepBagRecommendation.inventoryOption.label}“ aus dem Bestand verwendet werden.`;
    } else {
      pushNotice(next, 'SLEEP_BAG_SWAP_TARGET_TOG', 'info', ['SLEEP_BAG_TARGET_TOG'], {
        currentSleepBagId: selectedBag.sleepBagId,
        recommendedTog: generic.recommendedTog
      });
      next.explanation = `${result.explanation} Die generische TOG-Tabelle würde für ${formatTemp(situation.roomTempC)} ungefähr ${generic.recommendedTog} TOG vorsehen; ein Schlafsack mit diesem Ziel-TOG ist als Austauschoption hinterlegt.`;
    }
  } else if (selectedBag) {
    pushNotice(next, 'SLEEP_SELECTED_TOG_UNKNOWN', 'caution', ['SLEEP_GENERIC_TOG_CANNOT_COMPARE'], {
      recommendedTog: generic.recommendedTog,
      roomTempBand: generic.id
    });
    addSleepBagSwapAlternative(next, sleepBagRecommendation, generic);
  } else {
    addSleepBagSwapAlternative(next, sleepBagRecommendation, generic);

    if (sleepBagRecommendation?.inventoryOption) {
      pushNotice(next, 'SLEEP_BAG_SELECTION_RECOMMENDED', 'info', ['SLEEP_BAG_MATCH_AVAILABLE'], {
        recommendedSleepBagId: sleepBagRecommendation.inventoryOption.sleepBagId,
        recommendedTog: sleepBagRecommendation.inventoryOption.tog
      });
      next.explanation = `${result.explanation} Aus dem hinterlegten Bestand passt „${sleepBagRecommendation.inventoryOption.label}“ für ${formatTemp(situation.roomTempC)} am besten.`;
    } else {
      pushNotice(next, 'SLEEP_BAG_SWAP_TARGET_TOG', 'info', ['SLEEP_BAG_TARGET_TOG'], {
        currentSleepBagId: null,
        recommendedTog: generic.recommendedTog
      });
      next.explanation = `${result.explanation} Die generische TOG-Tabelle empfiehlt für ${formatTemp(situation.roomTempC)} ungefähr ${generic.recommendedTog} TOG; dieser Ziel-TOG ist als Schlafsackoption hinterlegt.`;
    }
  }

  next.uncertainty = [...new Set(next.uncertainty)];
  return next;
}

function findBestInventorySleepBag(inventory, selectedSleepBagId, roomTempC, generic) {
  const candidates = inventory
    .filter((bag) => bag?.sleepBagId && bag.sleepBagId !== selectedSleepBagId)
    .map((bag) => ({ bag, option: sleepBagOption(bag, roomTempC, generic) }))
    .filter(({ option }) => option.matchBasis !== 'none')
    .sort((a, b) => sleepBagScore(a.option, generic) - sleepBagScore(b.option, generic));

  return candidates[0]?.option ?? null;
}

function sleepBagOption(bag, roomTempC, generic) {
  const manufacturerBand = matchingManufacturerGuidance(bag, roomTempC);
  const hasManufacturerMatch = Boolean(manufacturerBand);
  const tog = isFiniteNumber(bag?.tog) ? bag.tog : null;
  const genericMatch = tog !== null && togMatches(tog, generic.recommendedTog);
  const matchBasis = hasManufacturerMatch ? 'manufacturer_guidance' : genericMatch ? 'generic_tog' : 'none';
  const underlayers = hasManufacturerMatch
    ? [...manufacturerBand.recommendedUnderlayers]
    : genericMatch
      ? [...generic.underlayerItemIds]
      : [];

  return {
    sleepBagId: bag.sleepBagId,
    label: bag.label ?? bag.sleepBagId,
    tog,
    manufacturer: bag.manufacturer ?? null,
    matchBasis,
    recommendedUnderlayers: underlayers
  };
}

function sleepBagScore(option, generic) {
  if (option.matchBasis === 'manufacturer_guidance') return 0;
  if (option.matchBasis === 'generic_tog') {
    return 10 + Math.abs((option.tog ?? generic.recommendedTog) - generic.recommendedTog);
  }
  return 1000;
}

function genericTarget(generic) {
  return {
    recommendedTog: generic.recommendedTog,
    roomTempBand: generic.id,
    recommendedUnderlayers: [...generic.underlayerItemIds]
  };
}

function addSleepBagSwapAlternative(result, recommendation, generic) {
  if (!recommendation || recommendation.action === 'keep') return;

  if (recommendation.inventoryOption) {
    const option = recommendation.inventoryOption;
    result.alternatives.push({
      alternativeId: `sleep_bag_${recommendation.action}_${option.sleepBagId}`,
      phase: 'main',
      replacesItemIds: recommendation.currentSleepBagId ? [recommendation.currentSleepBagId] : [],
      items: [dynamicSleepBagItem(option), ...option.recommendedUnderlayers.map(sleepUnderlayerItem)],
      reasonCodes: [
        option.matchBasis === 'manufacturer_guidance'
          ? 'SLEEP_BAG_MANUFACTURER_MATCH'
          : 'SLEEP_BAG_GENERIC_TOG_MATCH'
      ],
      recommendedTog: option.tog,
      sleepBagOption: { ...option }
    });
    return;
  }

  result.alternatives.push({
    alternativeId: `sleep_bag_${recommendation.action}_target_${String(generic.recommendedTog).replace('.', '_')}_tog`,
    phase: 'main',
    replacesItemIds: recommendation.currentSleepBagId ? [recommendation.currentSleepBagId] : [],
    items: generic.underlayerItemIds.map(sleepUnderlayerItem),
    reasonCodes: ['SLEEP_BAG_GENERIC_TARGET_TOG'],
    recommendedTog: generic.recommendedTog,
    sleepBagOption: {
      sleepBagId: null,
      label: `${generic.recommendedTog} TOG Schlafsack`,
      tog: generic.recommendedTog,
      manufacturer: null,
      matchBasis: 'generic_target',
      recommendedUnderlayers: [...generic.underlayerItemIds]
    }
  });
}

function genericUnderlayerAlternative(generic) {
  return {
    alternativeId: `generic_tog_${generic.id}`,
    phase: 'main',
    replacesItemIds: [],
    items: generic.underlayerItemIds.map(sleepUnderlayerItem),
    reasonCodes: ['SLEEP_GENERIC_TOG_FALLBACK'],
    recommendedTog: generic.recommendedTog
  };
}

function dynamicSleepBagItem(option) {
  return {
    itemId: option.sleepBagId,
    quantity: 1,
    role: 'external',
    reasonCodes: ['SLEEP_BAG_SWAP_OPTION'],
    phase: 'main',
    wearPosition: 'external',
    optional: false
  };
}

function sleepUnderlayerItem(itemId) {
  return {
    itemId,
    quantity: 1,
    role: SLEEP_ITEM_ROLES[itemId] ?? 'base',
    reasonCodes: ['SLEEP_GENERIC_TOG_FALLBACK'],
    phase: 'main',
    wearPosition: 'on_body',
    optional: false
  };
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

function matchingManufacturerGuidance(bag, roomTempC) {
  if (!Array.isArray(bag?.guidanceBands)) return null;
  return bag.guidanceBands.find((band) => {
    const minOk = band.minRoomTempC == null || roomTempC >= band.minRoomTempC;
    const maxOk = band.maxRoomTempC == null || roomTempC < band.maxRoomTempC;
    return minOk && maxOk && Array.isArray(band.recommendedUnderlayers) && band.recommendedUnderlayers.length > 0;
  }) ?? null;
}

function hasMatchingManufacturerGuidance(bag, roomTempC) {
  return Boolean(matchingManufacturerGuidance(bag, roomTempC));
}

function togMatches(actual, target) {
  return Math.abs(actual - target) < 0.05;
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
