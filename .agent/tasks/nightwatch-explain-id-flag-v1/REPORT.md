# Report — nightwatch-explain-id-flag-v1

Status: COMPLETE

## Campaign

```text
Campaign: explain positional-id flag tolerance (CLI robustness)
Task ID: nightwatch-explain-id-flag-v1
Starting SHA: cb054f1f72810a4e005d5b6af078b5034ecf52f8
Implementation anchor: 44f571323cc421a5243df659d3bfc539e9b7198a
Final SHA: Live HEAD: DISCOVER_FROM_GIT (see Git section at release)
```

## Objective

Make `explain`'s positional id flag-tolerant; regression-test all
forms; integrate.

## Diagnosis (evidence)

`explain --json` failed `EXPLAIN_ID_UNSAFE` because the command read
`args[1]` raw while `--json` detection is order-independent. Same
order-fragility class as the explain-surface defect.

## Change

`bin/nightwatch-intelligence.mjs`: first-non-flag positional id; the
shape regex and plan-membership lookup unchanged. New
`tests/unit/explainIdFlagTolerance.test.ts` (3 tests: bare, both
orders identical, malformed refused).

## Validation

- New tests 3/3 green; `tsc --noEmit` clean.
- `hardening:check`, `agent:check`, `project:check`, `handoff:check`
  PASS (verified at close).
- `gate:local` not re-run: no gate-covered surface changed.

## Known issues

None. Refusal behavior preserved (shape + lookup enforced on all
forms).

## Requirement ledger

SPEC.md acceptance: forms green ✓; malformed refused ✓; checkers
green ✓; integration ✓.

## Recommendation

Integrate. No follow-up required.

## Git

Session branch `session/nightwatch-explain-id-flag-v1-79e155d9`
fast-forward pushed to `origin/main`; HEAD == origin/main verified;
session released; worktree removed. See push verification in STATE.
