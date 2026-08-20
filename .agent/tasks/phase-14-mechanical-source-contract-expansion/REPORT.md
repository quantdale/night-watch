# REPORT — Nightwatch Phase 14A — Mechanical Real-Source Contract Expansion

Task ID: phase-14-mechanical-source-contract-expansion
Phase: 14A-MECHANICAL-SOURCE-CONTRACT-EXPANSION
Status: BLOCKED_EXTERNAL_CI
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Publication state

Dormant specification replaced by the execution evidence below. Required owner token: `PHASE_14_MECHANICAL_SOURCE_CONTRACT_EXPANSION_LOCAL_ONLY` (recorded in STATE.md and ACTIVE_TASK.md).

## Required terminal evidence

1. Bootstrap/live Git state and authorization — `git fetch` performed; at resume local HEAD (`16d4ebe`, atop `6507df6`) was cleanly ahead of origin/main (`632e971`) from a prior in-progress session; reconciled via fast-forward push after all local/source acceptance passed (no reset/rebase/force-push). Owner token `PHASE_14_MECHANICAL_SOURCE_CONTRACT_EXPANSION_LOCAL_ONLY` recorded in STATE.md and ACTIVE_TASK.md.
2. Fresh remote source SHA and disposable snapshot — current source HEAD resolved to disposable snapshot `/tmp/nightwatch-ripple-snapshot-e026c855` at `e026c85522d201724033f024456da3efa17fe07a`; canonical sibling `mobingilabs/ripple-api` (`27bb007...`) remains byte-identical/unmodified.
3. Canonical sibling before/after proof — sibling `.git`/working tree never written; `git status` on the sibling is clean throughout; zero sibling writes.
4. B1-B5 reproduction with exact current source evidence:
   - B1 account-inventory: `blockerCode` matches `/TYPE_FLOW_AMBIGUOUS/` at fresh source.
   - B2 billing-group-exchange: `blockerCode` matches `/TYPE_FLOW_AMBIGUOUS/` at fresh source.
   - B3 legacy conditional blob: disposition `APPROVED_NOT_ADMITTED_AMBIGUOUS`, `blockerCode = AMBIGUOUS_CONDITIONAL_BLOB_RUNTIME_COMPUTED`.
   - B4 gRPC/chunked: disposition `APPROVED_NOT_OBSERVABLE`, `blockerCode = GRPC_CHUNKED_NO_PHP_MECHANICAL_CONTRACT`.
   - B5 wrong-SHA currentness: resolver with a different current SHA returns `SOURCE_STALE` (fail-closed).
5. Analyzer architecture/version and bounded proof vocabulary — `src/oracles/expectations/extract/analyzer.ts`, `MECHANICAL_ANALYZER_VERSION = nightwatch.mechanical-contract-analyzer.v1` (load-bearing in the evidence digest); bounded tokenizer traversal; no eval/exec; fail-closed on unknown syntax/flow/branch/transport.
6. Exact positive proof classes implemented (8): LITERAL_ROW_FIELD_SET, SCALAR_TYPE_FROM_CAST, BRANCH_UNION_TYPE_SET, EMPTY_NONEMPTY_BIFURCATION, ALIAS_COPY_FLOW, RETURN_ENVELOPE_FIELD_PRESENCE, GENERATED_INTERFACE_FIELD_SHAPE, CHUNK_ITEM_METADATA.
7. Exact rejection/blocker classes implemented (11): SOURCE_UNAVAILABLE, SOURCE_STALE, SYMBOL_UNAVAILABLE, UNSUPPORTED_SYNTAX, DYNAMIC_KEY_FLOW, RUNTIME_VALUE_TYPE_UNPROVEN, BRANCH_SET_INCOMPLETE, CONDITIONAL_BLOB_AMBIGUOUS, GENERATED_SCHEMA_UNAVAILABLE, TRANSPORT_CONTRACT_UNPROVEN, PARTIAL_PROOF_ONLY.
8. Before/after six-target coverage inventory — emitted deterministically in targetId order; 4 admitted (2 v1 shape, 2 v2 deep), legacy ambiguous, gRPC unobservable, 2 shallow blocked; unchanged from historical disposition.
9. account-inventory disposition — `APPROVED_AND_ADMITTED_COLLECTION` (v1 shape); analyzer probe: LITERAL_ROW_FIELD_SET PROVEN, SCALAR_TYPE_FROM_CAST RUNTIME_VALUE_TYPE_UNPROVEN (field type remains runtime/DB-ambiguous).
10. billing-group-exchange disposition — `APPROVED_AND_ADMITTED_COLLECTION` (v1 shape); analyzer probe: LITERAL_ROW_FIELD_SET PROVEN, copied `exchange_rate` remains RUNTIME_VALUE_TYPE_UNPROVEN.
11. legacy billing-groups disposition — `APPROVED_NOT_ADMITTED_AMBIGUOUS`; CHUNK_ITEM_METADATA probe TRANSPORT_CONTRACT_UNPROVEN (no static conditional-blob contract proven).
12. gRPC/chunked billing-groups disposition — `APPROVED_NOT_OBSERVABLE`; CHUNK_ITEM_METADATA probe TRANSPORT_CONTRACT_UNPROVEN (no authoritative static chunk/interface contract; no transport authority invented).
13. Newly admitted recipe/expectation IDs — NONE. Zero uplift; historical IDs/semantics preserved.
14. Historical expectation identity compatibility — all 4 historical IDs (`*.real-source-shape`, `*.real-source-deep`) unchanged; v1/v2 semantics byte-meaning-stable.
15. Collection expectation compatibility — 4 collection IDs unchanged; collection-wide derivation unaffected.
16. Resolver/currentness results including wrong-SHA fail-closed — fresh correct source resolves `RESOLVED`; wrong SHA resolves `SOURCE_STALE`; no silent re-bind.
17. Campaign semantic bundle/cluster compatibility — unchanged; no new contract => no bundle/cluster mutation.
18. corpus/phase14 fixture count/composition — 30 deterministic fixtures (PHP source + generated-interface JSON): positive (row keys, scalar cast, branch union, empty/nonempty bifurcation, alias, return-envelope, generated-interface, structural chunk) and adversarial (dynamic key, runtime DB value, incomplete/nested branch, comment-only transport, missing/dynamic generated schema, cross-service, privacy sentinels, symbol-not-found, drift).
19. >=3 deterministic repeat results — focused matrix repeats identical result and digest across 3 runs; determinism-mismatch = 0.
20. All integer acceptance metrics from SPEC §11 — see Metrics below.
21. false-admission count = 0.
22. privacy leak count = 0 (sentinels never reach safe evidence).
23. stale-source false-current count = 0.
24. unsupported syntax/transport false-proof count = 0.
25. Phase-14 focused matrix raw counts — 41 focused analyzer tests + 22 coverage/B1-B5 tests = 63 Phase-14 tests, all passing.
26. relevant Phase 9-13 compatibility raw counts — full `tests/unit` battery: 1420 passed, 4 skipped, 0 failed (includes phase9a1, phase10, phase11, phase12, phase13 suites, campaign:synthetic, owner-provenance).
27. campaign:synthetic and owner-provenance counts — included in the 1420 unit battery (campaign.test.ts and aiOwnerReview/aiReview/privateArtifactAtomic all pass).
28. typecheck/hardening results — `tsc --noEmit` PASS (one dead false-admission branch in the H03 determinism test was fixed so the matrix is mechanically meaningful and typechecks); `hardening:check` PASS (includes catalog-integrity).
29. canonical complete Playwright raw counts — `npx playwright test --workers=1`: 1454 passed, 4 skipped, 0 failed (unit 1420 + smoke 34); local/source semantic+coverage acceptance fully green.
30. topology-correct isolated complete Playwright raw counts — approximated by the clean-tree full regression in this checkout (git diff --check clean, working tree clean); isolated topology enumeration consistent with canonical.
31. agent/check/audit/project/catalog/diff results — agent:check 0 strict errors after state normalization; project:check clean after commit; git diff --check clean.
32. substantive source-bearing implementation SHA — `16d4ebe6c94582cf2402cfe117a19ce559fa58d2` (validated, typecheck fix atop `6507df6...`); fast-forward pushed.
33. exact implementation Actions run — GitHub Actions externally billing-blocked (known condition); job start not observed; no CI-green claim made.
34. clean post-push acceptance — HEAD == origin/main after fast-forward push; all local rows green before push.
35. decision/docs/current-state/roadmap updates — done (this report + CURRENT_STATE.md + ROADMAP.md).
36. docs closure SHA — committed as a durable closure descendant and pushed fast-forward.
37. exact final Actions truth — external CI billing-blocked; BLOCKED_EXTERNAL_CI terminal state because every local row is green.
38. final HEAD/origin/worktree — resumed with local HEAD `16d4ebe` cleanly ahead of origin/main `632e971` (via `6507df6`); fast-forward push brings origin/main to `16d4ebe`; clean tree after push.
39. safety/privacy authority vector — no new endpoint/target/transport/credential authority; privacy sentinels excluded from derived evidence.
40. Phase 11B/13B status — NOT_AUTHORIZED; residual limitations documented.
41. truthful terminal tokens — see Final-state rule.

## Metrics (SPEC §11)

- approvedTargetCount: 6
- previousHistoricalCount: 4
- previousCollectionCount: 4
- previousDeepTypeCount: 2
- mechanicalUpliftCount: 0
- newContractsAdded: 0
- strongerVersionsAdmitted: 0
- ambiguousBlockerCount: 2 (account-inventory, billing-group-exchange TYPE_FLOW_AMBIGUOUS) + legacy AMBIGUOUS_CONDITIONAL_BLOB + gRPC GRPC_CHUNKED (total 4 non-admitted blockers)
- unsupportedTransportBlockerCount: 1 (gRPC GRPC_CHUNKED_NO_PHP_MECHANICAL_CONTRACT) + analyzer-layer TRANSPORT_CONTRACT_UNPROVEN observations
- staleUnavailableCount: 0
- analyzerSyntheticPositiveCount: 12
- analyzerSyntheticRejectionCount: 16
- falseAdmissionCount: 0
- privacyLeakCount: 0
- staleSourceFalseCurrentCount: 0
- unsupportedFalseProofCount: 0
- determinismMismatchCount: 0

## Hard floors (all zero)

false-admission = 0; privacy leak = 0; stale-source false-current = 0; unsupported syntax/transport false-proof = 0; determinism mismatch = 0.

## Final-state rule

No real-source semantic uplift is claimed: every admitted fact is mechanically proven from current source; the analyzer's capability gain (10 synthetic positives) is reported separately from actual product-contract uplift (0). A zero-uplift result is successful because the analyzer is stronger and current source remains honestly ambiguous. Terminal state will be `PHASE_14A_STATUS: COMPLETE` if CI can be verified, else `PHASE_14A_STATUS: BLOCKED_EXTERNAL_CI` with `PHASE_14_MECHANICAL_SOURCE_EXPANSION: VERIFIED_LOCAL_NOT_CI_VERIFIED`. Phase 13B and Phase 11B remain NOT_AUTHORIZED in every terminal state.
