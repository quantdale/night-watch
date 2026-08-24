# Task State

## Identity

Task ID: phase-25-real-source-surface-discovery
Phase: 25-REAL-SOURCE-SURFACE-DISCOVERY
Title: Nightwatch Phase 25 — Real-Source Surface Discovery, Boundary Hardening, Contract Graph Extraction, and Review Intelligence
Authorization class: PHASE_25_REAL_SOURCE_SURFACE_DISCOVERY_LOCAL_SOURCE_SYNTHETIC_ONLY
Status: IN_PROGRESS
Starting SHA: 7beb18689cf2cd50d1d5383b34f51c2789cd0a54
Last validated implementation SHA: 541646974ede051caa50bb44ea3d4f14a5ecec6f
Last substantive checkpoint SHA: 541646974ede051caa50bb44ea3d4f14a5ecec6f
Branch: main
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 7beb18689cf2cd50d1d5383b34f51c2789cd0a54
LAST_VALIDATED_IMPLEMENTATION_SHA: 541646974ede051caa50bb44ea3d4f14a5ecec6f
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 541646974ede051caa50bb44ea3d4f14a5ecec6f
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_LIVE_HEAD

PHASE_25_STATUS: IN_PROGRESS
PHASE_24_STATUS: COMPLETE_LOCAL_BLOCKED_EXTERNAL_CI (historical, unchanged)
PHASE_23_STATUS: COMPLETE_LOCAL_BLOCKED_EXTERNAL_CI (historical, unchanged)
PHASE_22_STATUS: BLOCKED_BEFORE_DEV (historical, unchanged)
PHASE_21_STATUS: COMPLETE (historical, unchanged)
PHASE_20_STATUS: COMPLETE (historical, unchanged)
PHASE_6_STATUS: FROZEN_BY_OWNER
PHASE_11B_STATUS: NOT_AUTHORIZED
PHASE_13B_STATUS: NOT_AUTHORIZED

## Objective

Safely discover mechanically provable source surfaces from an approved exact
read-only snapshot and route them into the existing Phase 24 portfolio while
preserving fail-closed source, privacy, currentness, and no-contact rules.

## Current Milestone

Milestone ID: M3
Milestone status: IN_PROGRESS
What is being attempted: repair existing analyzer proof semantics and contract
drift classification before broader route and contract extraction.

## Completed Milestones

- M0 — clean `main`/`origin/main` topology verified; Phase 24 task records
  read without modification; Phase 25 task files activated.
- Architecture seam audit — sibling source, Phase 20 analyzers/discovery,
  Phase 24 source adapter/portfolio, quality-gate registration, and operator
  seams inspected.
- M1 — hardened sibling-source access with no-follow path confinement, regular
  file and byte limits, exact loose/packed/detached Git resolution, safe
  `.git` indirection, and a seven-case symlink/Git/path regression matrix.
- M2 — added fixed versioned scan configuration and bounded source inventory;
  inventory is deterministic, content-aware at the same Git SHA, stale-source
  aware, and contains no raw source text.

## Work In Progress

Repair the TS range analyzer and semantic contract-drift classifier with
explicit proof tables. Add valid, reversed, unsupported, ambiguous, and
shape-specific regressions before accepting any new extraction authority.

## Exact Next Action

Implement M3 in the existing Phase 20 analyzer/discovery modules and focused
Phase 25 regressions; preserve historical DTO compatibility where current
tests rely on it.

## Files Changed

Task records, `src/core/source/siblingSource.ts`,
`tests/unit/phase25SourceBoundary.test.ts`, and Phase 25 compatibility/gate
registration are changed in the current working checkpoint. M2 additionally
changed `src/core/source/scan.ts`, `src/core/source/scanTypes.ts`, and
`tests/unit/phase25SourceInventory.test.ts`.

## Validation Ledger

- Git topology: PASS — branch `main`, upstream `origin/main`, local and remote
  HEAD equal `5416469`, clean worktree after the M2 push.
- Required durable docs and Phase 24 task records: READ; historical records
  remain unmodified.
- Worker bridge doctor: PASS; two read-only worker runs returned a provider
  configuration error (`unable to determine Kimi version`) and supplied no
  findings. No credentials or external systems were accessed.
- Defect audit: CONFIRMED — lexical source confinement follows symlinks;
  packed-ref fallback is not exact-ref aware; `.git` shape support is
  incomplete; TS range proof accepts reversed guards; Phase 20 drift uses
  serialized shape length.
- M1 focused source boundary suite: PASS — 7 passed, 0 failed.
- M1 compatibility cone: PASS — Phase 23 quality-gate tests plus Phase 25
  boundary tests, 13 passed, 0 failed.
- Typecheck: PASS.
- Hardening check: PASS.
- Quality-gate specification: PASS — required semantic range 9–25 and
  Phase 25 inventory registered.
- Diff whitespace/privacy review: PASS — `git diff --check`; no sentinel,
  token-like, credential-like, customer-like, or raw-source evidence found in
  the changed task/source/test scope.
- M2 focused source inventory suite: PASS — 10 passed, 0 failed.
- M2 quality-gate specification: PASS — compatibilityFileCount 130 and Phase
  25 inventory test registered.
- M2 hardening check: PASS.
- M2 typecheck: PASS.

## Decisions Made During This Task

- Main-only development is retained. No feature branch, PR, or temporary
  development authority will be created.
- The first repair is source-boundary hardening because all later extraction
  output depends on it.
- M1 supports only validated `.git` directory, safe `.git` indirection,
  loose/packed refs, and detached HEAD; unsafe or unsupported shapes fail
  closed.
- M2 inventory identity must include actual inspected-content digests and the
  scan/analyzer contract versions; Git SHA alone is insufficient for dirty
  same-SHA source.
- M2 source inventory remains subordinate to `siblingSource.ts`; coordinators
  import no filesystem or process authority.

## Discoveries

See `PLAN.md`; no external/source data was read during bootstrap.

## Blockers

None for local implementation. External CI and DEV remain outside this
phase's authority and are not blockers to M1–M13.

## Safety Events

NONE — no Alphaus repository files, product environments, credentials,
authentication state, database, cloud, or external systems were contacted.

## Deferred / Follow-Up

Unsupported dynamic source, deployment relation, contained DEV acceptance,
external CI recovery, and owner-frozen infrastructure/data operations remain
deferred.

## Resume Recipe

Read this file, inspect `git status`/diff, run the smallest focused source
boundary test, and continue the exact next action. Preserve main-only direct
checkpoint discipline.

## Completion Snapshot

M1 and M2 are complete and locally validated. M3 analyzer proof repair is
active; all route extraction, portfolio, regression, CI, and terminal checks
remain pending.
