# Plan — nightwatch-systemmap-browser-stability-v1
## Purpose

Close the stale-UI race in the C-15c browser spec with two member-readiness
gates, prove stability with serial repeats, integrate. Test-only; zero
product-code change.

## Starting State

- Task ID: `nightwatch-systemmap-browser-stability-v1`
- Starting Nightwatch SHA: `89740646c08a5661d358cc05f20a5d94e135334d`
  (AH-1 integrated; gate:local 11/11 green at close-out).
- Relevant surface: `tests/browser/systemMapV2.browser.ts` steps 6d/6e;
  product surface (`src/controlCenter/*`, `src/core/systemMap/*`,
  `ui/control-center`) consumed read-only, modified nowhere.
- Established facts that must not be rediscovered: L4 traffic always
  correct; fiber probe shows `selectedNodeId: op:op-1` with trail
  `l4:op:op-0` in failing runs; `map-authority` is level-identical;
  product selection model sound (see SPEC.md).

## Scope

Two additive assertions (+ comments) in
`tests/browser/systemMapV2.browser.ts`: 6d L2-member gate, 6e L4-op-0
breadcrumb + consumer-member gates. Validation: 10x serial browser
repeats, sibling spec, adjacent unit suites, typecheck, hardening,
agent/project/handoff checks, REPORT, integration, release.

## Non-Goals

Product-code change; manifest/registry/gate-definition change;
assertion removal or relaxation; skips; timeout inflation as a fix;
production/DEV/NEXT contact; C-12/C-13/C-14/C-08b/C-07 execution.

## Safety Constraints

Test file only; additive assertions; C-00 worktree discipline (all
implementation in the owned session worktree); no force push; no history
rewrite; no credentials or private evidence in commits.

## Architecture / Approach

Gate each keyboard/drill action on the committed render it assumes: 6d
arrows wait for L2 members (not the trail crumb); 6e press waits for
L4-op-0-specific UI (breadcrumb crumb + consumer member, not the
level-identical authority footer). This codifies the spec's own existing
pattern (steps 4b, 6c, and the line-224 comment).

## Validation Strategy

M3 runs the systemMap spec 10x serial plus the sibling browser spec in
the same lane invocation, adjacent unit suites
(`c15bSystemMap`, `c15cSystemMapTransport`), `tsc --noEmit`,
`hardening:check`, `agent:check`, `project:check`, `handoff:check`. The
changed file is outside the gate manifests, so the browser lane (not
`gate:local`) is the authoritative validation for this change.

## Decision Log

- Test-only fix (no product change): projection/traffic/unit evidence
  proves the product sound; the test acted on a stale render.
- No gate/manifest change: the browser specs intentionally live outside
  the required-gate manifests; moving them would redefine release
  certification and is out of scope.

## Discoveries

- `map-authority` footer text is identical across levels/views: it can
  never gate navigation.
- L3 sorts 256-capped nodes by id; a stale-render ArrowRight resolves
  `op:op-1`, which falls outside the L4 view and empties the detail
  panel for the run.

## Deferred Work

None. C-12 and all owner-gated campaigns remain out of scope (unchanged).

## Completion Criteria

SPEC.md acceptance: gates present with race-pinning comments; 10/10
browser repeats green; sibling spec green; typecheck/hardening/truth
checkers green; adjacent unit suites green; integrated to origin/main;
session released; worktree removed; REPORT final; task COMPLETE.

## Objective

Close the stale-UI race in the C-15c browser spec with two member-readiness
gates, prove stability with serial repeats, integrate.

## Milestones

### M1 — Task record and session — DONE

- Objective: session worktree claimed; SPEC/PLAN/STATE frozen; OpenSpec
  change; ACTIVE_TASK + EXECUTION_PROMPT routed.
- Acceptance criteria: `session:status` PASS; `handoff:check` PASS.
- Validation commands: `npm run session:status`, `npm run handoff:check`
- Status: DONE

### M2 — Commit-specific gates — IN_PROGRESS

- Objective: insert the 6d L2-member gate, the 6e L4-op-0 gates
  (breadcrumb crumb + consumer member), and the 6e-query-answer gate
  (node bound `limit 1000`) with race-pinning comments.
- Files/areas: `tests/browser/systemMapV2.browser.ts` only.
- Implementation actions: three additive assertion edits; no other change.
- Acceptance criteria: diff shows only added assertions + comments.
- Validation commands: `git diff --stat`, `npx tsc --noEmit`
- Status: IN_PROGRESS

### M3 — Stability validation — PENDING

- Objective: prove the flake is closed and nothing else regressed.
- Files/areas: browser lane, adjacent unit suites, truth checkers.
- Implementation actions: 10x serial repeats of the systemMap spec plus
  the sibling browser spec; adjacent unit suites; typecheck, hardening,
  agent/project/handoff checks.
- Acceptance criteria: 10/10 browser repeats green; all checkers PASS.
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
