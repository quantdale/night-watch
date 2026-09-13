## Context

Nightwatch continuity v2 (`bin/agent-continuity-protocol.mjs`,
`bin/agent-state.mjs`) already fails closed on:

- status disagreement across ACTIVE / STATE / REPORT
- duplicate structured fields
- COMPLETE tasks with non-terminal milestones or next actions
- IN_PROGRESS tasks with *empty* milestones or *terminal* next actions
- DEF-FC-04: routing-block `CAMPAIGN` equals the active task id;
  `SESSION WORKTREE` equals STATE.md `Branch:` as a **string**; every
  `session/…` occurrence equals the declared worktree

It does not compare IN_PROGRESS waypoints to each other, and it does not ask
Git whether the named worktree exists. `bin/lib/openspec-ledger.mjs`
`inspectLedgerAgreement` reports `LEDGER_CHANGE_WITHOUT_TASK` as a **warning**,
so active OpenSpec changes with no task record still leave `agent:check`
green. At measurement time that was design-system and observability; this
campaign then added three more active directories that also lack
`.agent/tasks/<id>/STATE.md`. Elevating the warning to an error without
creating those records first fails the gate on the change that introduces
the error. Task 3.2 covers **every** currently active change, including
this one and its two siblings.

Measured at HEAD `ebe26ce` (2026-09-14):

```
ACTIVE_TASK Current milestone: G1 — ledger truth and the spec baseline
ACTIVE_TASK Next action:       run the G1.2 change↔task pairing…
ACTIVE_TASK SESSION WORKTREE:  session/nightwatch-production-completion-3d648499
STATE.md Milestone ID:         G4..G21 execution wave
git worktree list:             canonical main only
```

`inspectActiveTaskRouting` lives at `bin/agent-state.mjs` and is the correct
extension point for the live-worktree lookup. Milestone comparison belongs in
the IN_PROGRESS branch of `evaluateContinuityV2` in
`bin/agent-continuity-protocol.mjs` (around the existing
`IN_PROGRESS_MILESTONE_MISSING` / `IN_PROGRESS_NEXT_ACTION_TERMINAL` checks).

G6 of the production completion programme already treats RELEASED ownership
records as non-claims (`record.ownershipState !== 'OWNED' continue`). This
design does not reopen that. The operator-facing `task=` print of a RELEASED
canonical record remains G6.4–G6.6.

## Goals / Non-Goals

**Goals:**

- Fail `AGENT_CONTINUITY` when the documents a fresh agent reads first
  (ACTIVE_TASK + STATE + routing block + `openspec list`) describe different
  live work.
- Keep the check read-only and synthetic-fixture-tested.
- Leave historical task-without-change orphans as warnings.

**Non-Goals:**

- Implementing remaining production-completion groups, design-system, or
  autonomous yield.
- Byte-identical next-action paragraphs.
- Auto-creating `.agent/tasks/` directories for the two ownerless active
  changes (the check fails until a human/agent opens them under C-00).
- Changing C-00 worktree classes or session CLI verbs.

## Decisions

### D1 — Milestone identity is the leading G/W/M token, not full prose

ACTIVE_TASK uses `Current milestone: G1 — …`. STATE.md uses `Milestone ID: G4..G21 execution wave`. Requiring identical sentences would fail every
honest checkpoint that restates the same G4 work in different words.

Extract `^(G|W|M)\d+` from both sides. Compound STATE ids such as `G4..G21`
yield the first token `G4`. ACTIVE_TASK must contain that same first token
(or the full compound if we also parse `G4..G21` as a range — implement the
range form: ACTIVE identity must be one of the tokens in the STATE range,
**or** STATE identity must be a prefix of ACTIVE's range. The failing case
we measured is G1 vs G4, which is disjoint.)

Alternative rejected: a new structured field `CONTINUITY_MILESTONE_ID` in
both files. Cleaner long-term, but it would duplicate `Current milestone` /
`Milestone ID` and trip `DUPLICATE_CONTINUITY_FIELD` unless those are
retired. Token extraction uses fields that already exist.

### D2 — Next-action contradiction is milestone-scoped, not NLP

Do not diff paragraphs. If ACTIVE_TASK next-action mentions a milestone
identity that STATE.md records as complete in `## Completed Milestones` (or
that is strictly below STATE's current Milestone ID), fail
`ACTIVE_TASK_NEXT_ACTION_STALE`. The measured case is "run the G1.2 …"
against G1 COMPLETE_LOCAL / current G4.

Alternative rejected: require ACTIVE next-action to equal STATE `Exact Next
Action`. STATE.md of this programme currently has no `Exact Next Action`
heading in the snippet we read; forcing that heading across all IN_PROGRESS
tasks is a broader continuity-v2 change than this defect needs.

### D3 — Live worktree lookup uses the same porcelain the workspace integrity checker already parses

`bin/workspace-integrity.mjs` `parseWorktreePorcelain` / `git worktree list
--porcelain` is the existing topology source. The continuity check SHALL call
that parser (extract or import) rather than shelling a second way. No
absolute worktree paths enter tracked files; the check compares branch names
only.

`SESSION WORKTREE: NONE` is a new legal value, distinct from a missing
directive (`ACTIVE_TASK_ROUTING_SESSION_WORKTREE_MISSING` still fires).

### D4 — Elevate LEDGER_CHANGE_WITHOUT_TASK to error only for active changes

`inspectLedgerAgreement` already distinguishes active vs archived vs
historical tasks. Change the `warnings.push` for `stateText === null` on an
**active** change into `errors.push`. Leave `LEDGER_TASK_WITHOUT_CHANGE` and
legacy v1 as warnings. Do not invent OpenSpec files for W7–W10 child tasks.

### D5 — Tests use disposable synthetic task trees, never the live ACTIVE_TASK

Follow `tests/unit/productionCompletionOpenWork.test.ts` and
`tests/unit/agentContinuityProtocol.test.ts`: write a temp `.agent/` +
`openspec/changes/` fixture, run the pure inspectors, assert codes. Do not
mutate the repository's real ACTIVE_TASK in the test.

## Risks / Trade-offs

- **[Risk] The production-completion programme cannot pass `agent:check` until ACTIVE_TASK is reconciled or a session worktree is recreated.** → Mitigation: the first implementation task is to document the two legal green states (update ACTIVE_TASK to G4 + `SESSION WORKTREE: NONE` while remaining on canonical, or recreate the owned session). The check is the product; the reconcile is a one-line doc fix the owning campaign already owed G1.18.
- **[Risk] Design-system, observability, **and the three changes this audit created**, start failing the gate the moment `LEDGER_CHANGE_WITHOUT_TASK` becomes an error.** → Mitigation: task 3.2 runs **before** the error is enabled and requires a continuity-v2 `STATE.md` for every `openspec list` change that lacks one, including `nightwatch-continuity-live-waypoint-binding-v1`, `nightwatch-published-spec-baseline-integrity-v1`, and `nightwatch-validation-classification-and-skip-truth-v1`. Suggested apply order (continuity first) is legal only with that landing constraint. The check is not waived for self-created changes.
- **[Risk] Token extraction misfires on prose that mentions an older G-number.** → Mitigation: parse only the `Current milestone` / `Milestone ID` field values, never the whole file. Next-action stale detection uses STATE `## Completed Milestones` plus the current id, not a full-text G\d+ scan of ACTIVE_TASK.
- **[Risk] Importing workspace-integrity into agent-state creates a cycle.** → Mitigation: extract `listWorktreeBranches(root)` into a tiny shared helper if a cycle appears; do not load the whole integrity checker.

## Migration Plan

1. Land the inspectors and tests. Do **not** use reporting-then-blocking as
   a way to skip task 3.2. Ship the error as blocking only after **every
   currently active** change has a continuity-v2 `STATE.md` (or is parked
   BLOCKED with a real blocker), including this change and its two audit
   siblings. Enumerate `openspec list` immediately before enabling the
   error.
2. Reconcile ACTIVE_TASK in the same implementation session that turns the
   check on, or the gate is red on `main`. That reconcile is in `tasks.md`.
3. Rollback is revert of the checker; no persisted schema migrates.

## Open Questions

None that block implementation. `SESSION WORKTREE: NONE` vs omitting the
directive: the requirement picks `NONE` so DEF-FC-04's "directive missing"
error stays meaningful.

## Affected surfaces

- `bin/agent-continuity-protocol.mjs` (IN_PROGRESS branch)
- `bin/agent-state.mjs` (`inspectActiveTaskRouting`)
- `bin/lib/openspec-ledger.mjs` (`inspectLedgerAgreement` warning→error)
- `tests/unit/agentContinuityProtocol.test.ts` (or a sibling file)
- `tests/unit/productionCompletionOpenWork.test.ts` (error vs warning)
- `.agent/ACTIVE_TASK.md` (reconcile as a landing constraint)

## Testing strategy

- Synthetic IN_PROGRESS pair with G1 vs G4 → `ACTIVE_TASK_MILESTONE_DRIFT`
- Matching G4 / G4 → pass
- SESSION WORKTREE names a branch absent from a stub porcelain list →
  `ACTIVE_TASK_SESSION_WORKTREE_MISSING`
- `NONE` + canonical main porcelain → pass
- Active change without STATE.md → error
- Historical task without change → warning
- COMPLETE active task with non-terminal ACTIVE milestone still fails the
  *existing* COMPLETE rule, not this one
