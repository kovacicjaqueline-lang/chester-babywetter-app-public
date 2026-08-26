import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CLOTHING_CATALOG } from '../src/clothing-catalog.js';
import { buildVisualCatalog } from '../src/visual-outfit.js';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));
const clothingRoot = join(repoRoot, 'assets', 'clothing');
const assetManifest = JSON.parse(readFileSync(join(clothingRoot, 'manifest.json'), 'utf8'));
const visualManifest = JSON.parse(readFileSync(join(clothingRoot, 'visual-manifest.json'), 'utf8'));

function manifestPaths(group) {
  if (group.variantPaths) return Object.values(group.variantPaths).filter(Boolean);
  return group.assetPath ? [group.assetPath] : [];
}

function allWebpFiles(directory) {
  const result = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...allWebpFiles(absolute));
    else if (entry.isFile() && entry.name.endsWith('.webp')) result.push(absolute);
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

test('real manifests cover exactly the current catalog and expose neutral fallbacks', () => {
  const manifestIds = new Set(assetManifest.assetGroups.map((group) => group.id));
  const catalogAssetGroups = new Set(Object.values(CLOTHING_CATALOG).map((item) => item.styleAssetGroup));
  assert.deepEqual([...manifestIds].sort(), [...catalogAssetGroups].sort());

  const visualCatalog = buildVisualCatalog(assetManifest, visualManifest);
  assert.equal(visualCatalog.themes.length, 10);
  const expectedVariantCount = assetManifest.assetGroups.reduce((sum, group) => sum + manifestPaths(group).length, 0);
  assert.equal(visualCatalog.visualVariantCount, expectedVariantCount);

  for (const group of assetManifest.assetGroups) {
    const paths = manifestPaths(group);
    if (paths.length === 0) continue;
    const variants = visualCatalog.groupsById[group.id].visualVariants;
    assert.ok(variants.some((variant) => variant.sourceStyle === 'neutral'), `${group.id} needs neutral fallback`);
  }
});

test('visual override metadata only targets existing groups, source styles and themes', () => {
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
});

test('all manifest paths exist and no WebP is accidentally unreferenced', () => {
  const referenced = new Set(assetManifest.assetGroups.flatMap(manifestPaths));
  for (const relativePath of referenced) {
    assert.equal(existsSync(join(repoRoot, relativePath)), true, `missing ${relativePath}`);
  }

  const physical = new Set(allWebpFiles(clothingRoot).map((absolute) => absolute.slice(repoRoot.length).replaceAll('\\', '/')));
  assert.deepEqual([...physical].sort(), [...referenced].sort());
});

test('physical images are valid square WebP files in the established 128/256px repo standard', () => {
  const files = allWebpFiles(clothingRoot);
  const allowedSizes = new Set([128, 256]);
  for (const filename of files) {
    const buffer = readFileSync(filename);
    const { width, height } = webpDimensions(buffer);
    assert.equal(width, height, `${filename} must be square`);
    assert.ok(allowedSizes.has(width), `${filename} has unexpected ${width}x${height}`);
  }
});

test('physical files do not contain unexpected binary duplicates', () => {
  const hashToFiles = new Map();
  for (const filename of allWebpFiles(clothingRoot)) {
    const hash = createHash('sha256').update(readFileSync(filename)).digest('hex');
    const list = hashToFiles.get(hash) || [];
    list.push(filename);
    hashToFiles.set(hash, list);
  }
  const duplicates = [...hashToFiles.values()].filter((files) => files.length > 1);
  assert.deepEqual(duplicates, []);
});
