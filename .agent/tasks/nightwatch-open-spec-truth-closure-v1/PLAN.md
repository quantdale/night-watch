# Nightwatch OpenSpec truth-surface closure

## Purpose

Three sibling OpenSpec changes were planned at `ebe26ce` to repair truth
surfaces the production-completion programme left behind: the continuity
waypoint binding, the published-spec baseline integrity, and the validation
classification / skip-identity truth. This campaign applies, validates and
integrates all three, and satisfies the landing constraint the continuity
change names — every active change has a continuity-v2 task record before the
`LEDGER_CHANGE_WITHOUT_TASK` error is enabled.

## Starting State

- Task ID `nightwatch-open-spec-truth-closure-v1`; starting SHA
  `ebe26ce6b2a946fe0fd55fde3a5022e792a792d0`, equal to `origin/main` and live
  `HEAD` in the canonical checkout.
- The three changes exist as untracked planning artifacts in the canonical
  checkout with planning-complete proposal/design/specs/tasks and zero boxes
  ticked. They were moved into the owned session worktree
  `session/nightwatch-open-spec-truth-closu-7138ca21` on claim.
- `.agent/ACTIVE_TASK.md` still names the integrated
  `nightwatch-production-completion-programme-v1` and its released session;
  `agent:check` passes only because the new live-waypoint rules do not exist
  yet.
- `openspec list` reports seven active changes; three lack task records
  (the three audit siblings) and two more lack them (design-system,
  observability master plan).

## Scope

Apply the three changes' tasks in order, create the task records the
continuity landing constraint requires, reconcile the active-task waypoint,
run the validation stack, tick every box with evidence, and integrate by
fast-forward.

## Non-Goals

Product/production contact, remaining production-completion groups,
`lanes:manual` delivery, control-center design system execution,
observability campaign execution, re-archiving, requirement-body rewrites,
and any force-push or history rewrite.

## Safety Constraints

As `SPEC.md`. The controlling rule: the new checks are never weakened to make
the reconciled tree green — the records are brought to the checks.

## Architecture / Approach

The three changes are independent surfaces with one shared landing constraint.
The continuity change's 3.2 enumerates every active change at apply time and
requires a continuity-v2 STATE.md before the warning becomes an error, so the
first work item is the task topology. The baseline change adds a parser module
consumed by `AGENT_CONTINUITY`; the validation change adds pure classification
rules over the universe and lane-state JSON plus the semantic-compat skip
gate, and corrects the production-completion spec counts (18→12) without
ticking programme boxes.

## Milestones

- [ ] M1 — Task topology: continuity-v2 records for every active change, with
  the two ownerless campaigns parked BLOCKED; ACTIVE_TASK reconciled to this
  campaign and its live session. Acceptance: `agent:check` passes with the
  new records and no `CLAIM_TASK_UNKNOWN` attention.
- [ ] M2 — `nightwatch-continuity-live-waypoint-binding-v1` applied: milestone
  identity drift, stale next action, live worktree resolution, and the
  change↔task error. Acceptance: `openspec validate
  nightwatch-continuity-live-waypoint-binding-v1 --strict` PASS and focused
  fixture tests green.
- [ ] M3 — `nightwatch-published-spec-baseline-integrity-v1` applied: strict
  archive-index parser, garbage-row repair, 56 Purpose fills, heading-diff
  zero. Acceptance: `npm run agent:check` and `openspec validate --specs
  --strict` PASS.
- [ ] M4 — `nightwatch-validation-classification-and-skip-truth-v1` applied:
  skip-identity enforcement, universe class rules, config binds, fixture
  loader convergence and the programme spec corrections. Acceptance:
  `node bin/hardening-check.mjs`, `npm run semantic-compat` policy behaviour
  and focused tests green.
- [ ] M5 — Validation stack: typecheck, hardening, project, handoff, agent,
  workspace, universe and `gate:local` PASS at the checkpoint.
- [ ] M6 — Integration and closeout: boxes ticked with evidence, fast-forward
  push verified `HEAD == origin/main`, canonical synced, session released and
  removed, task records closed.

## Validation Strategy

Per change: its own focused tests, run to green, plus
`openspec validate <change> --strict`. Whole-programme: `npm run typecheck`,
`node bin/hardening-check.mjs`, `npm run project:check`, `npm run
agent:check`, `npm run validation:universe`, `npm run workspace:check`,
`npm run handoff:check` and `npm run gate:local`. Evidence is recorded in
STATE.md at each milestone; counts are measured, never assumed.

## Decision Log

- 2026-09-14 — Apply the three changes in the order the continuity proposal
  suggests (continuity first) with task records created before the error is
  enabled. Reason: 3.2's set includes this campaign's own siblings and no
  exemption exists for self-created changes. Consequence: M1 precedes all
  implementation.
- 2026-09-14 — Park design-system and observability as BLOCKED records rather
  than opening sessions for them. Reason: executing either would exceed this
  campaign's authorization; the check requires a record, not a session.

## Discoveries

- (recorded as measured; see STATE.md)

## Deferred Work

- The remaining owner-gated items of
  `nightwatch-production-completion-programme-v1` stay as its ledger records
  them; this campaign touches only the two spec files its task 2.6 amends.

## Completion Criteria

As `SPEC.md`, plus: every active change has a continuity-v2 task record, the
live-waypoint checks pass on the reconciled tree, and the session is released
after integration with no stale branch left behind.
