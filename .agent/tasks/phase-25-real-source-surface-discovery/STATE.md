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

Milestone ID: M12
Milestone status: IN_PROGRESS
What is being attempted: close compatibility, authoritative quality-gate,
clean-checkout, and fresh-regression evidence after source authority expansion.

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
- M3 — repaired TS validation-range proof orientation and replaced
  serialized-length contract drift heuristics with explicit shape-aware
  comparison; added positive, negative, ambiguous, and deterministic privacy
  regressions.
- M4 — added fixed route/operation discovery, safe read-only/mutation
  classification, existing analyzer-backed request/response/semantic
  evidence, runtime/source correlation, provenance, and direct Phase 24 input
  conversion. Synthetic bridge coverage proves one exact runtime-bound
  read-only candidate and one excluded mutation candidate.
- M5 — added exact route-to-handler and optional handler-to-request/response
  schema join records with content-digest evidence; missing and multiply
  defined symbols are rejected and tested.
- M6 — extended the existing semantic lifecycle graph with additive source
  repository/file/operation/handler/request/response/semantic/Phase24/runtime/
  replay/dossier lineage. Input-order repeatability and privacy-safe graph
  output are covered.
- M7 — added one direct source-to-Phase24 adapter/portfolio/selector function;
  exact runtime-bound/read-only synthetic eligibility is retained and runtime
  deployment equivalence remains unresolved.
- M8 — added bounded inventory/surface change comparison and delegated
  candidate invalidation to the existing Phase24 ledger. Same-SHA relevant
  content changes now invalidate replay/dossier assumptions; unrelated files
  leave candidate records current. Lifecycle counts are explicit.
- M9 — added local source-scan/surfaces/review-queue/explain-surface operator
  paths, fixed approved repository scan policy, explainable review factors,
  and operator environment-flag rejection.
- M10 — added global duplicate route rejection, a source-surface cache keyed by
  Git plus inspected content/config/extractor/analyzer identity, bounded
  eviction, privacy/adversarial matrices, and deterministic repeatability.
- M11 — added the offline source-to-portfolio synthetic campaign through
  semantic evaluation, replay/dossier DTOs, and Phase24 no-contact rehearsal.

## Work In Progress

Build the source-driven Phase 24 adapter/portfolio/selection integration, then
connect two exact source snapshots to the existing invalidation ledger without
rebinding stale evidence.

## Exact Next Action

Implement one deterministic source-to-Phase24 integration function and add
changed-snapshot portfolio/invalidation/lifecycle regressions.

## Files Changed

Task records, `src/core/source/siblingSource.ts`, `src/core/source/scan.ts`,
`src/core/source/scanTypes.ts`, `src/core/source/surfaceTypes.ts`,
`src/core/source/surfaces.ts`, the existing semantic coverage analyzer and
drift modules, Phase 25 compatibility/gate registration, and the Phase 25
boundary/inventory/analyzer/surface tests are changed in the current
checkpoint.

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
- M3 focused Phase 20 semantic coverage plus Phase 25 analyzer suite: PASS —
  19 passed, 0 failed.
- M3/M4 typecheck: PASS.
- M3/M4 hardening check: PASS.
- M4 surface discovery suite: PASS — 2 passed, 0 failed.
- M4 quality-gate specification: PASS — compatibility range 9–25 and 132
  registered compatibility files.
- M4 whitespace check: PASS — `git diff --check`.
- M5 focused source surface suite: PASS — 3 passed, 0 failed, including exact
  request/response schema joins and missing/multiple handler rejection.
- M5/M6 focused Phase20 + Phase25 cone: PASS — 22 passed, 0 failed.
- M6 graph determinism/privacy assertions: PASS within the 22-test cone.
- M6 typecheck: PASS.
- M6 hardening check: PASS.
- M7 focused source/Phase24/review cone: PASS — 25 passed, 0 failed across
  Phase20, Phase24, and Phase25 surface/invalidation/operator tests.
- M7 typecheck and hardening: PASS.
- M8 invalidation matrix: PASS — unrelated admitted-file change preserved
  current candidate records; relevant same-SHA handler evidence invalidated
  replay and dossier assumptions.
- M9 real approved-source operator smoke: PASS — `source-scan` inspected
  `mobingilabs/ripple-api` read-only with 96 files, 95 admitted, 1 privacy
  rejection, 1,742,807 inspected bytes, and no external contact. `surfaces`
  remained truthful with 128 bounded operations, 95 truncations, 0 eligible
  real candidates, and explicit exclusion reasons.
- M10 adversarial/cache matrix: PASS — 4 tests covering route families,
  global duplicate/unsupported routes, privacy/unsupported files, dirty
  same-SHA cache misses, config misses, and bounded eviction.
- M11 synthetic campaign: PASS — 29 tests in `campaign:synthetic`, including
  the Phase25 source → portfolio → semantic/replay/dossier → no-contact path.
- Gate inventory: PASS — 141 unique authoritative test files and 0 duplicate
  executions after Phase25 registration.
- Full compatibility attempt before a clean implementation checkpoint:
  1,847 total, 1,844 passed, 1 canonical skip, 2 failures in existing
  self-development CLI missing-artifact tests because the working tree was
  intentionally dirty (`SELFDEV_AUTHORITATIVE_SOURCE_DIRTY`). No
  source-surface assertion failed; the clean post-commit rerun is required.

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
- M3 range proof rejects reversed or semantically ambiguous guards even when a
  regex could match them; unsupported is safer than invented evidence.
- M3 drift classifications preserve historical result vocabulary while adding
  explicit shape categories for expansion, narrowing, incompatibility,
  rederivation, removal, and source unavailability.
- M4 safe structural handler symbols may be retained in descriptors, but raw
  handler source text and literal values are never persisted; exact runtime
  binding and existing Phase 24 proof remain separate authority checks.
- M5 join evidence uses only safe path/symbol/content-digest identities; an
  exact filename does not by itself prove a response contract unless the
  bounded static schema or existing analyzer proves it.
- M6 source lineage is optional on the existing graph API so historical
  Phase20–24 graph digests remain unchanged when no Phase25 surfaces are fed.
- Phase24 source-evidence changes now explicitly invalidate replay and dossier
  assumptions; this intentional safety migration is covered by the updated
  Phase24 regression.

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

M1–M11 are implemented and locally focused-validated. M12 remains active for
the clean post-commit compatibility/gate run, Node20 qualification, fresh
canonical/isolated regression parity, external exact-head observation, and
terminal synchronized-main closure.
