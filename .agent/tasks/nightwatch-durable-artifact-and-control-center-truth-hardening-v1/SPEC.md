# Durable Artifact + Control Center Truth Hardening

## Task purpose

Restore the durable evidence invariant for dossier validation and Control
Center findings. A JSON dossier must be deeply valid under its accepted v1 or
v2 schema before any authority or adapter consumes it, and a public finding
must never claim stronger source currentness than all required source-freshness
facts support.

## Established starting state

- Task ID: `nightwatch-durable-artifact-and-control-center-truth-hardening-v1`
- Starting SHA: `42ea9723c10f60cc02c663748c493c6c34f73116`
- Planned-from SHA: `49034831377f243054261361b4d1a7d783c0fc4f`
- Target branch and remote: `main` / private `origin`
- The predecessor source-proof soundness campaign is complete and remains
  immutable history.
- The owner scope is LOCAL / repository source / synthetic fixtures only.
  Infrastructure, datastore, product environments, authentication,
  publication, AI-provider execution, and sibling writes are prohibited.
- Existing artifact, source, semantic, campaign, and Control Center
  authorities remain authoritative unless this task reproduces a direct
  defect in the selected validation/currentness boundaries.

## Required outcomes

- Complete a fresh NUL-safe tracked-file audit with reviewed and classified
  counts equal to the tracked regular-file count.
- Reproduce planner dossier false accepts and optimistic currentness through
  public owning paths before production edits.
- Strictly validate accepted dossier v1/v2 nested runtime shapes, source
  candidates, cross-field invariants, prototypes, privacy, and historical
  compatibility without arbitrary graph recursion or input mutation.
- Consolidate whole-dossier source-currentness into one conservative authority
  and prove authority/adapter parity.
- Audit every registered durable artifact kind with bounded nested mutations;
  repair only clear, local, compatible false accepts.
- Prove malformed dossiers cannot create valid public finding rows and that
  Control Center remains read-only, loopback-only, privacy-safe, and
  authority-inert.
- Pass the complete local, clean Node20, continuity, project, and canonical
  regression acceptance surface; classify any exact-head zero-step Actions
  result as external non-evidence.

## Explicit non-goals

- No DEV, NEXT, production, authenticated product, cloud, data, database,
  datastore, infrastructure, deployment, or sibling-repository operation.
- No browser product journeys, source execution, network-based validation,
  AI/provider call, publication, issue/PR/release, or new Control Center
  command route.
- No new selector, promotion, replay, minimization, source-proof, or dossier
  schema authority; no dossier v3 merely to avoid validating v1/v2.
- No test deletion, skip addition, assertion weakening, cached verdict, or
  workflow churn to disguise external billing/platform failure.

## Safety constraints

All work is local/source/synthetic. Runtime JSON remains unknown until
validated. Inputs and errors remain privacy-safe and bounded; raw source,
customer values, credentials, cookies, bodies, traces, and private paths do
not enter task artifacts or committed findings. Existing owner-scope,
read-only sibling-source, private-artifact, browser, and Control Center
boundaries remain in force. Any uncertain source or schema fact fails closed.
