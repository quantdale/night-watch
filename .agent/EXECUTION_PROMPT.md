# EXECUTION PROMPT — C-15c System Map V2 HTTP Transport + Complete Operator UI

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: IN_PROGRESS
Campaign ID: nightwatch-system-map-v2-transport-c15c-v1
OpenSpec: openspec/changes/nightwatch-system-map-v2-transport-c15c-v1/
Planned-From: 0b62247c512b960715348b637ac99bf68a9f3b49
Target Branch: main
Predecessor Task ID: nightwatch-derived-semantics-dev-targets-c07-v1
Predecessor Status: COMPLETE

## Mission

Carry the System Map V2 model over HTTP and give the operator a UI that can
navigate it, without granting the map any authority it does not have and
without rendering away the boundaries of a bounded projection.

## Authority

Repository-local and offline. No production contact, no NEXT contact, no DEV
request, no credential acquisition. C-12 is NOT authorized and is NOT begun.

C-00 governs: all implementation happens in the owned session worktree
`session/nightwatch-system-map-v2-transpo-6bb0f1cf`.

## Ordered workstreams

1. Task record, OpenSpec change, routing, measured baseline — BEFORE any gate.
2. V2 contract DTOs and the level/query adapter.
3. Router segments, collector methods, server dispatch.
4. API client and the System Map operator view.
5. C-15c suite, registration in both manifests, hardening rule.
6. Browser scenario matrix and scale measurement.
7. Validation, integration, exact-head CI, closure, release.

## Constraints

GET/HEAD only. Both authority fields `NONE` on every answer. V1 is never
reinterpreted. Unknown segments are rejected, never guessed. A null total and a
null dropped count render as "unknown", never as `0`. An `UNMEASURED` empty
result is labelled unmeasured, not clean. The client fetches one level at a
time and never a whole-company payload. Existing roster guards are extended to
admit exactly the new view, not loosened.

## Validation

typecheck, hardening, handoff, project, agent, agent audit, workspace, gate
inventory, semantic compatibility, synthetic campaign, `gate:predev`, the UI
unit suite, the UI build verifier, the new C-15c suite, the browser matrix, the
canonical regression, `gate:local`, `gate:clean`, exact-head GitHub Actions.

## Acceptance and completion gates

The thirteen acceptance rows of
`.agent/tasks/nightwatch-system-map-v2-transport-c15c-v1/SPEC.md`, each carried
in the REPORT requirement ledger with exact evidence.

## Git and reporting

Coherent checkpoints in the session worktree; integrate by verified
fast-forward; observe exact-head CI with a PREDICTED skip delta; reconcile
project truth; complete `REPORT.md`; release the session and remove the
worktree and branch.
