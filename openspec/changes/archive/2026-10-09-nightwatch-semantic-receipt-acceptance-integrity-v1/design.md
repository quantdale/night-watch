## Context

`validateSemanticEvaluationReceipt` is advertised as strict, but does not require a plain prototype, validate nested provenance, bound every collection, or recompute `receiptId`. The artifact facade adds identity recomputation, producing two reader strengths. Outcome coherence is partial: for example, ANOMALY can carry zero invariant violations when it has a finding; PASS can carry `coverageState: VIOLATION`; coverage counters can appear without coverage state.

Acceptance authority is still weaker than strict parsing. The receipt builder lets any caller select `CONTAINED_DEV`. `summarizePhase9bPass` accepts typed objects without invoking any validator, takes identity/provenance from the first receipt with an expectation, and computes decisiveness over all matching-target receipts. The gate can compose facts that never belonged to one observation.

## Goals / Non-Goals

**Goals:** one authoritative parser; total receipt coherence; contained producer identity; exact summary-set binding; non-composable acceptance; historical isolation; adversarial evidence proof.

**Non-Goals:** authorize a DEV run, persist raw values, require receipt IDs to match across replay contexts, or alter valid historical result meaning.

## Decisions

### Use one exact receipt parser

All direct, DTO, artifact, lifecycle, summary, and acceptance readers route through one parser. It requires a plain data record with exact keys and bounded arrays/strings/counts, validates source provenance through the expectation validator's canonical rules, recomputes the receipt ID, and rejects accessors/exotic prototypes.

### Close the outcome matrix

Each outcome has exact requirements for expectation/provenance presence, projections, invariant totals and verdict counts, findings, coverage state, inspected/violating counts, and acceptance fields. Coverage state and semantic outcome must agree in both directions. Finding count and violation count are bound to producer evidence rather than merely nonzero.

### Producer-bind contained evidence

The ordinary receipt builder always emits `LOCAL_SYNTHETIC`. A contained producer receives a short-lived internal capability after preflight/context readiness and issues receipts bound to run, context, request, source-transaction, and observation generation. A string enum and public digest builder cannot mint `CONTAINED_DEV` authority.

### Summaries consume one coherent evidence set

Summarization validates every receipt/finding, refuses overflow for acceptance, and requires every decisive receipt to match the exact target, expectation, source repo/SHA/evidence digest, acceptance class, and producer generation. Identity cannot come from one receipt while PASS comes from another. Findings are recomputed/bound to the same receipt projections and violations.

### Findings and dossiers use the same exact evidence strength

The authoritative finding parser requires an exact plain bounded record, canonical nested provenance, safe bounded identifiers/classes, unique bounded projection digests, category/relation coherence, and recomputed `findingId`. Dossier construction validates every finding first and then emits one canonical projection; dossier parsing recomputes category/count/order coherence and refuses truncation when used for acceptance.

### Preserve historical readability without authority

Historical v1 receipts and legacy v2 records remain parseable under their declared schema, but cannot satisfy current contained-DEV acceptance unless migrated through a separately evidenced, non-upgrading process. Read compatibility is not promotion authority.

## Risks / Trade-offs

Tests and utilities that directly construct contained receipts will move to explicit synthetic fixtures or a contained-producer harness. Some formerly accepted contradictory receipts become invalid. More generation identity is retained, but only bounded opaque/safe metadata.

## Migration Plan

1. Inventory every receipt producer, parser, DTO/artifact reader, summary, acceptance gate, and historical fixture.
2. Add exact receipt/finding/dossier parsers and total coherence tables; route every reader through them.
3. Split synthetic construction from contained producer issuance.
4. Add producer generation fields and summary-set coherence checks.
5. Isolate historical schemas from current acceptance authority.
6. Add property/mutation/mix-and-match tests and run semantic/acceptance/browser-local/hardening/local/clean/full gates without DEV contact.

## Open Questions

None. `CONTAINED_DEV` is an observed execution fact, not a caller-selected receipt decoration.
