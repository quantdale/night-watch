# Active Task

Task ID: phase-25-real-source-surface-discovery
Phase: 25-REAL-SOURCE-SURFACE-DISCOVERY
Title: Nightwatch Phase 25 — Real-Source Surface Discovery, Boundary Hardening, Contract Graph Extraction, and Review Intelligence
Status: COMPLETE
Task directory: .agent/tasks/phase-25-real-source-surface-discovery
Starting SHA: 7beb18689cf2cd50d1d5383b34f51c2789cd0a54
Last validated implementation SHA: 042300c7c59fd8218afabc761e31691139d0c657
Last checkpoint: M14 — terminal local/source closure and exact-head Actions
classification.
Current milestone: COMPLETE_LOCAL_SOURCE_EXPANSION — M14 terminal closure.
Next action: STOP — Phase 25 is complete locally/source/synthetically;
`PHASE_25_EXTERNAL_CI` is `NO_STEPS_BILLING_OR_PLATFORM_BLOCK`. Do not retry
Actions, read auth, or invoke DEV from this task.
Authorization class: PHASE_25_REAL_SOURCE_SURFACE_DISCOVERY_LOCAL_SOURCE_SYNTHETIC_ONLY
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 7beb18689cf2cd50d1d5383b34f51c2789cd0a54
LAST_VALIDATED_IMPLEMENTATION_SHA: 042300c7c59fd8218afabc761e31691139d0c657
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 042300c7c59fd8218afabc761e31691139d0c657
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_LIVE_HEAD

## Terminal Boundary Tokens

```text
PHASE_25_STATUS: COMPLETE_LOCAL_SOURCE_EXPANSION
PHASE_25_EXTERNAL_CI: NO_STEPS_BILLING_OR_PLATFORM_BLOCK
PHASE_24_STATUS: COMPLETE_LOCAL_BLOCKED_EXTERNAL_CI (historical, unchanged)
PHASE_23_STATUS: COMPLETE_LOCAL_BLOCKED_EXTERNAL_CI (historical, unchanged)
PHASE_22_STATUS: BLOCKED_BEFORE_DEV (historical, unchanged)
PHASE_21_STATUS: COMPLETE (historical, unchanged)
PHASE_20_STATUS: COMPLETE (historical, unchanged)
PHASE_6_STATUS: FROZEN_BY_OWNER
PHASE_11B_STATUS: NOT_AUTHORIZED
PHASE_13B_STATUS: NOT_AUTHORIZED
```

## Routing

Phase 19 through Phase 24 remain terminal at their existing task directories;
do not reopen or mutate their history. This task is local/source/synthetic
only. No DEV launcher, authentication-state read, product request, database,
cloud/infrastructure operation, Alphaus write, external publication/message,
or CI retry is authorized. Live HEAD is discovered from Git.

## Scope boundary

Phase 25 may harden the source boundary, inventory approved bounded source,
reuse existing analyzers, derive safe route/contract/join evidence, bridge
descriptors into Phase 24, and expose local review diagnostics. It may not
grant execution authority or infer deployment/ownership/mutation safety.

## Files Changed

- `.agent/ACTIVE_TASK.md`
- `.agent/tasks/phase-25-real-source-surface-discovery/**`
- `src/core/source/siblingSource.ts`
- `tests/unit/phase25SourceBoundary.test.ts`
- quality-gate and semantic-compatibility registration for Phase 25
- `src/core/source/scan.ts`
- `src/core/source/scanTypes.ts`
- `tests/unit/phase25SourceInventory.test.ts`
- `src/core/source/surfaceTypes.ts`
- `src/core/source/surfaces.ts`
- `src/core/semanticCoverage/sourceAnalyzers.ts`
- `src/core/semanticCoverage/discovery.ts`
- `src/core/semanticCoverage/types.ts`
- `tests/unit/phase25AnalyzerSoundness.test.ts`
- `tests/unit/phase25SurfaceDiscovery.test.ts`
- `tests/unit/phase21Integration.test.ts` (intentional proof-digest migration)
- `src/core/semanticCoverage/graph.ts`
- `src/core/phase24/invalidation.ts`
- `src/core/source/approvedScan.ts`
- `src/core/source/cache.ts`
- `src/core/source/invalidation.ts`
- `src/core/source/review.ts`
- `tests/unit/phase25Adversarial.test.ts`
- `tests/unit/phase25Invalidation.test.ts`
- `tests/unit/phase25Operator.test.ts`
- `tests/unit/phase25SyntheticCampaign.test.ts`

## Resume Recipe

Task complete. Do not resume this task. Any future source-proof expansion
requires a new authorized Phase 26 task; no DEV, auth, external retry, or
infrastructure/data authority carries forward.
