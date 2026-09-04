# Active Task

Task ID: nightwatch-p1-observation-scope-ma8-v1
Phase: P1_OBSERVATION_SCOPE_MA8_V1
Title: MA-8 / F-13 P1 Observation-Scope Prerequisite Implementation & Certification
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-p1-observation-scope-ma8-v1
Starting SHA: 0195a39e60e82b80439ec10ad5a36453804fe030
Last validated implementation SHA: NONE
Last checkpoint: NONE — M1 reconciled, M2 designed; M3 implementation next
Current milestone: M3 — src/core/prodObserveP1/ admission chain + subject + config
Next action: Implement P1 types, authorization, scopeConfig, and the observer admission evaluator in the session worktree; no production contact
Authorization class: P1_OBSERVATION_SCOPE_MA8_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 0195a39e60e82b80439ec10ad5a36453804fe030
LAST_VALIDATED_IMPLEMENTATION_SHA: NONE
LAST_SUBSTANTIVE_CHECKPOINT_SHA: NONE
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_P1_OBSERVATION_SCOPE_MA8_V1_STATUS: IN_PROGRESS

## Routing and safety

```
IMPLEMENTATION AUTHORIZED:
  MA-8 / F-13 P1 observation-scope prerequisite only

REAL PRODUCTION CONTACT:
  NOT AUTHORIZED

C-12 EXECUTION:
  NOT AUTHORIZED IN THIS CAMPAIGN

C-08b:
  NOT AUTHORIZED

C-07 DEV:
  NOT AUTHORIZED
```

E-16 verified canonical
(`docs/design/PRODUCTION-OBSERVABILITY-INDEPENDENT-REVIEW.md:1345`). Exact-head
CI inspected once at campaign start (run `33841467907`: `runner_id = 0`,
empty runner name, zero steps — external blocker, not a product failure).

C-00 governs: all implementation happens in the owned session worktree
`session/nightwatch-p1-observation-scope--3bd1d83d`. The canonical checkout is
never used for implementation.
