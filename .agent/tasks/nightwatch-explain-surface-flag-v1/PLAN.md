# Plan — nightwatch-explain-surface-flag-v1

## Purpose

Honor the README-documented `--surface=<id>` invocation form for
`explain-surface` without weakening id validation.

## Starting State

- Task ID: `nightwatch-explain-surface-flag-v1`
- Starting Nightwatch SHA: `a39f49c4222ef2f8d4c2f46419485845f6970a78`
- Relevant surface: `bin/nightwatch-intelligence.mjs` explain-surface
  argument extraction (line ~131) + a new focused CLI test.
- Established facts that must not be rediscovered: `args[1]` raw read
  breaks when flags precede the id; the shape regex stays; membership
  is enforced downstream in `explainSourceSurface`; README documents
  the flag form.

## Scope

Argument-extraction disjunct + focused regression tests + task record +
OpenSpec; validation; REPORT; integration; release.

## Non-Goals

Product-core change; other commands' arg parsing (`explain` positional
is undocumented and untouched); manifest/registry/gate change;
production/DEV/NEXT contact; gated campaigns.

## Safety Constraints

CLI parsing only; additive disjunct; explicit flag wins, positional
fallback preserved; C-00 worktree discipline; no force push; no
history rewrite.

## Architecture / Approach

`const requestedSurface = explicitFlag || args[1]`, then the existing
shape gate unchanged. Tests spawn the real CLI (like the AH-1
operability tests): flag form green, positional form green, malformed
still refused. Surface ids for the positive cases come from a live
`surfaces` call, never hardcoded digests.

## Milestones

### M1 — Task record and session — IN_PROGRESS

- Objective: session worktree claimed; SPEC/PLAN/STATE frozen; OpenSpec
  change; ACTIVE_TASK + EXECUTION_PROMPT routed.
- Acceptance criteria: `session:status` PASS; `handoff:check` PASS.
- Validation commands: `npm run session:status`, `npm run handoff:check`
- Status: IN_PROGRESS

### M2 — Flag disjunct and tests — PENDING

- Objective: accept `--surface=`; add regression tests.
- Files/areas: `bin/nightwatch-intelligence.mjs`, new test file.
- Implementation actions: extraction edit; focused CLI tests.
- Acceptance criteria: both forms green; malformed refused; typecheck.
- Validation commands: `npx tsc --noEmit`, focused test file
- Status: PENDING

### M3 — Validation and close — PENDING

- Objective: full validation, REPORT, integration, release.
- Files/areas: adjacent suites, truth checkers, session branch.
- Implementation actions: adjacent unit suites; hardening/agent/
  project/handoff checks; REPORT; push; release; remove worktree.
- Acceptance criteria: all green; push verified; REPORT final.
- Validation commands: `npm run hardening:check`, `npm run agent:check`, `npm run project:check`, `npm run handoff:check`
- Status: PENDING

## Validation Strategy

New tests execute the real CLI in-process-spawned form (no mocks);
adjacent `c09`/`c15c` suites guard the underlying library; checkers
guard protocol conformance. No `gate:local` re-run (no gate-covered
surface changes).

## Decision Log

- Fix code, not README: the flag form is the robust contract (order
  independent); positional stays for compatibility.
- Explicit flag wins over positional on conflict: deterministic,
  documented in code comment.

## Discoveries

- `explain` (line ~274) shares the positional pattern but is
  undocumented with args; intentionally untouched.

## Deferred Work

None. Owner-gated campaigns remain out of scope.

## Completion Criteria

SPEC.md acceptance: both forms green; malformed refused; checkers
green; integrated; released; REPORT final; COMPLETE.
