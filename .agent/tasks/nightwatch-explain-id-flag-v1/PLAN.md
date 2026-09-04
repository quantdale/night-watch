# Plan — nightwatch-explain-id-flag-v1

## Purpose

Make `explain`'s positional id tolerant to flag order without weakening
validation.

## Starting State

- Task ID: `nightwatch-explain-id-flag-v1`
- Starting Nightwatch SHA: `cb054f1f72810a4e005d5b6af078b5034ecf52f8`
- Relevant surface: `bin/nightwatch-intelligence.mjs` explain branch
  (`requested = args[1]`).
- Established facts that must not be rediscovered: flags occupy
  positional slots (`explain --json` reads `--json` as the id);
  `--json` detection is order-independent via `includes`; the shape
  regex and plan lookup stay unchanged.

## Scope

One-line extraction fix + focused tests + task record + OpenSpec;
validation; REPORT; integration; release.

## Non-Goals

Other commands' parsing; product-core change; manifest/registry/gate
change; production/DEV/NEXT contact; gated campaigns.

## Safety Constraints

CLI parsing only; first-non-flag rule; C-00 worktree discipline; no
force push; no history rewrite.

## Architecture / Approach

`const requested = args.slice(1).find((arg) => !arg.startsWith("--"));`
then the existing shape gate and lookup unchanged. Tests cover bare,
flag-first, id-after-flags, and malformed forms.

## Milestones

### M1 — Task record and session — DONE

- Objective: session worktree claimed; SPEC/PLAN/STATE frozen; OpenSpec
  change; ACTIVE_TASK + EXECUTION_PROMPT routed.
- Acceptance criteria: `session:status` PASS; `handoff:check` PASS.
- Validation commands: `npm run session:status`, `npm run handoff:check`
- Status: DONE

### M2 — Extraction fix and tests — DONE

- Objective: flag-tolerant id + focused tests.
- Files/areas: `bin/nightwatch-intelligence.mjs`, focused test file.
- Implementation actions: one-line fix; new tests.
- Acceptance criteria: all forms green; malformed refused; typecheck.
- Validation commands: `npx tsc --noEmit`, focused test file
- Status: DONE

### M3 — Validation and close — DONE

- Objective: full validation, REPORT, integration, release.
- Files/areas: adjacent suites, truth checkers, session branch.
- Implementation actions: adjacent suites; hardening/agent/project/
  handoff checks; REPORT; push; release; remove worktree.
- Acceptance criteria: all green; push verified; REPORT final.
- Validation commands: `npm run hardening:check`, `npm run agent:check`, `npm run project:check`, `npm run handoff:check`
- Status: DONE

## Validation Strategy

Focused CLI tests spawn the real binary (no mocks); adjacent preview
suites guard the underlying library; checkers guard protocol
conformance. No `gate:local` re-run (no gate-covered surface changes).

## Decision Log

- Same fix shape as the explain-surface disjunct (first-non-flag),
  minus the named-flag form (no documented `--id=` form exists here).

## Discoveries

- `--json` detection is order-independent, but every positional read
  is order-fragile; only `explain` had a reachable breakage.

## Deferred Work

None. Owner-gated campaigns remain out of scope.

## Completion Criteria

SPEC.md acceptance: forms green; malformed refused; checkers green;
integrated; released; REPORT final; COMPLETE.
