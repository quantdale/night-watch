# Phase 15P — Integrated Hardening Handoff

Status at publication: COMPLETE_FOR_HANDOFF (implementation-complete,
pre-hardening; this file grants no hardening authority).

This file is the complete dependency-cone input for the future integrated
hardening campaign (`PHASE_15_INTEGRATED_HARDENING_LOCAL_ONLY`, separately
owner-gated). Terminal campaign state:
PHASE_15_PARALLEL_IMPLEMENTATION: IMPLEMENTATION_COMPLETE_AWAITING_INTEGRATED_HARDENING.

## Program starting SHA

`e07630238d314f48718b1ca9fce2dc9ee31317eb` (Phase-15P session start;
HEAD == origin/main verified after fetch --prune). First baseline checkpoint
on top of it: `08890e64560d6c5870484fa72714f09e974ab1dd` (prior Session-2
closure adoption + 15P task infrastructure + checker allowlist extension for
the mandated parallel-execution artifacts PROPOSAL/SUBAGENT_LEDGER/
INTEGRATION_LEDGER).

## Final implementation SHA

`42c5a7e` (A16 integration checkpoint; full SHA
recorded in INTEGRATION_LEDGER.md). Documentation/continuity descendants
after it are CHECKPOINT_ADVANCE only (LIVE_HEAD_AUTHORITY: GIT).

## Sub-agent assignments and outcomes

All sixteen assignments completed; none blocked. Live truth in
SUBAGENT_LEDGER.md; per-patch cherry-pick truth in INTEGRATION_LEDGER.md.

| Agent | Area | Outcome |
|---|---|---|
| A01 | Contract lifecycle registry convergence | INTEGRATED wave 1 — NEW `contractLifecycleModel.ts`: one deterministic composed lifecycle model (identity, historical-ID compatibility, active/superseded, derivation version, evidence identity, collection scope, currentness, admission); `assertHistoricalIdStability` mechanically forbids silent rebinding/strengthening of historical IDs. |
| A02 | Semantic result/reason vocabulary | INTEGRATED wave 1 — NEW `semanticVocabulary.ts`: total adapters over 8 previously-unconverged vocabularies onto the unified categorical axis, strict parse-time unknown-value rejection, mechanical provenance registry, strict persisted-DTO parsing; never-PASS guarantee structurally preserved. |
| A03 | Resolution/currentness/drift platform | INTEGRATED wave 1 — NEW `sourceContractMovement.ts`: composed movement classifier (SEMANTICALLY_STABLE / EVIDENCE_DRIFTED_* / PROVABILITY_* / DERIVATION_VERSION_MOVED / SOURCE_STALE / SOURCE_UNAVAILABLE) with fail-closed currentness ceiling: stale/unavailable never becomes current/stable. |
| A04 | Schema/coherence/migration validation | INTEGRATED wave 1 — cross-field coherence rules (kind↔derivation-version pairing, CURRENT/STALE⇒evidence digest, families composition restrictions, self-reference rejection), findings⟺ANOMALY receipt invariant, exact-outside-min-max rejection, historical-shape reader ownership table (`nightwatch.historical-reader-table.v1`). |
| A05 | Campaign candidate lifecycle | INTEGRATED wave 2 — additive GATE_BLOCK event routes safety/privacy/currentness/budget gate failures to explicit terminals; orchestrator wiring closes every gate-stopped or finalized-open record; reject-loop resume double-REJECT hazard fixed; no new states, version unchanged. |
| A06 | Replay plan V2 binding | INTEGRATED wave 2 — occurrence-identity/duplicate-action helpers; `ValidatedReplayPlanV2` branded value + `executeValidatedReplayPlanV2` seam makes executing an unvalidated plan unrepresentable; validation still precedes any executor callback. |
| A07 | Minimizer minimality truth | INTEGRATED wave 2 — soundness fix: 1-MINIMAL/MINALITY_PROVEN now requires every final-survivor deletion genuinely exercised through the bound replay path + invocation-ledger cross-check (`exercisedReducedReplayCount >= 1`); mixed audits demote to MINIMALITY_NOT_PROVEN; strictly monotone change. |
| A08 | Cluster/confidence/dossier pipeline | INTEGRATED wave 3 — total deterministic tiebreakers (permutation-invariant clustering); readiness-critical declared gaps structurally cap confidence below HIGH; READY strengthened (minimality guarantee ≠ NONE + ≥1 reproduction + no declared readiness-critical gap); protocol-only path intact. |
| A09 | Checkpoint/resume/version drift | INTEGRATED wave 2 — additive resume-drift classifiers (`classifyVersionFingerprintDrift`, `classifyCheckpointResumeDrift`); real defect fixed: unresolved ledger appends set-idempotent at all stop/interruption sites (second interrupted resume previously crashed on duplicate PROCESS_INTERRUPTION); all version families proven stop-before-executor via matrices. |
| A10 | Local project health/readiness API | INTEGRATED wave 3 — NEW `src/core/readiness/**` (`nightwatch.local-readiness.v1`): pure summarizer + JSON/text renderers from ONE model; exact category vocabulary (READY_LOCAL_SYNTHETIC / BLOCKED_SOURCE / BLOCKED_VERSION / BLOCKED_AUTHORITY / BLOCKED_EXTERNAL_CI / NOT_APPLICABLE); executable privacy screen; `bin/nightwatch-status.mjs` + `status:local` script. |
| A11 | Artifact/ledger/schema validators | INTEGRATED wave 3 — NEW `src/core/artifactValidation/**`: `validateArtifact(kind, value, context?)` facade over 10 durable kinds composing existing module validators verbatim + new strict observation/cluster/reproduction/coverage-report validators with identity recomposition; read-only, fail-closed unknown kinds. |
| A12 | Deterministic project snapshot + diff | INTEGRATED wave 3 — NEW `src/core/projectSnapshot/**` (`nightwatch.project-snapshot.v1`): explicit-input manifest (contract versions, approved targets, analyzer/replay/receipt/dossier versions, campaign fingerprint fields, owner-scope markers, catalog digests) + classified diff UNCHANGED/COMPATIBLE_CHANGE/SEMANTIC_CHANGE/AUTHORITY_CHANGE/INCOMPATIBLE_CHANGE with documented precedence. |
| A13 | Privacy/authority by construction | INTEGRATED wave 4 — bounded categorical error detail (`safeErrorDetail`) across artifact/readiness/snapshot/vocabulary/movement/policy failure surfaces; readiness identity screening; snapshot identifier bounds; DTO sentinel screening; owner-gate message bounding; clean values keep byte-identical historical messages. |
| A14 | Synthetic corpus/adversarial matrix | INTEGRATED wave 4 — `corpus/phase15p/**` fixture builders + catalog of **78 scenario classes** (SC-01..SC-78, 11 domains) + comprehensive suite; whole-matrix determinism ×3 (byte-equal), sentinel sweep, zero-executor-call proofs on drift classes. Predecessor agent timed out mid-delivery; fixture layer kept, suite completed by a fresh delegated agent; two fixture data-value repairs (non-hex fingerprint constant, non-member proofClass literal) documented. |
| A15 | Compatibility/dead code/version convergence | INTEGRATED wave 4 — deleted proven-dead `safetyVectorIsZero` + `parseSemanticTriageEvidence` (zero callers proven worktree-wide); converged `stableLifecycleJson`/`stablePromotionResultJson` onto canonical `stableCampaignJson` as @deprecated byte-identical aliases; bound artifact acceptance table + semantic-confidence blocker map to owning constants; permanent guard suite (110 version constants single-ownership scan, deprecated-alias import ban). |
| A16 | Release-candidate rehearsal | INTEGRATED final — confirmed seam defect fixed: checkpoint lifecycle reason-code validator converged with candidateLifecycle (bounded `{0,127}` + sentinel screen, same `LAST_REASON_CODE_UNSAFE` code) closing a resume-gate vs transition-time divergence; full synthetic release-candidate rehearsal (below). |

## Canonical integration-wave SHAs

| Wave | Agents | Checkpoint SHA | Continuity docs commit |
|---|---|---|---|
| baseline | parent | `08890e64560d6c5870484fa72714f09e974ab1dd` | — |
| 1 | A01 A02 A03 A04 | `417d187cb13de98db611c4f2412f94fe62a9daab` | `c32fbeab0861aaede78203fbd37fb0890c18b6d3` |
| 2 | A05 A06 A07 A09 | `dbd2397d52b12d51c8fdf478c1d299cca5f9be2f` | `3ebe9e2ed192f8508d280c348a45a731a769dee9` |
| 3 | A08 A10 A11 A12 | `7abcf5f8e65fb0ca5fcbbba7c40e941554fa9797` | `866f8ccb960a1a12562d90887705c798267c99d2` |
| 4 | A13 A14 A15 | `68f14b268a6834aa1881b1d50ae7a5fc56b2943a` | `35ed0b29ee18b2ab7086af68f3fb419620422ed1` |
| final | A16 | `42c5a7e…` (see Git) | this commit's descendants |

Conflict resolution record: exactly ONE semantic conflict (wave 2,
orchestrator.ts, A05×A09) — resolved keeping BOTH behaviors (A05
closeOnGateFailure gate-closure AND A09 set-idempotent unresolved append);
documented in INTEGRATION_LEDGER.md. All other cherry-picks conflict-free.
No patch was rejected.

## Changed dependency cone

73 files changed from starting SHA to final implementation SHA
(+20475/−314). Machine-readable list (exact command:
`git diff --name-only --no-renames e07630238d314f48718b1ca9fce2dc9ee31317eb..42c5a7e`):

```
.agent/ACTIVE_TASK.md
.agent/tasks/phase-15-four-session-local-project-completion/HARDENING_HANDOFF.md
.agent/tasks/phase-15-four-session-local-project-completion/PLAN.md
.agent/tasks/phase-15-four-session-local-project-completion/REPORT.md
.agent/tasks/phase-15-four-session-local-project-completion/STATE.md
.agent/tasks/phase-15p-parallel-local-project-completion/HARDENING_HANDOFF.md
.agent/tasks/phase-15p-parallel-local-project-completion/INTEGRATION_LEDGER.md
.agent/tasks/phase-15p-parallel-local-project-completion/PLAN.md
.agent/tasks/phase-15p-parallel-local-project-completion/PROPOSAL.md
.agent/tasks/phase-15p-parallel-local-project-completion/REPORT.md
.agent/tasks/phase-15p-parallel-local-project-completion/SPEC.md
.agent/tasks/phase-15p-parallel-local-project-completion/STATE.md
.agent/tasks/phase-15p-parallel-local-project-completion/SUBAGENT_LEDGER.md
bin/agent-state.mjs
bin/nightwatch-status.mjs
corpus/phase15p/adversarialExecutors.ts
corpus/phase15p/adversarialFixtures.ts
corpus/phase15p/adversarialScenarioCatalog.ts
package.json
src/core/artifactValidation/coverageReportValidation.ts
src/core/artifactValidation/dossierKindValidation.ts
src/core/artifactValidation/index.ts
src/core/artifactValidation/observationClusterValidation.ts
src/core/artifactValidation/reproductionValidation.ts
src/core/artifactValidation/types.ts
src/core/campaign/candidateLifecycle.ts
src/core/campaign/checkpoint.ts
src/core/campaign/orchestrator.ts
src/core/campaign/runtimeValidation.ts
src/core/campaign/types.ts
src/core/policy/ownerScope.ts
src/core/projectSnapshot/build.ts
src/core/projectSnapshot/compare.ts
src/core/projectSnapshot/index.ts
src/core/projectSnapshot/types.ts
src/core/readiness/index.ts
src/core/readiness/localReadiness.ts
src/core/readiness/repoState.ts
src/core/readiness/types.ts
src/core/triage/clustering.ts
src/core/triage/dossierV2.ts
src/core/triage/minimizer.ts
src/core/triage/promotionResult.ts
src/core/triage/replayBinding.ts
src/core/triage/replayPlan.ts
src/core/triage/semanticConfidence.ts
src/core/triage/semanticTriageEvidence.ts
src/core/triage/types.ts
src/oracles/expectations/lifecycle/contractLifecycleModel.ts
src/oracles/expectations/lifecycle/contractMigrationMap.ts
src/oracles/expectations/lifecycle/contractSchemaValidation.ts
src/oracles/expectations/lifecycle/semanticVocabulary.ts
src/oracles/expectations/lifecycle/sourceContractMovement.ts
src/oracles/expectations/validator.ts
src/oracles/semantic/cluster.ts
src/oracles/semantic/receipts.ts
tests/unit/phase15CampaignIntegratedProof.test.ts
tests/unit/phase15pAdversarialCorpus.test.ts
tests/unit/phase15pArtifactValidation.test.ts
tests/unit/phase15pCandidateLifecycleGates.test.ts
tests/unit/phase15pCheckpointDrift.test.ts
tests/unit/phase15pCompatConvergence.test.ts
tests/unit/phase15pContractLifecycle.test.ts
tests/unit/phase15pCurrentnessDrift.test.ts
tests/unit/phase15pLocalReadiness.test.ts
tests/unit/phase15pMinimalityTruth.test.ts
tests/unit/phase15pPrivacyAuthority.test.ts
tests/unit/phase15pProjectSnapshot.test.ts
tests/unit/phase15pReleaseRehearsal.test.ts
tests/unit/phase15pReplayBinding.test.ts
tests/unit/phase15pSchemaCoherence.test.ts
tests/unit/phase15pSemanticVocabulary.test.ts
tests/unit/phase15pTriageDossierPipeline.test.ts
```

## New/changed schemas and versions

New version constants (all additive; zero historical constants changed):
- `nightwatch.contract-lifecycle-model.v1` (A01)
- `nightwatch.semantic-result-vocabulary.v1` (A02)
- `nightwatch.source-contract-movement.v1` (A03)
- `nightwatch.historical-reader-table.v1` (A04)
- `nightwatch.local-readiness.v1` (A10)
- `nightwatch.artifact-validation.private.v1` (A11)
- `nightwatch.project-snapshot.v1` (A12)
- `nightwatch.phase15p.adversarial-corpus.v1` (A14 corpus)

Changed existing surfaces (behavioral, all verified compat-green):
- `validateReplayPlanV2` success branch gained `plan: ValidatedReplayPlanV2`
  (additive field; all callers source-compatible).
- `CANDIDATE_LIFECYCLE_EVENTS` gained `GATE_BLOCK` (states/version unchanged).
- `checkpoint.ts` lifecycle reason-code validation tightened (bounded length +
  sentinel screen; same error code).
- `package.json` gained one script: `status:local`.
- Deleted exports: `safetyVectorIsZero` (minimizer),
  `parseSemanticTriageEvidence` (semanticTriageEvidence) — proven zero
  callers; private helpers retained.
- Marked compatibility-only (@deprecated, byte-identical delegates):
  `stableLifecycleJson`, `stablePromotionResultJson`.

## Lifecycle/state changes

Candidate lifecycle: GATE_BLOCK event (5 new legal edges from
OBSERVED/ADMITTED/REPRODUCED/MINIMIZED/UNCHANGED → UNRESOLVED, reason-code
required); orchestrator closes gate-stopped/finalized-open records to
terminals on every non-resumable stop (resumable interruptions excluded);
reject loop skips already-terminal records. Campaign unresolved ledger is
set-idempotent everywhere.

## Compatibility decisions

- Zero changes to historical shape/deep expectation IDs, recipe schema
  v1/v2, derivation versions, MECHANICAL_ANALYZER_VERSION, archived v1
  recipes, v1 dossier ledger entries, protocol-only dossier path.
- All unified-vocabulary adapters remain total over today's unions; unknown
  members fail closed at runtime (new members require adapter+matrix updates).
- Retained legacy surfaces: checkpoint-inlined CANDIDATE_LIFECYCLE_STATES/
  VARIANTS copies (byte-identical, drift-guarded by convergence suite);
  private canonical() serializer copies in replayPlan/semanticCampaignBundle
  (digest-feeding, not export-surface duplication); documented intermediate
  brief shapes in triage/types.ts.

## Synthetic corpus totals

- `corpus/phase15p/**`: 3 fixture/catalog modules (597 lines) feeding a
  78-scenario-class adversarial matrix (SC-01..SC-78 across 11 domains),
  each executed 4× per full run (1 domain pass + 3 determinism repeats).
- Rehearsal: 10 end-to-end variants over the real orchestrator/modules with
  synthetic executors; full-rehearsal determinism ×3 deep-equal sanitized
  outputs including persisted artifact bytes.

## Focused/wave test raw counts (actually run)

Sub-agent isolated-worktree runs (pre-integration): A01 14+92; A02 24+163;
A03 30+77; A04 30+155; A05 23+122; A06 41+143; A07 17+51; A08 20+167;
A09 17+44; A10 21+32; A11 23+35; A12 28+41; A13 23+169; A14 13+142;
A15 13+422; A16 4+101 — all passed, 0 failed.

Canonical post-integration runs (workers=1):
- Wave 1 (foundation): typecheck PASS; focused foundation suites 190 passed.
- Wave 2 (campaign runtime): typecheck PASS; focused suites 212 passed;
  campaign:synthetic 27 passed.
- Wave 3 (triage/operational): typecheck PASS; focused suites 221 passed.
- Wave 4 (convergence): typecheck PASS; hardening:check PASS; all phase15p
  suites 337 passed; campaign:synthetic 27 passed.
- Final pack at `42c5a7e…`: typecheck PASS; hardening:check PASS;
  campaign:synthetic 27 passed; test:owner-provenance 91 passed;
  agent:check PASS; project:check PASS (activeTaskContinuity PASS,
  checkoutClean true); git diff --check PASS; all 16 phase15p suites and the
  Phase 9–14 compatibility sweep counts recorded in STATE.md Validation
  Ledger; release-candidate rehearsal run 3× standalone — 4 passed each run.

## Quality floors (all zero)

determinismMismatchCount = 0 (adversarial matrix ×3 byte-equal; rehearsal ×3
deep-equal; T4-style repeat proofs throughout)
privacyLeakCount = 0 (sentinel sweeps over produced strings in adversarial
matrix + rehearsal + privacy-authority suite)
falseCurrentCount = 0 · falseAdmissionCount = 0 ·
falseMinimalityCertificationCount = 0 (A07 soundness fix + adversarial pins)
versionDriftExecutorEscapeCount = 0 (drift matrices assert zero executor
callbacks; SC-63 positive control proves the counter works)
ownerPolicyEscapeCount = 0 (owner-scope marker drift escalates to
BLOCKED_AUTHORITY; OwnerPolicyBlockedError path pinned)

## Known residual risks for the hardening campaign

1. Same-named exports `validateUnifiedContractResultDto` in semanticVocabulary
   (void) vs contractSchemaValidation (DTO-returning) — latent confusion
   hazard; rename under a dedicated compat task (public-surface change).
2. checkpoint.ts still re-inlines CANDIDATE_LIFECYCLE_STATES/VARIANTS instead
   of importing from candidateLifecycle.ts (byte-identical today; guarded by
   convergence suite; import-cycle caution per A15 note in campaign/types.ts).
3. `LocalReadinessCurrentness` lacks an UNKNOWN member that
   ConvergedSourceCurrentness has; mapping is caller-chosen today.
4. A01 lifecycle-model mirrors lockstep against registry unions — new family
   kinds require deliberate mirror updates (fail-closed by design).
5. Executor-side fabrication remains undetectable at minimizer layer by design
   (executor is sole outcome authority); attestation would be a new layer.
6. A14 exact-count pins (e.g., SC-63 preflight 10 / execute 9) will fail
   loudly on upstream selection changes — intentional tripwires.
7. Mixed-survivor minimization cell now truthfully demotes to
   MINIMALITY_NOT_PROVEN — consumers assuming 1-MINIMAL there must re-read
   evidence classes.
8. CI truth remains externally billing-blocked (below); local green is the
   only acceptance evidence until Actions executes for live HEAD.

## Tests deliberately NOT_RUN / DEFERRED_TO_INTEGRATED_HARDENING

Complete canonical Playwright workers=1; topology-correct isolated complete
Playwright workers=1; exhaustive Phase 1–14 compatibility beyond the recorded
sweeps; repository-wide adversarial fuzz beyond the 78-class matrix; complete
historical migration matrix; exhaustive static/dead-code audit outside the
touched cone; final CI-equivalent reproduction; the integrated hardening
campaign itself. All recorded NOT_RUN / DEFERRED_TO_INTEGRATED_HARDENING —
never marked PASS.

## GitHub Actions truth

FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_LIVE_HEAD. Every push during this
campaign was inspected once (no retries): runs for `08890e6` (`32443865543`)
and `c32fbea` (`32455721170`) both FAILED in ~2s with ZERO steps executed —
annotation: "The job was not started because recent account payments have
failed or your spending limit needs to be increased." Identical signature to
the pre-existing block recorded throughout Phases 14–15. No code regression
is exposed or claimable; local/source evidence is the only acceptance until
billing restoration. Later pushes carry the same known condition; do not
loop retries.

## Recommended FINAL integrated hardening order

1. Restore billing / verify Actions executes for live HEAD; re-baseline
   FINAL_CI_AUTHORITY on a real green/red run before anything else.
2. Complete canonical Playwright workers=1 (full repository suite).
3. Topology-correct isolated complete Playwright workers=1.
4. Exhaustive Phase 9–14 compatibility matrices (full historical sweep incl.
   phase10*/phase11*/phase12*/phase13*/phase14* suites not in the recorded
   sweeps, plus Phase 1–8 suites untouched this campaign).
5. Adversarial escalation: extend the 78-class matrix with fuzzed inputs
   (property-based) over validateArtifact/readiness/snapshot/vocabulary.
6. Historical migration matrix replay (archived recipes, v1 dossiers,
   pre-S2 runtime contracts) against the tightened validators.
7. Static/dead-code audit extended beyond the touched cone (A15 scope was
   cone-limited by design).
8. Privacy/authority external review of the new facades (readiness repo
   adapter, artifact facade, snapshot builder) + secret-pattern scan.
9. npm run agent:audit --audit-history full inventory review; project:check
   catalog integrity re-verification.
10. Fresh-source canaries only under their own separate owner authorizations
    (Phase 9B-R1/10B patterns); NOT implied by this handoff.
