## Why

The current triage evidence contracts do not share one representable, closed schema. Replay-plan v2 accepts unbounded occurrence ordinals although occurrence identity/envelope construction caps them at 999,999, so an admitted plan can execute and only then fail while producing its envelope. The minimality-evidence parser casts untrusted fields, accepts unknown evidence classes and truthy non-booleans, preserves any non-empty survivor digest without recomposition, and does not reject unknown fields. Semantic replay receipt validation enforces the positive exact case but admits many contradictory outcome/currentness/binding/rejection combinations.

These gaps let durable evidence be accepted without proving the coherence that downstream confidence and dossier logic assume.

## What Changes

- Define one shared bounded occurrence domain used by plan, binding, envelope, minimization, and semantic replay layers.
- Make every durable triage parser exact-key, prototype-safe, enum/type/bound checked, and canonical.
- Bind minimality evidence to an included canonical survivor-occurrence identity or a recomposable signed body; never trust a free digest.
- Add a total semantic replay coherence matrix and explicit historical/current schema separation.
- Ensure execution cannot occur unless the eventual evidence envelope is representable.

## Capabilities

### New Capabilities

- `triage-evidence-contract-integrity`: Defines common bounded identities, strict parsers, canonical digest binding, execution-before-evidence prohibition, and semantic replay coherence.

### Modified Capabilities

None.

## Impact

- Affects `src/core/triage/{replayPlan,replayBinding,replayEnvelope,minimalityEvidence,semanticReplay,semanticTriageEvidence}.ts` and artifact adapters.
- Historical schemas remain readable through explicit historical validators, never through weakened current validation.
