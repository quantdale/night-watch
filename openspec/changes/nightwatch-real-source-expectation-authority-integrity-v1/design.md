## Context

Evidence digests bind normalized extracted source structure. They do not, by themselves, bind every semantic field later placed beside that digest. The current resolver verifies that the source still reproduces the digest, then returns the caller-supplied expectation. It does not regenerate the expected expectation and compare it. The proof helper is weaker still: it checks only the derivation-version vocabulary and digest format. Collection admission consumes a structurally constructible derived record and carries its semantics forward.

## Goals / Non-Goals

**Goals:** exact derivation-to-expectation binding; registered-recipe authority; source-transaction binding; canonical collection transformation; duplicate/mismatch refusal; coherent-forgery proof.

**Non-Goals:** hide a secret in source code, trust a TypeScript brand as runtime authority, add an expression language, broaden semantic targets, or contact real source during planning.

## Decisions

### Recompute semantics from evidence

Authoritative resolution accepts a recipe identity from the fixed approved registry and a successfully closed source transaction. It reruns the bounded extractors, rebuilds the complete expectation through one canonical builder, and compares a canonical expectation digest. A source evidence digest that matches while any expectation semantic field differs is stale/invalid, never resolved.

### Bind every identity in one derivation record

The record includes schema version, registered recipe ID and canonical recipe digest, repo/SHA/source-transaction identity, extraction digest, expectation ID/target/provenance, projection contract, invariant definitions, and canonical expectation digest. Unknown or duplicate fields/targets fail closed. The record is producer evidence, not an open sealer.

### Keep runtime proof mechanical

`assertRealSourceExpectationProof` is replaced with verification of the canonical derivation record or with a fresh canonical derivation comparison. Recognized strings and digest syntax are necessary shape checks but never sufficient authority.

### Rebuild collection expectations

Collection admission accepts only a verified historical derivation record, checks its fixed target mapping and recipe generation, then deterministically rebuilds and validates the collection expectation. It never trusts caller-supplied historical invariants or a free `DerivedRealSourceExpectation` object.

### Separate synthetic use

Synthetic recipes/readers remain available through an explicitly non-promotable test interface. They cannot produce the real-authority record type or satisfy contained-DEV preflight.

## Risks / Trade-offs

Existing tests and harnesses that assemble recipe/expectation arrays directly must migrate to the canonical derivation API. Re-derivation adds bounded local work but avoids treating a content digest as a signature over unrelated semantics.

## Migration Plan

1. Freeze all derivation, proof, resolver, collection, and contained-acceptance callers.
2. Add canonical recipe/expectation digests and exact derivation-record validation.
3. Route real authority through the fixed registry and closed source transaction.
4. Rebuild resolver and collection admission around canonical recomputation.
5. Split synthetic fixtures into a non-promotable interface.
6. Add coherent-forgery/property/mutation tests and run semantic/source/hardening/local/clean/full gates.

## Open Questions

None. A valid extraction digest proves extracted source structure, not arbitrary semantic fields placed next to it.
