# Session mutation authority binding implementation

## Purpose

Implement NW-AUD-006: bind C-00 mutators to the invoking checkout and executing
CLI, add explicit public expectations, serialize record transitions, restrict
command roles, and prove the cross-session boundary.

## Starting State

Implementation base `caab10e91b8d81f2b98597b3c6974db89638ae6c`; OpenSpec change
`nightwatch-session-mutation-authority-binding-v1` strict-valid and
unimplemented; owned session worktree claimed.

## Scope

`bin/nightwatch-session.mjs`, bounded shared helpers, C-00 focused tests,
hardening/mutation probes, operator documentation and recipes, and the active
task/OpenSpec continuity records.

## Non-Goals

No product runtime, browser, semantic, campaign, API, source-intelligence,
Control Center, Alphaus, or external action. No hostile same-user security
claim.

## Safety Constraints

LOCAL / DETERMINISTIC / NO-NETWORK except the existing explicit fast-forward
integration push. Canonical stays clean; other sessions are never touched.

## Architecture / Approach

Split the CLI into (a) read-only inspection targeting (`status`/`check` keep
`--root`), (b) an invocation-authority core resolved from `process.cwd()` plus
the executing script path, (c) pure admission helpers for expectations,
continuity and command roles, and (d) a lock plus canonical-revision CAS
around every ownership-record transition, held through integration network
callbacks. Adversarial tests build canonical plus two linked worktrees and
assert refusal-before-effect with byte-for-byte protected state.

## Milestones

### M0 — Implementation bootstrap

- **Status:** COMPLETE
- Acceptance: owned session claimed at base `caab10e9`; planning continuity
  converted to implementation continuity; local toolchain resolved.

### M1 — Invocation binding and explicit expectations

- **Status:** IN_PROGRESS
- Acceptance: mutators refuse `--root`; script/current-checkout binding is
  symlink-safe; `--expect-session`/`--expect-head` parse exactly and mismatches
  fail before effects; read-only cross-root inspection preserved; focused
  tests pass.

### M2 — Continuity admission

- **Status:** PLANNED
- Acceptance: record/task/campaign/branch/active-task/STATE compatibility is
  validated before effects for release, reconcile, integrate and adopt, with
  categorical refusals and focused tests.

### M3 — Serialized record transitions

- **Status:** PLANNED
- Acceptance: bounded exclusive no-follow lock, canonical revision, durable
  replacement with reread verification, conflict refusal, crash-safe lock and
  explicit recovery, with fault-injection tests.

### M4 — Command roles and integration authority

- **Status:** PLANNED
- Acceptance: canonical-only start/remove, exact-name/session remove,
  pre-network integration admission with lock held through push and
  verification, push-rejection preservation, uncertain-outcome result.

### M5 — Adversarial proof, probes, documentation, validation

- **Status:** PLANNED
- Acceptance: two-worktree wrong-checkout matrix, race matrix, crashed-lock
  recovery, hardening/mutation probes, updated AGENTS/docs/recipes,
  `openspec validate --strict`, focused suites, typechecks, workspace/agent/
  project checks and the applicable quality gates pass on the committed
  checkpoint; integration through the documented lifecycle.

## Validation Strategy

Focused C-00 unit suites under the existing Playwright/TypeScript harness;
`npm run typecheck`, `npm run typecheck:bin`, `npm run hardening:check`,
`npm run workspace:check`, `npm run agent:check`, `npm run project:check`,
`openspec validate ... --strict`, and the local quality gate on the committed
checkpoint.

## Decision Log

- 2026-09-21 — Follow the OpenSpec design exactly: public expectations, not
  secrets; cooperative confused-deputy boundary only.
- 2026-09-21 — Keep `status`/`check` cross-root read-only so agents retain
  topology inspection.

## Discoveries

- `release` currently writes the selected record with no ownership or caller
  check at all; `integrate` admits on target class alone.
- Ordinary record replacement is atomic rename but not compare-and-swap.

## Deferred Work

Owner-gated programme groups outside this change; no new dependencies.

## Completion Criteria

All milestone acceptance criteria are met, validated, recorded, and the change
is integrated through the C-00 lifecycle with the active task closed.
