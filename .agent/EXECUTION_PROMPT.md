# EXECUTION PROMPT — C-08 Deployment-Fact Binding

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: IN_PROGRESS
Campaign ID: nightwatch-deployment-fact-binding-c08-v1
OpenSpec: openspec/changes/nightwatch-deployment-fact-binding-c08-v1/
Planned-From: 43cff07af2fe2c943ca62154ad01f185602a41d9
Target Branch: main
Predecessor Task ID: nightwatch-universe-admission-hygiene-c05-v1
Predecessor Status: COMPLETE

## Mission

Give every source operation an explicit deployment-binding classification, so
that not knowing where something runs is a recorded fact naming the missing hop
rather than an absent field.

## Authority

Repository-local, offline, observational. C-08 is INFORMATION: it grants no
request authority and alters no existing authority. No cluster, kubectl, cloud
API, credential search or secret-store read. No production, NEXT or DEV
contact; C-12 is NOT authorized and is NOT begun.

C-00 governs: all implementation happens in the owned session worktree
`session/nightwatch-deployment-fact-bindi-9d9f8b7b`.

## Ordered workstreams

1. Task record, OpenSpec change, measured evidence survey.
2. Binding model: three-hop chain, fact category, state vocabulary.
3. Build-exclusion extractor — the one real deployment-evidence source.
4. Host-matrix extractor, classified SOURCE_FACT.
5. Totality over every operation; U-1 and U-2 explicit with the blocker.
6. Evidence identity and STALE behaviour.
7. Hardening rule, negative probes, no-authority proof.
8. Validation, integration, exact-head CI, closure.

## Constraints

A `DEPLOYMENT_FACT` comes only from deployment evidence — never from service
name similarity, route-prefix similarity, a guessed hostname, historical
familiarity, a document describing an expected architecture, or committed
CLIENT configuration. A join is never stronger than its weakest input.
`UNKNOWN` is never rendered as zero. Evidence is never rebound in place; a
changed artifact yields `STALE`. Reporting a zero positive `DEPLOYMENT_FACT`
count is a PASS; manufacturing a non-zero one is a FAIL.

## Validation

typecheck, hardening, handoff, project, agent, agent audit, workspace, gate
inventory, semantic compatibility, synthetic campaign, the C-03 suites, the new
C-08 suite, the canonical regression, `gate:local`, `gate:clean`, exact-head
GitHub Actions.

## Acceptance and completion gates

The nine acceptance rows of
`.agent/tasks/nightwatch-deployment-fact-binding-c08-v1/SPEC.md`, each carried
in the REPORT requirement ledger with exact evidence.

## Git and reporting

Coherent checkpoints in the session worktree; integrate by verified
fast-forward; observe exact-head CI; reconcile project truth; complete
`REPORT.md`; release the session and remove the worktree and branch.
