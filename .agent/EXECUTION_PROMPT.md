# EXECUTION PROMPT — C-05 Universe Discovery + Admission Hygiene

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: COMPLETE
Campaign ID: nightwatch-universe-admission-hygiene-c05-v1
OpenSpec: openspec/changes/nightwatch-universe-admission-hygiene-c05-v1/
Planned-From: 210cd0c8732a7ea5ba5aa5b7eef146d4f001d277
Target Branch: main
Predecessor Task ID: nightwatch-certification-truth-r12-v1
Predecessor Status: COMPLETE

## Mission

Separate discovery from admission, make the owner-approved universe a single
authority, stop persisting mutable Git state as normative configuration, prove
at the read boundary that an unapproved repository is never read, and admit
exactly the two owner-named repositories.

## Authority

Repository-local, offline, observational. Sibling repositories are READ-ONLY.
C-05 MAY expand Nightwatch's own owner-approved analysis-universe configuration
for `alphauslabs/blueinternal` and `wave-api` ONLY; that is a Nightwatch change
and is not permission to modify those repositories. No third previously
unapproved repository may be admitted. No production or NEXT contact; C-12 is
NOT authorized and is NOT begun.

C-00 governs: all implementation happens in the owned session worktree
`session/nightwatch-universe-admission-hy-418aba0f`.

## Ordered workstreams

1. Task record, OpenSpec change, measured baseline.
2. One canonical owner-approved admission authority.
3. Discovery as an admission-free operation.
4. De-persist mutable Git state; live query path.
5. Instrument the sibling-source read boundary.
6. Prove `unapproved repository → analyzer source reads = 0`.
7. Admit `alphauslabs/blueinternal` root `openapiv2`; measure yield.
8. Admit `mobingilabs/wave-api` root `src`; measure yield.
9. C-01 no-eviction regression; full population report.
10. Hardening probes, validation, integration, exact-head CI, closure.

## Constraints

Discovery never implies admission — existence, naming, language, organization,
presence of OpenAPI, having routes and filesystem adjacency are each explicitly
insufficient. No new parser where an existing one applies. No unsound source
fact to raise a yield, and yield never outranks soundness. Completeness stays
truthful: `TRUNCATED` and `remainingUnknown` are not converted into clean
numbers by admitting more source. Every pre-C-05 operation identity survives.
`siblingWrites` stays 0.

## Validation

typecheck, hardening, handoff, project, agent, agent audit, workspace, gate
inventory, semantic compatibility, synthetic campaign, the C-01 / C-02a /
C-02b / C-03 / C-04 / C-06 suites, the new C-05 suites, `source-gaps` before
and after, the full canonical regression, `gate:local`, `gate:clean`,
exact-head GitHub Actions.

## Acceptance and completion gates

The ten acceptance rows of
`.agent/tasks/nightwatch-universe-admission-hygiene-c05-v1/SPEC.md`, each
carried in the REPORT requirement ledger with exact evidence.

## Git and reporting

Coherent checkpoints in the session worktree; integrate by verified
fast-forward; observe exact-head CI; reconcile project truth; complete
`REPORT.md`; release the session and remove the worktree and branch.
