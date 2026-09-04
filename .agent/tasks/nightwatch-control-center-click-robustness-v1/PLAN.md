# Plan — nightwatch-control-center-click-robustness-v1

## Purpose

Harden the sibling spec's two `Inspect` clicks with visibility gates
and box-independent dispatch, mirroring the proven systemMapV2 fix.
Test-only; zero product-code change.

## Starting State

- Task ID: `nightwatch-control-center-click-robustness-v1`
- Starting Nightwatch SHA: `9cf37a4d425fe46d453e46a9ceb820b2fd44a420`
  (browser-stability integrated; lane ~95% with one sibling click
  failure observed).
- Relevant surface: `tests/browser/controlCenterBrowser.browser.ts`
  lines 268, 302; product surface consumed read-only, modified nowhere.
- Established facts that must not be rediscovered: force-clicks need
  boxes for coordinates despite skipping checks; post-click asserts are
  answer-specific; the sibling failure matches the systemMap tail-click
  signature exactly.

## Scope

One helper + two visibility gates + two click conversions in the sibling
spec. Validation: 10x serial lane repeats, typecheck, hardening,
agent/project/handoff checks, REPORT, integration, release.

## Non-Goals

Product-code change; manifest/registry/gate-definition change;
assertion removal or relaxation; skips; timeout changes; retry-policy
changes; production/DEV/NEXT contact; C-12/C-13/C-14/C-08b/C-07.

## Safety Constraints

Test file only; additive assertions; C-00 worktree discipline (all
implementation in the owned session worktree); no force push; no history
rewrite; no credentials or private evidence in commits.

## Architecture / Approach

Mirror the systemMapV2 pattern exactly: explicit `toBeVisible` (operator
invariant, absorbs transient stalls as waits) + `dispatchEvent('click')`
with one bounded retry (no box dependency, exercises the real React
handler). Every dispatch is followed by answer-specific assertions.

## Milestones

### M1 — Task record and session — IN_PROGRESS

- Objective: session worktree claimed; SPEC/PLAN/STATE frozen; OpenSpec
  change; ACTIVE_TASK + EXECUTION_PROMPT routed.
- Acceptance criteria: `session:status` PASS; `handoff:check` PASS.
- Validation commands: `npm run session:status`, `npm run handoff:check`
- Status: IN_PROGRESS

### M2 — Click hardening — PENDING

- Objective: helper + gates + two conversions with comments.
- Files/areas: `tests/browser/controlCenterBrowser.browser.ts` only.
- Implementation actions: one helper, two gate+conversion edits.
- Acceptance criteria: diff shows only added/converted lines + comments.
- Validation commands: `git diff --stat`, `npx tsc --noEmit`
- Status: PENDING

### M3 — Stability validation — PENDING

- Objective: prove the lane green with repeats; no regressions.
- Files/areas: browser lane, truth checkers.
- Implementation actions: 10x serial lane repeats; typecheck,
  hardening, agent/project/handoff checks.
- Acceptance criteria: 10/10 lane repeats green; all checkers PASS.
- Validation commands: `npx playwright test --config=playwright.control-center.config.ts --repeat-each=10`, `npm run typecheck`, `npm run hardening:check`, `npm run agent:check`, `npm run project:check`, `npm run handoff:check`
- Status: PENDING

### M4 — Integration and close — PENDING

- Objective: integrate to main, release, remove worktree, close task.
- Files/areas: session branch → origin/main; REPORT.md; ACTIVE_TASK.md.
- Implementation actions: final review; fast-forward push; verify
  HEAD == origin/main; release; remove worktree; COMPLETE records.
- Acceptance criteria: push verified; tree clean; REPORT final.
- Validation commands: `git status`, `git rev-parse HEAD`, `git ls-remote origin main`
- Status: PENDING

## Validation Strategy

The changed file executes in no required-gate group, so the browser
lane repeats are authoritative, plus typecheck/hardening/truth checkers
for regressions. No `gate:local` re-run (unchanged product surface;
prior receipt stands).

## Decision Log

- Mirror, don't redesign: the systemMapV2 primitives are proven in-tree;
  reuse their exact shape for the identical exposure.
- No retry-policy change: bounded per-click retry only; lane semantics
  unchanged; genuinely invisible buttons still fail loud.

## Discoveries

- The sibling's `Inspect` clicks carry the same force-click exposure as
  the systemMap tail chips (one observed failure with identical signature).

## Deferred Work

Environmental lane residual documentation stays with the prior task's
REPORT; this task only extends the proven mitigation to the sibling.

## Completion Criteria

SPEC.md acceptance: helper + gates present; 10/10 lane repeats green;
typecheck/hardening/truth checkers green; integrated to origin/main;
session released; worktree removed; REPORT final; task COMPLETE.
