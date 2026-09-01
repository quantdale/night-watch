# Task State

## Identity

Task ID: nightwatch-replay-budget-and-dossier-closure-v1
Phase: REPLAY_BUDGET_DOSSIER_CLOSURE_V1
Status: COMPLETE
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
PHASE_REPLAY_BUDGET_DOSSIER_CLOSURE_V1_STATUS: COMPLETE

## Objective

Repair the bounded campaign budget starvation that blocked all four fresh
reproduction queues in the completed soak before replay executor entry, then
confirm a current candidate can traverse the real bounded replay/dossier path.

## Current Milestone

COMPLETE / STOP — M0 through M5 are closed. The fresh DEV confirmation is
truthfully classified as `REPLAY_BUDGET_FIXED_DEV_CONFIRMATION_STARVED`.

## Work In Progress

NONE. The bounded replay-reservation implementation, fresh guarded
prepare/resume campaign, terminal classification, and repository validation
are closed.

## Exact Next Action

STOP. This task is complete. Do not start another DEV campaign or refresh
authentication. Do not use alternate credentials, historical candidates, or
stale manifests. Preserve the existing project verdict and require a
separately authorized task for any future DEV work.
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
- Guarded owner-led auth capture — PASS; post-login verification, atomic
  state/provenance writes, structural validation, and cleanup passed. Secret
  values and storage-state contents were not printed, copied, or committed.
- `NIGHTWATCH_PHASE_7_AUTH_REFRESH=0 npm run campaign:real -- --env=dev
  --prepare-only` — PASS; fresh campaign
  `campaign:sha256:37aca1e950ab804e3a6fd592`, manifest
  `manifest:sha256:41cdedac2beff0d59125ee1a`, source
  `6b13744bb0fa19047d681eaaf9aae9eb60b5a3c4`, five work items,
  `checkpointOrdinal=0`, and `productExecution=NOT_STARTED`.
- `NIGHTWATCH_PHASE_7_AUTH_REFRESH=0 npm run campaign:real -- --env=dev
  --resume-campaign=campaign:sha256:37aca1e950ab804e3a6fd592` — PASS;
  `COMPLETE_CLEAN`, all five work items completed, zero safety counters,
  privacy `PASS`, two anomaly observations, two clusters, and zero dossiers.
- Safe owner-local checkpoint aggregate inspection — PASS;
  `checkpointOrdinal=14`, `budgetUsed.replays=2/8` from the two ordinary API
  first-plus-fresh replay pairs, `reproductionQueue=0`,
  `replayReservations=0`, `minimizationQueue=0`, `dossierLedger=0`,
  both candidate lifecycles `PROTOCOL_ONLY/REJECTED` with
  `REPLAY_SOURCE_FRESHNESS_UNCONFIRMED`, and no executor attack replay entry.

- 2026-09-01 — The owner completed guarded headed DEV auth capture after the
  earlier page-readability failure. The fresh state passed post-login,
  structural, provenance, validation, and cleanup gates without exposing
  secret values.
- 2026-09-01 — The fresh campaign was run once, not retried. Its two
  protocol-only candidates failed replay eligibility before reservation, so
  the result is classified as
  `REPLAY_BUDGET_FIXED_DEV_CONFIRMATION_STARVED` rather than a product PASS
  or an admission relaxation.

- Final validation at documentation checkpoint
  `d4883ebf8795266a82a037258cdb14a40c063bc1` — `agent:check` PASS with the
  expected checkpoint-advance and historical-task warnings (0 strict errors);
  `handoff:check`, `project:check`, `hardening:check`, and
  `hygiene:status` PASS. The project snapshot paired active `COMPLETE` with
  `OPERATIONALLY_ACCEPTED`.
- `npm run gate:local` at
  `d4883ebf8795266a82a037258cdb14a40c063bc1` — PASS; all 10 required groups,
  semantic compatibility `1937/1950` with 13 skipped and 0 failed,
  owner-provenance 91, synthetic campaign 89, receipt
  `receipt:sha256:ffc933146fa403fa99478e1f`.
- `npm run gate:clean` from source head
  `d4883ebf8795266a82a037258cdb14a40c063bc1` — PASS; fresh Node20
  dependencies, all 10 required groups, `cleanBefore=true`,
  `cleanAfter=true`, no auth/finding state, 0 sibling writes, receipt
  `clean-receipt:sha256:666d335db69307569208e391`.
- `git diff --check` — PASS; no whitespace errors were present at the
  documentation checkpoint.

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
  permits one resume attempt; interruption after entry consumes the
  reservation and blocks re-entry.
- Reproduced replay alone unlocks minimization and dossier stages; clean,
  blocked, skipped, or interrupted outcomes do not create dossier work.
- The real bounded run distinguishes aggregate API replay accounting from
  candidate attack replay: two API fresh replays consumed two aggregate replay
  units, while no browser candidate replay reservation or executor entry was
  created.

## Blockers

None. The prior auth blocker was cleared by the owner-led capture; no product
or Nightwatch defect was admitted in the fresh campaign.

## Safety Events

None. The fresh auth capture and campaign remained within the guarded DEV
target, produced zero safety counters, and reported privacy `PASS`. No
production, NEXT, mutation, datastore, infrastructure, publication, or
sibling-repository operation occurred, and no raw authenticated evidence was
copied into the repository.

## Deferred / Follow-Up

- No product finding or dossier was produced because no fresh candidate passed
  the existing replay eligibility gate. The terminal result is
  `REPLAY_BUDGET_FIXED_DEV_CONFIRMATION_STARVED`; DVR-011 was not weakened.
- Exact-head Actions remains external non-evidence because its observed job
  executed zero steps; no CI PASS is claimed.
- Any future DEV campaign requires a separately authorized task and fresh
  current-source evidence. This task has no remaining follow-up action.

## Resume Recipe

This task is terminal. Do not resume it, refresh authentication, use alternate
credentials, reuse a predecessor checkpoint, reuse historical candidates, or
use a stale manifest. A future DEV campaign requires a separately authorized
task with fresh current-source evidence.

## Completion Snapshot

Completion state: COMPLETE.

Implementation source remains
`6b13744bb0fa19047d681eaaf9aae9eb60b5a3c4`; the fresh campaign
`campaign:sha256:37aca1e950ab804e3a6fd592` completed five read-only work items
with `COMPLETE_CLEAN`, zero safety counters, and privacy `PASS`. It produced
two protocol-only candidate observations/clusters, both rejected before
candidate replay with `REPLAY_SOURCE_FRESHNESS_UNCONFIRMED`; candidate attack
replay, minimization, and dossier counts are zero. The two API first-plus-fresh
replay pairs used two aggregate replay units and do not establish candidate
attack replay.

The truthful DEV terminal classification is
`REPLAY_BUDGET_FIXED_DEV_CONFIRMATION_STARVED`. Active task, STATE, REPORT,
PLAN milestones, OpenSpec task list, and project snapshot are terminal; the
local and clean Node20 quality gates passed at the documented checkpoint, with
external CI retained as non-evidence.

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
- The owner-led capture cleared the designated DEV auth boundary. The fresh
  campaign then produced no replay-eligible candidate, so the starved terminal
  classification is preserved without another attempt.
