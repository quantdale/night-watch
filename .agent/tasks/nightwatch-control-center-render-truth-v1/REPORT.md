# REPORT — nightwatch-control-center-render-truth-v1

CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
Task ID: nightwatch-control-center-render-truth-v1
Status: IN_PROGRESS

Evidence ledger for this campaign. It records what was actually run and
observed, not what was intended. Receipts are written as they are produced.

## Campaign identity

- Task: `nightwatch-control-center-render-truth-v1`
- Session branch: `session/nightwatch-control-center-render-287b0e00`
- Session identity: `sess-390d800d5900`
- Starting SHA: `f0180d1f58d4ab1a1e7e8e226554cf0564ad7f16`
- Scope: R-01 through R-04 as registered in the OpenSpec `audit.md`.

## M0 — execution truth

Owned session created and claimed on base `f0180d1`. `session:status` verdict
PASS with all seven workspace invariants PASS. Predecessor
`nightwatch-control-center-placement-coverage-v1` re-verified terminal
COMPLETE. Planning route written and committed. The feasibility probe for the
differential render harness ran outside the tracked tree: 34 interfaces, 213
Overview-family leaves, 137 flips all observable in 4.76 seconds.

## M1 — harness core and the Overview family

The harness parses `types.ts` with the TypeScript compiler API and generates a
maximal fixture per contract; each scalar leaf carries a value and one or two
alternative values. For a view it renders a baseline, flips one leaf, renders
again, and requires the DOM to change.

Measured on the Overview/Safety family: 34 interfaces parsed, 16 contracts
generated, more than 300 leaves, 62 asserted leaves for
Health/Meta/Readiness/Safety. The three tests (generator non-vacuity,
deterministic re-render, observability matrix) pass in 5.4 seconds.

Findings: four constant fields were bound to no render and are now rendered —
`HealthSnapshot.readOnly` (the Overview read-only posture now requires both
contracts), `MetaSnapshot.scope` and `MetaSnapshot.productContact` (service
authority rows), and `ReadinessSnapshot.ownerScope.reason` (readiness row).
`HealthSnapshot.scope` and `SafetySnapshot.scope` are exempt as single-value
constants asserted by the fixed loopback posture label. Mutation proof:
removing the readiness owner-scope reason row fails on exactly that key;
restoring passes. Full UI suite 61/61.

## M2 — list, graph, campaign and finding views

The matrix grew to eleven contracts across seven views, driven through the
real selection flows (inspect a run, then open its detail, timeline and
execution graph). It reported 16 unobservable leaves; all were closed by
rendering:

- runs list: `product`, `endedAt`, `durationMs`, `nightwatchSha`;
- run detail: identity now comes from the payload (`detail.run.runId`) rather
  than the selection prop;
- timeline: event `dataCodes` are rendered by value, and a payload/selection
  identity mismatch is surfaced;
- execution graph: the node inventory shows `nodeId` beside the label and
  gained a `reasonCode` column;
- campaigns: `executionOnly`, named `blockerCodes` and `reasonCodes`, the
  coverage row `memberId`, and stage `reasonCodes`;
- `passed` (list and detail) is exempt by suffix as the boolean projection of
  `status`.

The matrix passes in 11 seconds; the full UI suite is 61/61.

## M3 — reviewer, source and system map

All sixteen contracts are covered. Two generator defects surfaced here and
were fixed rather than worked around: generic type arguments were unresolved
(`ReviewerElement<TValue>.value` became a string where an object was expected,
crashing the reviewer view), and named type aliases (`EpistemicClass`) were
unresolved, so enum fields became invalid sentinels. Graph fixtures are now
internally coherent: edge endpoints name nodes the same snapshot carries.

32 leaf findings closed:

- reviewer: member finding ids, the local-review authority and the per-row
  verdict authority are now bound to the contract;
- source: an edge inventory, node `lifecycle` and `nodeId`, the payload
  `surfaceId` in the canvas footer, all four authority rollups
  (currentness/lifecycle/proof/capabilities) as a full table, and named source
  gap reasons in the Safety Center;
- system map: `level`, `query`, `focusId` and `measurement` in the provenance
  footer, plus node and edge table fallbacks that render kind, fact category,
  evidence, coverage and layer.

`layer` is no longer exempt in either guard, because the map now renders it.
The matrix covers all 16 contracts in 21 seconds; the full UI suite is
61/61.

## M4 — view-change focus, title and announcement

`navigate()` and the `hashchange` listener now raise a navigation flag, and a
single effect on the active view sets
`document.title = Nightwatch Control Center — <label>` and, only when the flag
is set, focuses the main content region. Initial load and SSE refreshes do not
move focus. Two regressions cover both navigation paths, the title, the focus
move, initial-load focus and refresh preservation. App suite 39/39.

## M5 — dynamic-class application in the built bundle

The browser lane gained three computed-style blocks: `status-ready` and
`status-warning` backgrounds are non-transparent and distinct;
`rect.graph-node` strokes are never `none` (the SVG default) so the
interpolated tone class applies; and `stage-chip` border width is `1px`,
proving the chip rule reaches the artifact. Lane result: 4 passed in 7.3
minutes. One earlier attempt hit the documented detached-row race in the
30-decision workflow; it passed in isolation and in the repeated full lane,
and no retry was added.

## M6 — registration and UI validation

_To be filled during execution._

## M7 — certification

_To be filled during execution._

## Safety events

NONE. No product contact, no network egress, no execution or mutation
authority, no publication. No server bound, contract field or sanitizer
changed.
