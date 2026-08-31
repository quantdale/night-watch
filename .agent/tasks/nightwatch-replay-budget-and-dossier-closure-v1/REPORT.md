# Replay Budget and Dossier Closure — Report

CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

Task ID: nightwatch-replay-budget-and-dossier-closure-v1
Phase: REPLAY_BUDGET_DOSSIER_CLOSURE_V1
Status: IN_PROGRESS
Project verdict effect: PRESERVE
Starting SHA: 4834e4da1ec40fbad9736f0a12d1d8f610cb622d
Last validated implementation SHA: 9b7e3ad661bab91065a8674b6bfd5d0536f3495a

## Scope

Narrow architectural successor for the proven Phase 7 reproduction-budget
starvation. This task does not reopen the completed soak and does not authorize
general hardening.

## Current result

M0 is complete. The pushed deterministic regression proves three collection
journeys consume `journeyContexts=3/3`, a current-source product candidate is
clustered and queued, and the reproduction estimate fails
`BUDGET_EXHAUSTED` before replay executor entry. M1 design and later closure
remain in progress; see STATE.md for the validation ledger.

## Safety

Production, NEXT, mutation, datastore/infrastructure, sibling writes,
publication, credential persistence, raw authenticated evidence in Git,
containment weakening, DVR-011 weakening, and unbounded replay are forbidden.
