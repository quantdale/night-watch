# Task State

## Identity

Task ID: nightwatch-d181-cli-spend-enforcement-v1
Phase: D181_CLI_SPEND_ENFORCEMENT_V1
Status: IN_PROGRESS
TASK_GROUP_LEDGER: nightwatch.task-group-ledger.v1
TASK_GROUPS_COMPLETE: 1,2,3,4,5
TASK_GROUP_NEXT: 6
TASK_NEXT_ID: 6.1
Starting SHA: 27223764d42fe23a9f407c062b2e0c4774a34f3d
Last validated implementation SHA: ff0ecc5712a0789d70a94ee152b8078704d8be8f
Last substantive checkpoint SHA: ff0ecc5712a0789d70a94ee152b8078704d8be8f
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
LAST_VALIDATED_IMPLEMENTATION_SHA: ff0ecc5712a0789d70a94ee152b8078704d8be8f
LAST_SUBSTANTIVE_CHECKPOINT_SHA: ff0ecc5712a0789d70a94ee152b8078704d8be8f
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_D181_CLI_SPEND_ENFORCEMENT_V1_STATUS: IN_PROGRESS

## Objective

Make the D-181 pre-request monetary admission genuinely enforced on the
production metered campaign path — before any provider call, across
pause/resume, and immune to any user-supplied "free" label — without touching
the grant record, executing inference, or weakening any certification rule.

## Current Milestone

M5 — gates, integration and certification (task group 6). The enforcement is
implemented and proven end to end through the real CLI: the pure admissions
(D-183), the campaign-layer metered boundary and envelope persistence, the
CLI wiring on both run and resume, and the eight-case stub-provider
integration suite.

## Completed Milestones

- **M0 COMPLETE** — defect trace: `bin/nightwatch-agent.mjs` `campaign run`
  (runLocalCliCampaign call site) and `campaign resume`
  (resumeLocalCliCampaign call site) pass no `spendCeiling`;
  `admitRunSpendCeiling` has no production caller; `AgentRuntime` enforces the
  admission only when the optional parameter is defined. The Pi harness
  exposes no max-output-token flag, so the output bound is not wire-enforceable
  and the account-side hard stop is the required backstop.
- **M1 COMPLETE** (D-183) — the pure admissions in `spendCeiling.ts`:
  identity-bound ceilings (provider/model), the metered-run admission
  (valid ceiling, genuinely metered rate card, identity agreement, account-side
  hard stop) and the resume-equality admission (absent/widened/substituted
  refused; identical or tightened accepted). 10 focused tests.
- **M2 COMPLETE** — the campaign layer: the mechanical metering boundary
  (`isMeteredProviderRoute` over the resolved adapter identity), the
  fail-closed campaign admission before any effect, the ceiling persisted in
  the progress envelope under the secret-scanner-safe projection
  (`nightwatch.spend-ceiling-envelope.v1`, declared under D-130), and the
  resume held to the persisted declaration.
- **M3 COMPLETE** — the CLI: the owner-declared ceiling flags on `campaign
  run` and `campaign resume`, fail-closed validation (missing/malformed/zero-
  rate/identity/hard-stop), the wired chain CLI → local campaign →
  AgentRuntime → admitProviderCall, and the `--expected-investigations` /
  `--observe-repository` declarations made reachable (they were referenced and
  documented but undeclared, so the strict parser refused them).
- **M4 COMPLETE** — the eight-case real-CLI stub-provider suite (missing
  ceiling, malformed/zero-rate/partial, substitution, missing hard stop,
  authorized launch, exhausted budget zero-call refusal, the full
  pause/resume widen/reset/substitute matrix, and the mechanical fixture
  distinction) plus the validation-universe/execution-class registration;
  138/138 focused regression green.

## Work In Progress

M5 gate execution: the full regression, hardening, mutants, prepush and
milestone gates, then the governed C-00 integration and the checkpoint
certification.

## Exact Next Action

Task 6.1: run the full regression, hardening and mutant gates, `npm run
prepush` and `npm run gate:milestone`, then integrate through C-00 and observe
exact-head CI.

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
