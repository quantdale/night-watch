# Task State

## Identity

Task ID: nightwatch-system-map-v2-c15b-v1
Phase: SYSTEM_MAP_V2_C15B_V1
Status: COMPLETE
Starting SHA: 9ac83bebbeb9ed747ff4a55e84701c4b95a1c692
Last validated implementation SHA: 29a1bbd2daeea4b56c186b9bb56bffb3990d17bc
Last substantive checkpoint SHA: 29a1bbd2daeea4b56c186b9bb56bffb3990d17bc
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-system-map-v2-c15b-v1-19d4f1bd
Last checkpoint: exact-head GitHub run 33750522362 / job 100632776636 at c770721 passed all eleven required groups on Node 20 with receipt receipt:sha256:2f18e3765638cb523b58aeea; gate:clean PASS with inner receipt receipt:sha256:ba8c0db14231f77bc32dbbd7 and siblingWrites 0; canonical regression 3,396 total / 3,383 passed / 13 skipped / 0 failed; 20/20 negative probes detected; DEF-C15B-1 and DEF-C15B-2 introduced by this campaign, both found, repaired and reported
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 9ac83bebbeb9ed747ff4a55e84701c4b95a1c692
LAST_VALIDATED_IMPLEMENTATION_SHA: 29a1bbd2daeea4b56c186b9bb56bffb3990d17bc
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 29a1bbd2daeea4b56c186b9bb56bffb3990d17bc
LAST_DOCUMENTATION_CHECKPOINT_SHA: c7707218a3afb4b5fc8430ebd4fb4e7a20c8fa61
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PROJECT_VERDICT_EFFECT: PRESERVE

## Objective

Rebuild the source-graph projection model and view so Nightwatch exposes whole
system topology and evidence status at the scale its contracts already permit,
with every node and edge carrying exactly one fact category and every
projection reporting exactly what it dropped.

## Current Milestone

COMPLETE / STOP — M1 through M8 are closed. The 24-node grid is replaced by a
navigable, truncation-honest view; the fact model, bounded L1-L4 projections,
deterministic content-addressed layout and the eight operator queries are
implemented and tested; Control Center authority and the C-10 production-store
exclusion are re-proven. Certified by exact-head CI run 33750522362 / job
100632776636 at `c770721`.

One scope item is explicitly NOT delivered and is named in the REPORT: the
L1-L4 projections and the server-side layout are proven in core but not yet
exposed over HTTP, so the view consumes the v1 graph contract. That is the
largest remaining item and it is stated rather than implied finished.

## Completed Milestones

- M1 — task record, OpenSpec change, measured baseline. Committed at `67e2aaf`.
- M2 — contract v2 fact model in `src/core/systemMap/model.ts`: one
  `factCategory` per node and edge, the evidence-status vocabulary, the
  seven-state coverage vocabulary preserved, and `ProjectionBound` with
  limit/total/projected/dropped/truncated/remainingUnknown.
- M3 — the model builds over C-02b / C-03 / C-04 facts
  (`OperationFact`, `ServiceBindingFact`, `ConsumerEdgeFact`, `FindingFact`).
- M4 — progressive disclosure L1-L4 in `projections.ts`, each bounded and each
  reporting its exact drops.
- M5 — deterministic layered layout in `layout.ts`, content-addressed over
  graph digest + engine id + engine version + options + projection version,
  with no timing in the identity and no layout dependency added.
- M6 — the eight operator queries, each a named function with its own bound and
  its own test.

`tests/unit/c15bSystemMap.test.ts` 42/42, including a 1,000-node / 2,000-edge
projection at the contract maxima.

## Work In Progress

NONE.

## Exact Next Action

STOP — C-15b is COMPLETE and certified. All four authorized campaigns (C-02b,
C-03, C-04, C-15b) are closed. Per the authorization boundary, no further
campaign may begin: C-05, C-07, C-08, C-08b, C-09 and C-12 all require new
explicit owner authorization.

## Files Changed

| Path | Reason | Status |
|---|---|---|
| `.agent/tasks/nightwatch-system-map-v2-c15b-v1/SPEC.md` | frozen intent, measured baseline | WRITTEN |
| `.agent/tasks/nightwatch-system-map-v2-c15b-v1/PLAN.md` | living plan, eight milestones | WRITTEN |
| `.agent/tasks/nightwatch-system-map-v2-c15b-v1/STATE.md` | this waypoint | WRITTEN |
| `.agent/tasks/nightwatch-system-map-v2-c15b-v1/REPORT.md` | requirement ledger skeleton | WRITTEN |
| `openspec/changes/nightwatch-system-map-v2-c15b-v1/**` | five OpenSpec files | COMMITTED 67e2aaf |
| `src/core/systemMap/model.ts` | fact categories, evidence status, projection bounds | IMPLEMENTED |
| `src/core/systemMap/layout.ts` | deterministic layered layout and layout identity | IMPLEMENTED |
| `src/core/systemMap/projections.ts` | L1-L4 disclosure and the eight operator queries | IMPLEMENTED |
| `tests/unit/c15bSystemMap.test.ts` | bounds, categories, disclosure, queries, layout, scale | 42/42 PASS |

## Validation Ledger

Command: `nightwatch-session.mjs start` / `claim`
Result: PASS
When: 2026-09-03
Relevant failure/output summary: C-04 released; canonical clean at 9ac83be;
session `sess-0bd97f5978bf` claimed.

Command: measured the C-15b baseline
Result: recorded
When: 2026-09-03
Relevant failure/output summary: discovery 5,826 ms for 1,745 operations and
1,745 surfaces; serialising 250 surfaces takes 4 ms and 1,205,421 bytes;
contract maxima 1,000 nodes / 2,000 edges at default depth 1; the UI draws at
most 24 nodes and 48 edges.

Command: `npx playwright test tests/unit/c15bSystemMap.test.ts`
Result: PASS 42/42
When: 2026-09-03, session worktree
Relevant failure/output summary: passed on the first run. Includes the
contract-maxima scale case — 1,200 candidate operations bounded to 1,000 nodes
with `dropped` exactly 200, laid out in well under the 5s ceiling — and the
determinism matrix: same graph, shuffled order, changed node, changed edge,
changed option, changed projection version, and no timing in the identity.

## Decisions Made During This Task

Decision: measure before changing the view.
Reason: §61 forbids claiming an improvement without numbers, and the baseline
is also what shows the defect is a view limit rather than a contract limit.
Evidence/constraint: contract 1,000 nodes against a 24-node `slice`.

Decision: no layout dependency.
Reason: a layered assignment over a directed projection is a modest amount of
code, and a library would itself have to be pinned, audited and version-bound
into the very digest that is supposed to make the layout reproducible. The
engine identity and version are explicit fields precisely so a future swap
cannot collide with this one.

Decision: grouping nodes (COMPANY, PRODUCT) carry `INFERENCE`, not
`SOURCE_FACT`.
Reason: nothing mechanically proved that "Alphaus" is a node. It is structure
imposed for navigation, and labelling it a source fact would be the laundering
§48 forbids.

Decision: `weakerFactCategory` has no counterpart returning the stronger.
Reason: the absence of the function is the cheapest guarantee that no join can
strengthen its inputs.

## Discoveries

- The 24-node ceiling is two hard-coded `slice` calls and a modulo-3 grid in
  `SourceGraphCanvas`, not a rendering constraint. The contract was never what
  limited the operator.
- The graph contract carries `truncated: boolean` and no counts, so it cannot
  say how much was dropped — the defect C-01 fixed for operations and which the
  graph never received.
- Graph nodes and edges carry proof, currentness, lifecycle and capability but
  no FACT CATEGORY, so there is currently nowhere to record that an edge is a
  SOURCE_FACT rather than an INFERENCE.

## Blockers

None.

## Safety Events

NONE

## Deferred / Follow-Up

- EIG prioritisation and G-16 ownership: planning-only reconciliation, no
  implementation.

## Resume Recipe

Task complete. Do not resume; any follow-up starts as a new authorized task.

## Completion Snapshot

C-15b is COMPLETE and certified.

Final documentation checkpoint: c7707218a3afb4b5fc8430ebd4fb4e7a20c8fa61
Live HEAD: DISCOVER_FROM_GIT
Tests: canonical regression 3,396 / 3,383 / 13 skipped / 0 failed; semantic
compatibility 2,033 / 2,020 / 13 / 0; synthetic campaign 619/619; Control
Center UI 12/12.
Artifacts: `src/core/systemMap/{model,projections,layout}.ts`; the rebuilt
`SourceGraphCanvas`; `checkC15bSystemMapBoundary()`; two registered suites.
Known issues: the L1-L4 projections and the deterministic server-side layout
are implemented and tested but not yet exposed over HTTP, so the view still
consumes the v1 graph contract. `tests/unit/c02aOpenApiAdmission.test.ts` and
`tests/unit/c06PhpReadOnlyProof.test.ts` remain unregistered (PRE_EXISTING).
Recommended next task: none may begin under this authorization. The highest
value next campaign is C-05 universe and admission hygiene; C-12 requires new
explicit owner authorization.
