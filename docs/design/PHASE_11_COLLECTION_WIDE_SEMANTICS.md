# Phase 11 — Bounded Collection-Wide Semantic Evaluation

Status: AUTHORIZED_FOR_PHASE_11A_IMPLEMENTATION
Authorization class: `PHASE_11_COLLECTION_WIDE_SEMANTIC_IMPLEMENTATION_ONLY`
Task: `.agent/tasks/phase-11-bounded-collection-wide-semantic-evaluation/`
Parent decision: D-61 (`BOUNDED_COLLECTION_WIDE_SEMANTIC_EVALUATION`)
Owner authorization: 2026-08-17, spec-driven execution requested directly by owner.

This document is the normative implementation design for Phase 11A. It converts the
post-Phase-10 design decision into an executable local/synthetic engineering contract.
The CLI execution session must read this document plus the task SPEC/PLAN/STATE from
`origin/main` before changing source.

## 1. Objective

Remove the confirmed item-0-only semantic blind spot without expanding product/network
authority. Existing source-backed item contracts must be evaluated over every safely
projected item in the bounded inspected collection window. Uninspected tails must never
be reported as fully evaluated. Multiple violating rows must aggregate into bounded,
privacy-safe evidence rather than one finding per row.

Phase 11A is LOCAL/SYNTHETIC only. Phase 11B contained DEV acceptance is a separate
future authorization.

## 2. Established evidence

D-61 established and synthetically reproduced the current behavior:

- All four admitted real-source collection recipes use `itemIndex: 0`.
- Admission creates positional item paths such as `['0', 'month']` and
  `['0', 'exchange_rate']`.
- `FIELD_PRESENT`, `TYPE_MATCH`, and `TYPE_IN_SET` therefore inspect one item.
- A violation at row 1 or row 57 can currently yield semantic PASS when row 0 is valid.
- The safe projector already retains up to `maxArrayItemsInspected = 128` projected
  items plus `itemCount`, `inspectedCount`, and `arrayTruncated`.
- A defect outside that projection window is unobservable and must result in explicit
  partial coverage, never full PASS.
- The current projector comment claiming truncated arrays cannot silently produce a
  false semantic PASS is stale for these item-index contracts. Phase 11 must make the
  behavior true before correcting the comment.

Classification: `CONFIRMED_COLLECTION_ITEM_COVERAGE_GAP`.

## 3. Normative architecture

### 3.1 Explicit collection scope, never implicit path magic

Phase 11 MUST NOT globally reinterpret an existing numeric `SafePath` such as
`['0', 'field']` to mean all rows. Historical fixed-position expectations must retain
exact semantics.

Collection-wide behavior must be explicit and declarative. The preferred representation
is a new fixed invariant wrapper equivalent to:

```text
COLLECTION_ITEM_CONTRACT {
  collectionPath: SafePath
  itemInvariant: one of FIELD_PRESENT | FIELD_ABSENT | TYPE_MATCH | TYPE_IN_SET
  itemRelativePath: SafePath
}
```

Exact TypeScript names may follow repository convention, but this semantic shape is
normative. If current source makes this representation structurally impossible, STOP
with `PHASE_11A_BLOCKED_COLLECTION_SCOPE_DESIGN` rather than silently using global
numeric-path reinterpretation.

Root invariants continue to evaluate once. Item contracts evaluate once per projected
item in the explicit collection scope.

### 3.2 Historical identity is immutable

Historical expectations used by Phase 9B/10B keep their positional item-0 semantics.
Do not change the meaning of:

- `ripple.common-exchange.read.real-source-shape`
- `ripple.common-exchange.read.real-source-deep`
- any other historical fixed-item expectation ID

Current collection-wide expectations require new unambiguous identities. Preferred IDs:

- `ripple.common-exchange.read.real-source-collection`
- `ripple.payer-exchange.read.real-source-collection`
- `ripple.account-inventory.read.real-source-collection`
- `ripple.billing-group-exchange.read.real-source-collection`

If a different repository-native suffix is used, it must still prove that historical and
collection-wide semantics cannot collide in expectation identity, receipts, replay, or
fingerprints.

Phase 11 changes evaluation breadth only. It does not add or weaken Alphaus source
semantics, routes, targets, recipes, or source-provenance claims.

### 3.3 Projection stays bounded and raw-free

Default requirement: keep `nightwatch.semantic-projection.v1` unchanged.

The collection evaluator consumes only existing safe projection data:

- `items`
- `itemCount`
- `inspectedCount`
- `arrayTruncated`
- safe per-item type/presence/opaque metadata

Never traverse the raw body a second time. Never increase the 128-item projection cap as
part of Phase 11. If implementation truly requires a projection schema expansion, STOP
with `PHASE_11A_BLOCKED_PROJECTION_SCHEMA_EXPANSION` and report the exact missing safe
fact.

### 3.4 Coverage-state model

Every collection-scoped item invariant must produce an explicit coverage state:

- `FULLY_EVALUATED_PASS`
- `VIOLATION`
- `EMPTY_NOT_APPLICABLE`
- `PARTIAL_COVERAGE_NO_VIOLATION`
- `PROJECTION_LIMIT_EXCEEDED`

Required semantics:

1. Empty collection => `EMPTY_NOT_APPLICABLE`, no anomaly.
2. All projected items pass and collection is not truncated =>
   `FULLY_EVALUATED_PASS`.
3. At least one projected item violates => `VIOLATION`, even if the collection is also
   truncated.
4. All projected items pass but the array is truncated =>
   `PARTIAL_COVERAGE_NO_VIOLATION`; this must never be indistinguishable downstream from
   full semantic PASS.
5. Projection failure due to a hard projection limit => `PROJECTION_LIMIT_EXCEEDED` or
   the existing equivalent fail-closed projection outcome; never an application anomaly.

Observed violation dominates uncertainty in the unseen tail. Unseen data creates
uncertainty, not evidence of correctness or defect.

### 3.5 Semantic outcome aggregation

The current broad rule "any PASS and no violation => PASS" must not erase partial
coverage.

Implementation must make partial coverage load-bearing downstream. Either introduce an
explicit non-anomaly semantic outcome such as `PARTIAL_COVERAGE`, or introduce a strict
coverage summary that every full-PASS consumer is required to check. The chosen design
must mechanically prove:

```text
root structural PASS
+ collection PARTIAL_COVERAGE_NO_VIOLATION
!= fully evaluated semantic PASS
```

Do not leave partial coverage only in an internal object ignored by receipts/harnesses.

### 3.6 Finding aggregation

Never emit one finding per violating row.

Aggregate one finding per expectation plus deterministic invariant-definition identity.
Do not collapse distinct source contracts merely because they share the same invariant
kind. For example, two different `FIELD_PRESENT` contracts must remain separately
attributable.

Safe aggregate metadata may include:

- `coverageState`
- `inspectedItemCount`
- `violatingItemCount`
- optional `firstViolationOrdinal`

`firstViolationOrdinal` is optional. If implemented it is structural only, bounded, and
must not create one fingerprint per row.

Fingerprint identity must be based on the stable source-backed contract, not on row
position, raw value, item identity, or violation count.

### 3.7 Versioning

The semantic expectation envelope may remain v1 if adding a new invariant kind is an
additive vocabulary change and historical expectations remain byte-meaning-stable.

Finding/receipt DTOs are strict. If Phase 11 adds new persisted fields, make a deliberate
versioning decision. Historical v1 findings and receipts must remain valid/readable. Do
not silently add unknown fields to a strict immutable schema.

### 3.8 Supported collection-expanded invariant classes

Required minimum:

- `FIELD_PRESENT`
- `TYPE_MATCH`
- `TYPE_IN_SET`

`FIELD_ABSENT` may be included for clean symmetry only if it remains small and fully
covered by the same tests.

Do not collection-expand unrelated relation/transition invariants during Phase 11.

## 4. Boundedness and privacy

Algorithmic bound per item invariant: `O(inspectedCount)`, where
`inspectedCount <= 128`. Overall bound is `O(M * inspectedCount)` where `M` is already
bounded by the expectation invariant cap.

Allowed persisted concepts: source-known field names, categorical types, coverage state,
bounded counts, optional structural ordinal, source provenance, safe digests.

Forbidden: raw strings, raw customer IDs, raw numeric values, row values, response
fragments, DOM text, hashes/prefixes/suffixes derived from raw customer values.

## 5. Mandatory corpus

Create `corpus/phase11/**` with synthetic-only fixtures.

Defect cases must include at least:

- common exchange wrong type at row 1
- common exchange wrong type at row 57
- common exchange missing required `month` at row 57
- payer type outside `TYPE_IN_SET` at row 1
- violation at row 127 when cap is 128
- >128 rows with a violation inside the inspected window
- 129+ rows with all inspected rows valid and a planted defect first appearing at row 128

The final case is intentionally unobservable. Expected result:
`PARTIAL_COVERAGE_NO_VIOLATION`, not anomaly and not full pass.

Benign cases must include empty, one row, multiple valid rows, exactly 128 valid rows,
129+ valid rows, valid payer OBJECT/ARRAY mixtures, and canonical object-key reorderings.
False positives must be zero.

## 6. Required baseline comparison

For each planted later-row defect, evaluate the historical item-0 contract and the new
collection-wide contract.

Report:

- `seededLaterRowDefects`
- `item0BaselineDetections`
- `collectionWideDetections`

Acceptance requires the fixed later-row corpus to demonstrate the confirmed blind spot
and its closure. Historical item-0 baseline must miss the specifically chosen later-row
fixtures; collection-wide evaluation must detect every observable within-window defect.

## 7. Exact boundary tests

With cap 128:

- Invalid row 127 => `VIOLATION`.
- Invalid row 128 with valid rows 0..127 => no anomaly, but
  `PARTIAL_COVERAGE_NO_VIOLATION`.
- >128 rows with an invalid row 57 => `VIOLATION`.
- >128 valid rows => `PARTIAL_COVERAGE_NO_VIOLATION`.
- Empty array => `EMPTY_NOT_APPLICABLE` for item contracts.

## 8. Privacy/adversarial matrix

Plant synthetic sentinels at rows 0, 1, 57, 127, and 128+, including strings, IDs,
numbers, and wrong-type payloads. Check every safe serialization path reachable from the
Phase 11 synthetic pipeline: projection, invariant evaluation, semantic result, finding,
fingerprint, receipt, campaign result, triage passthrough, dossier, and errors.

Required leak count: 0.

## 9. Synthetic pipeline integration

Reuse the existing semantic/campaign/dossier chain. No campaign authority change.

Required proof:

```text
source-backed collection expectation
  -> later-row synthetic defect
  -> aggregate collection invariant violation
  -> one safe semantic finding per invariant definition
  -> existing campaign admission
  -> existing triage passthrough
  -> safe dossier
```

Paired historical item-0 baseline on the same response must produce zero semantic
finding for the chosen later-row-only defect.

## 10. Historical compatibility

All Phase 9, 9A.1, 9B, 10, and 10B matrices remain green. Phase 10B's historical DEV
result must not be retroactively relabeled collection-wide. Historical finding/receipt
schemas remain readable.

A non-collection positional invariant must still resolve item 0 only. Add an explicit
regression proving Phase 11 did not introduce global path magic.

## 11. Hardening

Add narrow hardening guards for the collection evaluator and integration seam:

- no `fs`
- no network transports
- no `child_process`
- no browser/page APIs in the invariant core
- no AI/model imports
- no DB/infra imports
- no persistence
- no selfDev/promotion
- no raw-body traversal
- no unbounded iteration over `itemCount`

The evaluator may iterate only the already-bounded projected `items` array.

## 12. CI

Add a local/synthetic workflow step named:

`Phase 11 bounded collection-wide semantic evaluation matrix`

It must not contact DEV. Existing CI steps remain green.

## 13. Required validation

At minimum:

- `npm run typecheck`
- `npm run hardening:check`
- Phase 9 matrix
- Phase 9A.1 matrix
- Phase 9B matrix
- Phase 10 matrix
- Phase 10B matrix
- Phase 11 matrix
- `npm run campaign:synthetic`
- `npm run test:owner-provenance`
- `npm run agent:check`
- `npm run agent:audit` with zero strict errors
- `npm run project:check`
- selfdev catalog integrity
- `git diff --check`
- full `npx playwright test --project=nightwatch --workers=1` with 0 failures
- isolated/source-equivalent full-history run as required by the existing repository

## 14. Checkpoint protocol

1. Implement and validate locally.
2. Create one substantive implementation checkpoint on `main`.
3. Push fast-forward and verify `HEAD == origin/main`.
4. Wait for exact green CI at that implementation SHA.
5. Re-run clean-checkout Phase 11 acceptance.
6. Add D-62 (or the actual next decision number), terminalize task/docs, push docs closure.
7. Wait for exact green final CI.
8. STOP.

No product contact occurs in CI or Phase 11A.

## 15. Phase 11B boundary

At Phase 11A closure decide exactly one:

- `PHASE_11B_DEV_ACCEPTANCE: RECOMMENDED_SEPARATE_AUTHORIZATION`
- `PHASE_11B_DEV_ACCEPTANCE: NOT_NEEDED_FOR_PHASE_11_COMPLETION`

Do not execute DEV.

If later authorized, a Phase 11B canary must actually exercise at least two inspected
items to prove collection-wide behavior. A one-row response is not collection-wide
acceptance.

## 16. Out of scope

No triage/minimization repair; `HIGH_CONFIDENCE_REAL_SEMANTIC_TRIAGE` remains
NEXT_AFTER. No new product surface, route, journey, recipe target, source-change selector,
campaign-yield engine, browser/API differential, relational L4 semantics, Phase 6, AI
oracle authority, self-development, catalog mutation, variant-B adoption, or publication.

## 17. Stop conditions

Stop rather than widening scope on:

- `PHASE_11A_STOPPED_SOURCE_ADVANCED`
- `PHASE_11A_BLOCKED_COLLECTION_SCOPE_DESIGN`
- `PHASE_11A_BLOCKED_EXPECTATION_IDENTITY_AMBIGUITY`
- `PHASE_11A_BLOCKED_HISTORICAL_COMPATIBILITY`
- `PHASE_11A_BLOCKED_PARTIAL_COVERAGE_FALSE_PASS`
- `PHASE_11A_BLOCKED_FINDING_AGGREGATION_AMBIGUITY`
- `PHASE_11A_BLOCKED_PRIVACY`
- `PHASE_11A_BLOCKED_DETERMINISM`
- `PHASE_11A_BLOCKED_TRIAGE_SCOPE_EXPANSION`
- `PHASE_11A_BLOCKED_PROJECTION_SCHEMA_EXPANSION`
- `PHASE_11A_BLOCKED_FULL_REGRESSION`
- `PHASE_11A_BLOCKED_CATALOG_DRIFT`
- `PHASE_11A_BLOCKED_CI`
- `PHASE_11A_BLOCKED_CONTINUITY`

## 18. Success criteria

Phase 11A is complete only when all of the following hold:

1. Explicit collection scope exists; positional SafePath semantics remain unchanged.
2. Every observable planted later-row defect in the fixed corpus is detected.
3. Row 127 is detected; row 128 beyond the cap yields honest partial coverage.
4. Uninspected tails never produce false full semantic PASS.
5. Multiple violating rows do not create per-row finding explosion.
6. Distinct same-kind source contracts remain attributable.
7. Benign false positives are zero.
8. Privacy sentinel leaks are zero.
9. Deterministic repeat mismatches are zero.
10. Phase 9/10 compatibility and complete regression remain green.
11. Exact implementation and final CI are green.
12. Phase 8 catalog remains count 1, digest unchanged, variant B unadopted,
    promotion authority NONE.
13. DEV/NEXT/production/product mutation/DB/infra/AI/Alphaus writes are all zero.

Success token:

```text
PHASE_11_COLLECTION_WIDE_SEMANTIC: COMPLETE
PHASE_11A_STATUS: COMPLETE
PHASE_10_STATUS: COMPLETE
NEXT ACTION: STOP
```
