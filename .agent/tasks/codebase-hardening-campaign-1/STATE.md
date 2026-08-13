# Task State

## Identity

Task ID: codebase-hardening-campaign-1
Phase: Private/local hardening campaign I
Status: IN_PROGRESS
Starting SHA: c14aebff9ae85814aa31f518e7f8fa4afbdeb7da
Current SHA: 37daa755b6ff815145bb2b8ccf922cddfb1bde48
Last validated implementation SHA: 37daa755b6ff815145bb2b8ccf922cddfb1bde48
Branch: main
Last checkpoint: 2026-08-14 M2 persistence checkpoint committed/pushed as
`37daa755b6ff815145bb2b8ccf922cddfb1bde48`; clean HEAD equals origin/main.

## Objective

Harden Nightwatch's durable state, resume, budget, process, filesystem,
configuration, policy, evidence, compile, CI, privacy, and auditability
boundaries using local/synthetic/static evidence only.

## Current Milestone

Milestone ID: M3
Status: IN_PROGRESS
What is being attempted: Remove arbitrary parent environment and CWD/config
authority, strengthen private/storage filesystem boundaries, enforce explicit
real-target provenance, and bind Oops execution to actual binary bytes.

## Completed Milestones

- Bootstrap/recovery: repository root, branch, private remote, clean worktree,
  and `HEAD == origin/main == c14aebff9ae85814aa31f518e7f8fa4afbdeb7da`
  verified on 2026-08-14. Phase 7 is `COMPLETE`; Phase 6 is
  `FROZEN_BY_OWNER`.
- M0 task routing: new hardening SPEC/PLAN/STATE/REPORT created, ACTIVE_TASK
  routed to this task, and `npm run agent:check` passed with one expected
  documentation-only checkpoint warning.
- M1 independent review: five bounded read-only tracks were reconciled against
  current implementation and tests. Confirmed findings are recorded below;
  Phase 7 and the Phase 6 owner freeze remain unchanged.
- M2 persistence/budget repair: strict manifest and checkpoint validators,
  tamper/corruption fixtures, checkpoint ordinals, exact budget arithmetic,
  and deterministic real-profile reserve planning passed typecheck,
  `campaign:synthetic`, and 19 focused campaign tests. Implementation was
  pushed as `37daa755b6ff815145bb2b8ccf922cddfb1bde48`.

## Work In Progress

M0, M1, and M2 are complete. M3 is scoped to process, filesystem,
configuration, target-policy, and executable provenance boundaries. No runtime
artifacts, credentials, or Alphaus repositories may be changed.

## Exact Next Action

Implement the canonical child environment builder first, then adversarial
storage/CWD/config tests and Oops executable digest binding. Keep all checks
local and synthetic.

## Files Changed

| Path | Reason | Status |
|---|---|---|
| `.agent/tasks/codebase-hardening-campaign-1/SPEC.md` | Frozen intent and threat model | created |
| `.agent/tasks/codebase-hardening-campaign-1/PLAN.md` | Living milestones and validation | created |
| `.agent/tasks/codebase-hardening-campaign-1/STATE.md` | Resumable waypoint | created |
| `.agent/tasks/codebase-hardening-campaign-1/REPORT.md` | Completion handoff placeholder | created |
| `.agent/ACTIVE_TASK.md` | Routes active work to hardening task | complete |

## Validation Ledger

Command: `git rev-parse --show-toplevel && git status --short && git branch --show-current && git rev-parse HEAD && git rev-parse origin/main`
Result: PASS; canonical root, `main`, clean tree after the M2 implementation
checkpoint, and `HEAD == origin/main == 37daa755b6ff815145bb2b8ccf922cddfb1bde48`.
When: 2026-08-14
Relevant failure/output summary: none.

Command: `npm run agent:check`
Result: PASS with one expected `CHECKPOINT_ADVANCE` warning for the new task
documentation and ACTIVE_TASK route; no secret-like values or structural
errors.
When: 2026-08-14
Relevant failure/output summary: approved continuity/documentation paths only.

Command: bounded read-only review tracks A-E plus direct source/test
reconciliation.
Result: PASS; five tracks completed without edits or external operations.
When: 2026-08-14
Relevant failure/output summary: findings and classifications are recorded in
the review ledger below; worker output was treated as evidence to verify, not
as authority.

Command: `npm run typecheck`
Result: PASS after M2 implementation.
When: 2026-08-14
Relevant failure/output summary: no compiler errors.

Command: `npm run campaign:synthetic`
Result: PASS; 19 local campaign/manifest/checkpoint/budget tests passed.
When: 2026-08-14
Relevant failure/output summary: no product network or external runtime state.

Command: `git diff --check`
Result: PASS before M2 commit/push.
When: 2026-08-14
Relevant failure/output summary: none.

## Decisions Made During This Task

Decision: use a separate native hardening task and preserve Phase 7 as
complete.
Reason: the user explicitly approved a new private/local hardening campaign;
Phase 7 is historical closure, not an active task.
Evidence/constraint: `.agent/ACTIVE_TASK.md`, Phase 7 SPEC/REPORT, and current
Git state.

Decision: use the accidental-corruption/stale-state/secret-boundary threat
model and avoid malicious-root cryptography.
Reason: it matches the approved scope and keeps repairs auditable.
Evidence/constraint: frozen task instructions and repository safety contract.

Decision: repair the real bounded profile by reserving reproduction capacity
inside the existing caps, even if optional exploration/API breadth is reduced.
Reason: the current six browser-context cap is consumed by three journeys and
three explorations before a browser reproduction can run; six API executions
are also consumed by three first-plus-fresh-replay API items. The owner values
truthful, reproducible evidence over silently promising unavailable work.
Evidence/constraint: current `INITIAL_REAL_CAMPAIGN_BUDGET`, selection order,
and Phase 7 historical report.

## Discoveries

- `git fetch origin` is available and succeeded after the environment changed
  to full access.
- Current durable docs describe Phase 7 as complete and preserve the owner
  freeze; neither should be reopened by this task.
- Manifest identity: `validateCampaignManifest` recomputes campaign ID but
  only syntax-checks `manifestFingerprint`; it does not recompute the
  fingerprint or validate selected arrays, seed lineage, and executable work
  material against the selection. Confirmed hardening defect.
- Checkpoint/resume: `CampaignCheckpointStore.readCheckpoint` and
  `writeCheckpoint` do not run a strict checkpoint validator. The orchestrator
  accepts a typed JSON cast, so malformed counters, ledgers, references, and
  result/state combinations can reach resume. `checkpointOrdinal` remains 0,
  and replay reservation can be charged again after interruption. Confirmed
  hardening defects.
- Budget feasibility: the real profile allows three journeys plus three
  explorations against six browser contexts, and three API items consume all
  six API executions when fresh replays are included. Reproduction can
  therefore be unavailable only after a candidate is observed. Confirmed
  design gap; repair must remain within existing absolute caps.
- Process boundary: authenticated Phase 7/5/4/2B and generic launcher paths
  spread the full parent `process.env` into Playwright children. Auth-capture's
  preflight child also inherits the parent environment. Confirmed secret
  isolation gap; Oops already uses an explicit allowlist.
- Filesystem/config boundary: storage-state read validation follows symlinks
  and lacks strict ownership/mode checks; private artifact root checks use
  arbitrary `process.cwd()` and write-side symlink/parent hardening is
  incomplete; environment loading falls back to CWD config. Confirmed gaps.
- Target/provenance: automated credential-bearing Phase 7 paths are DEV-only
  and production/owner gates remain fail-closed. NEXT support is limited to
  the explicitly human-led auth-capture exception. Oops checks two
  caller-supplied source SHA strings but does not hash the actual executable.
  The Oops provenance issue is confirmed; the NEXT widening hypothesis is
  rejected as a current automated-path defect.
- Evidence/privacy: budget-blocked reproduced clusters are represented only by
  a transient and can end with `COMPLETE_CLEAN`; the brief headline uses
  `NO ADMITTED PRODUCT ANOMALIES` for both zero observations and unresolved
  L0 candidates. Private artifacts rely on a generic regex denylist instead of
  structural DTO validation. Confirmed gaps.
- Compile/CI/auditability: root Playwright configs for phase2b, phase4,
  phase5, and phase7 are omitted from `tsconfig.json`; no repository-native
  hardening check or private read-only CI workflow exists. The orchestrator's
  error classification uses message substring matching. Confirmed gaps.
- Multi-hour profile: direct static review found the larger budget as a
  library constant with no current CLI/runtime selection path; this remains
  to be verified by the hardening static check and is not enabled.

## Blockers

None.

## Safety Events

NONE. Product network, production, DEV, NEXT, database, infrastructure, and
external publication activity remain zero. Review workers were read-only and
used no Alphaus repository or runtime/private artifact access.

## Deferred / Follow-Up

- Do not execute a real DEV regression check. Record an exact blocker if a
  scoped repair cannot be validated locally.
- Do not reopen Phase 6 or start Phase 8.

## Resume Recipe

1. Read `AGENTS.md`, `docs/CURRENT_STATE.md`, `docs/SAFETY_MODEL.md`,
   `docs/DECISIONS.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, and this
   task's SPEC/PLAN/STATE.
2. Inspect `git status --short`, `git diff`, `git log -1`, and `origin/main`.
3. Run the smallest validation for the current milestone.
4. Continue from Exact Next Action and update this STATE before changing
   subproblems.

## Completion Snapshot

Populate only when complete:

Final SHA: pending
Tests: pending
Artifacts: pending
Known issues: pending
Recommended next task: none; do not start another phase.

## Hardening Status Matrix

CURRENT_GOAL: HIDDEN_STATE_AND_BOUNDARY_HARDENING
CURRENT_MILESTONE: M3_PROCESS_FILESYSTEM_POLICY
STARTING_SHA: c14aebff9ae85814aa31f518e7f8fa4afbdeb7da
CURRENT_LOCAL_HEAD: 37daa755b6ff815145bb2b8ccf922cddfb1bde48
CURRENT_REMOTE_HEAD: 37daa755b6ff815145bb2b8ccf922cddfb1bde48
OWNER_SCOPE_POLICY: FROZEN_BY_OWNER / INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE
REVIEW_FINDINGS: five bounded read-only tracks reconciled on 2026-08-14
CONFIRMED_FINDINGS: manifest fingerprint/cross-field gap; absent strict checkpoint validation; replay/browser/API feasibility gap; replay double-charge and static ordinal gap; full child-env inheritance; storage/private-root/CWD config gaps; Oops byte provenance; brief L0/budget collapse; structural private DTO gap; omitted root TS configs; absent hardening check/CI; substring error taxonomy
REJECTED_FINDINGS: automated NEXT widening not present; production deny and Phase 6 owner gate remain effective; Oops shell/argv/output allowlist remains strong
FILES_CHANGED: M2 campaign runtime validators/budget/selection/orchestrator plus focused adversarial tests
MANIFEST_INTEGRITY_STATUS: PASS — ID, fingerprint, selection lineage, work-item schema/order, cross-fields, and unknown fields validated; tamper matrix PASS
CHECKPOINT_INTEGRITY_STATUS: PASS — strict pre-resume validator, exact ledger coverage, counter arithmetic, references, state/result semantics, malformed wrapper tests PASS
BUDGET_FEASIBILITY_STATUS: PASS — real bounded profile reserves one reproduction within unchanged caps; optional exploration suppressed and linked API coverage reduced deterministically
CHILD_ENV_STATUS: CONFIRMED GAP — repair queued M3
FILESYSTEM_BOUNDARY_STATUS: CONFIRMED GAP — repair queued M3
ENV_CONFIG_PROVENANCE_STATUS: CONFIRMED GAP — repair queued M3
REAL_TARGET_POLICY_STATUS: AUTOMATED DEV-ONLY PASS; human NEXT exception must be documented/tested
OOPS_PROVENANCE_STATUS: CONFIRMED GAP — repair queued M3
MORNING_BRIEF_STATUS: CONFIRMED GAP — repair queued M4
TYPECHECK_COVERAGE_STATUS: CONFIRMED GAP — repair queued M4
CI_STATUS: NOT IMPLEMENTED — safe private workflow queued M4
MAINTAINABILITY_STATUS: review complete; orchestrator extraction deferred pending focused characterization
TEST_LEDGER: bootstrap/agent-check PASS; typecheck PASS; campaign:synthetic PASS (19 tests)
ADVERSARIAL_TEST_LEDGER: manifest tamper matrix PASS; checkpoint corruption/malformed JSON matrix PASS; real-profile reserve fixture PASS
PUSH_LEDGER: bc8e3fa task creation PASS; 60ecbb7/54368fc/1f8d9a9 documentation review checkpoints PASS; 37daa75 M2 implementation PASS; all pushed and origin-verified
SAFETY_EVENTS: NONE
PRIVACY_STATUS: no runtime/private data touched
LAST_VALIDATED_IMPLEMENTATION_SHA: 37daa755b6ff815145bb2b8ccf922cddfb1bde48
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 37daa755b6ff815145bb2b8ccf922cddfb1bde48
LAST_DOCUMENTATION_CHECKPOINT_SHA: 1f8d9a96f599cf0b37eb7b82ef8b0c6e75657a9a
LAST_PUSHED_SHA: 37daa755b6ff815145bb2b8ccf922cddfb1bde48
NEXT_EXACT_ACTION: add allowlisted child environment builder and replace sensitive launcher spreads; then run sentinel child fixtures
RESUME_RECIPE: read task state, inspect Git/diff, run smallest milestone validation, continue exact next action
