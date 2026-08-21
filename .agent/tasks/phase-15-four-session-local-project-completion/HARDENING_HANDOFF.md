# Phase 15 — Integrated Hardening Handoff

Status at publication: EMPTY_TEMPLATE

This file accumulates the exact combined dependency cone from Sessions 1-4. Each session appends evidence; Session 4 must finalize it for the future integrated hardening campaign.

## Session 1

Executed under `PHASE_15_S1_CORE_CONTRACT_CONVERGENCE_LOCAL_ONLY`. Terminal state: PHASE_15_S1_CORE_CONVERGENCE: IMPLEMENTED_FOCUSED_GREEN; PHASE_15_PROGRAM_STATE: SESSION_1_COMPLETE_SESSION_2_REQUIRED.

### Program starting SHA

`6324915b56df1d19faefd53e7d8156dd169a4cfd` (local main fast-forwarded to origin/main; clean tree; HEAD == origin/main verified before work started).

### Source-bearing implementation SHAs (all ancestors of live main)

- W-B unified contract result vocabulary (`nightwatch.contract-result-vocabulary.v1`): `afd49db6e1930934f00395591a03615c273ae74a`
- W-C canonical digest identity convergence (`nightwatch.canonical-digest.v1`): `39197d8379aac89abc407baac661c1b286df6872`
- W-A contract lifecycle registry (`nightwatch.contract-lifecycle-registry.v1`): `878d1ff24bcbf22ba515c1e31f8138735b988208`
- W-F contract migration compatibility map (`nightwatch.contract-migration-map.v1`): `1c903202d1cade44ea53714a828ba3e4331d6703`
- W-D composed source-contract resolution API (`nightwatch.source-contract-resolution.v1`): `5a77327d21155012fed07ad2242d916eb2bbc50b`
- W-E contract schema validation hardening (`nightwatch.contract-schema-validation.v1`): `154f045c1c0dfe4f408e88267eb86a60ba6525cb`
- S1 continuity-checker allowlist repair (mandated program artifacts approved as checkpoint paths): `07e551f52865eb91838824c6f547a3b18ff25913` (= LAST_VALIDATED_IMPLEMENTATION_SHA / LAST_SUBSTANTIVE_CHECKPOINT_SHA)
- Final session SHA: the continuity/handoff documentation checkpoint descending from `154f045…` (discoverable from Git; LIVE_HEAD_AUTHORITY: GIT).
- Interleaved foreign commits preserved untouched as ancestry, authored by an unrelated concurrent local session mid-execution; never validated or claimed by Session 1 (all Session-1 commits were staged path-scoped): `e37799246ebe3a2a3b4b59754829ac8c80f09e02` ("Phase 15 S2 W1 …") and `aecc340` ("Phase 15 S2 W2 …", carrying src/core/campaign/brief.ts, orchestrator.ts, realCampaignSemanticWiring.ts, tests/unit/campaign.test.ts, phase10Campaign.test.ts, phase15PromotionAuthority.test.ts). The concurrent session also advanced origin/main by pushing mid-Session-1 (its push published the Session-1 commits below its own HEAD); it carried none of this session's files and vice versa.

### Changed dependency cone

1. NEW convergence layer: `src/oracles/expectations/lifecycle/{contractLifecycleRegistry,contractResultVocabulary,sourceContractResolution,contractSchemaValidation,contractMigrationMap}.ts`.
2. NEW canonical identity core: `src/core/identity/canonicalDigest.ts`.
3. Checker allowlist: `bin/agent-state.mjs` (APPROVED_CHECKPOINT_PATHS extended with the enumerated mandated program artifacts).
4. Convergence refactors (byte-identical outputs, private Class-A digest copies replaced by delegation): `src/core/aiReview/util.ts`, `src/core/triage/dossier.ts`, `src/core/triage/dossierV2.ts`, `src/core/triage/clustering.ts`, `src/oracles/semantic/cluster.ts`, `src/core/journeys/fingerprint.ts`.
5. NEW permanent suites: `tests/unit/phase15{ContractResultVocabulary,CanonicalDigestIdentity,ContractLifecycleRegistry,ContractMigrationMap,SourceContractResolution,ContractSchemaValidation}.test.ts`.
6. Continuity/docs: `.agent/ACTIVE_TASK.md`, `.agent/tasks/phase-15-four-session-local-project-completion/{SPEC,PLAN,STATE,REPORT,HARDENING_HANDOFF}.md`, `docs/CURRENT_STATE.md` truth rows.
7. UNTOUCHED by design: all Phase 9–14 low-level modules (admission, collectionAdmission, resolver, provenance, recipes/*, extract/*, coverageInventory, semantic bundle/routing), registry data, corpus, workflows, package.json, tsconfig.

### Versions/contracts introduced

- `nightwatch.contract-lifecycle-registry.v1`; evidence versions `nightwatch.source-evidence-digest.v1` and `nightwatch.mechanical-analyzer-evidence.v1` (metadata labels only — no historical version constant changed).
- `nightwatch.contract-result-vocabulary.v1` (categories PROVEN/AMBIGUOUS/UNSUPPORTED/STALE/UNAVAILABLE/PARTIAL/NOT_APPLICABLE).
- `nightwatch.canonical-digest.v1` (stableJsonSorted/sha256Hex/prefixedDigest24/isEvidenceDigest/isSourceSha).
- `nightwatch.source-contract-resolution.v1` (ComposedSourceContractResolution DTO; evaluateComposedCurrentness fail-closed guard).
- `nightwatch.contract-schema-validation.v1` (strict unknown-field rejection, cross-field coherence incl. producer-proven kind→overall-category allowlist, deterministic round-trip).
- `nightwatch.contract-migration-map.v1` (35 rows: 26 CANONICAL incl. 3 forward references now resolved, 3 COMPATIBILITY_ONLY, 6 SUPERSEDED_FOR_NEW_CODE).
- Historical compatibility: zero changes to all four historical shape/deep IDs, four collection IDs, recipe schema v1/v2, derivation versions v1/v2/collection-v1, MECHANICAL_ANALYZER_VERSION, archived v1 recipes, and every pre-existing DTO.

### Focused/moderate tests actually run (raw counts)

- phase15ContractResultVocabulary: 19 passed.
- phase15CanonicalDigestIdentity: 13 passed (+ loopback pair run: 18 passed).
- Narrow compat (C): phase10Identity + phase12SemanticCluster 23 passed; triage/phase13/campaign compat set (phase12SemanticTriage, phase2cOracleMatrix, phase13Shadow, campaign) 96 passed; aiReview set (aiReview, aiOwnerReview) 83 passed.
- phase15ContractLifecycleRegistry: 20 passed.
- phase15ContractMigrationMap: 12 passed.
- phase15SourceContractResolution: 21 passed; narrow compat (D): phase9a1GapReproduction + phase11a3CollectionAdmission + phase10Currentness 43 passed.
- phase15ContractSchemaValidation: 20 passed; lifecycle compat trio 60 passed.
- Moderate semantic-platform integration pack (single Playwright run, 23 suites): phase9a1GapReproduction, phase10Admission, phase10Currentness, phase10Identity, phase10Campaign, phase11CollectionWide, phase11a3CollectionAdmission, phase12CoverageInventory, phase12SemanticCluster, semanticCampaign, phase13Shadow, phase14Analyzer, phase14StaticSchemaAdapters, phase14ContractDrift, phase14CoverageInventory, phase14ContractReport, phase14FreshSourceAdmission (live-gated portion ran against the still-present disposable snapshot `/tmp/nightwatch-ripple-snapshot-85e400a8`), plus the six phase15 suites — **432 passed, 0 failed** (run with NIGHTWATCH_PROXY_PORT=18993 after one EADDRINUSE collision with the concurrent session's Playwright run).
- Gates per workstream and at closure: npm run typecheck PASS (closure re-run PASS; during mid-session gates the only diagnostics were files owned by the concurrent unrelated session — zero diagnostics ever referenced Session-1 files); git diff --check PASS everywhere; npm run hardening:check PASS everywhere; npm run agent:check: all Session-1 v2 task validations pass; single residual error STALE_IMPLEMENTATION_BASELINE caused exclusively by the concurrently-authored committed source (`aecc340`) below the Session-1 anchor — structurally unresolvable within Session-1 authority (reverting or validating another session's work is forbidden here); recorded as repository-contamination truth, not a Session-1 defect. npm run project:check inherits the same subprocess failure (PROJECT_STATE_ACTIVE_TASK_CONTINUITY_FAILED); its catalog/truth-block rows are unchanged and valid.

### Tests deliberately NOT_RUN

Complete canonical Playwright workers=1; topology-correct isolated complete Playwright workers=1; broad Phase 9–14 sweep beyond the moderate pack; exhaustive privacy/authority adversarial matrix across the whole cone; owner-provenance sweep; agent audit-history sweep beyond strict validation; the future repository-wide integrated hardening campaign (separate owner token).

### Known residual risks for the hardening campaign

- Concurrent-writer contamination (ELEVATED): an unrelated local session committed TWO checkpoints (`e377992…`, `aecc340`) onto main mid-execution and pushed origin/main forward itself (publishing Session-1 commits as ancestry). Its code was NEVER validated by Session 1. Hardening must treat ALL concurrently-authored commits (identifiable by their "Phase 15 S2 W*" subjects and campaign/triage cones) as untrusted input requiring full separate validation, and must re-baseline agent:check only after that validation or a documented owner decision.
- Unified-vocabulary adapters are total over today's unions; any future new union member without a mapping fails closed at runtime (UNIFIED_RESULT_UNSUPPORTED_SOURCE_VALUE) — new members require adapter+matrix updates first.
- Registry family count (16) and lineage are pinned by tests against current authoritative sources; adding targets/families requires registry+test uplift, not silent growth.
- Only mechanically equivalent Class-A digest copies were converged; undefined-filtering and pre-sorted-key canonicalization variants remain duplicated intentionally (documented in the migration map) — do not merge them without byte-equivalence proofs.
- KIND→overall-category allowlist is pinned to proven producer behavior; changing resolution semantics requires updating the allowlist with fresh proof.
- Mixed-currentness and collection-transform-failure branches of the composed resolver are unreachable via public params today (proven) and are pinned unit-level; future multi-family composition could make them reachable — keep those tests mandatory.
- CI truth below remains externally billing-blocked; local green is the only acceptance evidence until Actions runs for live HEAD.

### GitHub Actions truth (Session 1)

FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_LIVE_HEAD. Pre-existing recorded condition (Phase 14 handoff, re-verified once per push there): GitHub Actions jobs fail immediately with zero steps executed due to the known external billing/spending-limit block; no checkout/build/test step runs, so no code regression is exposed or claimable. Session 1 inherits that classification; one post-push inspection belongs to the push containing this file and cannot be recorded inside it (inherent limit). Do not retry repeatedly; re-check only after billing restoration.

### Next session bootstrap requirements (Session 2)

Fresh CLI session; fetch origin and fast-forward clean main (require HEAD == origin/main); read AGENTS.md, MASTER_PLAN.md, SESSION_2_CAMPAIGN_TRIAGE_CONVERGENCE.md, STATE.md, this handoff (all sessions), plus the Phase-14 predecessor handoff; require owner token PHASE_15_S2_CAMPAIGN_TRIAGE_CONVERGENCE_LOCAL_ONLY; consume the stabilized Session-1 contracts (lifecycle registry, unified vocabulary, canonical digest helpers, composed resolution, schema-validation gateway, migration map) instead of re-deriving them; path-scoped commits remain mandatory while any concurrent local writer may exist; same permanent boundaries (no DEV/real campaign/production/data/infra/Alphaus writes/AI/selfDev/promotion/Phase 11B/Phase 13B).

## Session 2

NOT_RUN

## Session 3

NOT_RUN

## Session 4

NOT_RUN

## Required final combined contents

- Program starting SHA.
- Session 1 source-bearing/final SHAs and changed cone.
- Session 2 source-bearing/final SHAs and changed cone.
- Session 3 source-bearing/final SHAs and changed cone.
- Session 4 source-bearing/final SHAs and changed cone.
- Final implementation-complete SHA.
- Every new/changed durable schema and version.
- Every historical compatibility decision.
- Every changed source, test, corpus, bin, config, workflow, and durable-doc path.
- Fresh source SHAs used and canonical sibling write proof.
- Focused/moderate tests actually run with raw counts.
- Tests deliberately NOT_RUN.
- Known residual risks.
- CI truth for each checkpoint.
- Full hardening order.
- Exact canonical complete Playwright command.
- Exact topology-correct isolated complete Playwright command.
- Exact historical compatibility suites required.
- Adversarial privacy/authority/version/currentness matrices required.
- Continuity/project/catalog/agent audit requirements.
- Final GitHub Actions success gate.

## Future hardening authority

No hardening authority is granted by this file. The future prompt must explicitly grant:

PHASE_15_INTEGRATED_HARDENING_LOCAL_ONLY

No DEV/real campaign/production/data/infra/Alphaus writes/AI/selfDev authority is implied.