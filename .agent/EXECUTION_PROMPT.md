# EXECUTION PROMPT — Explain-Surface Documented Flag Form

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: COMPLETE
Campaign ID: nightwatch-explain-surface-flag-v1
OpenSpec: openspec/changes/nightwatch-explain-surface-flag-v1/
Planned-From: a39f49c4222ef2f8d4c2f46419485845f6970a78
Target Branch: main
Predecessor Task ID: nightwatch-dep-docs-reconciliation-v1
Predecessor Status: COMPLETE

## Mission

Accept the README-documented `--surface=<id>` form for
`explain-surface` (additive disjunct, validation unchanged), add
focused regression tests covering both forms plus refusal, and
integrate. CLI parsing only. Local/synthetic only.

## Authority

```
IMPLEMENTATION AUTHORIZED:
  explain-surface argument extraction + one focused test file only

REAL PRODUCTION CONTACT:
  NOT AUTHORIZED

C-12 EXECUTION:
  NOT AUTHORIZED IN THIS CAMPAIGN

C-08b:
  NOT AUTHORIZED

C-07 DEV:
  NOT AUTHORIZED
```

Repository-local and offline. No production contact, no NEXT contact, no
DEV request, no credential acquisition.

C-00 governs: all implementation happens in the owned session worktree
`session/nightwatch-explain-surface-flag--4fe14ac8`.

## Ordered workstreams

1. Task record, OpenSpec change, routing — BEFORE code (M1).
2. Extraction disjunct + regression tests (M2).
3. Focused suites, truth checkers, REPORT, integration, release (M3).

## Constraints

CLI parsing only; additive disjunct; shape gate unchanged; no force
push; no history rewrite.
