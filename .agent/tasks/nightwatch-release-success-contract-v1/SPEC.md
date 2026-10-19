# Task Brief

Task ID: nightwatch-release-success-contract-v1
Title: Release success contract v1 — make campaign-level successful completion reachable
Authorization class: LOCAL_SOURCE_REMEDIATION
Status: IN_PROGRESS

## Authorization fence

```text
CAMPAIGN: nightwatch-release-success-contract-v1
CHILD TASK: NONE
SESSION WORKTREE: NONE
```

Local source remediation inside this repository, then its own validation and a
governed Nightwatch-local commit. NOT authorized: inference or paid provider
execution of any kind, OpenDesign/spend, a new GRANTED provider authorization,
starting a real campaign, reusing `parent-12.4`, rewriting the failed campaign's
evidence, Pi credential changes, GitHub visibility changes, campaign archive,
Alphaus DEV/NEXT/production contact, sibling-repository mutation, force push or
history rewrite.

## Problem (established by the forensic audit, not assumed)

`evaluateYieldCampaignEvidence` requires a receipt whose `campaignTermination` is
`COMPLETED_SUCCESSFULLY`. That value is derived from the campaign result's
`terminationReason`. `runCampaignLoop` had six exits and every one was a failure
class (`BUDGET_EXHAUSTED`, `CANCELLED`, `PAUSED`, `SAFETY_BLOCKED`,
`NO_PROGRESS`). `COMPLETE_WITH_FINDING` / `COMPLETE_NO_FINDING` existed only as
per-investigation reasons. Condition #3 was therefore unreachable from the
campaign lane by construction: 33/33 receipts on this host were `NO_PROGRESS`,
32 of them with a perfectly healthy provider.

## Decision (chosen success semantics, R6-01)

A campaign is `COMPLETED_SUCCESSFULLY` only when a HOST-COMPUTED verdict over its
whole investigation population holds every one of these:
the campaign declared a finite plan (`expectedInvestigations`) before it ran; the
plan was exhausted (`started >= plan`); `started == completed`;
the population is at least `MIN_CAMPAIGN_INVESTIGATIONS` (2);
at least one investigation reached its own declared end;
no investigation anywhere in the campaign stopped for a non-completing reason;
the run did not end on the stagnation guard; the derived provider class is
`VALID_PROVIDER_RUN`; and at least one tool action executed.

Rationale: "finished" needs a finite, pre-declared plan; a single investigation
is not a campaign; every failure class stays strictly distinct because any one
of them in the population refuses completion; and a degraded provider can never
qualify, even if every investigation nominally completed.

## Scope

In scope: `src/core/agentRuntime/campaignCompletion.ts` (new),
`campaignDiagnostics.ts` (new), `localCampaign.ts`, `productRunReceipt.ts`,
`bin/nightwatch-agent.mjs`, `src/core/schemaLifecycle/declarations.ts`, and the
declared test/config surfaces.
Out of scope: everything listed in the authorization fence.

## Declared Deletions

None.
