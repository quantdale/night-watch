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

On 2026-09-01, the owner-refreshed designated DEV state was revalidated through
the normal no-refresh Phase 7 prepare-only path. It failed closed with
`AUTH_NETWORK_FAILURE` before campaign preparation. Sanitized diagnostics showed
the state shape and DEV provenance valid, the required token present, and
domain/path applicable, but the token was not unexpired and the state was not
page-readable. No fresh campaign manifest, candidate, replay, minimization, or
dossier was produced.

## DEV confirmation blocker

The task stops before product campaign work. The owner-refreshed designated
external DEV state still fails page-readable validation. No repeated refresh,
retry, alternate credential, predecessor checkpoint, historical candidate, or
stale manifest is authorized. Unblock requires a separately supplied
designated state that passes the guarded page-readable validation for the
configured DEV target.

## Safety

Production, NEXT, mutation, datastore/infrastructure, sibling writes,
publication, credential persistence, raw authenticated evidence in Git,
containment weakening, DVR-011 weakening, and unbounded replay are forbidden.

## Terminal disposition

The implementation and every reachable local validation milestone are closed.
The exact-head Actions observation remains external non-evidence because its
only job had zero executed steps. Guarded DEV execution stopped before campaign
preparation after the owner-refreshed state failed the page-readable gate;
therefore no fresh candidate, replay, minimization, dossier, or product finding
is claimed.

Continuity v2, OpenSpec task reconciliation, project truth, hardening,
owner-provenance, generated-artifact/privacy inspection, and both authoritative
local and clean Node20 quality gates passed at final continuation head
`9f0d9a2683b7c3129894f851815035c1905ad03b`. The active task remains `BLOCKED`
solely at the owner-managed page-readable DEV auth boundary; no alternate
credential, stale state, historical candidate, or retry is authorized. Final
blocked documentation checkpoint `d3328d97016a6c48cc05e1fb1276270760943353`
was pushed to `origin/main`, and post-push verification confirmed a clean
working tree with `HEAD == origin/main`; the task remains `BLOCKED` solely at
the owner-managed page-readable DEV auth boundary.
