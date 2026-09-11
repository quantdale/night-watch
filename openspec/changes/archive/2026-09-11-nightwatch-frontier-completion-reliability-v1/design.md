# Design — frontier completion & deep reliability

Three pure cones under `src/core/`, sharing only
`identity/canonicalDigest`, each isolated by a hardening rule from the
production cones and from external-submission or bounty-scoring surfaces.

`findingReview` recomputes every bound digest from current artifacts on
verification, so a mutated or regenerated dossier, a rebased source, or a
re-versioned projection fails closed rather than inheriting a decision.

`findingIntel` classifies from mechanical fields only. Prose is never an
input. Missing comparison inputs yield UNKNOWN with no advisory pointer.
`REGRESSION_CANDIDATE` requires both a proven prior fix and a moved source
lineage; neither precondition is inferable from the other.

`c12Rehearsal` mocks only external edges and calls the real
`evaluateP1ObservationScope`, `attachP1ObservationSession`, and
`issueP1ObserveGrant`, with fixtures pinned to the unresolvable `.invalid`
namespace. Readiness and chain versions are deliberate literal duplicates
under the F-12 reverse-isolation discipline, pinned by hardening.
