# Active Task

Task ID: nightwatch-final-completion-review4-v1
Phase: COMPLETION_REVIEW4_V1
Title: Review-4 corrective campaign (bounded child of the terminal campaign)
Status: IN_PROGRESS
TASK_GROUP_LEDGER: nightwatch.task-group-ledger.v1
TASK_GROUPS_COMPLETE: NONE
TASK_GROUP_NEXT: 1
TASK_NEXT_ID: 1.1
Task directory: .agent/tasks/nightwatch-final-completion-review4-v1
Starting SHA: 67eb30981b4bb4d6bb6959b9afee9345938f5750
Last validated implementation SHA: 027367d9da22ea1198c0a60fb1b11805f6719d40
Last checkpoint: 2026-10-01 — BOOTSTRAP. This bounded child campaign was created
from the canonical-routed parent checkpoint `67eb3098` (= `origin/main`,
exact-head CI run 36832639979 GREEN, no live session): the change
`openspec/changes/nightwatch-final-completion-review4-v1/` (proposal, design,
audit = the 24 review-4 findings verbatim, tasks = the seven task groups
verbatim, one spec requirement per group) and this continuity v2 record are the
single bootstrap commit. Scope is closed: every R4-01..R4-24 finding is
resolved by groups 1-7; a new finding enters scope only if it is high severity
and lies on the certification path. Review-5 does not exist by default. The
parent `nightwatch-final-product-completion-v1` stays paused; on close-out
ACTIVE_TASK routes back to it at "M9 task 10.2 remainder (60/76 declared; next
bin `auth-configure`)".
Current milestone: group 3 — CI truth, tasks 3.1-3.4; task 3.1 is next.
Next action: implement task 3.1 (R4-10) — pass `NIGHTWATCH_PUSH_BEFORE`
explicitly to the HARDENING child, declare it in environment-surface, and
prove `resolveArchiveDiffBase` receives it under `gate:ci`; then 3.2-3.4.
Authorization class: COMPLETION_REVIEW4_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 67eb30981b4bb4d6bb6959b9afee9345938f5750
LAST_VALIDATED_IMPLEMENTATION_SHA: 027367d9da22ea1198c0a60fb1b11805f6719d40
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 027367d9da22ea1198c0a60fb1b11805f6719d40
LIVE_HEAD_AUTHORITY: GIT
PHASE_COMPLETION_REVIEW4_V1_STATUS: IN_PROGRESS

## Mission

Resolve every finding of the independent review-4 (`audit.md`, verbatim from
`RESUME_PROMPT_4.md` §3) so the parent terminal campaign can resume on a sound
certification path: complete receipt verification (OD-5), make certification
reachable through S or a documentary-only descendant of S (OD-6c), keep
`autonomous-yield-proof` required and honest (OD-6a), make topology
certification a conjunction that fails closed (OD-6b), kill every surviving
guard mutant with a registered mutant family, record CI truth instead of
bending it, fix the five product defects with their evidence, and leave the
ledgers, records and continuity truthful. Close the child with the full
authoritative validation set, exact-head CI green, `gate:clean` from canonical,
a per-ID disposition table for R4-01..R4-24, archival with spec sync, and
ACTIVE_TASK routed back to the parent.

## Read order

1. `.agent/tasks/nightwatch-final-completion-review4-v1/{SPEC,PLAN,STATE}.md`
2. `openspec/changes/nightwatch-final-completion-review4-v1/{proposal,design,audit,tasks}.md`
3. `AGENTS.md`, `docs/CURRENT_STATE.md`, `docs/SAFETY_MODEL.md`,
   `docs/DECISIONS.md`, `docs/FLAKE-LEDGER.md`
4. The cited live source for each finding

## Routing and safety

```text
CAMPAIGN: nightwatch-final-completion-review4-v1
CHILD TASK: NONE
SESSION WORKTREE: session/nightwatch-final-completion-revi-be20f537

IMPLEMENTATION AUTHORIZED:
  Nightwatch source, tests, hardening rules/probes, schemas/configuration,
  synthetic Git/browser/network fixtures, synthetic private-data markers,
  local bounded child processes, OpenSpec/task continuity records,
  C-00 commits and fast-forward integration from this session only.

EXTERNAL CONTACT AUTHORIZED (OD-3 ONLY):
  GitHub Actions read/observe; C-00 fast-forward pushes.

CURRENT STATUS:
  IN_PROGRESS — groups 1 (certification soundness) and 2 (guard robustness) are
  implemented and locally validated (93 rules / 230 probes / 230 DETECTED);
  group 3 (CI truth) is next.

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
completion, exhaustion, or release readiness without evidence.
