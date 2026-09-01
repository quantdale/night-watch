# Nightwatch Replay Budget and Dossier Closure — Plan

Task ID: nightwatch-replay-budget-and-dossier-closure-v1
Phase: REPLAY_BUDGET_DOSSIER_CLOSURE_V1
Status: IN_PROGRESS
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

## M3 — Fresh guarded DEV confirmation — COMPLETE

Status: COMPLETE

The owner completed one guarded headed capture for the designated external DEV
state. Post-login verification, atomic state/provenance writes, structural
validation, and cleanup passed. Secret values and storage-state contents were
not printed or copied.

The normal no-refresh prepare-only path then passed:

`NIGHTWATCH_PHASE_7_AUTH_REFRESH=0 npm run campaign:real -- --env=dev --prepare-only`

It created fresh current-source campaign
`campaign:sha256:37aca1e950ab804e3a6fd592` with manifest fingerprint
`manifest:sha256:41cdedac2beff0d59125ee1a`, frozen to implementation source
`6b13744bb0fa19047d681eaaf9aae9eb60b5a3c4`, five selected read-only work
items, `checkpointOrdinal=0`, and `productExecution=NOT_STARTED`.

The single bounded resume then passed:

`NIGHTWATCH_PHASE_7_AUTH_REFRESH=0 npm run campaign:real -- --env=dev --resume-campaign=campaign:sha256:37aca1e950ab804e3a6fd592`

It completed all five selected work items with `COMPLETE_CLEAN`, zero safety
counters, and privacy `PASS`. No retry, alternate credential, predecessor
checkpoint, historical candidate, or stale manifest was used.

## M4 — Candidate -> replay -> dossier closure — COMPLETE

Status: COMPLETE

The fresh campaign produced two protocol-only anomaly candidate observations
and two clusters. Both candidates were rejected before candidate replay with
`REPLAY_SOURCE_FRESHNESS_UNCONFIRMED`; neither entered the DVR-011 replay
admission boundary. The reproduction queue and persisted candidate
replay-reservation ledger were empty, so attack replay executor entry was zero.

Minimization and dossier work remained correctly downstream of successful
admitted replay: both counts were zero and no product finding or dossier is
claimed. The two source-bound API work items each completed their ordinary
first-plus-fresh replay pair, consuming two aggregate replay units; those API
replays are not candidate attack replay. This is the truthful bounded
`REPLAY_BUDGET_FIXED_DEV_CONFIRMATION_STARVED` outcome, not a reason to weaken
DVR-011 or manufacture a candidate.

## M5 — Final certification — IN_PROGRESS

Status: IN_PROGRESS

The fresh DEV confirmation is terminally classified as
`REPLAY_BUDGET_FIXED_DEV_CONFIRMATION_STARVED`. Final continuity, project
truth, privacy, local-quality, clean-Node20, diff, and remote-parity checks
remain the exact next closure action.

## Validation Strategy

Use the focused campaign/checkpoint validation already passed at the
implementation checkpoint, then run the repository continuity, handoff,
project, hardening, privacy, local, and clean Node20 gates after this
documentation update. The guarded DEV confirmation used one fresh
prepare/resume pair after a successful owner-led auth capture. No retry,
alternate credential, historical candidate, stale manifest, production/NEXT
contact, mutation, datastore, infrastructure, or publication operation is
authorized.

## Decision Log

- 2026-09-01 — Reproduce the starvation before production budget changes.
  Evidence: three journey reservations leave `journeyContexts` at `3/3`, and
  the current estimate requires one additional journey context. Consequence:
  the regression is committed before the reservation redesign.
- 2026-08-31 — Keep DEV auth refresh bounded to one guarded attempt after the
  designated state failed page readability. The attempt ended with
  `AUTH_STATE_REPLACEMENT_FAILED`; no alternate credential or retry was allowed.
- 2026-09-01 — Revalidate the owner-refreshed designated DEV state through the
  normal no-refresh Phase 7 prepare-only path. The path failed closed with
  `AUTH_NETWORK_FAILURE`; sanitized state diagnostics showed the required token
  present but unexpired and page-readable both false. This historical failure
  was superseded by the later owner-led headed capture.
- 2026-09-01 — The owner completed the guarded headed DEV auth capture after
  the prior page-readability failure. Post-login verification, atomic
  state/provenance writes, validation, and cleanup passed without exposing
  secret values.
- 2026-09-01 — One fresh current-source campaign prepared and resumed
  successfully. Two protocol-only anomaly candidates were rejected before
  candidate replay with `REPLAY_SOURCE_FRESHNESS_UNCONFIRMED`; no candidate
  replay, minimization, or dossier chain was entered. The bounded terminal
  classification is `REPLAY_BUDGET_FIXED_DEV_CONFIRMATION_STARVED`.

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
- The real bounded run distinguishes aggregate API replay accounting from
  candidate attack replay: two API fresh replays consumed two aggregate replay
  units, while ineligible browser candidates spent no candidate replay reserve.

## Deferred Work

- No product finding or dossier was produced because no fresh candidate passed
  the existing replay eligibility gate. Do not weaken DVR-011 or manufacture a
  candidate to obtain downstream artifacts.
- The final continuity, project, privacy, local, clean-Node20, diff, and
  remote-parity checks are the next closure action.
- Exact-head Actions remains external non-evidence because its observed job
  executed zero steps; no CI PASS is claimed.

## Completion Criteria

The task is complete only when the bounded replay model and adversarial tests
pass, local and clean Node20 gates pass, DEV confirmation is truthfully closed,
continuity/OpenSpec/project truth is terminal, privacy and safety remain clean,
and `main` is clean and equal to `origin/main`.
