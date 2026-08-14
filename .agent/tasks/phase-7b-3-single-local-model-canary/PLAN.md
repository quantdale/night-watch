# Nightwatch Phase 7B.3 — Single Bounded Local-Model Canary

## Purpose

Add and close a deliberately one-shot, synthetic-only harness for an
already-local OpenAI-compatible model while preserving the Phase 7B review
assistant boundary and the permanent Phase 6 owner freeze.

## Starting State

- Task ID: `phase-7b-3-single-local-model-canary`.
- Starting SHA: `18bc3fa8f64322b8b43c9ccd0b07b182668d1932`.
- Prior validated implementation/substantive anchor:
  `3916594f6e947f7f4665b23751c1d3ec03f5928b`.
- Phase 7B.2.1 is complete; Phase 8 is not started.
- Live HEAD authority: discover with Git; never serialize a current SHA as
  self-referential state.

## Scope

The fixed local-canary fixture/controller, thin CLI, focused deterministic
tests, source hardening, package/CI wiring, task state, and sanitized project
documentation in the Nightwatch repository only.

## Non-Goals

Installing/downloading runtimes or weights, cloud/remote AI, arbitrary input,
multiple providers/calls, retries, oracle suggestions, persisted artifacts,
owner review, product/browser/campaign/auth/DEV/NEXT/production activity,
databases, infrastructure, publication, Phase 8, and sibling repositories.

## Safety Constraints

- Use only fixed synthetic L2 evidence with fake IDs and PASS/zero vectors.
- Use the canonical `LoopbackAiReviewProvider`; do not add another HTTP path.
- Validate exact loopback endpoint and model grammar before provider entry.
- Start no runtime unless a future owner-authorized path proves every startup
  safety condition; the preferred implementation has no lifecycle code.
- Do not inspect secret environment variables, owner findings, or real
  evidence. Do not print raw model content or raw response bodies.
- Real execution, if safe local runtime/model evidence exists, is the final
  experiment and is limited to one `BUG_CANDIDATE` request.

## Architecture / Approach

- Add `src/core/aiReview/localCanary.ts` with a versioned fixed fixture,
  strict argument parser, one-shot controller, sanitized result/error types,
  and metadata formatter. The controller creates one loopback provider and
  one fresh session without a store, checks counters, invokes one review, and
  validates the in-memory v2 draft/reference/privacy boundary before dropping
  the draft.
- Add `bin/ai-local-canary.mjs` using the repository's known TypeScript loader.
  It parses only the bounded options, invokes the controller once, prints
  sanitized metadata, and maps PASS/FAIL/NOT_RUN to documented exit codes.
- Add `tests/unit/aiLocalCanary.test.ts` with fixture privacy adversarial
  coverage, endpoint/model/CLI matrices, loopback request assertions, one
  request/no retry cases, malformed/schema/reference/privacy/timeout failures,
  null artifact path, and sanitized output checks.
- Extend `bin/hardening-check.mjs`, `package.json`, and deterministic CI with
  source-scoped canary boundaries. Keep the existing loopback provider and
  AI review budget unchanged.
- Update roadmap, current state, architecture/decision memory if warranted,
  and task state/report only with sanitized metadata and stable Git anchors.

## Milestones

### M0 — Bootstrap, recovery, and frozen design (COMPLETE)

- Reverified canonical Git root, clean `main`, remote, fetch, and exact
  synchronized starting SHA.
- Confirmed the previous Phase 7B.2.1 task is complete and no writer lock or
  competing task is active.
- Read the required durable docs, architecture, predecessor task handoff,
  current AI contracts/tests, hardening check, package, and CI.
- Created and routed this native task with stable anchor semantics.

### M1 — Fixed fixture and one-shot controller (COMPLETE)

- Add the versioned synthetic L2 fixture and compute its tamper-evident input
  digest through the existing validator.
- Add the controller's strict endpoint/model/timeout gate, pre-call counter
  invariant, one bug-candidate call, post-call counter invariant, in-memory
  draft validation, and sanitized result classes.

### M2 — Thin CLI, tests, and static boundary (COMPLETE)

- Add exact CLI parser/exit behavior and package command.
- Add deterministic fixture/loopback/parser/failure/no-retry/no-persistence
  tests.
- Extend hardening and CI without adding a real model service or runtime.

### M3 — Full deterministic validation and clean checkout (COMPLETE)

- Run focused tests, typecheck, hardening, existing AI/loopback and owner
  provenance tests, agent-state tests, synthetic campaign, full suite,
  privacy/secret scan, diff checks, and isolated clean-checkout validation.
- Repair any deterministic failure before advancing.

### M4 — Validated source checkpoint and deterministic CI (COMPLETE)

- Inspect the scoped diff/privacy surface, commit the validated harness,
  push `origin main`, fetch, and verify local `HEAD == origin/main`.
- Inspect the exact deterministic GitHub workflow and canary harness step for
  the implementation SHA; do not run a real model in CI.

### M5 — Safe local runtime gate and single canary (COMPLETE)

- Use only narrow local evidence to establish a compatible already-installed
  runtime, exact endpoint, and exact present model identifier. Never install,
  download, scan ports, or use cloud/remote fallback.
- Freeze the endpoint/model, verify the source checkpoint and all deterministic
  gates, then make at most one real call. Record sanitized PASS/FAIL or NOT_RUN
  evidence and perform no retry. Stop any task-started child only if the
  separately proven lifecycle path is used.

### M6 — Documentation closure and final deterministic CI (COMPLETE)

- Update current state, roadmap/architecture/decision memory as needed, task
  state/report, and ACTIVE_TASK with no raw model prose or private data.
- Push documentation closure, verify exact final CI and clean synchronized
  Git, mark the task complete, and stop without starting Phase 8.

## Validation Strategy

Before any real call: `npm run typecheck`, `npm run hardening:check`, focused
local-canary tests, existing AI/loopback tests, owner-provenance tests,
agent-state tests, `npm run campaign:synthetic`, full deterministic tests,
`git diff --check`, privacy/secret review, and a full-history isolated clean
checkout with `npm ci --ignore-scripts`. The real call, if allowed, is last,
uses one fixed synthetic input, and is followed only by local post-canary
state/diff/persistence checks. GitHub Actions remains synthetic-only.

## Decision Log

- 2026-08-14 — The harness uses a fixed repository-owned L2 input and does
  not expose prompt or evidence input arguments.
- 2026-08-14 — The real canary constructs `AiReviewSession` without an
  `AiReviewArtifactStore`, so `artifactPath` must remain `null`.
- 2026-08-14 — The existing three-call Phase 7B budget is unchanged; this
  controller adds a stricter one-call/no-oracle/no-retry boundary locally.
- 2026-08-14 — Runtime/model absence is `NOT_RUN`, not a failure and never an
  excuse to install or download anything.

## Discoveries

Initial design only; update with evidence-backed constraints and no raw model
content.

## Deferred Work

- Any runtime-specific installation/configuration or model acquisition is
  outside Nightwatch and not part of this task.
- Phase 8 remains a separate owner-authorized, unstarted task.
- Model quality, factual accuracy, root-cause correctness, and benchmarking
  are intentionally unmeasured.

## Completion Criteria

Complete only after the harness and deterministic CI are green, the local
runtime gate has produced a sanitized PASS/FAIL/NOT_RUN result with at most
one provider call, all state/docs/anchors are updated, exact final CI passes,
the canonical tree is clean and synchronized, and Phase 8 remains
`NOT_STARTED`.
