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

M0 is complete at the pushed deterministic regression. M1 is now complete:
the chosen design is a durable campaign/cluster replay reservation ledger,
with one protected browser slot in the initial real profile, normalized
physical replay requirements, and no collection-limit increase or retry
bypass. M2 implementation and adversarial validation are active; see STATE.md
for the exact validation ledger.

## Safety

Production, NEXT, mutation, datastore/infrastructure, sibling writes,
publication, credential persistence, raw authenticated evidence in Git,
containment weakening, DVR-011 weakening, and unbounded replay are forbidden.
