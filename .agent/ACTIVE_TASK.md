# Active Task

Task ID: nightwatch-explain-id-flag-v1
Phase: EXPLAIN_ID_FLAG_V1
Title: Explain Positional-Id Flag Tolerance
Status: COMPLETE
Task directory: .agent/tasks/nightwatch-explain-id-flag-v1
Starting SHA: cb054f1f72810a4e005d5b6af078b5034ecf52f8
Last validated implementation SHA: 44f571323cc421a5243df659d3bfc539e9b7198a
Last checkpoint: close-out — M1–M3 complete; implementation 44f5713 certified (3 new tests, typecheck, hardening, truth checkers); STOP
Current milestone: COMPLETE / STOP — all milestones closed, REPORT final, no defects introduced
Next action: STOP — integrate to main, release the session, remove the worktree
Authorization class: EXPLAIN_ID_FLAG_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: cb054f1f72810a4e005d5b6af078b5034ecf52f8
LAST_VALIDATED_IMPLEMENTATION_SHA: NONE
LAST_SUBSTANTIVE_CHECKPOINT_SHA: NONE
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_EXPLAIN_ID_FLAG_V1_STATUS: COMPLETE
## Routing and safety

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

CLI parsing only; no product-core change. No production contact, no DEV
request, no credential acquisition.

C-00 governs: all implementation happens in the owned session worktree
`session/nightwatch-explain-id-flag-v1-79e155d9`. The canonical checkout is
never used for implementation.
