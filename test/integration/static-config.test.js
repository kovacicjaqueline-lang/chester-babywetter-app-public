import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { posix } from 'node:path';
import { APP_VERSION } from '../../src/version.js';

const ROOT_URL = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT_URL), 'utf8');

function listRuntimeJs(dir) {
  const files = [];
  for (const entry of readdirSync(new URL(`${dir}/`, ROOT_URL), { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) files.push(...listRuntimeJs(path));
    else if (entry.isFile() && path.endsWith('.js')) files.push(path);
  }
  return files;
}

function indexModuleEntries() {
  const html = read('index.html');
  return [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+\.js)["'][^>]*><\/script>/gi)]
    .map((match) => match[1].replace(/^\.\//, ''));
}

function staticModuleDependencies(path) {
  const source = read(path);
  const dependencies = [];
  const pattern = /(?:import|export)\s+(?:[^'";]*?\s+from\s+)?["']([^"']+\.js)["']/g;
  for (const match of source.matchAll(pattern)) {
    const specifier = match[1];
    if (!specifier.startsWith('.')) continue;
    dependencies.push(posix.normalize(posix.join(posix.dirname(path), specifier)));
  }
  return dependencies;
}

function reachableRuntimeModules(entries) {
  const reachable = new Set();
  const pending = [...entries];
  while (pending.length) {
    const path = pending.pop();
    if (reachable.has(path)) continue;
    reachable.add(path);
    pending.push(...staticModuleDependencies(path));
  }
  return reachable;
}

function serviceWorkerRuntimeModules() {
  const sw = read('sw.js');
  return new Set(
    [...sw.matchAll(/["']\/((?:src|ui)\/[^"']+\.js|app\.js)["']/g)]
      .map((match) => match[1])
  );
}

test('package and app version stay aligned', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.version, APP_VERSION);
  assert.equal(pkg.scripts['verify:deploy'], 'wrangler deploy --dry-run');
  assert.equal(pkg.scripts['test:browser'], 'playwright test');
});

test('wrangler serves static assets from project root', () => {
  const config = JSON.parse(read('wrangler.jsonc'));
  assert.equal(config.assets.directory, '.');
  assert.equal(config.assets.not_found_handling, 'single-page-application');
  assert.equal(config.main, undefined);
});

test('PWA manifest and service worker reference the app shell', () => {
  const manifest = JSON.parse(read('manifest.webmanifest'));
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, '/');
  const sw = read('sw.js');
  for (const required of [
    '/index.html',
    '/app.js',
    '/scene.css',
    '/src/outfit-engine.js',
    '/src/day-trip-planner.js',
    '/src/day-trip-planner-weather.js',
    '/src/day-trip-planner-recommendations.js',
    '/src/integration/background-scene.js',
    '/src/integration/manual-weather-presets.js',
    '/ui/background-scene.js',
    '/ui/sleep-visual-parts.js',
    '/assets/clothing/manifest.json'
  ]) {
    assert.match(sw, new RegExp(required.replaceAll('/', '\\/')));
  }
});

test('all runtime JavaScript modules are reachable and cached exactly once', () => {
  const runtimeModules = ['app.js', ...listRuntimeJs('src'), ...listRuntimeJs('ui')].sort();
  const reachable = reachableRuntimeModules(indexModuleEntries());
  const unreachable = runtimeModules.filter((path) => !reachable.has(path));
  assert.deepEqual(unreachable, [], `Unreachable runtime modules: ${unreachable.join(', ')}`);

  const shellModules = [...serviceWorkerRuntimeModules()].sort();
  assert.deepEqual(shellModules, runtimeModules);
});

test('asset ignore keeps runtime modules deployable', () => {
  const ignore = read('.assetsignore');
  assert.match(ignore, /^test$/m);
  assert.doesNotMatch(ignore, /^src$/m);
  assert.doesNotMatch(ignore, /^ui$/m);
  assert.doesNotMatch(ignore, /^assets$/m);
});
