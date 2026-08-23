# Phase 18 Living Plan

Task ID: phase-18-semantic-replay-confidence
Phase: 18-SEMANTIC-REPLAY-CONFIDENCE
Status: IN_PROGRESS (LOCAL / SOURCE / SYNTHETIC)
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Starting State

- Live starting SHA: `80212fcb5dc4e8648b174b209636090a17c89c5c`; live HEAD is
  discovered from Git, not inferred from task prose.
- Phase 17 is terminal at `482ed51814ce8e8f7d67de7edc9a98786240430c` and must
  not be reopened.
- Existing Phase 9/9A.1/10 semantic infrastructure, Phase 12 triage, Phase
  13 replay/clustering, and Phase 17 change-aware portfolio evidence are the
  current authorities pending Gate Zero reconstruction.

## Purpose

Deliver a coherent local semantic-depth and evidence-fidelity wave that raises
business-behavior detection while preserving the read-only fail-closed model.

## Scope

The workstreams and acceptance rows in WORKSTREAMS.md and
ACCEPTANCE_MATRIX.md, plus focused fixtures/tests and durable documentation
needed to record implementation truth.

## Non-Goals

DEV/NEXT/production, authenticated state, product/data mutations, cloud or
datastore work, Phase 6/11B/13B/16D, sibling writes, publication, AI/selfDev
authority, and raw evidence persistence.

## Safety Constraints

Unknown, stale, malformed, ambiguous, or privacy-unsafe inputs fail closed.
Pure semantic/replay/triage layers gain no execution authority. No raw
customer-like values, credentials, authenticated state, or real findings may
enter source, fixtures, artifacts, or task records.

## Architecture / Approach

First cite the existing implementation path. Extend existing protocol and
semantic authorities additively through bounded pure DTOs and adapters; keep
legacy schemas readable; use actual synthetic replay executors; and make every
new claim carry sanitized evidence, provenance, occurrence identity, and a
deterministic failure state.

## Milestones

- M0 — bootstrap, authorization, task control plane, and Gate Zero pipeline
  reconstruction. COMPLETED.
- M1 — semantic contract model/provenance/currentness and observation-boundary
  design, with focused parser/privacy regressions. COMPLETED.
- M2 — deterministic relational, transition, pagination, empty-state, enum,
  cross-surface, and HTTP-200 semantic invariant fixtures with benign controls.
  COMPLETED.
- M3 — occurrence-bound replay V3 compatibility, exact outcome taxonomy, and
  live synthetic replay executor integration. COMPLETED.
- M4 — real synthetic minimization semantics, rejection explanations, and
  anomaly-identity preservation. COMPLETED.
- M5 — confidence evidence/degradation, semantic clustering, and change-impact
  × semantic coverage accounting. COMPLETED.
- M6 — dossier V3, adversarial corpus, parser/privacy/static hardening, and
  dead-surface audit. COMPLETED.
- M7 — integrated validation, canonical/isolated parity, docs truth, checkpoint
  pushes, and terminal handoff. IN_PROGRESS; implementation checkpoint
  `937f887413e5231b385940bd310b7708bc4a0a0e` is validated after the
  continuity allowlist repair.

## Gate Zero Reconstruction

The current source-backed path is recorded in `STATE.md`. The load-bearing
chain is:

`projectObservation` → `deriveRealSourceExpectation(s)` /
`resolveExpectationFreshness` → `evaluateInvariant` →
`evaluateSemanticExpectation` / `evaluateSemanticHook` → observer receipt and
`CampaignSemanticEvidence` → orchestrator `recomputeClusters` /
`semanticContractIdentity` → `certifiedReplayClosure` / V2 plan →
`minimizeFailure` → `rankSemanticConfidence` /
`isReadySemanticDossier` → `createBugDossierV2`.

The reconstruction establishes three implementation priorities before adding
new classes: preserve a typed semantic invariant instead of an orchestrator
stub; bind replay to the campaign finding identity and full occurrence
context; and derive confidence counts/outcomes from replay facts rather than
cluster or aggregate counters. Dossier output must expose bounded
replay/currentness/minimization evidence without raw observations.

## Validation Strategy

Use typecheck plus focused tests after narrow changes; use the affected
compatibility cone after each wave; then run hardening, synthetic campaign,
owner provenance, continuity, project-state, canonical full regression, and
the established fresh isolated regression. Repeat deterministic artifacts and
record exact counts and skip identities in STATE.md and REPORT.md.

## Decision Log

- M0: create a successor task because Phase 17 is terminal and explicitly
  deferred semantic depth; do not mutate Phase 17 history.
- M0: record the owner authorization before source mutation; preserve Phase 6,
  no-DEV, no-data-plane, no-AI, no-promotion boundaries.
- M1–M5: keep semantic contract/currentness, replay fidelity, minimization, and
  confidence evidence additive and private; only a matching semantic finding
  identity can establish replay/minimization support.
- M5: retain the legacy semantic evidence path for old fixtures, but make the
  new replay-fidelity receipt load-bearing whenever present; unsupported journey
  reduction remains unresolved rather than falsely minimal.

## Discoveries

Gate Zero discoveries are recorded in STATE.md with exact module/function
boundaries. New defects are recorded in DEFECT_LEDGER.md.

## Deferred Work

Any semantic class lacking source/fixture provenance, any cross-surface path
requiring unauthorized runtime access, real-environment acceptance, and any
unbounded or unsafe abstraction remain deferred. Isolated parity, checkpoint
post-repair canonical/isolated parity, push, closure, and final CI truth are
the remaining M7 work.

## Completion Criteria

All acceptance rows are evidence-backed; all required local/source/synthetic
quality floors are zero; typecheck, focused/affected validation, hardening,
campaign, provenance, continuity, project, canonical full regression, and
isolated exact parity are green; docs are truthful; Git is clean and equal to
`origin/main`; external CI is reported separately and never called green when
zero steps execute.
