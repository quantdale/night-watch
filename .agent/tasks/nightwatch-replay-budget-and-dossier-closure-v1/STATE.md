# Task State

## Identity

Task ID: nightwatch-replay-budget-and-dossier-closure-v1
Phase: REPLAY_BUDGET_DOSSIER_CLOSURE_V1
Status: BLOCKED
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
PHASE_REPLAY_BUDGET_DOSSIER_CLOSURE_V1_STATUS: BLOCKED

## Objective

Repair the bounded campaign budget starvation that blocked all four fresh
reproduction queues in the completed soak before replay executor entry, then
confirm a current candidate can traverse the real bounded replay/dossier path.

## Current Milestone

M3 — guarded DEV confirmation BLOCKED before campaign start.

## Work In Progress

M2 and all local/source validation are complete. The exact-head CI observation
is external zero-step non-evidence. On 2026-09-01, the owner-refreshed
designated DEV state was revalidated through the normal no-refresh Phase 7
prepare-only path and failed closed with `AUTH_NETWORK_FAILURE` before
campaign preparation. Safe diagnostics showed a valid file shape and DEV
provenance with a present required token, but the token was not unexpired and
the state was not page-readable; no fresh campaign work ran.

## Exact Next Action

STOP — no further auth refresh or retry is authorized in this task. The owner
must independently supply a designated external DEV state that passes guarded
page-readable validation before a new current-source campaign can be prepared.
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
- `npm run agent:check -- --root .` — PASS; 0 strict errors, 34 historical
  legacy warnings.
- `npm run handoff:check -- --root .` — PASS.
- `npm run project:check` — PASS.
- `npm run test:semantic-compat` — PASS; 1,937 passed, 13 skipped, 0 failed.
- `npm run test:owner-provenance` — PASS; 91/91 tests.
- `npm run campaign:synthetic` — PASS; 89/89 tests.
- `npm run gate:local` — PASS; all 10 required groups, receipt
  `receipt:sha256:e7cdf8bc8eec21bb39758484`, Node 22.
- `npm run gate:clean` — PASS; disposable clean checkout and all 10 groups
  under Node 20, receipt `clean-receipt:sha256:30151b7253775d2e09da6caf`.
- Exact-head GitHub Actions run `33446473458` for
  `6b13744bb0fa19047d681eaaf9aae9eb60b5a3c4` — completed `failure`; sole job
  `99666610250` (`Executable quality gate`) also failed with `steps=[]`;
  failed-log retrieval returned `log not found`.
- `stat` verified the designated external DEV storage-state file is a regular
  file with mode `600`; its contents were not read.
- `NIGHTWATCH_PHASE_7_AUTH_REFRESH=0 npm run campaign:real -- --env=dev
  --prepare-only` failed closed with `AUTH_NETWORK_FAILURE` before any
  refresh.
- One guarded `NIGHTWATCH_PHASE_7_AUTH_REFRESH=1` prepare-only attempt passed
  the guarded safety path but failed with `AUTH_STATE_REPLACEMENT_FAILED`;
  no fresh Phase 7 manifest/checkpoint was emitted.
- Fresh continuation auth revalidation (2026-09-01):
  `NIGHTWATCH_PHASE_7_AUTH_REFRESH=0 npm run campaign:real -- --env=dev --prepare-only`
  — FAIL_CLOSED / `AUTH_NETWORK_FAILURE` before campaign preparation. Safe
  `inspectDevAuthState` diagnostics: state exists, shape valid, DEV provenance
  valid, required token present, domain/path applicable, and application
  semantics valid; required token unexpired `false`, page-readable `false`, and
  overall valid `false`. Raw storage-state contents were not printed, copied,
  committed, or persisted.
- `npm run project:check` at documentation checkpoint
  `66c41a2a0953d920ebd97ade76fde2e83d016874` — PASS; active continuity PASS,
  checkout clean, project completion remains `OPERATIONAL_ACCEPTANCE_BLOCKED`.
- `npm run gate:local` at `66c41a2a0953d920ebd97ade76fde2e83d016874` — PASS;
  all 10 required groups, Node 22, semantic compatibility 1,937/1,950 with
  13 skipped and 0 failed, owner provenance 91, synthetic campaign 89,
  receipt `receipt:sha256:33830faa0c3bc2d452cb84fa`.
- `npm run gate:clean` from source head
  `66c41a2a0953d920ebd97ade76fde2e83d016874` — PASS; disposable clean
  checkout, fresh Node 20 dependencies and all 10 groups passed, clean before
  and after, no auth/finding state, 0 sibling writes, gate receipt
  `receipt:sha256:8a14aeb6bfe6e58030f29ac7`, clean receipt
  `clean-receipt:sha256:be6079cbbea65fa793fbdf4d`.
- Final `npm run agent:check -- --root .`, `npm run handoff:check -- --root .`,
  `npm run project:check`, `npm run hardening:check`, `npm run hygiene:status`,
  and `git diff --check` at `9f0d9a2683b7c3129894f851815035c1905ad03b` — PASS;
  continuity has 0 strict errors, handoff/project truth are valid, hardening
  passes, hygiene is `PRESERVED`, and the current tree is clean.
- Final `npm run gate:local` at `9f0d9a2683b7c3129894f851815035c1905ad03b` —
  PASS; all 10 required groups, Node 22, semantic compatibility 1,937/1,950
  with 13 skipped and 0 failed, owner provenance 91, synthetic campaign 89,
  receipt `receipt:sha256:099b82a26abb27c5c3ad216f`.
- Final `npm run gate:clean` from source head
  `9f0d9a2683b7c3129894f851815035c1905ad03b` — PASS; fresh Node 20
  dependencies and all 10 groups passed, clean before and after, no auth or
  finding state, 0 sibling writes, gate receipt
  `receipt:sha256:ef0fd4f48bfbc0fc684f61ab`, clean receipt
  `clean-receipt:sha256:8ebbf16dd46294899dcea6c1`.
- `git push origin main` for final blocked documentation checkpoint
  `d3328d97016a6c48cc05e1fb1276270760943353` — PASS; `main` advanced on
  `origin` without force-push.
- Post-push `git fetch --prune origin` plus clean/topology/parity checks —
  PASS; working tree clean, only local branch `main`, only remote-tracking
  branch `origin/main` plus the `origin/HEAD` symbolic reference, and
  `HEAD == origin/main` at `d3328d97016a6c48cc05e1fb1276270760943353`.

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

- Owner-managed DEV authentication remains not page-valid after the latest
  owner refresh. The normal no-refresh campaign prepare path returned
  `AUTH_NETWORK_FAILURE`; sanitized diagnostics show the required token is
  present but unexpired and page-readable are both `false`. The exact unblock
  condition is a separately supplied designated external state that passes
  guarded page-readable validation.

## Safety Events

None. The guarded revalidation remained read-only and exposed no raw
storage-state contents. It stopped before fresh campaign preparation; no
production, NEXT, product mutation, datastore, infrastructure, publication, or
sibling write occurred.

## Deferred / Follow-Up

- Fresh current-source campaign, candidate admission, replay, minimization,
  and dossier closure remain blocked by the designated DEV page-readability
  condition above.
- CI is classified `NO_STEPS_BILLING_OR_PLATFORM_BLOCK`, external non-evidence;
  no repository workflow step executed and CI PASS is not claimed.
- Final continuity/project reconciliation, safety/privacy, generated-artifact
  inspection, terminal documentation validation, checkpoint push, and
  post-push remote-parity verification passed. The task remains BLOCKED only
  at the designated DEV page-readability condition.

## Resume Recipe

STOP until the owner independently supplies a designated external DEV state
that passes guarded page-readable validation. Do not repeatedly refresh, retry,
use alternate credentials, reuse this failed state, reuse the predecessor soak,
reuse historical candidates, or use stale manifests. If the owner supplies a
valid state and fresh authorization, prepare a new current-source campaign and
use no more than 3 campaign attempts, 3 attack replays, and 1
minimization/dossier chain.

## Completion Snapshot

Completion state: BLOCKED
Current milestone: M3 — guarded DEV confirmation BLOCKED before campaign start.
Validated result: pushed implementation checkpoint
`6b13744bb0fa19047d681eaaf9aae9eb60b5a3c4` passes the focused 92-test
campaign/checkpoint cone, local gate, clean Node20 gate, typecheck, hardening,
handoff, project, semantic compatibility, owner provenance, and synthetic
campaign checks. The final continuation head
`9f0d9a2683b7c3129894f851815035c1905ad03b` also passed the explicit
continuity, handoff, project, safety, privacy, local, and clean Node20 gates.
CI result: exact-head run `33446473458` failed before any job step and is
classified as external non-evidence.
DEV result: after the owner refresh, the normal no-refresh prepare-only path
failed closed with `AUTH_NETWORK_FAILURE`; sanitized diagnostics show the
required token present but unexpired `false`, page-readable `false`, and
overall valid `false`. Campaign/replay/minimization/dossier counts remain zero.
Closure result: continuity, OpenSpec, project truth, hardening, privacy, local
quality, clean Node20 validation, checkpoint push, and post-push remote-parity
verification are complete for the blocked outcome.
Terminal outcome: BLOCKED_BEFORE_DEV_AUTH; no product finding or dossier was
claimed.
