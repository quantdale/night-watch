# Plan — nightwatch-unused-dep-removal-v1

## Purpose

Remove the unused `vue` devDependency carrying the repo's only audit
finding. Zero references exist; removal is behavior-preserving.

## Starting State

- Task ID: `nightwatch-unused-dep-removal-v1`
- Starting Nightwatch SHA: `ae959663d22e6c9191f3ef7a9ebed7f081fc4fe9`
- Relevant surface: root `package.json` + `package-lock.json` only.
- Established facts that must not be rediscovered: zero `vue`
  references repo-wide; GHSA-5j4c-8p2g-v4jx LOW ReDoS; module never
  loads, so removal cannot change runtime behavior.

## Scope

`npm remove vue` (manifest + lockfile), task record, OpenSpec change,
validation, REPORT, integration, release.

## Non-Goals

Dependency upgrades elsewhere; lockfile churn beyond the removal;
product-code change; manifest/registry/gate-definition change;
production/DEV/NEXT contact; C-12 and all gated campaigns.

## Safety Constraints

Manifest/lockfile only; C-00 worktree discipline; verify install from
scratch (`npm ci`); no force push; no history rewrite; no credentials
in commits.

## Architecture / Approach

Single `npm remove vue --package-lock-only` (or full remove + `npm ci`
verification) in the session worktree; prove the tree installs,
typechecks, and runs the offline scenario green.

## Milestones

### M1 — Task record and session — DONE

- Objective: session worktree claimed; SPEC/PLAN/STATE frozen; OpenSpec
  change; ACTIVE_TASK + EXECUTION_PROMPT routed.
- Acceptance criteria: `session:status` PASS; `handoff:check` PASS.
- Validation commands: `npm run session:status`, `npm run handoff:check`
- Status: DONE

### M2 — Removal and validation — DONE

- Objective: remove dep, verify install/typecheck/scenario/checkers.
- Files/areas: `package.json`, `package-lock.json`.
- Implementation actions: `npm remove vue`; `npm ci`; typecheck;
  scenario run; hardening + truth checkers.
- Acceptance criteria: `npm audit` zero vulns; all green.
- Validation commands: `npm audit`, `npm ci`, `npm run typecheck`, `npm run hardening:check`, `npm run agent:check`, `npm run project:check`, `npm run handoff:check`
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

Install-from-scratch proves manifest coherence; typecheck proves
nothing referenced the module; the offline scenario proves the runtime
unaffected; truth checkers prove protocol conformance. No `gate:local`
re-run (no product/test surface changes).

## Decision Log

- Remove rather than upgrade: Vue 2 is EOL and entirely unreferenced;
  upgrading to Vue 3 for an unused dep would add surface for nothing.
- No lockfile churn beyond the removal entry set.

## Discoveries

- Root `devDependencies` are otherwise lean (playwright, types, TS);
  the full `npm test` toolchain does not touch Vue.

## Deferred Work

None. Owner-gated campaigns remain out of scope.

## Completion Criteria

SPEC.md acceptance: dep gone, audit zero, install/typecheck/scenario
green, checkers green, integrated, released, REPORT final, COMPLETE.
