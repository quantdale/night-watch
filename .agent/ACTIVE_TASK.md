# Active Task

Task ID: phase-25-real-source-surface-discovery
Phase: 25-REAL-SOURCE-SURFACE-DISCOVERY
Title: Nightwatch Phase 25 — Real-Source Surface Discovery, Boundary Hardening, Contract Graph Extraction, and Review Intelligence
Status: IN_PROGRESS
Task directory: .agent/tasks/phase-25-real-source-surface-discovery
Starting SHA: 7beb18689cf2cd50d1d5383b34f51c2789cd0a54
Last validated implementation SHA: ac093ff3d8a8cdc117ad815c9c72253eaddfe6c4
Last checkpoint: M1 — source-boundary and Git-currentness hardening
Current milestone: M2 — versioned scan configuration and deterministic bounded inventory.
Next action: Implement the fixed scan contract, content-aware bounded inventory,
deterministic ordering, and source-budget counters.
Authorization class: PHASE_25_REAL_SOURCE_SURFACE_DISCOVERY_LOCAL_SOURCE_SYNTHETIC_ONLY
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 7beb18689cf2cd50d1d5383b34f51c2789cd0a54
LAST_VALIDATED_IMPLEMENTATION_SHA: ac093ff3d8a8cdc117ad815c9c72253eaddfe6c4
LAST_SUBSTANTIVE_CHECKPOINT_SHA: ac093ff3d8a8cdc117ad815c9c72253eaddfe6c4
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_LIVE_HEAD

## Terminal Boundary Tokens

```text
PHASE_25_STATUS: IN_PROGRESS
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

## Resume Recipe

Read the Phase 25 `STATE.md`, inspect Git status/diff, run the smallest
focused validation, and continue its exact next action. Do not restart prior
milestones or modify historical Phase 19–24 records.
