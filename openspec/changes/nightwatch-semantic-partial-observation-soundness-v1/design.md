## Context

`semanticStateEquals` returns a boolean even when either tree contains a truncated array. Consumers therefore cannot distinguish exact equality from equality of inspected prefixes. Collection-wide checks similarly use visible identity tokens without requiring a complete collection. The collection-item evaluator counts violations but discards per-item non-applicability, so absence of the tested field can become a pass.

## Goals / Non-Goals

**Goals:** total completeness semantics; no false decisive result from partial evidence; explicit per-item accounting; consistent receipt coverage; adversarial proof.

**Non-Goals:** increase projection limits, retain raw values, infer unseen data, or change complete-observation semantics.

## Decisions

### Use a tri-state comparison primitive

Canonical comparison returns `EQUAL`, `DIFFERENT`, or `INCOMPLETE`, with bounded reason metadata. Recursive comparison propagates incomplete descendants. Binary helpers may remain only for callers that have already proved completeness.

### Define monotonic decisions explicitly

An observed duplicate or overlap is a sound violation even in a prefix. Absence of duplicates, subset success, equality, and change over a truncated population are not decisive unless the particular rule is monotonic from visible evidence. Each invariant declares this policy rather than inheriting accidental boolean behavior.

### Account for every collection item

Collection-item evaluation records inspected, passed, violated, not-applicable, and invalid counts. A full pass requires a complete collection and a PASS for every item. Missing paths cannot disappear from aggregation.

### Carry completeness to receipts and coverage

Runner outcomes, findings, evaluation receipts, and coverage facts preserve the incomplete state. `INCOMPLETE` never contributes to pass, equivalence, lifecycle closure, or high-confidence counts.

## Risks / Trade-offs

Some historical local synthetic cases may move from PASS to PARTIAL/NOT_APPLICABLE. That is intentional: the evidence was insufficient, not newly anomalous.

## Migration Plan

1. Inventory every binary semantic-state comparison and identity-token consumer.
2. Add the total comparison/completeness result.
3. Convert invariant and coverage evaluators with explicit monotonicity tables.
4. Propagate partial outcomes to runners, receipts, and quality consumers.
5. Add boundary/property tests and run semantic, acceptance, hardening, local, clean, and full gates.

## Open Questions

None. Unknown tails are evidence incompleteness, not equality.
