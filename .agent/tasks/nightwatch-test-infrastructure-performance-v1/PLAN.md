# Test infrastructure performance and parallelization — plan

## Purpose

Deliver a measured, correctness-preserving acceleration of the Nightwatch
development and validation loop: a fast development lane, a milestone lane,
faster authoritative lanes, durable timing telemetry, and mechanical proofs
that coverage, safety, and gate semantics are unchanged.

## Starting State

- Task ID: `nightwatch-test-infrastructure-performance-v1`
- Starting Nightwatch SHA: `8dd8b163b567b939b977649d6ba7c371cf230ee6`
- Branch: `session/nightwatch-test-infrastructure-p-9ce4576b`
- Relevant architecture: `playwright.config.ts` (workers 1, fullyParallel
  false), `bin/quality-gate.mjs` + `config/quality-gate.v1.json` (12 required
  groups), `bin/quality-gate-clean.mjs`, `bin/campaign-synthetic.mjs` +
  `config/synthetic-campaign.v1.json`, `bin/semantic-compat.mjs` +
  `config/semantic-compatibility.v1.json`, `bin/validation-universe.mjs` +
  `config/validation-universe.v1.json`,
  `bin/lib/hardening/probe-campaign.mjs` (83 rules / 94 probes),
  `bin/lib/hardening/rules/source-integrity.mjs` (reference graph),
  `src/proxy/portLease.ts` (cross-process dynamic port leases).
- Dependencies: Node 20+ for clean/CI lanes, local Node 22 for development;
  no network is required by any measurement or lane.
- Established facts that must not be rediscovered: see SPEC.md "Starting
  state"; W13's lane receipts are read-only predecessor evidence.

## Scope

Measurement, duplicate-work classification, execution-class classification,
sharding/parallelization, affected-test selection, fast/milestone lanes,
synthetic-campaign and hardening-probe harness performance, deterministic
immutable caching, gate orchestration overhead, telemetry, structural
regression budgets, documentation, and the regressions/probes that prove each
of those.

## Non-Goals

Product behavior, product authority, safety-model weakening, test deletion,
skip growth, timeout-bound increases, clean-gate state reuse, remote/product
contact, sibling writes, and any D-1 change without a superseding recorded
decision and isolation evidence.

## Safety Constraints

- Highest-precedence repository rules from `AGENTS.md` and C-00 apply.
- One writing agent, one owned worktree, one session identity.
- Clean-checkout semantics stay independent of local state.
- Mutation campaigns never overlap against the same checkout.
- Only deterministic immutable inputs/outputs may be cached, keyed by source
  SHA + config digest + tool version + schema version; never by filename.
- Every parallel execution decision is backed by an explicit per-file
  execution class and a negative probe.

## Architecture / Approach

1. Measure first. A custom Playwright reporter plus `bin/test-timings.mjs`
   produce normalized per-file/per-test timing evidence; gate receipts gain
   additive durations. No optimization lands before its baseline exists.
2. Classify duplication mechanically (command -> group -> script -> manifest
   -> file set) before deduplicating anything.
3. Classify each test file's execution requirements mechanically
   (`PARALLEL_SAFE`, `PROCESS_ISOLATED_ONLY`, `SERIAL_REQUIRED`,
   `MUTATION_CAMPAIGN_EXCLUSIVE`) into a versioned config; unknown files fail
   closed to the serial class.
4. A shard runner executes disjoint shards as concurrent serial Playwright
   invocations with per-shard output directories and leased proxy ports, and
   proves `union(shards) == universe` with pairwise disjointness.
5. `gate:dev` and `gate:milestone` compose static checks, governance checks,
   affected tests, and bounded shards, and print an explicit
   NOT-certification label.
6. Affected-test selection uses a reverse import graph with declared
   always-run safety classes and fail-closed broadening for unmapped,
   dynamic-loading, or unknown paths.
7. The synthetic campaign moves immutable setup out of the per-case path and
   gains a v2 execution contract for concurrent shards, each still serial with
   zero retries, gated by a normalized result-set equivalence proof.
8. Hardening probes keep 94/94 while the harness becomes cheaper per probe.
9. Structural regression budgets guard process counts, duplicate executions,
   build counts, shard membership, and cache-key correctness; wall-clock
   thresholds are reporting-only.

## Milestones

### M0 — Governed activation and C-00 ownership

- Objective: task/OpenSpec/handoff surfaces exist, session owned, routing
  correct, activation checkpoint committed.
- Files/areas: `.agent/tasks/nightwatch-test-infrastructure-performance-v1/**`,
  `openspec/changes/nightwatch-test-infrastructure-performance-v1/**`,
  `.agent/ACTIVE_TASK.md`, `.agent/EXECUTION_PROMPT.md`,
  `docs/CURRENT_STATE.md` live block.
- Implementation actions: create the surfaces from live state; bind the
  handoff to this task; update the live-state cross-check; validate.
- Acceptance criteria: `agent:check`, `handoff:check`, `project:check`,
  `workspace:check`, `session:check`, `hardening:check`, and strict OpenSpec
  validation pass; activation checkpoint committed.
- Validation commands: the command set above.
- Status: DONE

### M1 — Timing profiler and baseline measurement

- Objective: a durable, offline timing surface plus a committed baseline for
  every named lane.
- Files/areas: new Playwright timing reporter, `bin/test-timings.mjs`, gate
  receipt duration fields, baseline evidence under the task `evidence/`.
- Implementation actions: capture wall/CPU/worker/test counts/setup and
  teardown shape per lane with host-load receipts; rank slowest files/tests.
- Acceptance criteria: `npm run test:timings` works offline, emits JSON and a
  text summary, and the baseline table is committed.
- Validation commands: `npm run test:timings`, lane commands from the master
  prompt section 2, with load receipts.
- Status: IN_PROGRESS

### M2 — Duplicate-work map

- Objective: a mechanical matrix of every lane's expensive work with each
  duplication classified.
- Files/areas: mapping tool/receipt under the task `evidence/`.
- Implementation actions: trace command -> group -> script -> manifest ->
  discovered files -> expensive setup; classify per the five classes.
- Acceptance criteria: no overlap is removed without a class; clean-gate
  independence is explicitly preserved.
- Validation commands: mapping tool plus `playwright test --list` set algebra.
- Status: NOT_STARTED

### M3 — Execution-class classification

- Objective: a versioned per-file execution class config with mechanical
  detection and negative probes.
- Files/areas: `config/validation-execution-classes.v1.json`, detection
  tooling, tests.
- Implementation actions: derive classes from git shell-outs, owner-local
  state, fixed paths, port binds, chdir, and mutation behavior; unknown fails
  closed; probes prove misclassification is detected.
- Acceptance criteria: every discovered test file classifies; negative probes
  fail as designed.
- Validation commands: focused class tests plus `npm run validation:universe`.
- Status: NOT_STARTED

### M4 — Shard runner with coverage equality proof

- Objective: disjoint shards run concurrently with a mechanical equality
  proof and evidence-based worker default.
- Files/areas: shard runner bin/tool, shard config, receipt schema, tests.
- Implementation actions: concurrent serial invocations, per-shard output
  directory and leased port, bounded `NIGHTWATCH_TEST_WORKERS`, 1/2/4/N
  benchmark, process-launch accounting.
- Acceptance criteria: `union == universe`, pairwise disjoint, no duplicate
  execution, no omitted file; benchmark chooses the default.
- Validation commands: shard runner self-check, shard tests, benchmark runs.
- Status: NOT_STARTED

### M5 — Fast development and milestone lanes

- Objective: `gate:dev` (target <= 120 s) and `gate:milestone` (target <= 300 s)
  exist and are explicitly not certification.
- Files/areas: new gate definition/mode, package scripts, tests.
- Implementation actions: compose affected selection + always-run classes +
  cheap static/governance checks; print NOT-certification labelling.
- Acceptance criteria: lanes run, state their non-authority, and are measured;
  authoritative lanes unchanged in semantics.
- Validation commands: `npm run gate:dev`, `npm run gate:milestone`.
- Status: NOT_STARTED

### M6 — Affected-test selection

- Objective: deterministic changed-path -> test selection with fail-closed
  broadening.
- Files/areas: `bin/affected-tests.mjs` (or equivalent), reference-graph
  reuse, always-run declarations, tests.
- Implementation actions: explicit base SHA, non-zero changed-file assertion,
  reverse import graph, dynamic-load/unknown broadening, test-infra > full
  test-infra selection; negative probes for hidden dependency, core shared
  module, and unmapped path.
- Acceptance criteria: no changed-file case can select zero tests; probes
  demonstrate broadening.
- Validation commands: focused selector tests and the negative probes.
- Status: NOT_STARTED

### M7 — Synthetic campaign and hardening-probe performance

- Objective: materially faster synthetic campaign (still 1,897/1,897) and a
  cheaper 94-probe campaign.
- Files/areas: `config/synthetic-campaign.*`, `bin/campaign-synthetic.mjs`,
  `bin/lib/hardening/probe-campaign.mjs`, tests.
- Implementation actions: move immutable setup out of the per-case path;
  synthetic v2 execution contract with concurrent per-shard serial execution
  and normalized result-set equivalence; probe harness cost reduction without
  concurrent mutation of one checkout.
- Acceptance criteria: equivalence proof green; 83 rules / 94 probes / 94
  detected preserved; measured speedup recorded.
- Validation commands: `npm run campaign:synthetic`, `npm run hardening:rules`.
- Status: NOT_STARTED

### M8 — Deterministic reuse and gate orchestration

- Objective: remove repeated expensive setup where identity allows, without
  stale reuse.
- Files/areas: cache/reuse module(s), gate orchestration.
- Implementation actions: digest-keyed immutable reuse; build-once for the
  Control Center UI if profiling shows repeated builds; load gate metadata
  once; avoid nested npm dispatch where direct Node invocation is
  governance-equivalent.
- Acceptance criteria: cache keys cover source SHA + config digest + tool
  version + schema version; stale inputs cannot be reused; no gate group
  reordering.
- Validation commands: cache-key tests, `gate:local` timing comparison.
- Status: NOT_STARTED

### M9 — Structural performance regression budgets

- Objective: stable guards that make future slowdowns visible without flaky
  wall-clock assertions.
- Files/areas: focused tests/guards.
- Implementation actions: process-launch counts, duplicate-suite execution
  counts, build counts, shard membership, cache-key correctness.
- Acceptance criteria: guards pass on the optimized tree and fail on a
  deliberately regressed probe.
- Validation commands: focused guard tests.
- Status: NOT_STARTED

### M10 — Validation-universe and lane registration

- Objective: every new executable file is classified and lanes are declared.
- Files/areas: `config/validation-universe.v1.json`,
  `config/validation-lane-state.v1.json`, refreshed digest.
- Implementation actions: register new tools/tests; refresh inventory digest
  from the tool; add lane-state entries for new lanes.
- Acceptance criteria: discovered/unclassified == 0; digest refreshed;
  `validation:universe` PASS.
- Validation commands: `npm run validation:universe`.
- Status: NOT_STARTED

### M11 — Flakiness and resource hygiene

- Objective: parallel lanes are stable and leak-free.
- Files/areas: task evidence; hygiene tooling adjustments if needed.
- Implementation actions: repeated consecutive runs of `gate:dev` and
  `gate:milestone`, changed-shard repeats, ownership-scoped leak checks for
  browser/node/server/port/temp/worktree state.
- Acceptance criteria: repeated runs stable; no leaked owned process or
  residual state; races fixed, not hidden by fewer workers.
- Validation commands: repeated lane runs plus `npm run hygiene:status`.
- Status: NOT_STARTED

### M12 — Final certification and before/after benchmark

- Objective: one authoritative certification pass and the measured
  before/after table.
- Files/areas: task evidence and report.
- Implementation actions: run the master prompt section 25 sequence once;
  record counts, durations, receipts, skips, failures, worker counts.
- Acceptance criteria: all required lanes green; equivalence evidence
  complete; table committed.
- Validation commands: the full section 25 sequence.
- Status: NOT_STARTED

### M13 — C-00 integration, documentation, and verdict

- Objective: integrated, documented, clean tree, one final verdict.
- Files/areas: README/developer docs, task REPORT, ACTIVE_TASK closure,
  project docs.
- Implementation actions: inspect diff/privacy, fast-forward integrate,
  verify `HEAD == origin/main`, release/remove the session, write the final
  report sections A-O and choose exactly one verdict.
- Acceptance criteria: clean tree, `HEAD == origin/main`, report complete.
- Validation commands: `git status`, `git rev-parse HEAD`, `git ls-remote`.
- Status: NOT_STARTED

## Validation Strategy

- Focused tests and probes during implementation; no full certification per
  patch.
- `gate:dev` after each logical block; `gate:milestone` after coherent
  checkpoints.
- `npm test` + `gate:local` once near finalization; `gate:clean` once at the
  lifecycle-approved point after release.
- Every coverage claim carries set-equality or normalized-result evidence.

## Decision Log

- 2026-09-20 — Decision: the canonical full regression becomes shardable, and
  the shard runner may become its execution shape, superseding D-1's
  "workers: 1 / fullyParallel: false" rationale for the canonical lane only
  with a recorded superseding decision and per-file isolation evidence;
  reason: the master prompt targets a significantly faster `npm test` and
  authorizes stable shards; evidence: owner answer recorded in the activation
  handoff; consequence: D-1 rationale must be explicitly superseded before the
  canonical lane changes shape.
- 2026-09-20 — Decision: the synthetic campaign may adopt a v2 execution
  contract with concurrent shards, each serial with zero retries; reason:
  section 11 authorizes safe shards while preserving 1,897/1,897; evidence:
  owner answer; consequence: the v1 serial contract remains as fallback until
  the equivalence proof is green.
- 2026-09-20 — Decision: baseline and final benchmarks request owner-quiesced
  host windows; reason: the host currently runs four codex agents and one
  opencode agent at load ~4.8; evidence: owner answer plus W13's measured
  423-643 s spread under contention; consequence: if a window is not
  quiesced, measurements carry load receipts and medians.

## Discoveries

- `config/synthetic-campaign.v1.json` (105 files) and
  `config/semantic-compatibility.v1.json` (149 files) are disjoint; both are
  subsets of the 378-file full regression universe.
- Proxy port leases already coordinate concurrent invocations cross-process,
  and proxy state/event paths are lease-suffixed.
- 83 hardening rules / 94 probes each spawn a fresh Node process (about 94
  process launches) and mutate the real checkout serially.

## Deferred Work

- Any product-behavior change or new validation semantics discovered during
  measurement is out of scope and is recorded here rather than implemented.

## Completion Criteria

All M0-M13 milestones closed, the final certification sequence green with
counts preserved, before/after evidence committed, C-00 integration verified,
documentation published, and exactly one verdict recorded in REPORT.md.
