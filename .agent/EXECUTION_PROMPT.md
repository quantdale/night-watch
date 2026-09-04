# EXECUTION PROMPT — Plan-Explain Cross-Command Coherence Test

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: IN_PROGRESS
Campaign ID: nightwatch-plan-explain-coherence-v1
OpenSpec: openspec/changes/nightwatch-plan-explain-coherence-v1/
Planned-From: caec3cc05cba32eb77b22f9f0b608adaac7b1f46
Target Branch: main
Predecessor Task ID: nightwatch-explain-id-flag-v1
Predecessor Status: COMPLETE

## Mission

Pin the `plan` → `explain` contract with one focused regression test
(plan-emitted member id explains positively). Test-only. Local/
synthetic only.

## Authority

```
IMPLEMENTATION AUTHORIZED:
  one focused coherence test file only

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
`session/nightwatch-plan-explain-coherenc-faaf601a`.

## Ordered workstreams

1. Task record, OpenSpec change, routing — BEFORE code (M1).
2. Coherence test (M2).
3. Focused suites, truth checkers, REPORT, integration, release (M3).

## Constraints

Test-only addition; no product change; no force push; no history
rewrite.
