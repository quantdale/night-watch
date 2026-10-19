# Task Brief

Task ID: nightwatch-d181-cli-spend-enforcement-v1
Title: D-181 CLI monetary-enforcement closure — the metered campaign path enforces the ceiling
Authorization class: LOCAL_SOURCE_ENFORCEMENT
Status: IN_PROGRESS

## Authorization fence

```text
CAMPAIGN: nightwatch-d181-cli-spend-enforcement-v1
CHILD TASK: NONE
SESSION WORKTREE: session/nightwatch-d181-cli-spend-enforc-292bc10a
```

Nightwatch-local source enforcement work, its own validation, governed
Nightwatch-local commits and fast-forward integration, checkpoint
certification and documentation closure. NOT authorized: any paid provider
execution, any Pi inference, any provider credit consumption, creating a
GRANTED parent-12.5, reusing the spent parent-12.4, modifying the grant
record, Alphaus contact, sibling-repository mutation, force push, history
rewrite, or fabricating certification evidence.

## Problem (confirmed by trace, not assumed)

D-181's pre-request monetary admission exists
(`src/core/agentRuntime/spendCeiling.ts` + the `AgentRuntime` pre-dispatch
seam) but is DEAD CODE on the production path: `bin/nightwatch-agent.mjs`
`campaign run` and `campaign resume` never pass `spendCeiling` to
`runLocalCliCampaign` / `resumeLocalCliCampaign`, and `admitRunSpendCeiling`
is never invoked by the CLI. `AgentRuntime` enforces the admission only when
the optional parameter is defined, so a real metered provider campaign runs
with NO monetary ceiling at all.

## Required behavior

Every metered provider campaign (the real print-adapter route) fails closed
BEFORE any provider call when: no spending ceiling is supplied; the ceiling
is malformed; the rate card is missing or invalid; the model/provider
identity disagrees with the run identity; the output bound is not enforceable
(no account-side hard stop while the harness cannot cap output tokens); or
the projected worst-case spend exceeds the approval. The ceiling is wired
CLI → local campaign → AgentRuntime → admitProviderCall → provider dispatch,
and is preserved across pause/resume: a resume with an absent, widened or
identity-mismatched ceiling is refused. Genuinely non-metered fixtures
(the custom-reasoner-script route) are distinguished mechanically from real
provider campaigns; a user-supplied "free" label never bypasses enforcement.

## Non-goals

No provider call or inference of any kind; no grant application; no change to
the R6 completion contract, the certification rules, or any other session's
work; no account-side claims without evidence.
