# Task State

## Identity

Task ID: nightwatch-d181-cli-spend-enforcement-v1
Phase: D181_CLI_SPEND_ENFORCEMENT_V1
Status: IN_PROGRESS
TASK_GROUP_LEDGER: nightwatch.task-group-ledger.v1
TASK_GROUPS_COMPLETE: 1
TASK_GROUP_NEXT: 2
TASK_NEXT_ID: 2.1
Starting SHA: 27223764d42fe23a9f407c062b2e0c4774a34f3d
Last validated implementation SHA: 27223764d42fe23a9f407c062b2e0c4774a34f3d
Last substantive checkpoint SHA: 27223764d42fe23a9f407c062b2e0c4774a34f3d
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-d181-cli-spend-enforc-292bc10a
Last checkpoint: 2026-10-19 — the task opens at the verified HEAD
`27223764` on top of certified S6 `d78e6c55`. The defect trace is complete:
both production campaign paths (`campaign run`, `campaign resume`) omit
`spendCeiling` and `admitRunSpendCeiling` has no production caller, so the
metered route currently runs with no monetary admission at all.
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 27223764d42fe23a9f407c062b2e0c4774a34f3d
LAST_VALIDATED_IMPLEMENTATION_SHA: 27223764d42fe23a9f407c062b2e0c4774a34f3d
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 27223764d42fe23a9f407c062b2e0c4774a34f3d
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_D181_CLI_SPEND_ENFORCEMENT_V1_STATUS: IN_PROGRESS

## Objective

Make the D-181 pre-request monetary admission genuinely enforced on the
production metered campaign path — before any provider call, across
pause/resume, and immune to any user-supplied "free" label — without touching
the grant record, executing inference, or weakening any certification rule.

## Current Milestone

M2 — campaign-layer enforcement and pause/resume persistence (task group 2).
The defect is confirmed; the pure admissions are next, then the campaign
layer, the CLI wiring, the integration tests, and the certification path.

## Completed Milestones

- **M0 COMPLETE** — defect trace: `bin/nightwatch-agent.mjs` `campaign run`
  (runLocalCliCampaign call site) and `campaign resume`
  (resumeLocalCliCampaign call site) pass no `spendCeiling`;
  `admitRunSpendCeiling` has no production caller; `AgentRuntime` enforces the
  admission only when the optional parameter is defined. The Pi harness
  exposes no max-output-token flag, so the output bound is not wire-enforceable
  and the account-side hard stop is the required backstop.

## Work In Progress

M2 campaign-layer enforcement: the pure admissions first, then the metered
determination, the envelope persistence and the resume equality rule.

## Exact Next Action

Task 2.1: implement the identity-bound ceiling and the metered-run, identity
and resume-equality admissions in `src/core/agentRuntime/spendCeiling.ts`,
with focused tests.

## Files Changed

None yet (this bootstrap record only).

## Validation Ledger

At `27223764` (bootstrap): the trace evidence is recorded above; no new
validation has run yet beyond the session bootstrap checks (session:status
PASS, workspace invariants PASS).

## Decisions Made During This Task

None yet; D-183 will record the enforcement closure.

## Discoveries

- The production gap is exactly as reported: the ceiling plumbing exists
  below the CLI and has no production caller above it.
- `pi --help` exposes no max-output-token option, so a wire-enforced output
  bound is unavailable through the harness.

## Blockers

None at the governance or implementation level. The parent-12.5 provider run
itself remains owner-gated and is explicitly out of scope here.

## Safety Events

None. No provider contacted, no credit consumed, no credential touched.

## Deferred / Follow-Up

- The parent-12.5 provider run and its owner approval (external, future).

## Resume Recipe

Resume from M2: implement the pure admissions in `spendCeiling.ts`, then the
campaign-layer metered admission and envelope persistence, then the CLI
wiring and the real-CLI integration tests, then the gates and certification.

## Completion Snapshot

Not complete — the task is IN_PROGRESS at M2.
