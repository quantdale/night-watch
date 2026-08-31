# Nightwatch Replay Budget and Dossier Closure — Spec

Task ID: nightwatch-replay-budget-and-dossier-closure-v1
Phase: REPLAY_BUDGET_DOSSIER_CLOSURE_V1
Status: IN_PROGRESS
Starting SHA: 4834e4da1ec40fbad9736f0a12d1d8f610cb622d
PROJECT_VERDICT_EFFECT: PRESERVE
Authorization class: NIGHTWATCH_REPLAY_BUDGET_DOSSIER_CLOSURE_V1
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Objective

Remove the specific campaign-budget starvation that prevented fresh,
DVR-011-admitted product candidates from reaching attack replay, minimization,
and dossier generation during the completed DEV soak.

The task MUST preserve bounded execution, fail-closed admission, current-source
identity, privacy, containment, and the existing OPERATIONALLY_ACCEPTED project
verdict unless genuinely invalidating evidence requires REEVALUATE.

## Starting evidence

The completed soak produced:

- 5 fresh Phase 7 prepare/resume pairs;
- 21/25 work items complete;
- account journey reached in 4/5 campaigns;
- 8 fresh strict product candidates;
- 2 stable candidate fingerprints;
- 4 reproduction queues;
- 0 attack replay executions;
- 0 minimizations;
- 0 dossiers;
- zero safety counters and privacy PASS.

All four reproduction queues were blocked before executor entry because the
three required journeys had already consumed `journeyContexts=3/3`.

## Required outcome

The successor MUST either:

1. implement and validate a bounded deterministic replay-reservation model that
   allows at least one eligible fresh candidate to enter attack replay while
   preserving explicit campaign limits; then confirm it in a fresh guarded DEV
   campaign through candidate -> replay -> minimization/dossier where evidence
   permits; or
2. prove that no safe bounded redesign is justified and close with an explicit
   blocked outcome.

## Non-goals

No production/NEXT contact, product mutation, datastore/database or
infrastructure changes, sibling-repository writes, external publication,
credential persistence, raw authenticated evidence in Git, DVR-011 weakening,
unbounded retries, or historical-candidate replay.
