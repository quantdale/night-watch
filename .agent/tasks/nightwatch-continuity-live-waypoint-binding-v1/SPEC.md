# SPEC.md

**Task:** nightwatch-continuity-live-waypoint-binding-v1
**Campaign:** OpenSpec truth-surface closure
**Objective:** Implement the OpenSpec change
`nightwatch-continuity-live-waypoint-binding-v1`: bind IN_PROGRESS
ACTIVE_TASK/STATE waypoints to each other, bind `SESSION WORKTREE` to live
`git worktree` registrations, and make `LEDGER_CHANGE_WITHOUT_TASK` an error
for active changes — after every active change has a continuity-v2 record.

**Scope:**

- Milestone-identity extraction (`^(G|W|M)\d+`, range token sets) in
  `bin/agent-continuity-protocol.mjs` and the IN_PROGRESS
  `ACTIVE_TASK_MILESTONE_DRIFT` / `ACTIVE_TASK_NEXT_ACTION_STALE` emissions.
- Live worktree resolution for the routing block, with the new legal
  `SESSION WORKTREE: NONE` value and `ACTIVE_TASK_SESSION_WORKTREE_MISSING`.
- `LEDGER_CHANGE_WITHOUT_TASK` as an error for active changes in
  `bin/lib/openspec-ledger.mjs`.
- Synthetic-fixture tests, including the measured `ebe26ce` shape.

**Non-goals:** implementing other campaigns; byte-identical next-action
paragraphs; auto-creating task records for ownerless changes inside the
checker; changing C-00 worktree classes or session verbs.

**Safety constraints:** read-only checks; no session mutation; no weakening
of `LEDGER_TERMINAL_TASK_HAS_OPEN_ITEMS`; never fail open on a missing
worktree.

**Acceptance criteria:** the change's spec scenarios are implemented and
negative-probed; `openspec validate
nightwatch-continuity-live-waypoint-binding-v1 --strict` PASS;
`npm run agent:check` and `npm run typecheck` PASS on the reconciled tree.

**Deliverables:** the checker changes, the tests, and the reconciled task
topology the landing constraint requires.

**## Declared Deletions:**

NONE
