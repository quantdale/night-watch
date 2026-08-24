# Phase 25 Specification

Task ID: phase-25-real-source-surface-discovery
Phase: 25-REAL-SOURCE-SURFACE-DISCOVERY
Title: Nightwatch Phase 25 — Real-Source Surface Discovery, Boundary Hardening, Contract Graph Extraction, and Review Intelligence
Status: IN_PROGRESS
Authorization class: PHASE_25_REAL_SOURCE_SURFACE_DISCOVERY_LOCAL_SOURCE_SYNTHETIC_ONLY
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Intent

Extend Nightwatch from consuming manually prepared source-derived candidate
descriptors to safely and deterministically discovering bounded application
surfaces from an approved read-only source snapshot. The new path must reuse
the existing Phase 20 analyzers, semantic graph, and Phase 24 candidate
portfolio; it must never create execution authority, follow symlinks, persist
source text, or contact a product environment.

## Required outcome

Deliver a coherent local/source/synthetic vertical slice:

```text
approved source boundary
  -> bounded scan config and inventory
  -> reused analyzers and route/contract evidence
  -> exact joins and safe surface descriptors
  -> existing Phase 24 qualification/selection/invalidation
  -> deterministic local review queue and explain output
```

The implementation must also repair the Phase 25 prerequisite defects in
source confinement, exact packed-ref resolution, Git-shape handling,
TypeScript range proof soundness, and shape-aware Phase 20 drift comparison.

## Authority and safety

- Alphaus sibling repositories are read-only inputs; only
  `src/core/source/siblingSource.ts` may access them.
- This phase is local/source/synthetic only. No DEV, NEXT, production,
  authentication-state read, product request, browser observation, database,
  datastore, cloud, infrastructure, publication, message, or AI authority is
  authorized.
- Source text exists only ephemerally during bounded analysis. No raw source
  text, customer-like value, token, credential, cookie, or reconstructible
  member set may enter DTOs, receipts, dossiers, task records, logs, or
  committed fixtures.
- Unknown language, route, join, mutation, owner, currentness, or source shape
  fails closed with a safe reason; proof is never inferred from names.
- Existing Phase 24 eligibility and portfolio selection remain the authority.
  Discovery may produce a descriptor, but cannot make an ineligible surface
  executable.

## Non-goals

- No generic parser, arbitrary regex/config execution, shell command, child
  process, network, Git mutation, or source checkout.
- No parallel Phase 25 portfolio, replay, dossier, semantic oracle, or quality
  gate framework.
- No broad sibling-repository rescan beyond the approved source registry and
  bounded synthetic fixtures.
- No DEV readiness claim and no external CI retry loop.

## Acceptance shape

Focused Phase 25 tests prove source-boundary confinement, exact supported Git
HEAD resolution, bounded inventory determinism, analyzer reuse and false-
positive resistance, route/read-only/contract extraction, exact joins,
descriptor-to-Phase-24 integration, shape-aware drift, incremental
invalidation, cache currentness, privacy, review ranking, operator output,
and an offline source-to-portfolio synthetic flow. Final validation is the
unified quality gate plus compatibility, typecheck, hardening, continuity,
project truth, owner provenance, clean Node 20 qualification, and fresh
canonical/topology-correct isolated full regression as authorized by this
campaign.
