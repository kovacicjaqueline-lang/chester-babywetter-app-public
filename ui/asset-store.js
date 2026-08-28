import { selectVisualLook } from '../src/visual-outfit.js';

const ROOT_URL = new URL('../', import.meta.url);
const MANIFEST_URL = new URL('../assets/clothing/manifest.json', import.meta.url);
const VISUAL_MANIFEST_URL = new URL('../assets/clothing/visual-manifest.json', import.meta.url);

function rootAssetUrl(path) {
  return new URL(path.replace(/^\//, ''), ROOT_URL).href;
}

function variantPath(group, styleTheme) {
  if (group.variantPaths && typeof group.variantPaths === 'object') {
    return group.variantPaths[styleTheme] ?? group.variantPaths.neutral ?? Object.values(group.variantPaths).find(Boolean) ?? null;
  }
  return typeof group.assetPath === 'string' ? group.assetPath : null;
}

function preferredThemeIds(visualManifest, styleTheme) {
  const profile = visualManifest?.sourceStyleProfiles?.[styleTheme];
  return Array.isArray(profile?.themeIds) ? profile.themeIds : [];
}

function pickCatalogVariant(group, styleTheme, visualManifest) {
  if (!group || !visualManifest) return null;
  const additional = visualManifest.additionalVariants?.[group.category]
    ?? visualManifest.additionalVariants?.[group.id]
    ?? [];
  if (!Array.isArray(additional) || !additional.length) return null;

  const preferredThemes = new Set(preferredThemeIds(visualManifest, styleTheme));
  const compatible = additional.find((variant) =>
    Array.isArray(variant.themeIds) && variant.themeIds.some((themeId) => preferredThemes.has(themeId))
  );
  if (compatible) return compatible;
  return styleTheme === 'neutral' ? additional[0] ?? null : null;
}

export class ClothingAssetStore {
  constructor() {
    this.status = 'idle';
    this.error = null;
    this.assetManifest = null;
    this.visualManifest = null;
    this.byId = new Map();
  }

  async load() {
    this.status = 'loading';
    this.error = null;
    try {
      const [assetResponse, visualResponse] = await Promise.all([
        fetch(MANIFEST_URL, { cache: 'no-store' }),
        fetch(VISUAL_MANIFEST_URL, { cache: 'no-store' })
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

  resolve(itemId, styleTheme = 'neutral') {
    const group = this.group(itemId);
    if (!group) return null;
    const assetPath = variantPath(group, styleTheme);
    if (!assetPath) return null;
    return {
      src: rootAssetUrl(assetPath),
      alt: group.altText || group.label || itemId,
      label: group.label || itemId,
      assetPath
    };
  }

  resolveCatalog(itemId, styleTheme = 'neutral') {
    const group = this.group(itemId);
    if (!group) return null;
    const catalogVariant = pickCatalogVariant(group, styleTheme, this.visualManifest);
    const assetPath = catalogVariant?.assetPath ?? variantPath(group, styleTheme);
    if (!assetPath) return null;
    return {
      src: rootAssetUrl(assetPath),
      alt: group.altText || group.label || itemId,
      label: group.label || itemId,
      assetPath,
      visualVariantId: catalogVariant?.id ?? null
    };
  }

  resolveLook(recommendation, styleTheme = 'neutral', visualSeed = 0) {
    if (this.status !== 'ready' || !this.assetManifest || !this.visualManifest) {
      return { look: null, bySlot: new Map() };
    }
    const look = selectVisualLook({
      recommendation,
      assetManifest: this.assetManifest,
      visualManifest: this.visualManifest,
      styleTheme,
      visualSeed
    });
    const bySlot = new Map();
    for (const item of look.items) {
      bySlot.set(`${item.phase}|${item.slot}`, item);
    }
    return { look, bySlot };
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
