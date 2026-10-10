## Context

`Promise.race([response.body(), timeout])` bounds how long the caller waits, not how long or how much the losing operation consumes. Playwright's `response.body()` returns a complete `Buffer`, so checking text length afterward cannot prevent allocation. The observer does not track unresolved acquisitions as owned resources that must terminate before context close and campaign settlement.

## Goals / Non-Goals

**Goals:** hard acquisition limits; cancellation/teardown ownership; safe incomplete classification; no semantic evaluation over partial/unbounded content; adversarial lifecycle proof.

**Non-Goals:** increase capture limits, retain raw response bytes, infer semantic success from headers, or browse external systems.

## Decisions

### Bound acquisition at the transport edge

Use an acquisition primitive that can stop after the configured byte budget and be aborted on deadline. If the underlying browser API cannot provide a truly bounded/cancellable read, classify the body as unavailable under that adapter rather than pretending a post-buffer check is a containment limit.

### Treat length metadata as preflight only

A trustworthy declared length above the limit refuses before reading. Missing or acceptable content length does not waive streaming byte accounting, especially for compressed, chunked, or inconsistent responses.

### Own and join every acquisition

Each request-generation acquisition is registered before start and reaches exactly one terminal state: `COMPLETE`, `REFUSED_OVERSIZE`, `ABORTED_TIMEOUT`, `ABORTED_TEARDOWN`, or `FAILED_SAFE`. Timeout actively aborts the operation. Journey settlement joins terminal cleanup; failure to join triggers contained context destruction and a non-success result.

### Keep partial data non-authoritative

Partial bytes are discarded, never passed to semantic hooks, never persisted, and never included in diagnostic text. The observation records only bounded categorical metadata and declared/observed size counters.

## Risks / Trade-offs

Some response bodies previously inspected through whole-buffer APIs will become explicitly unavailable until a bounded adapter exists. This is safer than silently exceeding the containment budget.

## Migration Plan

1. Add adversarial response servers inside contained synthetic fixtures.
2. Introduce acquisition registry, byte/deadline budget, and terminal states.
3. Replace or quarantine whole-buffer response reads.
4. Bind context/journey teardown to acquisition cancellation and join.
5. Add property/mutation/resource-leak coverage and run browser/local/clean gates.

## Open Questions

None. A timeout that merely stops awaiting is not cancellation.
