# Plan

## M0 — establish the defect and the governance frame
- [x] Confirm the unreachable-success defect against source (`runCampaignLoop`
      exits vs `campaignTerminationOf` vs the evaluator requirement).
- [x] Record the population evidence (33/33 receipts `NO_PROGRESS`).
- [x] Create a distinct task identity so the remediation is not conflated with
      the completion campaign's own long-lived session.

## M1 — implement the campaign-level success path (R6-01)
- [x] `campaignCompletion.ts`: pure, fail-closed completion verdict.
- [x] `localCampaign.ts`: declared plan input, plan persistence in the progress
      envelope, the SUCCESS exit, the refusal exit, and the stagnation flag.
- [x] `bin/nightwatch-agent.mjs`: `--expected-investigations` with validation.

## M2 — preserve diagnostics (R6-02)
- [x] `campaignDiagnostics.ts`: per-investigation termination cause
      (TURN_LIMIT vs REPEATED_ACTION vs others), provider error classes, turns
      used vs cap.
- [x] Capture per investigation before any checkpoint deletion; expose on the
      result; persist through the receipt `diagnostics` block.
- [x] Record the launch parameters and usage accounting.

## M3 — separate the sibling-observation scope (R6-03)
- [x] `--observe-repository` independent of `--repository`; observations and
      investigation scope are no longer the same derived value.

## M4 — deterministic proof (A-I) and integration proof (J)
- [x] 21 tests in `tests/unit/campaignCompletionSuccess.test.ts`.
- [x] Negative controls retained: NO_PROGRESS, PROVIDER_DEGRADED, missing
      siblings, wrong identity, wrong checkpoint, tampering, budget exhaustion.
- [x] The REAL G12 probe grades a genuinely completed receipt MET.

## M4b — resume-path defect found during staged validation (R6-04)
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

## M5 — gates
- [x] `typecheck`, `typecheck:bin`
- [x] `hardening:check`, `hardening:rules` (274/274)
- [x] `hardening:mutants` (122/122 detected, 0 survived)
- [x] `prepush` / `gate:milestone` up to `agent-check`
- [ ] `agent-check` — BLOCKED by a duplicate live task claim this session cannot
      resolve (see STATE Blockers). Every other milestone/prepush step exits 0.
- [ ] Integration and exact-head CI (owner-gated; reported, not claimed)

## Outcome

The defect is closed and the certification requirements are unchanged. No
provider run is authorized or performed by this task.
