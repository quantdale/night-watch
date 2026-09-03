# Task State

## Identity

Task ID: nightwatch-system-map-v2-c15b-v1
Phase: SYSTEM_MAP_V2_C15B_V1
Status: IN_PROGRESS
Starting SHA: 9ac83bebbeb9ed747ff4a55e84701c4b95a1c692
Last validated implementation SHA: 9ac83bebbeb9ed747ff4a55e84701c4b95a1c692
Last substantive checkpoint SHA: 9ac83bebbeb9ed747ff4a55e84701c4b95a1c692
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-system-map-v2-c15b-v1-19d4f1bd
Last checkpoint: M1 opened at the C-04 closure head 9ac83be with the 24-node UI ceiling and the 1,000-node contract maximum measured before any change
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 9ac83bebbeb9ed747ff4a55e84701c4b95a1c692
LAST_VALIDATED_IMPLEMENTATION_SHA: 9ac83bebbeb9ed747ff4a55e84701c4b95a1c692
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 9ac83bebbeb9ed747ff4a55e84701c4b95a1c692
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PROJECT_VERDICT_EFFECT: PRESERVE

## Objective

Rebuild the source-graph projection model and view so Nightwatch exposes whole
system topology and evidence status at the scale its contracts already permit,
with every node and edge carrying exactly one fact category and every
projection reporting exactly what it dropped.

## Current Milestone

Milestone ID: M7 — renderer and Control Center authority probes
Milestone status: IN_PROGRESS
What is being attempted: replace the fixed 24-node grid with a pan/zoom/search/
filter view driven by the server-side projection, and re-prove the Control
Center authority and production-store exclusion invariants.

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

M7. Nothing partial: M1-M6 are closed.

## Exact Next Action

Wire the projections into the Control Center source adapter behind contract v2,
replace `SourceGraphCanvas`'s fixed 24-node grid with a pan/zoom/search/filter
view, and add the Control Center authority and production-store exclusion
probes. Then hardening rules, gate registration and the full validation matrix.

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

1. Read SPEC.
2. Read PLAN.
3. Inspect git status and current SHA in the session worktree.
4. Run the smallest relevant validation.
5. Continue Exact Next Action.

## Completion Snapshot

Populate only when complete.
