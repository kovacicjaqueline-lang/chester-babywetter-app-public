#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const LOCK_FILE_NAME = 'babywetter-finalization-lock.json';

function fail(message, details = []) {
  console.error(`[repository-guard] ${message}`);
  for (const detail of details) console.error(`  - ${detail}`);
  process.exitCode = 1;
}

function runGit(repo, args, { allowFailure = false } = {}) {
  const result = spawnSync('git', ['-C', repo, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`git ${args.join(' ')} failed: ${(result.stderr || result.stdout).trim()}`);
  }
  return result;
}

function outputGit(repo, args) {
  return runGit(repo, args).stdout.trim();
}

function normalizeRepoPath(value) {
  return value.replaceAll('\\', '/').replace(/^\.\//, '');
}

function validatePattern(pattern, label) {
  const normalized = normalizeRepoPath(pattern);
  if (!normalized || path.isAbsolute(normalized) || normalized === '..' || normalized.startsWith('../') || normalized.includes('/../')) {
    throw new Error(`${label} must be a repository-relative path or prefix: ${pattern}`);
  }
  if (normalized.includes('*') && !normalized.endsWith('/**')) {
    throw new Error(`${label} only supports exact paths or directory prefixes ending in /**: ${pattern}`);
  }
  return normalized;
}

function matchesPattern(file, pattern) {
  if (pattern.endsWith('/**')) {
    const prefix = pattern.slice(0, -3).replace(/\/$/, '');
    return file === prefix || file.startsWith(`${prefix}/`);
  }
  return file === pattern;
}

function parseArgs(argv) {
  const command = argv[0] && !argv[0].startsWith('--') ? argv[0] : 'check';
  const args = command === 'check' ? (argv[0] === 'check' ? argv.slice(1) : argv) : argv.slice(1);
  const options = {
    command,
    repo: process.cwd(),
    baseRef: 'origin/main',
    allow: [],
    allowEmpty: [],
    repair: false,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--repo') options.repo = args[++i];
    else if (arg === '--base-ref') options.baseRef = args[++i];
    else if (arg === '--allow') options.allow.push(args[++i]);
    else if (arg === '--allow-empty') options.allowEmpty.push(args[++i]);
    else if (arg === '--repair') options.repair = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.repo) throw new Error('--repo requires a value');
  options.repo = path.resolve(options.repo);
  options.allow = options.allow.map((value) => validatePattern(value, '--allow'));
  options.allowEmpty = options.allowEmpty.map((value) => validatePattern(value, '--allow-empty'));
  return options;
}

function ensureGitRepository(repo) {
  const result = runGit(repo, ['rev-parse', '--is-inside-work-tree'], { allowFailure: true });
  if (result.status !== 0 || result.stdout.trim() !== 'true') throw new Error(`Not a Git working tree: ${repo}`);
}

function getStatusLines(repo) {
  const result = runGit(repo, ['status', '--porcelain=v1', '--untracked-files=all']);
  return result.stdout.split('\n').filter(Boolean);
}

function assertCleanWorktree(repo) {
  const statusLines = getStatusLines(repo);
  if (!statusLines.length) return true;
  const untracked = statusLines.filter((line) => line.startsWith('?? '));
  const dirty = statusLines.filter((line) => !line.startsWith('?? '));
  const details = [];
  if (dirty.length) details.push(`dirty/uncommitted: ${dirty.join(', ')}`);
  if (untracked.length) details.push(`untracked: ${untracked.join(', ')}`);
  fail('Working tree must be clean before finalization or push.', details);
  return false;
}

function getCurrentBranch(repo) {
  const result = runGit(repo, ['symbolic-ref', '--quiet', '--short', 'HEAD'], { allowFailure: true });
  return result.status === 0 ? result.stdout.trim() : null;
}

function getLockPath(repo) {
  const gitPath = outputGit(repo, ['rev-parse', '--git-path', LOCK_FILE_NAME]);
  return path.isAbsolute(gitPath) ? gitPath : path.resolve(repo, gitPath);
}

function readLock(repo) {
  const lockPath = getLockPath(repo);
  if (!fs.existsSync(lockPath)) return null;
  try {
    return { lockPath, data: JSON.parse(fs.readFileSync(lockPath, 'utf8')) };
  } catch (error) {
    throw new Error(`Invalid finalization lock at ${lockPath}: ${error.message}`);
  }
}

function assertFinalizationLockUnchanged(repo) {
  const lock = readLock(repo);
  if (!lock) return true;
  const branch = getCurrentBranch(repo);
  if (branch !== lock.data.branch) return true;
  const head = outputGit(repo, ['rev-parse', 'HEAD']);
  if (head === lock.data.head) return true;
  fail('Finalization write-lock is active and HEAD changed.', [
    `locked head: ${lock.data.head}`,
    `current head: ${head}`,
    'return deliberately to repair phase with: npm run workflow:repair',
  ]);
  return false;
}

function lockFinalization(repo) {
  if (!assertCleanWorktree(repo)) return;
  const branch = getCurrentBranch(repo);
  if (!branch) {
    fail('Cannot enter finalization phase from a detached HEAD.');
    return;
  }
  const head = outputGit(repo, ['rev-parse', 'HEAD']);
  const lockPath = getLockPath(repo);
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });
  fs.writeFileSync(lockPath, `${JSON.stringify({ version: 1, branch, head }, null, 2)}\n`, 'utf8');
  console.log(`[repository-guard] Finalization write-lock active for ${branch} at ${head}.`);
}

function unlockFinalization(repo, repair) {
  if (!repair) {
    fail('Unlock requires an explicit repair-phase transition.', ['run: npm run workflow:repair']);
    return;
  }
  const lockPath = getLockPath(repo);
  if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath);
  console.log('[repository-guard] Finalization write-lock removed; repair phase is active again.');
}

function changedFilesAgainstBase(repo, baseRef) {
  const baseCheck = runGit(repo, ['rev-parse', '--verify', `${baseRef}^{commit}`], { allowFailure: true });
  if (baseCheck.status !== 0) throw new Error(`PR base ref is not available locally: ${baseRef}`);
  const mergeBase = outputGit(repo, ['merge-base', baseRef, 'HEAD']);
  const result = runGit(repo, ['diff', '--name-only', '--no-renames', '--diff-filter=ACDMRTUXB', '-z', `${baseRef}...HEAD`]);
  const files = result.stdout.split('\0').filter(Boolean).map(normalizeRepoPath);
  return { mergeBase, files };
}

function isDeletedAtHead(repo, file) {
  const result = runGit(repo, ['cat-file', '-e', `HEAD:${file}`], { allowFailure: true });
  return result.status !== 0;
}

function zeroByteFiles(repo, files) {
  const zero = [];
  for (const file of files) {
    if (isDeletedAtHead(repo, file)) continue;
    const filePath = path.join(repo, ...file.split('/'));
    let stat;
    try {
      stat = fs.lstatSync(filePath);
    } catch {
      continue;
    }
    if (stat.isFile() && stat.size === 0) zero.push(file);
  }
  return zero;
}

function checkPrePush(repo, { baseRef, allow, allowEmpty }) {
  let ok = assertCleanWorktree(repo);
  ok = assertFinalizationLockUnchanged(repo) && ok;
  if (!allow.length) {
    fail('No expected scope was supplied.', ['use one or more --allow <path> or --allow <directory/**> arguments']);
    return;
  }

  const { mergeBase, files } = changedFilesAgainstBase(repo, baseRef);
  const unexpected = files.filter((file) => !allow.some((pattern) => matchesPattern(file, pattern)));
  if (unexpected.length) {
    fail('PR contains files outside the explicitly expected scope.', unexpected);
    ok = false;
  }

  const empty = zeroByteFiles(repo, files).filter(
    (file) => !allowEmpty.some((pattern) => matchesPattern(file, pattern)),
  );
  if (empty.length) {
    fail('0-byte files are blocked unless explicitly allowed.', empty);
    ok = false;
  }

  if (ok) {
    console.log(`[repository-guard] OK: clean tree; PR base ${baseRef}; merge-base ${mergeBase}; ${files.length} PR-owned file(s).`);
  }
}

function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    ensureGitRepository(options.repo);
    if (options.command === 'lock') lockFinalization(options.repo);
    else if (options.command === 'unlock') unlockFinalization(options.repo, options.repair);
    else if (options.command === 'check') checkPrePush(options.repo, options);
    else throw new Error(`Unknown command: ${options.command}`);
  } catch (error) {
    fail(error.message);
  }
}

main();
