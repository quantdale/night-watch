# Active Task

Task ID: nightwatch-final-completion-review5-v1
Phase: COMPLETION_REVIEW5_V1
Title: Review-5 corrective campaign (bounded child of the terminal campaign)
Status: IN_PROGRESS
TASK_GROUP_LEDGER: nightwatch.task-group-ledger.v1
TASK_GROUPS_COMPLETE: A1,A2,A3,A4,A5,A6,A7,A8,A9,B1,B2,B3,B4,B5,B6
TASK_GROUP_NEXT: C
TASK_NEXT_ID: C.3
Task directory: .agent/tasks/nightwatch-final-completion-review5-v1
Starting SHA: d68bb1a7c7cf244da654815a1e7f266e1985f30c
Last validated implementation SHA: 027367d9da22ea1198c0a60fb1b11805f6719d40
Last checkpoint: 2026-10-03 — CLOSE-OUT VALIDATED, INTEGRATING. Track A (A1-A9) is integrated at `4f4d7bfd`
(exact-head CI GREEN, run 37044532848) and Track B (B1-B6) at `5b2ea0f7` (run 37062959122 GREEN); the full
authoritative set is green; the REPORT carries the per-ID disposition table for R5-01..R5-18; the change
is archived with spec sync in the canonical close-out commit (task C.4). The remaining close-out is mechanical and happens after this tip is
integrated: observe its exact-head CI, release and remove this session, run `gate:clean` from canonical,
then ONE canonical maintenance commit flips this record to COMPLETE and routes ACTIVE_TASK back to
`nightwatch-final-product-completion-v1` at M9 task 10.4.
Current milestone: group C — close-out, tasks C.1-C.2 and C.4 done; C.3 (integration, CI, release,
`gate:clean`) is in progress.
Next action: observe the exact-head CI run at the integrated tip, then release and remove the session,
run `gate:clean` from canonical, flip this record to COMPLETE and route ACTIVE_TASK to the parent.
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
  IN_PROGRESS — close-out: the change is archived, the REPORT is written and the full validation set
  is green; the tip is being integrated. The parent `nightwatch-final-product-completion-v1` stays
  paused until the canonical route-back commit.

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
