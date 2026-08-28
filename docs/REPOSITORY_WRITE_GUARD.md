# Repository Write Guard

This document defines the Babywetter repository safeguards for implementation, finalization and push preparation. It complements the repository's current CI workflow without changing product logic.

## 1. Work phases

### Implementation / repair phase

Repository content may be changed only inside the explicitly assigned scope. Commits and branch pushes are allowed after the required targeted tests and the pre-push sanity check pass.

### Finalization phase

Finalization starts once the final content commit is fixed and only diff/CI inspection, Draft -> Ready, labels, review state or merge preparation remain.

Enter it with:

```bash
npm run workflow:finalize
```

The command requires a clean working tree and records the current branch and HEAD in Git-internal metadata. While the lock is active:

- no repository file, blob, tree, commit or branch-ref write may be performed merely to carry out PR metadata actions;
- Draft -> Ready, CI/status queries, labels, reviews and merge preparation must be metadata-only operations;
- `npm run guard:pre-push` blocks a changed HEAD for the locked branch;
- a PR metadata action must never create a new commit, push or CI run by itself.

If an actual content fix becomes necessary, return deliberately to repair phase first:

```bash
npm run workflow:repair
```

After the fix, rerun the relevant tests, review the diff again and create a new finalization lock.

## 2. Start BASE_SHA and PR diff basis are different concepts

At work start, fetch/check `remote/main` exactly once and record that commit as `BASE_SHA`. The frozen start SHA answers only:

> What changed on main since this workstream started, and is any of it relevant?

It is not the default diff basis for the pre-push scope check.

The pre-push guard must use the actual current PR base ref, normally `origin/main`:

```bash
npm run guard:pre-push -- \
  --base-ref origin/main \
  --allow package.json \
  --allow tools/** \
  --allow test/repository-guard.test.js \
  --allow docs/REPOSITORY_WRITE_GUARD.md
```

The guard evaluates `origin/main...HEAD`, i.e. the merge-base against the current PR basis. Therefore, if main advances and a relevant main commit is later integrated into the feature branch, that integrated main change is not misclassified as a PR-owned scope change.

## 3. Pre-push sanity check

`npm run guard:pre-push` blocks the push preparation when any of these conditions is true:

- tracked working-tree changes are still uncommitted;
- untracked files exist;
- the PR diff contains a file outside the explicitly supplied `--allow` scope;
- a PR-owned file has size 0 bytes without an explicit `--allow-empty` exception;
- finalization is locked and the branch HEAD changed after the lock was created.

Allowed scope is always explicit. Exact paths and directory prefixes ending in `/**` are supported. Intentional empty files require their own explicit exception, for example:

```bash
npm run guard:pre-push -- \
  --base-ref origin/main \
  --allow docs/** \
  --allow-empty docs/INTENTIONALLY_EMPTY.md
```

Do not substitute the frozen start `BASE_SHA` for `--base-ref`.

## 4. Handling an advanced main

- Check `remote/main` once at work start and record `BASE_SHA`.
- During normal implementation, do not reflexively merge/rebase a newer main.
- Before final review/merge preparation, check current main once.
- Integrate newer main only for a relevant overlap or a real merge conflict.
- If newer main changes only independent files/functions, do not update the branch and do not repeat already-passed tests solely because main moved.
- Whether main was integrated or not, scope checking remains against the actual current PR base ref with triple-dot semantics.

## 5. Tests and CI

For changes to this guard, run the targeted regression suite:

```bash
npm run test:repository-guard
```

The repository's current pull-request workflow in `.github/workflows/integration.yml` remains authoritative for CI. Since `npm test` runs `node --test`, the guard regression test also runs in the existing Node matrix. The existing PR workflow additionally runs Playwright and the Wrangler deploy dry-run; no separate CI restart should be triggered by metadata-only PR actions.
