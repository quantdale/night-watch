# Nightwatch Reliability, Yield, and State Protocol Campaign

## Task ID

`nightwatch-reliability-yield-and-state-protocol-v1`

## Phase

`RELIABILITY_YIELD_AND_STATE_PROTOCOL_V1`

## Objective

Attack the remaining post-acceptance weaknesses without reopening completed
acceptance or reproducibility campaigns: explain intermittent Phase 2C strict
replay divergence; improve useful bug yield through selection and diversity
over the existing mechanically proven source coverage; replace brittle
task-name-based project-verdict authorization with explicit semantic metadata;
and harden replay, state, auth, observability, clustering, cache/property,
chaos, and performance behavior through deterministic regressions.

## Scope

- Local/source/synthetic investigation and implementation in Nightwatch.
- Bounded, serial, owner-authenticated DEV read-only observations through the
  existing guarded launchers when external state is valid.
- Replay identity/canonicalization, observation settlement, divergence
  classification, campaign scheduling, diversity, yield attribution, finding
  clustering, continuity, project-state truth, persisted checkpoints, auth
  classification, diagnostics, cache/property quality, and measured hot paths.
- Sanitized defect ledger and owner-local evidence references only.

## Non-goals and prohibitions

- Do not contact production or NEXT, mutate DEV, query data stores, inspect
  infrastructure/deployment, modify Alphaus repositories, publish findings,
  create external issues, bypass authentication, capture secrets, or weaken
  containment or strict replay.
- Do not invent a source proof family, semantic expectation, route, runtime
  binding, or promotion authority from naming, comments, retries, or opaque
  scoring. Preserve `NO_SAFE_NEW_FAMILY` when source evidence remains below
  the admission bar.
- Do not rewrite completed historical task records in bulk or reopen their
  earned verdicts.

## Existing verdict and authorization

The project-level verdict remains `OPERATIONALLY_ACCEPTED` unless this
campaign produces evidence that truthfully invalidates it. This task begins
with `PROJECT_VERDICT_EFFECT: PRESERVE` for post-acceptance hardening; any
requalification or supersession semantics must be represented explicitly and
fail closed.

## Required outcomes

1. A repeatable classification of every observed Phase 2C divergence, with
   Nightwatch defects fixed when owned and no unexplained retry promoted to
   PASS.
2. Metamorphic replay identity coverage and stable sanitized finding clusters.
3. A deterministic, explainable, diversity-aware scheduling/yield result that
   improves use of existing proof coverage or truthfully shows no uplift.
4. Explicit project-verdict effects and structured continuity/documentation
   validation independent of task names and incidental prose.
5. Bounded interruption, resume, auth-expiry, diagnostics, cache/property,
   performance, false-positive, and product-anomaly regressions.
6. Fresh local, clean-machine, isolated-parity, and (when authorized and
   available) bounded DEV evidence, followed by a sanitized final report.

## Authority precedence

Current tests/runtime evidence outrank implementation, this task's STATE/PLAN,
durable decisions/docs, historical handoffs, and assumptions. Disagreements
are recorded and stale durable documents are repaired rather than silently
reconciled.
