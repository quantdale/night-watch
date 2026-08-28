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
launchers.

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

Real DEV launchers remain unexecuted because the execution harness refused
authenticated `--env=dev` runs. Extra unmerged swarm local branches and remote
`plan/*` heads remain because ordinary destructive Git deletion was refused.

## Exact Next Action

Run `npm run journey:phase2c -- --env=dev --storage-state=$HOME/.nightwatch/auth/ripple-dev-state.json` with `NIGHTWATCH_HEADED=0`, then phase4, phase5, and campaign:real prepare then resume.

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

## Decisions Made During This Task

- Keep `PROJECT_COMPLETE_LOCAL_CLEAN_CERTIFIED` valid only for COMPLETE
  historical local-clean records.
- Pair `IMPLEMENTATION_COMPLETE_OPERATIONAL_ACCEPTANCE_PENDING` with
  IN_PROGRESS.
- Do not treat synthetic certification as operational acceptance.

## Discoveries

- Storage-state `$HOME/.nightwatch/auth/ripple-dev-state.json` exists as a
  regular non-symlink file mode `600`.
- Duplicate isolated clones and local swarm branches are redundant with
  `origin/main`; remote `plan/*` branches contain superseded planning docs.

## Blockers

None.

## Safety Events

NONE

## Deferred / Follow-Up

Complete remaining Git topology deletions (unmerged swarm refs, remote plan
heads, isolated clones) using ordinary Git/fs deletion.

## Resume Recipe

Resume from M4: run the existing serial DEV launchers with the external
storage-state. Do not treat local/clean certification as operational
acceptance. Extra swarm/plan refs and duplicate clones remain until ordinary
Git/fs deletion is permitted.

## Completion Snapshot

Not complete. Operational acceptance pending.
