import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { APP_VERSION } from '../../src/version.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

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
    '/ui/background-scene.js',
    '/assets/clothing/manifest.json'
  ]) {
    assert.match(sw, new RegExp(required.replaceAll('/', '\\/')));
  }
});

test('asset ignore keeps runtime modules deployable', () => {
  const ignore = read('.assetsignore');
  assert.match(ignore, /^test$/m);
  assert.doesNotMatch(ignore, /^src$/m);
  assert.doesNotMatch(ignore, /^ui$/m);
  assert.doesNotMatch(ignore, /^assets$/m);
});
