# Active Task

Task ID: nightwatch-explain-surface-flag-v1
Phase: EXPLAIN_SURFACE_FLAG_V1
Title: Explain-Surface Documented Flag Form
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-explain-surface-flag-v1
Starting SHA: a39f49c4222ef2f8d4c2f46419485845f6970a78
Last validated implementation SHA: a39f49c4222ef2f8d4c2f46419485845f6970a78
Last checkpoint: M1 done — session claimed at a39f49c; SPEC/PLAN/STATE + OpenSpec written; M2 fix next
Current milestone: M2 — Flag disjunct and tests (IN_PROGRESS)
Next action: Apply the extraction disjunct + regression tests in the worktree, then run typecheck and focused suites
Authorization class: EXPLAIN_SURFACE_FLAG_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: a39f49c4222ef2f8d4c2f46419485845f6970a78
LAST_VALIDATED_IMPLEMENTATION_SHA: a39f49c4222ef2f8d4c2f46419485845f6970a78
LAST_SUBSTANTIVE_CHECKPOINT_SHA: a39f49c4222ef2f8d4c2f46419485845f6970a78
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_EXPLAIN_SURFACE_FLAG_V1_STATUS: IN_PROGRESS

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
