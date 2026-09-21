## Why

Nightwatch's permanent semantic rule says a provenance label or digest cannot create real-source expectation authority. The current gate does not fully enforce that rule. `assertRealSourceExpectationProof` accepts any expectation carrying a recognized derivation-version string and well-shaped evidence digest. `createRealSourceResolver` re-extracts the digest but never proves that the expectation's ID, target, projection contract, invariants, recipe, and provenance are the canonical output of that extraction. A caller can copy a genuine source digest, replace the expectation semantics with another valid contract, and still obtain `RESOLVED`.

The public single-derivation and collection-transform functions also trust structural recipes, caller-supplied SHAs, and `DerivedRealSourceExpectation` records. The collection bridge checks that a digest exists but does not bind the historical expectation, recipe, and digest to one producer event. These are structural labels, not unforgeable mechanical derivation evidence.

## What Changes

- Make the registered recipe plus exact source transaction the sole input to authoritative real-source derivation.
- Produce a canonical derivation record binding recipe identity/digest, source transaction, normalized extraction digest, and complete expectation digest.
- Recompute and compare the entire canonical expectation at resolver time; matching source evidence alone is insufficient.
- Remove structural proof checks that treat derivation-version/digest shape as authority.
- Bind collection admission to an authenticated canonical derivation record and recompute the supported transform.
- Reject duplicate target mappings, arbitrary recipes, caller-selected SHAs, recipe/expectation mismatches, and synthetic adapters on real-authority paths.
- Add coherent-forgery tests that preserve genuine evidence while altering invariants, IDs, projection limits, provenance, recipes, and collection transforms.

## Capabilities

### New Capabilities

- `real-source-expectation-authority-integrity`: Defines canonical producer-bound authority from an approved source transaction to an exact real-source expectation and its collection transform.

### Modified Capabilities

None.

## Impact

- Affects `src/oracles/expectations/{admission,collectionAdmission,resolver,provenance,currentness}.ts`, `src/core/semanticAcceptance/admissionRoute.ts`, lifecycle resolution, contained semantic harnesses, and focused admission/currentness tests.
- Does not add recipes, broaden target admission, contact sibling repositories, or authorize DEV execution.
