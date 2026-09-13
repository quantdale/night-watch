# SPEC.md

**Task:** nightwatch-open-spec-truth-closure-v1
**Campaign:** OpenSpec truth-surface closure (three sibling audit changes)
**Objective:** Apply, validate and integrate the three pending OpenSpec changes
planned at `ebe26ce` — `nightwatch-continuity-live-waypoint-binding-v1`,
`nightwatch-published-spec-baseline-integrity-v1` and
`nightwatch-validation-classification-and-skip-truth-v1` — and satisfy the
landing constraint they name: every active OpenSpec change carries a
continuity-v2 task record before the change↔task check becomes an error.

**Scope:**

- Land the three changes' tasks in their planned order (continuity first, then
  the baseline, then validation classification), each with its own focused
  negative-probed tests.
- Create continuity-v2 task records for every active change that lacks one,
  including the three audit siblings; park the two ownerless active changes
  (design-system, observability master plan) as explicit BLOCKED records.
- Reconcile `.agent/ACTIVE_TASK.md` and this task's STATE.md with the live
  session worktree so the new live-waypoint checks are green on the reconciled
  tree.
- Run the programme validation stack, tick every box with cited evidence,
  integrate by fast-forward and verify `HEAD == origin/main`.

**Non-goals:**

- No production, NEXT or DEV contact; no browser, credential, datastore or
  network contact.
- No implementation of the remaining production-completion groups; G2
  `lanes:manual` is not delivered, only its 18→12 spec count corrected.
- No Control Center design-system or production-observability campaign work;
  those changes are parked BLOCKED, not executed.
- No re-archive and no rewrite of published requirement bodies. No remote
  publication beyond the private canonical `origin main` integration.
- No A-01…A-04 or R-01…R-04 reopening.

**Safety constraints:**

- All implementation happens in the owned C-00 session worktree; the canonical
  checkout is never an implementation worktree.
- Sibling repositories remain read-only; no credentials or raw evidence enter
  source, artifacts, or task records.
- No test suppression: every new check is registered and negative-probed; no
  skip is added to a gate; no gate is weakened to make a lane executable.
- The permanent owner scope freeze, fail-closed egress, C-10 privacy firewall,
  D-4 production unloadability and the immutable evidence identities are
  unchanged.

**Acceptance criteria:**

- All 44 boxes across the three changes are ticked with cited evidence.
- `openspec validate --all` exits zero for every change and spec.
- `npm run agent:check`, `npm run typecheck`, `node bin/hardening-check.mjs`,
  `npm run project:check`, `npm run handoff:check`, `npm run validation:universe`
  and `npm run workspace:check` pass on the integrated tree.
- `npm run gate:local` PASS from the owned session at the programme checkpoint.
- Integration is fast-forward with local and remote `main` equal to the
  integrated HEAD after the checkpoint commit.

**Deliverables:**

- The three applied changes with their checks, probes, fixtures and spec
  repairs.
- Continuity-v2 task records for every active OpenSpec change.
- Reconciled `.agent/ACTIVE_TASK.md`, this task's `SPEC/PLAN/STATE/REPORT.md`,
  and project-truth updates required by the above.

**## Declared Deletions:**

NONE
