# Task State

## Identity

Task ID: nightwatch-replay-budget-and-dossier-closure-v1
Phase: REPLAY_BUDGET_DOSSIER_CLOSURE_V1
Status: IN_PROGRESS
Starting SHA: 4834e4da1ec40fbad9736f0a12d1d8f610cb622d
Last validated implementation SHA: 6b13744bb0fa19047d681eaaf9aae9eb60b5a3c4
Last substantive checkpoint SHA: 6b13744bb0fa19047d681eaaf9aae9eb60b5a3c4
Branch: main
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 4834e4da1ec40fbad9736f0a12d1d8f610cb622d
LAST_VALIDATED_IMPLEMENTATION_SHA: 6b13744bb0fa19047d681eaaf9aae9eb60b5a3c4
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 6b13744bb0fa19047d681eaaf9aae9eb60b5a3c4
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_REPLAY_BUDGET_DOSSIER_CLOSURE_V1_STATUS: IN_PROGRESS

## Objective

Repair the bounded campaign budget starvation that blocked all four fresh
reproduction queues in the completed soak before replay executor entry, then
confirm a current candidate can traverse the real bounded replay/dossier path.

## Current Milestone

M3 — complete local, CI, and guarded DEV validation.

## Work In Progress

M2 is complete at pushed implementation checkpoint
`6b13744bb0fa19047d681eaaf9aae9eb60b5a3c4`. The durable replay reservation
ledger, finite collection reserve, strict checkpoint validation, eligibility
gate, interruption/resume handling, and adversarial regressions are in place.
Focused campaign and phase-15 checkpoint suites pass; local certification and
guarded DEV confirmation remain open.

## Exact Next Action

Run the owner-provenance, synthetic campaign, local-gate, and clean-runtime
checks; then inspect exact-head CI status and perform only the separately
authorized bounded DEV preflight.
## Starting evidence

- Predecessor: nightwatch-dev-soak-replay-yield-v1 COMPLETE.
- Terminal: SOAK_COMPLETE_PRODUCT_CANDIDATES_REPLAY_INCONCLUSIVE.
- Fresh candidates: 8 across 4/5 full campaigns.
- Stable candidate fingerprints: 2.
- Reproduction queues: 4.
- Replay/minimization/dossier: 0/0/0.
- Shared blocker: journeyContexts already 3/3 before reproduction reservation.
- Safety: zero.
- Privacy: PASS.

## Completed Milestones

- Git authority reconciliation: COMPLETE; only local `main` and remote
  `origin/main` exist, with no open pull requests requiring integration.
- Source reconnaissance: COMPLETE; the budget manager and orchestrator
  reservation boundary were inspected without changing budget semantics.
- M0 — reproduce budget starvation: COMPLETE at pushed checkpoint
  `9b7e3ad661bab91065a8674b6bfd5d0536f3495a`; the current-source candidate
  survived clustering, queued reproduction, and hit `BUDGET_EXHAUSTED` before
  the replay callback after three journey reservations.
- M1 — bounded replay reservation design: COMPLETE; selected a durable
  normalized campaign/cluster ledger with one protected browser slot and no
  retry bypass.
- M2 — bounded replay reservation implementation and adversarial validation:
  COMPLETE at pushed checkpoint
  `6b13744bb0fa19047d681eaaf9aae9eb60b5a3c4`.

## Files Changed

- `src/core/campaign/types.ts` — normalized replay requirement and persisted
  reservation types.
- `src/core/campaign/budget.ts` — finite protected browser reserve and
  collection-only accounting boundary.
- `src/core/campaign/checkpoint.ts` — strict optional replay-ledger validation,
  duplicate/identity checks, and queue/dossier consistency.
- `src/core/campaign/orchestrator.ts` — eligibility, atomic reservation,
  consumption, interruption/resume, and downstream closure.
- `tests/unit/campaign.test.ts` — starvation reproduction plus bounded replay,
  identity, source-drift, rejection, exhaustion, interruption, resume, and
  serialization regressions.
- `tests/unit/phase15CampaignTriageIntegration.test.ts` — checkpoint-boundary
  interruption/resume integration regression.
- `.agent/tasks/nightwatch-replay-budget-and-dossier-closure-v1/PLAN.md` —
  execution plan and milestone evidence.
- `.agent/tasks/nightwatch-replay-budget-and-dossier-closure-v1/STATE.md` —
  continuity-v2 execution waypoint and validation ledger.

## Validation Ledger

- `git fetch --prune origin` — PASS; canonical remote reconciled.
- Authority inventory and cached open-PR lookup — PASS/no integration needed;
  MCP open-PR lookup returned `Not Found` and is recorded as non-authoritative.
- M0 reproducer checkpoint
  `9b7e3ad661bab91065a8674b6bfd5d0536f3495a` — PASS and pushed; three
  collection journeys starved replay before callback entry.
- M1 design checkpoint
  `d3e279f...` — PASS and pushed; bounded reservation architecture recorded.
- M2 implementation checkpoint
  `6b13744bb0fa19047d681eaaf9aae9eb60b5a3c4` — PASS and pushed.
- Focused replay/checkpoint suites — PASS, 92/92 tests, serial, no retries.
- `npm run typecheck` — PASS.
- `npm run hardening:check` — PASS; offline structural invariants hold.
- `npm run agent:check -- --root .` — PASS with expected legacy-task warning
  before this state refresh; it also reported the stale SHA now corrected.
- `npm run handoff:check -- --root .` — PASS.
- `npm run project:check` — PASS.
- `npm run test:semantic-compat` — PASS; 1,937 passed, 13 skipped, 0 failed.

## Decisions Made During This Task

- Keep the three-journey starvation behavior unchanged until its regression was
  checkpointed.
- Model the reproducer with a current-source, product-classified candidate,
  clean preflight/execution outcome, one cluster, and a reproduction estimate
  requiring one additional journey context.
- Treat the resulting `BUDGET_EXHAUSTED` refusal before `reproduce` callback
  entry as the budget-allocation boundary, not an admission or framework
  failure.
- Reserve one finite physical browser context from collection for real-scale
  replay work; normalize replay accounting to one replay, explicit API/action
  units, zero collection journey/exploration units, and persist it per
  campaign/cluster identity.
- Reuse a RESERVED reservation on resume without charging twice; consume it
  once replay callback entry is established; never re-enter a consumed or
  interrupted replay.
- Admit replay only for fresh, changeset-bound, complete, authenticated,
  product-classified, non-reproduced, non-known-defect candidates.

## Discoveries

- `INITIAL_REAL_CAMPAIGN_BUDGET` permits three journey contexts and six total
  browser contexts; the protected reserve leaves five browser contexts for
  collection while retaining one replay slot.
- Replay reservations are accepted by checkpoint validation only when their
  deterministic identity, candidate observation, representative run, queue
  state, and dossier relationship agree.
- Eligible real-scale replay consumes the protected slot without charging
  collection journey/exploration counters; duplicate clusters and rejected
  outcomes do not reserve.
- A checkpoint boundary before replay callback entry preserves `RESERVED` and
  permits one resume attempt; interruption after entry consumes the reservation
  and blocks re-entry.
- Reproduced replay alone unlocks minimization and dossier stages; clean,
  blocked, skipped, or interrupted outcomes do not create dossier work.

## Blockers

None.

## Safety Events

None. No Alphaus environment, product, datastore, infrastructure, credential,
publication, or authenticated evidence operation was performed.

## Deferred / Follow-Up

- Exact-head CI inspection/classification remains pending until the GitHub
  Actions result is read for this checkpoint.
- Guarded DEV confirmation remains pending its owner-only target/auth
  preflight; no DEV credentials, raw evidence, or production operation is
  authorized.
- Final continuity closure, privacy audit, documentation checkpoint, push, and
  remote-parity verification remain pending.

## Resume Recipe

Read this state, the active PLAN, and the safety model. Run the remaining local
gates first. For DEV, verify owner authorization and READY containment, use a
fresh current-source candidate only, enforce the campaign/replay/minimization
caps, and record only sanitized categorical results. If preflight or fresh
candidate admission is unavailable, close as non-evidence rather than retrying
or weakening policy.

## Completion Snapshot

Completion state: IN_PROGRESS
Current milestone: M3 — complete local, CI, and guarded DEV validation.
Validated result: pushed implementation checkpoint
`6b13744bb0fa19047d681eaaf9aae9eb60b5a3c4` passes the focused 92-test
campaign/checkpoint cone, typecheck, hardening, handoff, project, and semantic
compatibility checks.
Terminal outcome: NONE; CI classification, guarded DEV confirmation, final
closure, and clean remote parity remain open.
