# EXECUTION PROMPT — Final product completion (terminal campaign)

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: IN_PROGRESS
Campaign ID: nightwatch-final-product-completion-v1
OpenSpec: openspec/changes/nightwatch-final-product-completion-v1/
Planned-From: 1f786a4e1b7e4967d06c930946f1107e32931e8a
Target Branch: main
Predecessor Task ID: nightwatch-successor-campaign-engine-v1
Predecessor Status: COMPLETE

## Mission

One high-impact campaign: the terminal product-completion programme from
`openspec/changes/nightwatch-final-product-completion-v1/`. Make an honest
`PROJECT_COMPLETE_AND_CI_CERTIFIED` verdict reachable and stable — every
census item dispositioned (OD-1), the certification spine checkpoint-neutral
and CI-green at the final substantive checkpoint S (OD-2), truthful
autonomous-hunt results persisted and surfaced, operator-truth surfaces
reconciled, the ledger closed, and a `main`-only clean terminal topology.

## Scope

Nightwatch source, tests, hardening rules/probes, schemas/configuration,
synthetic fixtures, OpenSpec/task continuity records, local bounded child
processes, and C-00 commits/fast-forward integration from the owned session
only. Item scope is frozen by the change's `tasks.md` (phases 1-15),
`design.md` (D1-D14), and `audit.md` (228 items with tiers and dispositions).

## Ordered workstreams

1. M0 owner pre-flight on canonical (A-04/A-06 fixes, drift record) — COMPLETE.
2. M1 session bootstrap: one owned C-00 worktree; the planning change and
   task continuity land together in the bootstrap checkpoint.
3. M2 certification anchors and ratchets (checkpoint-neutral bindings,
   `LIVE_TASK_STATUS` derivation, disposition-token ledger, ceiling ratchet).
4. M3 CI-green deterministic hermetic spine (guarded live-source tests, honest
   skip identity, sibling-hermetic `gate:clean`, pinned CI, HANDOFF_TRUTH
   classification) — the spine is done only when CI is green.
5. M4 release-certification machinery (wire G12/G14/G17/G18/G19/G20/G21,
   demotion semantics, schema DECIDED state, CI block-record wiring).
6. M5-M7 T1 operator-truth chains: autonomous hunt result integrity; finding
   truth surfaces and Control Center data; narrowed over-claims.
7. M8 T2 contained-DEV lane integrity with the DEV-lane precondition registry.
8. M9 D-129 debt: 76/76 CLI contract and bin type-check BLOCKING 0 exemptions.
9. M10-M13 residual dispositions, DECISIONS/SAFETY_MODEL/ARCHITECTURE truth,
   operator proofs (OD-3), adversarial completion audit, ledger closure.
10. M14 close-out: full authoritative set at S, `integrate --expect-head S`,
    CI `EXECUTED_PASS` observed at S and ingested, documentary receipt commit,
    this change archived last, terminal topology proof, 13-section report.

## Constraints

LOCAL / OFFLINE / SYNTHETIC only. External contact is exactly OD-3: GitHub
Actions read/observe, C-00 fast-forward pushes, one bounded paid provider
proof run, one npm registry advisory query. No Alphaus DEV/NEXT/production
contact, authenticated Alphaus runtime, credentials, customer data,
database/data-plane/cloud access, sibling writes, external publication, force
push, or history rewrite. One writing agent under C-00; Alphaus sibling
repositories read-only; real findings stay in the owner-only local store.

## Validation

Focused suites and `npm run gate:dev` during implementation; relevant suites
plus `npm run gate:milestone` at each milestone commit; `npm run gate:local`
for groupings; the full authoritative set only at S. Continuity/session truth:
`npm run session:check`, `npm run agent:check`, `npm run project:check`,
`npm run workspace:check`, `npm run handoff:check`. Never classify a missing,
unknown, all-skipped, or zero-executed validation result as PASS.

## Acceptance / completion gates

- Every audit census item carries exactly one recorded disposition (OD-1).
- All 16 release conditions MET under D-129 with exact-head CI
  `EXECUTED_PASS` at S; bin type-check BLOCKING 0 exemptions; 76/76 entry
  points on the shared CLI contract (OD-2).
- Operator proofs recorded: deterministic synthetic hunt, the bounded paid
  proof run or `PROVIDER_BLOCKED_BEFORE_SOURCE_ACTION`, clean-clone install.
- Safety counters zero for unauthorized effects; no optimistic completion claim.

## Git / reporting requirements

C-00 single session; fast-forward integration only; the final substantive
commit S is pushed alone via `integrate --expect-head S`; never force-push,
rebase, or amend another agent's commits. Milestone state is recorded in
`STATE.md` before each milestone commit; durable anchors name SHAs known
before the recording commit. Final deliverable: the 13-section completion
report with the terminal verdict, safety counters, external prerequisites,
and final operator commands.
