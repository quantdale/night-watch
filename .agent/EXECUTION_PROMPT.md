# EXECUTION PROMPT — C-16 Expected Information Gain + Orphaned Ownership Closure

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: IN_PROGRESS
Campaign ID: nightwatch-eig-prioritization-c16-v1
OpenSpec: openspec/changes/nightwatch-eig-prioritization-c16-v1/
Planned-From: 529b02a8d54a951eda1636e144a05a7442238c5b
Target Branch: main
Predecessor Task ID: nightwatch-spec-derived-expectations-c09-v1
Predecessor Status: COMPLETE

## Mission

Resolve two orphaned requirements that belong to no campaign, then implement a
bounded, deterministic, explainable LOCAL prioritisation that ranks targets and
grants nothing.

## Authority

Repository-local, offline, observational. EIG ORDERS what safety has already
admitted and may never widen it; it grants no admission, execution, replay,
credential or environment authority. No production, NEXT or DEV contact; C-12
is NOT authorized and is NOT begun.

C-00 governs: all implementation happens in the owned session worktree
`session/nightwatch-eig-prioritization-c1-20849857`.

## Ordered workstreams

1. Task record, OpenSpec change, orphan definitions established.
2. Ownership assignment and master ledger closure.
3. EIG factor model with bounded levels and safe UNKNOWN.
4. Exact integer ranking with total tie-breaking.
5. Explainability: factor breakdown and reason codes.
6. G-16 doc/ledger figure check.
7. Authority-independence proof and hardening probes.
8. Validation, integration, exact-head CI, closure.

## Constraints

No floating-point score. No wall-clock recency. `UNKNOWN` neither maximises nor
zeroes on any factor. Identical inputs yield identical rankings including tie
order. Every ranked entry carries its factor breakdown. The result is bounded
and reports its truncation. A high score grants nothing.

## Validation

typecheck, hardening, handoff, project, agent, agent audit, workspace, gate
inventory, semantic compatibility, synthetic campaign, the new C-16 suite, the
canonical regression, `gate:local`, `gate:clean`, exact-head GitHub Actions.

## Acceptance and completion gates

The eleven acceptance rows of
`.agent/tasks/nightwatch-eig-prioritization-c16-v1/SPEC.md`, each carried in
the REPORT requirement ledger with exact evidence.

## Git and reporting

Coherent checkpoints in the session worktree; integrate by verified
fast-forward; observe exact-head CI; reconcile project truth; complete
`REPORT.md`; release the session and remove the worktree and branch.
