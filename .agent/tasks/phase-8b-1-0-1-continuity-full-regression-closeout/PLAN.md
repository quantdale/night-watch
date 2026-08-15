# Nightwatch Phase 8B.1.0.1 — Continuity Ledger & Clean Full-Regression Closeout — Plan

## Purpose

Close out the accepted Phase 8B.1.0 implementation with (A) an independent,
clean-source-state proof of the COMPLETE Playwright suite, and (B) a
truthful reconciliation of every durable continuity record. Leave Phase 8B.1
retry requiring a completely separate fresh owner authorization.

## Starting State

- Task ID: phase-8b-1-0-1-continuity-full-regression-closeout
- Starting SHA: 10ecea296cf639b65e8a260fee54814737285c2d
  (bootstrap CASE A: HEAD == origin/main == expected SHA; worktree clean).
- Phase statuses (to confirm from repository state): Phase 8 IN_PROGRESS;
  Phase 8A/8A.1/8A.1.1 COMPLETE; Phase 8B COMPLETE_SANDBOX_ONLY;
  Phase 8B.0.1 COMPLETE; Phase 8B.1 BLOCKED (attempt closed, blocker
  resolved, retry requires new owner authorization); Phase 8B.1.0
  IMPLEMENTATION COMPLETE; Phase 8B.1.0.1 = this task.
- Real canonical catalog: EMPTY
  (sha256:ffe3d635680e110f3d225bcd9c61b2f59fe04d82ae1f2fa9d48204a8b1f2f334).
- Historical Phase 8B.1 approval: SPENT, permanently non-reusable.
- Validated implementation anchor: e02aebeb42b2b95995dc20f4123dade866ed71cd.
- Documentation checkpoint anchor: 01dbadf8e8d9d83936df545e7e7a4b169db19914.
- Prior final live SHA: 10ecea296cf639b65e8a260fee54814737285c2d; its exact
  CI run 31875200362 completed success with all steps (verified read-only).
- Portfolio matrix: tests/unit/selfDevPortfolio.test.ts contains exactly 30
  tests since its introduction at e3a8e2f (verified); 8B.1.0 dedicated CI
  matrix = 30 + 14 (selfDevAdoptionPlan) + 15 (selfDevAdoptionSandbox) = 59.

## Scope

- Create this task's SPEC/PLAN/STATE/REPORT and update ACTIVE_TASK.
- Correct stale continuity prose in the Phase 8B.1.0 STATE.md / REPORT.md /
  PLAN.md (current milestone, pending statuses, duplicate exhausted ledger,
  pending CI, work-in-progress, next action, resume recipe, validated
  implementation SHA, docs SHA, final SHA placeholder, stale 29/29 test
  counts) and in `.agent/ACTIVE_TASK.md`.
- Run the complete unfiltered Playwright suite in clean isolated full-history
  checkouts at the starting SHA and at the final SHA; run the final
  repository gates (typecheck, hardening, agent:check, campaign:synthetic,
  test:owner-provenance, git diff --check, dedicated 8B.1.0 matrix).
- Commit/push the continuity corrections fast-forward; verify the exact
  GitHub CI run per commit with per-step inspection.
- Read-only recheck of the spent Phase 8B.1 approval only if local private
  state is available (not a blocker otherwise).

## Non-Goals

- NO Phase 8B.1 retry; no promotion prepare/approve/apply; no new approval;
  no reuse/reset/delete of the spent approval.
- NO canonical adopted-case runtime write; catalog must stay empty.
- NO change to proposal portfolio, evaluator/replay/trust/planner/sandbox/
  promotion source semantics, tests, hardening logic, or workflow logic.
- NO broad test rewrites, no new skips, no weakening of assertions.
- NO production/DEV/NEXT access, database, infrastructure, external AI/model,
  Alphaus writes, publication.
- NO rewriting of Phase 8B.1.0 history prose; narrow patches only, forensic
  chronology preserved.

## Safety Constraints

- The clean full-suite proof runs only in isolated full-history checkouts
  (temp clones), never against the working repository with uncommitted
  task files.
- Real canonical adopted-case catalog must be byte-identical before and
  after all edits (sha256 ffe3d635...).
- Fast-forward push only; never force-push; stop if origin/main advances.
- No secrets: no credentials, auth state, bearer tokens, cookies, customer
  data in any source/artifact/task file.
- No `selfdev:promote-canonical` commands against real owner state.
- If the clean full suite fails: STOP and classify
  (PHASE_8B_1_0_1_BLOCKED_CLEAN_FULL_REGRESSION); do not patch source/tests
  or add skips.
- If source/test/workflow modification ever seems necessary: STOP and
  explain.

## Architecture / Approach

- Bootstrap (git fetch, HEAD/origin/main comparison, CASE classification).
- Pre-edit clean full-suite baseline: fresh isolated full-history checkout
  of 10ecea296, `npm ci --ignore-scripts`, `npx playwright test
  --project=nightwatch --workers=1`, require failed = 0.
- Durable record audit: build a drift table (file / stale statement /
  current evidence / corrected value / correction class) before editing.
- Narrow continuity patches: ACTIVE_TASK rewrite; 8B.1.0 STATE/REPORT/PLAN
  corrections; docs only if they expose stale retry readiness.
- Local gates at candidate final SHA; continuity commit; push fast-forward;
  exact CI verification with step inspection.
- Final clean full-suite at the exact pushed SHA (isolated checkout).
- At most ONE docs-only finalization commit recording the results; final CI
  must pass; docs-descendant proof via `git diff --name-only` limited to
  `.agent/**` / `docs/**` and via agent:check's approved-paths check.
- Final verification: HEAD == origin/main, clean worktree, catalog digest
  unchanged, cross-file consistency, report, STOP.

## Milestones

- M0 bootstrap + recovery reads — DONE (CASE A; all recovery docs read).
- M1 pre-edit clean full-suite baseline @ 10ecea296 (isolated checkout) —
  IN_PROGRESS (background run).
- M2 task files + drift audit — NOT_STARTED.
- M3 continuity reconciliation edits (ACTIVE_TASK, 8B.1.0 STATE/REPORT/PLAN)
  — NOT_STARTED.
- M4 local final gates (typecheck, hardening:check, agent:check,
  campaign:synthetic, test:owner-provenance, git diff --check, dedicated
  8B.1.0 matrix 59 tests) — NOT_STARTED.
- M5 continuity commit + fast-forward push — NOT_STARTED.
- M6 exact GitHub CI verification (per-step) — NOT_STARTED.
- M7 final clean full-suite @ pushed SHA (isolated checkout) — NOT_STARTED.
- M8 docs-only finalization commit (STATE/REPORT final numbers) + final CI —
  NOT_STARTED.
- M9 final verification (HEAD==origin/main, clean worktree, catalog digest,
  cross-file consistency) + final report + STOP — NOT_STARTED.

## Validation Strategy

- Complete unfiltered suite: `npx playwright test --project=nightwatch
  --workers=1` (single project; no filters; no exclusions beyond the
  repository's own testIgnore of fixtures/node_modules/dist/artifacts/.tmp-*).
- `npm run typecheck`; `npm run hardening:check`; `npm run agent:check`;
  `npm run campaign:synthetic`; `npm run test:owner-provenance`;
  `git diff --check`.
- Dedicated 8B.1.0 matrix (exact CI step command):
  `npx playwright test tests/unit/selfDevPortfolio.test.ts
  tests/unit/selfDevAdoptionPlan.test.ts tests/unit/selfDevAdoptionSandbox.test.ts
  --project=nightwatch --workers=1` (30 + 14 + 15 = 59 tests).
- Catalog invariant: `sha256sum src/core/selfDev/adoptedCaseCatalog.generated.ts`
  before and after; require byte-identical and entry count 0.
- CI: `gh run view <run-id>` per commit; require status completed,
  conclusion success, head_sha exact; inspect every job step.
- Docs-descendant proof: `git diff --name-only CLEAN_SUITE_SHA..FINAL_SHA`
  contains only `.agent/**` and `docs/**`.

## Decision Log

- (Populated as decisions occur: isolated-checkout proof ordering, drift
  correction classes, closure-SHA rule application, finalization commit
  scope.)

## Discoveries

- (Populated as discovered: e.g. any drift item confirmed/refuted by
  evidence, historical CI facts, test-count facts.)

## Deferred Work

- Phase 8B.1 retry — separate fresh owner authorization required; not
  started, not prepared, not approved.

## Completion Criteria

- Pre-edit and final clean full-suite runs both: failed = 0, only
  intentional environmental skips, git clean before/after.
- Every stale continuity statement in §4 of the authorization corrected
  (or explicitly reported as not present).
- ACTIVE_TASK / 8B.1.0 STATE / 8B.1.0 REPORT / 8B.1.0.1 STATE / 8B.1.0.1
  REPORT / CURRENT_STATE / ROADMAP agree on phase status, implementation
  SHA, docs SHA, prior final SHA, new final SHA, catalog count, approval
  spent status, retry authorization status, clean full-suite result.
- Canonical catalog byte-identical and empty.
- Exact final CI success with 8B.1.0 matrix + cleanliness steps executed.
- Final HEAD == origin/main; worktree clean.
- PHASE_8B_1_0_1_COMPLETE; PHASE_8B_1_RETRY_READINESS:
  READY_FOR_SEPARATE_FRESH_OWNER_AUTHORIZATION; NEXT ACTION: STOP.
