# C-15b System Map V2

## Purpose

Nightwatch's contracts permit a 1,000-node graph and its view draws 24. C-15b
closes that gap and, more importantly, makes the graph say what kind of
evidence each node and edge is and how much of the picture is missing.

## Starting State

- Task ID: `nightwatch-system-map-v2-c15b-v1`
- Starting SHA: `9ac83bebbeb9ed747ff4a55e84701c4b95a1c692`
- Session branch: `session/nightwatch-system-map-v2-c15b-v1-19d4f1bd`
- Predecessor `nightwatch-frontend-consumer-intelligence-c04-v1` COMPLETE.

Measured, not to be rediscovered: discovery 5,826 ms for 1,745 operations;
contract maxima 1,000 nodes / 2,000 edges; UI ceiling 24/48; `truncated:
boolean` is the only bound signal; nodes carry no fact category; the only
projection is a depth-1 surface neighbourhood.

Available inputs: C-03's 12 proven service bindings, C-04's 382 consumer edges
(164 joined), C-02b's 590 proto RPCs, C-02a's 591 artifact operations,
ripple-api's 223 and ouchan's 341.

## Scope

Source graph contract v2 with fact category, evidence status and exact
projection bounds; the system map model over C-02b / C-03 / C-04 facts;
progressive disclosure L1-L4; deterministic layout and layout identity; the
eight operator queries; a pan/zoom/search/filter renderer; hardening rules with
probes; gate-registered suites.

## Non-Goals

No Control Center backend rewrite beyond the graph projection path. No
execution or mutation authority. No new dependency unless the existing
toolchain provably cannot do the job. No EIG prioritisation and no
target-selection change. No repository admission. No production observation.

## Safety Constraints

Control Center stays GET/HEAD only with 405 otherwise, `executionAuthority:
NONE` and `mutationAuthority: NONE`; the C-10 production findings store is
never reachable; evidence is never upgraded and a join never exceeds its
weakest input; `UNKNOWN` and `UNMEASURED` are never zeroed; every projection is
bounded and reports its exact drops; layout identity excludes timing; no
repository write while `gate:clean` evidence is running.

## Architecture / Approach

The backend stays. What changes is the projection layer beneath the graph
contract:

1. **`src/controlCenter/contracts/systemMap.ts`** — contract v2. One fact
   category per node and edge, the evidence-status vocabulary, and a
   `ProjectionBoundDto` carrying `limit`, `total`, `projected`, `dropped`,
   `truncated` and `remainingUnknown`.
2. **`src/core/systemMap/model.ts`** — the node and edge model, built from the
   existing source facts. Only the types the live data supports.
3. **`src/core/systemMap/projections.ts`** — the L1–L4 bounded projections and
   the eight operator queries, each a named function with its own bound.
4. **`src/core/systemMap/layout.ts`** — deterministic layered layout and the
   content-addressed layout identity.
5. **UI** — replace the fixed grid with a pan/zoom/search/filter view driven by
   the server-side projection.

## Milestones

### M1 — Task record, OpenSpec change, measured baseline — COMPLETE
### M2 — Contract v2: fact category and exact projection bounds — COMPLETE
### M3 — System map model over C-02b/C-03/C-04 facts — COMPLETE
### M4 — Progressive disclosure L1–L4 — COMPLETE
### M5 — Deterministic layout and layout identity — COMPLETE
### M6 — The eight operator queries — COMPLETE
### M7 — Renderer, and Control Center authority probes — COMPLETE
### M8 — Hardening, gate registration, validation, integration, closure — COMPLETE

## Validation Strategy

Source graph tests, Control Center contract/adapter/authority/server suites,
the browser suite where practical, C-02b/C-03/C-04 regression, C-01
completeness, C-10 production-store exclusion, typecheck, hardening, project,
handoff, agent, workspace, gate inventory, semantic compatibility, synthetic
campaign, full canonical regression, `gate:clean`, exact-head CI.

## Decision Log

- 2026-09-03 — Measure the baseline before touching the view. Reason: §61
  requires before/after numbers, and "the graph is faster" is not a claim this
  campaign may make without them.

## Discoveries

- The UI ceiling is not a rendering limitation but two hard-coded `slice`
  calls and a modulo-3 grid. The contract was never the constraint.

## Deferred Work

- EIG prioritisation and G-16 remain unowned; C-15b may reconcile ownership in
  planning only and must not implement either.

## Completion Criteria

Every SPEC acceptance row PASS with exact evidence, or a truthful documented
shortfall; canonical repository clean and synced; session released.
