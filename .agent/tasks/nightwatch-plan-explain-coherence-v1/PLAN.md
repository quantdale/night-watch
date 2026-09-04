# Plan — nightwatch-plan-explain-coherence-v1

## Purpose

Regression-guard the `plan` → `explain` cross-command contract with a
focused spawning test.

## Starting State

- Task ID: `nightwatch-plan-explain-coherence-v1`
- Starting Nightwatch SHA: `caec3cc05cba32eb77b22f9f0b608adaac7b1f46`
- Relevant surface: `bin/nightwatch-intelligence.mjs` `plan` and
  `explain` branches (shared preview plan source).
- Established facts that must not be rediscovered: `plan --json`
  emits preview-plan member ids; `explain` resolves against the same
  preview plan; `campaign` shows the phase20 plan (different
  namespace, not explainable by design); manual end-to-end proof ran
  at `caec3cc` (`PRIORITY_COMPONENTS_AND_GATES`, item found).

## Scope

One new focused test file + task record + OpenSpec; validation;
REPORT; integration; release.

## Non-Goals

Product change; other commands' parsing; manifest/registry/gate
change; production/DEV/NEXT contact; gated campaigns; making
`campaign` ids explainable (out of scope by design).

## Safety Constraints

Test-only additive change; real binary spawned (no mocks); C-00
worktree discipline; no force push; no history rewrite.

## Architecture / Approach

`planExplainCoherence.test.ts` spawns `plan --json`, takes
`items[0].memberId`, spawns `explain <id> --json`, asserts
`requestedId` match + `explanation === PRIORITY_COMPONENTS_AND_GATES`
+ non-null item. Same spawn pattern as
`explainIdFlagTolerance.test.ts`.

## Milestones

### M1 — Task record and session — DONE

- Objective: session worktree claimed; SPEC/PLAN/STATE frozen; OpenSpec
  change; ACTIVE_TASK + EXECUTION_PROMPT routed.
- Acceptance criteria: `session:status` PASS; `handoff:check` PASS.
- Validation commands: `npm run session:status`, `npm run handoff:check`
- Status: DONE

### M2 — Coherence test — DONE

- Objective: new focused test green.
- Files/areas: `tests/unit/planExplainCoherence.test.ts`.
- Implementation actions: wrote test; ran focused + neighbors.
- Acceptance criteria: new test green; typecheck clean.
- Validation commands: focused test file, `npx tsc --noEmit`
- Status: DONE

### M3 — Validation and close — IN_PROGRESS

- Objective: full validation, REPORT, integration, release.
- Files/areas: adjacent suites, truth checkers, session branch.
- Implementation actions: adjacent suites; hardening/agent/project/
  handoff checks; REPORT; push; release; remove worktree.
- Acceptance criteria: all green; push verified; REPORT final.
- Validation commands: `npm run hardening:check`, `npm run agent:check`, `npm run project:check`, `npm run handoff:check`
- Status: IN_PROGRESS

## Validation Strategy

Focused CLI tests spawn the real binary (no mocks); adjacent CLI
suites guard neighbors; checkers guard protocol conformance. No
`gate:local` re-run (test-only addition, no product surface change).

## Decision Log

- Positive-path coherence test (not another arg-form test): the
  arg-form space is covered; the unguarded contract is cross-command
  id resolution.

## Discoveries

- `plan --json` emits preview-plan member ids; `explain` resolves
  against the same preview plan (manual proof at `caec3cc`).

## Deferred Work

None. Owner-gated campaigns remain out of scope.

## Completion Criteria

SPEC.md acceptance: new test green; checkers green; integrated;
released; REPORT final; COMPLETE.
