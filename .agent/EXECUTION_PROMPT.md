# EXECUTION PROMPT — AH-1 Alphaus Finding Handoff + C-12 Operator Readiness

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: COMPLETE
Campaign ID: nightwatch-alphaus-finding-handoff-c12-readiness-v1
OpenSpec: openspec/changes/nightwatch-alphaus-finding-handoff-c12-readiness-v1/
Planned-From: 4ca990f9bead33ae5626c4ae4f21dc833f41aec2
Target Branch: main
Predecessor Task ID: nightwatch-p1-observation-scope-ma8-v1
Predecessor Status: COMPLETE

## Mission

Implement, adversarially verify, document, and certify the Alphaus-compatible
human-review finding handoff (projection-only, privacy-safe, no filing, no
scoring) and the C-12 operator-readiness package (runbook, configuration
contract, local-only preflight CLI, evidence checklist, prerequisite truth),
and reconcile durable documentation (CURRENT_STATE, DECISIONS, master plan,
threat model, OpenSpec) against implementation truth plus the owner-supplied
Slack-derived Alphaus workflow evidence (pilot-sensitive, non-canonical).
Local/synthetic certification only.

## Authority

```
IMPLEMENTATION AUTHORIZED:
  Alphaus finding handoff + C-12 readiness + docs reconciliation only

REAL PRODUCTION CONTACT:
  NOT AUTHORIZED

C-12 EXECUTION:
  NOT AUTHORIZED IN THIS CAMPAIGN

C-08b:
  NOT AUTHORIZED

C-07 DEV:
  NOT AUTHORIZED
```

Repository-local and offline. No production contact, no NEXT contact, no DEV
request, no credential acquisition. No Slack/Leslie/Pondr writes. C-12 is NOT
authorized and is NOT begun.

C-00 governs: all implementation happens in the owned session worktree
`session/nightwatch-alphaus-finding-hando-c009d87c`.

## Ordered workstreams

1. Task record, OpenSpec change, routing, design reconciliation — BEFORE code.
2. Handoff cone: types, projector, authority literals, privacy scan.
3. Readiness cone: types, evaluator, CLI, runbook, context doc.
4. Local test matrices + seeded properties; manifest + certification
   registration; AH-1 hardening check.
5. Bounded mutation campaign with zero survivors.
6. Full validation, repeatability, clean clone, second-pass review, docs
   reconciliation, REPORT, integration, release.

## Constraints

Recommendations carry basis + provenance or are UNKNOWN. `customer_escaped`
never becomes `self_found`. Production never implies outage. Team is UNKNOWN;
code owner has no representation. No bounty-scoring surface. Authority
literals are type-enforced. The triage/P1/C-11/C-10 cones are consumed, never
modified. No test deletion/skip/retry/timeout-inflation as a correctness fix.
No hardening, privacy, or provenance rule weakened.

## Validation

typecheck, hardening, handoff, project, agent, agent audit, workspace, gate
inventory, semantic compatibility, synthetic campaign, the AH-1 suites,
canonical regression, `gate:local`, `gate:clean`, single exact-head CI
inspection (no rerun loop).

## Acceptance and completion gates

The SPEC.md acceptance criteria, each carried in the REPORT requirement ledger
with exact evidence, plus `C-12 WAS NOT EXECUTED BY THIS CAMPAIGN`.

## Git and reporting

Coherent checkpoints in the session worktree; integrate by verified
fast-forward; reconcile project truth; complete `REPORT.md`; release the
session and remove the worktree and branch.
