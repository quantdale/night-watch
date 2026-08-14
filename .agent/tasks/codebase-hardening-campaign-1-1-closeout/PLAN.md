# Nightwatch Codebase Hardening Campaign I.1 Closeout Plan

## Purpose

Complete the narrow terminal-integrity correction and durable-state
reconciliation without reopening the completed hardening campaign or starting
another feature phase.

## Starting State

- Starting local and remote SHA: `ba5b518736281f48640982fcbdb6c874bc3e3123`.
- Worktree was clean and branch was `main` at bootstrap.
- Historical hardening task is complete; Phase 7 is complete; Phase 6 is
  owner-frozen.
- The current-state document is stale at project level; the old report's
  pending-CI wording is historical and must remain unchanged.

## Scope

Checkpoint validation, adjacent terminal-condition review, focused campaign
tests, `docs/CURRENT_STATE.md`, and I.1 continuity state/report only.

## Non-Goals

No Phase 8, real campaign, auth capture, product traffic, DEV/NEXT traffic,
production, database, infrastructure, Alphaus-repository mutation, external
publication, branch-protection change, budget increase, orchestrator refactor,
or historical-report rewrite.

## Safety Constraints

Use synthetic bounded fixtures and the existing Playwright unit-test seam.
Keep product contacts, production attempts, database queries, infrastructure
queries, external publication attempts, and Alphaus-repository modifications
at zero. Do not inspect or handle owner credentials, storage state, or private
findings.

## Architecture / Approach

1. Reproduce the false-positive from an ordinal-zero checkpoint created with
   `INITIAL_REAL_CAMPAIGN_BUDGET`.
2. Replace the generic zero-remaining predicate with a pure generic positive-
   limit/full-consumption predicate, preserving arithmetic validation.
3. Add matrix coverage beside the existing campaign persistence tests through
   the public checkpoint/resume seam, including callback non-execution.
4. Review the other listed terminal statuses for the same obvious validation
   class; make no unrelated orchestrator changes.
5. Validate, push the source checkpoint, then reconcile current-state and I.1
   continuity documents in a separate documentation checkpoint.

## Milestones

### M0 — Bootstrap and I.1 task creation

- Verify canonical root, clean synchronized `main`, writer exclusivity, and
  historical state.
- Create this task and route `.agent/ACTIVE_TASK.md` to it.
- Validation: `npm run agent:check`, `git diff --check`.
- Status: COMPLETE

### M1 — Reproduction and terminal-semantics review

- Reproduce the zero-limit false-positive synthetically from the real bounded
  policy.
- Inspect adjacent terminal states once for the same class of defect and
  record evidence.
- Status: COMPLETE

### M2 — Narrow fix and regression matrix

- Implement the generic positive-limit/full-consumption invariant.
- Add false-positive, positive exhaustion, mixed-dimension, arithmetic, and
  pre-callback rejection coverage.
- Validation: focused checkpoint, budget, resume, and agent-state tests.
- Status: COMPLETE

### M3 — Integrated local validation and source checkpoint

- Run typecheck, hardening check, synthetic campaign, full Playwright suite,
  agent check, diff check, and privacy/integrity audit.
- Record exact results in STATE, commit and push validated source.
- Status: COMPLETE

### M4 — Durable reconciliation and final closure

- Update `docs/CURRENT_STATE.md`, I.1 STATE/REPORT, and ACTIVE_TASK with
  non-self-referential SHA continuity.
- Validate documentation, commit and push the final docs checkpoint, verify
  clean `HEAD == origin/main`, and read only the exact final GitHub Actions
  workflow if safe access is available.
- Status: COMPLETE

## Validation Strategy

Run focused checkpoint/campaign tests first, then campaign budget and resume
coverage plus agent-state tests. Run `npm run typecheck`,
`npm run hardening:check`, `npm run campaign:synthetic`, the full existing
Playwright suite, `npm run agent:check`, and `git diff --check`. Inspect the
diff, tracked new files, and privacy surface before each push. Never run
`campaign:real`, `auth:capture`, or a real product journey.

## Decision Log

- 2026-08-14 — Create a separate native I.1 task because Hardening Campaign I
  is historically complete and must not be reopened.
- 2026-08-14 — Use the minimum generic budget invariant because the current
  checkpoint has no trustworthy exact exhaustion-dimension field.
- 2026-08-14 — Keep the fix in checkpoint validation; no campaign-budget,
  scheduling, policy, auth, persistence, or orchestrator behavior changes are
  justified by the confirmed defect.

## Discoveries

- The reviewed predicate is present in `src/core/campaign/checkpoint.ts` and
  treats any zero remainder as runtime exhaustion.
- `INITIAL_REAL_CAMPAIGN_BUDGET.maxExplorationContexts` is intentionally zero.
- The listed terminal status checks are adjacent in the same validator and
  can be reviewed without broad rediscovery.

## Deferred Work

- Branch protection is optional future operational hardening and is outside
  this source-integrity closeout.
- Workspace-root naming debt is out of scope because current boundary tests
  already prove the intended filesystem behavior.
- Any real DEV regression is explicitly unnecessary; if evidence contradicts
  that conclusion, stop with `REAL_DEV_REGRESSION_CHECK_REQUIRED`.

## Completion Criteria

All user acceptance criteria are evidenced in I.1 STATE/REPORT, the source
and documentation checkpoints are pushed without private runtime material,
the tree is clean and synchronized, and remote CI is either confirmed for the
exact final SHA or explicitly recorded as pending verification.
