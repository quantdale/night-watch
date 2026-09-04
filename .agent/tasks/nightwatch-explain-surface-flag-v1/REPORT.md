# Report — nightwatch-explain-surface-flag-v1

Status: COMPLETE

## Campaign

```text
Campaign: explain-surface documented flag form (CLI robustness)
Task ID: nightwatch-explain-surface-flag-v1
Starting SHA: a39f49c4222ef2f8d4c2f46419485845f6970a78
Implementation anchor: 2fbce767029fa5c830c9c473419542b222a9eaf0
Final SHA: Live HEAD: DISCOVER_FROM_GIT (see Git section at release)
```

## Objective

Accept the README-documented `--surface=<id>` form for
`explain-surface` without weakening validation; regression-test all
forms; integrate.

## Diagnosis (evidence)

README documents `--surface=<safe-id>`; the command read `args[1]`
raw, so the documented order failed with a misleading
`EXPLAIN_SURFACE_ID_UNSAFE` refusal even for proven ids (verified live
against a real discovered surface id). Positional form additionally
required slot 1 exactly, breaking on any flag-first order.

## Change

`bin/nightwatch-intelligence.mjs`: explicit `--surface=` wins, else
first non-flag positional; the shape regex and downstream membership
enforcement unchanged. New `tests/unit/explainSurfaceArgForms.test.ts`
(3 tests: flag form, positional-after-flags identity, malformed
refusal) with live-discovered ids, never hardcoded digests.

## Validation

- New tests 3/3 green; `tsc --noEmit` clean.
- `hardening:check`, `agent:check`, `project:check`, `handoff:check`
  PASS (verified at close).
- `gate:local` not re-run: no gate-covered surface changed; the new
  test runs in the full canonical regression.

## Known issues

None. Refusal behavior preserved (shape + membership enforced on both
forms).

## Requirement ledger

SPEC.md acceptance: both forms green ✓; malformed refused ✓; checkers
green ✓; integration ✓.

## Recommendation

Integrate. No follow-up required.

## Git

Session branch `session/nightwatch-explain-surface-flag--4fe14ac8`
fast-forward pushed to `origin/main`; HEAD == origin/main verified;
session released; worktree removed. See push verification in STATE.
