# Phase 1.3 — Durable Agent Continuity / Execution-State Protocol

## Purpose

Create a human-readable two-level memory protocol and a small deterministic
validator so a fresh Nightwatch agent can resume long-running work from files,
not conversation. Observable outcome: the active task routes to complete,
truthful state with an exact next action and machine-checked consistency.

## Starting State

- Task ID: `phase-1.3-continuity`
- Starting Nightwatch SHA: `ea2d327f54269c101123c2660a456e69dd319735`
- Relevant architecture: TypeScript/Node/Playwright; Playwright is the
  single test runner; `docs/` is project memory; this task adds `.agent/`
  execution memory.
- Dependencies: Node >=20, npm, existing Playwright/TypeScript toolchain.
- Established facts: Phase 1.2 is complete and green at 93 tests; the proxy
  is mandatory; DNS isolation is unresolved; one historical Phase 1.1
  production-host contact remains accurately documented.
- Do not rediscover: Recon A/B/C/D, all Alphaus repos, prior containment
  experiments, Phase 2, L6, or product behavior.

## Scope

Root operating contract; `.agent` protocol and templates; Phase 1.3 task
memory; project-state documentation updates; a small local validator and its
synthetic tests; required local validation and task commit.

## Non-Goals

Real Alphaus access or product testing; DB/API/mutation work; autonomous
exploration; Phase 2A; DeepSeek/oops/change-directed selection; Docker L6;
changes outside Nightwatch.

## Safety Constraints

Use only local files, local synthetic fixtures, and read-only git inspection.
Never write secrets or auth state. Do not modify any Alphaus repository. Do
not start a real browser scenario against dev/next or production.

## Architecture / Approach

- `AGENTS.md` is short and stable: bootstrap, precedence, no-rediscovery,
  boundaries, checkpoint/validation/scope/secrets, recovery, and handoff.
- `.agent/ACTIVE_TASK.md` is routing only; it points to one task directory.
- `SPEC.md` is frozen intent, `PLAN.md` is living execution design, `STATE.md`
  is the concise operational waypoint, and `REPORT.md` is the final handoff.
- `bin/agent-state.mjs` validates the repository protocol from `--root` (or
  the current directory), compares active `Current SHA` with `git HEAD`, and
  returns nonzero for invariant failures. `npm run agent:check` invokes it.
- Validator tests invoke the CLI against temporary synthetic repositories so
  missing, malformed, mismatched, stale, and secret-like cases are isolated.

## Milestones

### M1 — Establish task memory

- Objective: create frozen intent, living plan, first waypoint, and routing.
- Files/areas: `.agent/ACTIVE_TASK.md`, task `SPEC.md`, `PLAN.md`, `STATE.md`,
  `REPORT.md`.
- Actions: record handoff SHA, scope, non-goals, acceptance, and first exact
  next action before implementation.
- Acceptance: all four task files exist and STATE records the first checkpoint.
- Validation: `git status --short`; inspect the four files.
- Status: COMPLETE

### M2 — Document the continuity protocol

- Objective: make stable operating rules and reusable templates explicit.
- Files/areas: `AGENTS.md`, `.agent/README.md`, `.agent/PLANS.md`,
  `.agent/templates/*`.
- Actions: encode bootstrap, precedence, recovery, checkpoint, validation,
  scope, secrets, and completion behavior.
- Acceptance: a fresh agent can route and resume from the documented files.
- Validation: `npm run agent:check` after validator exists; manual heading audit.
- Status: COMPLETE

### M3 — Implement the deterministic validator

- Objective: check protocol consistency without external services.
- Files/areas: `bin/agent-state.mjs`, `tests/unit/agent-state.test.ts`,
  `package.json`.
- Actions: validate required files/headings, status, task identity, secret
  patterns, and current SHA; add synthetic CLI tests.
- Acceptance: valid repo passes; each required invalid case fails clearly.
- Validation: `npx playwright test tests/unit/agent-state.test.ts` and
  `npm run agent:check`.
- Status: COMPLETE

### M4 — Update project memory and finish handoff

- Objective: record Phase 1.3 as complete without mixing task diary into
  project docs, then produce a truthful final report.
- Files/areas: `docs/CURRENT_STATE.md`, `docs/DECISIONS.md`,
  `docs/ROADMAP.md`, task `STATE.md`, `REPORT.md`, `ACTIVE_TASK.md`.
- Actions: update only requested project facts; run all validations; set task
  status complete; record final SHA and recommended Phase 2A.
- Acceptance: full suite remains green, acceptance matrix is complete, and
  only Nightwatch files changed.
- Validation: `npx tsc --noEmit`; `npx playwright test`; `npm run agent:check`;
  `git status --short`.
- Status: COMPLETE

## Validation Strategy

Run focused validator tests while implementing, then full TypeScript checking,
the complete existing Playwright suite, the repository validator, manual file
inspection, and a final `git status --short`. No external network or product
test is permitted.

## Decision Log

- 2026-08-09 — Use Markdown task files plus one small CLI validator, because
  human-readable recovery is the primary requirement and a database/framework
  would add unnecessary state and failure modes. Consequence: humans can edit
  checkpoints, while the validator catches structural drift.

## Discoveries

- Initial handoff is a clean Nightwatch-only repository at the specified SHA;
  no prior task-state protocol exists.

## Deferred Work

- Phase 2A controlled authenticated dev/next observation.
- Full L6 process/network-namespace isolation and all product-facing work.

## Completion Criteria

All required files and guidance exist; validator and synthetic tests pass;
existing typecheck and 93+ test regression suite pass; project docs accurately
record Phase 1.3; task state/report are complete; no Alphaus repository or
external environment was touched; task is committed within Nightwatch.
