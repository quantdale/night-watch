# Nightwatch Phase 7B.1.2 — Final Integrity Closeout

## Purpose

Close the exact provider-accounting and continuity-role gaps left after
Phase 7B.1.1, then prove the recovery matrix in private CI. The resulting
provider counter and implementation anchor each describe the semantic event
their names claim, while all existing safety and review-provenance boundaries
remain unchanged.

## Starting State

- Task ID: `phase-7b-1-2-final-integrity-closeout`
- Starting Nightwatch SHA: `1819dbfcdf023044208bfa6a65eb8e823733804a`
- Prior validated implementation/substantive anchor:
  `198f26ca79803c1bedac9aa08a71ecbd542ee804`
- Branch/remote: `main` / private `origin` (`quantdale/night-watch`)
- Established facts: Phase 7B.1.1 runtime deadline/cancellation and stable
  anchor semantics are accepted; current source still has a reservation-before-
  final-admission gap, same-value documentation role bypass, and no direct
  agent-state CI matrix step.
- Do not repeat broad Alphaus reconnaissance or earlier phase archaeology.

## Scope

Atomic provider final-admission accounting, deterministic AI/loopback
regressions, commit-role and STARTING_SHA lineage proof in `agent-state`,
synthetic Git-history tests, private hardening CI, task continuity state and
report, full local/isolated validation, checkpoint pushes, and exact remote CI
verification.

## Non-Goals

Owner-review CLI, Phase 8, real model/cloud AI, model downloads, real
campaigns/auth/product traffic, Alphaus repository changes, databases,
infrastructure/deployment archaeology, publication, new AI capabilities,
campaign integration, Git history rewrite, and auto-repairing validator state.

## Safety Constraints

All execution is local/static/synthetic/loopback-fixture-only. No credentials,
customer data, real findings, raw authenticated evidence, or real model output
may enter Git or `.agent`. The provider authority remains `AiReviewSession`,
the shared cap remains three, owner policy remains local-only, and loopback
transport remains HTTP/loopback/fixed-path/no-credential/no-redirect/no-proxy.
Agent-state is read-only and offline. Only validated Nightwatch source and
documentation checkpoints may be pushed to private `origin/main`; never
force-push.

## Architecture / Approach

```text
AiReviewSession
  -> validate registered/local provider
  -> final monotonic runtime check
  -> shared provider-cap check
  -> effective timeout + AbortController
  -> providerCalls += 1
  -> immediate private registered-handler call (same synchronous stack)
  -> AbortSignal-bounded provider work

STARTING_SHA
  -> carried-forward anchor OR new implementation descendant
  -> claimed commit's own changed-path role proof
  -> stable validated/substantive anchor
  -> approved documentation descendants
  -> live HEAD discovered with Git
```

The accounting increment and registered-handler call are colocated in one
private helper. No Promise is awaited or yielded between them. For continuity,
direct commit inspection uses read-only Git and fails closed on ambiguous merge
role attribution rather than using a range-only proxy for the claimed commit.

## Milestones

### M0 — Bootstrap, recovery, and defect reconfirmation

- Objective: establish canonical synchronized state and durable task routing.
- Files/areas: `.agent/`, required docs, current provider/continuity sources,
  CI and history.
- Implementation actions: verify writer/process state; create task files and
  route ACTIVE_TASK; confirm the old reservation and same-value role edges.
- Acceptance criteria: clean synchronized starting SHA; historical statuses
  preserved; exact gaps documented; no forbidden activity.
- Validation commands: `git fetch origin`, Git root/status/head checks,
  focused source inspection, synthetic baseline tests.
- Status: COMPLETE

### M1 — Atomic provider final-exposure admission

- Objective: move `providerCalls` into the final synchronous boundary.
- Files/areas: `src/core/aiReview/pipeline.ts`, provider types/exports if
  needed, hardening check only if a focused structural guard is justified.
- Implementation actions: remove the earlier reservation; add a private
  handler-entry helper that validates final runtime/cap, creates cancellation
  context, increments once, and calls the registered handler immediately.
- Acceptance criteria: expired final admission does not increment or invoke;
  positive admission increments exactly once; no raw bypass or second path.
- Validation commands: focused AI tests; `npm run typecheck`; hardening check.
- Status: COMPLETE

### M2 — Provider accounting and cancellation regressions

- Objective: adversarially prove accounting and preserve 7B.1.1 behavior.
- Files/areas: `tests/unit/aiReview.test.ts`,
  `tests/unit/aiReviewLoopback.test.ts`, synthetic/loopback providers.
- Implementation actions: add stepped mutable-clock edge, positive timeout,
  synchronous throw, registration failure, concurrency/deadline pressure,
  and existing failure-mode assertions.
- Acceptance criteria: focused AI/loopback matrix passes with exact usage,
  invocation, pending, timeout, abort, and cleanup observations.
- Validation commands: focused Playwright tests with project/workers pinned.
- Status: COMPLETE

### M3 — Claimed-commit role proof and lineage validation

- Objective: validate the role of the claimed commit itself and its relation
  to `STARTING_SHA`, including conservative merge handling.
- Files/areas: `bin/agent-state.mjs` and continuity diagnostics/tests.
- Implementation actions: add deterministic `git diff-tree`-class helper for
  direct commit paths; distinguish carried-forward anchors from new claims;
  reject docs-only new implementation roles, unrelated lineage, and
  ambiguous claims with precise codes.
- Acceptance criteria: same-value docs forgery cannot become SYNCED or
  CHECKPOINT_ADVANCE; legitimate source/docs and carried-forward cases pass.
- Validation commands: agent-state synthetic matrix and `npm run agent:check`.
- Status: COMPLETE

### M4 — Continuity adversarial matrix

- Objective: retain all existing tests and add the load-bearing role/lineage
  cases.
- Files/areas: `tests/unit/agent-state.test.ts`.
- Implementation actions: exercise A/B/C source/docs histories, same-value
  HEAD/later-doc forgery, valid docs descendant, carried-forward predecessor,
  new implementation, unrelated branch, docs-before/source-containing docs,
  untracked source, COMPLETE drift, and live Git authority.
- Acceptance criteria: full synthetic continuity matrix passes without
  mutating fixture state through the checker.
- Validation commands: `npx playwright test tests/unit/agent-state.test.ts
  --project=nightwatch --workers=1`; `npm run agent:check`.
- Status: COMPLETE

### M5 — Private CI continuity gate

- Objective: make CI independently execute the synthetic agent-state matrix.
- Files/areas: `.github/workflows/hardening.yml`.
- Implementation actions: add a deterministic serialized matrix step using
  existing Node/Playwright installation; preserve read-only permissions and
  full Git history; do not add secrets/artifacts/network dependencies.
- Acceptance criteria: exact final workflow shows the step executed and
  succeeded.
- Validation commands: local equivalent plus final GitHub Actions inspection.
- Status: IN_PROGRESS

### M6 — Full local and isolated validation

- Objective: run all applicable checks and a fresh dependency checkout.
- Files/areas: repository-wide validation only.
- Implementation actions: focused/full Playwright, typecheck, hardening,
  synthetic campaign, agent check, privacy/secret scan, diff check, and
  isolated clone validation.
- Acceptance criteria: every applicable check passes; no forbidden activity;
  clean isolated checkout and clean canonical worktree.
- Validation commands: acceptance command set in SPEC and task state ledger.
- Status: NOT_STARTED

### M7 — Architecture/adversarial review and durable closure

- Objective: review both semantic identities, record stable anchors, push
  substantive then documentation checkpoints, and verify exact final CI.
- Files/areas: implementation, tests, workflow, task state/report/docs, Git.
- Implementation actions: inspect diff/privacy, commit validated substantive
  source checkpoint, push/verify; update stable documentation closure, push,
  verify live equality and exact workflow/job/step result; close task.
- Acceptance criteria: all task acceptance criteria pass; no final SHA
  self-reference; Phase 8 and owner-review CLI remain untouched.
- Validation commands: `git diff --check`, `git fetch origin`, Git SHA
  equality, exact GitHub Actions run/job/step inspection.
- Status: NOT_STARTED

## Validation Strategy

Validate each milestone before advancing. Start with focused AI/provider and
agent-state tests, then run typecheck and hardening. At closure run the full
Playwright suite, synthetic campaign, agent check, privacy/secret scan,
`git diff --check`, and an isolated clean checkout with no credentials or
external targets. After each push, fetch and verify local `HEAD == origin/main`.
The final remote workflow must independently execute the agent-state matrix.

## Decision Log

- 2026-08-14 — Keep the prior `198f26c…` anchor as the carried-forward
  implementation truth and set this task's `STARTING_SHA` to the live
  `1819dbf…` docs head; this preserves stable-anchor semantics without
  self-reference.
- 2026-08-14 — Count synchronous handler entry, including a synchronous throw,
  as provider exposure; the increment must be immediately adjacent to the
  internal handler invocation.
- 2026-08-14 — Validate the claimed commit's own changed paths for new
  implementation anchors; range-only evidence is insufficient. Ambiguous merge
  role proof fails closed.

## Discoveries

- Current `reserveProviderCall()` increments before `callProvider()` repeats
  the runtime check, allowing a deterministic final-deadline gap.
- Current continuity role inspection only runs for `validated !== substantive`,
  so equal documentation SHAs can bypass implementation-role validation.
- Current workflow runs `agent:check` but not the synthetic continuity test
  matrix.

## Deferred Work

- Owner-review CLI, local model canary, Phase 8, real campaigns/auth/product
  traffic, databases, infrastructure/data operations, publication, and all
  other absolute no-go items remain deferred.

## Completion Criteria

Complete only after the provider and continuity invariants are executable and
adversarially tested, CI independently runs the full agent-state matrix, all
local and isolated validations pass, stable substantive/documentation anchors
are recorded, validated checkpoints are pushed with live equality, exact final
CI succeeds including the new step, the worktree is clean, and ACTIVE_TASK is
closed. Do not start another task in this session.
