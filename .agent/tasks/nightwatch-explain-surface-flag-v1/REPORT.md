# Report — nightwatch-explain-surface-flag-v1

Status: IN_PROGRESS (M1 pending)

## Campaign

```text
Campaign: explain-surface documented flag form (CLI robustness)
Task ID: nightwatch-explain-surface-flag-v1
Starting SHA: a39f49c4222ef2f8d4c2f46419485845f6970a78
Implementation anchor: NONE (no implementation change yet)
Final SHA: not yet integrated
```

## Objective

Accept `--surface=<id>` for `explain-surface`; regression-test both
forms; integrate.

## Diagnosis (evidence, not conclusion)

README documents `--surface=<safe-id>`; the command reads `args[1]`
raw, so any flag order with `--repo=` first yields a misleading
`EXPLAIN_SURFACE_ID_UNSAFE` refusal even for proven ids (verified live
against a real discovered surface id).

## Change

Pending (M2): extraction disjunct + focused tests.

## Validation

Pending (M2–M3). No validation results to report yet.

## Known issues

The incoherence under repair (see Diagnosis).

## Recommendation

Complete M2–M3; no follow-up campaign required.
```

## Requirement ledger

SPEC.md acceptance criteria map 1:1 to M2–M3 milestones in PLAN.md; all
pending.
