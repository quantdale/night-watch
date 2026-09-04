# SPEC — nightwatch-explain-id-flag-v1

## Frozen intent

Make the `explain` command's positional id flag-tolerant: skip `--*`
tokens when resolving the id, so `explain --json` (and any flag-first
order) no longer fails with a misleading `EXPLAIN_ID_UNSAFE` refusal.
The shape gate and plan-membership lookup stay exactly as strict.

## Hard boundaries (frozen)

`bin/nightwatch-intelligence.mjs` `explain` id extraction + focused
test coverage; no product-core change; no manifest/registry/gate
change; no force-push; no history rewrite. C-00 worktree discipline.

## Declared deletions

None. Additive-only.

## Acceptance (frozen)

- `explain --json` returns the null-id preview envelope; `explain
  <member-id> --json` explains the member; malformed ids still fail
  `EXPLAIN_ID_UNSAFE`.
- Focused tests green; `tsc --noEmit`, `hardening:check`,
  `agent:check`, `project:check`, `handoff:check` green.
- Integrated to `origin/main`, session released, worktree removed, task
  COMPLETE with REPORT.
