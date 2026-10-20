# Active Task

Task ID: nightwatch-d181-cli-spend-enforcement-v1
Phase: D181_CLI_SPEND_ENFORCEMENT_V1
Title: D-181 CLI monetary-enforcement closure
Status: IN_PROGRESS
TASK_GROUP_LEDGER: nightwatch.task-group-ledger.v1
TASK_GROUPS_COMPLETE: 1,2,3,4,5
TASK_GROUP_NEXT: 6
TASK_NEXT_ID: 6.1
Task directory: .agent/tasks/nightwatch-d181-cli-spend-enforcement-v1
Starting SHA: 27223764d42fe23a9f407c062b2e0c4774a34f3d
Last validated implementation SHA: ff0ecc5712a0789d70a94ee152b8078704d8be8f
Current milestone: M5 — gates, integration and certification (task group 6):
the enforcement is implemented and proven end to end through the real CLI;
the full gate set, the governed integration and the checkpoint certification
remain.
Last checkpoint: 2026-10-19 — task opened at the verified HEAD `27223764` on
top of certified S6 `d78e6c55`; the defect trace is complete and confirms the
reported production gap exactly.
Next action: task 6.1 — run the full regression, hardening and mutant gates,
`npm run prepush` and `npm run gate:milestone`, then integrate through C-00
and observe exact-head CI.
Authorization class: LOCAL_SOURCE_ENFORCEMENT
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 27223764d42fe23a9f407c062b2e0c4774a34f3d
LAST_VALIDATED_IMPLEMENTATION_SHA: ff0ecc5712a0789d70a94ee152b8078704d8be8f
LAST_SUBSTANTIVE_CHECKPOINT_SHA: ff0ecc5712a0789d70a94ee152b8078704d8be8f
LIVE_HEAD_AUTHORITY: GIT
PHASE_D181_CLI_SPEND_ENFORCEMENT_V1_STATUS: IN_PROGRESS

## Mission

Close the D-181 production integration gap completely: every metered provider
campaign is bound to a validated, owner-declared monetary ceiling BEFORE any
provider call; the ceiling is wired CLI → local campaign → AgentRuntime →
admitProviderCall → provider dispatch; it survives pause/resume without
widening; fixtures are distinguished mechanically from real provider
campaigns; and a user-supplied "free" label never bypasses enforcement. The
work finishes with the governed integration, the next substantive checkpoint
and its re-earned evidence at 15/16 with condition #3 UNMET.

## Read order

1. `.agent/tasks/nightwatch-d181-cli-spend-enforcement-v1/{SPEC,PLAN,STATE}.md`
2. `AGENTS.md`, `docs/SAFETY_MODEL.md`, `docs/DECISIONS.md` (D-174..D-182)
3. `src/core/agentRuntime/spendCeiling.ts`, `bin/nightwatch-agent.mjs`
   campaign run/resume paths, `src/core/agentRuntime/localCampaign.ts`

## Routing and safety

```text
CAMPAIGN: nightwatch-d181-cli-spend-enforcement-v1
CHILD TASK: NONE
SESSION WORKTREE: session/nightwatch-d181-cli-spend-enforc-292bc10a

CURRENT STATUS:
  IN_PROGRESS — M2. The defect trace is complete and confirms the reported
  gap exactly. The enforcement implementation is authorized Nightwatch-local
  engineering work. No paid provider execution, no Pi inference, no provider
  credit consumption and no GRANTED parent-12.5 are authorized here; the
  spent parent-12.4 evidence is preserved untouched.

IMPLEMENTATION AUTHORIZED (owner instruction 2026-10-19):
  The D-181 CLI enforcement closure: validated owner-declared monetary
  ceilings on the metered campaign path, fail-closed admission before any
  provider call, CLI/local-campaign/AgentRuntime wiring, pause/resume
  ceiling preservation, mechanical fixture/provider distinction, the
  account-side hard-stop requirement where the harness cannot cap output
  tokens, real-CLI stub-provider integration tests, focused regression,
  hardening, mutants, prepush, milestone gates, governed C-00 integration,
  exact-head CI, the next substantive checkpoint and its re-earned evidence.
  NOT authorized: provider inference, spend, grant-record changes, reuse of
  parent-12.4, unexecuted manual harnesses, repository visibility changes,
  Alphaus contact, sibling-repository mutation, force push, history rewrite,
  deleting another live session's work, or fabricated evidence.

EXTERNAL CONTACT AUTHORIZED:
  GitHub Actions read/observe; validated fast-forward Nightwatch pushes.
  No provider call of any kind.

ALPHAUS DEV / NEXT / PRODUCTION CONTACT:   NOT AUTHORIZED
AUTHENTICATED ALPHAUS RUNTIME:             NOT AUTHORIZED
DATABASE / DATA-PLANE ACCESS:              NOT AUTHORIZED
CLOUD / INFRASTRUCTURE OPERATIONS:         NOT AUTHORIZED
SIBLING REPOSITORY MUTATION:               NOT AUTHORIZED
EXTERNAL PUBLICATION / ISSUE / PR:         NOT AUTHORIZED
FORCE PUSH / HISTORY REWRITE:              NOT AUTHORIZED
LOCAL READ-ONLY COMMANDS AND TESTS:        AUTHORIZED
```

Live HEAD and ownership are discovered from Git and the session status
tooling. Do not claim release completion, run paid proof or spend without the
required owner approvals and verified evidence.
