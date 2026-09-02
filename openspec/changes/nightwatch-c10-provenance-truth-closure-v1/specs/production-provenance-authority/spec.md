# Requirements — Production Provenance Authority

1. A production-safe vocabulary MUST NOT be obtainable by asserting a
   provenance label. Authority MUST be derived through a mechanically validated
   evidence capability whose identity binds the vocabulary contents to a
   specific source-evidence result. A generic unbranded record of the form
   `{ provenanceClass, digest, values }` MUST NOT be sufficient authority.
2. The provenance digest MUST be COMPUTED by trusted Nightwatch code from the
   validated evidence. No caller-supplied digest parameter MAY grant
   provenance, and the derivation API MUST NOT expose one.
3. Provenance identity MUST canonically bind source identity, evidence class,
   the relevant source checkpoint, the vocabulary contents, the vocabulary
   version, and the completeness and currentness states required for authority.
   Changing any load-bearing component MUST change the identity or invalidate
   the capability.
4. Canonicalization MUST be deterministic. Where vocabulary semantics are
   set-based, member ORDER MUST canonicalize identically; member addition or
   removal MUST change identity; and a source checkpoint change MUST change
   identity wherever source identity is part of authority.
5. A capability MUST be unforgeable at runtime, not by compile-time type
   branding alone. An object that merely matches the capability's shape — in
   particular one revived from serialized JSON — MUST NOT be accepted as a
   trusted capability by any consumer.
6. An OpenAPI-derived route vocabulary MUST establish at minimum repository
   identity, source path or root, source snapshot identity, source evidence
   class, inventory-completeness state, generation currentness state where
   applicable, operation identity, HTTP method, path template, `operationId`
   where C-02a requires it, the canonical vocabulary members, and a canonical
   digest derived by Nightwatch itself.
7. Incomplete source evidence MUST fail closed. A non-COMPLETE inventory, a
   truncated population, an unresolved operation identity, or a generated
   artifact whose currentness is `STALE` or `UNKNOWN` where currency is
   required, MUST deny authority rather than grant a weaker authority.
8. Unknown provenance MUST fail closed. An evidence class that does not match
   the vocabulary class being minted MUST deny.
9. A PHP-derived route vocabulary MUST follow the same derivation rule from
   mechanically resolved PHP route evidence. Where PHP evidence cannot yet
   establish an admissible production route vocabulary, the derivation MUST
   fail closed and the reason MUST be documented. Completeness MUST NOT be
   invented.
10. A repository-owned fixed contract MUST still obtain authority through a
    trusted adapter tied to the actual committed contract identity. No
    unrestricted public constructor MAY allow arbitrary code to self-assert
    `SOURCE_PROVEN_FIXED_CONTRACT`.
11. A test-only construction seam MAY exist where fixtures require it. It MUST
    be explicitly branded TEST ONLY and MUST be mechanically prevented from
    producing a production-authoritative capability; the production authority
    path MUST refuse a test-seam capability.
12. The derivation adapter MUST sit OUTSIDE `src/core/prodPrivacy/**`. The pure
    privacy cone MUST NOT import filesystem, network, browser, persistence or
    source-loader modules, and MUST continue to consume only the resulting
    validated capability.
13. The set of modules permitted to mint a production-authoritative capability
    MUST be mechanically bounded, so that arbitrary application code cannot
    reach the mint directly.
14. Every persisted production DTO field capable of carrying a string or bytes
    MUST be covered by one of: proven membership of a finite closed vocabulary,
    mechanical source-proof, or a hostile sentinel planted in that exact field
    position and proven incapable of persisting. Coverage MUST be driven by a
    field inventory rather than by a list of value classes, and adding a new
    uncovered free-form persisted field MUST fail the suite.
