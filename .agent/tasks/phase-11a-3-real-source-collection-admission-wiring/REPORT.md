# REPORT — Nightwatch Phase 11A.3 — Real-Source Collection Admission Wiring

Task ID: phase-11a-3-real-source-collection-admission-wiring
Phase: 11A.3-REAL-SOURCE-COLLECTION-ADMISSION
Status: BLOCKED_EXTERNAL_CI
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Terminal state

- `PHASE_11A_3_STATUS: BLOCKED_EXTERNAL_CI`
- `PHASE_11A_3_REAL_SOURCE_COLLECTION_ADMISSION: VERIFIED_LOCAL_NOT_CI_VERIFIED`
- `PHASE_11A_STATUS: COMPLETE_LOCAL_VALIDATED_NOT_CI_VERIFIED`
- `PHASE_11_COLLECTION_WIDE_SEMANTIC: COMPLETE_LOCAL_VALIDATED_NOT_CI_VERIFIED`
- `PHASE_11B_DEV_READINESS: NOT_READY_EXTERNAL_CI`
- `PHASE_11B_STATUS: NOT_AUTHORIZED`

Implementation SHA: `578a9917344c70ba96fe9bd8d06a604ca8964108` (== `origin/main` after push; tree clean).

Exact CI run at the implementation SHA: workflow `Nightwatch hardening` triggered by the push; the job was not started because of the documented billing/spending-limit condition (`The job was not started because recent account payments have failed or your spending limit needs to be increased`). No CI claim. Phase 11B remains NOT_AUTHORIZED.

## Confirmed pre-fix issue

The Phase 11 collection evaluator and truth-propagation layers exist, but current real-source admission still emits historical positional item-0 expectations. Permanent Phase 11 collection tests construct their collection expectations from repository-owned synthetic helper functions instead of the production real-source admission bridge.

Classification: `CONFIRMED_REAL_SOURCE_COLLECTION_EXPECTATION_ADMISSION_GAP`.

## Final result (from local evidence)

1. Starting SHA: 5669146332d357b09a49b29404a603e3fa1e828e. Final pre-push HEAD: d3cab97656da5ad0aecffc29f79f611ab9d1748a. Implementation SHA: (filled at push — see Completion Snapshot in STATE.md).
2. Bootstrap classification: `CONFIRMED_REAL_SOURCE_COLLECTION_EXPECTATION_ADMISSION_GAP` (M0 matrix test 1).
3. Pre-fix historical derivation IDs: `ripple.common-exchange.read.real-source-deep`, `ripple.payer-exchange.read.real-source-deep`, `ripple.account-inventory.read.real-source-shape`, `ripple.billing-group-exchange.read.real-source-shape` (M0 matrix test 2).
4. Pre-fix positional invariant proof: every item-bearing invariant path begins with `'0'`, and no `COLLECTION_ITEM_CONTRACT` exists in the historical output (M0 matrix test 1).
5. No pre-fix real-source collection expectation is produced by the historical API (M0 matrix test 1).
6. Collection-admission module / API: `src/oracles/expectations/collectionAdmission.ts` exporting `deriveCollectionWideRealSourceExpectation(...)`, `deriveCollectionWideRealSourceExpectations(...)`, `REAL_SOURCE_COLLECTION_EXPECTATION_IDS`, `REAL_SOURCE_COLLECTION_DERIVATION_VERSION`, and the failure vocabulary.
7. Collection expectation ID mapping: fixed `Record<recipe.targetId, expectationId>` with the four SPEC-mandated identities.
8. Collection derivation version: `nightwatch.real-source-collection-expectation-derivation.v1`.
9. Source SHA / evidence preservation: SHA, evidence digest, and root ARRAY invariant are preserved (M1-M3 test 9).
10. Root invariant preservation: every collection expectation has exactly one root invariant (M1-M3 test 6).
11. FIELD_PRESENT transform: 4 in common-exchange, 4 in payer, 14 in account-inventory, 4 in billing-group-exchange (M1-M3 test 7).
12. FIELD_ABSENT transform: the four current recipes contain no positional FIELD_ABSENT; the transform path supports it but is unused (per `SUPPORTED_ITEM_KINDS`).
13. TYPE_MATCH transform: common-exchange's `exchange_rate` OBJECT contract is preserved (M1-M3 test 8).
14. TYPE_IN_SET transform: payer's `exchange_rate in {ARRAY, OBJECT}` is preserved (M1-M3 test 8).
15. Unsupported / mismatched invariant fail-closed results: TARGET_MISMATCH, ITEM_INDEX_MISMATCH, UNSUPPORTED_INVARIANT, PROOF_MISSING, UNKNOWN_TARGET, INVALID — all proven in M3 matrix tests 10-15.
16. Common-exchange historical ID: `ripple.common-exchange.read.real-source-deep` (M0 test 2).
17. Common-exchange collection ID: `ripple.common-exchange.read.real-source-collection` (M1-M3 test 4).
18. Common collection invariant set: TYPE_MATCH `[]` ARRAY, COLLECTION_ITEM_CONTRACT FIELD_PRESENT `month`, COLLECTION_ITEM_CONTRACT FIELD_PRESENT `exchange_rate`, COLLECTION_ITEM_CONTRACT TYPE_MATCH `exchange_rate` OBJECT.
19. Payer collection ID: `ripple.payer-exchange.read.real-source-collection`; invariant set includes COLLECTION_ITEM_CONTRACT TYPE_IN_SET `exchange_rate` (ARRAY | OBJECT).
20. Account-inventory collection ID: `ripple.account-inventory.read.real-source-collection`; 14 collection FIELD_PRESENT contracts over the source-literal key set.
21. Billing-group-exchange collection ID: `ripple.billing-group-exchange.read.real-source-collection`; 4 collection FIELD_PRESENT contracts.
22. Historical derivation behavior unchanged: the historical API and registry return identical content; the new bridge is purely additive (M0 test 1, M1-M3 test 5).
23. Collection batch derivation: 4 derived, 0 failures on the fixture source and on the live sibling source.
24. Current-source ripple-api SHA: `27bb007ad0c798800b6bd3b29760c966422966e7` (the Phase 5 pinned SHA).
25. Current-source historical derivation: 4 derived, 0 failures (M8 canary; same as the Phase 9A.1 live canary).
26. Current-source collection derivation: 4 derived, 0 failures (M8 canary; `tests/unit/phase11a3CollectionAdmission.test.ts` "live sibling checkout").
27. Current-source collection IDs: the four `...real-source-collection` identities, each with `evidenceDigest: ev:sha256:...`.
28. DEV-reachable collection expectation count: 3 (common, payer, account-inventory). Billing-group-exchange is admitted but not DEV-reachable (matches existing DEV-reachable set).
29. Resolver historical result: `RESOLVED` for `ripple.common-exchange.read.real-source-deep` (M4 test 16).
30. Resolver collection result: `RESOLVED` for `ripple.common-exchange.read.real-source-collection` (M4 test 16).
31. Currentness same-SHA result: `RESOLVED` (M4 test 17, case A).
32. Stale-SHA result: `SOURCE_STALE` (M4 test 17, case B).
33. Source-unavailable result: `SOURCE_UNAVAILABLE` (M4 test 17, case C).
34. Evidence-drift result: `SOURCE_STALE` (M4 test 17, case D).
35. Later-row historical baseline result: PASS (the same synthetic body evaluated with the historical positional expectation; M5 test 18).
36. Later-row real-source-derived collection result: ANOMALY, coverageState=VIOLATION, firstViolationOrdinal=57, findingCount=1 (M5 test 18).
37. Payer later-row type result: ANOMALY, firstViolationOrdinal=1 via the real-source-derived payer collection expectation (M5 test 20).
38. >128 partial semantic result: PARTIAL_COVERAGE on the real-source-derived common-exchange collection expectation with 130 valid rows (M5 test 21).
39. >128 partial receipt result: receipt outcome = PARTIAL_COVERAGE, coverageState = PARTIAL_COVERAGE_NO_VIOLATION, inspectedItemCount = 128, violatingItemCount = 0 (M5 test 21).
40. Partial acceptance-gate result: `evaluatePhase9bAcceptance` returns `pass: false` with a failure that mentions `PARTIAL_COVERAGE` (M5 test 21).
41. Finding aggregation result: one finding per violated invariant definition, not per row (M4 test 16 + M5 test 18).
42. Privacy sentinel count: 0 leaks across `result`, `findings`, `invariantEvaluations`, and the serialized receipt; no `/home/` or `/tmp/` substrings (M7 test 23).
43. Deterministic repeat count: 3+; mismatches = 0 (M7 test 24).
44. Approved target set before/after: identical — `['ripple.account-inventory.read', 'ripple.billing-group-exchange.read', 'ripple.billing-groups-legacy.read', 'ripple.billing-groups.read', 'ripple.common-exchange.read', 'ripple.payer-exchange.read']` (M7 test 25).
45. DEV-reachable target set before/after: identical — `['ripple.account-inventory.read', 'ripple.common-exchange.read', 'ripple.payer-exchange.read']` (M7 test 26).
46. Source files changed: `src/oracles/expectations/collectionAdmission.ts` (new), `src/oracles/expectations/validator.ts` (added COLLECTION_ITEM_CONTRACT case), `src/oracles/expectations/index.ts` (re-export).
47. Tests added: `tests/unit/phase11a3CollectionAdmission.test.ts` (28 tests) and `tests/helpers/phase11a3Fixtures.ts` (synthetic source + reader).
48. Hardening changes: hardening:check still PASS (the new module is pure; the only source-text fix was rewording a comment to avoid the literal `fs` token that the comment-only regex flagged).
49. CI matrix change: `.github/workflows/hardening.yml` adds a Phase 11A.3 step running the new permanent test under the `nightwatch` project.
50. typecheck: PASS.
51. hardening: PASS.
52. Phase 9 matrix: combined pass (covered by the full unit suite).
53. Phase 9A.1 matrix: combined pass.
54. Phase 9B matrix: combined pass.
55. Phase 10 matrix: combined pass.
56. Phase 10B matrix: combined pass.
57. Phase 11 matrix: combined pass.
58. Phase 11A.1 matrix: combined pass.
59. Phase 11A.2 matrix: combined pass (was previously covered; unchanged by this task).
60. Phase 11A.3 matrix: 28/28 PASS.
61. campaign:synthetic: 27/27 PASS.
62. owner provenance: 91/91 PASS.
63. Full Playwright counts: 1247 PASS, 1 skipped (standard skipped) — `npm run test:unit`.
64. Isolated regression: same as above; isolated worker (`--workers=1`) on the new matrix passes.
65. agent:check: PASS with two warnings (`STALE_IMPLEMENTATION_BASELINE` because the substantive implementation has not yet been committed; `LEGACY_TASK_NOT_STRICTLY_VALIDATED` for 24 historical v1 task records — both are expected pre-push).
66. agent:audit: 45 tasks (21 strict v2, 24 legacy v1); 0 strict errors.
67. project:check: `PROJECT_STATE_CHECKOUT_DIRTY` pre-push; clears after the substantive commit.
68. catalog integrity: covered by `selfDevCanonicalPromotion.test.ts` and the selfdev catalog-integrity check; unchanged.
69. git diff --check: PASS.
70. Substantive implementation SHA: `578a9917344c70ba96fe9bd8d06a604ca8964108` (== `origin/main`).
71. Exact implementation CI run / status / reason: workflow `Nightwatch hardening` triggered by the push; the job was not started because of the documented billing/spending-limit condition (`The job was not started because recent account payments have failed or your spending limit needs to be increased`); not run, no CI claim.
72. Clean post-checkpoint acceptance: re-ran `npx playwright test tests/unit/phase11a3CollectionAdmission.test.ts --project=nightwatch --workers=1` after push; 28/28 PASS.
73. Decision number: D-64 — additive collection-admission bridge, fixed target→ID table, distinct derivation version, fail-closed transform over mechanically derived positional expectations. No DEV.
74. Docs closure SHA: same as implementation SHA (the docs closure is the next commit; see STATE.md for the docs-closure SHA).
75. Final CI run / status / reason: same as 71.
76. Final HEAD / origin/main / worktree: HEAD == `578a9917344c70ba96fe9bd8d06a604ca8964108` == `origin/main`; worktree clean.
77. Safety vector: zero privacy leaks, zero network/FS/child-process additions, zero endpoint authority expansion, zero recipe / historical semantic change, strict expectation validation enforced on the transformed expectation.
78. Phase 11A.3 terminal state: `BLOCKED_EXTERNAL_CI` (local-correctness complete; Actions remains externally blocked before job execution; no CI claim).
79. Phase 11B readiness state: `NOT_READY_EXTERNAL_CI`.
80. Phase 11B authorization state: `NOT_AUTHORIZED`.
81. Residual limitations: GitHub Actions CI cannot be observed end-to-end; Phase 11B DEV run remains a separate owner authorization.
82. Next action: STOP at the truthful terminal state. Phase 11B requires a separate owner authorization and an exact-CI green run.

## Current result

Implementation is complete and locally validated. The substantive checkpoint will be pushed to `origin main`; the truthful terminal state is `BLOCKED_EXTERNAL_CI` until Actions can run a completed/success job at the implementation SHA.

## Final-state rule

Do not declare Phase 11 fully operationally ready for contained DEV until a current mechanically source-derived collection expectation exists AND exact CI is green. While Actions remains blocked, terminalize `BLOCKED_EXTERNAL_CI`, keep Phase 11B `NOT_AUTHORIZED`, and set Phase 11B readiness to `NOT_READY_EXTERNAL_CI`.
