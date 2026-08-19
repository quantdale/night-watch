# HARDENING HANDOFF — Phase 13 Overnight Batch

This document is the required handoff from the implementation-only overnight batch into the **next separate hardening campaign**.

Do not run the hardening campaign under `PHASE_13_OVERNIGHT_THREE_CHANGE_IMPLEMENTATION_ONLY`.

## Overnight implementation inventory

### C1 — Contract & identity correctness

- implementation SHA(s): `2aab111` — `Phase 13 overnight C1: contract & identity correctness`
- replay-plan schema/version changes: introduced `nightwatch.triage-replay-plan.private.v2` with deterministic `occurrenceId` and occurrence-aware `retainedOccurrenceIds` while retaining v1 for historical parse; `planId` now occurrence-aware; `rp2:sha256:` prefix for v2 distinct identity.
- occurrence-identity representation: `ReplayOccurrence { ordinal: number, expectedActionId: string }` with strict ordinal uniqueness and sentinel rejection; `isOrderPreservingOrdinalSubsequence` validation.
- API cardinality fix: strict `originalOccurrences.length === 1` and `retainedOccurrenceOrdinals.length === 1` for `API` kind in both v1 and v2; empty/multi/reordered/foreign operation rejected before executor exposure.
- semantic-evidence coherence changes: strict `PARTIAL_COVERAGE` cross-field coherence (outcome ↔ receipt ↔ coverageState), `exactFingerprintMatch` ↔ `exactReplayStatus` coupling, and `minimality` ↔ `minimalSequenceReproductions` consistency in `validateSemanticTriageEvidence`.
- semantic/AI-ready confidence changes: `aiReady` in `dossierV2` now exposes deterministic `semanticConfidence.level` (never stronger than legacy generic confidence) when semantic triage evidence exists.
- compatibility decisions: v1 parsing preserved; historical semantic findings without occurrence identity remain valid through v1; no silent reinterpretation.
- known unresolved risks: `H02` yield backtest baseline divergence must be re-verified after v2 identity; hardening must add permanent focused regressions for occurrence selection, API cardinality, and AI-ready ceiling.

### C2 — Real-campaign semantic runtime plumbing

- implementation SHA(s): `e0941aa` — `Phase 13 overnight C2: real-campaign semantic runtime plumbing`
- source-bundle schema/version: `nightwatch.semantic-campaign-bundle.private.v1` with `bundleId: scb:sha256:` deterministic over repo SHA, target/expectation ID, evidence digest, derivation version, admission version, resolver state, and approved mapping; `DEPLOYMENT_STATUS_UNRESOLVED: true` always.
- fixed target/journey mapping: `src/oracles/semantic/campaignTargetMapping.ts` closed table over `APPROVED_READ_ONLY_TARGET_IDS` via `getRealSourceRecipe`; unsupported target → `null` (protocol-only fail-closed).
- semantic observer seam changes: `src/core/campaign/realCampaignSemanticWiring.ts` adapts `(targetId) => RealSourceResolution` into observer's `SemanticResponseOracle`; `bundleSupportsTarget` + `campaignSemanticObservationFor` gate; `tests/manual/phase7-real-campaign.ts` wires oracle only for approved mapping when external resolver supplied.
- manifest/checkpoint/version changes: none in C2 proper (version fingerprint extension deferred to C3).
- historical compatibility/migration behavior: absent bundle or `NO_EXPECTATION`/`STALE` resolver state → protocol-only; no invented authority.
- unsupported protocol-only surfaces: any campaign journey/operation without a mechanically derived recipe remains explicit unsupported.
- known unresolved risks: source-bundle freshness producer (read-only discoverer + disposable snapshot) not yet integrated as a campaign preflight; hardening must prove no network/DB/AI in pure cores.

### C3 — Real replay + triage + dossier integration

- implementation SHA(s): `967ef7a` — `Phase 13 overnight C3: real replay + semantic triage/clustering/dossier integration`
- candidate classes with real replay source binding:
  - exploration: exact replay preserves every original occurrence; reduced replay is order-preserving subsequence with catalog guards (`KNOWN_READ`/`LOCAL_ONLY`, no `SERVER_STATE`, `UNCHANGED`/`APPROVED_ROUTE`).
  - API: single fixed `ripple.*.read` operation only; exact and reduced both single-occurrence; empty/multi/foreign rejected (`PRECONDITION_DIVERGENCE`/`ACTION_NOT_APPROVED`).
  - journey: exact replay valid for frozen 2-step definitions (both steps preserved); reduced replay explicitly `PRECONDITION_DIVERGENCE` — no invented subset executor (conservative for `NAVIGATE_APPROVED_ROUTE` → `WAIT_STRUCTURAL_CHECKPOINT` dependency).
- candidate classes still explicitly unsupported: journey reduced replay (subset execution would require inventing route/structural semantics; remains fail-closed rather than simulated).
- `invalidReducedReplay()` remaining occurrences and why: none for exploration/API/journey. The generic stub is replaced by class-specific helpers (`explorationReplayFromPlan`, `apiReplayFromPlan`, `journeyReducedUnsupported`). Historical `phase12YieldBacktest` baseline equivalence intent preserved with truthful per-class callbacks.
- semantic clustering integration: via existing `candidate.semanticFindings` channel through `orchestrator` → `triageAnomaly` → `toSemanticDossierEvidence`; clustering remains protocol `clusterAnomalies` keyed on fingerprint/features with sentinel/privacy checks. Full semantic `cluster.ts` keying (evidence digest + derivation version, SHA-movement dedup) is available as `semanticClusterKey` and is now frozen in the manifest fingerprint for drift detection, but the campaign's stable-feature cluster key remains authoritative for protocol candidates. Hardening must exercise the semantic cluster switch for semantic candidates end-to-end.
- semantic confidence integration: `rankSemanticConfidence` is already wired through `dossierV2` when semantic triage evidence is present; `isReadySemanticDossier` predicate remains derived, never writer-provided. No new confidence path added; existing path covered by version fingerprint drift.
- dossier-v2 integration: dossier v2 `READY`/`UNRESOLVED` remains derived; `aiReady` ceiling from C1 preserved. No new dossier schema in C3.
- private output/brief changes: none in C3 (existing `brief.ts` already carries only sanitized categorical evidence: `candidateId`, categorical `confidence`, `faultBoundary`, counts). Hardening must verify no caller-provided field can pre-certify HIGH/READY.
- known unresolved risks: journey reduced replay must remain explicit unsupported; exploration guards rely on `RIPPLE_PHASE4_ACTIONS` allowlist; hardening must add exhaustive replay-binding composition tests and verify exact fingerprint equality remains the only reproduction rule across PARTIAL/stale/unsafe/privacy-nonzero.

## Manifest/checkpoint version identity (C1+C2+C3)

Extended `CampaignVersionFingerprint` in `src/core/campaign/types.ts` and hardened `validateVersionShape` in `src/core/campaign/identity.ts` to freeze:

- `triageReplayPlanVersion` = `TRIAGE_REPLAY_PLAN_VERSION`
- `triageReplayPlanV2Version` = `TRIAGE_REPLAY_PLAN_V2_VERSION`
- `semanticTriageEvidenceVersion` = `SEMANTIC_TRIAGE_EVIDENCE_VERSION`
- `dossierV2Version` = `DOSSIER_VERSION_V2`
- `semanticClusterVersion` = `SEMANTIC_CLUSTER_VERSION`
- `semanticBundleVersion` = `SEMANTIC_CAMPAIGN_BUNDLE_VERSION`
- `semanticReceiptVersion` = `SEMANTIC_EVALUATION_RECEIPT_VERSION`
- `semanticExpectationDerivationVersion` = `REAL_SOURCE_DERIVATION_VERSION_V2`

Any drift fails closed as `CAMPAIGN_VERSION_DRIFT` before executor callbacks; historical evidence remains versioned, no auto-migration.

Tests updated: `tests/unit/campaign.test.ts`, `tests/unit/semanticCampaign.test.ts`, `tests/unit/phase10Campaign.test.ts`, and `tests/manual/phase7-real-campaign.ts` now carry the full fingerprint.

## Changed surfaces (summary)

- `src/core/campaign/types.ts` — expanded fingerprint.
- `src/core/campaign/identity.ts` — exact-keys validation for the 8 new version fields.
- `tests/manual/phase7-real-campaign.ts` — real replay binding for journey/exploration/API + fixed version fingerprint wiring.
- `tests/unit/campaign.test.ts`, `tests/unit/semanticCampaign.test.ts`, `tests/unit/phase10Campaign.test.ts` — full fingerprint fixtures.

Prior C1/C2 surfaces remain: `src/core/triage/replayPlan.ts`, `src/core/triage/semanticTriageEvidence.ts`, `src/core/triage/dossierV2.ts`, `src/core/source/semanticCampaignBundle.ts`, `src/core/campaign/realCampaignSemanticWiring.ts`, `src/oracles/semantic/campaignTargetMapping.ts`.

## Minimal overnight validation evidence

Record exact results only:

- C1 typecheck: PASS (commit `2aab111`, `npx tsc --noEmit` green).
- C1 git diff --check: PASS.
- C2 typecheck: PASS (commit `e0941aa`, `npx tsc --noEmit` green).
- C2 git diff --check: PASS.
- C3 typecheck: PASS (commit `967ef7a`, `npx tsc --noEmit` green — adjusted one TS2722 strict-null guard in journey helper).
- C3 git diff --check: PASS.
- final focused smoke command/count: `npx playwright test tests/unit/campaign.test.ts --workers=1` — 27 passed, 0 failed (2.7s, single retry infra). Semantic subset run (`phase12SemanticTriage`, `semanticCampaign`, `phase10Campaign`) included 1 intentionally deferred regression failure for hardening (see Known risks) and otherwise 57 passed; not counted as overnight gate.
- final agent:check: to be run in final docs push (see below).
- GitHub Actions observations, if any: not awaited per amendment; external billing/spending-limit block expected to remain. Record after push inspection.

Anything not explicitly listed above is **NOT_RUN** unless actual output proves otherwise. Explicitly NOT_RUN: `hardening:check`, complete Phase 13 acceptance matrix, full Phase 9/10/11/12 compatibility matrices, `campaign:synthetic`, owner-provenance, complete Playwright (canonical + isolated), DEV/current-source canary, any real campaign. Deferred to the required next hardening campaign.

## Known risks and deferred assertions

1. `tests/unit/phase12SemanticTriage.test.ts` — `stale source dossier cannot be READY` currently fails closed at evidence creation (`TRIAGE_EVIDENCE_CURRENTNESS_RECEIPT_CONTRADICTION`) because the fixture's `receiptOutcome: ANOMALY` contradicts `sourceCurrentness: STALE` under strict coherence added in C1. This is intentional strictness; hardening must decide whether the test fixture should use `receiptOutcome: EXPECTATION_SOURCE_STALE` with storage-bounded stale evidence or treat the contradiction itself as the expected READY-block. Left unresolved for hardening to reconcile against the semantic receipt truth table; no test relaxed overnight.
2. Full semantic cluster routing (evidence-digest + derivation-version dedup, row-ordinal non-fragmentation) is version-frozen but the campaign's stable-feature cluster remains the live protocol key; hardening must prove the semantic key switch for semantic candidates without regressing protocol dedup.
3. Journey reduced replay must remain explicit unsupported — hardening must verify no path can certify a journey subset as reproduced by inventing steps.

## Compatibility decisions

- Historical manifests/checkpoints without the 8 new version fields fail closed as `MANIFEST_INTEGRITY_INVALID` rather than silently reinterpreting; no auto-migration.
- Historical v1 dossiers and v1 replay plans remain parseable.
- Protocol-only candidates require no semantic data.

## Recommended next hardening order

See `## Required next hardening campaign` and `## Hardening priorities` below; execute priorities 1→10 in order, starting with safety/authority and replay occurrence/cardinality before any `campaign:synthetic` or full Playwright.

## Required next hardening campaign

The next owner-authorized task should treat all three changes as one integrated surface and perform, at minimum:

1. Re-read live Git and every C1/C2/C3 changed file.
2. Cross-check implementation against the original Phase 13 SPEC/workstreams and this amendment.
3. Run `npm run hardening:check` and extend hardening guards for every new pure/runtime boundary.
4. Build/complete permanent focused regressions for replay occurrence identity, API cardinality, semantic evidence coherence, manifest/checkpoint version drift, source-bundle fail-closed behavior, semantic observer attachment, replay binding, semantic cluster/confidence/dossier readiness, privacy and authority boundaries.
5. Execute the full Phase 13 acceptance matrix rather than accepting implementation intent.
6. Run Phase 12 compatibility and the relevant Phase 9/10/11 matrices.
7. Run `campaign:synthetic` and owner-provenance.
8. Run deterministic shadow-campaign/backtest repeats and verify zero false reproduction / false READY / partial false PASS / stale false PASS / privacy leaks.
9. Run fresh current-source remote-SHA + disposable-snapshot derivation/currentness canary with canonical sibling writes 0.
10. Run canonical complete Playwright with `--workers=1` and record raw pass/skip/fail counts.
11. Run topology-correct isolated complete Playwright from a fresh clone with `npm ci` and record raw counts.
12. Run `agent:check`, `agent:audit`, `project:check`, catalog integrity, and `git diff --check`.
13. Inspect exact GitHub Actions runs. If billing still blocks jobs before execution, terminalize truthfully as external-CI blocked; do not claim CI success.
14. Only after hardening is genuinely green should any Phase 13B contained DEV acceptance be designed or authorized.

## Hardening priorities

Prioritize in this order:

1. safety/authority boundary regressions;
2. replay occurrence/cardinality correctness;
3. stale/currentness/manifest-resume fail-closed semantics;
4. semantic PARTIAL/stale/unavailable truth propagation;
5. privacy and raw-value leakage;
6. replay/minimization fingerprint correctness;
7. semantic confidence/READY/AI-ready non-overclaim;
8. protocol-only backward compatibility;
9. determinism and clustering identity;
10. full regression and CI/continuity closure.

## State rule

The overnight batch may end `IMPLEMENTED_AWAITING_HARDENING` only. This handoff must never be used as evidence that any deferred hardening row passed.
