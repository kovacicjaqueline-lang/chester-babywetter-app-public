import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const guardScript = fileURLToPath(new URL('../tools/repository-guard.mjs', import.meta.url));

function run(command, args, cwd, { expect = 0 } = {}) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
  if (result.status !== expect) {
    assert.fail(`${command} ${args.join(' ')} exited ${result.status}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  }
  return result;
}

function git(cwd, ...args) {
  return run('git', args, cwd).stdout.trim();
}

function write(cwd, relativePath, content) {
  const target = path.join(cwd, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function commitAll(cwd, message) {
  git(cwd, 'add', '--all');
  git(cwd, 'commit', '-m', message);
  return git(cwd, 'rev-parse', 'HEAD');
}

function makeRepo() {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'babywetter-guard-'));
  git(cwd, 'init', '-b', 'main');
  git(cwd, 'config', 'user.name', 'Guard Test');
  git(cwd, 'config', 'user.email', 'guard@example.test');
  write(cwd, 'base.txt', 'base\n');
  const base = commitAll(cwd, 'base');
  git(cwd, 'switch', '-c', 'feature');
  return { cwd, base };
}

function guard(cwd, args, expect = 0) {
  return run(process.execPath, [guardScript, ...args], cwd, { expect });
}

test('allowed scope files are accepted', () => {
  const { cwd } = makeRepo();
  write(cwd, 'tools/change.mjs', 'export const value = 1;\n');
  commitAll(cwd, 'feature');
  const result = guard(cwd, ['check', '--base-ref', 'main', '--allow', 'tools/**']);
  assert.match(result.stdout, /OK:/);
});

test('unexpected file is blocked', () => {
  const { cwd } = makeRepo();
  write(cwd, 'tools/change.mjs', 'ok\n');
  write(cwd, 'src/unexpected.js', 'unexpected\n');
  commitAll(cwd, 'feature');
  const result = guard(cwd, ['check', '--base-ref', 'main', '--allow', 'tools/**'], 1);
  assert.match(result.stderr, /outside the explicitly expected scope/);
  assert.match(result.stderr, /src\/unexpected\.js/);
});

test('0-byte file is blocked', () => {
  const { cwd } = makeRepo();
  write(cwd, 'tools/empty.txt', '');
  commitAll(cwd, 'empty');
  const result = guard(cwd, ['check', '--base-ref', 'main', '--allow', 'tools/**'], 1);
  assert.match(result.stderr, /0-byte files are blocked/);
  assert.match(result.stderr, /tools\/empty\.txt/);
});

test('explicitly allowed empty file is accepted', () => {
  const { cwd } = makeRepo();
  write(cwd, 'tools/empty.txt', '');
  commitAll(cwd, 'empty');
  const result = guard(cwd, [
    'check', '--base-ref', 'main', '--allow', 'tools/**', '--allow-empty', 'tools/empty.txt',
  ]);
  assert.match(result.stdout, /OK:/);
});

test('dirty tracked working tree is blocked', () => {
  const { cwd } = makeRepo();
  write(cwd, 'tools/change.mjs', 'committed\n');
  commitAll(cwd, 'feature');
  write(cwd, 'tools/change.mjs', 'dirty\n');
  const result = guard(cwd, ['check', '--base-ref', 'main', '--allow', 'tools/**'], 1);
  assert.match(result.stderr, /dirty\/uncommitted/);
});

test('untracked working tree is blocked', () => {
  const { cwd } = makeRepo();
  write(cwd, 'tools/change.mjs', 'committed\n');
  commitAll(cwd, 'feature');
  write(cwd, 'scratch.tmp', 'untracked\n');
  const result = guard(cwd, ['check', '--base-ref', 'main', '--allow', 'tools/**'], 1);
  assert.match(result.stderr, /untracked/);
  assert.match(result.stderr, /scratch\.tmp/);
});

test('advanced main integrated into branch is not counted as PR-owned scope', () => {
  const { cwd, base: startBase } = makeRepo();
  write(cwd, 'feature.txt', 'A\n');
  commitAll(cwd, 'feature A');

  git(cwd, 'switch', 'main');
  write(cwd, 'main-only.txt', 'B\n');
  commitAll(cwd, 'main B');

  git(cwd, 'switch', 'feature');
  git(cwd, 'merge', '--no-edit', 'main');

  const startBaseDiff = git(cwd, 'diff', '--name-only', `${startBase}...HEAD`).split('\n').filter(Boolean);
  assert.deepEqual(new Set(startBaseDiff), new Set(['feature.txt', 'main-only.txt']));

  const result = guard(cwd, ['check', '--base-ref', 'main', '--allow', 'feature.txt']);
  assert.match(result.stdout, /1 PR-owned file\(s\)/);
});

test('finalization write-lock blocks a changed HEAD until explicit repair transition', () => {
  const { cwd } = makeRepo();
  write(cwd, 'feature.txt', 'A\n');
  commitAll(cwd, 'feature A');
  guard(cwd, ['lock']);

  write(cwd, 'feature.txt', 'B\n');
  commitAll(cwd, 'feature B');
  const blocked = guard(cwd, ['check', '--base-ref', 'main', '--allow', 'feature.txt'], 1);
  assert.match(blocked.stderr, /write-lock is active and HEAD changed/);

  guard(cwd, ['unlock', '--repair']);
  const allowed = guard(cwd, ['check', '--base-ref', 'main', '--allow', 'feature.txt']);
  assert.match(allowed.stdout, /OK:/);
});
