# SPEC — nightwatch-explain-surface-flag-v1

## Frozen intent

Make `explain-surface` accept the README-documented `--surface=<id>`
form in addition to the positional form. Today the command reads
`args[1]` raw, so the documented flag order fails with a misleading
`EXPLAIN_SURFACE_ID_UNSAFE` refusal even for mechanically proven ids.
The shape validation (safe vocabulary, then vocabulary-membership
inside `explainSourceSurface`) stays exactly as strict; only argument
extraction gains the documented disjunct.

## Hard boundaries (frozen)

`bin/nightwatch-intelligence.mjs` argument extraction for
explain-surface + one focused regression test file; no product-core
change; no manifest/registry/gate change; no force-push; no history
rewrite. C-00 worktree discipline throughout.

## Declared deletions

None. Additive-only.

## Acceptance (frozen)

- `--surface=<proven-id>` and positional `<proven-id>` both return the
  explanation envelope; malformed ids still fail
  `EXPLAIN_SURFACE_ID_UNSAFE`.
- New regression tests green; `tsc --noEmit`, `hardening:check`,
  `agent:check`, `project:check`, `handoff:check` green.
- Integrated to `origin/main`, session released, worktree removed, task
  COMPLETE with REPORT.
