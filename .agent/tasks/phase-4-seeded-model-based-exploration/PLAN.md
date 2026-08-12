# Nightwatch Phase 4 — Seeded / Model-Based Exploration

## Purpose

Build a small reusable deterministic explorer over source-proven read-only
Ripple controls adjacent to the three trusted Phase 2C journeys. The explorer
must remain explainable and fail closed even when the seed chooses a different
safe path.

## Starting State

- Task ID: `phase-4-seeded-model-based-exploration`.
- Starting Nightwatch SHA: `acdb4a27a953dbff2c3408815efe634468d4ad20`.
- Validated Phase 3 implementation: `8d72ec9159cba450e4e9d763d0f9e9d0ba7a493b`.
- Phase 3 closure checkpoint: `058a1ab4168324f346bd80f8fd3c2c3edec45c77`.
- Relevant architecture: shared OutboundPolicy, mandatory L5 proxy, browser
  containment, auth gate, semantic endpoint registry, Phase 2B declarative
  journey engine, Phase 2C oracle/fingerprint/replay/evidence model, and
  Phase 3 source provenance/change intelligence.
- Established facts not to rediscover: Phase 2A/2B/2C closure, J1/J2/J3
  contracts, historical J2 font-502 and malformed-JSON classifications,
  `LOCAL_TRACKING_REF_ONLY` freshness, and Alphaus dirty-state boundaries.

## Scope

Continuity audit; Phase 4 task creation; current health audit; source
archaeology; candidate/rejection ledger; safe-action catalog; state and
transition schemas; three anchor envelopes; deterministic RNG/planner;
coverage/novelty/budget; action-causal attribution; local fixture exploration;
synthetic/property/adversarial validation; bounded DEV seeds/reproduction;
privacy/safety/architecture review; final validation and clean closure.

## Non-Goals

Phase 5, Oops/API generation, datastore work, production, mutations, unknown
actions, free-text fuzzing, arbitrary DOM crawling, AI planning, new journeys,
Alphaus edits, or broad overnight autonomy.

## Safety Constraints

- Modify only Nightwatch. Inspect Alphaus source/Git read-only; preserve every
  pre-existing dirty state and never fetch, checkout, reset, stash, clean, or
  install there.
- Reuse the one canonical safety policy and semantic registry; no wildcard or
  dynamic host approval, no production request, no DB query, no product write.
- Catalog approval requires source provenance, current-source review, stable
  selectors, bounded privacy-safe parameters, and read/local-only semantics.
- Unknown or mutation traffic caused by an intentional action is an immediate
  fail-closed stop. Passive initialization unknown remains distinct.
- External auth state is referenced by path only and checked with existing
  boolean gate before each real context. Never print or inspect its contents.
- Real execution is serial, fresh-context, pre-budgeted, and stops globally on
  any safety or privacy violation.

## Architecture / Approach

1. Freeze Phase 4 semantics in SPEC and task state before implementation.
2. Audit only source surfaces adjacent to the three anchors, tracing controls
   through stores/clients/endpoints/backend where required. Record rejected
   candidates so later sessions do not reconsider them without new evidence.
3. Keep source model, safe catalog, runtime availability, graph, and evidence
   distinct. The planner consumes declarative action definitions and never
   discovers controls itself.
4. Extend the shared journey/observer/evidence infrastructure with typed
   exploration contracts rather than a second browser safety stack.
5. Make the local fixture implement the same explorer interface as real
   execution. Add synthetic hostile branches and tripwires before DEV.
6. Run focused tests, full local validation, and an explicit adversarial review
   before any real context. Record the fixed real seeds and budgets first.
7. Execute the six-context base matrix serially only if source archaeology
   establishes safe branching. Reproduce at most one nontrivial sequence per
   envelope exactly in a fresh context. Close with privacy and integrity audit.

## Milestones

### M0 — Recovery, Phase 3 closure audit, and task creation

- Objective: establish a trustworthy Phase 4 starting point and freeze intent.
- Files/areas: `.agent/ACTIVE_TASK.md`, this task's SPEC/PLAN/STATE/REPORT.
- Implementation actions: verify reported SHAs/ancestry, current clean HEAD,
  inherited validation, Alphaus integrity, then create native task docs.
- Acceptance criteria: Phase 3 closure reconciles; Phase 4 task is active;
  SPEC is frozen before source/action implementation.
- Validation commands: `git status --short --branch`; `git log`; `git
  cat-file`; `npm run agent:check`; `npx tsc --noEmit`; Phase 3 focused tests.
- Status: COMPLETE — closure audit passed; task docs are being checkpointed.

### M1 — Current safety, semantic, and source-freshness health audit

- Objective: prove shared primitives are healthy and identify source baselines.
- Files/areas: safety/semantic/journey/oracle/replay modules, Phase 3 map,
  current Alphaus source/tracking refs.
- Implementation actions: inspect existing policy and endpoint registry,
  verify no Phase 3 model-relevant drift, record source SHAs and freshness;
  do not refactor healthy shared code.
- Acceptance criteria: health audit PASS or a scoped shared defect is recorded
  and repaired before real execution; no stale action model is used.
- Validation commands: focused inherited tests, `npm run agent:check`, read-only
  source/Git checks.
- Status: NOT_STARTED

### M2 — Exploration domain archaeology and candidate inventory

- Objective: identify a modest defensible adjacent read-only action pool.
- Files/areas: `ACTIONS.md`, `FRESHNESS.md`, source-backed Alphaus files.
- Implementation actions: trace candidate controls, endpoints, routes, state,
  persistence, analytics, selectors, and backend semantics; record every
  approval/rejection with explicit reason and source SHA.
- Acceptance criteria: candidate inventory and rejected-action ledger are
  complete; no candidate is approved from label/DOM presence alone.
- Validation commands: read-only `rg`/`git show`/status checks; no live DOM crawl.
- Status: NOT_STARTED

### M3 — Safe catalog, state/transition schemas, and envelope model

- Objective: freeze the declarative source/runtime model before planning.
- Files/areas: `src/core/exploration/`, `ACTIONS.md`, `MODELS.md`,
  `EXPLORATION.md`, catalog fixtures/tests.
- Implementation actions: implement catalog validation/fingerprints, privacy
  state identity, transition IDs, source/runtime edge status, three envelopes,
  stale-model checks, and Phase 3 dependency links.
- Acceptance criteria: catalog contains only approved read/local actions;
  state/transition hashes are stable and privacy-safe; envelope contracts are
  explicit and versioned.
- Validation commands: focused catalog/state/transition/staleness/privacy tests.
- Status: NOT_STARTED

### M4 — Deterministic RNG, planner, budget, coverage, and replay

- Objective: implement explainable seeded exploration over approved actions.
- Files/areas: planner/RNG/budget/coverage/novelty/replay modules and tests.
- Implementation actions: add SplitMix64 v1, canonical ordering, frontier
  walk, exclusion ledger, cycle/visit controls, strict exact-sequence replay,
  crash/partial evidence, and compatibility fingerprints.
- Acceptance criteria: same seed/model/catalog reproduces choices; different
  seeds can branch; safety exclusions cannot be overridden; budgets terminate.
- Validation commands: deterministic RNG/planner/budget/cycle/coverage/replay
  and property-like focused tests.
- Status: NOT_STARTED

### M5 — Action-causal network attribution and local synthetic fixture

- Objective: prove defense in depth with the real exploration engine.
- Files/areas: fixture server/driver, attribution/evidence integration, tests.
- Implementation actions: implement action windows against existing semantic
  monitor, fixture safe graph and hostile edges, mutation/unknown/new-host/
  production tripwires, oracle separation, and metadata-only evidence.
- Acceptance criteria: safe reachable subgraph is never left; hostile edges
  stop before subsequent action; passive unknown is not action-caused; privacy
  and atomic partial-run tests pass.
- Validation commands: synthetic matrix, fixture browser tests, focused safety
  tripwires, privacy and artifact compatibility tests.
- Status: NOT_STARTED

### M6 — Pre-real validation and adversarial review

- Objective: establish the fixed real-run gate, seeds, and budgets.
- Files/areas: Phase 4 STATE/REPORT/seed ledger, preflight scripts/tests.
- Implementation actions: run all focused/full checks, review 20+ adversarial
  questions, verify model freshness against local tracking refs, choose fixed
  seeds before DEV, and checkpoint `PHASE_4_PRE_REAL_EXPLORATION_READY`.
- Acceptance criteria: no unproven action, stale source, unsafe selector,
  privacy leak, host-policy weakening, nondeterminism, or budget bypass.
- Validation commands: `npx tsc --noEmit`, `npx playwright test`,
  `npm run agent:check`, `git diff --check`, focused Phase 4 tests.
- Status: NOT_STARTED

### M7 — Bounded real DEV exploration and exact reproduction

- Objective: validate seeded exploration around J1/J2/J3 without widening
  safety or replay boundaries.
- Files/areas: real-run ledger, sanitized artifacts, report/state.
- Implementation actions: run fixed seeds serially in fresh contexts, record
  each action/state/transition/safety/privacy outcome, then perform at most
  one strict sequence replay per envelope with a nontrivial sequence.
- Acceptance criteria: declared budget honored; safety vector remains zero;
  multiple seeds show documented safe path diversity where the model branches;
  runtime-unavailable actions are explicit; anomalies use Phase 2C admission.
- Validation commands: guarded DEV runner, sanitized evidence/privacy review,
  exact replay comparator, no extra exploratory retries.
- Status: NOT_STARTED

### M8 — Cross-seed analysis, architecture review, and closure

- Objective: close Phase 4 with recoverable evidence and no Phase 5 work.
- Files/areas: `STATE.md`, `REPORT.md`, `ACTIVE_TASK.md`, durable catalog/model
  docs, current-state docs only if a reusable fact merits promotion.
- Implementation actions: reconcile ledgers, inspect diff, compare Alphaus
  integrity, run final validation, commit Nightwatch only, leave clean.
- Acceptance criteria: all SPEC gates pass or the exact safe-frontier/safety/
  reproduction blocker is reported; task closes; Phase 5 is only recommended.
- Validation commands: full required validation, focused Phase 4 suite, status,
  manual diff, Alphaus before/after comparison.
- Status: NOT_STARTED

## Validation Strategy

Use focused unit/property-like tests for each model and planner invariant,
local browser fixtures for real engine and safety behavior, then the inherited
full Playwright suite. Before real DEV, run typecheck, full Playwright,
agent-check, diff-check, focused Phase 4 tests, privacy scans, and the
adversarial review. Real execution is serial and evidence is reviewed after
each context/pair. No production, DB, or Alphaus mutation is part of any
validation command.

## Decision Log

- 2026-08-12 — Phase 3 closure was independently reconciled before task
  creation: the reported implementation/checkpoint/terminal SHAs exist and
  are ancestral; current HEAD is the reported clean `acdb4a27`.
- 2026-08-12 — Freeze a three-envelope anchor model around J1/J2/J3. Reason:
  trusted journeys provide reproducible entries while avoiding a new journey
  or arbitrary live discovery.
- 2026-08-12 — Use `SplitMix64` v1 over canonical uint64 seeds. Reason: small,
  explicit, portable, and independent of wall-clock/global randomness.
- 2026-08-12 — Use a seeded frontier walk with deterministic canonical action
  ordering and explicit exclusions. Reason: it gives bounded safe diversity
  without building a universal search framework.

## Discoveries

- Phase 3's current shadow changeset is empty; Phase 4 validation therefore
  uses explicit `PHASE_4_VALIDATION_EXPLORATION`, never a fabricated source
  change or Phase 3 baseline advance.
- Source freshness remains `LOCAL_TRACKING_REF_ONLY`; no deployment identity
  is available and no model may silently claim deployment currency.

## Deferred Work

- Phase 5 Oops/API generation, broader product envelopes, datastore evidence,
  model auto-promotion, sequence minimization, scheduler/overnight autonomy,
  and AI planning.

## Completion Criteria

All frozen SPEC criteria pass, with any real-run safety/reproduction blocker
reported using the required Phase 4 blocker heading. Nightwatch is clean and
recoverable, Alphaus repositories retain their pre-existing state, and
`ACTIVE_TASK.md` is complete. Phase 5 is not started.
