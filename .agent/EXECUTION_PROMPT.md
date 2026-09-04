# EXECUTION PROMPT — Sibling Browser Spec Click Robustness

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: COMPLETE
Campaign ID: nightwatch-control-center-click-robustness-v1
OpenSpec: openspec/changes/nightwatch-control-center-click-robustness-v1/
Planned-From: 9cf37a4d425fe46d453e46a9ceb820b2fd44a420
Target Branch: main
Predecessor Task ID: nightwatch-systemmap-browser-stability-v1
Predecessor Status: COMPLETE

## Mission

Harden the sibling spec's two `Inspect` clicks with visibility gates
and box-independent dispatch (mirroring the proven systemMapV2 shape),
prove 10/10 serial lane repeats green, and integrate. Test-only; zero
product-code change. Local/synthetic only.

## Authority

```
IMPLEMENTATION AUTHORIZED:
  tests/browser/controlCenterBrowser.browser.ts click robustness only

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
`session/nightwatch-control-center-click--12588f37`.

## Ordered workstreams

1. Task record, OpenSpec change, routing — BEFORE code (M1).
2. Helper + gates + two conversions (M2).
3. Stability validation: 10x serial repeats, typecheck, hardening,
   truth checkers (M3).
4. REPORT, integration, release, worktree removal (M4).

## Constraints

Test file only. ADD assertions, never remove or relax any; no skips; no
timeout changes; no product change; no manifest/registry change; no
force push; no history rewrite.
