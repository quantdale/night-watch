# Task State

## Identity

Task ID: phase-13i-residual-runtime-completion-shadow-proof
Phase: 13I-RESIDUAL-RUNTIME-COMPLETION-SHADOW-PROOF
Status: IN_PROGRESS
Starting SHA: 8c1cf09f5d33d10a2e7540b6bb9589814a95735c
Last validated implementation SHA: d672b626f7e131bb1fc6cd97e33d92fe69fcd637
Last substantive checkpoint SHA: d672b626f7e131bb1fc6cd97e33d92fe69fcd637
Branch: main
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_LIVE_HEAD
Authorization class: PHASE_13I_RESIDUAL_RUNTIME_COMPLETION_LOCAL_ONLY

STARTING_SHA: 8c1cf09f5d33d10a2e7540b6bb9589814a95735c
LAST_VALIDATED_IMPLEMENTATION_SHA: d672b626f7e131bb1fc6cd97e33d92fe69fcd637
LAST_SUBSTANTIVE_CHECKPOINT_SHA: d672b626f7e131bb1fc6cd97e33d92fe69fcd637

## Objective

Close Phase 13 residual local runtime gaps: semantic promotion routing, real-adapter replay-plan-v2/executor binding, integrated Phase-13 shadow proof, and exhaustive drift/ledger hardening, with no DEV.

## Current Milestone

Milestone ID: M10
Milestone status: IN_PROGRESS
What is being attempted: All local gates proven (M0-M9). Preparing validated checkpoint push M10.

## Completed Milestones

- M0 Bootstrap: fetched origin --prune, HEAD==origin/main at 8c1cf09, owner token PHASE_13I_RESIDUAL_RUNTIME_COMPLETION_LOCAL_ONLY recorded, Phase 13I NONE->IN_PROGRESS made ACTIVE_TASK, Phase 13H preserved BLOCKED, live-head reconciled to GIT authority.
- M0 R1-R5 reproductions (live source, SPEC §4): R1 protocol-only cluster/triage route reproduced (grep: clusterAnomalies/triageAnomaly only path); R2 structural FAILURE without executor reproduced in tests/manual/phase7-real-campaign.ts (grep FAILURE lines before fix); R3 V2 not load-bearing reproduced (no TriageReplayPlanV2 consumption at adapter before fix); R4 corpus/phase13 absent (ls missing before fix); R5 version drift matrix incomplete reproduced (no one-at-a-time matrix proof before fix). All 5 confirmed, refutations: none.
- M1 Semantic candidate evidence + dual routing (Workstream A): src/core/campaign/campaignSemanticEvidence.ts strict versioned DTO (nightwatch.campaign-semantic-evidence.v1) carrying only safe categorical/control identity (bundleId scb:sha256, bundleVersion, targetId/expectationId/sourceRepoId SAFE_ID, sourceSha 40-hex, evidenceDigest ev:sha256, derivation/admission generic version, resolverState/sourceCurrentness/receiptOutcome/coverageState/findingCategory enums, receiptVersion, fingerprint fp:sha256, invariantId inv:sha256); unknown fields reject, sentinel privacy block, certification REPRODUCED/HIGH/READY/SAFE rejected. CampaignAnomalyCandidate extended with optional campaignSemanticEvidence. identity.ts assertPersistedCandidateShape allowlists and validates DTO. orchestrator.ts validateCandidatePrivacy validates DTO, hasValidSemanticEvidence completeness gate, invariantFromEvidence stub preserves split/merge.
- M1 Dual clustering wired (Workstream A): orchestrator.ts recomputeClusters now explicit dual-path — semantic candidates via clusterSemanticObservations (using semanticContractIdentity/semanticClusterKey, binding expectationId+targetId+invariantId+repoId+evidenceDigest+derivationVersion, ignoring ordinal/count/timestamp/SHA movement when digest+derivation unchanged, splitting on digest/derivation/target/expectation/invariant), protocol-only via historical clusterAnomalies; distinct namespace sc:sha256 vs cluster:sha256 per D13, no global replace.
- M2 Promotion ledger (Workstream B): promoted dossiers remain v1-persisted via triageAnomaly (readback stays valid); dossierVersion optional in types.ts/checkpoint.ts (v1/v2 both accepted, READY<->bugCandidates enforced). loadDossiers routes v2 readback through parseBugDossierV2. Future semantic v2 emission documented as follow-up (not shipped; no test breaks).
- M3 Real-adapter V2 executor binding (Workstream C): tests/manual/phase7-real-campaign.ts all structural-only FAILURE removed; now builds/validates TriageReplayPlanV2 (createTriageReplayPlanV2 + validateReplayPlanV2), maps retained MinimizationAction to unambiguous occurrence ordinals (mapRetainedActionsToOrdinals counting distinct embeddings, ambiguous→INVALID), calls executeReplayPlanV2(plan, injectedExecutor) — only injected executor may return FAILURE, different fingerprint→PASS, throw→INVALID, API exactly one, journey reduced PRECONDITION_DIVERGENCE.
- M4 Ledger/drift/brief (Workstream D): checkpoint.ts dossierVersion optional, UNRESOLVED-in-bugCandidates fail-closed, historical v1 compat preserved; identity.ts campaignSemanticEvidence persisted validation; types.ts already bound 8 drift fields (triageReplayPlanVersion/V2/semanticTriageEvidence/dossierV2/semanticCluster/semanticBundle/semanticReceipt/semanticExpectationDerivation); orchestrator assertCurrentVersions before executor.
- M5 Shadow campaign (Workstream E): corpus/phase13/{README,response-fixtures,source-fixture/phase13Fixtures} + src/core/phase13/shadow.ts (42 fixtures: 11 replay, 16 semantic truth, 3 protocol, 12 drift) + tests/unit/phase13Shadow.test.ts (26 tests) — all using actual modules with synthetic executors only; quality floors all 0; 3× determinism 0 mismatches.
- M6 Hardening/compat: typecheck PASS, hardening:check PASS, focused matrices PASS (campaign 27/27, phase12 compat 76/76, phase13Shadow 26/26), campaign:synthetic 27, owner-provenance 91 (all green).
- M7 Fresh-source canary: realSourceCanary 40 PASS (registry consistency + sibling read-only derive ≥1, fixture-backed parity), phase12CoverageInventory G01-G03 PASS (remote SHA e026c855…, disposable snapshot matches, canonical sibling byte-identical 0 writes), byte-identical catalog/sibling checks green.
- M8 Full regressions: canonical --project=nightwatch --workers=1 1391 passed / 4 skipped / 0 failed; isolated clean clone + npm ci strict unit 1324/4/0 typecheck/hardening PASS (changeIntelligenceBacktest 7-fail in isolated is expected topology without siblings; canonical 8/8 PASS — not a regression).
- M9 Continuity: agent:check PASS (warnings only: STALE_IMPLEMENTATION_BASELINE expected pre-push, legacy warnings 24), agent:audit strict_errors 0, project:check dirty expected pre-push (will be clean post-commit), catalog count 1 unchanged, diff --check PASS.

## Work In Progress

- M10 Validated checkpoint: committing/pushing fast-forward after all local gates green.

## Exact Next Action

Commit validated source-bearing checkpoint, push fast-forward, verify HEAD==origin/main clean, inspect exact Actions run/job-start truth, rerun decisive post-push local checks, then M11 docs closure/DECISIONS.

## Files Changed

- .agent/ACTIVE_TASK.md — transition to IN_PROGRESS, STARTING_SHA 8c1cf09, authority PHASE_13I_RESIDUAL_RUNTIME_COMPLETION_LOCAL_ONLY.
- .agent/tasks/phase-13i-residual-runtime-completion-shadow-proof/STATE.md — this file.
- src/core/campaign/campaignSemanticEvidence.ts — NEW strict versioned DTO (nightwatch.campaign-semantic-evidence.v1).
- src/core/campaign/types.ts — CampaignAnomalyCandidate.campaignSemanticEvidence optional, CampaignDossierRecord.dossierVersion optional (v1/v2).
- src/core/campaign/identity.ts — assertPersistedCandidateShape allowlists + validates campaignSemanticEvidence.
- src/core/campaign/checkpoint.ts — dossierVersion optional, READY<->bugCandidates enforcement, v2 version check.
- src/core/campaign/orchestrator.ts — dual-path recomputeClusters (semantic vs protocol), ledger readback v2 routing, promotion ledger v1-persisted (future v2 documented), imports for semantic cluster.
- tests/manual/phase7-real-campaign.ts — V2 occurrence-bound executor binding (mapRetainedActionsToOrdinals, validateReplayPlanV2, executeReplayPlanV2, API/journey gates).
- corpus/phase13/** — NEW synthetic corpus (42 fixtures synthetic-only).
- src/core/phase13/shadow.ts — NEW integrated harness (nightwatch.phase13.shadow.v1, 3× determinism).
- tests/unit/phase13Shadow.test.ts — NEW 26 tests covering I01-I26 floors.

## Validation Ledger

Full evidence (post-stitch, local):

- typecheck: PASS
- hardening:check: PASS (offline structural invariants hold)
- campaign synthetic: 27 passed
- owner-provenance: 91 passed (privateArtifactAtomic + aiOwnerReview + aiReview)
- phase13Shadow: 26 passed (quality floors 0, determinism 0 mismatches, privacy 0)
- phase12 compat: 76 passed
- realSourceCanary + phase12CoverageInventory: 40 passed (G01 remote e026c855…, G02 disposable, G03 canonical 0 writes)
- canonical full: 1391/4/0 (workers=1)
- isolated clean clone + npm ci: strict unit 1324/4/0, typecheck PASS, hardening PASS (backtest 7-fail in --local isolated is topology-expected, not a code failure; canonical backtest 8/8 PASS)
- agent:check: PASS (STALE_IMPLEMENTATION_BASELINE pre-push expected, no strict errors)
- agent:audit: strict_errors 0
- project:check: dirty expected pre-push
- catalog count: 1
- diff --check: PASS

Remaining before CLAIM local-verified: M10 push + exact Actions truth + M11 docs (DECISIONS D-63, CURRENT_STATE, ROADMAP).

## Decisions Made During This Task

Decision: create a new Phase 13I task instead of resuming Phase 13H.
Reason: Phase 13H is truthfully terminal BLOCKED and explicitly requires a fresh owner-authorized follow-up; preserving it avoids rewriting historical execution truth.

Decision: keep protocol-v1 and semantic-v2 promotion paths explicit.
Reason: global reinterpretation would silently change historical campaign evidence semantics.

Decision: treat 8c1cf09 as execution STARTING_SHA (publication a7abfee is now historical).
Reason: Two docs-only descendants advanced main; Git live-head authority governs. Implementation anchor d672b62 remains LAST_VALIDATED.

Decision: promote dossiers as v1-persisted in checklist-integrated hardening (ledger stays v1 until semantic v2 emission is real).
Reason: Current triageAnomaly emits v1 bytes; tagging v2 would fail closed on readback. Keep minimal correct ledger and document future v2 seam.

## Discoveries

- Phase 13H ACTIVE/STATE Recovery text refers to d672b62 as if live HEAD, while the docs closure is a7abfee; reconciled to GIT authority in this task's ACTIVE_TASK.md.
- corpus/phase13 absent at publication (R4 confirmed).
- orchestrator.ts pre-fix was protocol-only clustering (R1 confirmed via grep).
- Isolated --local clone without siblings fails 7 changeIntelligenceBacktest identically (topology-expected; canonical 8/8 PASS validates it is not a code regression).
- GAP 1 v2 emission requires future triage/pipeline extension (documented deferred).

## Blockers

External GitHub Actions billing/spending-limit may remain, but does not block local/source work.

## Safety Events

NONE

## Deferred / Follow-Up

- Phase 13B: NOT_AUTHORIZED.
- Phase 11B: NOT_AUTHORIZED.
- Any real campaign: NOT_AUTHORIZED.
- Phase 6/data/infra: frozen/out of scope.
- Semantic v2 dossier emission: deferred — triageAnomaly/pipeline to emit createBugDossierV2 when semantic evidence present (so ledger dossierVersion: v2 bytes are readback-consistent).
- Journey/exploration reduced replay as PRECONDITION_DIVERGENCE remains correct (no invented subset executor).

## Resume Recipe

Fetch origin/main, verify HEAD==origin/main. Read AGENTS.md + ACTIVE_TASK.md + this STATE.md + SPEC/PLAN/WORKSTREAMS/ACCEPTANCE_MATRIX + docs/design/PHASE_13I_RESIDUAL_RUNTIME_COMPLETION.md. Source wins over docs. Continue Exact Next Action (M10 push then M11 docs).

## Completion Snapshot

Not complete. Phase 13I IN_PROGRESS at M10.

```text
PHASE_13I_STATUS: IN_PROGRESS
PHASE_13I_IMPLEMENTATION_AUTHORITY: PHASE_13I_RESIDUAL_RUNTIME_COMPLETION_LOCAL_ONLY
PHASE_13H_STATUS: BLOCKED (historical)
PHASE_13B_STATUS: NOT_AUTHORIZED
NEXT ACTION: COMMIT_VALIDATED_CHECKPOINT_M10
```
