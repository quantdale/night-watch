# Audit — D-181 CLI monetary-enforcement closure

## A. The production gap (confirmed)

- Claim: the metered campaign path runs with no monetary ceiling.
  Evidence: `bin/nightwatch-agent.mjs` passes no `spendCeiling` at either
  `runLocalCliCampaign` or `resumeLocalCliCampaign`; `admitRunSpendCeiling`
  has no production caller; `AgentRuntime` enforces the admission only when
  the optional parameter is defined.
- Disposition: FIX — closed by this change.

## B. The unenforceable output bound (recorded)

- Claim: the maximum output-token bound cannot be enforced on the real
  Pi/provider path. Evidence: `pi --help` (235 lines) exposes no max-output
  or max-token option; the request body is composed inside the harness.
- Disposition: REQUIREMENT — metered runs require the owner-declared
  account-side hard stop with its evidence reference (the mission's second
  route), recorded with the run.

## C. The "free" label bypass class (closed by construction)

- Claim: a user-supplied free/zero-rate label could bypass enforcement.
- Disposition: FIX — the metering boundary is the resolved adapter identity,
  the rate card must be a valid metered card for that class, and no label is
  consulted anywhere in the admission.
