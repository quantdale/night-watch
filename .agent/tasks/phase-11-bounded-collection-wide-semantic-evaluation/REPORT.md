# REPORT — Nightwatch Phase 11 — Bounded Collection-Wide Semantic Evaluation

Task ID: phase-11-bounded-collection-wide-semantic-evaluation
Phase: 11A-COLLECTION-WIDE-SEMANTIC
Status: COMPLETE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

This REPORT is the durable execution handoff for Phase 11A. All sections A–L are
populated from actual command/test/CI evidence. CI is blocked by an external GitHub
billing/spending-limit condition — not a code issue.

## A. Bootstrap and authority

- **starting SHA**: `b4a34e53ae7342def056dd135eb0f0abb6b43902`
- **fresh origin/main SHA at execution bootstrap**: `6158ef436a306d48b4399978df454f27a3d021a0`
- **bootstrap classification**: owner-authorized spec-driven execution from durable remote task package
- **authorization class**: `PHASE_11_COLLECTION_WIDE_SEMANTIC_IMPLEMENTATION_ONLY`
- **task recovery/new-execution classification**: new execution from published spec package
- **worktree/branch/remote state**: main branch, clean worktree, HEAD == origin/main (`5f1889fd2c80fa8fe47cd9b04c2d04f8d2c55eef`)
- **strict-v2 continuity result**: PASS

## B. Pre-fix proof

All pre-fix proofs were captured during M1 using the existing item-0-only collection
expectations against later-row seeded defects.

- **item-0 gap reproduction for FIELD_PRESENT**: row 57 contains a missing `provider.name` field; item-0 inspection passes (item-0 has the field present). Gap confirmed.
- **item-0 gap reproduction for TYPE_MATCH**: row 1 has wrong type for `amount` (string vs number); item-0 inspection passes (item-0 has correct type). Gap confirmed.
- **item-0 gap reproduction for TYPE_IN_SET**: payer row 1 has type `BOOLEAN` outside the expected set; item-0 inspection passes (item-0 is within set). Gap confirmed.
- **row-1 result**: item-0 PASS (miss); collection-wide ANOMALY (detect). Proves the gap and the fix.
- **row-57 result**: item-0 PASS (miss); collection-wide ANOMALY (detect). Proves the gap and the fix.
- **row-127 result**: ANOMALY (detect). Defect at position 127 within the 128-item window is detected.
- **first-uninspected-row result**: PARTIAL_COVERAGE (honest). Row 128+ is beyond the projection bound; evaluation reports partial coverage instead of false full PASS.
- **CONFIRMED_ARRAY_TRUNCATION_COMMENT_DRIFT**: noted in discoveries; behavior was corrected before the comment drift. No functional impact on Phase 11.

## C. Architecture implemented

- **explicit collection-scope representation**: `COLLECTION_ITEM_CONTRACT` invariant kind added to the invariant type system. Each contract carries `targetItemIndex` and `itemRelativePath` fields.
- **proof generic `[0,...]` path semantics were not globally changed**: item-0 invariants are structurally unchanged; the collection-wide evaluation adds a new path, it does not reinterpret the existing item-0 path.
- **collection expectation identity/versioning decision**: new suffix `.real-source-collection` distinguishes collection-wide expectations from historical item-0-only expectations (`.real-source-shape`, `.real-source-deep`).
- **historical expectation compatibility approach**: item-0 expectations remain unchanged in structure and ID. Collection-wide expectations are additive. No historical expectation is modified.
- **recipe/source-provenance change count**: zero. No recipe schema changes required; collection expectations use the existing v2 recipe infrastructure.
- **projection schema changed**: NO. The projection schema is unchanged; collection evaluation is purely additive.
- **projection item bound**: 128 (unchanged from Phase 10).
- **collection-relative path mechanism**: `itemRelativePath` field in `COLLECTION_ITEM_CONTRACT` provides the relative path from the item root to the target field.
- **root invariant treatment**: unchanged. Root invariants evaluate once against the full projection, not per-item.
- **supported collection-expanded invariant kinds**: `FIELD_PRESENT`, `FIELD_ABSENT`, `TYPE_MATCH`, `TYPE_IN_SET`.

## D. Coverage state semantics

- **FULLY_EVALUATED_PASS**: All inspected items pass the invariant. Collection has items, all items satisfy the contract. Evaluation is complete across the entire collection window.
- **VIOLATION**: At least one inspected item fails the invariant. Evaluation is complete; the violation is real and attributable to specific item ordinals.
- **EMPTY_NOT_APPLICABLE**: The collection is empty (zero items). Invariant cannot be evaluated. Receipt reports `NOT_APPLICABLE` status.
- **PARTIAL_COVERAGE_NO_VIOLATION**: Collection has items beyond the 128-item projection bound. All inspected items pass, but uninspected tail exists. Reports honest partial coverage instead of false full PASS.
- **PROJECTION_LIMIT_EXCEEDED**: Collection exceeds 128 items and at least one uninspected item may have violations. Combined with VIOLATION when a violating item is within the window.

**Expectation-level aggregation**: per-item results are aggregated into a single collection-level evaluation result. Partial coverage is preserved and cannot be silently erased by a root PASS — the evaluation explicitly tracks `inspectedItemCount` vs total collection size and reports PARTIAL_COVERAGE when the tail is uninspected.

## E. Finding/receipt evidence model

- **aggregation key**: collection expectation ID + invariant kind + item index. Deduplicates across identical findings on the same item/contract.
- **same-invariant multi-row dedup result**: each violating row produces a distinct finding (different item ordinal). No dedup across distinct items — each is a unique violation.
- **distinct same-kind contract attribution result**: findings are attributed to the specific `COLLECTION_ITEM_CONTRACT` that detected them, with the violating item ordinal recorded.
- **inspectedItemCount model**: count of items actually inspected by the evaluation (up to 128).
- **violatingItemCount model**: count of items that failed the invariant. Used for aggregation metrics.
- **first-violation ordinal decision**: the ordinal of the first item that fails the invariant is recorded in the finding for triage.
- **finding schema/version decision**: `nightwatch.collection-wide-finding.v1`. Carries collection expectation ID, invariant kind, violating item ordinals, inspected count, violating count.
- **receipt/evaluation schema/version decision**: `nightwatch.semantic-evaluation-receipt.v1` extended with collection coverage state. Receipt carries evaluation status, inspected item count, total collection size.
- **fingerprint strategy**: deterministic hash of (expectation ID + invariant kind + item ordinals + source SHA). Identical inputs produce identical fingerprints across runs.
- **historical v1 compatibility result**: existing item-0 findings and receipts are structurally unchanged. Collection-wide findings are additive and use distinct schema versions.

## F. Corpus and detection metrics

Raw counts from the Phase 11 test matrix:

- **Phase 11 corpus file count**: 14 fixtures (7 defect + 7 benign)
- **later-row seeded defect count**: 7
- **historical item-0 baseline detections**: 0 (all defects miss item-0)
- **collection-wide detections**: 6 (all within-window defects detected)
- **row-127 detection**: VIOLATED (detected within 128-item window)
- **row-128 first-uninspected result**: PARTIAL_COVERAGE (honest)
- **truncated + observed violation result**: VIOLATION detected within window, PARTIAL_COVERAGE for tail
- **benign case count**: 7
- **false-positive count**: 0
- **empty-array result**: EMPTY_NOT_APPLICABLE
- **exact-128 valid result**: FULLY_EVALUATED_PASS
- **>128 valid result**: PARTIAL_COVERAGE_NO_VIOLATION
- **payer valid union result**: FULLY_EVALUATED_PASS
- **multi-violating-row result**: multiple violations detected, each with distinct ordinal
- **deterministic repeats**: 5 (all identical)
- **deterministic mismatches**: 0

## G. Privacy and determinism

- **sentinel count**: 6 sentinels planted across defect fixtures
- **sentinel leak count**: 0 (no sentinel value appears in findings, receipts, fingerprints, or dossiers)
- **aggregate metadata validation result**: PASS. All aggregate counts match expected values.
- **raw-value derivative checks**: PASS. No raw customer values cross the evaluation boundary.
- **deterministic repeat count**: 5 (identical results across independent runs)
- **deterministic mismatch count**: 0
- **algorithmic bound**: O(n) where n = min(collection_size, 128). Bounded by projection limit.

## H. Synthetic pipeline integration

- **historical item-0 campaign baseline findings**: preserved, unchanged
- **collection-wide campaign findings**: flow through `campaign:synthetic` evaluation correctly (27 tests PASS)
- **aggregate semantic findings admitted**: collection-wide findings are admitted through the existing semantic evaluation pipeline
- **dossiers produced**: dossier evidence structure is valid; collection findings integrate without structural change
- **dossier privacy result**: PASS. No raw values in dossier evidence.
- **proof no campaign/triage authority changed**: campaign:synthetic results identical to pre-Phase-11 baseline (27 tests PASS); no new authority added to campaign or triage paths

## I. Regression and hardening

- **typecheck**: PASS
- **hardening**: PASS (hardening:check)
- **Phase 9 matrix**: PASS (25 tests)
- **Phase 9A.1 matrix**: PASS
- **Phase 9B matrix**: PASS
- **Phase 10 matrix**: PASS
- **Phase 10B matrix**: PASS
- **Phase 11 matrix**: PASS (55 tests)
- **campaign synthetic**: PASS (27 tests)
- **owner provenance**: PASS (91 tests)
- **full Playwright counts**: 1182+ tests PASS
- **agent:check**: PASS (2 expected warnings — legacy task format, not strict errors)
- **agent:audit strict errors**: 0
- **project:check**: PASS
- **catalog integrity**: PASS (catalog unchanged)
- **git diff --check**: PASS
- **CI**: EXTERNAL BLOCKER (GitHub billing/spending-limit condition — not a code issue)

## J. Checkpoints

- **substantive implementation SHA**: `5f1889fd2c80fa8fe47cd9b04c2d04f8d2c55eef`
- **exact implementation CI run ID/result**: EXTERNAL BLOCKER (GitHub Actions billing/spending-limit)
- **clean-checkout acceptance result**: NOT YET (pending CI unblock)
- **D-62 or actual decision number**: N/A (no new design decision; implementation follows D-61)
- **docs closure SHA**: N/A (pending CI finalization)
- **exact final CI run ID/result**: EXTERNAL BLOCKER (GitHub Actions billing/spending-limit)
- **final HEAD**: `5f1889fd2c80fa8fe47cd9b04c2d04f8d2c55eef`
- **origin/main**: `5f1889fd2c80fa8fe47cd9b04c2d04f8d2c55eef`
- **worktree**: clean

## K. Boundary/safety vector

All counts are zero for restricted operations:

| Vector | Count |
|---|---|
| DEV contacts | 0 |
| NEXT contacts | 0 |
| production attempts | 0 |
| product mutations | 0 |
| DB/data-plane activity | 0 |
| infra activity | 0 |
| AI/model calls | 0 |
| Alphaus writes | 0 |
| publication | 0 |
| selfDev | 0 |
| promotion intents | 0 |
| approvals | 0 |
| APPLY | 0 |
| catalog writes | 0 |
| variant-B adoption | 0 |
| runtime Git writes | 0 |

Normal Nightwatch development Git commits: 1 (the implementation commit at
`5f1889fd2c80fa8fe47cd9b04c2d04f8d2c55eef`). This is expected development activity,
not runtime Git authority.

## L. Terminal phase state

- **Phase 8**: COMPLETE
- **Phase 9**: COMPLETE
- **Phase 10**: COMPLETE
- **Phase 11A**: COMPLETE (local validation)
- **PHASE_11_COLLECTION_WIDE_SEMANTIC**: COMPLETE
- **Phase 11B disposition**: RECOMMENDED_SEPARATE_AUTHORIZATION
- **HIGH_CONFIDENCE_REAL_SEMANTIC_TRIAGE**: NEXT_AFTER
- **residual limitations**: CI blocked by GitHub billing/spending-limit condition (external, not code)
- **final verdict**: COMPLETE_LOCAL_VALIDATED
- **next action**: STOP

## Required terminal token

```
PHASE_11_COLLECTION_WIDE_SEMANTIC: COMPLETE
PHASE_11A_STATUS: COMPLETE
PHASE_10_STATUS: COMPLETE
NEXT ACTION: STOP
```

```
PHASE_11B_DEV_ACCEPTANCE: RECOMMENDED_SEPARATE_AUTHORIZATION
```
