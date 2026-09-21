## Context

`buildSemanticGapClosureLedger` accepts a map of status overrides and mints a digest from the assertion itself. `rebuildSemanticGapClosureLedger` joins by contract/class/reason without occurrence identity, walks the baseline rather than the current census, and treats any missing current record as obsolete. New gaps disappear from the output. Summary counts are derived from different populations. Separately, differential eligibility uses a sum of per-record distinct surfaces instead of one union.

## Goals / Non-Goals

**Goals:** lossless census; unique identity; evidence-bound transitions; count conservation; exact surface cardinality; adversarial rebuild proof.

**Non-Goals:** automatically close gaps, redesign coverage authority owned by NW-AUD-041, or authorize external work.

## Decisions

### Model baseline and current records explicitly

Rebuild creates one current record for every current graph gap and retains historical records only in a distinct transition history. Matching uses stable gap identity including occurrence/producer generation, never a lossy composite key.

### Closure requires typed evidence

Closed, merged, and obsolete states require the relevant verified graph-normalization, capability, replay, minimization, or source/currentness transition receipt. A caller status or digest of a label cannot close a gap.

### Enforce census invariants

Current-record count, status/class/reason totals, remaining count, and graph unresolved-gap count are recomputed from one population and must conserve exactly. Collisions and unexplained additions/removals fail closed.

### Count a union of surfaces

Differential eligibility requires at least two globally unique approved observation surfaces for the contract; repeated bindings to the same surface count once.

## Risks / Trade-offs

Some prior local reports may reveal omitted gaps or lose unproven closed states. Historical records remain readable but cannot be treated as current closure evidence.

## Migration Plan

1. Define stable gap and transition identities.
2. Replace overrides with typed closure receipts.
3. Rebuild from the current census and retain explicit history.
4. Enforce count conservation and global surface union.
5. Add adversarial rebuild tests and run Phase 21, coverage quality/report, hardening, local/clean, and full gates.

## Open Questions

None. Disappearance is a fact to explain, not closure evidence.
