# Replay Budget and Dossier Closure — Report

CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

Task ID: nightwatch-replay-budget-and-dossier-closure-v1
Phase: REPLAY_BUDGET_DOSSIER_CLOSURE_V1
Status: BLOCKED
Project verdict effect: PRESERVE
Starting SHA: 4834e4da1ec40fbad9736f0a12d1d8f610cb622d
Last validated implementation SHA: 6b13744bb0fa19047d681eaaf9aae9eb60b5a3c4

## Scope

Narrow architectural successor for the proven Phase 7 reproduction-budget
starvation. This task does not reopen the completed soak and does not authorize
general hardening.

## Current result

M0, M1, M2, and all local/source validation are complete. The bounded replay
reservation implementation is pushed at
`6b13744bb0fa19047d681eaaf9aae9eb60b5a3c4`; focused replay/checkpoint,
typecheck, hardening, handoff, project, semantic, owner-provenance, synthetic,
local-gate, and clean Node20 validation passed.

The exact pushed head was observed by Actions once as run `33446473458`; its
sole job `99666610250` failed with `steps=[]` and no retrievable log. This is
`NO_STEPS_BILLING_OR_PLATFORM_BLOCK`, external non-evidence; CI PASS is not
claimed.

Guarded DEV confirmation is blocked before campaign preparation. The
designated external auth file had valid path permissions but was not
page-valid. A no-refresh check failed with `AUTH_NETWORK_FAILURE`; one
guarded refresh attempt failed with `AUTH_STATE_REPLACEMENT_FAILED`. No fresh
campaign manifest, candidate, replay, minimization, or dossier was produced.

## DEV confirmation blocker

The task stops before product campaign work. The owner must refresh the
designated external DEV auth state and confirm page-readable validity for the
configured DEV target. No alternate credentials, predecessor checkpoint,
historical candidate, or stale manifest may be used.

## Safety

Production, NEXT, mutation, datastore/infrastructure, sibling writes,
publication, credential persistence, raw authenticated evidence in Git,
containment weakening, DVR-011 weakening, and unbounded replay are forbidden.
