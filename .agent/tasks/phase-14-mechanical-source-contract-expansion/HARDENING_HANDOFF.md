# Phase 14A — Full Hardening Handoff

## Purpose

This file is the bridge from the five-change implementation batch to the next separately authorized repository-wide hardening campaign.

Populated from actual evidence at the five-change terminal (`IMPLEMENTED_AWAITING_HARDENING`). Do not pre-fill future values or claim tests that were not run.

## Five implementation checkpoints

Exact source-bearing SHAs (all verified commits in this repository's history):

- C1 analyzer IR + bounded control-flow engine: `aab7859` (versioned IR, alias-cycle detection, nested/repeated/required schema proofs; builds on the versioned analyzer introduced pre-extension at `6507df6`)
- C2 static schema/generated-interface adapters: `487d823` (proto finite-shape adapter + corpus proto fixtures; nested/repeated/required adapters also landed in `aab7859`)
- C3 real-source re-evaluation/additive admission: `f554da32849481902c86150f657d9696be46e04f`
- C4 source-contract drift/currentness intelligence: `030c82b` (initial module `5e107f6`)
- C5 contract coverage observability/tooling: `10136c8`
- final implementation-batch checkpoint: `f554da32849481902c86150f657d9696be46e04f` (= LAST_VALIDATED_IMPLEMENTATION_SHA / LAST_SUBSTANTIVE_CHECKPOINT_SHA; documentation closure descendants after it are discoverable from Git — LIVE_HEAD_AUTHORITY: GIT)

## Changed dependency cone

1. extractor/analyzer core: `src/oracles/expectations/extract/analyzer.ts` (C1; versioned IR, bounded traversal, alias-cycle detection, proof/rejection vocabulary); `src/oracles/expectations/extract/php.ts` (original-layer bounded helpers, unchanged this batch).
2. generated/static schema adapters: `src/oracles/expectations/extract/staticSchemaAdapters.ts` (NEW, C2).
3. expectation recipe/admission/resolver/currentness: NOT modified this batch (registry/admission/resolver untouched by design — zero uplift); exercised additively via C3 tests.
4. semantic identity/cluster/bundle compatibility: NOT modified; stability across SHA-only movement proven by C3/C4 tests.
5. coverage inventory/drift intelligence: `src/oracles/expectations/extract/contractDrift.ts` (NEW, C4); `src/oracles/expectations/coverageInventory.ts` (original-layer analyzerProbe host, unchanged this batch).
6. CLI/report/rendering surface: `src/oracles/expectations/extract/contractCoverageReport.ts` (NEW, C5); `bin/phase14-contract-health.mjs` (NEW read-only CLI, C5).
7. corpus/fixtures/tests: `corpus/phase14/source-fixtures.ts` (44-fixture registry), `tests/unit/phase14Analyzer.test.ts`, `phase14StaticSchemaAdapters.test.ts`, `phase14CoverageInventory.test.ts`, `phase14ContractDrift.test.ts`, `phase14ContractReport.test.ts`, `phase14FreshSourceAdmission.test.ts` (NEW).
8. workflow/hardening/continuity changes: none to CI workflows; continuity files (.agent task package) updated at closure.

## Contract/version changes

- Analyzer version: `nightwatch.mechanical-contract-analyzer.v1` — load-bearing: it is a field of every analyzer evidence digest and participates in derivation/evidence identity.
- Normalized source-evidence identity: `ev:sha256:<24>` over canonical JSON `{analyzerVersion, language, symbol, status, proofClass, facts, blockerCode}`.
- Drift DTO: classification values only (no separate version constant); version identity derives from MECHANICAL_ANALYZER_VERSION.
- Observability report: `nightwatch.contract-coverage-report.v1`; digest `ev:sha256:<24>` over sorted-key canonical JSON (no timestamps).
- New expectation recipe/ID/version: NONE (zero uplift; registry unchanged).
- Unchanged historical versions/IDs: all four historical expectation IDs (`ripple.account-inventory.read.real-source-shape`, `ripple.billing-group-exchange.read.real-source-shape`, `ripple.common-exchange.read.real-source-deep`, `ripple.payer-exchange.read.real-source-deep`), all four collection IDs (`*.real-source-collection`), recipe schema versions v1/v2, and the Phase-10 extractor vocabulary.

## Real-source truth

- Fresh remote SHA(s): `mobingilabs/ripple-api` master = `85e400a8b32fc23c05464033a2a6d5fff2a2890c` (resolved live via ls-remote during the batch).
- Disposable snapshot: `/tmp/nightwatch-ripple-snapshot-85e400a8`, exact clone, HEAD verified == remote SHA, clean status. Prior-batch snapshot `/tmp/nightwatch-ripple-snapshot-e026c855` (`e026c85522d201724033f024456da3efa17fe07a`) still present and used as the recorded baseline origin.
- Canonical sibling before/after proof: `mobingilabs/ripple-api` HEAD `27bb007ad0c798800b6bd3b29760c966422966e7` before AND after all work; status clean except a pre-existing untracked `AGENTS.md`; zero sibling writes.
- Approved target count: 6.
- Complete six-target before/after inventory (prior `e026c855` -> fresh `85e400a8`; ONLY `sourceSha` differs):

  | target | disposition | depth | blocker | probe[0] |
  |---|---|---|---|---|
  | ripple.account-inventory.read | APPROVED_AND_ADMITTED_COLLECTION | SHAPE_COLLECTION | TYPE_FLOW_AMBIGUOUS:account-inventory-no-proven-field-type-flow | LITERAL_ROW_FIELD_SET PROVEN `ev:sha256:749f330240ca4f04e1a39e8b` |
  | ripple.billing-group-exchange.read | APPROVED_AND_ADMITTED_COLLECTION | SHAPE_COLLECTION | TYPE_FLOW_AMBIGUOUS:billing-group-exchange-no-proven-field-type-flow | LITERAL_ROW_FIELD_SET PROVEN `ev:sha256:0af4332879a60b55f198da64` |
  | ripple.billing-groups-legacy.read | APPROVED_NOT_ADMITTED_AMBIGUOUS | NONE | AMBIGUOUS_CONDITIONAL_BLOB_RUNTIME_COMPUTED | CHUNK_ITEM_METADATA AMBIGUOUS/TRANSPORT_CONTRACT_UNPROVEN `ev:sha256:76839939200be0da547fbc4d` |
  | ripple.billing-groups.read | APPROVED_NOT_OBSERVABLE | NONE | GRPC_CHUNKED_NO_PHP_MECHANICAL_CONTRACT | CHUNK_ITEM_METADATA AMBIGUOUS/TRANSPORT_CONTRACT_UNPROVEN `ev:sha256:76839939200be0da547fbc4d` |
  | ripple.common-exchange.read | APPROVED_AND_ADMITTED_COLLECTION | TYPE_COLLECTION | (none) | SCALAR_TYPE_FROM_CAST PROVEN `ev:sha256:2c29dbd38cdb210468050311` |
  | ripple.payer-exchange.read | APPROVED_AND_ADMITTED_COLLECTION | TYPE_COLLECTION | (none) | SCALAR_TYPE_FROM_CAST PROVEN `ev:sha256:4f3b2860f4bdad10c6a3b0d2` |

- Exact new mechanically proven uplifts: NONE. All six targets classify `EVIDENCE_UNCHANGED_SHA_MOVED` between the two exact snapshots (semantic cluster stability across SHA-only movement proven on real data).
- Precise residual blocker for every non-uplift:
  - account-inventory: field type flow remains runtime/DB-computed (`RUNTIME_VALUE_TYPE_UNPROVEN` on the scalar-cast probe; `BRANCH_SET_INCOMPLETE` on branch union) — no mechanical type contract provable from PHP source alone.
  - billing-group-exchange: copied `exchange_rate` remains runtime-unproven (same classes as above).
  - billing-groups-legacy: conditional blob computed at runtime (`AMBIGUOUS_CONDITIONAL_BLOB_RUNTIME_COMPUTED`); no static chunk contract (`TRANSPORT_CONTRACT_UNPROVEN`).
  - billing-groups: gRPC/chunked transport has no PHP mechanical contract (`GRPC_CHUNKED_NO_PHP_MECHANICAL_CONTRACT`); static schema adapters correctly refuse transport/cardinality semantics (`TRANSPORT_CONTRACT_UNPROVEN`).
- Wrong-SHA/stale/unavailable fail-closed evidence: resolver returns `SOURCE_STALE` under wrong currentness (B5, both snapshots); inventory with missing source yields no admitted rows and never certifies CURRENT (STALE/UNAVAILABLE/NOT_APPLICABLE only).

## Focused validation completed in implementation batch

Per-change gates (typecheck + git diff --check + focused matrix) ran at each change's own commit; per-change records live in the commit messages. Re-verified at the final tree:

- C1: phase14Analyzer 51 passed (includes IR/alias-cycle/nested-schema cases).
- C2: phase14StaticSchemaAdapters 16 passed (positive proto/generated + deceptive comment/name-only fail-closed).
- C3: phase14FreshSourceAdmission 14 passed (+ narrow compat: phase11a3CollectionAdmission 28, phase12CoverageInventory 25).
- C4: phase14ContractDrift 13 passed.
- C5: phase14ContractReport 17 passed.
- typecheck PASS; git diff --check PASS at every gate.

End-of-batch integrated results (at `f554da3`):

- npm run typecheck: PASS.
- npm run hardening:check: PASS.
- All six Phase-14 focused suites: 133 passed, 0 failed.
- Directly affected Phase 9-13 suites (phase9a1GapReproduction, phase9bFreshness, phase9bHarness, phase10Admission, phase10Currentness, phase10Identity, phase10Campaign, phase11CollectionWide, phase11a3CollectionAdmission, phase12CoverageInventory, phase12SemanticCluster, campaign): 225 passed, 0 failed.
- npm run campaign:synthetic: 27 passed, 0 failed.
- npm run agent:check: PASS (strict v2). npm run project:check: PASS.
- git diff --check: PASS.
- Fresh-source disposable-snapshot acceptance: PASS (live-gated C3 tests ran against the real snapshot).
- Canonical Alphaus sibling writes: 0.
- Deterministic repeat mismatch count: 0 (>=3 repeats on focused corpus/inventory).
- falseAdmissionCount = 0; privacyLeakCount = 0; staleSourceFalseCurrentCount = 0; unsupportedFalseProofCount = 0.
- Corpus fixture count: 44 deterministic synthetic fixtures in `corpus/phase14/source-fixtures.ts` registry (`phase14Fixtures`; >=30 required), covering literal field set, scalar cast, finite union, bounded aliases, alias-cycle rejection, empty/object and empty/array bifurcation, all-return field presence, missing-field/dynamic-key/runtime-DB/incomplete-branch/nested-conditional rejections, generated schema success/unavailable, proto finite-shape success, proto-without-transport guarantee, comment-only and string-literal fake contracts, drift classes, stale/missing source, and privacy sentinels that must not leak into derived evidence.

## Tests intentionally deferred / NOT_RUN

All recorded as NOT_RUN / DEFERRED_TO_FULL_HARDENING_CAMPAIGN (not PASS):

- complete canonical Playwright workers=1;
- topology-correct isolated complete Playwright workers=1;
- broad Phase 9/10/11/12/13 compatibility sweep (only directly affected suites were run);
- exhaustive Phase-14 acceptance matrix replay;
- full owner-provenance sweep (not directly touched);
- full agent audit/history sweep beyond strict active-task validation;
- exhaustive privacy/authority adversarial matrix across the whole changed cone;
- codebase-wide static/dead-code/compatibility review;
- exact GitHub Actions success requirement while Actions remains externally billing-blocked.

## Known risks for the hardening campaign

- analyzer false proof from incomplete branch enumeration: mitigated by BRANCH_SET_INCOMPLETE fail-closed vocabulary + rejection tests; hardening should fuzz deeper nesting.
- parser/tokenizer ambiguity: bounded tokenizer has MAX_SOURCE_CHARS=2_000_000; untested beyond corpus shapes.
- alias-cycle edge cases: cycle detection tested; multi-node cycles beyond pairs untested.
- generated/proto schema interpretation drift: map<>/oneof fail closed; future proto grammar growth must stay additive.
- historical expectation ID compatibility: preserved by zero-uplift result; any future uplift MUST use additive IDs (never re-bind SHAs silently).
- wrong-SHA/currentness false-current risk: covered (SOURCE_STALE; missing-source never CURRENT); keep B5-style tests mandatory in every future fresh-source run.
- semantic cluster fragmentation/merging due to evidence-version changes: DERIVATION_VERSION_CHANGED splits identity by design; verified only for analyzer-version movement, not for a hypothetical v2 analyzer bump.
- campaign bundle/resolver compatibility: unaffected this batch (no registry change); re-run bundle suites if any future admission lands.
- CLI/report serialization privacy leak: sentinel + unknown-field rejection tested; report consumes sanitized inventory input only.
- fixture/corpus not exercising a changed grammar edge: 44 fixtures cover the implemented vocabulary; new grammar requires new fixtures first.
- repository topology-sensitive tests: full isolated topology replay deferred (NOT_RUN).
- CI workflow step/version drift: no workflow changes this batch; CI truth below.

## Recommended next hardening order

1. inspect final five-change diff and versions (`aab7859..f554da3` plus docs descendants);
2. focused Phase-14 adversarial analyzer matrix (extend corpus for any new grammar edges);
3. expectation/admission/resolver/currentness compatibility (phase9a1/9b/10 admission+currentness);
4. Phase-13 semantic promotion/cluster/shadow compatibility;
5. Phase-12 coverage/yield compatibility;
6. Phase-9/10/11 historical semantic compatibility;
7. hardening/static policy checks (hardening:check + authority boundary sweep);
8. campaign synthetic + owner provenance;
9. canonical complete Playwright workers=1;
10. topology-correct isolated complete Playwright workers=1;
11. continuity/project/catalog checks (agent:audit --audit-history, project:check);
12. exact GitHub Actions execution/CI truth once billing is restored;
13. durable docs/decision closure.

## GitHub Actions truth

Exact truth from post-push inspections (gh CLI, once per push):

- Push `5e107f6..5b172a2` (final five-change checkpoint): run `32431272739` for `5b172a2`, job "Local hardening checks", started 2026-08-21T00:05:03Z, completed 00:05:07Z, conclusion FAILURE with ZERO steps executed (log not found / never produced).
- Push `5b172a2..ec27364` (Actions-truth docs update): run for `ec27364` — conclusion FAILURE, same external-gate signature.
- Pre-batch control: run `32382010371` for `5e107f6` shows the IDENTICAL signature (2-second job, zero steps, failure).
- Classification: the known external billing/spending-limit condition now manifests as an immediate zero-step job failure instead of a non-start. No checkout/build/test step ever ran, so no code regression is exposed or claimable; BLOCKED_EXTERNAL_CI truth stands. Do not retry repeatedly; re-check only after billing restoration. Inherent limit: the run triggered by the commit containing this table cannot be recorded inside that same commit; it is covered by the stated classification.

## Authority boundary

The future hardening campaign remains local/source-only unless separately authorized. This handoff grants no DEV, real campaign, Phase 11B/13B, production, mutation, data/infra, Alphaus-write, AI, selfDev, or promotion authority.
