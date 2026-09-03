# EXECUTION PROMPT — R-12 Certification Manifest + Project Truth Closure

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: COMPLETE
Campaign ID: nightwatch-certification-truth-r12-v1
OpenSpec: openspec/changes/nightwatch-certification-truth-r12-v1/
Planned-From: cdfe9d7865dbf95f1cadfde1cf8e318bcd7a11a0
Target Branch: main
Predecessor Task ID: nightwatch-system-map-v2-c15b-v1
Predecessor Status: COMPLETE

## Mission

Make the authoritative gate run every campaign certification suite, enforce
that as a totality rather than a per-campaign courtesy, and reconcile the
project-truth documents to the completion the repository actually reached.

## Authority

Repository-local, offline, observational. No repository admission, no
source-analysis change, no new campaign, no rule weakened so that a suite can
register. No production or NEXT contact; C-12 is NOT authorized and is NOT
begun.

C-00 governs: all implementation happens in the owned session worktree
`session/nightwatch-certification-truth-r-cd8904c5`.

## Ordered workstreams

1. Task record, OpenSpec change, measured baseline.
2. Register the six unregistered certification suites in their correct lane.
3. `config/campaign-certification.v1.json` as the single registration
   authority.
4. One generic totality rule; retire the four hand-written loops.
5. Master task ledger normative status: C-02b, C-03, C-04, C-11, C-15b.
6. `CURRENT_STATE` checkpoint prose reconciliation, including the malformed
   row.
7. Negative probe matrix, every probe restored.
8. Validation, integration, exact-head CI, closure, release.

## Constraints

A registration claim is never stronger than the execution that backs it.
Historical evidence stays historical. No tracked document predicts the SHA or
CI run of the commit containing it. No bulk-set checkpoint values. Every
load-bearing rule added here has at least one negative probe that bites, and
every probe is restored.

## Validation

typecheck, hardening, handoff, project, agent, agent audit, workspace, gate
inventory, semantic compatibility, synthetic campaign, the six newly
registered suites, the full canonical regression, `gate:local`, `gate:clean`,
exact-head GitHub Actions.

## Acceptance and completion gates

The eight acceptance rows of
`.agent/tasks/nightwatch-certification-truth-r12-v1/SPEC.md`, each carried in
the REPORT requirement ledger with exact evidence.

## Git and reporting

Coherent checkpoints in the session worktree; integrate by verified
fast-forward; observe exact-head CI; reconcile project truth; complete
`REPORT.md`; release the session and remove the worktree and branch.
