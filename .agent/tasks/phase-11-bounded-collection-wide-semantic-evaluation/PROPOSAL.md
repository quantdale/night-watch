# PROPOSAL — Nightwatch Phase 11 — Bounded Collection-Wide Semantic Evaluation

Task ID: phase-11-bounded-collection-wide-semantic-evaluation
Authorization class: PHASE_11_COLLECTION_WIDE_SEMANTIC_IMPLEMENTATION_ONLY
Status: ACCEPTED_FOR_IMPLEMENTATION

## Problem

Nightwatch's real-source semantic contracts are deeper after Phase 10, but collection
item evaluation is still positional. Every admitted real collection contract currently
uses item index 0. A valid row 0 can therefore mask a defect in row 1+ even when that
later row is already present in the safe projection.

The existing projector retains up to 128 items, so the main deficiency is not raw-data
collection or network coverage. It is invariant evaluation breadth.

## Proposal

Add an explicit collection-item evaluation capability over the already-bounded safe
projection. Existing positional paths remain unchanged. Collection-wide expectations get
new stable identities and reuse the exact same source-backed item semantics.

For each collection-scoped invariant:

1. evaluate each safely projected item;
2. aggregate the item verdicts;
3. emit one bounded result with explicit coverage state;
4. emit at most one semantic finding per invariant definition;
5. never retain raw row values or customer identities.

Required coverage states:

- FULLY_EVALUATED_PASS
- VIOLATION
- EMPTY_NOT_APPLICABLE
- PARTIAL_COVERAGE_NO_VIOLATION
- PROJECTION_LIMIT_EXCEEDED

An uninspected tail is uncertainty, never evidence of full correctness. An observed
within-window violation is still a real violation even if the tail is truncated.

## Why this approach

- It directly closes D-61's confirmed detection blind spot.
- It reuses the existing safe projection and its 128-item bound.
- It creates no new product/network authority.
- It preserves historical Phase 9/10 positional semantics.
- It is fully testable locally with synthetic later-row defects.
- It increases P(detection) before investing in latent post-detection triage machinery.

## Rejected alternatives

### Global numeric-path reinterpretation

Rejected. Reinterpreting `['0', ...]` as all items would silently change historical
expectation meaning and invalidate old evidence identities.

### Increasing the projection item cap

Rejected. The current defect exists inside the already-projected window. Increasing the
cap changes boundedness without fixing explicit coverage semantics.

### One finding per violating row

Rejected. It creates finding/fingerprint explosion and unnecessary structural exposure.
Aggregate by stable invariant definition instead.

### Real minimization repair in the same phase

Rejected as scope mixing. The real reduced-candidate replay gap is important but remains
NEXT_AFTER. Phase 11 is a detection-breadth phase.

### DEV-first implementation

Rejected. The architecture can and must be proven locally/synthetically first. Any DEV
acceptance is Phase 11B under separate authorization.

## Expected implementation surface

Primarily:

- `src/oracles/invariants/**`
- `src/oracles/semantic/**`
- narrowly `src/oracles/expectations/**` for explicit collection identity/scope
- `corpus/phase11/**`
- focused tests
- hardening + CI
- docs/continuity

Projection schema should remain unchanged unless a concrete blocker is proven.

## Acceptance summary

The implementation is acceptable when:

- later-row within-bound defects are detected;
- historical item-0 baseline demonstrably misses the same fixtures;
- row 127 is detected and row 128 produces partial coverage;
- truncated/no-observed-violation never becomes full PASS;
- multiple violating rows aggregate without finding explosion;
- benign false positives are zero;
- privacy leaks are zero;
- determinism mismatches are zero;
- historical Phase 9/10 matrices and full regression remain green;
- exact implementation and final CI are green;
- all safety/authority boundaries remain unchanged.

The normative details are in `SPEC.md` and
`docs/design/PHASE_11_COLLECTION_WIDE_SEMANTICS.md`.
