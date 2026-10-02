# Active Task

Task ID: nightwatch-final-completion-review5-v1
Phase: COMPLETION_REVIEW5_V1
Title: Review-5 corrective campaign (bounded child of the terminal campaign)
Status: IN_PROGRESS
TASK_GROUP_LEDGER: nightwatch.task-group-ledger.v1
TASK_GROUPS_COMPLETE: A1,A2
TASK_GROUP_NEXT: A3
TASK_NEXT_ID: A3.1
Task directory: .agent/tasks/nightwatch-final-completion-review5-v1
Starting SHA: d68bb1a7c7cf244da654815a1e7f266e1985f30c
Last validated implementation SHA: 027367d9da22ea1198c0a60fb1b11805f6719d40
Last checkpoint: 2026-10-02 — BOOTSTRAP. This bounded child campaign was created
from the parent's pause checkpoint `d68bb1a7` (= `origin/main`; the parent
paused at M9 task 10.4, no live parent session): the change
`openspec/changes/nightwatch-final-completion-review5-v1/` (proposal, design with the empty
Certification Producer Matrix, audit = the 18 review-5 findings verbatim,
tasks = the Track A / Track B / close-out groups verbatim, one spec requirement
per group) and this continuity v2 record are the single bootstrap commit. The
owner decision "both" is recorded as D-152. Scope is closed: R5-01..R5-18 are
resolved by groups A1-A9, B1-B6 and C; there is no review-6 by default (the
exit rule: if Track B cannot make all 16 conditions reachable honestly, STOP
and report). The parent `nightwatch-final-product-completion-v1` stays paused;
on close-out ACTIVE_TASK routes back to it at "M9 task 10.4".
Current milestone: group A3 — Receipt verification completeness (A3.1-A3.2);
groups A1 and A2 are implemented (CI pending at their integration tip).
Next action: implement task A3.1 (R5-03) — gate receipts record tree
cleanliness at emit and every certifying kind requires a clean emit; then A3.2
(R5-04) closed subject sets.
Authorization class: COMPLETION_REVIEW5_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: d68bb1a7c7cf244da654815a1e7f266e1985f30c
LAST_VALIDATED_IMPLEMENTATION_SHA: 027367d9da22ea1198c0a60fb1b11805f6719d40
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 027367d9da22ea1198c0a60fb1b11805f6719d40
LIVE_HEAD_AUTHORITY: GIT
PHASE_COMPLETION_REVIEW5_V1_STATUS: IN_PROGRESS

## Mission

Resolve every finding of the independent review-5 (`audit.md`, verbatim from
`RESUME_PROMPT_5.md` §3) in two tracks: first the real integrity and product
defects (Track A), then make release certification reachable honestly (Track B)
— a real producer for every one of the 16 conditions and 11 lanes, verifiable
from a clean clone, ending in a fixture-repository proof of 16/16. Close the
child with the full authoritative validation set (including the committed
mutation harness at zero survivors), exact-head CI green, `gate:clean` from
canonical, a per-ID disposition table for R5-01..R5-18, archival with spec
sync, and ACTIVE_TASK routed back to the parent at M9 task 10.4.

## Read order

1. `.agent/tasks/nightwatch-final-completion-review5-v1/{SPEC,PLAN,STATE}.md`
2. `openspec/changes/nightwatch-final-completion-review5-v1/{proposal,design,audit,tasks}.md`
3. `AGENTS.md`, `docs/CURRENT_STATE.md`, `docs/SAFETY_MODEL.md`,
   `docs/DECISIONS.md` (D-150, D-152), `docs/FLAKE-LEDGER.md`
4. The cited live source for each finding

## Routing and safety

```text
CAMPAIGN: nightwatch-final-completion-review5-v1
CHILD TASK: NONE
SESSION WORKTREE: session/nightwatch-final-completion-revi-305cc65d

IMPLEMENTATION AUTHORIZED:
  Nightwatch source, tests, hardening rules/probes, schemas/configuration,
  synthetic Git/browser/network fixtures, synthetic private-data markers,
  local bounded child processes, OpenSpec/task continuity records,
  C-00 commits and fast-forward integration from this session only.

EXTERNAL CONTACT AUTHORIZED (OD-3 ONLY):
  GitHub Actions read/observe; C-00 fast-forward pushes.

CURRENT STATUS:
  IN_PROGRESS — A1 and A2 implemented (CI pending); group A3 (receipt verification completeness) is next.

ALPHAUS DEV / NEXT / PRODUCTION CONTACT:   NOT AUTHORIZED
AUTHENTICATED ALPHAUS RUNTIME:             NOT AUTHORIZED
DATABASE / DATA-PLANE ACCESS:              NOT AUTHORIZED
CLOUD / INFRASTRUCTURE OPERATIONS:         NOT AUTHORIZED
SIBLING REPOSITORY MUTATION:               NOT AUTHORIZED
EXTERNAL PUBLICATION / ISSUE / PR:         NOT AUTHORIZED
FORCE PUSH / HISTORY REWRITE:              NOT AUTHORIZED
LOCAL READ-ONLY COMMANDS AND TESTS:        AUTHORIZED
```

Never force-push, never rebase or amend another agent's commits, never discard
a newer canonical tip, and never touch another owner's worktree. Do not claim
completion, exhaustion, or release readiness without evidence. The parent's
single-use grants (the 12.3 paid provider run and the 15.4 npm advisory query)
are NOT claimed by this child.
