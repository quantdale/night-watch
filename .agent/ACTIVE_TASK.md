# Active Task

Task ID: nightwatch-systemmap-browser-stability-v1
Phase: SYSTEMMAP_BROWSER_STABILITY_V1
Title: C-15c Browser Spec Stale-UI Race Hardening
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-systemmap-browser-stability-v1
Starting SHA: 89740646c08a5661d358cc05f20a5d94e135334d
Last validated implementation SHA: 89740646c08a5661d358cc05f20a5d94e135334d
Last checkpoint: M1 done — session claimed at 8974064; SPEC/PLAN/STATE + OpenSpec written; M2 fix next
Current milestone: M2 — Member-readiness gates (IN_PROGRESS)
Next action: Apply the 6d L2-member gate and the 6e L4-op-0 gates in the worktree, then run typecheck and the browser lane
Authorization class: SYSTEMMAP_BROWSER_STABILITY_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 89740646c08a5661d358cc05f20a5d94e135334d
LAST_VALIDATED_IMPLEMENTATION_SHA: 89740646c08a5661d358cc05f20a5d94e135334d
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 89740646c08a5661d358cc05f20a5d94e135334d
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_SYSTEMMAP_BROWSER_STABILITY_V1_STATUS: IN_PROGRESS

## Routing and safety

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

No product-code change in this campaign. No production contact, no DEV
request, no credential acquisition.

C-00 governs: all implementation happens in the owned session worktree
`session/nightwatch-systemmap-browser-sta-9be47eca`. The canonical checkout is
never used for implementation.
