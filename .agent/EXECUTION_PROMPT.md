# EXECUTION PROMPT — C-07 Derived Endpoint Semantics + Generated DEV Targets

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: IN_PROGRESS
Campaign ID: nightwatch-derived-semantics-dev-targets-c07-v1
OpenSpec: openspec/changes/nightwatch-derived-semantics-dev-targets-c07-v1/
Planned-From: a34064711d2682f090c4d35079a27f08a7767ea5
Target Branch: main
Predecessor Task ID: nightwatch-eig-prioritization-c16-v1
Predecessor Status: COMPLETE

## Mission

Derive the endpoint semantic registry from mechanically established evidence,
generate DEV targets that pass the UNCHANGED admission chain, and report the
funnel honestly — including if it ends at zero.

## Authority

Repository-local and offline for the derivation. Bounded DEV execution is
authorized ONLY if every one of the sixteen stated conditions holds; the sixth
— existing Nightwatch DEV admission accepts the target — currently fails, so no
DEV traffic is authorized. No credential acquisition, no auth-configuration
change, no reuse of production state. No production or NEXT contact; C-12 is
NOT authorized and is NOT begun.

C-00 governs: all implementation happens in the owned session worktree
`session/nightwatch-derived-semantics-dev-16e96515`.

## Ordered workstreams

1. Task record, OpenSpec change, measured baseline.
2. Derived semantic registry with per-entry evidence.
3. DEV target funnel with per-reason counts.
4. EIG ordering restricted to admissible targets.
5. Pre-DEV qualification; record the verdict.
6. Hardening rule and negative probes.
7. Validation, integration, exact-head CI, closure.

## Constraints

No hand-authored semantic rule. No weakened admission threshold,
classification or gate, including to reach the historical ≥ 30 figure. No
fabricated product finding. `UNKNOWN` and `AMBIGUOUS` grant nothing.
Generation is not execution. EIG orders and never widens. The DEV storage
state's contents are not read.

## Validation

typecheck, hardening, handoff, project, agent, agent audit, workspace, gate
inventory, semantic compatibility, synthetic campaign, `gate:predev`,
`dev-manifest`, `dev-preflight`, the C-06 suite, the new C-07 suite, the
canonical regression, `gate:local`, `gate:clean`, exact-head GitHub Actions.

## Acceptance and completion gates

The ten acceptance rows of
`.agent/tasks/nightwatch-derived-semantics-dev-targets-c07-v1/SPEC.md`, each
carried in the REPORT requirement ledger with exact evidence.

## Git and reporting

Coherent checkpoints in the session worktree; integrate by verified
fast-forward; observe exact-head CI; reconcile project truth; complete
`REPORT.md`; release the session and remove the worktree and branch.
