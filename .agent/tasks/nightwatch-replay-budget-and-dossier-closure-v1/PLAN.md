# Nightwatch Replay Budget and Dossier Closure — Plan

Task ID: nightwatch-replay-budget-and-dossier-closure-v1
Phase: REPLAY_BUDGET_DOSSIER_CLOSURE_V1
Status: BLOCKED
Starting SHA: 4834e4da1ec40fbad9736f0a12d1d8f610cb622d
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Purpose

Remove the proven bounded replay-budget starvation while preserving strict
candidate admission, finite contact authority, checkpoint identity, privacy,
and containment.

## Starting State

This task starts from `4834e4da1ec40fbad9736f0a12d1d8f610cb622d` on `main`.
The completed predecessor proved eight fresh product candidates but zero replay
executions because three collection journeys consumed `journeyContexts=3/3`.
The owning path is `CampaignBudgetManager` plus the Phase 7 orchestrator's
`reserveReproductionBudget` boundary.

## Scope

Reproduce the pre-fix starvation locally, implement the smallest explicit
collection/reproduction reservation model, adversarially validate it, and run
the bounded local and guarded DEV confirmation lifecycle.

## Non-Goals

No production/NEXT contact, product mutation, datastore or infrastructure
operation, sibling-repository write, publication, credential persistence,
historical replay, DVR-011 weakening, or unbounded retry.

## Safety Constraints

All source and fixtures remain read-only against Alphaus repositories. Replay
authority must remain finite, current-source, DVR-011-admitted, privacy-safe,
and fail-closed across stale state, interruption, duplicate identity, and
executor failure.

## Architecture / Approach

Keep collection and reproduction accounting in the owning campaign budget
boundary. Reserve replay capacity explicitly and atomically before replay
executor entry; persist the reservation with checkpoint state; reject stale,
incomplete, unsafe, duplicate, or already-spent authority without callbacks.

## Milestones

## M0 — Reconstruct and reproduce budget starvation

Status: COMPLETE

- Main/origin topology was reconciled; no non-main branch or open PR required
  integration.
- The predecessor REPORT/STATE and current budget/orchestrator ownership were
  inspected.
- A deterministic local regression proves three required journey contexts,
  one current-source product candidate, one cluster, and a reproduction
  estimate requiring one additional journey context produce
  `BUDGET_EXHAUSTED` before replay executor entry.
- Candidate retention, clean preflight/execution, current source identity,
  zero safety/privacy, and one-cluster queueing distinguish budget allocation
  from admission, identity, auth, capture, drift, or framework failure.
- Focused test and typecheck passed; the regression was pushed as checkpoint
  `9b7e3ad661bab91065a8674b6bfd5d0536f3495a`.
## M1 — Design bounded replay reservation semantics

Status: COMPLETE

Chosen design: a durable campaign-level replay reservation ledger at the
`CampaignBudgetManager`/orchestrator boundary. No policy limit is raised and
no retry bypass is added.

- For real-scale profiles, `maxPromotedClusters=1` is the explicit finite
  browser-replay reserve. Collection browser work is capped at
  `maxTotalBrowserContexts - maxPromotedClusters`; the protected slot remains
  available for an eligible browser replay. Synthetic fixture profiles retain
  their existing collection accounting because they do not contact DEV.
- Replay reservation requirements are normalized atomically as
  `replays=1`, estimated API/actions, and the maximum of aggregate/category
  browser-context estimates. Replay does not spend collection
  `journeyContexts` or `explorationContexts`; this prevents the reproduced
  DVR-011 path from depending on a full collection subtype counter.
- A checkpoint-persisted reservation record is keyed by campaign/cluster
  identity and stores normalized requirements plus `RESERVED`/`CONSUMED` state.
  Reusing a reserved record on resume is idempotent; a consumed
  `REPLAY_REQUIRED` record is never re-entered.
- Real replay eligibility is checked before reservation: current non-unknown
  source freshness, manifest changeset binding, non-reproduced product
  observation, and no auth/capture/framework/environment/known-defect
  evidence. Duplicate cluster identity reuses the existing reservation.

Required invariants:

- bounded total execution and authorized replay cap remain explicit;
- zero candidates cause zero replay contact;
- stale, historical, incomplete, unsafe, duplicate, and exhausted work fails
  closed before the replay callback;
- collection cannot steal the protected real-profile browser slot;
- checkpoint/resume preserves exact usage and prevents double spend/duplicate
  entry;
- minimization/dossier work remains downstream of successful admitted replay.

## M2 — Implement + adversarial validation

Status: COMPLETE

Implemented at pushed checkpoint
`6b13744bb0fa19047d681eaaf9aae9eb60b5a3c4`:

- normalized replay requirements and persisted `RESERVED`/`CONSUMED`
  campaign/cluster reservations;
- protected real-scale browser capacity with collection-only accounting;
- strict checkpoint validation for replay identity, requirements, queue state,
  duplicate clusters, and dossier relationships;
- fresh/current-source/authenticated/product eligibility before reservation;
- idempotent checkpoint-boundary resume, post-entry interruption consumption,
  and no re-entry for spent replay authority;
- deterministic regressions for the starvation reproducer, eligible/zero/
  multi-candidate cases, duplicate/source drift/rejection, exhaustion,
  downstream dossier closure, interruption/resume, and JSON accounting.

Validation passed: focused campaign/checkpoint cone 92/92, typecheck,
hardening, handoff, project, semantic compatibility, owner provenance, and
synthetic campaign.

## M3 — Fresh guarded DEV confirmation

Status: BLOCKED

Owner-managed DEV authentication is not currently page-valid. The designated
external state file passed regular-file/mode checks but a no-refresh
prepare-only validation failed with `AUTH_NETWORK_FAILURE`; one guarded refresh
attempt failed with `AUTH_STATE_REPLACEMENT_FAILED`. No fresh Phase 7 campaign
manifest was emitted and no product campaign work started.

Unblock only after the owner refreshes that external state and confirms
page-readable validity for the configured DEV target. Do not reuse the failed
state, predecessor soak, historical candidates, or stale manifests.

The intended bounded confirmation remains:

- up to 3 fresh campaign attempts;
- up to 3 attack replay executions total;
- at most 1 minimization/dossier chain required for success.

No attempt may exceed those caps, and the caps are limits rather than targets.

## M4 — Candidate -> replay -> dossier closure

Status: BLOCKED

No fresh candidate was available because M3 stopped at owner-auth readiness.
Candidate admission, replay, minimization, and dossier work were not entered.
When the unblock condition is met, use only a fresh current-source candidate
and retain the existing downstream-only-on-`REPRODUCED` rule.

## M5 — Final certification

Status: BLOCKED

Final local and clean Node20 certification passed. Exact-head CI is external
zero-step non-evidence. Terminal project/continuity truth records this task as
blocked before DEV rather than claiming an operational or CI completion.

## Validation Strategy

Use the focused campaign test for the old boundary and new reservation
accounting first. Then run the repository quality cone, semantic and owner
provenance checks, synthetic campaign, local gate, clean Node20 gate, and one
exact-head CI inspection. Real DEV confirmation remains guarded and bounded;
an auth-readiness block is terminal evidence, not a reason to retry.

## Decision Log

- 2026-09-01 — Reproduce the starvation before production budget changes.
  Evidence: three journey reservations leave `journeyContexts` at `3/3`, and
  the current estimate requires one additional journey context. Consequence:
  the regression is committed before the reservation redesign.
- 2026-08-31 — Keep DEV auth refresh bounded to one guarded attempt after the
  designated state failed page readability. The attempt ended with
  `AUTH_STATE_REPLACEMENT_FAILED`; no alternate credential or retry is allowed.

## Discoveries

- The current real-scale profile reserves browser capacity by
  `maxPromotedClusters`; collection now stops one browser context early while
  the replay path consumes the protected slot without journey/exploration
  subtype spend.
- Checkpoint validation must allow a consumed reservation to coexist with a
  READY dossier during resume, while rejecting every other orphaned or
  mismatched reservation.
- A pre-entry checkpoint interruption is resumable exactly once; a
  post-entry interruption consumes the reservation and records
  `REPLAY_EXECUTION_ALREADY_STARTED` on resume.
- The source-window and candidate freshness gates reject drift before budget
  reservation, preserving the original admission/identity boundary.

## Deferred Work

- Guarded DEV confirmation and candidate-to-dossier closure are terminally
  blocked at owner-only target/auth preflight; no credential or raw evidence
  may enter this repository.
- External CI remains non-evidence because the exact-head job executed zero
  steps.
- Local/clean validation, continuity/project reconciliation, privacy audit,
  and final diff inspection are complete; remote parity is the only closure
  action remaining.

## Completion Criteria

The task is complete only when the bounded replay model and adversarial tests
pass, local and clean Node20 gates pass, DEV confirmation is truthfully closed,
continuity/OpenSpec/project truth is terminal, privacy and safety remain clean,
and `main` is clean and equal to `origin/main`.
