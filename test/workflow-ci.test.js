import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const count = (text, pattern) => [...text.matchAll(pattern)].length;

const workflow = read('.github/workflows/integration.yml');
const packageJson = JSON.parse(read('package.json'));
const playwrightConfig = read('playwright.config.js');
const assetsIgnore = read('.assetsignore');

test('workflow exposes targeted local regression commands', () => {
  assert.equal(packageJson.scripts['test:workflow'], 'node --test test/workflow-ci.test.js');
  assert.equal(packageJson.scripts['check:node-compat'], 'node scripts/check-node-compat.mjs');
});

test('CI keeps a Node matrix without duplicating the full unit gate', () => {
  assert.match(workflow, /^  node-checks:$/m);
  assert.match(workflow, /node-version: 22/);
  assert.match(workflow, /node-version: 24/);
  assert.match(workflow, /gate: unit/);
  assert.match(workflow, /gate: compatibility/);
  assert.equal(count(workflow, /^\s+run: npm test$/gm), 1);
  assert.equal(count(workflow, /^\s+run: npm run check:node-compat$/gm), 1);
});

test('CI runs major gates without serial dependencies', () => {
  assert.match(workflow, /^  browser-tests:$/m);
  assert.match(workflow, /^  deploy-dry-run:$/m);
  assert.doesNotMatch(workflow, /^\s+needs:/m);
  assert.equal(count(workflow, /^\s+run: npm run test:browser$/gm), 1);
  assert.equal(count(workflow, /^\s+run: npm run verify:deploy$/gm), 1);
});

test('CI avoids duplicate feature-branch and pull-request runs', () => {
  assert.match(workflow, /push:\n\s+branches:\n\s+- main/);
  assert.match(workflow, /pull_request:\n\s+branches:\n\s+- main/);
});

test('browser diagnostics remain available on failures', () => {
  assert.match(playwrightConfig, /workers: process\.env\.CI \? 2 : undefined/);
  assert.match(playwrightConfig, /trace: 'retain-on-failure'/);
  assert.match(playwrightConfig, /screenshot: 'only-on-failure'/);
  assert.match(workflow, /if: always\(\)/);
  assert.match(workflow, /test-results/);
  assert.match(workflow, /playwright-report/);
});

test('browser specs do not use fixed timeout waits', () => {
  const specs = readdirSync(new URL('../e2e/', import.meta.url))
    .filter((file) => file.endsWith('.spec.js'));

  for (const spec of specs) {
    assert.doesNotMatch(read(`e2e/${spec}`), /waitForTimeout\s*\(/, `${spec} uses waitForTimeout()`);
  }
});

test('repository-only workflow instructions are not deployed as app assets', () => {
  assert.match(assetsIgnore, /^AGENTS\.md$/m);
  assert.match(assetsIgnore, /^docs$/m);
  assert.match(assetsIgnore, /^\.github$/m);
  assert.match(assetsIgnore, /^scripts$/m);
});
