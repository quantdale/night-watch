# Task State

## Identity

Task ID: nightwatch-dev-requalification-v1
Phase: DEV_REQUALIFICATION_V1
Status: IN_PROGRESS
Starting SHA: e51bf7730a8d79051ceb19f8ae9dd3eece5aa300
Last validated implementation SHA: 3cbe5f2f36dcaf4d94aa0a203649126aedb26be3
Last substantive checkpoint SHA: 3cbe5f2f36dcaf4d94aa0a203649126aedb26be3
Last documentation checkpoint SHA: 3cbe5f2f36dcaf4d94aa0a203649126aedb26be3
Branch: main
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: e51bf7730a8d79051ceb19f8ae9dd3eece5aa300
LAST_VALIDATED_IMPLEMENTATION_SHA: 3cbe5f2f36dcaf4d94aa0a203649126aedb26be3
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 3cbe5f2f36dcaf4d94aa0a203649126aedb26be3
LAST_DOCUMENTATION_CHECKPOINT_SHA: 3cbe5f2f36dcaf4d94aa0a203649126aedb26be3
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_DEV_REQUALIFICATION_V1_STATUS: IN_PROGRESS

## Objective

Obtain a bounded serial DEV reliability sample after owner-managed
authentication refresh, preserving independent sanitized outcomes and the
existing `OPERATIONALLY_ACCEPTED` project verdict unless evidence requires an
explicit reevaluation.

## Current Milestone

M2 — Cross-phase real operation — IN_PROGRESS. M1 repeated Phase 2C evidence
and DVR-001 through DVR-005 post-fix confirmation are complete. M0 activation
and pre-DEV authority checks passed at `2e7e84f`.

## Completed Milestones

- M0 — Successor activation and baseline — COMPLETE at `2e7e84f`; OpenSpec
  validation and all pre-DEV authority checks passed.
- M1 — Repeated Phase 2C sample / capture repair — COMPLETE after six
  independent serial invocations; the final post-DVR-005 invocation confirmed
  clean payer/common replay plus a stable account product oracle.

## Work In Progress

The first guarded Phase 2C invocation used the refreshed owner-local DEV
state. Both observations for `ripple-payer-exchange-read` reached valid auth
and zero safety violations, but the bounded response/oracle settlement timed
out. The replay comparator correctly classified the pair as
`FRAMEWORK_CAPTURE_DEFECT` with `SETTLEMENT_TIMEOUT`; the manual real-run
summary independently mislabeled each observation as
`PRODUCT_BEHAVIOR_ANOMALY`. A shared deterministic observation classifier now
checks safety, auth, settlement, and capture health before product attribution;
its local regression and focused validation pass. The second invocation then
timed out in both payer observations because the settlement barrier counted
unfinished page subresources and passive unknown traffic as active journey
requests. The observer now tracks only source-reviewed intentional known-read
requests for that signal while retaining response handlers for all observed
responses. A local hanging-subresource/known-read regression and focused
validation pass; the repair is checkpointed at `247b27a`. The third
independent invocation then produced one clean settled payer observation and
one settled payer observation with an unavailable known-read JSON body. Strict
comparison classified the pair as `FRAMEWORK_CAPTURE_DEFECT` /
`CAPTURE_INCOMPLETE` with `oracle-or-result-status` divergence. A sanitized
event audit found exactly one `KNOWN_READ` JSON/XHR response with
`bodyCapture=unavailable`; auth was valid and safety counters were zero. This
is DVR-003. The owning response observer now bounds body reads at five
seconds, records only categorical capture-failure codes, and propagates those
codes through evidence and replay diagnostics. The local truncated-response
fixture reproduces a finite `BODY_READ_TIMEOUT` / `INCOMPLETE` result. The
repair is checkpointed at `1d3eb0a`. The fourth independent invocation at
`nightwatch-20260831T092548Z-f5ee` then showed that both intentional
known-read JSON responses completed in both contexts, but one passive
`UNKNOWN` JSON/XHR body timed out in c2. Because capture health is currently
aggregate, that unrelated timeout made the pair diverge on
`oracle-or-result-status`. This is DVR-004: verdict-affecting capture health
must be limited to intentional source-reviewed known reads while passive
response diagnostics remain observable. The fourth invocation's payer pair
replayed successfully after the scope repair, but the run then stopped on
`ripple-common-exchange-read`: c1 had bootstrap 5xx responses, no rendered
shell, and no required read while c2 passed. Because c1 had no intentional
capture attempt, `CAPTURE_STATUS_UNKNOWN` incorrectly took precedence over its
explicit structural/oracle failure. This is DVR-005 and requires attribution
precedence repair before the next DEV run. The pure classifier/replay
precedence repair is checkpointed at `d1b9f31`; local Phase 2C matrix,
typecheck, and hardening validation pass. The sixth independent invocation at
`nightwatch-20260831T094029Z-e57a` confirms DVR-005 is repaired: payer and
common journeys both passed with complete intentional capture and settled
oracles, and their strict replay comparisons had no invariant mismatches. The
account-inventory pair reached the same settled product oracle failure in both
contexts with valid auth and zero safety violations; the comparator classified
its bounded difference as `EXPECTED_PRODUCT_STATE_DRIFT`, not a framework
divergence. No auth, environment, or Nightwatch capture defect occurred in
this invocation.

The first guarded Phase 4 run at `nightwatch-20260831T095007Z-246e` passed
its pre-real safety gate. Its first payer-exchange context (`seed=0x...0101`)
passed the anchor and completed one bounded `status-local.set` transition
with `SAFE_FRONTIER_EXHAUSTED`, settled observation, complete capture, and
zero safety counters. Its fresh second context (`seed=0x...0102`) passed
auth/page readability, route and structural markers, settlement, and capture,
but failed the required anchor because the product oracle observed repeated
critical bootstrap resource HTTP 502 responses. The sanitized anchor manifest
records `PRODUCT_BEHAVIOR_ANOMALY` with stable fingerprint
`fp:sha256:417f5b6941eba537f0fae85e`; a separate image 502 was
`DEV_INFRA_TRANSIENT` and non-causal. Safety counters remained zero and no
Nightwatch capture defect was observed. The launcher stopped before later
seeds and exact replay, so a fresh bounded Phase 4 observation was required to
characterize this product/environment variation. The second Phase 4 run at
`nightwatch-20260831T095337Z-c375` passed both fresh payer contexts and both
fresh common-exchange contexts with complete capture, settled observations,
and zero safety counters. It then stopped at account inventory: the account
anchor had valid auth, complete capture, settled observation, and zero safety
counters, but two sanitized `malformed-json` product oracles were triggered
(HTTP 200 with invalid JSON) with fingerprints
`fp:sha256:d491c1b9779adfbcd030cc23` and
`fp:sha256:a9bc7b4b6b075dae9e9b5da3`. No Nightwatch defect or
auth/environment failure occurred. Across the two Phase 4 runs, payer
achieved 3/4 clean contexts, common 2/2, and account 0/1; exact replay was
unavailable because each bounded run stopped at a product oracle before its
replay loop.

The guarded Phase 5 API run at `nightwatch-20260831T095813Z-09be` passed its
serial six-operation corpus and six fresh replays in 27.4 seconds. All 12
attempts were DEV-verified with valid external auth, 2xx status classes,
valid JSON or complete JSON chunks, stable first/replay fingerprints, and
`ORACLE_PASS`. The run used the native Nightwatch relay fallback, persisted
no auth or response material, and reported zero production attempts, proxy
violations, unknown destinations/approvals, mutations, database queries, or
secret leaks. The account-inventory and billing-groups API paths passed here,
so the malformed-JSON product evidence remains context-specific to the
browser account-inventory observation rather than a blanket API failure.

The bounded Phase 7 campaign prepared successfully as
`campaign:sha256:394f3fd1ed3828e2914a6373`, with manifest fingerprint
`manifest:sha256:35a5e608ac1339f8ea6cf8f9`, five selected work items, and a
`PREPARE_GATE_PASS`. Resuming that exact owner-local campaign then failed
closed after the first payer work item produced two observations carrying the
same sanitized anomaly fingerprint. The checkpoint validator rejected the
execution record as `CAMPAIGN_CHECKPOINT_INTEGRITY_INVALID` /
`CHECKPOINT_EXECUTION_FINGERPRINTS:DUPLICATE`; the persisted checkpoint stayed
`IN_PROGRESS` at ordinal 2 with the first item `RUNNING`, no completed work,
and zero safety/privacy counters. This is DVR-006, a High Nightwatch
checkpoint-boundary defect: occurrence evidence legitimately preserves
duplicate observations, but the execution summary mapped those occurrences
without canonicalizing its identity set. No further DEV campaign execution is
authorized until the owning summary boundary is reduced locally, fixed, and
regression-tested. The local repair is now implemented at
`3cbe5f2f36dcaf4d94aa0a203649126aedb26be3`: only the execution-record
fingerprint summary is canonicalized to a sorted unique set; observation and
candidate occurrence records remain untouched. The focused regression, full
30-test campaign suite, 30-test checkpoint/triage compatibility cone,
typecheck, and hardening all pass. The exact persisted DEV resume is the next
required validation.

## Exact Next Action

Resume the exact owner-local campaign
`campaign:sha256:394f3fd1ed3828e2914a6373` after a fresh bounded DEV preflight.
Verify that the repaired summary boundary accepts repeated occurrences,
persisted state advances without duplicate/lost work, and cleanup remains
safe. Preserve the original failed resume as DVR-006; a successful resume is
a new observation and does not erase the defect history.

## Blockers

None.

## Resume Recipe

Read this STATE, PLAN, and SPEC, verify clean Git and the external state path
without reading its contents, rerun the pre-DEV checks, and continue M2
serially. The duplicate-fingerprint repair is checkpointed at
`3cbe5f2f36dcaf4d94aa0a203649126aedb26be3`; run the bounded DEV preflight,
then resume only the exact prepared campaign. Do not use production/NEXT or
bypass any guard.

## Validation Ledger

Command: `git status --short --branch`, `git rev-parse HEAD`, and
`git rev-parse origin/main`
Result: PASS; clean `main`, local and origin both at `e51bf7730a8d79051ceb19f8ae9dd3eece5aa300`
When: 2026-08-31

Command: `npm run agent:check`, `npm run handoff:check`, `npm run project:check`,
`npm run hardening:check`, and `npm run observe:preflight -- --env=dev`
Result: PASS; continuity, handoff, project truth, hardening, and bounded DEV
preflight all passed at `2e7e84f`; production was explicitly denied by the
preflight.
When: 2026-08-31

Command: `npm run auth:capture -- --env=dev --output=/home/dalepalaca/.nightwatch/auth/ripple-dev-state.json`
Result: PASS; guarded human-led capture, post-login verification, atomic
storage-state write, provenance write, state validation, and cleanup passed
When: 2026-08-31
Relevant failure/output summary: owner-local file is mode 0600; no credential
or storage-state contents were printed.

Command: `openspec validate nightwatch-dev-requalification-v1 --type change --strict --no-interactive`
Result: PASS; all four OpenSpec artifacts validate
When: 2026-08-31

Command: `npx playwright test tests/unit/phase2cOracleMatrix.test.ts --project=nightwatch --workers=1 --retries=0`
Result: PASS; 15 passed, 0 skipped, 0 failed in 2.1 seconds, including the
single-observation framework/product/unknown attribution regression
When: 2026-08-31

Command: `npm run typecheck`
Result: PASS; TypeScript compilation completed with no diagnostics after the
observation-classification repair
When: 2026-08-31

Command: `npm run hardening:check`
Result: PASS; offline structural invariants hold after the observation-
classification repair
When: 2026-08-31

Command: `npm run observe:preflight -- --env=dev`
Result: PASS immediately before the guarded campaign prepare; the approved
DEV target and auth host remained allowlisted, production remained explicitly
denied, and preflight performed no target network activity.
When: 2026-08-31

Command: `NIGHTWATCH_HEADED=0 npm run campaign:real -- --env=dev --prepare-only --storage-state=/home/dalepalaca/.nightwatch/auth/ripple-dev-state.json`
Result: PASS; prepared campaign
`campaign:sha256:394f3fd1ed3828e2914a6373` with five bounded read-only work
items, `CHANGE_DIRECTED` selection, manifest fingerprint
`manifest:sha256:35a5e608ac1339f8ea6cf8f9`, and `PREPARE_GATE_PASS`.
When: 2026-08-31

Command: `NIGHTWATCH_HEADED=0 npm run campaign:real -- --env=dev --resume-campaign=campaign:sha256:394f3fd1ed3828e2914a6373 --storage-state=/home/dalepalaca/.nightwatch/auth/ripple-dev-state.json`
Result: FAIL CLOSED on DVR-006 after 12.7 seconds:
`CAMPAIGN_CHECKPOINT_INTEGRITY_INVALID:CHECKPOINT_EXECUTION_FINGERPRINTS:DUPLICATE:fp:sha256:bba7c1fd5564ece993a0238f`.
The owner-local checkpoint remained `IN_PROGRESS`, ordinal 2, with the first
work item `RUNNING`, retry reserved, no completed work, and zero safety or
privacy violations. The duplicate value was a sanitized anomaly identity;
raw response or customer data was not inspected or persisted.
When: 2026-08-31

Command: `NIGHTWATCH_HEADED=0 npm run journey:phase2c -- --env=dev --storage-state=/home/dalepalaca/.nightwatch/auth/ripple-dev-state.json`
Result: FAIL as an independent post-classification observation at
`nightwatch-20260831T084705Z-849e`; both payer observations had valid auth,
zero safety counters, `captureStatus=INCOMPLETE`,
`observationSettlement=TIMED_OUT`, and final classification
`FRAMEWORK_CAPTURE_DEFECT` with `SETTLEMENT_TIMEOUT`. The replay comparison
had zero strict invariant mismatches, so no product finding was admitted.
Sanitized matrix: `artifacts/phase2c-nightwatch-20260831T084705Z-849e-matrix.json`.
When: 2026-08-31

Command: `npm run agent:check`, `npm run handoff:check`, and
`npm run project:check`
Result: PASS; active continuity, handoff, project truth, and clean checkout
validated at `dd5ff766828d71706c75b6ffb86e5b2267c7ffb9`; agent check retained
the expected legacy-task and checkpoint-history warnings only
When: 2026-08-31

Command: `npx playwright test tests/unit/networkObserverSettlement.test.ts tests/unit/observationSettlement.test.ts tests/unit/rippleReadiness.test.ts tests/unit/phase2cOracleMatrix.test.ts --project=nightwatch --workers=1 --retries=0`
Result: PASS; 40 passed, 0 skipped, 0 failed in 3.5 seconds. The new local
fixture proves a hanging passive subresource does not increment
`activeJourneyRequests`, while a hanging source-reviewed known read remains
tracked; existing settlement, readiness, replay, and attribution regressions
also pass.
When: 2026-08-31

Command: `NIGHTWATCH_HEADED=0 npm run journey:phase2c -- --env=dev --storage-state=/home/dalepalaca/.nightwatch/auth/ripple-dev-state.json`
Result: FAIL as independent post-DVR-002 invocation at
`nightwatch-20260831T085807Z-7767`; payer observation c1 settled and passed,
while payer observation c2 settled with valid auth and zero safety counters but
had `captureStatus=INCOMPLETE`, `oracleStatus=FAIL`, and one known-read JSON/XHR
response with `bodyCapture=unavailable`. Strict comparison reported
`oracle-or-result-status` and classified the pair as
`FRAMEWORK_CAPTURE_DEFECT` / `CAPTURE_INCOMPLETE`; no product finding was
admitted. Sanitized matrix:
`artifacts/phase2c-nightwatch-20260831T085807Z-7767-matrix.json`.
When: 2026-08-31

Command: `npx playwright test tests/unit/networkObserverSettlement.test.ts --project=nightwatch --workers=1 --retries=0`
Result: PASS; 1 passed, 0 skipped, 0 failed in 8.8 seconds. The local
truncated JSON response caused a finite `BODY_READ_TIMEOUT` diagnostic and
`INCOMPLETE` capture status; the observer did not wait for context teardown.
When: 2026-08-31

Command: `npx playwright test tests/unit/networkObserverSettlement.test.ts tests/unit/observationSettlement.test.ts tests/unit/rippleReadiness.test.ts tests/unit/phase2cOracleMatrix.test.ts --project=nightwatch --workers=1 --retries=0`
Result: PASS; 41 passed, 0 skipped, 0 failed in 9.3 seconds, including
settlement, capture-diagnostic, replay-attribution, and parser-boundary
regressions.
When: 2026-08-31

Command: `npm run typecheck`
Result: PASS; TypeScript compilation completed with no diagnostics after the
bounded response-capture repair.
When: 2026-08-31

Command: `npm run hardening:check`
Result: PASS; offline structural invariants hold after the bounded
response-capture repair.
When: 2026-08-31

Command: `NIGHTWATCH_HEADED=0 npm run journey:phase2c -- --env=dev --storage-state=/home/dalepalaca/.nightwatch/auth/ripple-dev-state.json`
Result: FAIL as independent post-DVR-003 invocation at
`nightwatch-20260831T092548Z-f5ee`; payer c1 passed with complete capture and
settlement, while payer c2 had valid auth and zero safety counters but one
passive `UNKNOWN` JSON/XHR body timed out. Both intentional known-read JSON
responses completed in both contexts. Strict comparison classified the pair as
`FRAMEWORK_CAPTURE_DEFECT` / `CAPTURE_INCOMPLETE` with
`oracle-or-result-status`; no product finding was admitted. Sanitized matrix:
`artifacts/phase2c-nightwatch-20260831T092548Z-f5ee-matrix.json`.
When: 2026-08-31

Command: `npx playwright test tests/unit/networkObserverSettlement.test.ts --project=nightwatch --workers=1 --retries=0`
Result: PASS; 1 passed, 0 skipped, 0 failed in 14.8 seconds. The local
regression proves passive truncated JSON emits a per-response timeout without
changing intentional capture health, while an intentional known-read timeout
remains `INCOMPLETE` with `BODY_READ_TIMEOUT`.
When: 2026-08-31

Command: `NIGHTWATCH_HEADED=0 npm run journey:phase2c -- --env=dev --storage-state=/home/dalepalaca/.nightwatch/auth/ripple-dev-state.json`
Result: FAIL as independent post-DVR-004 invocation at
`nightwatch-20260831T093257Z-bb5a`; the payer pair passed strict replay with
complete intentional capture, but the common pair diverged. Common c1 had
valid auth and zero safety counters but bootstrap 5xx responses, no rendered
shell, and no required read; c2 passed. The comparator reported
`structural-checkpoints`, `step-results`, `semantic-endpoint-families`,
`semantic-request-ledger`, `oracle-set`, `oracle-or-result-status`, and
`resource-lifecycle`; c1 was labeled `FRAMEWORK_CAPTURE_DEFECT` /
`CAPTURE_STATUS_UNKNOWN` before the attribution repair. No product finding was
admitted. Sanitized matrix:
`artifacts/phase2c-nightwatch-20260831T093257Z-bb5a-matrix.json`.
When: 2026-08-31

Command: `npx playwright test tests/unit/phase2cOracleMatrix.test.ts --project=nightwatch --workers=1 --retries=0 && npm run typecheck && npm run hardening:check`
Result: PASS; 16 Phase 2C matrix tests passed, TypeScript typecheck passed,
and hardening structural checks passed after the DVR-005 precedence repair.
When: 2026-08-31

Command: `npm run observe:preflight -- --env=dev`
Result: PASS immediately before the post-DVR-005 real run; the approved DEV
target and auth host were allowed, production was denied, and the owner-local
state path remained mode 0600 without reading its contents.
When: 2026-08-31

Command: `NIGHTWATCH_HEADED=0 npm run explore:phase4 -- --env=dev --storage-state=/home/dalepalaca/.nightwatch/auth/ripple-dev-state.json`
Result: BOUNDED PRODUCT/ENVIRONMENT FAILURE at base run
`nightwatch-20260831T095007Z-246e`. The Phase 4 safety gate passed. Context
`seed=0x...0101` passed its payer anchor and completed one bounded transition
(`SAFE_FRONTIER_EXHAUSTED`, oracle PASS, settled, capture complete, safety
zero). Fresh context `seed=0x...0102` had valid auth, settled observation,
complete capture, and zero safety counters but failed the anchor on repeated
critical bootstrap HTTP 502 responses classified by the product oracle as
`PRODUCT_BEHAVIOR_ANOMALY`; the separate image 502 was a non-causal
`DEV_INFRA_TRANSIENT`. The launcher stopped fail-closed before the remaining
seed corpus and exact replay. Sanitized manifests:
`artifacts/nightwatch-20260831T095007Z-246e-E1-J1-payer-exchange-0/manifest.json`
and
`artifacts/nightwatch-20260831T095007Z-246e-E1-J1-payer-exchange-1/manifest.json`.
When: 2026-08-31

Command: `npm run observe:preflight -- --env=dev`
Result: PASS immediately before Phase 5; the approved DEV target remained
allowlisted, production remained explicitly denied, and preflight performed no
network activity.
When: 2026-08-31

Command: `NIGHTWATCH_HEADED=0 npm run api:phase5 -- --env=dev --storage-state=/home/dalepalaca/.nightwatch/auth/ripple-dev-state.json`
Result: PASS; run `nightwatch-20260831T095813Z-09be` completed six serial
first executions and six fresh replays in 27.4 seconds. Every record was
DEV-verified with `ORACLE_PASS`, 2xx status, valid JSON/complete JSON chunks,
and identical first/replay fingerprints. Auth remained external-owner-only
with no auto-refresh or MFA; the native Nightwatch relay fallback ran with
zero safety counters and zero privacy persistence. Sanitized ledger:
`artifacts/nightwatch-20260831T095813Z-09be-phase5-api-ledger.json`.
When: 2026-08-31

Command: `npm run observe:preflight -- --env=dev`
Result: PASS immediately before the Phase 4 confirmation; the approved DEV
target remained allowlisted, production remained explicitly denied, and no
network activity was performed by preflight.
When: 2026-08-31

Command: `NIGHTWATCH_HEADED=0 npm run explore:phase4 -- --env=dev --storage-state=/home/dalepalaca/.nightwatch/auth/ripple-dev-state.json`
Result: BOUNDED PRODUCT ORACLE STOP at base run
`nightwatch-20260831T095337Z-c375`. Payer seeds `0x...0101` and `0x...0102`
and common seeds `0x...0201` and `0x...0202` each passed their anchors and
completed one bounded transition with valid auth, complete capture, settled
observation, and zero safety counters. Account seed `0x...0301` had the same
valid auth/capture/settlement/safety posture but failed its anchor on two
`malformed-json` product oracles (HTTP 200, invalid JSON), with safe
fingerprints `fp:sha256:d491c1b9779adfbcd030cc23` and
`fp:sha256:a9bc7b4b6b075dae9e9b5da3`. The launcher stopped before the
remaining seed corpus and exact replay. Sanitized manifests:
`artifacts/nightwatch-20260831T095337Z-c375-E1-J1-payer-exchange-0/manifest.json`,
`artifacts/nightwatch-20260831T095337Z-c375-E1-J1-payer-exchange-1/manifest.json`,
`artifacts/nightwatch-20260831T095337Z-c375-E2-J2-common-exchange-0/manifest.json`,
`artifacts/nightwatch-20260831T095337Z-c375-E2-J2-common-exchange-1/manifest.json`,
and `artifacts/nightwatch-20260831T095337Z-c375-E3-J3-account-inventory-0/manifest.json`.
When: 2026-08-31

Command: `NIGHTWATCH_HEADED=0 npm run journey:phase2c -- --env=dev --storage-state=/home/dalepalaca/.nightwatch/auth/ripple-dev-state.json`
Result: PASS for framework/replay reliability as independent invocation
`nightwatch-20260831T094029Z-e57a`. Payer and common journeys each had two
valid-auth, zero-safety, `captureStatus=COMPLETE`, `observationSettlement=SETTLED`
observations; payer replay was `MATCH`, and common replay was bounded
`BENIGN_TELEMETRY_VARIATION`, both with no strict invariant mismatches. The
account-inventory pair had the same settled `PRODUCT_ORACLE_FAILURE` in both
contexts; its replay had no strict mismatches and was classified
`EXPECTED_PRODUCT_STATE_DRIFT`. Matrix:
`artifacts/phase2c-nightwatch-20260831T094029Z-e57a-matrix.json`.
When: 2026-08-31

Command: `npx playwright test tests/unit/campaign.test.ts --project=nightwatch --workers=1 --retries=0 --grep "canonicalizes duplicate occurrence fingerprints"`
Result: PASS; the deterministic regression accepts a unique execution
summary, preserves both original duplicate occurrence records, and validates
the resulting checkpoint against its manifest.
When: 2026-08-31

Command: `npx playwright test tests/unit/campaign.test.ts --project=nightwatch --workers=1 --retries=0`
Result: PASS; 30 passed, 0 skipped, 0 failed in 3.6 seconds, including
campaign execution, duplicate-occurrence canonicalization, interruption,
resume, privacy, and persistence fixtures.
When: 2026-08-31

Command: `npx playwright test tests/unit/phase15pCheckpointDrift.test.ts tests/unit/phase15CampaignTriageIntegration.test.ts --project=nightwatch --workers=1 --retries=0`
Result: PASS; 30 passed, 0 skipped, 0 failed in 5.0 seconds, including
duplicate-occurrence clustering, checkpoint compatibility, resume, and
triage integration coverage.
When: 2026-08-31

Command: `npm run typecheck`
Result: PASS after the DVR-006 implementation checkpoint
`3cbe5f2f36dcaf4d94aa0a203649126aedb26be3`.
When: 2026-08-31

Command: `npm run hardening:check`
Result: PASS; offline structural invariants hold after the DVR-006 repair.
When: 2026-08-31

## Files Changed

| Path | Purpose | Status |
|---|---|---|
| `.agent/ACTIVE_TASK.md` | active successor routing | in progress |
| `.agent/EXECUTION_PROMPT.md` | executor handoff | in progress |
| `.agent/tasks/nightwatch-dev-requalification-v1/` | successor continuity records | in progress |
| `openspec/changes/nightwatch-dev-requalification-v1/` | bounded requalification proposal/spec/tasks | in progress |
| `docs/CURRENT_STATE.md` | live project snapshot | in progress |
| `docs/ROADMAP.md` | current roadmap entry | in progress |
| `src/core/journeys/observationClassification.ts` | deterministic single-observation attribution | validated locally |
| `tests/manual/phase2c-real-journeys.ts` | use shared observation attribution and safe diagnostics | validated locally |
| `tests/unit/phase2cOracleMatrix.test.ts` | regression for framework/product/unknown attribution | validated locally |
| `src/browser/observers/networkObserver.ts` | narrow active journey settlement tracking to known reads | validated locally |
| `src/browser/observers/stability.ts` | document settlement signal contract | validated locally |
| `tests/unit/networkObserverSettlement.test.ts` | hanging passive/known-read lifecycle regression | validated locally |
| `src/core/campaign/orchestrator.ts` | canonicalize set-valued execution fingerprint summary | validated at `3cbe5f2` |
| `tests/unit/campaign.test.ts` | duplicate occurrence/checkpoint regression | validated at `3cbe5f2` |

## Decisions Made During This Task

- Use a separate successor because the prior reliability task is terminal.
- Preserve `OPERATIONALLY_ACCEPTED` explicitly during bounded read-only
  observations; use `REEVALUATE` if validated evidence invalidates it.
- Keep single-observation attribution in a pure shared classifier: safety,
  auth, settlement, and capture health take precedence over oracle class, and
  unclassified failed oracles remain `UNKNOWN`.

## Defect Ledger

| ID | Severity | Subsystem | Discovery source | Reproduction | Root cause | Fix | Regression | Validation | Final disposition |
|---|---|---|---|---|---|---|---|---|---|
| DVR-001 | HIGH | Phase 2C final classification | Fresh guarded DEV invocation 1 | `nightwatch-20260831T083408Z-9a6c-j1-c1` and `...-c2`; both had `observationSettlement=TIMED_OUT`, `captureStatus=INCOMPLETE`, `oracleStatus=FAIL`, while pair comparison returned `FRAMEWORK_CAPTURE_DEFECT` / `SETTLEMENT_TIMEOUT` | `tests/manual/phase2c-real-journeys.ts` mapped generic `oracleStatus=FAIL` to `PRODUCT_BEHAVIOR_ANOMALY` before considering framework capture health | Shared `classifyJourneyObservation` checks settlement/capture before product attribution and retains explicit Nightwatch/unknown classes | `tests/unit/phase2cOracleMatrix.test.ts` single-observation classification regression | `npm run typecheck`, `npm run hardening:check`, and focused Phase 2C matrix: PASS; invocation 2 retained framework attribution | Fixed and confirmed by invocation 2; no product finding admitted |
| DVR-002 | HIGH | Phase 2C settlement barrier | Fresh guarded DEV invocation 2 after DVR-001 repair | `nightwatch-20260831T084705Z-849e-j1-c1` and `...-c2`; `pendingHandlers=0`, `activeJourney=24/4`, and resource ledgers showed 22/3 unfinished critical-script requests plus passive unknown/image requests; both known reads completed | `activeJourneyRequestCount` tracked every request carrying journey intent, including page subresources and unreviewed passive traffic; the barrier required that broad count to reach zero | `activeJourneyRequestCount` now tracks only source-reviewed `KNOWN_READ` requests; all response handlers remain covered by the independent pending-handler barrier | `tests/unit/networkObserverSettlement.test.ts` hanging passive subresource and known-read cases | `npm run typecheck`, `npm run hardening:check`, and 40-test focused cone: PASS; invocation 3 settled the payer pair | Fixed and confirmed by invocation 3; no product finding admitted |
| DVR-003 | HIGH | Phase 2C response capture | Fresh guarded DEV invocation 3 after DVR-002 repair | `nightwatch-20260831T085807Z-7767-j1-c2`; settlement was `SETTLED`, auth was valid, safety counters were zero, but one source-reviewed known-read JSON/XHR response was `bodyCapture=unavailable`, making the observation incomplete and the pair diverge on `oracle-or-result-status` | Response-body reads were unbounded and emitted no safe reason, so a truncated/never-ending response could keep capture pending or leave the failure unexplained | Response-body reads are bounded to 5 seconds; failures emit one of five bounded codes and propagate through evidence/classification/replay without raw error text | `tests/unit/networkObserverSettlement.test.ts` truncated JSON response; `tests/unit/phase2cOracleMatrix.test.ts` diagnostic/parser regressions | Typecheck, hardening, focused 41-test cone, and local capture regression: PASS; invocation 4 completed both intentional known-read bodies | Fixed at `1d3eb0a` and confirmed by invocation 4; passive timeout remained separately classified |
| DVR-004 | HIGH | Phase 2C capture attribution | Fresh guarded DEV invocation 4 after DVR-003 repair | `nightwatch-20260831T092548Z-f5ee`; both contexts captured both intentional known-read JSON responses completely, but c2 had one passive `UNKNOWN` JSON/XHR body with `BODY_READ_TIMEOUT`; global capture status became `INCOMPLETE` and strict replay diverged on `oracle-or-result-status` | Capture health and its failure-code ledger aggregated every JSON-ish response, so unrelated passive/background capture instability changed the journey verdict | `captureStatus`/`captureFailureCodes` now aggregate only requests carrying active journey intent and `KNOWN_READ`; per-response passive diagnostics remain observable and intentional reads remain strict | `tests/unit/networkObserverSettlement.test.ts` passive and intentional truncated-response cases | `224801f`; payer pair passed strict replay in the next real invocation; invocation 6 retained complete intentional capture | Fixed at `224801f` and confirmed by invocations 5-6; no product finding admitted |
| DVR-005 | HIGH | Phase 2C observation attribution | Fresh guarded DEV invocation 5 after DVR-004 repair | `nightwatch-20260831T093257Z-bb5a-j2-c1`; bootstrap 5xx/required-read and structural failures left intentional capture `UNKNOWN`, but the classifier reported `FRAMEWORK_CAPTURE_DEFECT` / `CAPTURE_STATUS_UNKNOWN` and masked explicit non-capture evidence | Unknown capture status was treated as a framework defect before checking whether the observation had independently failed; no intentional known-read capture had been attempted | `UNKNOWN` capture health is a framework defect only for an otherwise passing observation; explicit failed evidence proceeds to product/environment/unknown attribution | `tests/unit/phase2cOracleMatrix.test.ts` unknown-capture precedence regressions | `d1b9f31`; local matrix/typecheck/hardening pass; invocation 6 produced passing payer/common and product-classified account outcomes | Fixed at `d1b9f31` and confirmed by invocation 6; no Nightwatch defect or product finding was masked |
| DVR-006 | HIGH | Campaign checkpoint execution summary | Guarded Phase 7 campaign resume | Campaign `campaign:sha256:394f3fd1ed3828e2914a6373`; first payer work item emitted two occurrence observations with the same `fp:sha256:bba7c1fd5564ece993a0238f`, and resume failed closed with `CHECKPOINT_EXECUTION_FINGERPRINTS:DUPLICATE` | `CampaignOrchestrator` copied every observation fingerprint into the execution record summary, while checkpoint integrity correctly requires that identity summary to be unique; legitimate repeated occurrences crossed the wrong abstraction boundary | `3cbe5f2f36dcaf4d94aa0a203649126aedb26be3` canonicalizes only the execution summary to a sorted unique set; duplicate observations and cluster occurrence counts remain intact | `tests/unit/campaign.test.ts` duplicate-occurrence checkpoint/resume regression | Focused regression, full campaign suite (30), checkpoint/triage cone (30), typecheck, and hardening: PASS; exact DEV resume pending | Fixed locally; original fail-closed DEV result retained, exact resumed campaign still required |

## Discoveries

- The predecessor was terminal as required; the refreshed auth boundary is a
  new owner-authorized observation condition.
- The auth capture path reached the approved DEV Ripple target, waited for
  manual login/MFA, and closed with safe validation.
- Invocation 1 did not establish a product anomaly: the bounded settlement
  barrier timed out with no pending handlers, three active requests, and zero
  safety violations. The sanitized matrix is
  `artifacts/phase2c-nightwatch-20260831T083408Z-9a6c-matrix.json`.
- The replay classifier already preserved the framework attribution, exposing
  a mismatch between core replay semantics and the manual runner's per-
  observation classification.
- A shared pure classifier now aligns the real runner's per-observation
  result with the replay health boundary and emits bounded reason/code
  diagnostics; generic failed oracle status alone no longer creates a product
  finding.
- The post-fix run confirms DVR-001 is repaired: both per-observation rows
  and the pair comparison retained `FRAMEWORK_CAPTURE_DEFECT` /
  `SETTLEMENT_TIMEOUT`.
- The settlement barrier's `activeJourneyRequests` signal is broader than its
  name implies. It includes navigation-created static resources and passive
  unknown requests, so a slow or never-ending page subresource can block a
  semantically complete known-read observation even when no oracle handler is
  pending.
- The narrowed observer signal separates journey semantics from incidental
  page loading: known-read lifecycle remains blocking, while passive resource
  loading remains visible but cannot hold the semantic settlement barrier.
- The third independent invocation confirms the narrowed barrier can settle,
  but exposed a separate capture defect: one known-read JSON/XHR body was
  unavailable after settlement. The strict replay failure is preserved as a
  framework capture defect, not a product anomaly, and raw response/error
  details were not copied into task evidence.
- The fourth invocation confirms the payer pair can pass strict replay after
  capture health is scoped to intentional reads. The common pair independently
  encountered bootstrap 5xx and missing-read evidence; unknown capture status
  must not erase that stronger failure signal. This is tracked as DVR-005.
- The sixth invocation confirms the DVR-005 precedence repair on the real
  path. Two read journeys settled with complete intentional capture and strict
  replay agreement. The account journey independently reproduced the same
  product oracle failure twice; the bounded replay difference was product
  state drift, with auth/safety/capture health equivalent and no Nightwatch
  capture failure.
- Phase 4 has a separate real-system stability signal: one fresh context
  completed its bounded exploration, while the next valid-auth context failed
  the anchor on repeated critical bootstrap 502s. This is product/environment
  evidence, not a Nightwatch capture or safety failure; the launcher correctly
  stopped before treating later exploration as valid.
- The bounded Phase 4 confirmation passed payer 2/2 and common 2/2 after the
  earlier payer bootstrap failure, while account inventory again failed on
  malformed JSON with two stable sanitized fingerprints. This supports a
  product-surface anomaly classification rather than a Nightwatch lifecycle
  defect; the launcher remained fail closed and did not run exact replay after
  a failed anchor.
- Phase 5 passed all six source-generated API operations and all six fresh
  replays, including account-inventory and billing-groups reads that are
  implicated by the browser-only malformed-JSON observation. This narrows the
  product evidence to a context-specific browser observation; it does not
  authorize changing the product or weakening the browser oracle.
- Campaign prepare passed with five selected read-only work items, but exact
  resume exposed a new High Nightwatch checkpoint defect. The first payer
  work item retained two legitimate repeated anomaly occurrences with one
  identity fingerprint; the orchestrator incorrectly serialized both into a
  set-valued execution summary, so the fail-closed validator rejected the
  checkpoint before any work item could complete. The persisted state is
  `IN_PROGRESS`/`RUNNING`, but must not be trusted for continuation until the
  local repair proves resume behavior.
- The local repair confirms the correct boundary: the execution summary now
  has one sorted fingerprint while both original occurrences and the fresh
  reproduction remain in their respective evidence ledgers. Strict checkpoint
  validation, campaign resume fixtures, and triage clustering remain intact.

## Safety Events

NONE.

## Completion Snapshot

No terminal snapshot has been recorded; the bounded evidence sample is still
open.

## Deferred / Follow-Up

- Any source family below the mechanical proof bar.
- Any production, NEXT, mutation, data, infrastructure, publication, or
  sibling-repository operation.
- Larger DEV soak beyond the fixed sample requires a separate authorization.
