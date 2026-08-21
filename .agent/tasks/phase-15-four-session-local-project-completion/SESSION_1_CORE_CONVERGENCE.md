# Session 1 — Core Contract & Semantic Platform Convergence

Authorization required: PHASE_15_S1_CORE_CONTRACT_CONVERGENCE_LOCAL_ONLY
Depends on: Phase 14 five-change implementation batch at live Git main.

## Objective

Converge the semantic/source-contract platform accumulated across Phases 9-14 into a smaller, explicit, version-safe architecture without weakening historical compatibility.

## Required implementation work

A. Contract lifecycle registry
- Introduce one Nightwatch-owned registry/API that can enumerate historical, collection, deep, and current mechanical-contract expectation families for existing approved targets.
- Keep historical IDs immutable.
- Encode explicit relationship metadata: predecessor/successor, scope, derivation version, evidence version, currentness requirements, campaign-eligible status.
- Reject duplicate identities, target collisions, ambiguous successor chains, unknown versions.

B. Unified contract result vocabulary
- Define a stable categorical contract lifecycle/result vocabulary spanning PROVEN, AMBIGUOUS, UNSUPPORTED, STALE, UNAVAILABLE, PARTIAL, and NOT_APPLICABLE.
- Build adapters from Phase 9-14 module-specific results into the unified DTO without deleting historical DTOs.
- No raw product/customer values.

C. Identity/currentness convergence
- Centralize canonical identity helpers so source SHA is provenance/currentness, while normalized evidence + derivation semantics drive semantic identity.
- Eliminate duplicate ad hoc stable-json/digest logic only where equivalence is mechanically provable.
- Add explicit compatibility tests for historical IDs/digests.

D. Resolver/admission composition
- Build one higher-level source-contract resolution API that composes existing admission, collection admission, currentness, mechanical analyzer, and drift intelligence.
- Fail closed on mixed-currentness or ambiguous same-target selection.
- Preserve low-level APIs for compatibility.

E. Contract schema validation hardening
- Strict unknown-field rejection for new DTOs.
- Cross-field coherence for targetId/expectationId/version/evidence/currentness/scope.
- Deterministic round-trip serialization.

F. Migration map
- Add a source-owned compatibility map describing which legacy APIs remain canonical, compatibility-only, or superseded-for-new-code.
- Do not delete compatibility code in this session unless all current callers are migrated and focused tests prove safety.

## Testing cadence

Implementation-first. For each workstream: typecheck, diff-check, focused tests, one narrow historical compatibility suite. End with one moderate semantic-platform integration pack covering Phase 9A.1, 10, 11A.3, 12 coverage/cluster, 13 semantic bundle/routing, and Phase 14 analyzer/currentness.

Do NOT run full Playwright or isolated full regression.

## Required terminal state

PHASE_15_S1_CORE_CONVERGENCE: IMPLEMENTED_FOCUSED_GREEN
PHASE_15_PROGRAM_STATE: SESSION_1_COMPLETE_SESSION_2_REQUIRED
NEXT ACTION: STOP

Update Phase-15 HARDENING_HANDOFF.md and durable continuity. Push fast-forward only.