# Report — nightwatch-explain-id-flag-v1

Status: IN_PROGRESS (M1 pending)

## Campaign

```text
Campaign: explain positional-id flag tolerance (CLI robustness)
Task ID: nightwatch-explain-id-flag-v1
Starting SHA: cb054f1f72810a4e005d5b6af078b5034ecf52f8
Implementation anchor: NONE (no implementation change yet)
Final SHA: not yet integrated
```

## Objective

Make `explain`'s positional id flag-tolerant; regression-test;
integrate.

## Diagnosis (evidence, not conclusion)

`explain --json` fails `EXPLAIN_ID_UNSAFE` because the command reads
`args[1]` raw and `--json` occupies that slot. Same order-fragility
class as the explain-surface defect fixed previously.

## Change

Pending (M2): first-non-flag extraction + focused tests.

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
