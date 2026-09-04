# EXECUTION PROMPT — Dep-Removal Docs Reconciliation

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: IN_PROGRESS
Campaign ID: nightwatch-dep-docs-reconciliation-v1
OpenSpec: openspec/changes/nightwatch-dep-docs-reconciliation-v1/
Planned-From: 262c84b7ee93d22617e8b901655805d72123a84a
Target Branch: main
Predecessor Task ID: nightwatch-unused-dep-removal-v1
Predecessor Status: COMPLETE

## Mission

Correct the stale standing Vue 2 sentence in DECISIONS.md
(append-style, history preserved), prove checkers green, and
integrate. Docs-only. Local/synthetic only.

## Authority

```
IMPLEMENTATION AUTHORIZED:
  docs/DECISIONS.md one-sentence correction only

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
`session/nightwatch-dep-docs-reconciliati-8ec628a0`.

## Ordered workstreams

1. Task record, OpenSpec change, routing — BEFORE code (M1).
2. Sentence correction + hardening + truth checkers (M2).
3. REPORT, integration, release, worktree removal (M3).

## Constraints

Docs-only; preserve surrounding historical text; no force push; no
history rewrite.
