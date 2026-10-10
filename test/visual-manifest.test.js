import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CLOTHING_CATALOG } from '../src/clothing-catalog.js';
import { buildVisualCatalog, selectVisualVariant } from '../src/visual-outfit.js';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));
const clothingRoot = join(repoRoot, 'assets', 'clothing');
const assetManifest = JSON.parse(readFileSync(join(clothingRoot, 'manifest.json'), 'utf8'));
const visualManifest = JSON.parse(readFileSync(join(clothingRoot, 'visual-manifest.json'), 'utf8'));

function manifestPaths(group) {
  if (group.variantPaths) return Object.values(group.variantPaths).filter(Boolean);
  return group.assetPath ? [group.assetPath] : [];
}

function additionalPaths(groupId) {
  return (visualManifest.additionalVariants?.[groupId] || []).map((variant) => variant.assetPath).filter(Boolean);
}

function allReferencedPaths() {
  return assetManifest.assetGroups.flatMap((group) => [...manifestPaths(group), ...additionalPaths(group.id)]);
}

function allRuntimeImageFiles(directory) {
  const result = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...allRuntimeImageFiles(absolute));
    else if (entry.isFile() && /\.(?:webp|png)$/.test(entry.name)) result.push(absolute);
  }
  return result;
}

function webpDimensions(buffer) {
  assert.equal(buffer.subarray(0, 4).toString('ascii'), 'RIFF');
  assert.equal(buffer.subarray(8, 12).toString('ascii'), 'WEBP');
  const chunk = buffer.subarray(12, 16).toString('ascii');
  const dataOffset = 20;

  if (chunk === 'VP8X') {
    const width = 1 + buffer.readUIntLE(dataOffset + 4, 3);
    const height = 1 + buffer.readUIntLE(dataOffset + 7, 3);
    return { width, height };
  }

  if (chunk === 'VP8L') {
    assert.equal(buffer[dataOffset], 0x2f);
    const b1 = buffer[dataOffset + 1];
    const b2 = buffer[dataOffset + 2];
    const b3 = buffer[dataOffset + 3];
    const b4 = buffer[dataOffset + 4];
    return {
      width: 1 + b1 + ((b2 & 0x3f) << 8),
      height: 1 + (b2 >> 6) + (b3 << 2) + ((b4 & 0x0f) << 10)
    };
  }

  if (chunk === 'VP8 ') {
    const searchEnd = Math.min(buffer.length - 6, dataOffset + 32);
    for (let offset = dataOffset; offset <= searchEnd; offset += 1) {
      if (buffer[offset] === 0x9d && buffer[offset + 1] === 0x01 && buffer[offset + 2] === 0x2a) {
        return {
          width: buffer.readUInt16LE(offset + 3) & 0x3fff,
          height: buffer.readUInt16LE(offset + 5) & 0x3fff
        };
      }
    }
  }

  throw new Error(`Unsupported WebP chunk: ${chunk}`);
}

function imageDimensions(filename, buffer) {
  if (filename.endsWith('.png')) {
    assert.equal(buffer.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    return { width:buffer.readUInt32BE(16), height:buffer.readUInt32BE(20) };
  }
  return webpDimensions(buffer);
}

test('real manifests cover exactly the current catalog and expose neutral fallbacks', () => {
  const manifestIds = new Set(assetManifest.assetGroups.map((group) => group.id));
  const catalogAssetGroups = new Set(Object.values(CLOTHING_CATALOG).map((item) => item.styleAssetGroup));
  assert.deepEqual([...manifestIds].sort(), [...catalogAssetGroups].sort());

  const visualCatalog = buildVisualCatalog(assetManifest, visualManifest);
  assert.equal(visualCatalog.themes.length, 10);
  const expectedVariantCount = assetManifest.assetGroups.reduce((sum, group) => sum + manifestPaths(group).length + additionalPaths(group.id).length, 0);
  assert.equal(visualCatalog.visualVariantCount, expectedVariantCount);

  for (const group of assetManifest.assetGroups) {
    const paths = manifestPaths(group);
    if (paths.length === 0) continue;
    const variants = visualCatalog.groupsById[group.id].visualVariants;
    assert.ok(variants.some((variant) => variant.isFallback), `${group.id} needs neutral fallback`);
  }
});

test('visual metadata only targets existing groups, source styles and themes', () => {
  const groups = new Map(assetManifest.assetGroups.map((group) => [group.id, group]));
  const themeIds = new Set(visualManifest.themes.map((theme) => theme.id));

  for (const [groupId, overrides] of Object.entries(visualManifest.assetOverrides || {})) {
    const group = groups.get(groupId);
    assert.ok(group, `unknown override group ${groupId}`);
    const sourceStyles = new Set(group.styleVariants || []);
    for (const [sourceStyle, override] of Object.entries(overrides)) {
      assert.ok(sourceStyles.has(sourceStyle), `unknown source style ${groupId}::${sourceStyle}`);
      for (const themeId of override.themeIds || []) {
        assert.ok(themeIds.has(themeId), `unknown theme ${themeId}`);
      }
    }
  }

  const variantIds = new Set();
  for (const [groupId, variants] of Object.entries(visualManifest.additionalVariants || {})) {
    assert.ok(groups.has(groupId), `unknown additional variant group ${groupId}`);
    assert.ok(Array.isArray(variants), `additional variants for ${groupId} must be an array`);
    for (const variant of variants) {
      const fullId = `${groupId}::${variant.id}`;
      assert.ok(variant.id, `${groupId} additional variant needs id`);
      assert.equal(variantIds.has(fullId), false, `duplicate visual variant ${fullId}`);
      variantIds.add(fullId);
      assert.equal(typeof variant.assetPath, 'string', `${fullId} needs assetPath`);
      for (const themeId of variant.themeIds || []) {
        assert.ok(themeIds.has(themeId), `unknown theme ${themeId}`);
      }
    }
  }
});

test('every selectable legacy variant has explicit visual metadata', () => {
  const themeIds = new Set(visualManifest.themes.map((theme) => theme.id));
  const paletteTags = new Set(visualManifest.paletteTags);
  const visualOnlyFields = new Set(['themeIds', 'paletteTags', 'pattern']);
  const prohibitedFields = new Set([
    'thermalWeight',
    'sleepWarmthWeight',
    'category',
    'slot',
    'situations',
    'allowedSituations',
    'alternatives',
    'alternativeItemIds'
  ]);

  for (const group of assetManifest.assetGroups) {
    const sourceStyles = group.variantPaths ? Object.keys(group.variantPaths) : group.assetPath ? ['neutral'] : [];
    if (!sourceStyles.length) continue;

    const overrides = visualManifest.assetOverrides?.[group.id];
    assert.ok(overrides, `${group.id} needs visual metadata`);
    for (const sourceStyle of sourceStyles) {
      const metadata = overrides[sourceStyle];
      assert.ok(metadata, `${group.id}::${sourceStyle} needs visual metadata`);
      assert.deepEqual(Object.keys(metadata).sort(), [...visualOnlyFields].sort(), `${group.id}::${sourceStyle} visual fields`);
      assert.ok(metadata.themeIds.length > 0, `${group.id}::${sourceStyle} needs themeIds`);
      assert.ok(metadata.paletteTags.length > 0, `${group.id}::${sourceStyle} needs paletteTags`);
      assert.notEqual(metadata.pattern, 'unspecified', `${group.id}::${sourceStyle} needs an observed pattern`);
      for (const themeId of metadata.themeIds) assert.ok(themeIds.has(themeId), `unknown theme ${themeId}`);
      for (const paletteTag of metadata.paletteTags) assert.ok(paletteTags.has(paletteTag), `unknown palette tag ${paletteTag}`);
      for (const field of prohibitedFields) assert.equal(Object.hasOwn(metadata, field), false, `${group.id}::${sourceStyle} must not define ${field}`);
    }
  }

  for (const [groupId, variants] of Object.entries(visualManifest.additionalVariants || {})) {
    for (const variant of variants) {
      assert.ok(Array.isArray(variant.themeIds) && variant.themeIds.length, `${groupId}::${variant.id} needs themeIds`);
      assert.ok(Array.isArray(variant.paletteTags) && variant.paletteTags.length, `${groupId}::${variant.id} needs paletteTags`);
      assert.equal(typeof variant.pattern, 'string');
      assert.notEqual(variant.pattern, 'unspecified', `${groupId}::${variant.id} needs an observed pattern`);
      for (const paletteTag of variant.paletteTags) assert.ok(paletteTags.has(paletteTag), `unknown palette tag ${paletteTag}`);
    }
  }
});

test('theme color roles preserve the existing palette and partition it cleanly', () => {
  const paletteTags = new Set(visualManifest.paletteTags);
  for (const theme of visualManifest.themes) {
    assert.ok(theme.colors, `${theme.id} needs color roles`);
    const roleValues = Object.values(theme.colors).flat();
    assert.deepEqual([...new Set(roleValues)].sort(), [...new Set(theme.palette)].sort(), `${theme.id} role values must preserve palette`);
    for (const role of ['primary', 'secondary', 'neutral']) {
      assert.ok(Array.isArray(theme.colors[role]) && theme.colors[role].length, `${theme.id} needs ${role} colors`);
      for (const color of theme.colors[role]) assert.ok(paletteTags.has(color), `unknown theme color ${color}`);
    }
  }
});

test('palette modes declare explicit theme sets and legacy source-style ranks', () => {
  const themeIds = new Set(visualManifest.themes.map((theme) => theme.id));
  assert.deepEqual(Object.keys(visualManifest.paletteModeProfiles).sort(), ['all', 'cool', 'neutral', 'warm']);
  for (const [mode, profile] of Object.entries(visualManifest.paletteModeProfiles)) {
    assert.ok(profile.themeIds.length > 0, `${mode} needs themes`);
    assert.equal(profile.themeIds.every((themeId) => themeIds.has(themeId)), true, `${mode} references unknown theme`);
    assert.ok(Object.keys(profile.sourceStyleRank).length > 0, `${mode} needs source style ranks`);
    assert.equal(Object.values(profile.sourceStyleRank).every((rank) => Number.isInteger(rank) && rank >= 0), true, `${mode} has invalid source style rank`);
  }
  assert.deepEqual(visualManifest.paletteModeProfiles.neutral.themeIds, visualManifest.themes.map((theme) => theme.id));
  assert.deepEqual(visualManifest.paletteModeProfiles.neutral.sourceStyleRank, { neutral: 0 });
  for (const mode of ['cool', 'warm']) {
    const ranks = visualManifest.paletteModeProfiles[mode].sourceStyleRank;
    assert.equal(ranks.neutral, 0, `${mode} must not prefer a gendered legacy label`);
    assert.equal(ranks.boy, 0, `${mode} must not prefer boy-labelled assets`);
    assert.equal(ranks.girl, 0, `${mode} must not prefer girl-labelled assets`);
  }
  assert.deepEqual(visualManifest.paletteModeProfiles.warm.themeIds, [
    'sage_oat',
    'clay_cream',
    'terracotta_greige',
    'ocher_taupe',
    'petrol_warm_beige',
    'mauve_cream',
    'apricot_oat'
  ]);
  assert.equal(visualManifest.paletteModeProfiles.warm.themeIds.includes('soft_lavender_sand'), false);
});

test('warm palette has physical variants across the completed and remaining clothing groups', () => {
  const expected = {
    short_sleeve_bodysuit: 'sage-oat-01',
    long_sleeve_bodysuit: 'terracotta-greige-01',
    t_shirt: 'petrol-warm-beige-01',
    light_long_sleeve_shirt: 'sage-oat-01',
    warm_trousers: 'ocher-taupe-01',
    thin_sweater: 'terracotta-knit-01',
    fleece_jacket: 'sage-oat-01',
    tights: 'sage-oat-01',
    winter_overall: 'ocher-taupe-01',
    warm_hat: 'terracotta-oat-01'
  };
  for (const [groupId, variantId] of Object.entries(expected)) {
    const variant = visualManifest.additionalVariants[groupId].find((item) => item.id === variantId);
    assert.ok(variant, `missing generated warm variant for ${groupId}`);
    assert.ok(variant.themeIds.some((themeId) => visualManifest.paletteModeProfiles.warm.themeIds.includes(themeId)));
  }
  for (const [variantId, paletteMode] of [
    ['terracotta-cord-01', 'warm'],
    ['cocoa-cord-01', 'warm'],
    ['moss-cord-01', 'warm'],
    ['dusty-blue-cord-01', 'cool'],
    ['petrol-cord-01', 'warm']
  ]) {
    const variant = visualManifest.additionalVariants.warm_trousers.find((item) => item.id === variantId);
    assert.ok(variant, `missing warm corduroy variant ${variantId}`);
    assert.equal(variant.pattern, 'fine_rib');
    assert.ok(variant.themeIds.some((themeId) => visualManifest.paletteModeProfiles[paletteMode].themeIds.includes(themeId)));
  }
});

test('muted grey and neutral colorways stay visual-only and resolve in every palette mode', () => {
  const expected = [
    ['long_sleeve_bodysuit', 'pebble-greige-01', 'pebble_greige', 'solid'],
    ['trousers', 'mushroom-taupe-01', 'mushroom_taupe', 'solid'],
    ['light_long_sleeve_shirt', 'slate-mist-grey-blue-01', 'slate_mist_grey_blue', 'solid'],
    ['thin_sweater', 'sage-grey-01', 'sage_grey', 'fine_knit'],
    ['short_sleeve_bodysuit', 'stone-greige-01', 'stone_greige', 'solid'],
    ['light_trousers', 'graphite-greige-01', 'graphite_greige', 'solid'],
    ['thin_cardigan', 'mushroom-taupe-02', 'mushroom_taupe', 'fine_knit'],
    ['fleece_jacket', 'olive-stone-grey-01', 'sage_grey', 'solid']
  ];
  const catalog = buildVisualCatalog(assetManifest, visualManifest);

  for (const [groupId, variantId, colorTag, pattern] of expected) {
    const variant = visualManifest.additionalVariants[groupId].find((item) => item.id === variantId);
    assert.ok(variant, `missing ${groupId} colorway ${variantId}`);
    assert.equal(variant.pattern, pattern);
    assert.ok(variant.paletteTags.includes(colorTag));
    assert.deepEqual(Object.keys(variant).sort(), ['assetPath', 'id', 'paletteTags', 'pattern', 'themeIds'].sort());

    for (const paletteMode of ['all', 'neutral', 'cool', 'warm']) {
      assert.ok(
        variant.themeIds.some((themeId) => visualManifest.paletteModeProfiles[paletteMode].themeIds.includes(themeId)),
        `${paletteMode} can use ${groupId}::${variantId}`
      );
      const resolved = new Set();
      for (let seed = 0; seed < 80; seed += 1) {
        resolved.add(selectVisualVariant({
          catalog,
          assetGroupId: groupId,
          themeId: 'sage_oat',
          paletteMode,
          seedKey: `${paletteMode}-${seed}`
        }).variantId);
      }
      assert.ok(resolved.has(`${groupId}::${variantId}`), `${paletteMode} resolves ${groupId}::${variantId}`);
    }
  }
});

test('insulated teddy jacket exposes the planned colorways', () => {
  const variants = visualManifest.additionalVariants.insulated_transition_jacket;
  assert.deepEqual(variants.map((variant) => variant.id), [
    'dusty-blue-01',
    'sand-greige-01',
    'terracotta-olive-01',
    'navy-solid-01',
    'berry-solid-01',
    'aubergine-solid-01',
    'cognac-solid-01'
  ]);
  assert.deepEqual([...new Set(variants.flatMap((variant) => variant.themeIds))].sort(), [
    'apricot_oat',
    'clay_cream',
    'dusty_blue_sand',
    'mauve_cream',
    'ocher_taupe',
    'petrol_warm_beige',
    'sage_oat',
    'slate_blue_greige',
    'terracotta_greige'
  ]);
});

test('navy and berry colorways resolve across every palette mode', () => {
  const expected = [
    ['light_transition_jacket', 'navy-solid-01', 'navy'],
    ['long_sleeve_bodysuit', 'berry-solid-01', 'berry'],
    ['thin_cardigan', 'aubergine-solid-01', 'aubergine'],
    ['trousers', 'cognac-solid-01', 'cognac']
  ];

  for (const [groupId, variantId, paletteTag] of expected) {
    const variant = visualManifest.additionalVariants[groupId].find((item) => item.id === variantId);
    assert.ok(variant, `missing ${groupId} colorway ${variantId}`);
    assert.ok(variant.paletteTags.includes(paletteTag));
    for (const paletteMode of ['all', 'neutral', 'cool', 'warm']) {
      assert.ok(
        variant.themeIds.some((themeId) => visualManifest.paletteModeProfiles[paletteMode].themeIds.includes(themeId)),
        `${paletteMode} can use ${groupId}::${variantId}`
      );
    }
  }
});

test('all referenced paths exist and no runtime image is accidentally unreferenced', () => {
  const referenced = new Set(allReferencedPaths());
  for (const relativePath of referenced) {
    assert.equal(existsSync(join(repoRoot, relativePath)), true, `missing ${relativePath}`);
  }

  const physical = new Set(allRuntimeImageFiles(clothingRoot).map((absolute) => absolute.slice(repoRoot.length).replaceAll('\\', '/')));
  assert.deepEqual([...physical].sort(), [...referenced].sort());
});

test('physical images are valid square runtime files in supported sizes', () => {
  const files = allRuntimeImageFiles(clothingRoot);
  const allowedSizes = new Set([128, 256, 512, 1024]);
  for (const filename of files) {
    const buffer = readFileSync(filename);
    const { width, height } = imageDimensions(filename, buffer);
    assert.equal(width, height, `${filename} must be square`);
    assert.ok(allowedSizes.has(width), `${filename} has unexpected ${width}x${height}; expected 128, 256, 512 or 1024 square runtime asset`);
  }
});

test('physical files do not contain unexpected binary duplicates', () => {
  const hashToFiles = new Map();
  for (const filename of allRuntimeImageFiles(clothingRoot)) {
    const hash = createHash('sha256').update(readFileSync(filename)).digest('hex');
    const list = hashToFiles.get(hash) || [];
    list.push(filename);
    hashToFiles.set(hash, list);
  }
  const duplicates = [...hashToFiles.values()].filter((files) => files.length > 1);
  assert.deepEqual(duplicates, []);
});
