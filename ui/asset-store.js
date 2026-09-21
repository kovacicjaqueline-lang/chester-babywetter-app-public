import { selectVisualLook } from '../src/visual-outfit.js';

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
    const legacySourceStyle = LEGACY_STYLE_TO_PALETTE_MODE[paletteMode] ? paletteMode : null;
    return group.variantPaths[paletteMode]
      ?? (legacySourceStyle && group.variantPaths[legacySourceStyle])
      ?? group.variantPaths.neutral
      ?? Object.values(group.variantPaths).find(Boolean)
      ?? null;
  }
  return typeof group.assetPath === 'string' ? group.assetPath : null;
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
    const currentLookAsset = this.resolveCurrentLookAsset(itemId, normalizedPaletteMode);
    return currentLookAsset ?? this.resolveCatalog(itemId, paletteMode);
  }

  resolveCatalog(itemId, paletteMode = 'all') {
    const group = this.group(itemId);
    if (!group) return null;
    const catalogVariant = pickCatalogVariant(group, paletteMode, this.visualManifest);
    const assetPath = catalogVariant?.assetPath ?? variantPath(group, paletteMode);
    if (!assetPath) return null;
    return {
      src: rootAssetUrl(assetPath),
      alt: group.altText || group.label || itemId,
      label: group.label || itemId,
      assetPath,
      visualVariantId: catalogVariant?.id ?? null
    };
  }

  resolveLook(recommendation, paletteMode = 'all', visualSeed = 0, themeId = null) {
    if (this.status !== 'ready' || !this.assetManifest || !this.visualManifest) {
      return { look: null, bySlot: new Map() };
    }
    const look = selectVisualLook({
      recommendation,
      assetManifest: this.assetManifest,
      visualManifest: this.visualManifest,
      paletteMode: normalizePaletteMode(paletteMode),
      visualSeed,
      themeId
    });
    const sessionAnchor = recommendation?.sessionId
      || recommendation?.recommendationId
      || recommendation?.requestId
      || 'visual-session';
    this.currentVisualContext = {
      sessionAnchor,
      paletteMode: look.paletteMode,
      visualSeed: look.visualSeed,
      themeId: look.themeId
    };
    const bySlot = new Map();
    for (const item of look.items) {
      bySlot.set(`${item.phase}|${item.slot}`, item);
    }
    return { look, bySlot };
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
    const bySlot = new Map(selectedVisual ? [['preview|preview', selectedVisual]] : []);
    return this.resolveSlot(slotResult, bySlot);
  }

  resolveSlot(slotResult, visualLookup) {
    const itemId = slotResult?.selected?.itemId;
    if (!itemId) return null;
    const group = this.group(itemId);
    if (!group) return null;
    const selectedVisual = visualLookup?.get(`${slotResult.phase}|${slotResult.slot}`) ?? null;
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
}
