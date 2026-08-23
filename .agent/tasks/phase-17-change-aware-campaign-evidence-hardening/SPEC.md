# Nightwatch Phase 17 — Change-Aware Campaign and Evidence Hardening

## Intent

Use the fresh post-Phase-16CH audit to strengthen the complete local/source/
synthetic planning-to-triage path:

```text
source change -> impact explanation -> portfolio priority -> bounded plan
               -> replay evidence -> confidence-aware owner review
```

This task is authorized by the current development campaign directive only for
Nightwatch source, synthetic fixtures, deterministic replay, and local private
artifacts. It does not authorize a DEV/NEXT/production campaign, authenticated
browser or API access, datastore or infrastructure work, sibling-repository
writes, external publication, or Phase 16D.

## Evidence-led defects and limitations

The audit reproduced or established these narrow targets before implementation:

1. `src/core/changeIntelligence/selection.ts` and
   `src/core/triage/correlation.ts` hash caller-shaped objects with ordinary
   `JSON.stringify`; equivalent documents with different property insertion
   order can receive different identities.
2. `src/core/changeIntelligence/baseline.ts` casts `JSON.parse` output to
   `BaselineState` without validating schema, records, identities, or
   categorical fields.
3. `assertUniqueStrings` in `runtimeValidation.ts` includes a duplicate value
   verbatim in an error; hostile duplicate strings can cross an error boundary.
4. `buildMinimalityEvidence` reconstructs deletion evidence by action-ID
   strings, although the minimizer internally preserves occurrence identity;
   repeated action IDs can therefore make a deletion disposition ambiguous.
5. Phase 16 portfolio allocation is deterministic but has no source-change
   impact overlay. The campaign selector and portfolio planner are adjacent
   systems rather than one inspectable source-to-portfolio decision.

## Deliverables

### W1 — change-aware portfolio bridge

Add a pure, bounded, deterministic impact overlay that consumes the existing
`SelectionResult` and an approved `CampaignPortfolio`. It must map direct,
shared, transitive, fallback, stale, irrelevant, and unlinked members to safe
categorical explanations, provide deterministic effective ranking, and feed a
reusable allocation path without granting execution authority. Raw source text,
customer values, URLs, credentials, and deployment claims remain impossible in
the DTO.

### W2 — fail-closed artifact and privacy boundaries

Repair the shared duplicate diagnostic and add strict baseline-document
validation. The parser must reject unknown fields, inherited/missing fields,
malformed identities, duplicate records, invalid statuses, unsafe free text,
and contradictory changeset references without echoing hostile values.

### W3 — occurrence-honest replay evidence

Make the public minimality-evidence derivation fail closed when repeated action
IDs make a survivor deletion ambiguous. Preserve historical serialized result
versions and add a deterministic occurrence-aware local receipt/helper for new
evidence where feasible; never upgrade an ambiguous replay to proven minimality.

### W4 — adversarial corpus and determinism

Add synthetic fixtures for direct/transitive/irrelevant/ambiguous/stale source
changes, property-order permutations, malformed baselines, hostile duplicate
values, and repeated-action minimization. Prove byte stability over repeated
runs and preserve the existing safety/privacy/authority floors.

### W5 — durable truth and developer ergonomics

Add focused operator-facing explanations and tests, update the Phase 17 task
records and appropriate project docs after implementation truth exists, and
leave a clean pushed checkpoint. CI remains truthfully reported if the known
external billing condition prevents job steps.

## Hard boundaries

- LOCAL / SOURCE / SYNTHETIC only.
- No Phase 16D, DEV/NEXT/production contact, real storage state, or product
  mutation.
- No Phase 6 expansion, SQL/datastore/cloud/infra archaeology, or sibling
  repository mutation.
- No AI/selfDev/promotion authority, catalog mutation, publication, messaging,
  external PR, or finding upload.
- No raw customer-like values or credentials in source, fixtures, artifacts,
  errors, or `.agent` continuity state; synthetic sentinels only.
- Existing historical schemas and byte contracts remain stable unless a
  deliberately versioned additive surface is introduced.

## Success predicate

The task is complete only when the new bridge, parser/privacy repairs, and
replay-evidence hardening have focused permanent regressions; the relevant
compatibility cone, typecheck, hardening, synthetic campaign, continuity,
project-state, and full canonical regression are green; the topology-correct
isolated regression is parity-clean; docs and task state agree with the live
implementation; and `HEAD == origin/main` with a clean tree.
