# Active Task

Task ID: nightwatch-systemmap-browser-stability-v1
Phase: SYSTEMMAP_BROWSER_STABILITY_V1
Title: C-15c Browser Spec Stale-UI Race Hardening
Status: COMPLETE
Task directory: .agent/tasks/nightwatch-systemmap-browser-stability-v1
Starting SHA: 89740646c08a5661d358cc05f20a5d94e135334d
Last validated implementation SHA: a8ce94a6beca0a4d870ef7d7bee1e9ac884458c2
Last checkpoint: close-out — M1–M4 complete; implementation a8ce94a certified (typecheck, 76 units, hardening, 20/20 lane + repeats, truth checkers); STOP
Current milestone: COMPLETE / STOP — all milestones closed, REPORT final, no defects introduced
Next action: STOP — integrate to main, release the session, remove the worktree; residual is owner-direction only
Authorization class: SYSTEMMAP_BROWSER_STABILITY_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 89740646c08a5661d358cc05f20a5d94e135334d
LAST_VALIDATED_IMPLEMENTATION_SHA: NONE
LAST_SUBSTANTIVE_CHECKPOINT_SHA: NONE
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_SYSTEMMAP_BROWSER_STABILITY_V1_STATUS: COMPLETE
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
