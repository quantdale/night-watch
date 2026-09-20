## Context

The catalog declares an expected structural delta. `createRippleExplorationRuntime.execute` applies that expected delta to private state after any `COMPLETED` action and returns it. `actionOutcomeMismatch` correctly compares actual to expected, but the real adapter has already made them identical. The runtime observes route, shell/anchor presence, and network ledger; it does not re-read selected selector value, active vendor tab, or sort state after the interaction.

## Goals / Non-Goals

**Goals:** independently observed postconditions; bounded stabilization; unambiguous state; observation-derived transition identity; failure without invented state; exact replay based on proof; tests through the real runtime adapter.

**Non-Goals:** expand actions/routes/endpoints, inspect customer row values, persist DOM/text, execute a real campaign, or replace Playwright.

## Decisions

### Catalog entries declare observers and predicates

Each approved action includes a source-backed postcondition contract with a fixed observer kind and bounded safe result vocabulary. Examples include exact selected source-enum option, exact active source-enum tab, and categorical sort key/direction from an approved header/ARIA/class marker or an independently proven structural ordering signal. The catalog declares what must be true; it does not supply the observed value.

Observers may read only source-proven control labels/attributes and categorical structure. They never persist customer cell text, identifiers, costs, raw DOM, screenshots, or arbitrary page text.

### Sample before and after under stable settlement

Execution records a bounded precondition observation, performs the approved action, then waits for the postcondition and required network reads to settle under one deadline. The result is accepted only when the targeted control is unique, the document generation is current, and repeated samples reach the same source-backed postcondition. Stale/detached controls, no change where change is required, ambiguity, timeout, or network/UI contradiction fail categorically.

### Derive model state from observations

`safeViewState` is replaced by or updated from the admitted observed-state projection. `structuralDelta` is calculated as the difference between safe before/after observations. `nextState` is sampled after settlement and checked against that delta. The engine compares the observed delta to the declarative predicate and does not accept caller-supplied expected values as observations.

Failed or uncertain actions do not advance state, coverage, novelty, transition completion, or later precondition eligibility.

### Exact replay carries observation proof

Transition identity includes the safe postcondition contract version and observed categorical result. Exact replay re-observes the state and requires the same valid proof; copying the earlier expected delta cannot satisfy it.

## Risks / Trade-offs

- Some source controls may not expose a safe unique structural marker; those actions remain unavailable until source evidence supports one.
- UI stabilization adds latency; one shared deadline and bounded polling prevent hangs.
- Sort proof can be difficult without row values; use source-proven categorical control state or keep the action unadmitted, never infer from click success.

## Migration Plan

1. Define observer/predicate schemas and safe projections for each action kind.
2. Add before/after settlement and observation-derived delta/state to the Ripple runtime.
3. Make engine/replay require proof and prevent state advancement on uncertainty.
4. Add real-adapter local fixtures and mutation cases for each false-positive mode.
5. Run focused exploration tests and required local gates; update source-contract documentation.

Rollback disables actions lacking current observer support rather than restoring expected-value injection.

## Open Questions

None. Any catalog action without a source-backed privacy-safe postcondition observer remains unavailable.
