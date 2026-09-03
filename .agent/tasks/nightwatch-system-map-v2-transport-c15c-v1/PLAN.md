# C-15c System Map V2 HTTP Transport + Complete Operator UI

Task ID: nightwatch-system-map-v2-transport-c15c-v1
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Purpose

After C-15c, the System Map V2 model C-15b built is reachable by an operator
over HTTP, and navigable in the Control Center UI, with every boundary of its
bounded projections still visible on the screen.

## Starting State

C-15b closed at `cdfe9d7`. The model, its bounded projections and its layered
layout exist and are deterministic, and nothing outside the process can reach
them. The Control Center UI has seven views and none of them consumes the map.

Measured before any transport existed: 1,851 operations,
`operationPopulationTotal: null`, L1 at 1 node and 0 edges, layout digest
stable across repeated calls, both authority fields `NONE`.

## Scope

The V2 contract, the level and query adapters, the router segments, the
collector methods, the server dispatch, the API client functions, the System
Map operator view, the C-15c suite and its registration, a hardening rule, the
browser matrix and a scale measurement.

## Non-Goals

No change to the C-15b model, its projections or its layout. No new authority
of any kind. No v1 behaviour change. No production, NEXT or DEV contact. C-12
is not begun.

## Safety Constraints

GET and HEAD only. `executionAuthority: NONE` and `mutationAuthority: NONE` on
every answer, at every level and for every query. V2 segments parse before the
v1 prefix check so no v1 path is reinterpreted. Unknown level and query
segments parse to `unknown` rather than to a nearest match. The query allowlist
is exactly `focus`. Path traversal is rejected before any lookup.

A null `total` and a null `dropped` render as "unknown" and never as `0`. An
`UNMEASURED` result with zero nodes is labelled as unmeasured rather than
presented as clean.

## Architecture / Approach

## Milestones

### M1 — Task record and measured baseline (scaffolding FIRST)

SPEC/PLAN/STATE/REPORT, the OpenSpec change, ACTIVE_TASK and EXECUTION_PROMPT
routing, and the `LIVE_*` block, written BEFORE any gate battery runs.

This ordering is the correction to a mistake made twice in a row: in C-16 and
again in C-07 I ran `gate:predev` before the task record existed, and it failed
at HANDOFF_TRUTH with eight groups NOT_RUN both times. Scaffolding precedes
battery.

### M2 — Contract and adapter

`src/controlCenter/contracts/systemMap.ts` — the V2 wire DTOs, including
`ProjectionBoundDto` with a nullable `total` and a nullable `dropped`.

`src/controlCenter/adapters/systemMapAdapter.ts` — level and query adapters
over the C-15b model, the per-level limits, and the segment maps. The adapter
projects; it never widens and never invents a total.

### M3 — Router, collector and server dispatch

V2 segments parsed BEFORE the v1 prefix check so v1 is never reinterpreted.
Unknown level and unknown query segments parse to `unknown` rather than to a
nearest match. Query allowlist is exactly `['focus']`. GET/HEAD only.

### M4 — UI consumption

`api.ts` gains `loadSystemMapLevel` and `loadSystemMapQuery`, each asking for
ONE level — no whole-company payload is ever cached client-side, which is the
point of progressive disclosure.

`App.tsx` gains the System Map view: L1→L4 drill and breadcrumb return, the
eight operator queries, search, evidence filter, pan, zoom, keyboard drive,
a node detail panel, the blocking chain, and the provenance footer.

Two renderings are load-bearing rather than cosmetic:
- a null `total` and a null `dropped` render as the word "unknown";
- an `UNMEASURED` result carries a banner saying the emptiness is an absence of
  measurement.

### M5 — Suite, registration and hardening

The C-15c suite, registered in BOTH `config/campaign-certification.v1.json` and
`config/synthetic-campaign.v1.json` — an unregistered suite does not run in CI,
which is a lesson already paid for by C-02a and C-06.

A hardening rule pinning the boundary: no V2 route may carry execution or
mutation authority, and the bound renderer may not coerce a null to zero.

### M6 — Browser matrix and performance

The §89 scenario matrix, and a scale measurement at roughly 1,000 nodes and
2,000 edges.

### M7 — Validation, integration, exact-head CI, closure

Full battery, verified fast-forward integration, exact-head CI observation with
a PREDICTED skip delta, project-truth reconciliation, REPORT completion, then
release the session and remove the worktree and branch.

## Validation Strategy

typecheck, hardening, handoff, project, agent, agent audit, workspace, gate
inventory, semantic compatibility, synthetic campaign, `gate:predev`, the UI
unit suite, the UI build verifier, the C-15c suite, the browser matrix, the
canonical regression, `gate:local`, `gate:clean`, and exact-head GitHub
Actions with a PREDICTED skip delta.

## Decision Log

`ProjectionBound.total` and `.dropped` are both nullable on the wire, because
when the upstream population is unknown the dropped count is unknowable and a
non-nullable number would force the transport to invent one.

L1-with-a-focus and L2/L3/L4-without-a-focus return null rather than an empty
map, so the server answers `CONTROL_CENTER_NOT_FOUND`. An empty success is a
claim about the world; these are malformed requests.

The client fetches exactly the level it displays rather than fetching the whole
company and filtering locally, because a client that cached everything would
carry the privacy and scale profile of an unbounded API however little it drew.

## Discoveries

`MUTATION_CAPABLE_ROUTES` truncates with `total: null`, `dropped: null` and
`remainingUnknown: true`, so the obvious rendering would tell the operator they
had seen everything when the projection says the opposite.

`OBSERVED_PRODUCTION_PATHS` is empty with `measurement: UNMEASURED`, because no
production observation exists and none is authorized. C-10's production-store
exclusion is visible in the output as an absence the UI is required to name.

## Deferred Work

The browser scenario matrix and the scale measurement follow the suite and the
hardening rule, so there is something registered to exercise.

## Completion Criteria

The thirteen acceptance rows of `SPEC.md`, each carried in the REPORT
requirement ledger with exact evidence, plus exact-head CI green at the release
checkpoint with the predicted skip delta confirmed.
