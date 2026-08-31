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

Status: IN_PROGRESS

- Validate clean main/origin parity and current gates.
- Read the completed soak REPORT/STATE and owning campaign budget code.
- Build a deterministic local regression reproducing:
  three required journey contexts -> fresh admitted candidate -> reproduction
  queue -> reservation refused with BUDGET_EXHAUSTED before replay executor.
- Prove the failure is budget allocation, not DVR-011 admission, replay
  identity, auth, capture, or product classification.

## M1 — Design bounded replay reservation semantics

Status: NOT_STARTED

Evaluate the smallest safe design. Acceptable directions include a dedicated
reproduction reserve, collection/reproduction sub-budgets, or deterministic
budget transfer/reallocation. Do not blindly raise limits.

Required invariants:

- bounded total execution remains explicit;
- at most the authorized replay count can execute;
- no candidate means no reproduction contact;
- stale/historical candidates cannot consume replay budget;
- incomplete capture cannot consume product-replay authority;
- collection work cannot silently steal protected replay reserve if reserve is
  required by the chosen design;
- reproduction cannot steal unrelated API/exploration budget without an
  explicit deterministic rule;
- checkpoint/resume preserves exact budget state;
- source/version drift invalidates stale prepared work;
- interruption cannot double-spend budget;
- duplicate candidate/cluster identities cannot multiply replay authority;
- all budget decisions are deterministic and sanitized.

## M2 — Implement + adversarial validation

Status: NOT_STARTED

Implement the owning budget change with tests for:

- pre-fix starvation reproducer;
- one eligible candidate obtains one replay reservation;
- zero-candidate campaign uses no replay reserve;
- multiple candidates cannot exceed cap;
- duplicate identities do not multiply reserve;
- resume after interruption cannot double spend;
- stale manifest/source drift fails before replay;
- auth/capture/framework failures do not become replayable;
- exhausted total budget remains fail closed;
- minimization/dossier only follow successful admitted reproduction.

Run focused campaign/replay/checkpoint tests, typecheck, hardening, semantic
compatibility, owner provenance, synthetic campaign, gate:local, and gate:clean.

## M3 — Fresh guarded DEV confirmation

Status: NOT_STARTED

After owner-managed auth/readiness validation, prepare a fresh current-source
campaign. Do not reuse soak checkpoints or historical candidates.

Run only enough real DEV work to obtain a fresh DVR-011-admitted candidate and
exercise the new bounded replay reservation. Prefer the stable account
malformed-json path only if it reappears naturally under current evidence.

Maximum real confirmation target:

- up to 3 fresh campaign attempts;
- up to 3 attack replay executions total;
- at most 1 minimization/dossier chain required for success.

Every attempt remains independent evidence; retries do not erase failures.

## M4 — Candidate -> replay -> dossier closure

Status: NOT_STARTED

If a fresh candidate is admitted:

- prove the replay reservation came from the new bounded budget semantics;
- execute replay;
- classify reproduced / product-state drift / precondition divergence /
  auth/environment divergence / framework capture / invalid replay;
- if reproduced, run bounded minimization;
- produce a sanitized dossier if existing readiness rules permit;
- verify fingerprint, cluster, replay-plan, minimization, and dossier identity.

If no fresh candidate appears within the authorized sample, close as
REPLAY_BUDGET_FIXED_DEV_CONFIRMATION_STARVED rather than weakening admission.

## M5 — Final certification

Status: NOT_STARTED

Run final focused/full gates, clean Node20 validation, canonical/isolated
parity when runtime behavior changed materially, single exact-head CI
inspection, continuity/project reconciliation, clean Git push, and terminal
report.

## Validation Strategy

Use the focused campaign test for the old boundary and new reservation
accounting first. Then run the repository quality cone, semantic and owner
provenance checks, synthetic campaign, local gate, clean Node20 gate, and one
exact-head CI inspection. Real DEV confirmation remains guarded and bounded.

## Decision Log

- 2026-09-01 — Reproduce the starvation before production budget changes.
  Evidence: three journey reservations leave `journeyContexts` at `3/3`, and
  the current estimate requires one additional journey context. Consequence:
  the regression is committed before the reservation redesign.

## Discoveries

- The current real profile reserves browser capacity by `maxTotalBrowserContexts`
  but does not reserve a separate `journeyContexts` slot for reproduction.
- The active continuity documents initially lacked required v2 headings, so the
  baseline handoff gate failed before executable campaign work.

## Deferred Work

- Guarded DEV confirmation and candidate-to-dossier closure remain pending until
  the local reservation implementation and clean gates pass.
- External CI remains non-evidence unless an exact-head job executes steps.

## Completion Criteria

The task is complete only when the bounded replay model and adversarial tests
pass, local and clean Node20 gates pass, DEV confirmation is truthfully closed,
continuity/OpenSpec/project truth is terminal, privacy and safety remain clean,
and `main` is clean and equal to `origin/main`.
