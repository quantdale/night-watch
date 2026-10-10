## Why

Anomaly admission describes L1 as reproduction in a fresh context and L2 as reproduction in independent contexts, but the implementation deduplicates only by caller-controlled `runId` and never evaluates `contextKind`. Distinct labels from the same context, or three observations all labeled `FIRST_OBSERVATION`, can therefore reach L2. The manual Phase 2C producer contains a tautological `contextKind` assignment, and current tests cover only the intended happy sequence.

Replay comparison has a related evidence-completeness gap: several strong fields are compared only when both sides define them. Missing capture status, settlement, semantic ledgers, oracle observations, resource ledgers, safety/containment counts, or bounded-variance fields can disappear symmetrically and still produce `MATCH`/`passed: true`. A partial or legacy-shaped record can thus be interpreted with current promotion strength without proving a current complete capture.

## What Changes

- Introduce an opaque, attested context-generation identity bound to exact run, contract, environment, auth state, source, browser, proxy, and evidence generations.
- Enforce the ordered admission cardinality: one FIRST observation, one distinct proven fresh replay for L1, and one further distinct bounded repetition for L2.
- Treat run IDs and `contextKind` strings as descriptive labels, never proof of independence.
- Require complete current-schema evidence on both sides of a promotable replay; missing required channels become a capture/schema defect, not a match.
- Preserve explicit historical read-only display while forbidding legacy/partial evidence from current admission or promotion.
- Add strict parsing, version negotiation, negative/mutation matrices, and producer/campaign binding tests.

## Capabilities

### New Capabilities

- `replay-context-provenance-integrity`: Defines attested context independence, ordered admission levels, complete replay evidence, schema negotiation, historical isolation, and adversarial promotion proof.

### Modified Capabilities

None.

## Impact

- Affects `src/core/journeys/{admission,replay,types}.ts`, context/run evidence identity, campaign/manual producers, artifact validation, and replay/admission tests.
- Complements browser context transaction integrity, evidence-bundle transaction integrity, and later campaign promotion rules; it owns semantic independence and comparison completeness.
- Does not authorize a replay, browser, API call, real target, or candidate promotion during implementation proof.
