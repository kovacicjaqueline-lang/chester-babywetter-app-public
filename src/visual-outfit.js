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
      for (const themeId of candidateThemeIds) {
        if (!themeIds.has(themeId)) {
          throw new Error(`Visual variant ${id} references unknown theme ${themeId}`);
        }
      }

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

    groupsById[group.id] = Object.freeze({
      id: group.id,
      label: group.label || group.id,
      altText: group.altText || group.label || group.id,
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

function chooseTheme(catalog, sessionKey, styleTheme, themeId) {
  if (themeId != null) {
    const explicit = catalog.themes.find((theme) => theme.id === themeId);
    if (!explicit) throw new Error(`Unknown theme: ${themeId}`);
    return explicit;
  }
  return pickStable(catalog.themes, `${sessionKey}|theme|${styleTheme}`);
}

export function selectVisualVariant({ catalog, assetGroupId, themeId, styleTheme = 'neutral', seedKey }) {
  if (!PROFILE_STYLES.has(styleTheme)) {
    throw new Error(`Unknown styleTheme: ${styleTheme}`);
  }
  const group = catalog.groupsById[assetGroupId];
  if (!group || group.visualVariants.length === 0) {
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
  let usedFallback = false;

  if (pool.length === 0) {
    const fallback = group.visualVariants.find((variant) => variant.sourceStyle === catalog.fallbackSourceStyle)
      || group.visualVariants[0];
    pool = [{ variant: fallback, rank: normalizeStyleRank(fallback, styleTheme) }];
    usedFallback = true;
  } else {
    const bestRank = Math.min(...pool.map(({ rank }) => rank));
    pool = pool.filter(({ rank }) => rank <= bestRank + 1);
  }

  const chosen = pickStable(pool.map(({ variant }) => variant), `${seedKey}|${assetGroupId}|${themeId}`);
  const compatibleWithTheme = chosen.themeIds.includes(themeId);
  usedFallback ||= !compatibleWithTheme || chosen.sourceStyle === catalog.fallbackSourceStyle && themed.length === 0;

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
  const theme = chooseTheme(catalog, sessionKey, styleTheme, themeId);

  const items = recommendation.slots.map((slotResult) => {
    const itemId = slotResult?.selected?.itemId || null;
    const variant = itemId
      ? selectVisualVariant({ catalog, assetGroupId: itemId, themeId: theme.id, styleTheme, seedKey: sessionKey })
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

export function nextVisualSeed(visualSeed = 0) {
  if (Number.isSafeInteger(visualSeed)) return visualSeed + 1;
  return `${String(visualSeed)}:next`;
}
