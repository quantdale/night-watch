## 1. Inspectors and error codes

- [x] 1.1 Add milestone-identity extraction (`^(G|W|M)\d+`, including `G4..G21` as a token set) as a pure function in `bin/agent-continuity-protocol.mjs` with unit tests for the measured G1-vs-G4 case, matching G4/G4, missing token on one side, and COMPLETE-status exemption
- [x] 1.2 In the IN_PROGRESS branch of the continuity state machine, emit `ACTIVE_TASK_MILESTONE_DRIFT` when ACTIVE_TASK `Current milestone` identity is disjoint from STATE.md `Milestone ID` / `## Current Milestone`
- [x] 1.3 Emit `ACTIVE_TASK_NEXT_ACTION_STALE` when ACTIVE_TASK `Next action` names a milestone identity that STATE.md records under `## Completed Milestones` or that is strictly below the current Milestone ID; do not require byte-identical next-action paragraphs
- [x] 1.4 Extend `inspectActiveTaskRouting` in `bin/agent-state.mjs` to accept `SESSION WORKTREE: NONE` (canonical-only) and to resolve any `session/<name>` value against live `git worktree` branch names via the existing porcelain parser (extract a shared helper if importing `workspace-integrity.mjs` would cycle)
- [x] 1.5 Emit `ACTIVE_TASK_SESSION_WORKTREE_MISSING` when a `session/<name>` value has no registered worktree on that branch; keep `ACTIVE_TASK_ROUTING_SESSION_WORKTREE_MISSING` for a missing directive; keep `ACTIVE_TASK_ROUTING_FOREIGN_WORKTREE_REFERENCE` occurrence-complete
- [x] 1.6 In `bin/lib/openspec-ledger.mjs` `inspectLedgerAgreement`, push `LEDGER_CHANGE_WITHOUT_TASK` as an **error** for active (non-archived) changes with no STATE.md; leave `LEDGER_TASK_WITHOUT_CHANGE` and `LEDGER_LEGACY_CHANGE` as warnings

## 2. Tests

- [x] 2.1 Add synthetic-fixture tests (disposable `.agent/` + `openspec/changes/`, never mutate live ACTIVE_TASK) covering 1.2–1.6, including the exact HEAD `ebe26ce` shape: ACTIVE G1 + STATE G4 + missing session worktree
- [x] 2.2 Extend `tests/unit/productionCompletionOpenWork.test.ts` so an active change without a task now expects an error, and a historical task-without-change still expects a warning
- [x] 2.3 Negative-probe: a COMPLETE task with a non-terminal ACTIVE milestone still fails the existing COMPLETE rule, not `ACTIVE_TASK_MILESTONE_DRIFT`

## 3. Landing constraint (this repository, same session)

- [x] 3.1 Reconcile `.agent/ACTIVE_TASK.md` Current milestone / Next action with the production-completion STATE.md current milestone **or** recreate the owned session worktree named in the routing block — one of the two legal green states in design D3 — without hijacking another owner's session
- [x] 3.2 Before turning `LEDGER_CHANGE_WITHOUT_TASK` into an error, give **every currently active** `openspec/changes/<id>/` that lacks `.agent/tasks/<id>/STATE.md` a continuity-v2 task record (SPEC/PLAN/STATE, Status IN_PROGRESS or BLOCKED with a real blocker) **or** park that change with an explicit BLOCKED STATE.md. The set is not just design-system and observability: it **includes this change** `nightwatch-continuity-live-waypoint-binding-v1` and its campaign siblings `nightwatch-published-spec-baseline-integrity-v1` and `nightwatch-validation-classification-and-skip-truth-v1`, plus any other active change present at apply time. Enumerate `openspec list` vs `.agent/tasks/` immediately before enabling the error; a missing STATE.md for any listed change fails the landing. Do not silence the check. Do not hijack another owner's session.
- [x] 3.3 Run `npm run agent:check` and `npm run typecheck`; both PASS with the new errors exercised by 2.1 and absent on the reconciled tree

## 4. Closeout

- [x] 4.1 Confirm `openspec validate nightwatch-continuity-live-waypoint-binding-v1 --strict` PASS
- [x] 4.2 Do not tick any production-completion, design-system, or autonomous programme implementation boxes as a side effect of this change
