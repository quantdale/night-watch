# Plan — release success contract v1

## Purpose

Close the structural mismatch between the campaign runner and its
release-success evaluator (R6) so a qualifying provider campaign is genuinely
reachable, without weakening any certification requirement, and complete the
governed engineering path around it (C-00 claim recovery, integration, S6
certification, provider readiness).

## Starting State

Base `ac0cc600` (verified `origin/main`). `runCampaignLoop` had six exits and
every one was a failure class; `COMPLETE_WITH_FINDING`/`COMPLETE_NO_FINDING`
existed only as per-investigation reasons, so the evaluator's
`COMPLETED_SUCCESSFULLY` requirement was unreachable by construction (33/33
receipts `NO_PROGRESS`, 32 with a healthy provider). The session worktree was
additionally deadlocked by a mistaken live task claim
(`WORKSPACE_DUPLICATE_TASK_CLAIM` / `SESSION_CONTINUITY_MISMATCH`).

## Scope

Nightwatch-local source, tests, hardening rules/probes, the C-00 session CLI
and its pure admission core, task continuity records, and governed
Nightwatch-local commits/integration. Provider execution is out of scope here.

## Non-Goals

- No paid provider campaign, no spend, no new grant record.
- No weakening of the release-success evaluator or any certification rule.
- No change to another session's claim, record, worktree or history.
- No repository visibility change, no campaign archive, no Alphaus contact.

## Safety Constraints

Fail closed everywhere: completion is never relabelled from a non-completing
termination; provider failures are never forgiven; the recovery operation is
owner-gated, expectation-bound and preserves every other record field; no
secret, credential or customer value enters source, records or artifacts.

## Architecture / Approach

- `campaignCompletion.ts`: a pure, host-computed completion verdict over the
  whole investigation population (declared finite plan, plan exhausted,
  started == completed, population >= 2, >= 1 investigation reaching its own
  declared end, zero non-completing terminations anywhere, no stagnation exit,
  `VALID_PROVIDER_RUN`, >= 1 tool action).
- `campaignDiagnostics.ts`: per-investigation causes preserved before
  checkpoint deletion and persisted through the receipt diagnostics block.
- `localCampaign.ts`: declared plan input and persistence, the SUCCESS and
  refusal exits, the stagnation flag, the R6-04 PAUSED-placeholder retirement
  with sticky suspended-provider-failure protection, and the
  `--observe-repository` scope split.
- C-00: the `retarget-task` recovery (pure admission in
  `bin/lib/session-authority.mjs`, effects in `bin/nightwatch-session.mjs`),
  transition-locked and revision-checked like every other record transition.

## Milestones

### M0 — establish the defect and the governance frame
- [x] Confirm the unreachable-success defect against source (`runCampaignLoop`
      exits vs `campaignTerminationOf` vs the evaluator requirement).
- [x] Record the population evidence (33/33 receipts `NO_PROGRESS`).
- [x] Create a distinct task identity so the remediation is not conflated with
      the completion campaign's own long-lived session.

### M1 — implement the campaign-level success path (R6-01)
- [x] `campaignCompletion.ts`: pure, fail-closed completion verdict.
- [x] `localCampaign.ts`: declared plan input, plan persistence in the progress
      envelope, the SUCCESS exit, the refusal exit, and the stagnation flag.
- [x] `bin/nightwatch-agent.mjs`: `--expected-investigations` with validation.

### M2 — preserve diagnostics (R6-02)
- [x] `campaignDiagnostics.ts`: per-investigation termination cause
      (TURN_LIMIT vs REPEATED_ACTION vs others), provider error classes, turns
      used vs cap.
- [x] Capture per investigation before any checkpoint deletion; expose on the
      result; persist through the receipt `diagnostics` block.
- [x] Record the launch parameters and usage accounting.

### M3 — separate the sibling-observation scope (R6-03)
- [x] `--observe-repository` independent of `--repository`; observations and
      investigation scope are no longer the same derived value.

### M4 — deterministic proof (A-I) and integration proof (J)
- [x] 21 tests in `tests/unit/campaignCompletionSuccess.test.ts`.
- [x] Negative controls retained: NO_PROGRESS, PROVIDER_DEGRADED, missing
      siblings, wrong identity, wrong checkpoint, tampering, budget exhaustion.
- [x] The REAL G12 probe grades a genuinely completed receipt MET.

### M4b — resume-path defect found during staged validation (R6-04)
- [x] Reproduced: a campaign that paused mid-investigation then resumed could
      NEVER complete, because `absorbPausedInvestigationPrefix` counted `PAUSED`
      for the slot and `absorbInvestigation` added the finished reason without
      retiring that placeholder. Repeated resumes inflate it further.
- [x] Fixed: retire one `PAUSED` placeholder when a resumed slot finishes, and
      add a sticky `suspendedProviderFailure` flag so a provider failure that
      occurred before the suspension is not erased by the retirement.
- [x] Updated two pre-existing tests that had pinned the phantom count
      (`campaignEndurance`, `localCampaign`); both asserted 6 terminations for 5
      investigations. Added an explicit population-reconciliation invariant.

### M4c — the C-00 claim recovery (D-180)
- [x] Implement the owner-approved `retarget-task` recovery with its pure
      admission core, exact expectations, revision-checked atomic publication
      and sanitized audit line.
- [x] Prove it with the NW-AUD-006 matrix (positive + negative) and keep the
      hardening probe/mutant censuses fully detected.
- [x] Correct this session's mistaken claim to this task through the governed
      operation; preserve the predecessor's record and worktree untouched.

### M4e — the pre-request monetary admission (D-181)
- [x] `spendCeiling.ts`: the pure `nightwatch.spend-ceiling.v1` admission over
      a declared ceiling, rate card and conservative worst-case bounds.
- [x] The `AgentRuntime` pre-dispatch seam: a request whose cumulative
      worst-case spend could exceed the ceiling is refused WITHOUT reaching the
      provider (cause record + `BUDGET_EXHAUSTED`, never a relabel).
- [x] Campaign plumbing and the fail-closed run admission for metered runs.
- [x] `tests/unit/spendCeiling.test.ts` (7 tests) incl. the provider-never-
      invoked proof; correct the two stale R6-04 phantom-PAUSED pins the
      original repair missed.

### M5 — gates and governed integration
- [x] `typecheck`, `typecheck:bin`
- [x] `hardening:check`, `hardening:rules` (274/274)
- [x] `hardening:mutants` (122/122 detected, 0 survived)
- [x] `agent-check` / `workspace:check` after the D-180 recovery
- [ ] `prepush` / `gate:milestone` at the corrected-continuity tip
- [ ] Governed C-00 fast-forward integration and exact-head CI observation
- [ ] S6 substantive-checkpoint certification choreography and evidence
      re-earning (15/16 effective MET expected; condition #3 stays UNMET)
- [ ] Parent-12.5 provider readiness package (prepared, never executed here)

## Validation Strategy

Focused suites during implementation; `npm run prepush` (hardening:check,
agent:check, project:check, typecheck, typecheck:bin, affected suites) before
every integrate; the milestone quality gate at milestone commits; the full
authoritative certification set only at the substantive checkpoint. Continuity
truth: `session:check`, `agent:check`, `project:check`, `workspace:check`,
`handoff:check`. Never classify a missing, unknown, all-skipped or
zero-executed validation result as PASS.

## Decision Log

- D-180: the owner-approved `retarget-task` recovery and its single authorized
  use (this session's misassigned claim).
- Completion semantics and their rationale: `REPORT.md` §2.

## Discoveries

- The success contract was unreachable by construction (six failure-class
  exits), not merely unlikely — see `REPORT.md` §1.
- A resumed campaign was structurally unable to qualify until the PAUSED
  placeholder was retired (R6-04).
- C-00 needed one narrow, expectation-bound correction operation for a
  misassigned live claim; nothing else in the lifecycle may change a record's
  task.

## Deferred Work

- The paid provider proof itself (parent-12.5) and its monetary ceiling —
  owner-gated; prepared but never executed here.
- Account-side credential revocation confirmation and stale local credential
  copy removal — owner machine actions, reported not performed.

## Completion Criteria

The defect is closed and the certification requirements are unchanged; the
governed engineering path (recovery, gates, integration, exact-head CI, S6
evidence re-earning, provider-readiness package) is complete; no provider run
is authorized or performed by this task without the fresh owner approval.
