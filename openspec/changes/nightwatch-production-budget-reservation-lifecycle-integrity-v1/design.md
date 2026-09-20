## Context

Reservation currently increments request and in-flight counters before breaker and final kill-switch checks. Several return paths do not release that in-flight slot. Settlement accepts a structurally shaped reservation but decrements the ledger's aggregate in-flight counter rather than proving that the exact live reservation belongs to the ledger and has not already transitioned.

## Goals / Non-Goals

**Goals:** recover concurrency on every pre-dispatch path; exact reservation identity; explicit quota semantics; atomic final admission; exactly-once settlement; safe exception cleanup.

**Non-Goals:** increase any production budget, authorize production, change owner approval, or weaken circuit breakers and kill switches.

## Decisions

### Model reservation as a closed state machine

The ledger mints an immutable runtime capability in `RESERVED`. It can transition exactly once to `CANCELLED_BEFORE_DISPATCH` or `DISPATCHED`, and a dispatched capability can transition exactly once to `SETTLED`. Each transition validates object identity, ledger identity, route/service identity, grant identity, and current state.

### Separate quota from occupancy

Request admission charging is an explicit policy decision recorded once. Releasing a pre-dispatch reservation always frees concurrency; it does not silently refund or double-charge request quota. Receipts state whether quota was charged and why execution did not dispatch.

### Commit final admission coherently

Final kill-switch observation and one-shot grant consumption are followed by one ledger transition that binds the exact decision snapshot and request identity before the observer callback can run. Any failure before `DISPATCHED` cancels the reservation in a `finally`-owned path.

### Settle only actual dispatch

Only the holder of the exact registered `DISPATCHED` capability can record an outcome. Repeated/foreign/fabricated settlement returns a categorical refusal and leaves every counter and breaker input unchanged.

## Risks / Trade-offs

The ledger retains bounded live-reservation metadata until terminal transition. This is necessary to make concurrency and failure accounting auditable.

## Migration Plan

1. Freeze current counter and denial behavior in negative tests.
2. Add runtime reservation identities and lifecycle transition APIs.
3. Route every run-gate exit and exception through explicit cancellation or settlement.
4. Bind final dispatch to grant consumption and kill-switch evidence.
5. Add state-machine/property/mutation coverage and run local/clean gates.

## Open Questions

None. Pre-dispatch denial must release occupancy, and settlement must never infer identity from aggregate counters.
