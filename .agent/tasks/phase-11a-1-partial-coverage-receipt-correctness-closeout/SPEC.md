# SPEC — Nightwatch Phase 11A.1 — Partial-Coverage Receipt Correctness Closeout

Task ID: phase-11a-1-partial-coverage-receipt-correctness-closeout
Phase: 11A.1-PARTIAL-COVERAGE-RECEIPT-CLOSEOUT
Title: Nightwatch Phase 11A.1 — Partial-Coverage Receipt Correctness Closeout
Authorization class: PHASE_11_COLLECTION_WIDE_SEMANTIC_IMPLEMENTATION_ONLY
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## 0. Authority and scope

This is a corrective continuation of the already owner-authorized Phase 11A implementation scope. It does not grant new product/network authority.

Starting durable source before this closeout:
`2c47812335379f2efa56df504098f8618d0b07ea`.

Validated Phase 11A implementation checkpoint under review:
`5f1889fd2c80fa8fe47cd9b04c2d04f8d2c55eef`.

## 1. Confirmed defect

Current committed behavior:

- `SemanticOutcome` includes `PARTIAL_COVERAGE`.
- `semanticOutcomeToReceiptOutcome('PARTIAL_COVERAGE')` returns receipt `PASS`.
- `SemanticReceiptOutcome` does not include `PARTIAL_COVERAGE`.
- receipt v2 carries optional coverage metadata, but a PASS-only consumer can ignore it.

This violates the Phase 11 normative requirement:

`root structural PASS + PARTIAL_COVERAGE_NO_VIOLATION != fully evaluated semantic PASS`.

Classification:

`CONFIRMED_PARTIAL_COVERAGE_RECEIPT_FALSE_PASS`.

## 2. Objective

Make partial coverage load-bearing through the full safe semantic receipt path while preserving historical receipt-v1 compatibility and all Phase 8/9/10 boundaries.

## 3. Required receipt semantics

Add receipt outcome:

`PARTIAL_COVERAGE`.

Required mapping:

- semantic PASS -> receipt PASS
- semantic ANOMALY -> receipt ANOMALY
- semantic PARTIAL_COVERAGE -> receipt PARTIAL_COVERAGE
- existing non-pass/failure mappings unchanged

`PARTIAL_COVERAGE` MUST be included in the canonical receipt outcome list and non-pass outcome set.

It MUST NOT be treated as equivalent to PASS by any observer, harness, acceptance gate, summary, replay comparison, or downstream success helper.

## 4. Coverage coherence validation

Receipt validation must reject contradictory combinations.

At minimum:

- outcome `PARTIAL_COVERAGE` requires coverageState `PARTIAL_COVERAGE_NO_VIOLATION`;
- `PARTIAL_COVERAGE` requires `invariantViolationCount == 0` and `findingCount == 0`;
- receipt PASS must not carry `PARTIAL_COVERAGE_NO_VIOLATION`;
- receipt ANOMALY may carry collection coverage `VIOLATION` and must retain existing anomaly/finding rules;
- `violatingItemCount <= inspectedItemCount`;
- `VIOLATION` coverage requires violatingItemCount >= 1;
- `FULLY_EVALUATED_PASS` requires violatingItemCount == 0;
- `EMPTY_NOT_APPLICABLE` requires inspectedItemCount == 0;
- `PARTIAL_COVERAGE_NO_VIOLATION` requires violatingItemCount == 0;
- impossible/unknown coverage metadata fails closed.

Do not invent customer-value fields.

## 5. Receipt version compatibility

Current builder emits `nightwatch.semantic-evaluation-receipt.v2`.

Historical v1 receipts must remain readable/valid under their original schema.

Required rule:

- v1 receipt: no Phase-11 coverage metadata fields;
- v2 receipt: coverage metadata allowed and strictly validated;
- v1 receipt semantics are not retroactively changed;
- builder continues to produce v2 for current evaluations.

If current parser architecture cannot express this cleanly, stop with:
`PHASE_11A_1_BLOCKED_RECEIPT_VERSION_COMPATIBILITY`.

## 6. Downstream audit

Search every semantic receipt consumer for success logic, including comparisons equivalent to:

- `outcome === 'PASS'`
- pass/non-pass allowlists
- acceptance counters
- replay comparison
- network observer summary
- Phase 9B/10B harness helpers
- campaign/dossier safe evidence bridges

Prove `PARTIAL_COVERAGE` cannot be interpreted as full PASS.

Historical Phase 9B/10B behavior for their fixed item-0 expectations must remain unchanged.

## 7. Required permanent tests

Add tests proving at minimum:

1. semantic PARTIAL_COVERAGE maps to receipt PARTIAL_COVERAGE;
2. PARTIAL_COVERAGE is in the non-pass set;
3. 129 valid rows produce semantic PARTIAL_COVERAGE and receipt PARTIAL_COVERAGE;
4. valid rows 0..127 + defect at uninspected row 128 produce PARTIAL_COVERAGE, not PASS/anomaly;
5. truncated + observed violation remains ANOMALY with coverage VIOLATION;
6. non-truncated all-valid remains PASS + FULLY_EVALUATED_PASS;
7. empty collection remains benign/not-applicable semantics, not anomaly;
8. receipt PASS + partial coverage metadata is rejected;
9. receipt PARTIAL_COVERAGE without partial coverage metadata is rejected;
10. violatingItemCount > inspectedItemCount rejected;
11. v1 receipt with v2 coverage fields rejected;
12. historical v1 receipt without coverage fields remains valid;
13. Phase 9B harness tests remain green;
14. Phase 10B harness tests remain green;
15. Phase 11 matrix remains green;
16. deterministic receipt IDs for identical partial evaluations;
17. no raw-value/privacy sentinel leakage.

## 8. Authorized source areas

Expected narrow changes:

- `src/oracles/semantic/receipts.ts`
- `src/oracles/semantic/hook.ts`
- directly related semantic consumer/helper files only if audit proves required
- focused unit tests
- hardening only if a new guard is needed
- `.github/workflows/hardening.yml` only if Phase 11A.1 needs a dedicated local matrix step
- `.agent/**`
- `docs/**`

Do not change collection evaluator semantics unless a direct correctness defect is proven.

## 9. Not authorized

No DEV/NEXT/production. No Phase 11B execution. No new product surface. No new source contract. No Alphaus writes. No DB/data plane. No infrastructure. No Phase 6. No AI/model calls. No campaign/minimization redesign. No differential work. No selfDev/promotion/catalog/B adoption. No publication.

## 10. Validation

Run at minimum:

- `npm run typecheck`
- `npm run hardening:check`
- focused receipt/hook/Phase 11A.1 tests
- Phase 9 / 9A.1 / 9B / 10 / 10B / 11 matrices
- `npm run campaign:synthetic`
- `npm run test:owner-provenance`
- `npm run agent:check`
- `npm run agent:audit`
- `npm run project:check`
- selfdev catalog integrity
- `git diff --check`
- full Playwright regression with 0 failures
- isolated/source-equivalent regression where required by repository convention

## 11. CI truth

Phase 11A originally required exact implementation CI and exact final CI. Current GitHub Actions is externally blocked before job start by an account billing/spending-limit condition.

After the corrective checkpoint is pushed:

- if exact CI can run, require completed/success at the exact SHA;
- if GitHub still refuses to start jobs for the same external billing condition, record `PHASE_11A_1_BLOCKED_EXTERNAL_CI` and do NOT claim Phase 11 fully CI-verified.

No code failure may be mislabeled as the billing blocker.

## 12. Completion state

Only when local validation is green AND exact CI is green may durable state say:

`PHASE_11A_STATUS: COMPLETE`
`PHASE_11_COLLECTION_WIDE_SEMANTIC: COMPLETE`
`PHASE_11A_1_STATUS: COMPLETE`

If local validation is green but Actions remains externally unavailable:

`PHASE_11A_1_STATUS: BLOCKED_EXTERNAL_CI`
`PHASE_11A_STATUS: COMPLETE_LOCAL_VALIDATED_NOT_CI_VERIFIED`
`PHASE_11_COLLECTION_WIDE_SEMANTIC: COMPLETE_LOCAL_VALIDATED_NOT_CI_VERIFIED`

In either branch Phase 11B remains NOT AUTHORIZED.

## 13. Stop conditions

- `PHASE_11A_1_STOPPED_SOURCE_ADVANCED`
- `PHASE_11A_1_BLOCKED_RECEIPT_VERSION_COMPATIBILITY`
- `PHASE_11A_1_BLOCKED_PARTIAL_COVERAGE_STILL_PASS`
- `PHASE_11A_1_BLOCKED_DOWNSTREAM_PASS_CONSUMER`
- `PHASE_11A_1_BLOCKED_HISTORICAL_COMPATIBILITY`
- `PHASE_11A_1_BLOCKED_PRIVACY`
- `PHASE_11A_1_BLOCKED_REGRESSION`
- `PHASE_11A_1_BLOCKED_CATALOG_DRIFT`
- `PHASE_11A_1_BLOCKED_EXTERNAL_CI`

## 14. Success token

When fully complete:

`PHASE_11A_1_PARTIAL_COVERAGE_RECEIPT_TRUTH: VERIFIED`

`NEXT ACTION: STOP`
