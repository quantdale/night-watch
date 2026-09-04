# Active Task

Task ID: nightwatch-dep-docs-reconciliation-v1
Phase: DEP_DOCS_RECONCILIATION_V1
Title: Dep-Removal Docs Reconciliation
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-dep-docs-reconciliation-v1
Starting SHA: 262c84b7ee93d22617e8b901655805d72123a84a
Last validated implementation SHA: 262c84b7ee93d22617e8b901655805d72123a84a
Last checkpoint: M1 done — session claimed at 262c84b; SPEC/PLAN/STATE + OpenSpec written; M2 correction next
Current milestone: M2 — Sentence correction and validation (IN_PROGRESS)
Next action: Apply the append-style correction in the worktree, then run hardening and truth checkers
Authorization class: DEP_DOCS_RECONCILIATION_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 262c84b7ee93d22617e8b901655805d72123a84a
LAST_VALIDATED_IMPLEMENTATION_SHA: 262c84b7ee93d22617e8b901655805d72123a84a
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 262c84b7ee93d22617e8b901655805d72123a84a
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_DEP_DOCS_RECONCILIATION_V1_STATUS: IN_PROGRESS

## Routing and safety

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

Docs-only change. No production contact, no DEV request, no credential
acquisition.

C-00 governs: all implementation happens in the owned session worktree
`session/nightwatch-dep-docs-reconciliati-8ec628a0`. The canonical checkout is
never used for implementation.
