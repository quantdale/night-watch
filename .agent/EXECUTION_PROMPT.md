# EXECUTION PROMPT — MA-8 / F-13 P1 Observation-Scope Prerequisite

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: IN_PROGRESS
Campaign ID: nightwatch-p1-observation-scope-ma8-v1
OpenSpec: openspec/changes/nightwatch-p1-observation-scope-ma8-v1/
Planned-From: 0195a39e60e82b80439ec10ad5a36453804fe030
Target Branch: main
Predecessor Task ID: nightwatch-overnight-reliability-r13-v1
Predecessor Status: COMPLETE

## Mission

Implement, integrate, adversarially verify, document, and certify the missing
P1-specific observation-scope admission architecture (MA-8 / F-13, canonical
E-16): a versioned named P1 chain admitting only an operator-provided
already-existing subject inside a bounded window, a mechanical four-class
attribution model with UNKNOWN failing closed, a machine-enforced passive
capability cone, and terminal classification that makes vacuous PASS
impossible. Local/mock certification only.

## Authority

```
IMPLEMENTATION AUTHORIZED:
  MA-8 / F-13 P1 observation-scope prerequisite only

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
request, no credential acquisition. C-12 is NOT authorized and is NOT begun.

C-00 governs: all implementation happens in the owned session worktree
`session/nightwatch-p1-observation-scope--3bd1d83d`.

## Ordered workstreams

1. Task record, OpenSpec change, routing, design reconciliation — BEFORE code.
2. P1 cone: types, authorization, scope config, kill switch, admission
   evaluator, attribution, session.
3. Local test matrix: admission, config, attribution/lifecycle, privacy,
   passive capability, seeded properties, mock-subject integration.
4. Manifest + certification registration; P1 hardening check.
5. Bounded mutation campaign with zero survivors.
6. Full validation, repeatability, clean clone, second-pass review, docs,
   REPORT, integration, release.

## Constraints

P1 admits exactly one stage and one class (`P1` / `P1_OBSERVE`); no P1→P2
path exists in the cone. The C-11/C-10/C-10.5 cones are consumed, never
modified. Unknown attribution fails closed. Zero samples never pass. Every
gate individually falsifiable. No test deletion/skip/retry/timeout-inflation
as a correctness fix. No hardening, privacy, or provenance rule weakened.

## Validation

typecheck, hardening, handoff, project, agent, agent audit, workspace, gate
inventory, semantic compatibility, synthetic campaign, the seven P1 suites,
canonical regression, `gate:local`, `gate:clean`, single exact-head CI
inspection (no rerun loop).

## Acceptance and completion gates

The SPEC.md acceptance criteria, each carried in the REPORT requirement ledger
with exact evidence, plus `C-12 WAS NOT EXECUTED BY THIS CAMPAIGN`.

## Git and reporting

Coherent checkpoints in the session worktree; integrate by verified
fast-forward; reconcile project truth; complete `REPORT.md`; release the
session and remove the worktree and branch.
