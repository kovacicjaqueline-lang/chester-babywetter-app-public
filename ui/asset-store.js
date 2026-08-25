const MANIFEST_URL = new URL("../assets/clothing/manifest.json", import.meta.url);

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    return Object.entries(value).map(([key, item]) => ({ id: key, ...(item || {}) }));
  }
  return [];
}

function manifestItems(raw) {
  if (Array.isArray(raw)) return raw;
  return asArray(
    raw?.items ??
    raw?.clothing ??
    raw?.clothingItems ??
    raw?.assets ??
    raw?.catalog ??
    raw?.entries
  );
}

function itemIdOf(item) {
  return item?.itemId ?? item?.id ?? item?.clothingId ?? item?.assetGroup ?? item?.styleAssetGroup ?? null;
}

function fileOf(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.src ?? value.path ?? value.file ?? value.url ?? value.webp ?? value.png ?? null;
}

function variantList(item) {
  const variants = item?.variants ?? item?.assets ?? item?.files ?? item?.images;
  if (!variants) return [item];
  return asArray(variants).map((variant) => ({ ...item, ...variant, variants: undefined, assets: undefined, files: undefined, images: undefined }));
}

function styleOf(item) {
  return item?.styleTheme ?? item?.style ?? item?.theme ?? item?.variant ?? "neutral";
}

function altOf(item) {
  return item?.altText ?? item?.alt ?? item?.label ?? item?.name ?? null;
}

function scoreVariant(variant, requestedStyle) {
  const style = styleOf(variant);
  if (style === requestedStyle) return 4;
  if (requestedStyle === "mixed" && ["neutral", "mixed"].includes(style)) return 3;
  if (style === "neutral" || style === "unisex") return 2;
  return 1;
}

export class ClothingAssetStore {
  constructor() {
    this.status = "idle";
    this.error = null;
    this.raw = null;
    this.byId = new Map();
  }

  async load() {
    this.status = "loading";
    this.error = null;
    try {
      const response = await fetch(MANIFEST_URL, { cache: "no-store" });
      if (!response.ok) throw new Error(`Asset manifest HTTP ${response.status}`);
      const raw = await response.json();
      this.raw = raw;
      this.byId.clear();

      for (const item of manifestItems(raw)) {
        const id = itemIdOf(item);
        if (!id) continue;
        const variants = variantList(item).filter((variant) => fileOf(variant));
        if (variants.length) this.byId.set(id, variants);
      }

      if (!this.byId.size) throw new Error("Asset manifest contains no usable clothing images");
      this.status = "ready";
      return this;
    } catch (error) {
      this.status = "missing";
      this.error = error;
      return this;
    }
  }

  resolve(itemId, requestedStyle = "neutral") {
    const variants = this.byId.get(itemId) ?? [];
    if (!variants.length) return null;
    const variant = [...variants].sort((a, b) => scoreVariant(b, requestedStyle) - scoreVariant(a, requestedStyle))[0];
    const file = fileOf(variant);
    if (!file) return null;

    return {
      src: new URL(file, MANIFEST_URL).href,
      alt: altOf(variant),
      style: styleOf(variant)
    };
  }
}
