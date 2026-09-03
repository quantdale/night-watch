# EXECUTION PROMPT — C-15b System Map V2

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: IN_PROGRESS
Campaign ID: nightwatch-system-map-v2-c15b-v1
OpenSpec: openspec/changes/nightwatch-system-map-v2-c15b-v1/
Planned-From: 9ac83bebbeb9ed747ff4a55e84701c4b95a1c692
Target Branch: main
Predecessor Task ID: nightwatch-frontend-consumer-intelligence-c04-v1
Predecessor Status: COMPLETE

## Mission

Rebuild the source-graph projection model and the graph view so Nightwatch can
expose whole-system topology and evidence status at the scale its contracts
already permit, with every node and edge carrying exactly one fact category and
every projection reporting exactly what it dropped.

## Authority

Repository-local, offline, observational. The Control Center gains no execution
or mutation authority of any kind, and the existing GET/HEAD-only, 405,
`executionAuthority: NONE` and production-store-exclusion invariants are
re-proven rather than inherited. No repository admission. No EIG prioritisation.
No production observation; C-12 is NOT authorized and is NOT begun.

C-00 governs: all implementation happens in the owned session worktree
`session/nightwatch-system-map-v2-c15b-v1-19d4f1bd`.

## Ordered workstreams

1. Task record, OpenSpec change, measured baseline.
2. Contract v2: fact category, evidence status, exact projection bounds.
3. System map model over the C-02b / C-03 / C-04 facts.
4. Progressive disclosure L1-L4.
5. Deterministic layout and content-addressed layout identity.
6. The eight operator queries, each individually tested.
7. Renderer, and Control Center authority probes.
8. Hardening, gate registration, validation, integration, closure.

## Constraints

Bounded projections with exact drop counts; categorical states rather than
defaults; no evidence upgrade; `UNKNOWN` and `UNMEASURED` never zeroed; layout
identity excludes timing; no new dependency unless provably required; no
repository write while `gate:clean` evidence is running.

## Validation

typecheck, hardening, handoff, project, agent, agent audit, workspace, gate
inventory, semantic compatibility, synthetic campaign, the new C-15b suites,
the C-02b / C-03 / C-04 suites, Control Center contract, adapter, authority and
server suites, the browser suite where practical, C-10 production-store
exclusion, full canonical regression, `gate:clean`, exact-head GitHub Actions.

## Acceptance and completion gates

The twelve acceptance rows of
`.agent/tasks/nightwatch-system-map-v2-c15b-v1/SPEC.md`, each carried in the
REPORT requirement ledger with exact evidence.

## Git and reporting

Coherent checkpoints in the session worktree; integrate by verified
fast-forward; observe exact-head CI; reconcile project truth; complete
`REPORT.md`; release the session and remove the worktree and branch.
