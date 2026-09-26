import { selectVisualLook } from '../src/visual-outfit.js';
import { visualPartsForItem, visualRecommendationFor } from './sleep-visual-parts.js';

const ROOT_URL = new URL('../', import.meta.url);
const MANIFEST_URL = new URL('../assets/clothing/manifest.json', import.meta.url);
const VISUAL_MANIFEST_URL = new URL('../assets/clothing/visual-manifest.json', import.meta.url);
const PALETTE_MODES = new Set(['all', 'neutral', 'cool', 'warm']);
const LEGACY_STYLE_TO_PALETTE_MODE = Object.freeze({ neutral: 'all', boy: 'cool', girl: 'warm' });

function normalizePaletteMode(paletteMode) {
  if (PALETTE_MODES.has(paletteMode)) return paletteMode;
  return LEGACY_STYLE_TO_PALETTE_MODE[paletteMode] ?? 'all';
}

function rootAssetUrl(path) {
  return new URL(path.replace(/^\//, ''), ROOT_URL).href;
}

function variantPath(group, paletteMode) {
  if (group.variantPaths && typeof group.variantPaths === 'object') {
    return group.variantPaths[paletteMode]
      ?? group.variantPaths.neutral
      ?? Object.values(group.variantPaths).find(Boolean)
      ?? null;
  }
  return typeof group.assetPath === 'string' ? group.assetPath : null;
}

function selectCatalogVisualVariant(group, paletteMode, assetManifest, visualManifest) {
  if (!group || !assetManifest || !visualManifest) return null;
  const result = selectVisualLook({
    recommendation: {
      slots: [{ phase: 'catalog', slot: 'catalog', selected: { itemId: group.id } }]
    },
    assetManifest,
    visualManifest,
    paletteMode: normalizePaletteMode(paletteMode),
    visualSeed: 0
  });
  return result.items[0]?.assetPath ? result.items[0] : null;
}

function preferredThemeIds(visualManifest, paletteMode) {
  const normalizedPaletteMode = normalizePaletteMode(paletteMode);
  const profile = visualManifest?.paletteModeProfiles?.[normalizedPaletteMode]
    ?? visualManifest?.sourceStyleProfiles?.[paletteMode]
    ?? visualManifest?.sourceStyleProfiles?.[normalizedPaletteMode]
    ?? visualManifest?.sourceStyleProfiles?.neutral;
  return Array.isArray(profile?.themeIds) ? profile.themeIds : [];
}

function pickCatalogVariant(group, paletteMode, visualManifest) {
  if (!group || !visualManifest) return null;
  const additional = visualManifest.additionalVariants?.[group.category]
    ?? visualManifest.additionalVariants?.[group.id]
    ?? [];
  if (!Array.isArray(additional) || !additional.length) return null;

  const normalizedPaletteMode = normalizePaletteMode(paletteMode);
  const preferredThemes = new Set(preferredThemeIds(visualManifest, paletteMode));
  const compatible = additional.find((variant) =>
    Array.isArray(variant.themeIds) && variant.themeIds.some((themeId) => preferredThemes.has(themeId))
  );
  if (compatible) return compatible;
  return normalizedPaletteMode === 'all' || normalizedPaletteMode === 'neutral' ? additional[0] ?? null : null;
}

function projectedRecommendation(recommendation, slotResult, alternative) {
  if (!recommendation || !Array.isArray(recommendation.slots)) return null;
  const changes = Array.isArray(alternative?.projectedChanges) ? alternative.projectedChanges : [];
  const byKey = new Map(recommendation.slots.map((entry) => [`${entry.phase}|${entry.slot}`, {
    ...entry,
    selected: { ...entry.selected }
  }]));

  const effectiveChanges = changes.some((change) => change.phase === slotResult.phase && change.slot === slotResult.slot)
    ? changes
    : [...changes, { phase: slotResult.phase, slot: slotResult.slot, toItemId: alternative?.itemId ?? null }];

  for (const change of effectiveChanges) {
    if (!change?.phase || !change?.slot) continue;
    const key = `${change.phase}|${change.slot}`;
    if (!change.toItemId) {
      byKey.delete(key);
      continue;
    }
    const current = byKey.get(key);
    byKey.set(key, current
      ? { ...current, selected: { ...current.selected, itemId: change.toItemId } }
      : { phase: change.phase, slot: change.slot, selected: { itemId: change.toItemId }, alternatives: [] });
  }

  return { ...recommendation, slots: [...byKey.values()] };
}

export class ClothingAssetStore {
  constructor() {
    this.status = 'idle';
    this.error = null;
    this.assetManifest = null;
    this.visualManifest = null;
    this.byId = new Map();
    this.currentVisualContext = null;
  }

  async load() {
    this.status = 'loading';
    this.error = null;
    this.currentVisualContext = null;
    try {
      const fetchOptions = navigator.onLine ? { cache: 'no-store' } : {};
      const [assetResponse, visualResponse] = await Promise.all([
        fetch(MANIFEST_URL, fetchOptions),
        fetch(VISUAL_MANIFEST_URL, fetchOptions)
      ]);
      if (!assetResponse.ok) throw new Error(`Asset manifest HTTP ${assetResponse.status}`);
      if (!visualResponse.ok) throw new Error(`Visual manifest HTTP ${visualResponse.status}`);
      const [assetManifest, visualManifest] = await Promise.all([assetResponse.json(), visualResponse.json()]);
      if (!Array.isArray(assetManifest.assetGroups) || !assetManifest.assetGroups.length) {
        throw new Error('Asset manifest contains no assetGroups');
      }
      this.assetManifest = assetManifest;
      this.visualManifest = visualManifest;
      this.byId = new Map(assetManifest.assetGroups.map((group) => [group.id, group]));
      this.status = 'ready';
    } catch (error) {
      this.status = 'missing';
      this.error = error;
    }
    return this;
  }

  group(itemId) {
    return this.byId.get(itemId) ?? null;
  }

  listGroups() {
    return [...this.byId.values()];
  }

  resolve(itemId, paletteMode = 'all') {
    const normalizedPaletteMode = normalizePaletteMode(paletteMode);
    const recommendation = this.currentVisualContext?.recommendation;
    if (recommendation && Array.isArray(recommendation.slots)) {
      for (const slotResult of recommendation.slots) {
        const alternative = slotResult.alternatives?.find((entry) => entry.itemId === itemId);
        if (!alternative) continue;
        const projectedAsset = this.resolveAlternativePart(slotResult, alternative, itemId, 0, normalizedPaletteMode);
        if (projectedAsset) return projectedAsset;
      }
    }
    const currentLookAsset = this.resolveCurrentLookAsset(itemId, normalizedPaletteMode);
    return currentLookAsset ?? this.resolveCatalog(itemId, paletteMode);
  }

  resolveCatalog(itemId, paletteMode = 'all') {
    const group = this.group(itemId);
    if (!group) return null;
    const catalogVariant = pickCatalogVariant(group, paletteMode, this.visualManifest);
    const selectedVisual = catalogVariant
      ? null
      : selectCatalogVisualVariant(group, paletteMode, this.assetManifest, this.visualManifest);
    const assetPath = catalogVariant?.assetPath
      ?? selectedVisual?.assetPath
      ?? variantPath(group, paletteMode);
    if (!assetPath) return null;
    return {
      src: rootAssetUrl(assetPath),
      alt: group.altText || group.label || itemId,
      label: group.label || itemId,
      assetPath,
      visualVariantId: catalogVariant?.id ?? selectedVisual?.variantId ?? null
    };
  }

  resolveLook(recommendation, paletteMode = 'all', visualSeed = 0, themeId = null) {
    if (this.status !== 'ready' || !this.assetManifest || !this.visualManifest) {
      return { look: null, bySlot: new Map() };
    }
    const normalizedPaletteMode = normalizePaletteMode(paletteMode);
    const sessionAnchor = recommendation?.sessionId
      || recommendation?.recommendationId
      || recommendation?.requestId
      || 'visual-session';
    const stableThemeId = themeId ?? (
      this.currentVisualContext?.sessionAnchor === sessionAnchor
      && this.currentVisualContext?.paletteMode === normalizedPaletteMode
      && this.currentVisualContext?.visualSeed === visualSeed
        ? this.currentVisualContext.themeId
        : null
    );
    const visualRecommendation = visualRecommendationFor(recommendation);
    const look = selectVisualLook({
      recommendation: visualRecommendation,
      assetManifest: this.assetManifest,
      visualManifest: this.visualManifest,
      paletteMode: normalizedPaletteMode,
      visualSeed,
      themeId: stableThemeId
    });
    const lookAvailability = stableThemeId == null || look.hasAlternateLook
      ? look
      : selectVisualLook({
        recommendation: visualRecommendation,
        assetManifest: this.assetManifest,
        visualManifest: this.visualManifest,
        paletteMode: normalizedPaletteMode,
        visualSeed
      });
    const resolvedLook = lookAvailability === look
      ? look
      : Object.freeze({
        ...look,
        availableLookCount: lookAvailability.availableLookCount,
        hasAlternateLook: lookAvailability.hasAlternateLook
      });
    this.currentVisualContext = {
      sessionAnchor,
      paletteMode: resolvedLook.paletteMode,
      visualSeed: resolvedLook.visualSeed,
      themeId: resolvedLook.themeId,
      recommendation
    };
    const bySlot = new Map();
    for (const item of resolvedLook.items) {
      bySlot.set(`${item.phase}|${item.slot}`, item);
    }
    return { look: resolvedLook, bySlot };
  }

  resolveAlternativePart(slotResult, alternative, partItemId, partIndex = 0, paletteMode = 'all') {
    const context = this.currentVisualContext;
    const normalizedPaletteMode = normalizePaletteMode(paletteMode);
    if (!context?.recommendation || context.paletteMode !== normalizedPaletteMode || this.status !== 'ready' || !this.assetManifest || !this.visualManifest) {
      return null;
    }

    const projected = projectedRecommendation(context.recommendation, slotResult, alternative);
    if (!projected) return null;
    const visualRecommendation = visualRecommendationFor(projected);
    const look = selectVisualLook({
      recommendation: visualRecommendation,
      assetManifest: this.assetManifest,
      visualManifest: this.visualManifest,
      paletteMode: normalizedPaletteMode,
      visualSeed: context.visualSeed,
      themeId: context.themeId
    });
    const parts = visualPartsForItem(alternative.itemId);
    const visualSlot = parts.length > 1 ? `${slotResult.slot}__visual_${partIndex + 1}` : slotResult.slot;
    const selectedVisual = look.items.find((item) => item.phase === slotResult.phase && item.slot === visualSlot && item.itemId === partItemId) ?? null;
    if (!selectedVisual) return null;
    return this.assetFromVisual(partItemId, selectedVisual);
  }

  resolveCurrentLookAsset(itemId, paletteMode = 'all') {
    const context = this.currentVisualContext;
    const group = this.group(itemId);
    const normalizedPaletteMode = normalizePaletteMode(paletteMode);
    if (!context || !group || context.paletteMode !== normalizedPaletteMode || this.status !== 'ready' || !this.assetManifest || !this.visualManifest) {
      return null;
    }

    const slotResult = { phase: 'preview', slot: 'preview', selected: { itemId } };
    const look = selectVisualLook({
      recommendation: {
        sessionId: context.sessionAnchor,
        slots: [slotResult]
      },
      assetManifest: this.assetManifest,
      visualManifest: this.visualManifest,
      paletteMode: normalizedPaletteMode,
      visualSeed: context.visualSeed,
      themeId: context.themeId
    });
    const selectedVisual = look.items[0] ?? null;
    return selectedVisual ? this.assetFromVisual(itemId, selectedVisual) : null;
  }

  assetFromVisual(itemId, selectedVisual) {
    const group = this.group(itemId);
    if (!group) return null;
    const assetPath = selectedVisual?.assetPath ?? variantPath(group, 'neutral');
    if (!assetPath) return null;
    return {
      src: rootAssetUrl(assetPath),
      alt: group.altText || group.label || itemId,
      label: group.label || itemId,
      assetPath,
      visualVariantId: selectedVisual?.variantId ?? null
    };
  }

  resolveSlot(slotResult, visualLookup) {
    const itemId = slotResult?.selected?.itemId;
    if (!itemId) return null;
    const group = this.group(itemId);
    if (!group) return null;
    const selectedVisual = visualLookup?.get(`${slotResult.phase}|${slotResult.slot}`) ?? null;
    return this.assetFromVisual(itemId, selectedVisual);
  }
}
