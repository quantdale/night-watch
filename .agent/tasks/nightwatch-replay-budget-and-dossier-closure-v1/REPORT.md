# Replay Budget and Dossier Closure — Report

CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

Task ID: nightwatch-replay-budget-and-dossier-closure-v1
Phase: REPLAY_BUDGET_DOSSIER_CLOSURE_V1
Status: IN_PROGRESS
Project verdict effect: PRESERVE
Starting SHA: 4834e4da1ec40fbad9736f0a12d1d8f610cb622d
Last validated implementation SHA: 6b13744bb0fa19047d681eaaf9aae9eb60b5a3c4

## Scope

Narrow architectural successor for the proven Phase 7 reproduction-budget
starvation. This task does not reopen the completed soak and does not authorize
general hardening.

## Current result

M0 is complete at the pushed deterministic regression. M1 and M2 are
complete: the chosen design is a durable campaign/cluster replay reservation
ledger with one protected real-scale browser slot, normalized physical replay
requirements, strict checkpoint identity, and no collection-limit increase or
retry bypass. The implementation is pushed at
`6b13744bb0fa19047d681eaaf9aae9eb60b5a3c4`; focused replay/checkpoint,
typecheck, hardening, handoff, project, semantic, owner-provenance, and
synthetic validation are green. CI classification and guarded DEV confirmation
remain open; see STATE.md for the exact ledger.

## CI classification

The exact pushed implementation head
`6b13744bb0fa19047d681eaaf9aae9eb60b5a3c4` was observed once by GitHub
Actions as run `33446473458` (`Nightwatch hardening`). Its sole job
`99666610250` (`Executable quality gate`) completed `failure` with
`steps=[]`; failed-log retrieval returned `log not found`. This is classified
`NO_STEPS_BILLING_OR_PLATFORM_BLOCK`, external non-evidence. No repository
workflow step executed, so CI PASS is not claimed.

## Safety

Production, NEXT, mutation, datastore/infrastructure, sibling writes,
publication, credential persistence, raw authenticated evidence in Git,
containment weakening, DVR-011 weakening, and unbounded replay are forbidden.
