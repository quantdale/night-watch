# Proposal: Durable Artifact + Control Center Truth Hardening

Status: PLANNED — authorized for executor pickup; implementation is not started by this planning commit.
Change ID: nightwatch-durable-artifact-and-control-center-truth-hardening-v1
Planning baseline: main at 49034831377f243054261361b4d1a7d783c0fc4f
Execution budget: approximately 12 productive engineering hours
Safety scope: LOCAL / repository source / synthetic fixtures only

## Why this change

Nightwatch's current artifact-validation facade declares itself the strict rejection boundary for malformed durable private artifacts. A deep audit of the current dossier path found that this guarantee is not fully implemented for dossier v1/v2: the validators rely on TypeScript interface assumptions for multiple nested fields that arrive from JSON at runtime.

The same audit found an operator-truth bug in Control Center findings: whole-dossier source currentness is computed with optimistic ANY-current semantics, and the rule is duplicated in both the findings authority and findings adapter.

These defects are higher value than another source-proof expansion because they sit on durable evidence and operator presentation boundaries. A false-valid artifact or falsely CURRENT finding can contaminate later reasoning even when the underlying filesystem and privacy controls are correct.

## Intended outcome

By the end of the campaign:

1. Every accepted dossier v1/v2 is deeply runtime-valid for its frozen schema and cross-field invariants.
2. Malformed nested dossier data is rejected by validateArtifact('dossier') itself, not merely cleaned up by a later projection.
3. Existing valid historical v1/v2 dossiers remain readable unless a concrete historical artifact is proven malformed.
4. Whole-dossier source currentness is conservative under mixed source freshness.
5. There is one authoritative currentness derivation, not duplicated adapter/authority logic.
6. A bounded mutation audit probes every durable artifact kind for the same typed-assumption failure pattern; reproduced false accepts in the local pure validation layer are fixed in scope.
7. Control Center remains read-only, loopback-only, privacy-safe, source-bound, and authority-inert.
8. Full local, clean-worktree, Node 20, continuity, project, and canonical regression gates pass.

## Non-goals

This change does NOT authorize:

- DEV, NEXT, production, authenticated product, cloud, data, infrastructure, or datastore contact
- Alphaus sibling-repository writes
- network calls for validation
- browser product journeys
- publication, issue creation, PR creation, or remote evidence upload
- AI/provider execution
- new campaign selector, promotion, replay, minimization, source-proof, mutability, or read-only authority
- a new dossier schema version merely to avoid validating the existing frozen versions
- deletion of historical v1/v2 support without proof that compatibility is unsafe
- UI redesign
- broad campaign-orchestrator refactoring
- Docker/L6/network-namespace work
- workflow churn to hide the known zero-step GitHub Actions billing/platform condition
- test deletion, skip addition, assertion weakening, snapshot rubber-stamping, or verdict caching

## Success signals

Primary:

- malformed nested v1/v2 dossier mutations that were previously false-accepted are deterministically rejected
- valid producer-built dossier corpora continue to validate
- mixed current/stale and current/unknown findings cannot render CURRENT
- normal Control Center authority and adapter paths agree byte-for-byte on currentness semantics
- no malformed durable artifact reaches a READY/CURRENT public finding row

Secondary:

- artifact-facade mutation coverage materially increases
- any additional shallow-validator false accepts are either repaired or explicitly recorded with a separate blocker and fail-closed consumer behavior
- no unexplained identity/currentness drift
- no new authority or external contact

## Execution handoff

The authoritative one-shot executor instructions are in .agent/EXECUTION_PROMPT.md.

Before source edits, create:

.agent/tasks/nightwatch-durable-artifact-and-control-center-truth-hardening-v1/SPEC.md
.agent/tasks/nightwatch-durable-artifact-and-control-center-truth-hardening-v1/PLAN.md
.agent/tasks/nightwatch-durable-artifact-and-control-center-truth-hardening-v1/STATE.md
.agent/tasks/nightwatch-durable-artifact-and-control-center-truth-hardening-v1/REPORT.md

Then route .agent/ACTIVE_TASK.md to the new task. Preserve the completed predecessor as immutable history.
