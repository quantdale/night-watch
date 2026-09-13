# Proposal — Continuity live-waypoint binding

## Why

Continuity v2 and DEF-FC-04 bind *status words* and the routing-block *strings*
to each other. They do not bind those strings to the live Git worktree list, and
they do not bind an IN_PROGRESS task's Current milestone / Next action across
`.agent/ACTIVE_TASK.md` and `.agent/tasks/<id>/STATE.md`. Measured at HEAD
`ebe26ce` on 2026-09-14, `npm run agent:check` is PASS with `strict_errors=0`
while those two files describe different campaigns-in-flight, and the declared
session worktree does not exist. A fresh agent that follows ACTIVE_TASK will
restart G1.2 of a programme whose STATE.md already records G1 as
COMPLETE_LOCAL. That is the same class of defect DEF-FC-04 closed for the
routing *prose* — identity fields rewritten, operational waypoint left behind —
and it is currently invisible to the gate.

## What Changes

- Add a versioned live-waypoint check inside the existing `AGENT_CONTINUITY`
  group (`bin/agent-continuity-protocol.mjs` / `bin/agent-state.mjs`) so an
  IN_PROGRESS active task cannot pass while ACTIVE_TASK and STATE.md name
  different current milestones or next actions.
- Bind `SESSION WORKTREE` to live `git worktree` registrations: a
  `session/<name>` value MUST name a currently registered worktree on that
  branch, or the routing block MUST declare `NONE` (canonical-only, no owned
  session). A released or missing session named as live is an error.
- Elevate `LEDGER_CHANGE_WITHOUT_TASK` from warning to error for **active**
  (non-archived) OpenSpec changes. Historical `.agent/tasks/*` without a
  matching change stay warnings. Measured here, **every** currently active
  change that lacks `.agent/tasks/<id>/STATE.md` is in scope, not a named
  subset. At proposal time that set was the design-system and observability
  master-plan changes. This campaign then added three more active changes
  (`nightwatch-continuity-live-waypoint-binding-v1`,
  `nightwatch-published-spec-baseline-integrity-v1`,
  `nightwatch-validation-classification-and-skip-truth-v1`) that also have
  no task directory. Landing this check **first** (the suggested apply
  order) without creating a continuity-v2 `STATE.md` for **each** of those
  active changes, **including this one and its two siblings**, fails
  `agent:check`. Task 3.2 is that landing constraint. The check is not
  waived for changes created by the same audit.
- Negative probes for each new error code. No product, browser, network, or
  sibling-source behaviour changes.

This change does **not** steal, adopt, or release any session. Clearing the
canonical RELEASED maintenance record that still prints
`task=nightwatch-control-center-render-truth-v1` remains G6.4–G6.6 of
`nightwatch-production-completion-programme-v1`.

## Capabilities

### New Capabilities

- `agent-continuity-live-waypoint`: the agent's routing documents (ACTIVE_TASK
  milestone/next-action, SESSION WORKTREE, and the pairing of every active
  OpenSpec change to a continuity-v2 task) SHALL describe the live Git and
  task world, or `agent:check` fails closed.

### Modified Capabilities

None. `campaign-handoff-truth` governs `.agent/EXECUTION_PROMPT.md`, not
ACTIVE_TASK waypoints. `concurrency-workspace-hardening` governs C-00 ownership
records and already skips RELEASED claims by design (G6). This capability is
the missing cross-file *operational waypoint* layer between those two.

## Impact

- `bin/agent-continuity-protocol.mjs`, `bin/agent-state.mjs`,
  `bin/lib/openspec-ledger.mjs`
- `.agent/ACTIVE_TASK.md` and the active task `STATE.md` (must be reconciled as
  part of making the check green; this change specifies the check, not the
  production-completion programme's remaining integration)
- `tests/unit` coverage for the new error codes (synthetic task fixtures, not
  mutation of the live ACTIVE_TASK during the test)
- Required `AGENT_CONTINUITY` quality-gate group — a fail here fails
  `gate:local` and `gate:ci`
- No change to C-00 write authority, owner-scope freeze, or session CLI
  lifecycle commands

## Evidence (measured 2026-09-14, HEAD `ebe26ce` == `origin/main`)

| Surface | Observed | Gate result |
|---|---|---|
| `.agent/ACTIVE_TASK.md` | `Current milestone: G1 — ledger truth…`; `Next action: run the G1.2 change↔task pairing…`; `SESSION WORKTREE: session/nightwatch-production-completion-3d648499` | `agent:check` PASS |
| `.agent/tasks/nightwatch-production-completion-programme-v1/STATE.md` | `Current Milestone` / `Milestone ID: G4..G21 execution wave`; G1 recorded COMPLETE_LOCAL | same PASS |
| `git worktree list` | only the canonical checkout on `main` | same PASS |
| `inspectActiveTaskRouting` | compares SESSION WORKTREE to STATE `Branch:` *string* only | no live-git lookup |
| IN_PROGRESS state machine | requires a non-empty milestone and next action; never compares ACTIVE vs STATE | drift is legal |
| `openspec list` | four active changes | — |
| `.agent/tasks/` | missing for design-system (50 open boxes) and observability master plan (10 open boxes) | `LEDGER_CHANGE_WITHOUT_TASK` **warning** only |

## Out of scope

- Implementing remaining production-completion groups, the Control Center
  design system, autonomous yield, or production observability campaigns
- Forcing historical v2 tasks to grow OpenSpec changes
- Deleting or rewriting the canonical RELEASED maintenance record (G6)
- Changing DEF-FC-04's occurrence-complete `session/…` scan, except to add the
  live-worktree existence check beside it

## Dependencies

- Depends on G1 of `nightwatch-production-completion-programme-v1` having
  published `openspec/specs/` and the ledger agreement check (already on
  `main`). Does not depend on G1.18 integration/release.
- Must not weaken `LEDGER_TERMINAL_TASK_HAS_OPEN_ITEMS` (errors stay errors).
- Independent of the two sibling audit changes in this campaign
  (`published-spec-baseline-integrity`, `validation-classification-and-skip-truth`).
