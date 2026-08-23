# Phase 19 Living Plan

Task ID: phase-19-autonomous-bug-yield
Phase: 19-AUTONOMOUS-BUG-YIELD
Status: IN_PROGRESS
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Starting State

- Live starting SHA: `a9dfba332a979b8358763cd737e26d4b4a435c9c`; live HEAD is
  discovered from Git, not inferred from task prose.
- Phase 18 is terminal at the starting SHA and must not be reopened.
- Existing Phase 9–18 portfolio, change-intelligence, semantic, replay,
  minimization, clustering, confidence, dossier, safety, and product contracts
  are the current authorities pending focused integration tests.

## Purpose

Deliver a cohesive local/source/synthetic bug-yield loop that selects better
work explainably, measures partial semantic coverage, preserves replay and
minimality truth, suppresses duplicates, and gives the owner stable dossiers.

## Scope

The workstreams and acceptance rows in this task, plus executable fixtures,
tests, safe operator output, and durable documentation required to record
implementation truth.

## Non-Goals

DEV/NEXT/production contact, authenticated state, product/data mutations,
cloud/datastore/infrastructure work, sibling writes, external publication or
messaging, AI/selfDev authority, canonical promotion, and raw evidence.

## Safety Constraints

Unknown, stale, malformed, unsupported, ambiguous, or privacy-unsafe inputs
fail closed. Priority cannot bypass authority. New pure intelligence modules
gain no execution or outbound authority. No raw values, credentials, cookies,
authenticated state, or real findings enter source, fixtures, artifacts, or
task records.

## Architecture / Approach

Compose the existing portfolio/change-intelligence/semantic/replay/triage
path through additive bounded DTOs. Use deterministic safe identities and
categorical components, with source-currentness and authority gates before
selection. Keep legacy readers and Phase 18 behavior compatible.

## Milestones

- [x] M0 — establish task continuity, reconcile Phase 18 terminal truth, and
  map integration seams. COMPLETED.
- [x] M1 — implement the unified versioned planner, explainable priority,
  behavior-level change impact, and semantic coverage matrix. COMPLETED.
- [x] M2 — wire deterministic campaign execution/yield accounting and the
  first integrated planner-to-evidence path. COMPLETED.
- [x] M3 — implement replay V4, reduction/minimality proof, and bounded
  nondeterminism classification on top of existing V3 contracts. COMPLETED.
- [x] M4 — strengthen clustering, confidence V2, dossier evidence, and
  actionable diagnostics. COMPLETED.
- [x] M5 — generalize product/surface adapters, expand the data-driven
  adversarial corpus, and add deterministic cache/performance protections.
  COMPLETED.
- [x] M6 — integrate safe local operator commands and consolidate compatible
  phase-specific wrappers/dead paths. COMPLETED.
- [x] M7 — run focused, canonical, isolated, parity, hardening, continuity,
  and project-state validation; repair all regressions. COMPLETED.
- [ ] M8 — close durable docs, complete REPORT/HANDOFF/STATE, commit and push
  validated checkpoints, inspect external CI once, and leave synchronized
  clean `main`. IN_PROGRESS.

## Workstream mapping

| User workstream | Milestone | Primary implementation surface |
|---|---|---|
| A–C | M1–M2 | `src/core/campaignIntelligence/**`, existing portfolio/change intelligence |
| D–E | M1–M2 | coverage matrix and yield analytics |
| F–H | M3 | replay, minimization, nondeterminism |
| I–K | M4 | clustering, confidence, dossier |
| L | M5 | `src/products/**`, synthetic second-product fixtures |
| M | M5 | `corpus/phase19/**`, `tests/unit/**` |
| N–O | M5–M6 | CLI/operator and stable diagnostics |
| P–Q | M5–M7 | bounded caches, hardening, compatibility consolidation |

## Validation gates

Each milestone records focused tests in `STATE.md`. Integration gates are:

```text
npm run typecheck
npm run hardening:check
npm run agent:check
npm run project:check
```

Terminal validation also runs the repository’s canonical full suite and the
Phase 18 topology-correct isolated procedure, recording exact enumerated,
passed, skipped, failed, and skip identities for parity.

## Validation Strategy

Use focused unit/corpus tests after each implementation slice, then run
typecheck, hardening, synthetic campaign, continuity, project-state, canonical
regression, and the established topology-correct isolated regression. Compare
exact enumeration and skip identities; do not update expected counts silently.

## Decision Log

- M0: create a successor task because Phase 18 is terminal; do not mutate its
  historical records.
- M0: keep the owner freeze and LOCAL / SOURCE / SYNTHETIC boundary explicit
  in the control plane before source mutation.
- M1 onward: use additive versioned DTOs and compose proven Phase 9–18
  authorities instead of creating parallel frameworks.

## Discoveries

Record source/test evidence and any defects in `STATE.md` at each milestone;
the live implementation and tests outrank stale durable wording.

## Deferred Work

DEV/NEXT acceptance, infrastructure/data-layer investigations, external
analytics/publication, and any unsupported contract without mechanically
admitted evidence remain deferred.

## Completion Criteria

All acceptance rows are evidence-backed; local quality floors remain zero;
focused and full local validation is green with exact canonical/isolated parity;
continuity and project truth are valid; the tree is clean and synchronized;
external CI is reported truthfully after one post-push inspection.
