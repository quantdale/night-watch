# Nightwatch — Private Evidence Minimization + Autonomous Triage

Status: FROZEN INTENT

## Objective

Turn a locally observed Nightwatch anomaly into one deterministic, sanitized,
owner-reviewable dossier without infrastructure access, datastore access, or
external disclosure. The active stack is source intelligence → safe journey /
exploration selection → contained DEV browser/API replay → deterministic
minimization → clustering/deduplication → browser/API differential → source
relevance → conservative fault-boundary localization → private dossier and
overnight/morning summaries.

## Scope

- A central owner policy gate that blocks infrastructure, deployment, cloud,
  datastore, external-team, and external-publication operations before any
  external command or connector can run.
- Deterministic failure-sequence minimization over only actions in the
  original source-approved safe sequence.
- Synthetic/local minimization fixtures, including dependency, order,
  precondition, cycle, non-monotonic, flaky, and budget-exhaustion cases.
- Sanitized stable anomaly clustering and bounded duplicate suppression.
- Browser/API app-layer differential evidence without datastore claims.
- Phase 3 source-change relevance and current read-only relevant-repository
  before-state capture, without deployed-cause claims.
- Conservative app-layer fault-boundary candidates and categorical confidence.
- Versioned private bug dossiers, reproduction recipes, AI-ready deterministic
  packaging, overnight summaries, morning briefs, false-positive screening,
  and owner-only local artifact storage with atomic writes.
- Privacy, owner-policy, compatibility, and regression tests for all above.

## Non-goals and absolute exclusions

- No GCP/GKE/Kubernetes, AWS infrastructure/IAM/STS, deployment archaeology,
  Secret/ConfigMap inspection, datastore query/scan/auth/metadata discovery,
  production SQL, or data-layer evidence. Phase 6 L4 is frozen by owner.
- No production, staging, or unapproved DEV target; no product mutation,
  arbitrary safe action, new exploration action, or credential persistence.
- No Slack, GitHub issue/PR, Jira, Linear, email, Drive, Notion, upload,
  coworker request, or customer-facing response generation.
- No LLM integration. A later private model may summarize or hypothesize only;
  deterministic safety and oracle decisions remain authoritative.
- No root-cause claim from source correlation, browser/API differential, or
  local source version; deployment identity remains unresolved unless already
  available from safe application/source evidence.

## Safety and privacy invariants

1. Every minimization candidate is a subsequence of the original sequence,
   uses only approved action IDs, and passes DEV/auth/proxy/safe-action,
   semantic-read/local-only, mutation, UNKNOWN, route, and privacy checks.
2. Invalid preconditions are classified `INVALID`, never as a product failure.
   Candidate replay is bounded by an explicit budget; real DEV defaults to one
   fresh exact replay plus at most four reduced candidates.
3. Anomaly identity uses sanitized stable feature classes and the exact Phase
   2C/5 fingerprint; timing noise is bounded and does not create duplicates.
4. Dossiers never contain credentials, tokens, cookies, customer/account/
   billing identifiers, names, costs, raw request/response bodies, DOM,
   screenshots, or authenticated traces.
5. A dossier is `INCOMPLETE` until all required deterministic sections pass;
   writes are atomic. `CONFIRMED` is never inferred from a partial write.
6. L4 is represented as `OUT_OF_SCOPE_BY_OWNER`; no implementation path may
   invoke a real Phase 6 adapter under the frozen owner policy.
7. Any AI-ready package is data-only and carries an explicit prohibition on
   using AI as an oracle or triggering external access.

## Versioned contracts

- Owner policy: `nightwatch.owner-scope-policy.v1`.
- Minimizer: `nightwatch.failure-minimization.private.v1`.
- Clusters: `nightwatch.anomaly-cluster.private.v1`.
- Dossier: `nightwatch.bug-dossier.private.v1`.
- Overnight summary: `nightwatch.overnight-summary.private.v1`.
- Morning brief: `nightwatch.morning-brief.private.v1`.
- Private storage: `nightwatch.private-artifact-policy.v1`.

## Acceptance criteria

- Phase 6 is durably `FROZEN_BY_OWNER`, with the infrastructure/data blocker
  superseded by owner scope and no external handoff in `NEXT_ACTION`.
- Frozen operation classes fail locally before an executor can run; Phase 6
  real-query code returns `OWNER_POLICY_BLOCKED`.
- Minimization, clustering, deduplication, browser/API differential, source
  relevance, boundary localization, confidence, dossier, recipes, summaries,
  and storage are implemented and tested with synthetic fixtures.
- Existing Phase 2C/4/5 evidence remains readable through adapters or direct
  compatible inputs; existing containment remains unchanged.
- TypeScript, focused tests, full Playwright, `agent:check`, `git diff --check`,
  privacy scans, remote audit, and Alphaus read-only integrity checks pass.

