# Nightwatch Phase 2B — Three Deterministic Read-Only Ripple Journeys

## Purpose

Extend the proven Phase 2A authenticated shell observation into exactly three
meaningful, source-backed Ripple behavioral canaries. The plan ends with
fresh-context replay evidence, not with three unconnected URL checks.

## Starting State

- Task ID: `phase-2b-three-readonly-ripple-journeys`
- Starting Nightwatch HEAD: `ec4c14376923ffbe12356dd180218eb09cf4f75f`
- Validated Phase 2A implementation: `a6d7c8ba9237ca0ffb1acd9442b23d21d0abf56c`
- Phase 2A closure checkpoint: `9bf2c4593c9eb46db8bb8a5975bfa336461641cd`
- Relevant architecture: TypeScript/Playwright, shared OutboundPolicy,
  mandatory L5 proxy, browser containment, metadata-first recorder,
  source-backed Ripple readiness, page-readable auth validation, and native
  `.agent` continuity protocol.
- Dependencies: current Nightwatch source, read-only Ripple source, local
  Ripple backend/source only where required for endpoint semantic proof, and
  the existing external DEV auth state.
- Established facts not to rediscover: Phase 2A auth/readiness/SHA semantics,
  historical malformed JSON classification, historical production contact,
  `#app` pre-mount semantics, rendered QLayout shell, cancellation taxonomy,
  and existing safety boundaries.

## Scope

Reconcile Phase 2A, create candidate archaeology and freshness records, prove
read-only semantics, select and contract exactly three diverse journeys,
implement a declarative journey engine with shared safety/evidence/replay
logic, validate against local synthetic fixtures, execute the controlled DEV
pairs in order, analyze variance, audit privacy/safety/architecture, and close
the task.

## Non-Goals

Phase 2C and later work; mutations; DB/API datastore queries; exports with
uncertain semantics; fuzzing/random exploration; AI planning; source changes
outside Nightwatch; production; credentials; authenticated traces; and broad
unbounded Ripple archaeology.

## Safety Constraints

- Modify only this Nightwatch repository. Read Ripple and other Alphaus repos
  without checkout, fetch, reset, stash, clean, install, or modification.
- Use exact identifiers and source files; never query production databases.
- Treat every action as `KNOWN_READ`, `KNOWN_MUTATION`, or `UNKNOWN`; only
  local-only and source-proven reads may be intentional.
- Preserve the existing production deny, unknown-host fail-closed, proxy,
  browser, trace-off, auth, privacy, and global QLayout readiness rules.
- Passive unknown initialization is evidence only; action-caused unknown is a
  stop. Mutation tripwire stops on any causal known mutation.
- Validate the external auth state by safe booleans before each real context;
  never print or inspect its contents.
- Real contexts run serially: Journey 1 first/replay, Journey 2 first/replay,
  Journey 3 first/replay. No uncontrolled retries.

## Architecture / Approach

1. Record source/repository freshness and inventory candidates before selecting.
2. Trace every selected intentional action from Ripple callsite through API
   client and backend handler/operation; reject ambiguous candidates.
3. Store three contracts in a task-local `JOURNEYS.md`; contracts are data,
   not bespoke runner files.
4. Build shared `JourneyDefinition`, constrained `JourneyStep`,
   `JourneyContext`, structural checkpoints, semantic request expectations,
   oracles, evidence, results, and replay comparison types around the existing
   Nightwatch context/recorder/policy.
5. Use a local fixture server with controlled safe reads, passive unknowns,
   mutations, unsafe destinations, malformed protocol metadata, lifecycle
   cancellation, auth readability, and structural divergence cases. Tests
   invoke the real classifier/executor/evidence/comparator.
6. Run the complete pre-real gate and adversarial review. Then execute each
   selected journey pair serially, checkpointing STATE after every pair.
7. Perform cross-journey consistency, privacy/safety counting, architecture
   health, final validation, documentation closure, and Nightwatch-only commit.

## Milestones

### M0 — Reconcile Phase 2A and create native Phase 2B task

- Objective: route a fresh context into a frozen Phase 2B contract.
- Files/areas: `.agent/ACTIVE_TASK.md`, this task's `SPEC/PLAN/STATE/REPORT`.
- Implementation actions: record SHA reconciliation and acceptance contract;
  do not inspect broad Ripple source yet.
- Acceptance criteria: task files exist, ACTIVE_TASK is `IN_PROGRESS`, state
  has a precise next action, and the tree is clean after checkpoint.
- Validation commands: `git status --short --branch`; `git log`; `npm run
  agent:check`; `git diff --check`.
- Status: COMPLETE

### M1 — Ripple archaeology and candidate inventory

- Objective: identify a defensible pool without preselecting three routes.
- Files/areas: task `CANDIDATES.md`, `FRESHNESS.md`; minimal Ripple router,
  authenticated navigation, page/layout, E2E, candidate components, API calls.
- Implementation actions: record repo/branch/SHA/local tracking ref and delta;
  inventory purpose, route, components, actions, endpoints, structural markers,
  determinism, privacy/third-party/replay risk, and verdict.
- Acceptance criteria: reasonable candidate pool completed and rejected
  candidates have explicit reasons.
- Validation commands: read-only git/source checks; no runtime target.
- Status: COMPLETE

### M2 — Semantic proof, selection, and three journey contracts

- Objective: select exactly three materially distinct safe journeys.
- Files/areas: `CANDIDATES.md`, `FRESHNESS.md`, `JOURNEYS.md`, STATE/PLAN.
- Implementation actions: prove each intentional read from source; reject
  unknown/mutation/export ambiguity; freeze contracts with strict invariants,
  bounded variance, oracles, privacy, replay, and stop conditions.
- Acceptance criteria: exactly three contracts exist; every intentional action
  has source proof and no contract requires an unknown endpoint.
- Validation commands: source evidence review and contract consistency tests
  once schemas exist.
- Status: COMPLETE

### M3 — Reusable journey engine design checkpoint

- Objective: settle data-driven execution and evidence boundaries before code.
- Files/areas: existing `src/` journey/action/evidence/context modules and a
  task-local design section in `JOURNEYS.md` or `DESIGN.md`.
- Implementation actions: map declarative steps to constrained executors,
  semantic registry, mutation tripwire, passive unknown tracking, structural
  checkpoints, generic/journey oracles, and replay comparison.
- Acceptance criteria: a fourth journey can be represented mostly by a
  contract and small selectors/actions, with no duplicated runner boot logic.
- Validation commands: type-level/design review; no real target.
- Status: COMPLETE

### M4 — Implement engine and semantic/evidence integration

- Objective: implement reusable real code while preserving Phase 2A kernel.
- Files/areas: `src/journeys/` or existing equivalent, policy/action registry,
  recorder/evidence, runner/config, fixtures, tests.
- Implementation actions: add constrained action vocabulary and executor,
  request correlation/tripwire, structural checks, result schema, and fresh
  context lifecycle.
- Acceptance criteria: no per-journey bespoke runner duplication; fail-closed
  unknown/mutation behavior is enforced in code.
- Validation commands: focused unit tests, `npx tsc --noEmit`.
- Status: COMPLETE

### M5 — Synthetic/local validation

- Objective: prove the engine and safety paths without Alphaus traffic.
- Files/areas: local fixture routes/server and unit/smoke tests.
- Implementation actions: cover normal shell/read journeys, route/selector
  failures, mutation/unknown causality, passive unknowns, runtime/oracle,
  lifecycle cancellation, auth, host safety, privacy, and replay variance.
- Acceptance criteria: tests exercise real parser/classifier/executor/evidence/
  comparator code and all Phase 2B fixture cases pass.
- Validation commands: focused suite; `npx playwright test`.
- Status: COMPLETE

### M6 — Pre-real full validation and adversarial review

- Objective: prove implementation is ready before DEV traffic.
- Files/areas: all Nightwatch changes and state ledgers.
- Implementation actions: run required commands, inspect diff, verify no
  Alphaus modifications, audit auth/traces/evidence, answer the 15 pre-real
  review questions, and checkpoint `PRE_REAL_PHASE_2B_IMPLEMENTATION_READY`
  and `PRE_REAL_SELF_REVIEW_PASS`.
- Acceptance criteria: all checks pass; exactly three contracts and semantic
  registry are approved; exact next real command is in STATE.
- Validation commands: `npx tsc --noEmit`; `npx playwright test`; `npm run
  agent:check`; `git diff --check`; `git status --short`.
- Status: COMPLETE

### M7 — Journey 1 first observation and fresh-context replay

- Objective: prove the lowest-risk, clearest journey against DEV.
- Files/areas: real-run artifacts (ignored), STATE/REPORT ledgers.
- Implementation actions: validate auth/gate, run once, checkpoint evidence;
  only after success close context/create fresh context and replay exactly.
- Acceptance criteria: first and replay pass strict contract; variance is
  classified; safety/privacy counters are zero.
- Validation commands: exact approved journey runner commands and artifact
  review; no third run.
- Status: COMPLETE

### M8 — Journey 2 first observation and fresh-context replay

- Objective: prove materially different behavior after Journey 1 pair.
- Files/areas: real-run artifacts, STATE/REPORT.
- Implementation actions: same auth/gate/tripwire/evidence discipline.
- Acceptance criteria: pair passes with strict invariants and zero safety/
  privacy violations.
- Validation commands: exact contract-driven runner command; no concurrency.
- Status: COMPLETE

### M9 — Journey 3 first observation and fresh-context replay

- Objective: prove the third distinct customer behavior without lowering bar.
- Files/areas: real-run artifacts, STATE/REPORT.
- Implementation actions: same ordered gate/replay discipline; if new source
  evidence invalidates the candidate, return to already-proven inventory.
- Acceptance criteria: pair passes or task reports a truthful semantic blocker.
- Validation commands: exact contract-driven runner command; no third replay.
- Status: COMPLETE

### M10 — Cross-journey, safety, privacy, and architecture review

- Objective: determine whether the engine is consistent and reusable.
- Files/areas: engine, contracts, all artifacts, task docs.
- Implementation actions: compare boot/auth/proxy/policy/evidence/replay code;
  repair shared defects only with focused/full validation and bounded retry
  implications.
- Acceptance criteria: exact per-run and total counters, privacy PASS, no
  duplicate safety forks, fourth-journey extensibility review PASS.
- Validation commands: artifact scans, focused regressions, Alphaus status.
- Status: IN_PROGRESS

### M11 — Final validation and Phase 2B closure

- Objective: finalize a clean, recoverable Nightwatch-only handoff.
- Files/areas: SPEC/PLAN/STATE/REPORT, ACTIVE_TASK, project docs if needed.
- Implementation actions: complete acceptance matrix and self-review, run all
  final commands, commit only Nightwatch, set ACTIVE_TASK `COMPLETE`.
- Acceptance criteria: all SPEC criteria pass, worktree clean, no Phase 2C.
- Validation commands: required full suite, typecheck, agent check, diff check,
  status, Alphaus repository status comparison.
- Status: NOT_STARTED

## Validation Strategy

Use read-only source evidence first, then focused tests, then full local
validation, then a pre-real adversarial review. Real execution is serial and
gated. Every real pair gets fresh auth booleans, a healthy proxy, the same
journey definition, sanitized artifact review, and a STATE checkpoint before
the next pair.

## Decision Log

- 2026-08-12 — Decision: freeze Phase 2B acceptance before archaeology;
  reason: selection and success criteria must not be reverse-engineered from
  DEV behavior; evidence: user task requires SPEC before implementation;
  consequence: candidate names remain unset until M1/M2.
- 2026-08-12 — Decision: start from the clean terminal HEAD while retaining
  `a6d7c8b` as the implementation baseline; reason: Phase 2A docs-only
  descendants are approved continuity advances; consequence: `Current SHA`
  and `Last validated implementation SHA` remain the implementation baseline,
  while `Last checkpoint SHA` records the actual task HEAD.

## Discoveries

- Phase 2A closure is independently reconciled; no implementation drift is
  present after `a6d7c8b`.

## Deferred Work

- All Phase 2C and later functionality.
- Datastore/API oracles, mutations, fuzzing, AI planning, and L6 isolation.

## Completion Criteria

Exactly the SPEC criteria: three source-proven distinct journeys, reusable
engine, synthetic coverage, six successful controlled contexts with fresh
replays, zero safety/privacy/data-plane violations, full validation, clean
Nightwatch-only handoff, and no Phase 2C task.
