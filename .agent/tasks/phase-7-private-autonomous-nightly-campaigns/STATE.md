# Task State

## Identity

Task ID: `phase-7-private-autonomous-nightly-campaigns`
Phase: `7 — PRIVATE AUTONOMOUS NIGHTLY CAMPAIGNS`
Status: `IN_PROGRESS`
Starting SHA: `4f8263206f82740c47f1b25554269b59d8e03b8d`
Current SHA: `4f8263206f82740c47f1b25554269b59d8e03b8d`
Last validated implementation SHA: `4f8263206f82740c47f1b25554269b59d8e03b8d`
Branch: `main`
Last checkpoint: task creation before implementation.

## CURRENT_GOAL

Build a deterministic private/local campaign orchestrator that safely selects,
runs, clusters, reproduces, minimizes, triages, checkpoints, resumes, and
summarizes existing Nightwatch work without infrastructure/data access.

## CURRENT_PHASE

M1 — campaign contracts, manifest, budget, and deterministic work identity.

## OWNER_SCOPE_POLICY

`FROZEN_BY_OWNER`; reason `INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE`.
Phase 6 real datastore budget: maximum 6, used 0. L4 is
`OUT_OF_SCOPE_BY_OWNER`. No GCP/GKE/Kubernetes/AWS infrastructure/database/
deployment/external-publication work may execute or be requested.

## CAMPAIGN_SCHEMA_VERSION

`nightwatch.campaign.private.v1`

## ORCHESTRATOR_VERSION

`nightwatch.orchestrator.private.v1` (implementation pending).

## CAMPAIGN_ID

Not created yet; derived from the frozen manifest, never timestamp-only.

## CAMPAIGN_MODE

Not created yet. Frozen modes: `CHANGE_DIRECTED`, `BASELINE_HEALTH`,
`COVERAGE_EXPANSION`, `REPRODUCTION_ONLY`, `LOCAL_SYNTHETIC`.

## SOURCE_SNAPSHOTS

Not captured for Phase 7 yet. Relevant Alphaus source snapshots must remain
read-only and include branch/HEAD/tracking/ahead-behind/dirty/freshness.

## SELECTION_RESULT

Not created yet. Must reuse Phase 3 and preserve positive/negative reasons.

## SELECTED_JOURNEYS / SELECTED_ENVELOPES / SELECTED_API_SCENARIOS

Not created yet. Explicit lineage only; no API-only expansion in the initial
real profile.

## SEED_LEDGER

Not created yet. Seeds are deterministic, versioned, and timestamp-independent.

## BUDGET_POLICY / BUDGET_USED / BUDGET_REMAINING

Frozen initial real maximums: 6 browser contexts, 3 journey contexts, 3
exploration contexts, 6 API executions, 3 replays, 4 minimization candidates,
24 actions, 15 minutes, 120 seconds/test, 3 promoted clusters, 10 MiB private
evidence. Runtime support may use a larger explicit multi-hour ceiling.

## EXECUTION_LEDGER / ANOMALY_CLUSTERS / REPRODUCTION_QUEUE / MINIMIZATION_QUEUE

Not created yet.

## DOSSIER_LEDGER / MORNING_BRIEF_STATUS

Not created yet. Private real artifacts remain outside Git under owner-only
storage; synthetic fixtures may stay in the repository.

## FILES_CHANGED

Native Phase 7 task files only at task creation. Implementation pending.

## VALIDATION_LEDGER

- Single-writer check: PASS; no other process held Nightwatch files.
- Prior task reconciliation: PASS; reported implementation/checkpoint/final
  clean SHAs exist and current clean HEAD is `4f826320...`.
- Nightwatch remote audit: `NO_REMOTE`.
- Phase 6 freeze: reconciled and preserved.
- Implementation validation: pending.

## BUG_CANDIDATES

None.

## REJECTED_HYPOTHESES

- An empty committed source window must not be turned into fabricated change.
- Dirty Alphaus worktrees are not deployment proof.
- Source relevance is not causal attribution.
- A clean DEV campaign is not a failure of Phase 7.

## UNRESOLVED

No natural DEV anomaly is currently available for minimization; this is not a
reason to manufacture one. Real auth/DEV availability will be evaluated only
by the frozen bounded campaign gate.

## SAFETY_EVENTS

No Phase 7 execution yet. Required successful vector remains zero production,
proxy, unknown destination/approval, product mutation, action-caused UNKNOWN,
database, infrastructure, and external-publication activity.

## PRIVACY_STATUS

PASS for task creation; no credentials, auth state, customer values, bodies,
DOM, screenshots, traces, or private real evidence written.

## LAST_VERIFIED_IMPLEMENTATION_SHA

`4f8263206f82740c47f1b25554269b59d8e03b8d`

## LAST_CHECKPOINT_SHA

`4f8263206f82740c47f1b25554269b59d8e03b8d`

## NEXT_EXACT_ACTION

Implement M1 campaign contracts, canonical manifest identity, budget manager,
and deterministic work-item ordering; then run focused unit tests before M2.

## RESUME_RECIPE

Read Nightwatch `AGENTS.md`, `docs/CURRENT_STATE.md`, this task's SPEC/PLAN/
STATE, inspect `git status --short`, then continue at `NEXT_EXACT_ACTION`.
Keep Phase 6 frozen and modify only Nightwatch.

## CHECKPOINT_SEMANTICS

Logical manifest/checkpoint/finalization operations are
`EXACTLY_ONCE_LOGICAL`; browser/API execution is `AT_LEAST_ONCE_SAFE`, and an
interrupted `RUNNING` item is `REPLAY_REQUIRED` on resume. Completed items are
never rerun when proven by the durable ledger.
