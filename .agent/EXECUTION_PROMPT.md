# EXECUTION PROMPT — Explain Positional-Id Flag Tolerance

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: IN_PROGRESS
Campaign ID: nightwatch-explain-id-flag-v1
OpenSpec: openspec/changes/nightwatch-explain-id-flag-v1/
Planned-From: cb054f1f72810a4e005d5b6af078b5034ecf52f8
Target Branch: main
Predecessor Task ID: nightwatch-explain-surface-flag-v1
Predecessor Status: COMPLETE

## Mission

Make `explain`'s positional id flag-tolerant (first-non-flag rule,
validation unchanged), add focused regression tests, and integrate.
CLI parsing only. Local/synthetic only.

## Authority

```
IMPLEMENTATION AUTHORIZED:
  explain id extraction + one focused test file only

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
`session/nightwatch-explain-id-flag-v1-79e155d9`.

## Ordered workstreams

1. Task record, OpenSpec change, routing — BEFORE code (M1).
2. Extraction fix + regression tests (M2).
3. Focused suites, truth checkers, REPORT, integration, release (M3).

## Constraints

CLI parsing only; shape gate unchanged; no force push; no history
rewrite.
