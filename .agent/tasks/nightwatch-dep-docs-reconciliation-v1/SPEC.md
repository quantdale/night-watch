# SPEC — nightwatch-dep-docs-reconciliation-v1

## Frozen intent

Reconcile one stale standing sentence in `docs/DECISIONS.md` (D-87
consequences) that still claims the root Vue 2 dependency "remains"
with "one low advisory", after campaign
`nightwatch-unused-dep-removal-v1` removed it (`npm audit` now zero).
Historical narrative stays untouched; only the present-tense standing
claim is corrected, per the repo's cell-by-cell reconciliation
precedent (R-12).

## Hard boundaries (frozen)

One sentence in `docs/DECISIONS.md` plus this task's own record; no
product/test/manifest/config change; no history rewrite (append-style
correction preserving the original wording's intent); no force-push.
C-00 worktree discipline throughout.

## Declared deletions

None.

## Acceptance (frozen)

- The standing claim reads truthfully post-removal.
- `hardening:check`, `agent:check`, `project:check`, `handoff:check`
  green in the session worktree.
- Integrated to `origin/main`, session released, worktree removed, task
  COMPLETE with REPORT.
