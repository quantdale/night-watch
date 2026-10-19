## Why

D-181's pre-request monetary admission is enforced only when a caller supplies
the optional `spendCeiling` — and the production CLI never does. A real
metered provider campaign therefore launches and resumes with no monetary
ceiling at all: the very gap D-181 was written to close is open on the only
path that can spend money.

## What Changes

- The metered campaign route (the resolved provider print adapter) becomes
  ceiling-bound before any provider call: a validated, owner-declared
  monetary ceiling with a metered rate card, a per-call output bound and the
  run's provider/model identity is REQUIRED, and every absence, malformation,
  identity disagreement, unenforceable output bound or projected-overspend
  refuses the run before dispatch.
- The ceiling is wired through the whole chain (CLI → local campaign →
  AgentRuntime → admitProviderCall → provider dispatch) and preserved across
  pause/resume: a resume with an absent, widened or identity-mismatched
  ceiling is refused.
- Genuinely non-metered fixtures (the custom-reasoner-script route) are
  distinguished mechanically from real provider campaigns; a user-supplied
  "free" label is never consulted.
- Because the Pi harness exposes no output-token cap, metered runs require
  the account-side hard stop with its evidence reference, recorded with the
  run.

## Impact

- Affected code: `bin/nightwatch-agent.mjs`, `src/core/agentRuntime/`
  (spendCeiling, localCampaign, types), the campaign progress envelope, and
  new integration tests.
- No provider call, no spend, no grant-record change, no certification-rule
  change.
