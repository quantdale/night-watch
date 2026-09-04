# Plan — nightwatch-dep-docs-reconciliation-v1

## Purpose

Correct one stale standing sentence about the removed Vue 2
dependency. Historical decision narrative stays intact.

## Starting State

- Task ID: `nightwatch-dep-docs-reconciliation-v1`
- Starting Nightwatch SHA: `262c84b7ee93d22617e8b901655805d72123a84a`
- Relevant surface: `docs/DECISIONS.md` D-87 consequences paragraph.
- Established facts that must not be rediscovered: vue removed at
  `a212e88` (manifest + lockfile, zero references); `npm audit` zero;
  R-12 cell-by-cell reconciliation precedent; historical prose is
  preserved, standing claims are corrected.

## Scope

One sentence correction + task record + OpenSpec change; validation;
REPORT; integration; release.

## Non-Goals

History rewrite; decision renumbering; product/test/manifest change;
new decisions; production/DEV/NEXT contact; gated campaigns.

## Safety Constraints

Docs-only change in the session worktree; preserve surrounding
historical text byte-for-byte; no force push; no history rewrite.

## Architecture / Approach

Append-style correction: keep the original clause, add the superseding
fact (removed as unused; audit zero), per the drift-notes pattern.

## Milestones

### M1 — Task record and session — DONE

- Objective: session worktree claimed; SPEC/PLAN/STATE frozen; OpenSpec
  change; ACTIVE_TASK + EXECUTION_PROMPT routed.
- Acceptance criteria: `session:status` PASS; `handoff:check` PASS.
- Validation commands: `npm run session:status`, `npm run handoff:check`
- Status: DONE

### M2 — Sentence correction and validation — DONE

- Objective: correct the standing claim; run checkers.
- Files/areas: `docs/DECISIONS.md` (one sentence).
- Implementation actions: append-style edit; hardening + truth checks.
- Acceptance criteria: sentence truthful; all checkers green.
- Validation commands: `npm run hardening:check`, `npm run agent:check`, `npm run project:check`, `npm run handoff:check`
- Status: DONE

### M3 — Integration and close — DONE

- Objective: integrate to main, release, remove worktree, close task.
- Files/areas: session branch → origin/main; REPORT.md; ACTIVE_TASK.md.
- Implementation actions: final review; fast-forward push; verify
  HEAD == origin/main; release; remove worktree; COMPLETE records.
- Acceptance criteria: push verified; tree clean; REPORT final.
- Validation commands: `git status`, `git rev-parse HEAD`, `git ls-remote origin main`
- Status: DONE

## Validation Strategy

Docs-only change: truth checkers + hardening (which scans docs
invariants) are authoritative. No test/product validation needed
(nothing executable changed).

## Decision Log

- Append-style correction over rewrite: preserves the historical
  decision record per repo convention.
- No new D-number: this is reconciliation, not a new owner decision.

## Discoveries

- The D-87 sentence also called the dep a "fixture"; repo-wide grep
  shows it was never referenced at all.

## Deferred Work

None. Owner-gated campaigns remain out of scope.

## Completion Criteria

SPEC.md acceptance: sentence truthful; checkers green; integrated;
released; REPORT final; COMPLETE.
