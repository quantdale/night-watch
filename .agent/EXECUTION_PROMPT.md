# EXECUTION PROMPT — C-15c Browser Spec Stale-UI Race Hardening

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: IN_PROGRESS
Campaign ID: nightwatch-systemmap-browser-stability-v1
OpenSpec: openspec/changes/nightwatch-systemmap-browser-stability-v1/
Planned-From: 89740646c08a5661d358cc05f20a5d94e135334d
Target Branch: main
Predecessor Task ID: nightwatch-alphaus-finding-handoff-c12-readiness-v1
Predecessor Status: COMPLETE

## Mission

Close the stale-UI race in `tests/browser/systemMapV2.browser.ts` with two
additive member-readiness gates (6d L2 members, 6e L4-op-0 breadcrumb +
consumer member), prove 10/10 serial browser-lane repeats green, and
integrate. Test-only; zero product-code change. Local/synthetic only.

## Authority

```
IMPLEMENTATION AUTHORIZED:
  tests/browser/systemMapV2.browser.ts member-readiness gates only

REAL PRODUCTION CONTACT:
  NOT AUTHORIZED

C-12 EXECUTION:
  NOT AUTHORIZED IN THIS CAMPAIGN

C-08b:
  NOT AUTHORIZED

C-07 DEV:
  NOT AUTHORIZED
```

Repository-local and offline. No production contact, no NEXT contact, no DEV
request, no credential acquisition.

C-00 governs: all implementation happens in the owned session worktree
`session/nightwatch-systemmap-browser-sta-9be47eca`.

## Ordered workstreams

1. Task record, OpenSpec change, routing — BEFORE code (M1, done).
2. Member-readiness gates: 6d L2-member gate, 6e L4-op-0 breadcrumb +
   consumer-member gates (M2).
3. Stability validation: 10x serial repeats, sibling browser spec,
   adjacent unit suites, typecheck, hardening, truth checkers (M3).
4. REPORT, integration, release, worktree removal (M4).

## Constraints

Test file only. ADD assertions, never remove or relax any; no skips; no
timeout inflation as a fix; no product change; no manifest/registry change;
no force push; no history rewrite. Diagnosis (fiber probe + L4 traffic) is
recorded in SPEC.md and must not be rediscovered.
