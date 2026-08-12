# Nightwatch Phase 3 — Change-Directed Journey Selection

## Purpose

Implement and validate a deterministic source-change-to-canary selector for
the three trusted Ripple journeys while preserving the existing read-only
safety and replay/oracle boundaries.

## Starting State

- Task ID: `phase-3-change-directed-journey-selection`.
- Starting SHA: `427f10295ae2037d09741de98ebea9210f14f85a`.
- Validated inherited implementation: `efc03de2f7396a96baaca485894df300ddcc4ce0`.
- Clean Nightwatch worktree; Alphaus repositories are read-only inputs.
- Phase 2A/2B/2C are closed and reconciled before this task is created.

## Scope

Closure audit, native task continuity, justified Ripple repository scope,
freshness and change windows, source-backed dependency maps, impact graph,
classification/risk, deterministic selection/ranking, negative-selection
explanations, conservative fallback, atomic baseline state, fixtures,
historical backtests, adversarial review, current shadow mode, optional bounded
DEV validation only if required by the frozen SPEC, and final closure.

## Non-Goals

Do not modify Alphaus repositories, reopen prior phases, add journeys/actions,
fuzz, use an LLM for selection, access production/datastores, persist customer
data, or start Phase 4.

## Safety Constraints

- All Alphaus commands are read-only Git/source inspection. No fetch, reset,
  checkout, stash, clean, install, or write operation occurs in those repos.
- Dirty Alphaus worktrees are recorded and excluded from committed/nightly
  change windows unless explicit local shadow mode is selected.
- Source changes never imply deployment or bug causation.
- Pure selection is offline and contains no auth/customer data or whole patches.
- Optional real execution reuses the proven Phase 2B/2C runner and safety
  kernel; no new browser path is created.
- Unknown relevant impact, stale maps, or high-risk conflicts fail safe to all
  existing canaries or stop before execution; they never silently select zero.

## Architecture / Approach

1. Record closure reconciliation and create the task before Phase 3 code.
2. Read `.github/codebase-index.md` and inspect only the candidate Ripple
   repositories needed by J1/J2/J3. Capture immutable source SHA, tracking
   metadata, dirty state, and integrity fingerprints without changing them.
3. Define a versioned JSON-safe model for repository baselines, change windows,
   changed paths/symbol facts, dependency edges, impact evidence, selection,
   non-selection, fallback, unresolved impact, and baseline state.
4. Implement safe Git collection through argument-array process invocation with
   explicit range validation, rename/delete tombstones, dirty separation, and
   no shell interpolation of paths or commit text.
5. Build a hybrid dependency map from curated source-backed canary contracts
   plus modest route/import/API/backend extraction. Mark stale edges when the
   recorded source SHA no longer matches the map.
6. Implement pure impact analysis and selection with evidence precedence,
   confidence/risk separation, stable deduplication/order, negative reasons,
   and visible conservative fallback.
7. Implement baseline transitions atomically with pending/accepted/failed/
   blocked/bootstrap states and crash recovery tests.
8. Add synthetic and historical fixtures, independently derive ground truth,
   backtest, repair architectural gaps, and rerun the ledger.
9. Produce a current read-only shadow result and independently review the
   load-bearing edges before deciding whether any bounded DEV validation is
   useful.
10. Complete privacy/safety/adversarial/full validation and close this task.

## Milestones

### M0 — Closure reconciliation and task creation

- Status: `COMPLETE` when the current task is active and prior phase closure is
  independently reconciled against Git.
- Validation: clean Git state, requested SHA ancestry/path audit,
  `npm run agent:check`, full inherited suite.

### M1 — Routing and repository/freshness audit

- Read codebase routing first; justify each repository in the scope ledger.
- Capture branch/HEAD/tracking/ahead-behind/dirty state and before fingerprints.
- Validation: read-only source inspection, status recheck, no Alphaus diffs.

### M2 — Frozen change model and dependency contracts

- Status: `COMPLETE` — schema, source-backed repository metadata, and the
  J1/J2/J3/shared dependency contract are implemented in
  `src/core/changeIntelligence` and documented in `DEPENDENCY_MAP.md`.
- Define schema/model versions, change-window semantics, J1/J2/J3 dependency
  edges, source provenance, stale-edge rules, and shared-core evidence.
- Validation: model/type tests and map integrity checks.

### M3 — Git collection and freshness implementation

- Status: `COMPLETE` — safe argument-array Git collection, dirty separation,
  range validation, commits, merge-base, and rename/delete tombstones pass
  focused tests; current shadow records local tracking freshness only.
- Implement committed upstream/local committed/dirty separation, range/tombstone
  collection, safe process invocation, reproducible changeset identity, and
  freshness diagnostics.
- Validation: synthetic Git repositories including add/modify/delete/rename,
  dirty worktree, tracking divergence, merge/disconnected/nonexistent ranges,
  unusual paths, and identical base/head.

### M4 — Impact graph and classification implementation

- Status: `COMPLETE` — deterministic path/previous-path graph, direct/shared/
  backend/contract/transport edges, confidence, risk, runtime filtering,
  deduplication, and stale-edge fallback are implemented.
- Implement direct/shared/transitive graph edges, path/component/route/API/
  backend mapping, confidence, risk, conflict/deduplication, runtime-only
  classification, and map version/source SHA checks.
- Validation: source-shaped synthetic graph and repository-backed mapping tests.

### M5 — Deterministic selector and baseline implementation

- Status: `COMPLETE` — selection, negative explanations, P0–P3 priority,
  visible all-canary fallback, zero-selection contract, and atomic pending /
  accepted baseline transitions pass focused tests.
- Implement selection, stable priority, positive and negative explanations,
  unknown fallback, zero-selection contract, and atomic baseline transitions.
- Validation: all selection combinations, determinism, stale-map handling,
  failure/blocked/crash recovery, and property-like local invariants.

### M6 — Fixtures and historical blind backtests

- Status: `COMPLETE` — eight representative fixtures and seven real local Git
  ranges pass; the durable ledger records two true-positive selections, four
  conservative fallbacks, one correct non-selection, zero material false
  negatives, and one explicitly unresolved ground-truth case.
- Create minimal sanitized changeset fixtures and select real historical ranges
  from local history. Establish independent ground truth before comparing.
- Validation: direct J1/J2/J3 where available, shared, non-runtime, unknown,
  rename/delete, backend-only, and explicit unresolved cases; classify every
  result and repair material false negatives.

### M7 — Adversarial false-negative/false-positive review

- Status: `IN_PROGRESS` — load-bearing dynamic/MFE/config/style/generated-code
  review and independent current shadow review remain.
- Inspect dynamic routing/imports, barrels, stores, wrappers, generated clients,
  MFE boundaries, config/build/resource/CSS behavior, tests/docs/dead code.
- Validation: review ledger, regression tests for each repaired gap, rerun all
  prior backtests, no special-case commit hashes.

### M8 — Current shadow selection and independent review

- Use the deterministic current baseline-to-head window; exclude dirty work.
- Produce selected/non-selected journeys, priorities, exact source reasons,
  ambiguity/fallback, and freshness status. Independently cross-check edges.
- Validation: `PHASE_3_SHADOW_SELECTION_ACCEPTED` only if reviewable; otherwise
  record conservative fallback/review-required without live execution.

### M9 — Optional controlled DEV validation

- Only if M8 is accepted, current range is meaningful, the SPEC gate passes,
  auth is current, and selected existing journeys can run safely.
- Validation: selected-run lineage, replay/oracle result, safety vector zero,
  privacy scan, and explicit control comparison limits.

### M10 — Final validation and closure

- Complete architecture/adversarial/privacy/Alphaus-integrity review, update
  STATE/REPORT/ACTIVE_TASK, commit Nightwatch only, and leave clean.
- Validation: TypeScript, full Playwright, agent check, diff check, focused
  Phase 3 suite, status, and manual diff review.

## Validation Strategy

Focused tests must cover change collection, freshness, dependency maps, impact
classes/confidence/risk, selection and negatives, fallback, determinism,
baseline atomicity/failure semantics, rename/delete, stale maps, privacy, and
synthetic source paths. Full inherited tests must remain green. Historical
backtests use real local Git metadata but no network or product execution.

## Decision Log

- D3-1: Keep change-to-canary relevance separate from canary-failure root
  cause; no commit attribution is emitted.
- D3-2: Use source SHA and contract/map versions as first-class provenance;
  commit messages are weak context only.
- D3-3: Separate confidence from risk and dirty source from committed source.
- D3-4: Unknown relevant runtime impact uses visible all-three fallback;
  only proven non-runtime changes permit zero.
- D3-5: Prefer the smallest hybrid graph that is source-backed and extensible
  over a universal dependency solver.

## Discoveries

To be filled as evidence is gathered. Prior Phase 2 discoveries remain in the
closed task reports and are not rewritten here.

## Deferred Work

Wave/Aqua/Octo maps, deployment identity integration, scheduler/orchestration,
datastore verification, AI/model-based planning, fuzzing, and root-cause
correlation are deferred to later explicitly authorized work.

## Completion Criteria

All frozen SPEC criteria are met, no material historical false negative is
unresolved, current shadow review is classified, optional live execution is
either safe and lineage-complete or explicitly unnecessary, all required
validation passes, Alphaus repositories are unchanged, Nightwatch is clean,
and Phase 4 is not started.
