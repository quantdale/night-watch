# Active Task

Task ID: nightwatch-explain-surface-flag-v1
Phase: EXPLAIN_SURFACE_FLAG_V1
Title: Explain-Surface Documented Flag Form
Status: COMPLETE
Task directory: .agent/tasks/nightwatch-explain-surface-flag-v1
Starting SHA: a39f49c4222ef2f8d4c2f46419485845f6970a78
Last validated implementation SHA: 2fbce767029fa5c830c9c473419542b222a9eaf0
Last checkpoint: close-out — M1–M3 complete; implementation 2fbce76 certified (3 new tests, typecheck, hardening, truth checkers); STOP
Current milestone: COMPLETE / STOP — all milestones closed, REPORT final, no defects introduced
Next action: STOP — integrate to main, release the session, remove the worktree
Authorization class: EXPLAIN_SURFACE_FLAG_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: a39f49c4222ef2f8d4c2f46419485845f6970a78
LAST_VALIDATED_IMPLEMENTATION_SHA: NONE
LAST_SUBSTANTIVE_CHECKPOINT_SHA: NONE
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_EXPLAIN_SURFACE_FLAG_V1_STATUS: COMPLETE
## Routing and safety

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

CLI parsing only; no product-core change. No production contact, no DEV
request, no credential acquisition.

C-00 governs: all implementation happens in the owned session worktree
`session/nightwatch-explain-surface-flag--4fe14ac8`. The canonical checkout is
never used for implementation.
