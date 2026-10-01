# PLAN — nightwatch-final-completion-review4-v1

## Purpose

Resolve the 24 findings of the independent review-4 (`audit.md`) inside one
bounded child campaign, so the paused parent terminal campaign
`nightwatch-final-product-completion-v1` can resume at M9 task 10.2 remainder
and run to M14 certification on a sound certification path.

## Starting State

Canonical is `67eb3098` = `origin/main`, clean, no live session; exact-head CI
run 36832639979 GREEN (15/15 groups). The corrective child
`nightwatch-final-completion-corrections-v1` is closed, archived and its
session branch deleted. The parent is paused canonical-routed with
`SESSION WORKTREE: NONE` and `Branch: main`, M9 10.2 at 60/76 declared (12
pending, next bin `auth-configure`). The review-4 findings are recorded
verbatim in `audit.md`; the task groups verbatim in `tasks.md`.

## Scope

Groups 1-7 of `tasks.md`: certification soundness, guard robustness, CI truth,
product correctness, ledger and records, hygiene and continuity, close-out.

## Non-Goals

- No cryptographic receipt authentication (OD-5 explicitly declines it).
- No parent milestone work: M9 10.2 remainder, 10.3-10.6 and M10-M14 stay in
  the parent.
- No parent single-use grant (the 12.3 paid proof run and the 15.4 npm
  registry query are the parent's).
- No new certification machinery, no product scope beyond the five named
  defects, no new authorization, no Alphaus DEV/NEXT/production contact.
- No review-5: the review-4 scope is closed.

## Safety Constraints

Read-only toward Alphaus repositories and every external system. No secrets,
credentials, customer data or absolute home paths in source, artifacts or
`.agent` files. Overnight: only local synthetic fixtures and bounded local
child processes. Recorder-PASS exemption: do not settle a surface with
authority delegated to another surface that is out of scope. External contact
is GitHub Actions observation and C-00 fast-forward pushes only. Never
force-push, never rewrite history, never touch another owner's worktree.

## Architecture / Approach

Each finding is fixed at its own source, then proven twice: by a focused
regression test and by at least one registered mutation probe (a family of >= 5
where the review names a survivor). Guard families prefer behavioural fixtures
on real synthetic Git repositories over source-text anchors. Each validated
batch is committed before `hardening:rules` runs, and the child closes only on
an observed green exact-head CI at the tip that contains its close-out.

## Milestones

### M0 — Bootstrap (owner preconditions)

- Objective: create the bounded child campaign from the canonical-routed
  parent checkpoint `67eb3098` (= `origin/main`, exact-head CI 36832639979
  GREEN, no live session): the review-4 change, the continuity v2 records and
  the task-ID ledger entry, in the session worktree.
- Files/areas: `openspec/changes/nightwatch-final-completion-review4-v1/`,
  `.agent/tasks/nightwatch-final-completion-review4-v1/`, `.agent/ACTIVE_TASK.md`,
  `config/task-id-ledger.v1.json`.
- Acceptance criteria: `agent:check` PASS, `openspec validate --strict` PASS,
  the ID baseline resolvable at the bootstrap commit.
- **Status:** COMPLETE (2026-10-01)

### M1 — Certification soundness (group 1: 1.1-1.8)

- Objective: complete, reachable, fail-closed certification (OD-5, OD-6).
- Files/areas: `bin/lib/checkpoint-role.mjs`, `bin/lib/release-evidence.mjs`,
  `bin/project-state-check.mjs`, `bin/agent-state.mjs`,
  `bin/lib/hardening/rules/validation-and-gates.mjs`,
  `bin/lib/gate-receipt.mjs`, `config/release-evidence.v1.json`,
  `tests/unit/productionCompletionLaneState.test.ts`,
  `tests/unit/projectState.test.ts`, `docs/DECISIONS.md`,
  `docs/SAFETY_MODEL.md`.
- Acceptance: a verified binding at a descendant of S stays DOCUMENTARY; a
  hand-written FAIL/mismatched receipt never verifies; a rename is
  SUBSTANTIVE; no topology receipt is NOT MET; `autonomous-yield-proof` is
  required and honestly unmet.
- **Status:** COMPLETE (2026-10-01; implemented, exact-head CI pending)

### M2 — Guard robustness (group 2: 2.1-2.2)

- Objective: every R4-08/R4-09 survivor killed by a registered family.
- Acceptance: `hardening:rules` DETECTED for every member.
- **Status:** COMPLETE (2026-10-01; implemented, exact-head CI pending)

### M3 — CI truth (group 3: 3.1-3.4)

- Objective: record CI truth instead of bending it.
- Acceptance: the pushed-range pairing runs in CI; `CI_STATUS` is derived;
  every red run and repair is recorded; the close-out procedure is enforced.
- **Status:** COMPLETE (2026-10-01; implemented, exact-head CI pending)

### M4 — Product correctness (group 4: 4.1-4.5)

- Objective: carry D-149's refusal count into the recorded summary; tolerate
  transient proxy-probe misses; restore the VC-01 list; run real Prettier in a
  CI lane; accurate `ai-local-canary` help.
- **Status:** NOT_STARTED

### M5 — Ledger and records (group 5: 5.1-5.2)

- Objective: suffixed task IDs are seen; archived records are corrected by
  appended annotations with a per-ID disposition table.
- **Status:** NOT_STARTED

### M6 — Hygiene and continuity (group 6: 6.1-6.2)

- Objective: session/clean-receipt/continuity hygiene.
- **Status:** NOT_STARTED

### M7 — Close-out (group 7: 7.1-7.6)

- Objective: the full authoritative set, integration, CI observation, release,
  removal, `gate:clean`, REPORT, archival, route back to the parent.
- **Status:** NOT_STARTED

## Validation Strategy

Focused suites plus the registered mutation families during implementation;
`npm run gate:dev` and `npm run gate:milestone` at group boundaries;
`npm run hardening:rules` after every guard change; the full authoritative set
before integration; exact-head CI observed at the integrated tip. Never
classify a missing, unknown, all-skipped or zero-executed validation result as
PASS.

## Decision Log

- 2026-10-01 — Adopt OD-5/OD-6 verbatim as D-150 (source:
  `RESUME_PROMPT_4.md` §1, review-4 corrective campaign). Receipts are
  tamper-evident, not tamper-proof; `autonomous-yield-proof` stays required and
  is certifying only from the 12.3 paid-run yield receipt; topology
  certification is a local PROVEN receipt at S conjoined with exact-head CI
  `EXECUTED_PASS` at S; certification is reachable through S or a
  documentary-only descendant of S.
- 2026-10-01 — Per-group design decisions D150-1..D150-8 are recorded in
  `openspec/changes/nightwatch-final-completion-review4-v1/design.md`.

## Discoveries

(none yet)

## Deferred Work

(none yet)

## Completion Criteria

See `SPEC.md` "Completion Criteria". All seven groups ticked, every review-4
finding dispositioned, gates and CI green, `gate:clean` from canonical with no
live session, REPORT written, change archived with spec sync, ACTIVE_TASK
routed back to the parent.
