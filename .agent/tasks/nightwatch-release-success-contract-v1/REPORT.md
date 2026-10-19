# Report — release success contract v1

## 1. Original defect and source proof

`evaluateYieldCampaignEvidence` (`src/core/agentRuntime/productRunReceipt.ts`)
requires `receipt.campaignTermination === 'COMPLETED_SUCCESSFULLY'`.
`campaignTermination` is derived only from the campaign result's
`terminationReason` via `campaignTerminationOf`. `runCampaignLoop`
(`src/core/agentRuntime/localCampaign.ts`) had six `resultOf(engine, ...)` exits:
`BUDGET_EXHAUSTED` (x2), `CANCELLED`, `PAUSED`, `SAFETY_BLOCKED`, `NO_PROGRESS`.
`COMPLETE_WITH_FINDING` / `COMPLETE_NO_FINDING` appeared ZERO times in that
module — they were per-investigation reasons only. Condition #3 was unreachable
by construction. Empirical confirmation: 33 of 33 `product-run-receipt.json` on
this host were `NO_PROGRESS`, 32 of them `VALID_PROVIDER_RUN`.

## 2. Chosen success semantics and why they are sound

A campaign is `COMPLETED_SUCCESSFULLY` only when a host-computed verdict over the
whole population holds ALL of: a finite plan was declared before the run; the plan
was exhausted; started == completed; population >= 2; at least one investigation
reached its own declared end; NO investigation anywhere stopped for a
non-completing reason (`NO_PROGRESS`, `BUDGET_EXHAUSTED`, `PAUSED`, `CANCELLED`,
`SAFETY_BLOCKED`, `REASONER_FAILURE`); the run did not end on the stagnation
guard; the derived provider class is `VALID_PROVIDER_RUN`; and >= 1 tool action
executed.

Sound because: "finished" requires a pre-declared finite plan (the loop is
otherwise open-ended and every other exit is a giving-up outcome); one
investigation is not a campaign, so a single completed case can never qualify; a
degraded provider is refused outright and is not historically forgiven; and the
verdict is pure arithmetic over counters the engine already maintains — no model
claim, no caller flag, no relabel.

## 3. Files changed

New:
- `src/core/agentRuntime/campaignCompletion.ts` — pure completion verdict.
- `src/core/agentRuntime/campaignDiagnostics.ts` — per-investigation causes.
- `tests/unit/campaignCompletionSuccess.test.ts` — 19 tests (A-J).

Modified:
- `src/core/agentRuntime/localCampaign.ts` — declared plan input + validation +
  persistence, the SUCCESS exit, the refusal exit, stagnation flag, diagnostics.
- `src/core/agentRuntime/productRunReceipt.ts` — optional `diagnostics` block.
- `bin/nightwatch-agent.mjs` — `--expected-investigations`,
  `--observe-repository`, diagnostics assembly.
- `src/core/schemaLifecycle/declarations.ts` — two IN_MEMORY family declarations.
- `config/validation-universe.v1.json`, `config/validation-execution-classes.v1.json`
  — declared the new test (universe digest regenerated, class generated).

Untouched, deliberately: `config/yield-run-authorization.v1.json`,
`artifacts/` (the failed campaign), all Pi credentials, all sibling repositories.

## 4. Deterministic test evidence

19/19 pass. A: a declared plan reaching a real end yields `COMPLETE_NO_FINDING`
and `COMPLETED_SUCCESSFULLY`. B: that receipt is `BOUND` at its checkpoint with
valid identity and 1 sibling. C/C2: `NO_PROGRESS` still fails and a population
containing one NO_PROGRESS case is refused. D: `PROVIDER_DEGRADED` still fails.
E: missing siblings still fail. F/F2: wrong digest/provider/model and an
ungranted authorization still fail. G: wrong checkpoint -> `BOUND_TO_OTHER`;
schema tampering refused; dirty tree / absent SHA refused by the evaluator.
H/H2-H5: budget exhaustion, single-investigation, stagnation and no-source-action
all refused. I/I2-I4: turn-limit and repeated-action are distinguishable and
preserved; classification is conservative. J: the REAL `probeYieldCampaignResult`
grades a genuinely completed receipt `MET`.

Regression: `localCampaign`, `productRunReceipt`, `providerAttribution`,
`campaignBudgetConservation`, `campaignStateSubtree`, `campaignSignalPause`,
`campaignEndurance`, `localCampaignByteAccounting` — all pass.

## 5. Diagnostics and sibling-scope corrections

`classifyInvestigation` reads the runtime's own persisted records, so
`NO_PROGRESS` splits into `REPEATED_ACTION` (the guard's
`NO_PROGRESS`/`NO_PROGRESS_DETECTED` record is present) versus `TURN_LIMIT`
(turnsUsed reached the cap), with `UNKNOWN` whenever neither is proven. Captured
per investigation BEFORE any checkpoint deletion, so a `NO_PROGRESS` exit no
longer destroys the distinction. Per-call provider failure classes are preserved
per investigation; launch parameters and usage are recorded.

Sibling scope: `--observe-repository` is now independent of `--repository`.
Previously both came from one flag, so omitting it made the receipt observe
nothing while the investigation silently widened to the full approved universe.
No observation is manufactured and no investigated repository is changed.

## 6. Remaining billing/security issues

- The hard monetary ceiling is NOT closed and is not claimed to be. Byte budgets
  are conserved reactively after each call and `wallTimeMs` is deliberately not
  conserved, so one call can overshoot; there is still no pre-request
  affordability admission and no monetary field.
- The old OpenDesign key remains on disk under the `amr` provider entry and in
  `auth.json.bak`; revocation is still not evidenced account-side.

## 7. Whether a fresh provider run is technically ready

Technically ready in SOURCE terms: the campaign lane can now produce a
`COMPLETED_SUCCESSFULLY` receipt and the sibling scope can be satisfied by an
approved repository. NOT ready in AUTHORIZATION terms: no provider run is
authorized here, `parent-12.4` is spent and must not be reused, and the monetary
ceiling gap is open.

## 8. Exact owner approvals still required

1. Approve this source remediation as a NEW SUBSTANTIVE CHECKPOINT (S6) and
   authorize its governed integration plus exact-head CI.
2. Authorize one fresh bounded provider run under a NEW grant id (`parent-12.5`),
   never `parent-12.4`.
3. Supply one genuine enforced monetary ceiling at or below the approved amount
   (account-side per-key spend limit or a control-plane credential).
4. Confirm old-key revocation in writing and delete the stale `amr` entry and
   `auth.json.bak`.
5. The topology blocker recorded earlier is RESOLVED (2026-10-19) through the
   D-180 owner-approved `retarget-task` recovery: this session's claim now
   names `nightwatch-release-success-contract-v1`, the duplicate-claim failure
   is gone, and the long-lived predecessor session
   `nightwatch-final-product-complet-ded25ab6` (task
   `nightwatch-final-product-completion-v1`) keeps its live claim and S5
   measurement-root worktree untouched by owner decision. Releasing or
   removing that predecessor claim remains an OWNER/ADMIN topology action.
