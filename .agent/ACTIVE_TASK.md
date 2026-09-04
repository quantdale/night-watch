# Active Task

Task ID: nightwatch-explain-id-flag-v1
Phase: EXPLAIN_ID_FLAG_V1
Title: Explain Positional-Id Flag Tolerance
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-explain-id-flag-v1
Starting SHA: cb054f1f72810a4e005d5b6af078b5034ecf52f8
Last validated implementation SHA: cb054f1f72810a4e005d5b6af078b5034ecf52f8
Last checkpoint: M1 done — session claimed at cb054f1; SPEC/PLAN/STATE + OpenSpec written; M2 fix next
Current milestone: M2 — Extraction fix and tests (IN_PROGRESS)
Next action: Apply the first-non-flag extraction + regression tests in the worktree, then run typecheck and focused suites
Authorization class: EXPLAIN_ID_FLAG_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: cb054f1f72810a4e005d5b6af078b5034ecf52f8
LAST_VALIDATED_IMPLEMENTATION_SHA: cb054f1f72810a4e005d5b6af078b5034ecf52f8
LAST_SUBSTANTIVE_CHECKPOINT_SHA: cb054f1f72810a4e005d5b6af078b5034ecf52f8
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_EXPLAIN_ID_FLAG_V1_STATUS: IN_PROGRESS

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
