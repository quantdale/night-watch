# EXECUTION PROMPT — Successor campaign engine v1 (umbrella)

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: COMPLETE
Campaign ID: nightwatch-successor-campaign-engine-v1
OpenSpec: openspec/changes/nightwatch-successor-campaign-engine-v1/
Planned-From: 78efcc9c4cd02498a0b4bd1d01fb5112d03a1bd1
Target Branch: main
Predecessor Task ID: nightwatch-priority-audit-remediation-sequence-v1
Predecessor Status: COMPLETE

## Mission

From the certified baseline, recover the fresh successor discovery state,
mechanically reproduce the two strongest certification/data-integrity
 candidates, select the highest-value authorized local campaign by current
impact/confidence/executability/risk, implement it completely, and continue
through evidence-led successor campaigns until a legitimate terminal condition.

## Scope

Nightwatch source, tests, hardening, schemas, synthetic fixtures, OpenSpec/task
continuity, and C-00 commits/integration from the owned session only. All
authorized executable children are complete.

## Constraints

LOCAL / OFFLINE / SYNTHETIC only. No Alphaus DEV/NEXT/production contact,
authenticated product execution, credentials, customer data, database/data-
plane/cloud access, sibling writes, external publication, force push, or history
rewrite. One writer; preserve any new canonical mutation; do not reopen the
completed priority campaign.

## Ordered workstreams

1. Owner-resolve canonical formatter churn and recover continuity — COMPLETE.
2. Revalidate six findings and reproduce shard/run-evidence integrity — COMPLETE.
3. Shard certification, census, run-evidence, proxy, credential, and temp
   isolation children — implemented/focused; their shared source-test residual
   is resolved by workstream 5.
4. Popup L0 readiness — BLOCKED after the local pre-navigation prototype failed;
   preserved for a future lower-level design authorization.
5. Live-source test hermeticity/currentness — COMPLETE.
6. Final adversarial reassessment and local certification — COMPLETE; C-00 close follows.

## Validation

Use focused tests and `npm run gate:dev` during implementation, relevant suites
and `npm run gate:milestone` at child checkpoints, and full certification only
for a justified release grouping or terminal closure. Never classify a missing,
unknown, all-skipped, or zero-executed validation result as PASS.

## Acceptance / completion gates

- Each child has a current reproduction, invariant, negative/adversarial test,
  focused validation, exact checkpoint, and honest residual decision.
- Safety counters remain zero for unauthorized effects.
- C-00 integration uses exact session/head expectations and never force-pushes.
- Final status is evidence-backed; no optimistic completion claim.
