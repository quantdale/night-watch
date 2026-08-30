# Task State

## Identity

Task ID: nightwatch-operational-acceptance-v1
Phase: OPERATIONAL_ACCEPTANCE_V1
Status: IN_PROGRESS
Starting SHA: a17c6aebaaf50a933bcd9be77474f0b9cf0b93dd
Last validated implementation SHA: e278da19f5fbc62107528033716f271cbb64e1de
Last substantive checkpoint SHA: e278da19f5fbc62107528033716f271cbb64e1de
Branch: main
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: a17c6aebaaf50a933bcd9be77474f0b9cf0b93dd
LAST_VALIDATED_IMPLEMENTATION_SHA: e278da19f5fbc62107528033716f271cbb64e1de
LAST_SUBSTANTIVE_CHECKPOINT_SHA: e278da19f5fbc62107528033716f271cbb64e1de
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_OPERATIONAL_ACCEPTANCE_V1_STATUS: IN_PROGRESS

## Objective

Clean the Nightwatch Git topology, reclassify local/clean certification as
non-operational, and prove or truthfully fail real DEV operational acceptance.

## Current Milestone

Milestone ID: M4
Milestone status: IN_PROGRESS
What is being attempted: serial real DEV owner workflow through existing
launchers. Safety gates pass, but the external auth state is currently not
page-valid and guarded replacement stops before product execution.

## Completed Milestones

- Canonical fetch/prune: repo at
  `/home/dalepalaca/go/src/alphaus-main/REPOSITORIES/nightwatch`, origin
  `https://github.com/quantdale/night-watch.git`. Starting SHA
  `a17c6aebaaf50a933bcd9be77474f0b9cf0b93dd`; pairing commit `b83282b` is on
  `origin/main`.
- Clone audit: isolated clones are ancestors or superseded; plan branches are
  historical planning docs; swarm unique files exist on `main`. Stale swarm
  worktrees pruned; merged local branches deleted.
- Project-state pairing tests 29–37 passed on the real checker (`43 passed`).
- Preflight at `b83282b`: typecheck, hardening, agent, project, handoff,
  `gate:local` (`receipt:sha256:ce2314058f4a27b52c2970a9`) and `gate:clean`
  (`clean-receipt:sha256:7978d389fc619cddb8812461`, Node 20) PASS.
- Owner CLI local smoke: `node bin/nightwatch.mjs --env=local` 1 passed.
- Real launchers now forward captured child stdio (`emitChildStdio`).

## Work In Progress

Real DEV launchers reach their safety gates but remain product-unexecuted:
phase2c stops with `HUMAN_AUTH_ACTION_REQUIRED`, while phase4, phase5, and
campaign prepare stop with `AUTH_STATE_REPLACEMENT_FAILED`. A human owner must
refresh the external DEV state before the real workflow can continue. Extra
unmerged swarm local branches, remote `plan/*` heads, and one dirty isolated
clone remain under topology cleanup pending redundancy-safe deletion.

## Exact Next Action

Human owner runs `NIGHTWATCH_HEADED=1 npm run auth:capture -- --env=dev --output="$HOME/.nightwatch/auth/ripple-dev-state.json"` from an interactive terminal; after a successful sanitized capture, rerun phase2c, phase4, phase5, and campaign `--prepare-only` then `--resume-campaign=<id>` serially.

## Files Changed

| Path | Reason | Status |
|---|---|---|
| `bin/project-state-check.mjs` | Operational completion pairing | done |
| `tests/unit/projectState.test.ts` | Real-checker regressions | done |
| `bin/child-environment.mjs` | emitChildStdio helper | done |
| `bin/phase2c-real.mjs` | Forward child stdio | done |
| `bin/phase4-real.mjs` | Forward child stdio | done |
| `bin/phase5-real.mjs` | Forward child stdio | done |
| `bin/phase7-real.mjs` | Forward child stdio | done |
| `bin/nightwatch.mjs` | Forward child stdio | done |

## Validation Ledger

Command: `npx playwright test tests/unit/projectState.test.ts --project=nightwatch --workers=1 --retries=0`
Result: PASS
When: 2026-08-29
Relevant failure/output summary: 43 passed / 0 failed, including tests 29–37
for operational-acceptance pairing.

Command: `npm run gate:local`
Result: PASS
When: 2026-08-29
Relevant failure/output summary: receipt `receipt:sha256:ce2314058f4a27b52c2970a9` at `b83282b`.

Command: `npm run gate:clean`
Result: PASS
When: 2026-08-29
Relevant failure/output summary: `clean-receipt:sha256:7978d389fc619cddb8812461` Node 20.

Command: `npx playwright test tests/unit/childEnvironment.test.ts --project=nightwatch --workers=1 --retries=0`
Result: PASS
When: 2026-08-29
Relevant failure/output summary: 4 passed, including emitChildStdio and launcher order.

Command: `node bin/nightwatch.mjs --env=local`
Result: PASS
When: 2026-08-29
Relevant failure/output summary: local.smoke 1 passed / 0 failed; child stdio visible.

Command: `NIGHTWATCH_HEADED=0 npm run journey:phase2c -- --env=dev --storage-state=$HOME/.nightwatch/auth/ripple-dev-state.json`
Result: FAIL_CLOSED / HUMAN_AUTH_ACTION_REQUIRED
When: 2026-08-30
Relevant failure/output summary: Phase 2A safety gate passed (13/13 checks); Phase 2C stopped before browser context because the external DEV state was not valid. No product request ran.

Command: `NIGHTWATCH_HEADED=0 npm run explore:phase4 -- --env=dev --storage-state=$HOME/.nightwatch/auth/ripple-dev-state.json`
Result: FAIL_CLOSED / AUTH_STATE_REPLACEMENT_FAILED
When: 2026-08-30
Relevant failure/output summary: safety gate passed (13/13 checks); guarded DEV auth replacement stopped before seeded exploration.

Command: `NIGHTWATCH_HEADED=0 npm run api:phase5 -- --env=dev --storage-state=$HOME/.nightwatch/auth/ripple-dev-state.json`
Result: FAIL_CLOSED / AUTH_STATE_REPLACEMENT_FAILED
When: 2026-08-30
Relevant failure/output summary: bounded API runner stopped during guarded auth refresh; no API operation ran.

Command: `NIGHTWATCH_HEADED=0 npm run campaign:real -- --env=dev --prepare-only --storage-state=$HOME/.nightwatch/auth/ripple-dev-state.json`
Result: FAIL_CLOSED / AUTH_STATE_REPLACEMENT_FAILED
When: 2026-08-30
Relevant failure/output summary: prepare stopped in guarded auth refresh before campaign manifest/checkpoint creation or executor use.

Command: `NIGHTWATCH_HEADED=0 npm run campaign:real -- --env=dev --resume-campaign=campaign:sha256:000000000000000000000000 --storage-state=$HOME/.nightwatch/auth/ripple-dev-state.json`
Result: FAIL_CLOSED / MALFORMED_JSON
When: 2026-08-30
Relevant failure/output summary: exact-ID resume stopped at private manifest validation before auth or product execution; no evidence was promoted.

Command: `npx playwright test tests/unit/phase16chLauncherBoundary.test.ts tests/unit/realRunGate.test.ts tests/unit/storageState.test.ts tests/unit/authCaptureLauncher.test.ts --project=nightwatch --workers=1 --retries=0`
Result: PASS
When: 2026-08-30
Relevant failure/output summary: 47 passed / 0 failed; launcher, gate, storage-state, and human-capture fail-closed cases remain green.

Command: `npx playwright test tests/unit/aiOwnerReview.test.ts tests/unit/phase15CheckpointCompat.test.ts tests/unit/phase16chFingerprintResumeHardening.test.ts --project=nightwatch --workers=1 --retries=0`
Result: PASS
When: 2026-08-30
Relevant failure/output summary: 39 passed / 0 failed; owner UX, exact confirmation, idempotence, checkpoint compatibility, drift, and resume boundaries remain green.

Command: `npx playwright test tests/unit/phase15pReleaseRehearsal.test.ts tests/unit/phase15CampaignTriageIntegration.test.ts --project=nightwatch --workers=1 --retries=0`
Result: PASS
When: 2026-08-30
Relevant failure/output summary: 17 passed / 0 failed; integrated owner-local triage, privacy, interruption/resume, and no-false-certification cases remain green.

## Decisions Made During This Task

- Keep `PROJECT_COMPLETE_LOCAL_CLEAN_CERTIFIED` valid only for COMPLETE
  historical local-clean records.
- Pair `IMPLEMENTATION_COMPLETE_OPERATIONAL_ACCEPTANCE_PENDING` with
  IN_PROGRESS.
- Do not treat synthetic certification as operational acceptance.
- Current DEV execution is blocked at the human-auth boundary; the
  operational verdict must remain non-acceptance until a fresh owner capture
  succeeds or the campaign is explicitly terminalized as blocked.

## Discoveries

- Storage-state `$HOME/.nightwatch/auth/ripple-dev-state.json` exists as a
  regular non-symlink file mode `600`.
- Duplicate isolated clones and local swarm branches are redundant with
  `origin/main`; remote `plan/*` branches contain superseded planning docs.
- The historical documentation says the prior 2026-08-13 capture was valid,
  but current launcher evidence on 2026-08-30 supersedes that historical
  snapshot: current page validity is false and guarded replacement returns
  `AUTH_STATE_REPLACEMENT_FAILED`. No state bytes were read into task files.

## Blockers

The external DEV storage state is not page-valid. Unblock condition: a human
owner completes the existing guarded `auth:capture` flow into the same
external path; then the serial real workflow can be rerun. Do not request or
store credentials in Nightwatch.

## Safety Events

NONE — all attempted DEV paths failed closed before product execution; no
production, mutation, data-layer, infrastructure, or publication operation was
performed.

## Deferred / Follow-Up

Complete remaining Git topology deletions (unmerged swarm refs, remote plan
heads, and only redundancy-proven isolated clones) using ordinary Git/fs
deletion. The dirty `nightwatch-isolated-16h` clone requires an explicit
content-equivalence decision before removal.

## Resume Recipe

Resume from the human auth unblock: run the guarded external capture, then the
existing serial DEV launchers. Do not treat local/clean certification as
operational acceptance. Keep the current project status pending until a real
operational verdict is earned; topology cleanup remains separate and
fail-closed.

## Completion Snapshot

Not complete. Operational acceptance pending.
