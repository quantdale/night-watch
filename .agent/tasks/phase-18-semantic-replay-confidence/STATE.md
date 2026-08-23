# Task State

## Identity

Task ID: phase-18-semantic-replay-confidence
Phase: 18-SEMANTIC-REPLAY-CONFIDENCE
Status: IN_PROGRESS
Starting SHA: 80212fcb5dc4e8648b174b209636090a17c89c5c
Last validated implementation SHA: e58ea162e601aba2c341f5b5ee18f40a635251af
Last substantive checkpoint SHA: e58ea162e601aba2c341f5b5ee18f40a635251af
Last documentation checkpoint SHA: e58ea162e601aba2c341f5b5ee18f40a635251af
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_LIVE_HEAD
PHASE_18_STATUS: IN_PROGRESS_LOCAL_SOURCE_SYNTHETIC
PHASE_17_STATUS: COMPLETE_LOCAL_BLOCKED_EXTERNAL_CI
PHASE_16CH_STATUS: COMPLETE_LOCAL_BLOCKED_EXTERNAL_CI
PHASE_16D_STATUS: NOT_AUTHORIZED
PHASE_6_STATUS: FROZEN_BY_OWNER
PHASE_11B_STATUS: NOT_AUTHORIZED
PHASE_13B_STATUS: NOT_AUTHORIZED
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
Branch: main
Last checkpoint: M6 — dossier, corpus, parser/privacy, static safety, and canonical validation (e58ea162e601aba2c341f5b5ee18f40a635251af)

## Objective

Execute the authorized local/source/synthetic Phase 18 program: deepen
deterministic business-semantic anomaly detection; carry sanitized evidence
through occurrence-bound replay, actual synthetic minimization, confidence,
clustering, change-aware coverage, and dossier output; preserve all permanent
read-only, privacy, provenance, and authority boundaries.

## Current Milestone

M7 — isolated parity, checkpoint publication, and terminal handoff. The
implementation waves and canonical regression are green in the working tree;
the first durable checkpoint is not yet committed.

## Completed Milestones

- M0 control plane and Gate Zero — authorization, successor task, v2 continuity
  marker, scope boundary, and exact semantic pipeline reconstruction.
- M1 contract/projection/currentness foundations — additive invariant union,
  strict parser/evaluator support, bounded projection serialization, and
  explicit source-currentness classification.
- M2 semantic depth corpus — eight positive/benign synthetic classes covering
  aggregate/detail, cross-step state, pagination, empty-state, lifecycle,
  cross-surface, and HTTP-200 application-envelope behavior.
- M3 replay fidelity — occurrence-bound private V3 receipt, explicit outcome
  taxonomy, strict identity/currentness/safety checks, and V2-compatible
  closure behavior.
- M4 synthetic minimization — actual semantic replay executor tests for noise,
  joint/order/predecessor/repeated-occurrence requirements, and executor
  failure/nondeterminism rejection.
- M5 confidence, clustering, and coverage — finding-identity confidence
  gates, stale degradation, explicit invariant identity, and change-impact ×
  semantic coverage accounting.

## Work In Progress

M6 validation is complete at e58ea162e601aba2c341f5b5ee18f40a635251af:
dossier completeness, hostile-document handling,
privacy boundaries, static pure-core seams, the permanent corpus, the affected
compatibility cone, and the canonical regression are green. M7 is the
topology-correct isolated regression and checkpoint closure.

## Exact Next Action

Run the established topology-correct isolated regression from the validated
e58ea162e601aba2c341f5b5ee18f40a635251af checkpoint, compare its exact
enumeration and skip inventory with canonical, and push only after parity and
the clean-tree gates hold.

## Files Changed

- `.agent/ACTIVE_TASK.md` and the Phase 18 task control-plane records
- bounded semantic expectation/currentness, projection, invariant, oracle, and
  evidence changes under `src/oracles/**`
- occurrence-bound replay fidelity, minimization evidence, confidence, dossier,
  portfolio coverage, and hardening changes under `src/core/**` and `bin/**`
- Phase 18 synthetic fixtures and focused regression tests under `corpus/phase18`
  and `tests/unit/`
- truthful Phase 15 semantic integration expectations for the repaired
  minimization/confidence boundary

## Validation Ledger

- Bootstrap: `git status`, `git fetch origin`, `git pull --ff-only origin main`,
  branch, live HEAD, remote HEAD, and recent log verified at the starting SHA;
  tree was clean before task-record creation.
- Authorization: Phase 18 scope recorded before substantive source mutation.
- Gate Zero: complete from current implementation/tests; no external systems
  contacted.
- Current focused results: typecheck PASS; Phase 18 semantic-depth 22 passed;
  affected semantic/triage cone 143 passed; owner-provenance 91 passed;
  hardening PASS; synthetic campaign 27 passed.
- Canonical regression: 2,285 tests enumerated; 2,281 passed; 4 skipped; 0
  failed. Skips: `tests/unit/phase5Api.test.ts:197`, `:246`, `:280` (source-built
  OOPS binary unavailable) and `tests/unit/selfDevSandboxConfinement.test.ts:147`
  (base owned by another uid). `test-results/.last-run.json` recorded
  `status=passed`, `failedTests=[]`.
- Phase 15 F2/F11/F12 compatibility expectations were repaired to record
  unresolved semantic minimization when the journey executor cannot provide a
  verified reduced replay; no confidence or test gate was weakened.
- `npm run agent:check` passed with the expected legacy warnings before this
  documentation checkpoint; `npm run agent:audit` reported
  `tasks=61 strict_v2=37 legacy_v1=24 strict_errors=0 legacy_warnings=33`.
  `npm run project:check` passed on the clean e58ea162e601aba2c341f5b5ee18f40a635251af tree.
- Isolated parity, final clean-tree checks, checkpoint push, and CI truth remain
  pending.

## Decisions Made During This Task

- Phase 17 remains terminal and historical; Phase 18 is a new task.
- No implementation abstraction will be designed until Gate Zero cites the
  current source/test path and identifies evidence loss or non-load-bearing
  surfaces.
- Existing source/tests/runtime evidence outrank durable documentation.
- Semantic contract extensions remain additive and strict; legacy readers are
  not relabeled as V3 evidence.
- The same semantic finding fingerprint is the load-bearing replay/minimizer
  identity; aggregate cluster/replay counters cannot establish HIGH or
  minimality.
- Replay adapters must emit observed semantic finding and contract identities;
  the orchestrator never fabricates observed identity from the expected value.
  Minimal replay occurrence ordinals are carried alongside legacy action IDs.
- Source currentness is re-evaluated explicitly; stale/ambiguous/missing
  evidence cannot be current HIGH.
- The required task `HANDOFF.md` is an approved continuity/documentation
  descendant; its omission from the checker allowlist was repaired as
  `DEF-18-02`, without widening approval to arbitrary task files.

## Discoveries

The Phase 17 handoff identified the next best target as semantic-oracle depth
with benign controls. Gate Zero reconstruction found the following live path,
and the implementation now closes the principal evidence-loss boundaries:

1. Projection: `projectObservation` in `src/oracles/projections/projector.ts`
   creates a bounded `SemanticProjection`; `serializer.ts` emits its
   canonical digest and `identity.ts` keeps raw-to-opaque mappings transient.
2. Expectation/provenance: `deriveRealSourceExpectation(s)` in
   `src/oracles/expectations/admission.ts` creates source-bound expectations;
   `admitExpectation`/`resolveExpectationFreshness` in `provenance.ts` and
   `resolver.ts` re-check snapshot SHA and evidence digest. Resolver states
   are only `RESOLVED`, `NO_EXPECTATION`, `SOURCE_STALE`, and
   `SOURCE_UNAVAILABLE`; missing/ambiguous/unsupported/synthetic-only are not
   first-class in this path.
3. Oracle evaluation: `evaluateInvariant` in
   `src/oracles/invariants/evaluate.ts` evaluates the declarative vocabulary;
   `evaluateSemanticExpectation` in `src/oracles/semantic/oracle.ts` maps
   violations to safe findings. `runner.ts` owns projection creation and
   `hook.ts` owns the 2xx receipt boundary. Current seeded classes are
   envelope, list/detail identity, stale transition, aggregate relation, and
   cardinality relation.
4. Campaign evidence: `networkObserver.ts` records bounded receipts/findings.
   Candidate-side `CampaignSemanticEvidence` is created/validated by
   `src/core/campaign/campaignSemanticEvidence.ts` and carried through
   `identity.ts`. It preserves contract/provenance, receipt outcome, coverage,
   finding fingerprint, and invariant ID, but drops projection/observation
   details, occurrence identity, predecessor context, and replay taxonomy.
5. Clustering: `recomputeClusters` in `src/core/campaign/orchestrator.ts`
   converts evidence into an invariant stub and calls
   `clusterSemanticObservations` in `src/oracles/semantic/cluster.ts`.
   `semanticContractIdentity` excludes SHA, timestamps, run IDs, and
   occurrence metadata. The orchestrator uses the candidate observation
   fingerprint as cluster fingerprint while evidence separately carries
   `findingFingerprint`; equality is not proven at this boundary.
6. Replay/minimization: `certifiedReplayClosure` maps action IDs to V2
   occurrence ordinals and calls `createTriageReplayPlanV2`/
   `executeReplayPlanV2`. V2 carries ordinals but not action kind, expectation
   identity, predecessor context, or observation fingerprint. `minimizeFailure`
   is occurrence-aware internally, but its public sequences/evaluations are
   action-ID based; `buildMinimalityEvidence` rejects ambiguous repeated
   survivors. The replay envelope taxonomy is only `PASS`, `FAILURE`,
   `INVALID`, `PRECONDITION_DIVERGENCE`, and `NOT_EXECUTED`.
7. Triage/confidence: `triageAnomaly` drives minimization; the orchestrator's
   `buildSemanticDossierV2` constructs semantic v2 evidence. `rankSemanticConfidence`
   and `isReadySemanticDossier` gate currentness, replay, fingerprint,
   safety/privacy, coverage, and minimality. The orchestrator currently sets
   `exactFingerprintMatch` from replay status alone, uses
   `Math.max(1, cluster.reproductionCount)` for fresh replay count, and uses
   total minimizer reproduction count for minimal-sequence evidence.
8. Dossier: `createBugDossierV2`/`validateBugDossierV2` emit the current
   semantic dossier. `toSemanticDossierEvidence` exposes bounded summaries;
   `semanticTriageEvidence` adds currentness/replay/minimality inputs. Replay
   occurrence proof, rejection reasons, exact replay taxonomy, and confidence
   degradation history were not dossier-visible. `parseBugDossierV2` now
   strictly checks the external root/prototype/schema boundary and carries
   bounded semantic category and replay-fidelity evidence.

The decisive test cone is `tests/unit/semanticCampaign.test.ts`,
`oracleInvariant.test.ts`, `semanticReceipt*.test.ts`,
`phase12SemanticTriage.test.ts`, `phase12SemanticCluster.test.ts`,
`phase15CampaignTriageIntegration.test.ts`, `phase15pReplayBinding.test.ts`,
`phase15pTriageDossierPipeline.test.ts`, `phase17EvidenceHardening.test.ts`,
and `phase15pAdversarialCorpus.test.ts`. These prove existing seeded classes,
currentness gates, clustering stability, V2 ordinal binding, minimizer
ambiguity rejection, and privacy guards, but not the deeper Phase 18 classes
or end-to-end semantic minimization.

Phase 18's permanent synthetic corpus exercises eight semantic contract
classes and repeats property/fixture order variants. The synthetic reducer
executes real projection/oracle evaluation, accepts only identical semantic
finding identity, and records bounded rejection reasons. The Phase 17
change-aware portfolio now exposes source-change versus baseline-health
semantic coverage reasons without adding execution authority.

## Blockers

None.

## Safety Events

None.

## Deferred / Follow-Up

Real-environment acceptance, unauthorized runtime surfaces, unsupported
product semantics, infrastructure/data operations, AI authority, promotion,
publication, and any raw-value persistence remain deferred and out of scope.

## Resume Recipe

Read `.agent/ACTIVE_TASK.md`, then this task's `SPEC.md`, `PLAN.md`, and
`STATE.md`; inspect `git status`/diff; continue the exact M7 checkpoint and
isolated-validation action.

## Completion Snapshot

Not complete. Local gates and canonical regression are green in the working
tree; the implementation checkpoint, isolated parity, push, CI truth, and
terminal documentation closure remain.
