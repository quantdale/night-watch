# Plan — D-181 CLI monetary-enforcement closure

## Purpose

Close the production integration gap where the metered campaign launch and
resume paths run without any monetary ceiling, so the D-181 pre-request
admission is genuinely enforced on the real provider route.

## Starting State

Base `27223764` (verified `origin/main`, certified S6 `d78e6c55`). The pure
admission and the `AgentRuntime` seam exist and are mutation-detected, but the
CLI never supplies the ceiling and never calls `admitRunSpendCeiling`; the
pause/resume envelope carries no spend state.

## Scope

`bin/nightwatch-agent.mjs` (campaign run/resume), `src/core/agentRuntime/`
(spendCeiling, localCampaign, types), the campaign progress envelope, new
integration tests launching the real CLI with a stub provider, registry
updates, and the governed integration/checkpoint/certification path.

## Non-Goals

No provider inference; no grant record change; no change to the R6 completion
contract or the certification rules; no account-side claims without evidence.

## Safety Constraints

Fail closed before any provider call; a user label never bypasses enforcement;
the metered/non-metered distinction is mechanical (the resolved adapter
identity); resume never widens or resets a ceiling; no secret, credential or
customer value in any record; no spend.

## Architecture / Approach

- `spendCeiling.ts` grows the validated authorization identity (provider,
  model) and the pure admissions: metered-run admission, identity agreement,
  and resume equality (absent/widened/mismatched all refused).
- `localCampaign.ts` derives the campaign kind mechanically (the resolved
  adapter identity), enforces the metered requirements before the first
  investigation, and persists the ceiling in the campaign progress envelope
  so a resume is held to the original declaration.
- `bin/nightwatch-agent.mjs` declares the owner's ceiling on `campaign run` /
  `campaign resume` via explicit flags, fails closed on every required
  condition, and wires the validated ceiling into both campaign entry points.
- Since the Pi harness exposes no output-token cap, metered runs require the
  account-side hard stop with its evidence reference (the mission's second
  route), recorded with the run.

## Milestones

### M0 — defect trace
- [x] Trace the production run/resume paths and confirm the exact defect.
- **Status:** COMPLETE

### M1 — the pure admissions (spendCeiling.ts)
- [x] Identity-bound ceiling (provider/model) and the validated declaration.
- [x] Metered-run admission, identity agreement and resume-equality admissions.
- **Status:** COMPLETE

### M2 — campaign-layer enforcement and pause/resume persistence
- [x] Mechanical metered determination and fail-closed campaign admission.
- [x] The ceiling persisted in the progress envelope; resume held to it.
- **Status:** COMPLETE

### M3 — CLI enforcement and wiring
- [x] Owner-declared ceiling flags on run/resume with fail-closed validation.
- [x] The wired chain CLI → local campaign → AgentRuntime → admitProviderCall.
- **Status:** COMPLETE

### M4 — integration tests and registries
- [x] Real-CLI stub-provider tests for every required case (item 10).
- [x] Validation-universe/execution-class registration; focused regression.
- **Status:** COMPLETE

### M5 — gates, integration and certification
- [x] Full gates, governed C-00 integration, exact-head CI (run 39312575211 green at S7).
- [x] The next substantive checkpoint and re-earned evidence at it (S7, 15/16).

- **Status:** COMPLETE

## Validation Strategy

Focused suites during implementation; `npm run prepush` before integrate;
`npm run gate:milestone` at milestone commits; the full authoritative
certification set only at the checkpoint. Continuity truth via
session/agent/project/workspace/handoff checks. Never classify a missing,
unknown, all-skipped or zero-executed result as PASS.

## Decision Log

- D-183 (to record): the D-181 CLI enforcement closure — metered runs are
  ceiling-bound before dispatch, resume-held, and identity-bound.

## Discoveries

- The defect is real and exactly as reported: neither campaign entry point
  passes the ceiling and `admitRunSpendCeiling` has no production caller.
- The Pi harness exposes no max-output-token flag (`pi --help`), so the
  output bound cannot be enforced on the wire; the account-side hard stop is
  the required backstop.

## Deferred Work

- The parent-12.5 provider run itself (owner-gated; never executed here).

## Completion Criteria

The metered campaign path refuses every unauthorized configuration before any
provider call; the ceiling survives pause/resume without widening; fixtures
are mechanically distinguished; the full test and gate set passes; the work
is integrated through C-00 with green exact-head CI; and the checkpoint-bound
evidence is re-earned at 15/16 with condition #3 UNMET.

