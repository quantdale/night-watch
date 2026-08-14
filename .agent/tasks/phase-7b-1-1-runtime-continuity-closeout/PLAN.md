# Nightwatch Phase 7B.1.1 — Runtime Deadline and Continuity Semantics Closeout

## Purpose

Close the true provider-work deadline gap and replace self-referential SHA
state with stable historical anchors plus live Git authority. The observable
result is bounded provider transport, deterministic cancellation evidence, and
documentation-only descendants that remain documentation rather than being
mislabelled as implementation.

## Starting State

- Task ID: `phase-7b-1-1-runtime-continuity-closeout`
- Starting live SHA: `102f40763da45e8866b4150869f45b152168f2bc`
- Last substantive predecessor: `40e59ecf6209dac7ef88ac2af0bcef781562a837`
- Branch/remote: `main` / private `origin` (`quantdale/night-watch`)
- Established runtime and continuity defects are frozen in SPEC; do not
  repeat broad Phase 7B archaeology.

## Scope

Runtime deadline/cancellation, loopback and synthetic fixtures, agent-state
semantic validation/tests, continuity templates/protocol docs, current-state
terminology, focused/full local validation, isolated checkout, and validated
private Git checkpoints.

## Non-Goals

Owner-review CLI, Phase 8, real model/cloud AI, real campaign/product/auth
traffic, databases, infrastructure, publication, history rewrite, and
Alphaus-repository writes.

## Safety Constraints

All execution is local/static/synthetic/loopback-fixture-only. No credentials,
customer values, private findings, raw authenticated evidence, prompts,
responses, or model output enter Git or task state. Provider containment,
owner policy, immutable review provenance, non-bypassable provider budget, and
read-only agent-state semantics remain fail-closed. Only Nightwatch commits
may be pushed; never force-push and stop if origin advances.

## Architecture / Approach

```text
AiReviewSession construction
  -> monotonic startedAt
  -> centralized remaining runtime
  -> synchronous attempt/provider reservations
  -> one private handler boundary(operation, input, { signal, timeoutMs })
  -> active AbortController deadline + exact-once settlement
  -> loopback/synthetic transport observes signal

stable implementation anchor
  -> approved documentation/continuity descendants
  -> live HEAD discovered with git rev-parse
```

`Current SHA` is removed from new required fields. Legacy values, when found,
are parsed only as deprecated historical data and never compared to live HEAD.

## Milestones

### M0 — Bootstrap, task routing, and defect reconfirmation

- Objective: establish synchronized canonical state and durable recovery files.
- Files/areas: `.agent/`, required docs, current AI/agent-state sources/tests.
- Implementation actions: create this task, route ACTIVE_TASK, verify single
  writer, record exact starting anchors and safety boundary.
- Acceptance criteria: task files exist; historical statuses preserved; both
  defects are evidenced from current source.
- Validation commands: `git status --short`, `git rev-parse HEAD`,
  `git rev-parse origin/main`, focused source inspection.
- Status: COMPLETE

### M1 — Monotonic deadline and active provider cancellation

- Objective: make the session deadline absolute and actively abort provider
  work at the remaining budget.
- Files/areas: `pipeline.ts`, `types.ts`, provider handler boundary.
- Acceptance criteria: default `performance.now`, central remaining helper,
  finite positive effective timeout, AbortSignal, exact-once settlement,
  no dangling timer, preserved accounting.
- Validation commands: focused AI runtime tests and `npm run typecheck`.
- Status: COMPLETE

### M2 — Loopback/synthetic cancellation and runtime regressions

- Objective: make both local providers observe cancellation and prove expired,
  near-expiry, hanging, concurrent, timeout-accounting, and successful cleanup.
- Files/areas: `loopbackProvider.ts`, `syntheticProvider.ts`, AI tests.
- Acceptance criteria: no hanging request/resolver remains after abort; local
  loopback socket closes; shared deadline is not extended per call.
- Validation commands: focused AI/loopback Playwright tests.
- Status: COMPLETE

### M3 — Stable continuity semantics in agent-state

- Objective: validate implementation/documentation roles against live Git while
  removing the Current SHA self-reference requirement.
- Files/areas: `bin/agent-state.mjs`, `tests/unit/agent-state.test.ts`.
- Acceptance criteria: live HEAD authority, stable ancestor checks, precise
  role/ancestry diagnostics, docs-only checkpoint advance, COMPLETE strictness.
- Validation commands: agent-state unit tests and `npm run agent:check`.
- Status: COMPLETE

### M4 — Protocol/template/current-state reconciliation

- Objective: prevent new tasks from reintroducing ambiguous current-head
  fields and reconcile current project memory without rewriting historical
  reports/tasks.
- Files/areas: `.agent/templates`, `.agent/README.md`, `.agent/PLANS.md`,
  `AGENTS.md`, `docs/CURRENT_STATE.md`, task files.
- Acceptance criteria: new templates use stable anchors/live Git; current
  state names validated implementation and Git authority explicitly.
- Validation commands: `rg` continuity audit, agent-state tests/check.
- Status: COMPLETE

### M5 — Full local and isolated validation

- Objective: run all applicable local checks and a fresh dependency checkout.
- Files/areas: repository-wide validation only; no product/Alphaus writes.
- Acceptance criteria: typecheck, hardening, focused/full tests, synthetic
  campaign, agent check, privacy/diff checks, clean checkout all pass.
- Validation commands: acceptance command set in SPEC.
- Status: COMPLETE

### M6 — Architecture/adversarial review and durable closure

- Objective: inspect all requested adversarial cases, update state/report,
  commit/push validated checkpoints, and verify live equality/CI.
- Files/areas: task state/report, implementation and docs diffs, Git remote.
- Acceptance criteria: no safety regression, no self-reference cycle, clean
  worktree, live `HEAD == origin/main`, exact CI result reported only if read.
- Validation commands: manual review, `git diff --check`, `git fetch origin`,
  `git rev-parse HEAD`, `git rev-parse origin/main`.
- Status: COMPLETE

## Validation Strategy

Run focused runtime tests after each runtime milestone; agent-state fixtures
after continuity implementation; then typecheck, hardening, full Playwright,
synthetic campaign, agent check, privacy/secret scan, diff check, and manual
review. Validate from an isolated clean checkout before final closure. No real
model, product traffic, database, infrastructure, or external publication is
permitted.

## Decision Log

- 2026-08-14 — Keep `40e59ec…` as the predecessor validated implementation
  anchor and discover current HEAD from Git; later Phase 7B.1 docs/status
  commits are historical descendants, not implementation truth.
- 2026-08-14 — Use `performance.now()` as the runtime default and retain
  injected clocks for deterministic tests; wall dates remain artifact metadata.
- 2026-08-14 — Require `LAST_SUBSTANTIVE_CHECKPOINT_SHA ==
  LAST_VALIDATED_IMPLEMENTATION_SHA` for new task state; reject a docs-only SHA
  presented as the implementation role.

## Discoveries

- Current `callProvider()` rejects without cancelling the registered handler.
- Current loopback and PENDING synthetic providers lack boundary cancellation.
- Current validator compares persisted current-head fields and forces a
  self-referential implementation SHA equality.

## Deferred Work

- Owner-review CLI, local model canary, cloud AI, campaign integration, Phase 8,
  infrastructure/data operations, and any real product traffic.

## Completion Criteria

All SPEC acceptance criteria pass; runtime and continuity checkpoints are
validated and pushed; stable anchors remain historical; final docs do not
require their own commit SHA; local and origin heads are verified equal; task
is marked COMPLETE and no next task is started.
