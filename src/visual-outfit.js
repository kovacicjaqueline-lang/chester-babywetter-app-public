const PALETTE_MODES = new Set(['all', 'neutral', 'cool', 'warm']);
const LEGACY_STYLE_TO_PALETTE_MODE = Object.freeze({ neutral: 'all', boy: 'cool', girl: 'warm' });
const COMPOSITION_BEAM_WIDTH = 96;

function assertObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
}

function stableHash(input) {
  const text = String(input);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return hash >>> 0;
}

function pickStable(values, seedKey) {
  if (!values.length) return null;
  return values[stableHash(seedKey) % values.length];
}

function normalizePaletteMode(paletteMode, styleTheme) {
  if (paletteMode !== undefined && paletteMode !== null) {
    if (PALETTE_MODES.has(paletteMode)) return paletteMode;
    const legacyMode = LEGACY_STYLE_TO_PALETTE_MODE[paletteMode];
    if (legacyMode) return legacyMode;
    throw new Error(`Unknown paletteMode: ${paletteMode}`);
  }
  if (styleTheme !== undefined && styleTheme !== null) {
    const legacyMode = LEGACY_STYLE_TO_PALETTE_MODE[styleTheme];
    if (legacyMode) return legacyMode;
    if (PALETTE_MODES.has(styleTheme)) return styleTheme;
    throw new Error(`Unknown paletteMode: ${styleTheme}`);
  }
  return 'all';
}

function legacyVariantEntries(group) {
  if (group.variantPaths && typeof group.variantPaths === 'object') {
    return Object.entries(group.variantPaths)
      .filter(([, assetPath]) => typeof assetPath === 'string' && assetPath.length > 0)
      .map(([sourceStyle, assetPath]) => ({ sourceStyle, assetPath }));
  }

  if (typeof group.assetPath === 'string' && group.assetPath.length > 0) {
    const sourceStyle = Array.isArray(group.styleVariants) && group.styleVariants.length
      ? group.styleVariants[0]
      : 'neutral';
    return [{ sourceStyle, assetPath: group.assetPath }];
  }

  return [];
}

function normalizeStyleRank(profile, sourceStyle) {
  const rank = profile.stylePreferenceRank?.[sourceStyle];
  return Number.isInteger(rank) && rank >= 0 ? rank : 99;
}

function validateThemeIds(variantId, candidateThemeIds, themeIds) {
  for (const themeId of candidateThemeIds) {
    if (!themeIds.has(themeId)) {
      throw new Error(`Visual variant ${variantId} references unknown theme ${themeId}`);
    }
  }
}

export function buildVisualCatalog(assetManifest, visualManifest) {
  assertObject(assetManifest, 'assetManifest');
  assertObject(visualManifest, 'visualManifest');

  if (!Array.isArray(assetManifest.assetGroups)) {
    throw new TypeError('assetManifest.assetGroups must be an array');
  }
  if (!Array.isArray(visualManifest.themes) || visualManifest.themes.length === 0) {
    throw new TypeError('visualManifest.themes must be a non-empty array');
  }

  const themeIds = new Set();
  const themes = visualManifest.themes.map((theme) => {
    assertObject(theme, 'theme');
    if (!theme.id || themeIds.has(theme.id)) {
      throw new Error(`Theme id must be unique: ${theme.id || '<missing>'}`);
    }
    themeIds.add(theme.id);
    return Object.freeze({
      id: theme.id,
      label: theme.label || theme.id,
      palette: Object.freeze([...(theme.palette || [])]),
      colors: Object.freeze(Object.fromEntries(Object.entries(theme.colors || {}).map(([role, values]) => [role, Object.freeze([...(values || [])])])))
    });
  });

  const sourceProfiles = visualManifest.sourceStyleProfiles || {};
  const fallbackSourceStyle = visualManifest.fallbackSourceStyle || 'neutral';
  const paletteModeProfiles = visualManifest.paletteModeProfiles || {};
  const visualVariantIds = new Set();
  const groupsById = {};

  for (const group of assetManifest.assetGroups) {
    assertObject(group, 'assetGroup');
    if (!group.id || groupsById[group.id]) {
      throw new Error(`Asset group id must be unique: ${group.id || '<missing>'}`);
    }

    const overrides = visualManifest.assetOverrides?.[group.id] || {};
    const visualVariants = legacyVariantEntries(group).map(({ sourceStyle, assetPath }) => {
      const sourceProfile = sourceProfiles[sourceStyle] || sourceProfiles[fallbackSourceStyle] || {};
      const override = overrides[sourceStyle] || {};
      const id = `${group.id}::${sourceStyle}`;
      if (visualVariantIds.has(id)) {
        throw new Error(`Visual variant id must be unique: ${id}`);
      }
      visualVariantIds.add(id);

      const candidateThemeIds = override.themeIds || sourceProfile.themeIds || [];
      validateThemeIds(id, candidateThemeIds, themeIds);

      return Object.freeze({
        id,
        assetGroupId: group.id,
        sourceStyle,
        assetPath,
        themeIds: Object.freeze([...candidateThemeIds]),
        paletteTags: Object.freeze([...(override.paletteTags || sourceProfile.paletteTags || [])]),
        pattern: override.pattern || sourceProfile.pattern || 'unspecified',
        stylePreferenceRank: Object.freeze({ ...(sourceProfile.stylePreferenceRank || {}), ...(override.stylePreferenceRank || {}) }),
        isFallback: sourceStyle === fallbackSourceStyle
      });
    });

    const additionalDefinitions = visualManifest.additionalVariants?.[group.id] || [];
    if (!Array.isArray(additionalDefinitions)) {
      throw new TypeError(`additionalVariants.${group.id} must be an array`);
    }

    for (const additional of additionalDefinitions) {
      assertObject(additional, `additionalVariants.${group.id}`);
      if (!additional.id || typeof additional.assetPath !== 'string' || !additional.assetPath) {
        throw new Error(`Additional visual variant for ${group.id} needs id and assetPath`);
      }
      const sourceStyle = additional.sourceStyle || fallbackSourceStyle;
      const sourceProfile = sourceProfiles[sourceStyle] || sourceProfiles[fallbackSourceStyle] || {};
      const id = `${group.id}::${additional.id}`;
      if (visualVariantIds.has(id)) {
        throw new Error(`Visual variant id must be unique: ${id}`);
      }
      visualVariantIds.add(id);
      const candidateThemeIds = additional.themeIds || sourceProfile.themeIds || [];
      validateThemeIds(id, candidateThemeIds, themeIds);

      visualVariants.push(Object.freeze({
        id,
        assetGroupId: group.id,
        sourceStyle,
        assetPath: additional.assetPath,
        themeIds: Object.freeze([...candidateThemeIds]),
        paletteTags: Object.freeze([...(additional.paletteTags || sourceProfile.paletteTags || [])]),
        pattern: additional.pattern || sourceProfile.pattern || 'unspecified',
        stylePreferenceRank: Object.freeze({ ...(sourceProfile.stylePreferenceRank || {}), ...(additional.stylePreferenceRank || {}) }),
        isFallback: additional.isFallback === true
      }));
    }

    if (visualVariants.length > 0 && !visualVariants.some((variant) => variant.isFallback)) {
      throw new Error(`Asset group ${group.id} has no ${fallbackSourceStyle} fallback variant`);
    }

    groupsById[group.id] = Object.freeze({
      id: group.id,
      label: group.label || group.id,
      altText: group.altText || group.label || group.id,
      category: group.category || null,
      slot: group.slot || null,
      visualVariants: Object.freeze(visualVariants)
    });
  }

  return Object.freeze({
    schemaVersion: visualManifest.schemaVersion || 1,
    fallbackSourceStyle,
    sourceStyleProfiles: Object.freeze(Object.fromEntries(Object.entries(sourceProfiles).map(([style, profile]) => [style, Object.freeze({
      themeIds: Object.freeze([...(profile.themeIds || [])]),
      stylePreferenceRank: Object.freeze({ ...(profile.stylePreferenceRank || {}) })
    })]))),
    paletteModeProfiles: Object.freeze(Object.fromEntries(Object.entries(paletteModeProfiles).map(([mode, profile]) => [mode, Object.freeze({
      themeIds: Object.freeze([...(profile.themeIds || [])]),
      sourceStyleRank: Object.freeze({ ...(profile.sourceStyleRank || {}) })
    })]))),
    themes: Object.freeze(themes),
    groupsById: Object.freeze(groupsById),
    visualVariantCount: visualVariantIds.size
  });
}

const NEUTRAL_PALETTE_TAGS = new Set([
  'cream', 'oat', 'sand', 'greige', 'warm_beige', 'taupe', 'light_neutral', 'neutral', 'white', 'beige'
]);

const SUBTLE_PATTERNS = new Set(['unspecified', 'solid', 'fine_rib', 'fine_knit', 'micro_texture', 'micro_quilt']);

function itemWeight(group) {
  const value = `${group?.slot || ''} ${group?.category || ''} ${group?.id || ''}`.toLowerCase();
  if (/overall/.test(value)) return 10;
  if (/jacket|outer|rain|footmuff|cover/.test(value)) return 9;
  if (/sweater|sweatshirt|fleece|midlayer|pullover/.test(value)) return 7;
  if (/trouser|legging|tights|pants|legs/.test(value)) return 6;
  if (/body|shirt|torso|base/.test(value)) return 4;
  if (/shoe|footwear/.test(value)) return 3;
  if (/hat|cap|head/.test(value)) return 2;
  if (/sock|glove|mitten|hand/.test(value)) return 1;
  return 3;
}

function paletteTags(variant) {
  return variant.paletteTags.filter((tag) => typeof tag === 'string');
}

function primaryPaletteTags(variant) {
  return paletteTags(variant).filter((tag) => !NEUTRAL_PALETTE_TAGS.has(tag));
}

function paletteModeProfile(catalog, visualManifest, paletteMode) {
  const configured = catalog.paletteModeProfiles?.[paletteMode];
  if (configured) return configured;
  const sourceStyleProfiles = visualManifest.sourceStyleProfiles || catalog.sourceStyleProfiles || {};
  const legacy = sourceStyleProfiles?.[paletteMode]
    || sourceStyleProfiles?.neutral
    || {};
  return {
    themeIds: Array.isArray(legacy.themeIds) ? legacy.themeIds : catalog.themes.map((theme) => theme.id),
    sourceStyleRank: { ...(legacy.stylePreferenceRank || {}) }
  };
}

function sourceStyleRank(variant, profile) {
  const configuredRank = profile.sourceStyleRank?.[variant.sourceStyle];
  if (Number.isInteger(configuredRank) && configuredRank >= 0) return configuredRank;
  return normalizeStyleRank(variant, variant.sourceStyle);
}

function stylePreferenceScore(variant, profile) {
  const rank = sourceStyleRank(variant, profile);
  return rank >= 99 ? 0 : Math.max(0, 3 - rank);
}

function themeRoleScore(variant, theme) {
  const colors = theme.colors || {};
  return paletteTags(variant).reduce((sum, tag) => {
    if (colors.primary?.includes(tag)) return sum + 6;
    if (colors.secondary?.includes(tag)) return sum + 3;
    if (colors.neutral?.includes(tag)) return sum + 1;
    return sum;
  }, 0);
}

function roleTags(variant, theme, role) {
  const roleColors = new Set(theme.colors?.[role] || []);
  return paletteTags(variant).filter((tag) => roleColors.has(tag));
}

function variantCandidates(group, theme, paletteMode, catalog, visualManifest) {
  const profile = paletteModeProfile(catalog, visualManifest, paletteMode);
  const rankedSources = Object.keys(profile.sourceStyleRank || {});
  const eligible = rankedSources.length > 0
    ? group.visualVariants.filter((variant) => rankedSources.includes(variant.sourceStyle))
    : group.visualVariants;
  const themed = eligible.filter((variant) => variant.themeIds.includes(theme.id));
  const rankedThemed = themed
    .map((variant) => ({ variant, rank: sourceStyleRank(variant, profile) }))
    .filter(({ rank }) => rank < 99);
  const bestRank = rankedThemed.length > 0
    ? Math.min(...rankedThemed.map(({ rank }) => rank))
    : null;
  const compatibleThemed = bestRank == null
    ? []
    : rankedThemed
      .filter(({ rank }) => rank <= bestRank + 1)
      .map(({ variant }) => variant);
  const fallbackPool = eligible.filter((variant) => variant.isFallback);
  const candidates = compatibleThemed.length > 0
    ? compatibleThemed
      : fallbackPool.length > 0
      ? fallbackPool
      : group.visualVariants;

  return candidates.map((variant) => ({
    variant,
    themed: themed.includes(variant),
    score: (themed.includes(variant) ? 100 : 0)
      + themeRoleScore(variant, theme)
      + stylePreferenceScore(variant, profile) * 4
      - (!themed.includes(variant) && variant.isFallback ? 25 : 0)
  }));
}

function compareCandidates(left, right) {
  if (right.score !== left.score) return right.score - left.score;
  return left.variant.id.localeCompare(right.variant.id);
}

function scoreVariantInComposition(candidate, theme, paletteMode, state) {
  const primaries = roleTags(candidate.variant, theme, 'primary');
  const secondaries = roleTags(candidate.variant, theme, 'secondary');
  const neutrals = roleTags(candidate.variant, theme, 'neutral');
  const newPrimaryCount = primaries.filter((tag) => !state.primaryTags.has(tag)).length;
  const patternPenalty = !SUBTLE_PATTERNS.has(candidate.variant.pattern) && state.patterns.size > 0 ? 12 : 0;
  const primaryPenalty = newPrimaryCount > 1 ? 5 : newPrimaryCount === 1 && state.primaryTags.size > 0 ? 2 : 0;
  const neutralBonus = paletteMode === 'neutral' && primaries.length === 0 ? 4 : 0;
  const repeatedAccentBonus = primaries.some((tag) => state.primaryTags.has(tag)) ? 4 : 0;
  const secondarySupportBonus = secondaries.some((tag) => state.secondaryTags.has(tag)) ? 3 : 0;
  const neutralSupportBonus = neutrals.length > 0 && state.primaryTags.size > 0 ? 2 : 0;
  return candidate.score + neutralBonus + repeatedAccentBonus + secondarySupportBonus + neutralSupportBonus - patternPenalty - primaryPenalty;
}

function compositionSignature(selected) {
  return selected.map((entry) => entry.chosen?.variant?.id || '').join('|');
}

function compareCompositionStates(left, right) {
  if (right.score !== left.score) return right.score - left.score;
  return compositionSignature(left.selected).localeCompare(compositionSignature(right.selected));
}

function chooseVariantsForTheme(catalog, visualManifest, itemIds, theme, paletteMode, forcedVariantIds = new Map()) {
  const entries = itemIds.map((itemId, index) => ({
    itemId,
    index,
    group: catalog.groupsById[itemId]
  })).filter((entry) => entry.group);
  entries.sort((left, right) => itemWeight(right.group) - itemWeight(left.group) || left.index - right.index);

  let beam = [{ primaryTags: new Set(), secondaryTags: new Set(), patterns: new Set(), selected: [], score: 0 }];
  for (const entry of entries) {
    let candidates = variantCandidates(entry.group, theme, paletteMode, catalog, visualManifest).sort(compareCandidates);
    const forcedId = forcedVariantIds.get(entry.index);
    if (forcedId) candidates = candidates.filter((candidate) => candidate.variant.id === forcedId);
    const expanded = [];
    for (const state of beam) {
      for (const candidate of candidates) {
        const score = scoreVariantInComposition(candidate, theme, paletteMode, state);
        const next = {
          primaryTags: new Set(state.primaryTags),
          secondaryTags: new Set(state.secondaryTags),
          patterns: new Set(state.patterns),
          selected: [...state.selected, { ...entry, chosen: { ...candidate, score } }],
          score: state.score + score * itemWeight(entry.group)
        };
        for (const tag of roleTags(candidate.variant, theme, 'primary')) next.primaryTags.add(tag);
        for (const tag of roleTags(candidate.variant, theme, 'secondary')) next.secondaryTags.add(tag);
        if (!SUBTLE_PATTERNS.has(candidate.variant.pattern)) next.patterns.add(candidate.variant.pattern);
        expanded.push(next);
      }
    }
    expanded.sort(compareCompositionStates);
    beam = expanded.slice(0, COMPOSITION_BEAM_WIDTH);
  }

  const state = beam[0] || { selected: [], score: 0 };
  const byIndex = new Map(state.selected.map((entry) => [entry.index, entry]));
  const selections = itemIds.map((itemId, index) => byIndex.get(index) || {
    itemId,
    index,
    group: catalog.groupsById[itemId] || null,
    chosen: { variant: null, themed: false, score: 0 }
  });
  return { selections, compositionScore: state.score };
}

function scoreTheme(catalog, visualManifest, itemIds, theme, paletteMode) {
  const result = chooseVariantsForTheme(catalog, visualManifest, itemIds, theme, paletteMode);
  return scoreComposition(catalog, visualManifest, itemIds, theme, paletteMode, result);
}

function scoreComposition(catalog, visualManifest, itemIds, theme, paletteMode, result) {
  const coverage = result.selections.reduce((sum, entry) => {
    const weight = entry.group ? itemWeight(entry.group) : 0;
    return sum + (entry.chosen.themed ? weight : 0);
  }, 0);
  const styleBias = result.selections.reduce((sum, entry) => {
    const variant = entry.chosen.variant;
    const profile = paletteModeProfile(catalog, visualManifest, paletteMode);
    return sum + (variant ? stylePreferenceScore(variant, profile) * itemWeight(entry.group) : 0);
  }, 0);
  const preferredThemeIds = paletteModeProfile(catalog, visualManifest, paletteMode).themeIds;
  const themePreference = Array.isArray(preferredThemeIds) && preferredThemeIds.includes(theme.id) ? 25 : 0;
  return {
    theme,
    result,
    score: coverage * 100 + result.compositionScore + styleBias * 2 + themePreference,
    coverage
  };
}

function scoredThemes(catalog, visualManifest, paletteMode, themeId, itemIds) {
  if (themeId != null) {
    const explicit = catalog.themes.find((theme) => theme.id === themeId);
    if (!explicit) throw new Error(`Unknown theme: ${themeId}`);
    return [scoreTheme(catalog, visualManifest, itemIds, explicit, paletteMode)];
  }

  const configuredThemeIds = paletteModeProfile(catalog, visualManifest, paletteMode).themeIds;
  const preferredThemes = Array.isArray(configuredThemeIds) && configuredThemeIds.length
    ? catalog.themes.filter((theme) => configuredThemeIds.includes(theme.id))
    : [];
  const themesToScore = preferredThemes.length > 0 ? preferredThemes : catalog.themes;
  return themesToScore
    .map((theme) => scoreTheme(catalog, visualManifest, itemIds, theme, paletteMode))
    .sort((left, right) => right.score - left.score || left.theme.id.localeCompare(right.theme.id));
}

function visibleCompositionSignature(result) {
  return result.selections
    .map((entry) => entry.chosen.variant?.assetPath || '')
    .join('\u001f');
}

function buildLookCandidates(catalog, visualManifest, itemIds, paletteMode, themeId) {
  const candidates = [];
  const signatures = new Set();
  const themes = scoredThemes(catalog, visualManifest, paletteMode, themeId, itemIds);

  function addCandidate(theme, result) {
    const signature = visibleCompositionSignature(result);
    if (signatures.has(signature)) return;
    signatures.add(signature);
    const scored = scoreComposition(catalog, visualManifest, itemIds, theme, paletteMode, result);
    candidates.push({ ...scored, signature });
  }

  for (const scoredTheme of themes) {
    addCandidate(scoredTheme.theme, scoredTheme.result);
  }

  if (themeId != null) return candidates;

  // Complete theme compositions are the most coherent look cycle. Only fan out
  // individual item variants when the available themes render identically.
  if (candidates.length > 1) return candidates;

  for (const scoredTheme of themes) {
    for (const selection of scoredTheme.result.selections) {
      if (!selection.group) continue;
      const alternatives = variantCandidates(selection.group, scoredTheme.theme, paletteMode, catalog, visualManifest)
        .sort(compareCandidates);
      for (const alternative of alternatives) {
        if (alternative.variant.id === selection.chosen.variant?.id) continue;
        const result = chooseVariantsForTheme(
          catalog,
          visualManifest,
          itemIds,
          scoredTheme.theme,
          paletteMode,
          new Map([[selection.index, alternative.variant.id]])
        );
        addCandidate(scoredTheme.theme, result);
      }
    }
  }
  return candidates;
}

function normalizedSeedOffset(visualSeed, candidateCount) {
  if (Number.isSafeInteger(visualSeed)) {
    return ((visualSeed % candidateCount) + candidateCount) % candidateCount;
  }
  return stableHash(String(visualSeed)) % candidateCount;
}

export function selectVisualVariant({ catalog, assetGroupId, themeId, paletteMode, styleTheme, seedKey }) {
  const normalizedPaletteMode = normalizePaletteMode(paletteMode, styleTheme);
  const group = catalog.groupsById[assetGroupId];
  if (!group) {
    throw new Error(`Unknown asset group: ${assetGroupId}`);
  }
  if (group.visualVariants.length === 0) {
    return Object.freeze({
      variantId: null,
      assetPath: null,
      sourceStyle: null,
      paletteTags: Object.freeze([]),
      pattern: null,
      usedFallback: false,
      compatibleWithTheme: true
    });
  }

  const profile = paletteModeProfile(catalog, { sourceStyleProfiles: {} }, normalizedPaletteMode);
  const rankedSources = Object.keys(profile.sourceStyleRank || {});
  const eligible = rankedSources.length > 0
    ? group.visualVariants.filter((variant) => rankedSources.includes(variant.sourceStyle))
    : group.visualVariants;
  const themed = eligible.filter((variant) => variant.themeIds.includes(themeId));
  const rankedThemed = themed
    .map((variant) => ({ variant, rank: sourceStyleRank(variant, profile) }))
    .filter(({ rank }) => rank < 99);

  let pool = rankedThemed;
  let bestRank = null;
  let usedFallback = false;

  if (pool.length === 0) {
    const fallback = eligible.find((variant) => variant.isFallback)
      || group.visualVariants.find((variant) => variant.isFallback)
      || group.visualVariants[0];
    pool = [{ variant: fallback, rank: sourceStyleRank(fallback, profile) }];
    usedFallback = true;
  } else {
    bestRank = Math.min(...pool.map(({ rank }) => rank));
    pool = pool.filter(({ rank }) => normalizedPaletteMode === 'all' ? rank <= bestRank + 1 : rank === bestRank);
  }

  const weightedPool = normalizedPaletteMode === 'neutral' || bestRank == null
    ? pool.map(({ variant }) => variant)
    : pool.flatMap(({ variant, rank }) => rank === bestRank ? [variant, variant] : [variant]);
  const chosen = pickStable(weightedPool, `${seedKey}|${assetGroupId}|${themeId}`);
  const compatibleWithTheme = chosen.themeIds.includes(themeId);
  usedFallback ||= !compatibleWithTheme || chosen.isFallback && themed.length === 0;

  return Object.freeze({
    variantId: chosen.id,
    assetPath: chosen.assetPath,
    sourceStyle: chosen.sourceStyle,
    paletteTags: chosen.paletteTags,
    pattern: chosen.pattern,
    usedFallback,
    compatibleWithTheme
  });
}

export function selectVisualLook({
  recommendation,
  assetManifest,
  visualManifest,
  paletteMode,
  styleTheme,
  visualSeed = 0,
  themeId = null
}) {
  assertObject(recommendation, 'recommendation');
  if (!Array.isArray(recommendation.slots)) {
    throw new TypeError('recommendation.slots must be an array');
  }
  const normalizedPaletteMode = normalizePaletteMode(paletteMode, styleTheme);

  const catalog = buildVisualCatalog(assetManifest, visualManifest);
  const itemIds = recommendation.slots.map((slotResult) => slotResult?.selected?.itemId || null);
  const lookCandidates = buildLookCandidates(catalog, visualManifest, itemIds, normalizedPaletteMode, themeId);
  const lookIndex = normalizedSeedOffset(visualSeed, lookCandidates.length);
  const selectedLook = lookCandidates[lookIndex];
  const theme = selectedLook.theme;
  const composition = selectedLook.result;

  const items = recommendation.slots.map((slotResult, index) => {
    const itemId = slotResult?.selected?.itemId || null;
    const selected = composition.selections[index];
    const chosen = selected?.chosen?.variant;
    const variant = chosen
      ? {
        variantId: chosen.id,
        assetPath: chosen.assetPath,
        sourceStyle: chosen.sourceStyle,
        paletteTags: chosen.paletteTags,
        pattern: chosen.pattern,
        usedFallback: !selected.chosen.themed,
        compatibleWithTheme: selected.chosen.themed
      }
      : { variantId: null, assetPath: null, sourceStyle: null, paletteTags: Object.freeze([]), pattern: null, usedFallback: false, compatibleWithTheme: true };

    return Object.freeze({
      phase: slotResult.phase,
      slot: slotResult.slot,
      itemId,
      themeId: theme.id,
      ...variant
    });
  });

  return Object.freeze({
    recommendationId: recommendation.recommendationId || null,
    sessionId: recommendation.sessionId || null,
    visualSeed,
    paletteMode: normalizedPaletteMode,
    styleTheme: normalizedPaletteMode,
    themeId: theme.id,
    themeLabel: theme.label,
    themePalette: theme.palette,
    themeColors: theme.colors,
    lookIndex,
    availableLookCount: lookCandidates.length,
    hasAlternateLook: lookCandidates.length > 1,
    items: Object.freeze(items)
  });
}

export function composeOutfitVisuals({
  items,
  recommendation,
  assetManifest,
  visualManifest,
  paletteMode,
  styleTheme,
  visualSeed = 0,
  themeId = null
}) {
  const resolvedRecommendation = recommendation || {
    recommendationId: null,
    sessionId: null,
    slots: (items || []).map((item, index) => ({
      phase: item?.phase || 'main',
      slot: item?.slot || `item_${index}`,
      selected: { itemId: typeof item === 'string' ? item : item?.itemId || null }
    }))
  };
  return selectVisualLook({
    recommendation: resolvedRecommendation,
    assetManifest,
    visualManifest,
    paletteMode,
    styleTheme,
    visualSeed,
    themeId
  });
}

export function nextVisualSeed(visualSeed = 0) {
  if (Number.isSafeInteger(visualSeed)) {
    return visualSeed < Number.MAX_SAFE_INTEGER ? visualSeed + 1 : 0;
  }
  return `${String(visualSeed)}:next`;
}
