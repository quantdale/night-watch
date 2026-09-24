# Active Task

Task ID: nightwatch-successor-campaign-engine-v1
Phase: SUCCESSOR_CAMPAIGN_ENGINE_V1
Title: Fresh successor campaign engine and reassessment
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-successor-campaign-engine-v1
Starting SHA: 78efcc9c4cd02498a0b4bd1d01fb5112d03a1bd1
Last validated implementation SHA: 78efcc9c4cd02498a0b4bd1d01fb5112d03a1bd1
Last checkpoint: 2026-09-24 — owner-resolved canonical blocker; fresh C-00 session resumed; A/B integrity reproduction is next.
Current milestone: M2 — select and execute shard certification integrity.
Next action: Create and strict-validate the dedicated shard-certification child task/OpenSpec, then implement the fail-closed machine-readable execution receipt.

Authorization class: SUCCESSOR_CAMPAIGN_ENGINE_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 78efcc9c4cd02498a0b4bd1d01fb5112d03a1bd1
LAST_VALIDATED_IMPLEMENTATION_SHA: 78efcc9c4cd02498a0b4bd1d01fb5112d03a1bd1
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 78efcc9c4cd02498a0b4bd1d01fb5112d03a1bd1
LIVE_HEAD_AUTHORITY: GIT
PHASE_SUCCESSOR_CAMPAIGN_ENGINE_V1_STATUS: IN_PROGRESS

## Mission

Reassess the certified baseline from current repository evidence, rank the
remaining authorized local work by impact, confidence, executability, and risk,
then execute the strongest coherent successor campaign. Reassess and repeat
while useful authorized work remains. Preserve the completed priority campaign
as historical truth; do not reopen it.

## Read order

1. `.agent/tasks/nightwatch-successor-campaign-engine-v1/{SPEC,PLAN,STATE}.md`
2. `AGENTS.md`, `docs/CURRENT_STATE.md`, `docs/SAFETY_MODEL.md`, and
   `docs/DECISIONS.md`
3. Current audit/OpenSpec ledgers and cited live source
4. The selected campaign's dedicated artifacts, when a safe selection is made

## Routing and safety

```
CAMPAIGN: nightwatch-successor-campaign-engine-v1
CHILD TASK: nightwatch-shard-certification-integrity-v1
SESSION WORKTREE: session/nightwatch-successor-campaign-en-628d8bb9

IMPLEMENTATION AUTHORIZED:
  Nightwatch source, tests, hardening rules/probes, schemas/configuration,
  synthetic Git/browser/network fixtures, synthetic private-data markers,
  local bounded child processes, OpenSpec/task continuity records,
  C-00 commits and fast-forward integration from this session only.

CURRENT STATUS:
  IN_PROGRESS — canonical is clean and workspace status passes; A/B
  reproduction selected shard certification integrity as the first campaign.

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
