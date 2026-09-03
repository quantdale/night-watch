# SPEC — C-15b System Map V2

Task ID: nightwatch-system-map-v2-c15b-v1
Phase: SYSTEM_MAP_V2_C15B_V1
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 9ac83bebbeb9ed747ff4a55e84701c4b95a1c692
Predecessor Task ID: nightwatch-frontend-consumer-intelligence-c04-v1
Predecessor Status: COMPLETE
Authorization class: NIGHTWATCH_SYSTEM_MAP_V2_C15B_V1

## Frozen intent

Rebuild the source-graph projection model and the graph view so Nightwatch can
expose whole-system topology and evidence status at the scale its own contracts
already permit — keeping the Control Center backend architecture, and keeping
it observational.

## Dependencies, both satisfied

- **C-03** service topology: 12 proto services bound to ouchan registrations as
  `SOURCE_FACT`, each with provenance and an embedding corroboration.
- **C-04** consumer edges: 382 frontend edges, 348 `SOURCE_FACT`, 164 joined to
  a specific backend operation.

Neither is blocked, so C-15b may claim completion on its own merits.

## Measured starting state

| Measure | Value |
|---|---|
| discovery | 5,826 ms for 1,745 operations / 1,745 surfaces |
| serialise 250 surfaces | 4 ms, 1,205,421 bytes |
| contract maximum nodes / edges | 1,000 / 2,000 |
| default graph depth | 1 |
| **UI visual ceiling** | **24 nodes / 48 edges** |

The defect is the last two rows together. `SourceGraphCanvas` in
`ui/control-center/src/App.tsx` does `graph.nodes.slice(0, 24)` and
`graph.edges.slice(0, 48)` onto a fixed three-column grid
(`x = 120 + (index % 3) * 230`). The contract permits forty times as many
nodes as the view can draw, and nothing tells the operator which is which.

Three further gaps, all in `src/controlCenter/contracts/sourceGraph.ts` v1:

1. `truncated: boolean` is the only bound signal. There is no `total`,
   `projected`, `dropped` or `remainingUnknown`, so an operator cannot tell a
   complete graph from a heavily cut one — the exact defect C-01 closed for
   operations and which the graph never received.
2. Nodes and edges carry `proof`, `currentness`, `lifecycle` and `capability`
   but no FACT CATEGORY. There is nowhere to say that an edge is a
   `SOURCE_FACT` rather than an `INFERENCE`.
3. There is no notion of a disclosure level. The only projection is a
   surface-centred neighbourhood at depth 1.

## Scope

- Source graph contract **v2**: one fact category per node and per edge, an
  evidence-status vocabulary, and a projection-bound block carrying exact
  counts.
- Server-side progressive disclosure: L1 company → products, L2 product →
  repositories and services, L3 service → routes and RPCs, L4 operation →
  handler, contracts, downstream, frontend consumers, findings.
- Deterministic layout whose identity binds the graph digest, the layout engine
  identity and version, the layout options and the projection version.
- The eight named operator queries, each individually implemented and tested.
- A renderer that can pan, zoom, search, filter, drill down and show
  truncation, replacing the 24-node grid.
- Hardening rules with negative probes; gate-registered suites.

## Non-goals

- No rewrite of the Control Center backend beyond the graph projection path.
- No execution authority of any kind. No new dependency unless the existing
  toolchain provably cannot do the job.
- No EIG prioritisation and no target-selection change (§66): planning-only
  ownership reconciliation at most.
- No production observation. C-12 remains unauthorized.

## Absolute invariants

- Control Center stays GET/HEAD only; non-GET/HEAD returns 405;
  `executionAuthority: NONE`; `mutationAuthority: NONE`; SSE accepts no
  commands; no execute endpoint and no hidden POST.
- The C-10 production-findings store (`$HOME/.nightwatch/prod-findings/`) is
  never reachable through the Control Center.
- A join is never stronger than its weakest input. Evidence is never upgraded
  in place; stronger evidence produces a new fact with new provenance.
- `UNKNOWN` and `UNMEASURED` never become zero. `TRUNCATED` invalidates
  completeness. Zero measured is distinct from unmeasured.
- No projection exceeds its contract bound, and any drop is reported with an
  exact count.

## Acceptance

1. Contract v2 versioned, with fact category and exact projection bounds.
2. C-03 topology and C-04 consumer data both represented in the graph.
3. Progressive disclosure L1–L4, each bounded and each reporting its drops.
4. Deterministic layout: identical input yields identical bytes; changing the
   graph, an option, the engine version or a bound changes the digest.
5. All eight operator queries implemented and individually tested.
6. Seven-state coverage preserved; `UNKNOWN`/`UNMEASURED` never zeroed.
7. Control Center authority unchanged and negative-probed.
8. Production-store exclusion intact.
9. Performance measured before and after.
10. Largest permitted projection (1,000 nodes / 2,000 edges) tested.
11. Suites gate-registered; hardening probes bite.
12. Canonical regression zero failures; clean and exact-head CI green;
    siblingWrites 0; session released.

## Declared Deletions

None.
