# Task State

## Identity

Task ID: nightwatch-dev-soak-replay-yield-v1
Phase: DEV_SOAK_REPLAY_YIELD_V1
Status: IN_PROGRESS
Starting SHA: 754aa629b4b24bda0eca98fe567cc44ef536e30d
Last validated implementation SHA: fa236b690ceace3a420771645fce9f99bf751ea8
Last substantive checkpoint SHA: fa236b690ceace3a420771645fce9f99bf751ea8
Branch: main
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 754aa629b4b24bda0eca98fe567cc44ef536e30d
LAST_VALIDATED_IMPLEMENTATION_SHA: fa236b690ceace3a420771645fce9f99bf751ea8
LAST_SUBSTANTIVE_CHECKPOINT_SHA: fa236b690ceace3a420771645fce9f99bf751ea8
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_DEV_SOAK_REPLAY_YIELD_V1_STATUS: IN_PROGRESS

## Objective

Measure the residual capture/yield limitation after DVR-012 over a materially
larger bounded serial DEV sample, and obtain current replay/dossier evidence
without weakening DVR-011 admission.

## Current Milestone

M2 — Cross-phase reliability.

## Work In Progress

M1 is COMPLETE. M2 runs five serial Phase 4 explorations followed by five
serial Phase 5 API first/fresh-replay cycles. All ten M1 launchers completed
as independent attempts; sanitized matrices and the local timeout regression
are recorded above.

## Exact Next Action

Execute five guarded Phase 4 explorations, then five guarded Phase 5 API
cycles. Preserve API/browser discrepancies, body-capture codes, settlement
classes, and cleanup/resource health without retries.

## Known starting evidence

- Predecessor `nightwatch-dev-requalification-v1`: COMPLETE.
- DVR-012 implementation checkpoint: `fa236b690ceace3a420771645fce9f99bf751ea8`.
- Final predecessor campaign: `campaign:sha256:1054b8271440fc29f7fb5f21`.
- Terminal: `PARTIAL_RUNTIME_INFRA_FAILURE / PREFLIGHT_FAILED`.
- Limitation: `BODY_UNAVAILABLE`.
- Candidates/dossiers: 0/0.
- Safety: zero.
- Privacy: PASS.
- Replay: not executed because no fresh admitted candidate existed.
## Completed Milestones
- M0 — Baseline, freshness, safety, and owner-auth readiness — COMPLETE at
  `30db50f` with the full offline gate evidence ledger below.

- M1 — Phase 2C capture soak — COMPLETE: ten independent serial launchers
  produced ten fresh matrix files, 56/60 possible observations, and 28/30
  replay comparisons. The seventh invocation stopped after its payer pair at a
  bounded framework capture defect; no retry was substituted.

## Files Changed

- `.agent/tasks/nightwatch-dev-soak-replay-yield-v1/PLAN.md`
- `.agent/tasks/nightwatch-dev-soak-replay-yield-v1/STATE.md`

No product, Alphaus sibling-repository, credential, storage-state, or runtime
evidence files were changed.

## Validation Ledger

- `git fetch --prune origin` — PASS; remote advanced and was reconciled.
- `git pull --ff-only origin main` — PASS; local `main` equals `origin/main`
  at `30db50f` before this update.
- `npm ci` — PASS; pinned dependencies restored.
- `npm run typecheck` — PASS.
- `npm run hardening:check` — PASS.
- `npm run agent:check` — PASS after continuity-document repair.
- `npm run agent:audit` — PASS with inventory 93 tasks, legacy warnings only.
- `npm run handoff:check` — PASS with derived live head `30db50f`.
- `npm run project:check` — PASS after pushing `30db50f`.
- `npm run quality-gate:spec` — PASS.
- `npm run gate:inventory` — PASS.
- `npm run test:semantic-compat` — PASS with 1950/1937/13/0.
- `npm run test:owner-provenance` — PASS with 91 passed.
- `npm run campaign:synthetic` — PASS with 77 passed.
- `npm run gate:local` — PASS.
- `npx playwright test tests/unit/observationSettlement.test.ts tests/unit/phase2cOracleMatrix.test.ts tests/unit/phase5Api.test.ts` — PASS
  with 34/0.
- `npm run observe:preflight -- --env=dev` — PASS; production explicitly
  denied for `appdev.alphaus.cloud` without network contact.
- `npm run status:local -- --json` — PASS; scope `LOCAL_SYNTHETIC_ONLY`.
- `npm run campaign:source-gaps` — PASS; 128 candidates produced/0 eligible.
- `npm run gate:predev` — PASS with inventory identical to `gate:local`.

## Decisions Made During This Task

- Completed M0 and left executable source unchanged at
  `fa236b690ceace3a420771645fce9f99bf751ea8` so fresh DEV soak remains
  invalidated by documentation-only advancement.

## Discoveries

- The ten matrices were all produced at `nightwatchSha` equal to
  `f399e32577603542050535e5f41aa7912d71a08a`.
- Observation totals: 56; evidence PASS 37; product-behavior anomalies 13;
  framework-capture-defect classifications 6.
- Per journey: payer 20 observations/19 PASS; common 18/18 PASS; account
  inventory 18/0 PASS.
- Primary failures: `malformed-json` 17 and `critical-resource-status` 1.
  Capture status was COMPLETE 54 and INCOMPLETE 2; settlement was SETTLED 50
  and TIMED_OUT 6. The two incomplete observations carried exactly
  `BODY_READ_TIMEOUT`; `BODY_UNAVAILABLE` occurred zero times.
- Resource lifecycle totals were REQUESTED 11,262, COMPLETED 10,867,
  CANCELED_BY_POLICY 317, and HTTP_FAILED 18. Auth was valid 56/56, privacy
  PASS 56/56, and safety PASS 56/56.
- Replay classifications: BENIGN_TELEMETRY_VARIATION 6,
  TIMING_ONLY_OBSERVATION_DIFFERENCE 12, EXPECTED_PRODUCT_STATE_DRIFT 4,
  FRAMEWORK_CAPTURE_DEFECT 5, and DETERMINISTIC_REPLAY_MISMATCH 1; 18/28
  comparisons passed.
- Local `networkObserverSettlement.test.ts` and
  `phase2cOracleMatrix.test.ts` reproduced the bounded timeout contract:
  18/18 tests passed. No Nightwatch-owned Critical/High defect was found;
  current failures remain product/runtime evidence or bounded capture
  incompleteness, not a repaired source defect.

## Blockers

None in M0. Real execution remains at the owner-managed auth boundary.

## Safety Events

None in the M1 observations: every observation reported auth valid, privacy
PASS, and safety PASS; the journeys were read-only and no mutation, database,
infrastructure, production, or publication operation was performed.

## Deferred / Follow-Up

- Continue M2 with five guarded Phase 4 explorations and five Phase 5 API
  first/fresh-replay cycles.
- Preserve all M1 matrices as local sanitized evidence; never treat them as
  current replay authority unless admission explicitly promotes a candidate.

## Resume Recipe

Re-read `ACTIVE_TASK.md`, this `STATE.md`, `PLAN.md`, and `SPEC.md`; verify
clean `main == origin/main`; execute M2 through the guarded serial launchers.
If the owner-managed auth state becomes invalid, stop at
`HUMAN_AUTH_ACTION_REQUIRED`; never print or inspect credential contents.

## Completion Snapshot

IN_PROGRESS — M0 and M1 are complete. M1 measured a 56-observation result
under ten independent launches, with bounded product and capture failures
recorded above; M2 is next.
