const PROFILE_STYLES = new Set(['neutral', 'boy', 'girl']);

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

function normalizeStyleRank(profile, styleTheme) {
  const rank = profile.stylePreferenceRank?.[styleTheme];
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
    });
  });

  const sourceProfiles = visualManifest.sourceStyleProfiles || {};
  const fallbackSourceStyle = visualManifest.fallbackSourceStyle || 'neutral';
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

function themeOverlap(variant, theme) {
  const themePalette = new Set(theme.palette);
  return paletteTags(variant).filter((tag) => themePalette.has(tag)).length;
}

function stylePreferenceScore(variant, styleTheme) {
  const rank = normalizeStyleRank(variant, styleTheme);
  return rank >= 99 ? 0 : Math.max(0, 3 - rank);
}

function variantCandidates(group, theme, styleTheme) {
  const themed = group.visualVariants.filter((variant) => variant.themeIds.includes(theme.id));
  const candidates = themed.length > 0
    ? themed
    : group.visualVariants.filter((variant) => variant.isFallback)
      .concat(group.visualVariants.filter((variant) => !variant.isFallback));

  return candidates.map((variant) => ({
    variant,
    themed: themed.includes(variant),
    score: (themed.includes(variant) ? 100 : 0)
      + themeOverlap(variant, theme) * 4
      + stylePreferenceScore(variant, styleTheme)
      + (variant.isFallback ? 10 : 0)
  }));
}

function compareCandidates(left, right) {
  if (right.score !== left.score) return right.score - left.score;
  return left.variant.id.localeCompare(right.variant.id);
}

function chooseVariantsForTheme(catalog, itemIds, theme, styleTheme) {
  const state = {
    primaryTags: new Set(),
    patterns: new Set(),
    selected: []
  };

  const entries = itemIds.map((itemId, index) => ({
    itemId,
    index,
    group: catalog.groupsById[itemId]
  })).filter((entry) => entry.group);
  entries.sort((left, right) => itemWeight(right.group) - itemWeight(left.group) || left.index - right.index);

  for (const entry of entries) {
    const candidates = variantCandidates(entry.group, theme, styleTheme);
    candidates.sort(compareCandidates);
    let best = null;
    for (const candidate of candidates) {
      const variant = candidate.variant;
      const primaries = primaryPaletteTags(variant);
      const visiblePattern = !SUBTLE_PATTERNS.has(variant.pattern);
      const newPrimaryCount = primaries.filter((tag) => !state.primaryTags.has(tag)).length;
      const patternPenalty = visiblePattern && state.patterns.size > 0 ? 8 : 0;
      const primaryPenalty = newPrimaryCount > 1 ? 4 : newPrimaryCount === 1 && state.primaryTags.size > 0 ? 1 : 0;
      const neutralBonus = primaries.length === 0 ? 2 : 0;
      const repeatedAccentBonus = primaries.some((tag) => state.primaryTags.has(tag)) ? 2 : 0;
      const score = candidate.score + neutralBonus + repeatedAccentBonus - patternPenalty - primaryPenalty;
      const scored = { ...candidate, score };
      if (!best || scored.score > best.score || (scored.score === best.score && variant.id.localeCompare(best.variant.id) < 0)) {
        best = scored;
      }
    }

    const chosen = best || { variant: null, themed: false, score: 0 };
    if (chosen.variant) {
      for (const tag of primaryPaletteTags(chosen.variant)) state.primaryTags.add(tag);
      if (!SUBTLE_PATTERNS.has(chosen.variant.pattern)) state.patterns.add(chosen.variant.pattern);
    }
    state.selected.push({ ...entry, chosen });
  }

  const byIndex = new Map(state.selected.map((entry) => [entry.index, entry]));
  const selections = itemIds.map((itemId, index) => byIndex.get(index) || {
    itemId,
    index,
    group: catalog.groupsById[itemId] || null,
    chosen: { variant: null, themed: false, score: 0 }
  });
  const compositionScore = state.selected.reduce((sum, entry) => sum + entry.chosen.score * itemWeight(entry.group), 0);
  return { selections, compositionScore };
}

function scoreTheme(catalog, visualManifest, itemIds, theme, styleTheme) {
  const result = chooseVariantsForTheme(catalog, itemIds, theme, styleTheme);
  const coverage = result.selections.reduce((sum, entry) => {
    const weight = entry.group ? itemWeight(entry.group) : 0;
    return sum + (entry.chosen.themed ? weight : 0);
  }, 0);
  const styleBias = result.selections.reduce((sum, entry) => {
    const variant = entry.chosen.variant;
    return sum + (variant ? stylePreferenceScore(variant, styleTheme) * itemWeight(entry.group) : 0);
  }, 0);
  const preferredThemeIds = visualManifest.sourceStyleProfiles?.[styleTheme]?.themeIds;
  const themePreference = Array.isArray(preferredThemeIds) && preferredThemeIds.includes(theme.id) ? 25 : 0;
  return {
    theme,
    result,
    score: coverage * 100 + result.compositionScore + styleBias * 2 + themePreference,
    coverage
  };
}

function chooseTheme(catalog, visualManifest, sessionKey, styleTheme, themeId, itemIds) {
  if (themeId != null) {
    const explicit = catalog.themes.find((theme) => theme.id === themeId);
    if (!explicit) throw new Error(`Unknown theme: ${themeId}`);
    return explicit;
  }

  const scored = catalog.themes
    .map((theme) => scoreTheme(catalog, visualManifest, itemIds, theme, styleTheme))
    .sort((left, right) => right.score - left.score || left.theme.id.localeCompare(right.theme.id));
  const bestScore = scored[0]?.score;
  const tied = scored.filter((candidate) => candidate.score === bestScore);
  return pickStable(tied.map((candidate) => candidate.theme), `${sessionKey}|theme|${styleTheme}`);
}

export function selectVisualVariant({ catalog, assetGroupId, themeId, styleTheme = 'neutral', seedKey }) {
  if (!PROFILE_STYLES.has(styleTheme)) {
    throw new Error(`Unknown styleTheme: ${styleTheme}`);
  }
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

  const themed = group.visualVariants.filter((variant) => variant.themeIds.includes(themeId));
  const rankedThemed = themed
    .map((variant) => ({ variant, rank: normalizeStyleRank(variant, styleTheme) }))
    .filter(({ rank }) => rank < 99);

  let pool = rankedThemed;
  let bestRank = null;
  let usedFallback = false;

  if (pool.length === 0) {
    const fallback = group.visualVariants.find((variant) => variant.isFallback)
      || group.visualVariants[0];
    pool = [{ variant: fallback, rank: normalizeStyleRank(fallback, styleTheme) }];
    usedFallback = true;
  } else {
    bestRank = Math.min(...pool.map(({ rank }) => rank));
    pool = pool.filter(({ rank }) => rank <= bestRank + 1);
  }

  const weightedPool = styleTheme === 'neutral' || bestRank == null
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
  styleTheme = 'neutral',
  visualSeed = 0,
  themeId = null
}) {
  assertObject(recommendation, 'recommendation');
  if (!Array.isArray(recommendation.slots)) {
    throw new TypeError('recommendation.slots must be an array');
  }
  if (!PROFILE_STYLES.has(styleTheme)) {
    throw new Error(`Unknown styleTheme: ${styleTheme}`);
  }

  const catalog = buildVisualCatalog(assetManifest, visualManifest);
  const sessionAnchor = recommendation.sessionId || recommendation.recommendationId || recommendation.requestId || 'visual-session';
  const sessionKey = `${sessionAnchor}|${String(visualSeed)}`;
  const itemIds = recommendation.slots.map((slotResult) => slotResult?.selected?.itemId || null);
  const theme = chooseTheme(catalog, visualManifest, sessionKey, styleTheme, themeId, itemIds);
  const composition = chooseVariantsForTheme(catalog, itemIds, theme, styleTheme);

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
    styleTheme,
    themeId: theme.id,
    themeLabel: theme.label,
    themePalette: theme.palette,
    items: Object.freeze(items)
  });
}

export function composeOutfitVisuals({
  items,
  recommendation,
  assetManifest,
  visualManifest,
  styleTheme = 'neutral',
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
