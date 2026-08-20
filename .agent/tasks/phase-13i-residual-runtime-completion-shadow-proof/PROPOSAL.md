# PROPOSAL — Nightwatch Phase 13I — Residual Runtime Completion & Integrated Shadow Proof

Task ID: `phase-13i-residual-runtime-completion-shadow-proof`
Phase: `13I-RESIDUAL-RUNTIME-COMPLETION-SHADOW-PROOF`
Status at publication: `NONE` — designed, not started, not authorized.
Starting source anchor: `a7abfee678bc752f705cf910e98fa1f114042e74`.

## Why this task exists

Phase 13H correctly stopped BLOCKED instead of self-certifying completion. Its local fixes closed bundle coherence, stale-receipt fixture truth, continuity headings, and introduced a pure replay-binding core, while preserving full local regressions. Current source still proves four local gaps that must be closed before any contained DEV acceptance:

1. `CampaignOrchestrator` still routes every candidate through protocol `clusterAnomalies()` and the historical `triageAnomaly()` / dossier-v1 path. Semantic candidates do not yet use semantic contract identity, semantic triage evidence, categorical semantic confidence, and dossier-v2 readiness end-to-end.
2. `replayBinding.ts` correctly separates validation from executor outcomes, but the real Phase-7 adapter still contains replay helpers that can synthesize `FAILURE` after structural checks. V2 occurrence identity is therefore not yet the actual real-adapter control path.
3. `corpus/phase13/**` and an integrated synthetic shadow campaign do not yet exist, so no permanent deterministic end-to-end proof covers semantic promotion, occurrence replay, protocol compatibility, drift, privacy, and READY/non-READY truth together.
4. Manifest/checkpoint/dossier-ledger version drift has not been exhaustively proven to stop before executors or silently reinterpret historical evidence.

There is also a continuity hygiene issue: the terminal Phase 13H Recovery text names the implementation SHA as if it were live HEAD even though the docs closure advanced main. The new task must preserve the implementation anchor but use Git as live-head authority.

## Selected architecture

`SEMANTIC_AWARE_CAMPAIGN_PROMOTION_WITH_OCCURRENCE_BOUND_REPLAY`

The campaign remains dual-path:

- protocol-only candidate → historical protocol clustering + dossier v1 compatibility;
- semantic candidate with validated source-bound semantic control evidence → semantic contract clustering → exact replay/minimization → strict SemanticTriageEvidence → rankSemanticConfidence → BugDossierV2 readiness.

Replay planning and replay execution remain separate. Structural validation never certifies reproduction. The real adapter must construct/validate a `TriageReplayPlanV2` and delegate to an injected executor callback; only the executor's exact-fingerprint outcome may reproduce.

## Authority model

Publishing this package does not authorize implementation.

Implementation begins only when the owner supplies:

`PHASE_13I_RESIDUAL_RUNTIME_COMPLETION_LOCAL_ONLY`

This permits Nightwatch local/source/tests/docs/workflow changes needed by this task. It does not permit DEV, NEXT, production, real campaigns, mutations, DB/data-plane, infrastructure/Phase 6, Alphaus writes, new endpoint/target authority, AI/model authority, selfDev/promotion/catalog mutation, or publication. Phase 13B remains NOT_AUTHORIZED.

## Desired terminal state

If every local/source gate is green but GitHub Actions is still blocked before job execution, the truthful terminal state is `BLOCKED_EXTERNAL_CI` with local runtime completion verified. If any local gap remains, use `BLOCKED_RESIDUAL_RUNTIME_GAPS_REMAIN` instead. No Phase 13B execution is part of this task.
