# Task State

## Identity

Task ID: phase-2b-three-readonly-ripple-journeys
Phase: 2B
Status: IN_PROGRESS
Starting SHA: ec4c14376923ffbe12356dd180218eb09cf4f75f
Current SHA: a6d7c8ba9237ca0ffb1acd9442b23d21d0abf56c
Last validated implementation SHA: a6d7c8ba9237ca0ffb1acd9442b23d21d0abf56c
Branch: main
Last checkpoint: 2026-08-12 — Phase 2A closure independently reconciled;
Phase 2B frozen SPEC/task waypoint and source-archeology inventory recorded.

## Objective

CURRENT_GOAL: establish the reusable engine and exactly three source-backed,
semantically read-only Ripple journeys with one fresh-context replay each.

## Current Milestone

CURRENT_PHASE: M2 — Three journey contracts and semantic registry. M1
archaeology, inventory, freshness, and preliminary selection are complete;
durable contracts are next.

## Completed Milestones

- Phase 2A closure reconciliation: complete against Git history and durable
  task files; no implementation drift after `a6d7c8b`.
- Phase 2B task creation: files added and checkpointed at `5797ac8`.
- Ripple archaeology and candidate inventory: complete in `CANDIDATES.md` and
  `FRESHNESS.md`; no real target activity occurred.

## Work In Progress

M2 contract drafting and executable semantic policy design. No Phase 2B
implementation or real target activity has started.

## CURRENT_GOAL

Establish Nightwatch's first reusable authenticated behavioral-journey system
and prove exactly three meaningful, source-backed, semantically read-only
Ripple customer journeys with one fresh-context replay each.

## CURRENT_PHASE

M2 — Three journey contracts and semantic registry. M1 source archaeology is
recorded; contract drafting is next.

## CURRENT_EVIDENCE

- Nightwatch current docs checkpoint is `ea70dfa`; M1 inventory docs are
  currently uncommitted and must be checkpointed before contract
  implementation.
- Phase 2A implementation baseline is `a6d7c8ba9237ca0ffb1acd9442b23d21d0abf56c`.
- Phase 2A validated closure checkpoint is
  `9bf2c4593c9eb46db8bb8a5975bfa336461641cd`.
- `git diff a6d7c8b..9bf2c45` contains only task/project documentation;
  `git diff 9bf2c45..ec4c143` contains only Phase 2A REPORT/STATE docs.
- Phase 2A authenticated evidence remains authoritative: capture
  `nightwatch-20260811T183030Z-c652`, first run
  `nightwatch-20260811T190009Z-efce-first`, replay
  `nightwatch-20260811T190009Z-efce-replay`; route `/ripple/dashboard`,
  rendered QLayout, readiness PASS, route stability 834/766 ms.
- Phase 2A safety totals were zero for production attempts, proxy violations,
  unknown destinations, unknown approvals, mutations, and DB queries in both
  controlled contexts. Privacy PASS; authenticated traces/screenshots absent.
- The existing external DEV auth state is outside Nightwatch and its contents
  remain off-limits; before each Phase 2B real context it must pass boolean
  page-readability/provenance and the established 13/13 gate.

## CURRENT_JOURNEY_CANDIDATES

COMPLETE. `CANDIDATES.md` records ten candidates, source-backed verdicts, the
semantic ledger, rejected candidates, and the exact three selected leads: C02
Payer exchange-rate read, C03 Common exchange-rate read, and C04 Account
inventory. Durable journey contracts are not written yet; selection remains
subject to contract review and synthetic implementation.

## SELECTED_JOURNEYS

PRESELECTED_PENDING_CONTRACTS: C02, C03, C04. These are the only three
journeys authorized for contract drafting; no real DEV journey is authorized
before all contracts and synthetic validation exist.

## READ_ONLY_PROOF_STATUS

SOURCE_PROVEN_FOR_SELECTED_ENDPOINTS_PENDING_DURABLE_REGISTRY. The four
required reads are proven in `CANDIDATES.md`; selected journey contracts and
the executable registry still need implementation. No POST read-shaped
endpoint is selected.

## IMPLEMENTATION_STATUS

NOT_STARTED. No Phase 2B source, fixture, runner, contract, or test code has
been added; task docs, source inventory, and freshness record only.

## FILES_CHANGED

| Path | Reason | Status |
|---|---|---|
| `.agent/ACTIVE_TASK.md` | Route the fresh session to Phase 2B | checkpointed |
| `.agent/tasks/phase-2b-three-readonly-ripple-journeys/SPEC.md` | Frozen acceptance contract | checkpointed |
| `.agent/tasks/phase-2b-three-readonly-ripple-journeys/PLAN.md` | Living execution plan | checkpointed |
| `.agent/tasks/phase-2b-three-readonly-ripple-journeys/STATE.md` | Durable waypoint and resume recipe | checkpointed |
| `.agent/tasks/phase-2b-three-readonly-ripple-journeys/REPORT.md` | Final handoff placeholder | checkpointed |
| `.agent/tasks/phase-2b-three-readonly-ripple-journeys/CANDIDATES.md` | Source-backed candidate inventory and semantic ledger | ready to checkpoint |
| `.agent/tasks/phase-2b-three-readonly-ripple-journeys/FRESHNESS.md` | Ripple/source repository freshness record | ready to checkpoint |

## Files Changed

See `FILES_CHANGED` above; all changes are Phase 2B task-routing and
continuity documentation only.

## VALIDATION_LEDGER

- `git status --short --branch`: inventory docs and this STATE update are the
  only intended uncommitted Nightwatch paths.
- `git rev-parse HEAD`: `ea70dfae9bb3637555d0303571597a5c30649b87`.
- Phase 2A history review: implementation, closure checkpoint, and terminal
  documentation descendants have the expected semantics.
- `npm run agent:check`: PASS with the expected approved `CHECKPOINT_ADVANCE`
  warning; no required-heading or secret-like-value errors.
- `git diff --check`: PASS.

## Validation Ledger

The machine-readable ledger is `VALIDATION_LEDGER` above. The M0 validation
gate is complete; `ea70dfa` is the docs-only continuity checkpoint after the
native task-routing commit. M1 inventory docs are ready for their checkpoint.

## REAL_RUN_LEDGER

Phase 2B real runs: NONE. No Phase 2B browser context, journey action,
endpoint replay, production attempt, DB query, mutation, or new host approval.
Historical Phase 2A run IDs are recorded above only as starting evidence.

## REPLAY_LEDGER

Phase 2B replays: NONE. No Phase 2B replay context exists or is authorized.

## AUTH_STATUS

Phase 2A left a fresh page-readable DEV state at the external canonical path,
but Phase 2B has not validated it for a new context. Validate only safe
booleans and provenance; never print, copy, inspect, or persist state values.

## DECISIONS

- Freeze the Phase 2B SPEC before source archaeology or implementation.
- Treat worker output as bounded archaeology leads only; independently verify
  all persisted source facts.
- Do not intentionally invoke the POST-shaped Cost Drift `:read` endpoint;
  its DEV implementation is unavailable and its historical anomaly remains
  unresolved.
- Select C02/C03/C04 for contract drafting because they provide payer-scope,
  common-fee-scope, and account-inventory diversity with proven GET reads.
- Preserve Phase 2A's implementation/checkpoint/terminal SHA semantics and all
  safety/readiness/privacy primitives.
- Do not run any real DEV journey until exactly three durable contracts and
  synthetic validation are complete.

## Decisions Made During This Task

See `DECISIONS` above; implementation is still pending contract drafting.

## REJECTED_JOURNEYS

C01, C05, C06, C07, C08, C09, and C10 are rejected or constrained with reasons
in `CANDIDATES.md`. No selected journey has been executed.

## REJECTED_HYPOTHESES

NONE YET for Phase 2B. The Phase 2A expired-auth and routing conclusions are
historical facts, not candidate hypotheses.

## Discoveries

- The Phase 2A implementation/checkpoint/terminal SHA interpretation matches
  actual Git history and the clean terminal tree.
- Ripple UI `dev` is 0 ahead / 21 behind its local `origin/dev`; relevant
  selected-source files have no local tracking diff. Ripple API is synced with
  `origin/master`. This is a source-freshness caveat, not deployment proof.
- C02/C03/C04 have source-backed read proofs; Cost Drift is explicitly
  unavailable in DEV and remains untriggered.

## Blockers

No blocker to contract drafting. Executable selector/observer integration and
synthetic proof remain unresolved implementation work, not permission to run
DEV.

## BUG_CANDIDATES

NONE. No Phase 2B real or synthetic product anomaly has been observed.

## UNRESOLVED

- Exact contract fields/selectors and executable semantic registry entries for
  C02/C03/C04.
- Whether current observers can attribute requests to steps without persisting
  payloads.
- Journey-engine integration points and synthetic fixture behavior.

## SAFETY_EVENTS

NONE during Phase 2B setup/archaeology. No Alphaus repository was modified, no
target was contacted, no database tool was used, and no auth state was opened.

## Safety Events

See `SAFETY_EVENTS` above: NONE during Phase 2B setup.

## PRIVACY_STATUS

PASS for the Phase 2A handoff and task docs. Phase 2B implementation/evidence
privacy validation has not started; inventory docs contain only source paths,
method names, hashes, and sanitized semantic descriptions.

## Deferred / Follow-Up

- Contract drafting, engine implementation, and all subsequent Phase 2B
  milestones.
- Phase 2C and all later functionality.

## LAST_VERIFIED_IMPLEMENTATION_SHA

`a6d7c8ba9237ca0ffb1acd9442b23d21d0abf56c`

## LAST_CHECKPOINT_SHA

`ea70dfae9bb3637555d0303571597a5c30649b87` (docs-only continuity checkpoint;
implementation baseline remains `a6d7c8b`).

## NEXT_EXACT_ACTION

Checkpoint the M1 inventory docs, then inspect the exact Nightwatch
engine/observer/evidence integration points and draft durable contracts for
C02/C03/C04. Do not run DEV or add an executable registry entry until each
contract's selectors, endpoint expectations, and stop conditions are
represented in code/tests.

## Exact Next Action

Checkpoint M1, then begin contract drafting and engine integration review described by
`NEXT_EXACT_ACTION` above.

## RESUME_RECIPE

1. Read `AGENTS.md`, `docs/CURRENT_STATE.md`, this task's `SPEC.md`,
   `PLAN.md`, and `STATE.md`.
2. Run `git status --short --branch`, `git rev-parse HEAD`, and
   `npm run agent:check`; reconcile any SHA warning without rewriting it.
3. M0 validation is complete; `ea70dfa` is the current docs-only continuity
   checkpoint. The M1 inventory is in `CANDIDATES.md`/`FRESHNESS.md` and is
   ready to checkpoint.
4. Checkpoint M1, then draft contracts for C02/C03/C04 and implement only after the contract
   fields, semantic registry, and synthetic cases are explicit; do not run
   DEV or query a database.
5. Update this STATE before and after each milestone. Do not create a real
   context until `PRE_REAL_PHASE_2B_IMPLEMENTATION_READY` and
   `PRE_REAL_SELF_REVIEW_PASS` are recorded.

## Resume Recipe

Use the numbered `RESUME_RECIPE` above; it is the authoritative fresh-context
continuation procedure.

## Completion Snapshot

Not complete. Populate only after exactly three journeys, six controlled
contexts, final validation, and clean Nightwatch closure.
