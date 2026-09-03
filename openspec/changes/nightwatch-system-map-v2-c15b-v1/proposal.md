# Proposal — System Map V2 (C-15b)

## Why

Nightwatch's graph contract permits 1,000 nodes and 2,000 edges. Its view draws
24 and 48, on a fixed three-column grid, with no pan, no zoom, no search and no
drill-down. After C-02b, C-03 and C-04 there are 1,745 operations, 12 proven
service bindings and 382 consumer edges to show, and the operator can see a
fortieth of it.

The scale gap is the visible problem. Two quieter ones matter more:

- The graph reports `truncated: boolean` and nothing else. It cannot say how
  much was dropped. That is the defect C-01 closed for operations and the graph
  never received.
- Nodes and edges carry proof, currentness, lifecycle and capability but no
  FACT CATEGORY, so there is nowhere to record that an edge is a `SOURCE_FACT`
  rather than an `INFERENCE`.

## Change

> Source graph contract v2 gives every node and edge exactly one fact category
> and an evidence status, and replaces the bare `truncated` flag with a
> projection-bound block carrying limit, total, projected, dropped, truncated
> and remainingUnknown. Server-side projections implement progressive
> disclosure from company to operation, each with its own bound. A
> deterministic layout binds the graph digest, the engine identity and version,
> the options and the projection version into one layout identity. The eight
> named operator queries each become a bounded projection with its own test.
> The view is rebuilt to pan, zoom, search, filter and drill down, and to show
> what it is not showing.

## What this change refuses to do

- No execution authority. GET/HEAD only, 405 otherwise, `executionAuthority:
  NONE`, no trigger, no hidden POST — negative-probed.
- No access to the C-10 production findings store.
- No evidence upgrade. A join is never stronger than its weakest input, and
  stronger evidence produces a new fact rather than rewriting an old one.
- No zeroing of `UNKNOWN` or `UNMEASURED`, and no pretence that zero measured
  production observations means production was observed. C-12 has not run.
- No EIG prioritisation and no target-selection change.

## Impact

- New: `src/controlCenter/contracts/systemMap.ts`,
  `src/core/systemMap/{model,projections,layout}.ts`.
- Changed: the Control Center source adapter and server route surface, the
  Control Center UI, `config/synthetic-campaign.v1.json`,
  `bin/hardening-check.mjs`.
