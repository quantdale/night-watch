# Task State

## Identity

Task ID: phase-23-executable-ci-dev-acceptance
Phase: 23-EXECUTABLE-CI-DEV-ACCEPTANCE
Title: Nightwatch Phase 23 — Executable CI Gate Unification, Clean-Checkout Qualification, and Conditional Contained DEV Acceptance
Authorization class: PHASE_23_CI_GATE_RECOVERY_AND_BOUNDED_DEV_ACCEPTANCE_ONLY
Status: IN_PROGRESS
Starting SHA: ac3df00195eef846a8e9e42615e90b4b912877d2
Last validated implementation SHA: a9e21be07a2d1b3cd62f930eb3b6d7f764cd65d5
Last substantive checkpoint SHA: a9e21be07a2d1b3cd62f930eb3b6d7f764cd65d5
Last documentation checkpoint: DISCOVER_FROM_GIT
Branch: main
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: ac3df00195eef846a8e9e42615e90b4b912877d2
LAST_VALIDATED_IMPLEMENTATION_SHA: a9e21be07a2d1b3cd62f930eb3b6d7f764cd65d5
LAST_SUBSTANTIVE_CHECKPOINT_SHA: a9e21be07a2d1b3cd62f930eb3b6d7f764cd65d5
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_LIVE_HEAD

PHASE_23_STATUS: IN_PROGRESS
PHASE_22_STATUS: BLOCKED_BEFORE_DEV (historical, unchanged)
PHASE_21_STATUS: COMPLETE (historical, unchanged)
PHASE_20_STATUS: COMPLETE (historical, unchanged)
PHASE_19_STATUS: COMPLETE (historical, unchanged)
PHASE_6_STATUS: FROZEN_BY_OWNER
PHASE_11B_STATUS: NOT_AUTHORIZED
PHASE_13B_STATUS: NOT_AUTHORIZED

## Objective

Build one current, versioned, deterministic quality gate shared by local,
clean-checkout, and GitHub Actions execution; mechanically distinguish
repository failures from external CI execution blocks; then conditionally
exercise one fresh, bounded Phase 22 DEV campaign only after exact-head CI and
all pre-DEV gates pass.

## Current Milestone

M8 — validated checkpoint push and exact current-head Actions observation.

## Completed Milestones

- Bootstrap verified the canonical Nightwatch root, `main`, clean worktree,
  synchronized `origin/main`, and exact starting SHA. Required project,
  architecture, safety, roadmap, decisions, CI-hardening, active-task, and
  Phase 22 records were read. Phase 19–22 history remains untouched.
- Existing workflow and package/test entry points were inspected. The old
  workflow is a hand-maintained historical matrix with no authoritative
  Phase 19–23 compatibility command; the baseline inventory is being
  formalized in M0.
- Phase 23 v2 continuity files were created and ACTIVE_TASK was moved from the
  terminal Phase 22 pointer to this fresh successor task.
- The frozen old-workflow inventory is executable and sanitized: 32 steps, 30
  run commands, 21 historical matrix steps, 55 unique test files, and 5
  duplicate executions across `selfDevAdoptionPlan`,
  `selfDevAdoptionSandbox`, and `ownerScope`. It records command, files,
  phase, authority, duplication, environment, sibling, offline, and privacy
  attributes. The new gate inventory is 9 groups, 130 unique test files, and
  0 duplicate executions.
- `nightwatch.quality-gate.v1` and `nightwatch.semantic-compatibility.v1`
  are data-only manifests validated by fixed code registries. The shared
  serial runner exposes `gate:local`, `gate:ci`, `gate:clean`, and
  `gate:predev`, emits safe `nightwatch.quality-gate-receipt.v1` values, and
  never accepts a runtime shell command.
- The GitHub workflow is now checkout/Node20/npm-ci plus exactly one
  `npm run gate:ci`; static parity hardening rejects bypass, auth/product
  execution, private uploads, and permission expansion. The external
  classifier explicitly maps required `steps=[]` to
  `NO_STEPS_BILLING_OR_PLATFORM_BLOCK`; exact-head and gate-digest binding
  are required for `EXECUTED_GREEN`.
- A fresh Phase 23 v2 manifest/dry-run operator, safe CI observer, pre-DEV
  receipt adapter, and conditional one-shot DEV wrapper are implemented. The
  Phase 22 manifest remains historical; its code is used only as a fresh,
  in-memory execution adapter after all Phase 23 authority checks pass.

## Work In Progress

M8 — the substantive implementation checkpoint is `a9e21be07a2d1b3cd62f930eb3b6d7f764cd65d5`.
Local and disposable Node 20 qualification are green; the final task/docs
checkpoint still needs one bounded push and exact current-head Actions
observation. No external CI or DEV authority exists yet.

## Exact Next Action

Run the final documentation-descendant `gate:ci`/`gate:clean`, regenerate the
fresh manifest at that exact checkpoint, verify the tree and privacy surface,
push once to `origin/main`, and inspect only the exact current-head Actions
run. If it returns `steps=[]` or equivalent platform blocking, stop with zero
DEV contact and close as `COMPLETE_LOCAL_BLOCKED_EXTERNAL_CI`.

## Files Changed

- `.agent/ACTIVE_TASK.md`
- `.github/workflows/hardening.yml`
- `bin/hardening-check.mjs`
- `bin/phase23-ci.mjs`
- `bin/phase23-dev.mjs`
- `bin/phase23-predev.mjs`
- `bin/quality-gate-clean.mjs`
- `bin/quality-gate-inventory.mjs`
- `bin/quality-gate-spec.mjs`
- `bin/quality-gate.mjs`
- `bin/semantic-compat.mjs`
- `config/quality-gate.v1.json`
- `config/semantic-compatibility.v1.json`
- `package.json`
- `src/core/phase23/**`
- `src/core/qualityGate/**`
- `src/proxy/portLease.ts`
- `src/proxy/server.ts`
- `tests/globalSetup.ts`
- `tests/unit/aiLocalCanary.test.ts`
- `tests/unit/phase23*.test.ts`
- `.agent/tasks/phase-23-executable-ci-dev-acceptance/{SPEC,PLAN,STATE,ACCEPTANCE_MATRIX,REPORT,HANDOFF}.md`

## Validation Ledger

- Bootstrap Git inspection: PASS — branch `main`, clean worktree, and
  `HEAD == origin/main == ac3df00195eef846a8e9e42615e90b4b912877d2`.
- `kimi-worker doctor`: PASS — optional read-only advisory bridge healthy;
  no worker mutation or external product contact is authorized.
- Historical read set: PASS — AGENTS, required project docs, CI hardening,
  ACTIVE_TASK, and all Phase 22 records read; no Phase 19–22 file changed.
- M0 workflow inspection: PASS — baseline YAML contained checkout, Node 20,
  npm ci, typecheck, hardening, historical Phase 8–12 matrices, project and
  agent checks, owner provenance, synthetic campaign, and whitespace checks; it
  did not invoke a shared current quality gate.
- M0 inventory: PASS — `npm run gate:inventory` reports the baseline and
  current group/file mappings above; baseline `origin` is read from the
  starting SHA so the audit remains truthful after workflow replacement.
- M1 quality-gate focused slice: PASS — `npm run quality-gate:spec` reports
  definition digest `sha256:3d0a4c3f845f91c348a994bb056b130a286c3102e1f86267124328299fa26a47`,
  9 required groups, and 126 compatibility-manifest files.
- M2/M4/M5 focused slice: PASS — Phase 23 authority/manifest/quality-gate,
  port/process, and existing canary tests passed 34/34 after the lifecycle
  fixture correction; typecheck and offline hardening passed; the observer
  regression passed 2/2; the agent/project support slice passed 154/154.
  `campaign:synthetic` passed 27/27 and `test:owner-provenance` passed 91/91.
- Compatibility qualification: PASS — the Phase 9–23 manifest ran 1,806
  tests with 1,805 passed, 1 skip, and 0 failures at the substantive
  checkpoint; the shared CI-mode runner reproduced the same result.
- Clean-checkout qualification: PASS — disposable local clone, `npm ci
  --ignore-scripts`, Node 20, clean-before/after, no auth/owner state, and no
  sibling writes; all nine gate groups passed. Receipt:
  `clean-receipt:sha256:bfffe21778570657eb549d9f`.
- Shared gate qualification: PASS — CI-mode receipt at the substantive
  checkpoint is `receipt:sha256:ee4a263e49bfa4aaee9f7ca6`; local-mode receipt
  is `receipt:sha256:df221aec03a4804ab814b769`; definition digest is
  `sha256:3d0a4c3f845f91c348a994bb056b130a286c3102e1f86267124328299fa26a47`.
- Full-suite qualification: PASS — canonical enumeration 2,364 with 2,360
  passed, 4 skipped, 0 failed, 0 flaky; topology-correct isolated execution
  matched 2,364/2,360/4/0 with exact skip identity parity. The substantive
  code checkpoint was clean; later documentation-only work does not change
  the executable suite.
- Fresh source/manifest qualification: PASS — read-only Ripple snapshot
  `27bb007ad0c798800b6bd3b29760c966422966e7`; six candidates considered,
  three eligible, three excluded by current evidence. Fresh manifest ID is
  `manifest:sha256:bf2a6d78ad7d154e63a50a30`, digest
  `manifest:sha256:772606d0521151cb57284f66`; dry-run digest is
  `dry-run:sha256:80f43a97cbfc3efbf3db577d`.
- Static Phase 23 checks: PASS — `npm run typecheck`,
  `npm run hardening:check`, `npm run quality-gate:spec`, and
  `npm run gate:inventory`.

## Decisions Made During This Task

- This is a fresh Phase 23 task; Phase 19, Phase 20, Phase 21, and Phase 22
  history are immutable.
- The old workflow is evidence for the drift audit, not a specification to
  extend. The new quality gate will be designed once and invoked by CI.
- `steps=[]` is an external execution/platform classification and can never
  authorize DEV or be reported as a test failure.
- The existing synthetic local-canary timeout fixture uses a 100 ms bounded
  window so the request reaches the loopback server before the timer under the
  full serial cone; it remains no-response and one-call only.

## Discoveries

The terminal Phase 22 compatibility count (1,302/1,302) is recorded in its
historical task files, but no stable `test:semantic-compat` package entry
point exists. The workflow has approximately thirty step entries and several
historical repeated test files. The current Playwright configuration uses a
shared fixed proxy default (`18987`), and Phase 22 recorded a concurrent local
`EADDRINUSE`; this is a test-infrastructure concern for M3, not a product
networking defect.

## Blockers

The only remaining Phase 23 blocker is the required post-push external CI
observation. Phase 22 Actions run `32681204267` is historical evidence only;
the fresh manifest and local/clean green results cannot authorize DEV. A new
exact current-head run must execute the required job and gate before any auth
read or DEV contact.

## Safety Events

NONE — local repository inspection and task-control work only; no DEV, NEXT,
production, database, infrastructure, authenticated state, or sibling write
was performed.

## Deferred / Follow-Up

External billing/platform remediation, owner-only auth structural validation,
and any DEV contact remain deferred until the exact current-head Actions
observation. The Phase 22 manifest/source identities were not reused; the
fresh Phase 23 manifest is external owner-local evidence only.

## Resume Recipe

Read ACTIVE_TASK.md, then this task's SPEC.md, PLAN.md, and STATE.md. Inspect
the working tree and run the exact next action. Keep Phase 19–22 task records
untouched; implement only additive Phase 23 quality-gate infrastructure.

## Completion Snapshot

IN_PROGRESS — M0–M7 are complete at the substantive implementation
checkpoint. Local, CI-mode, clean-checkout, source, fresh-manifest, dry-run,
canonical, and isolated qualification are green. M8 is waiting for the one
post-push exact current-head Actions observation; DEV observations remain zero.
