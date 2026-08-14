# Task State

## Identity

Task ID: phase-7b-3-single-local-model-canary
Phase: 7B.3 — SINGLE BOUNDED LOCAL-MODEL CANARY
Status: IN_PROGRESS
Starting SHA: 18bc3fa8f64322b8b43c9ccd0b07b182668d1932
LAST_VALIDATED_IMPLEMENTATION_SHA: 3916594f6e947f7f4665b23751c1d3ec03f5928b
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 3916594f6e947f7f4665b23751c1d3ec03f5928b
LAST_DOCUMENTATION_CHECKPOINT_SHA: 18bc3fa8f64322b8b43c9ccd0b07b182668d1932
LIVE_HEAD_AUTHORITY: DISCOVER_FROM_GIT
Branch: main
Canonical Git root: /home/dalepalaca/go/src/alphaus-main/REPOSITORIES/nightwatch
Remote: origin -> quantdale/night-watch, main

## Objective

Implement and validate a fixed synthetic one-shot local-model canary through
the existing loopback provider, then run at most one real local request only
if an already-installed compatible runtime/model and exact loopback endpoint
are proven without installation or download.

## Current Milestone

M3 — Full deterministic validation and clean checkout (IN_PROGRESS).

## Completed Milestones

- M0 bootstrap, recovery, and frozen design: COMPLETE.
- M1 fixed fixture and one-shot controller: COMPLETE.
- M2 thin CLI, tests, static boundary, package command, and CI step: COMPLETE.

## Work In Progress

The fixed synthetic L2 fixture, one-shot controller, thin CLI, focused tests,
hardening rule, package command, and deterministic CI step are implemented.
No model, runtime, endpoint, private finding, product environment, database,
infrastructure, owner review, or external AI operation has been used.

## CANARY_INPUT_VERSION

nightwatch.local-model-canary-input.private.v1

## CANARY_INPUT_DIGEST

sha256:34db4fb404008607b0ab4980155b17d7e36540107fec5163888803ae997263c6

## CANARY_OPERATION

BUG_CANDIDATE only

## REAL_PROVIDER_CALL_BUDGET

1 maximum; oracle suggestions 0; retries 0; existing AI_REVIEW_BUDGET
unchanged.

## LOCAL_RUNTIME_DISCOVERY_STATUS

NOT_STARTED — discovery is forbidden until deterministic validation and the
validated source checkpoint are complete.

## LOCAL_RUNTIME_CLASS

PENDING

## RUNTIME_PREEXISTING_STATUS

PENDING

## MODEL_PRESENCE_STATUS

PENDING

## ENDPOINT_VALIDATION_STATUS

PENDING

## MODEL_IDENTIFIER_STATUS

PENDING

## DETERMINISTIC_PRECHECK_STATUS

IN_PROGRESS — local deterministic suite and focused gates passed; clean
checkout and source checkpoint pending.

## REAL_CANARY_EXECUTION_STATUS

NOT_STARTED — no real model/provider call has occurred.

## PROVIDER_CALLS_USED

0

## RESULT_CLASS

PENDING

## RAW_MODEL_OUTPUT_PERSISTED

0

## PRIVATE_ARTIFACT_WRITES

0

## OWNER_REVIEW_WRITES

0

## EXTERNAL_AI_CALLS

0

## PRODUCT_CONTACTS

0

## SAFETY_EVENTS

NONE

## PRIVACY_STATUS

PASS — fixed synthetic fixture only; no credentials, auth state, customer
values, financial values, raw bodies, DOM, screenshots, traces, or private
findings used.

## FILES_CHANGED

`.agent/ACTIVE_TASK.md`, `.github/workflows/hardening.yml`,
`bin/ai-local-canary.mjs`, `bin/hardening-check.mjs`, `package.json`,
`src/core/aiReview/index.ts`, `src/core/aiReview/localCanary.ts`,
`tests/unit/aiLocalCanary.test.ts`, and task files.

## TEST_LEDGER

M0 bootstrap/read ledger: PASS. M1/M2 implementation and focused validation:
PASS — `npm run typecheck`, `npm run hardening:check`, and
`npx playwright test tests/unit/aiLocalCanary.test.ts --project=nightwatch
--workers=1` (10/10). `git diff --check`: PASS. Full deterministic and clean
local validation: PASS — combined AI/loopback/canary 78/78, owner-provenance
91/91, agent-state 32/32, synthetic campaign 27/27, and full Playwright
523/523. Clean checkout validation pending.

## CI_STATUS

FAIL — exact implementation run `31807221660` at
`6a336f0f323b864ffbe83a6b4208191d74922b5d` stopped at offline hardening:
`src/core/aiReview/localCanary.ts` is an intentional one-call controller but
was still matched by the general raw-operation scan. No model/provider call
occurred. Repair is limited to the source-scoped hardening exception with
the canary-specific exact-one-call check.

## NEXT EXACT ACTION

Repair the source-scoped hardening false positive, rerun local hardening and
focused checks, commit/push the repair, and inspect the replacement CI run.
Do not discover or invoke a real runtime while CI is red.

## RESUME RECIPE

Read `.agent/ACTIVE_TASK.md`, this task's `SPEC.md`, `PLAN.md`, and `STATE.md`;
inspect `git status --short`/scoped diff; run the smallest decisive
deterministic validation. Do not inspect owner findings or secret environment
state. Do not install/download a runtime/model or run a real model before all
deterministic gates pass.

## Exact Next Action

Run the isolated full-history clean checkout for M3, then inspect and
checkpoint the implementation.

## Files Changed

Task files: `SPEC.md`, `PLAN.md`, `STATE.md`, `REPORT.md`; source list pending.

## Validation Ledger

- Bootstrap Git synchronization: PASS — clean `main`,
  `HEAD == origin/main == 18bc3fa8f64322b8b43c9ccd0b07b182668d1932`.
- Required durable-doc/source recovery read: PASS.
- Single-writer coordination scan: PASS — no coordination/lock file found;
  previous task is COMPLETE.
- Real-model/provider activity: NONE.

## Decisions Made During This Task

- Carry forward `3916594f6e947f7f4665b23751c1d3ec03f5928b` as the stable
  validated implementation anchor until this task's source checkpoint passes.
- Keep live HEAD and remote equality Git-discovered rather than persisted as
  authority.

## Discoveries

- The existing loopback provider already supplies strict path, host, no
  credentials, no redirect, bounded body/time, `stream:false`, and abort
  behavior; the canary should compose it rather than alter it.
- The existing session supports oracle and three-call historical budgets, so
  the canary controller must add its own structural one-call restriction.
- The fixed fixture digest is
  `sha256:34db4fb404008607b0ab4980155b17d7e36540107fec5163888803ae997263c6`.

## Blockers

None identified.

## Safety Events

NONE.

## Deferred / Follow-Up

- Local runtime/model discovery is deliberately deferred until after the full
  deterministic gates, clean checkout, validated source checkpoint, and exact
  deterministic CI.
- Phase 8 remains `NOT_STARTED`.

## Resume Recipe

After any interruption: read ACTIVE_TASK, SPEC, PLAN, STATE; inspect Git
status/diff; run the smallest decisive validation; update STATE. The real
call, if permitted, is the final runtime experiment and may occur once only.

## Completion Snapshot

Not complete. Stable historical implementation anchor is
`3916594f6e947f7f4665b23751c1d3ec03f5928b`; live HEAD must be discovered from
Git.
