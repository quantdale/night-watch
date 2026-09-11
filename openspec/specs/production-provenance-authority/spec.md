# production-provenance-authority Specification

## Purpose
TBD - created by archiving change nightwatch-c10-provenance-truth-closure-v1. Update Purpose after archive.
## Requirements
### Requirement: production-safe vocabulary authority

A production-safe vocabulary MUST NOT be obtainable by asserting a
provenance label. Authority MUST be derived through a mechanically validated
evidence capability whose identity binds the vocabulary contents to a
specific source-evidence result. A generic unbranded record of the form
`{ provenanceClass, digest, values }` MUST NOT be sufficient authority.

#### Scenario: a provenance label is asserted

- **WHEN** a production-safe vocabulary is offered by asserting only a provenance
  label or a generic unbranded record
- **THEN** authority SHALL deny, because it MUST be derived through a
  mechanically validated evidence capability whose identity binds the vocabulary
  contents to a specific source-evidence result

### Requirement: trusted digest computation

The provenance digest MUST be COMPUTED by trusted Nightwatch code from the
validated evidence. No caller-supplied digest parameter MAY grant
provenance, and the derivation API MUST NOT expose one.

#### Scenario: a caller supplies a digest parameter

- **WHEN** a caller-supplied digest parameter is offered to the derivation API
- **THEN** it MUST NOT grant provenance, because the provenance digest MUST be
  COMPUTED by trusted Nightwatch code from the validated evidence and the
  derivation API MUST NOT expose such a parameter

### Requirement: provenance identity binding

Provenance identity MUST canonically bind source identity, evidence class,
the relevant source checkpoint, the vocabulary contents, the vocabulary
version, and the completeness and currentness states required for authority.
Changing any load-bearing component MUST change the identity or invalidate
the capability.

#### Scenario: a load-bearing component changes

- **WHEN** any load-bearing component of provenance identity changes
- **THEN** the identity MUST change or the capability MUST be invalidated

### Requirement: deterministic canonicalization

Canonicalization MUST be deterministic. Where vocabulary semantics are
set-based, member ORDER MUST canonicalize identically; member addition or
removal MUST change identity; and a source checkpoint change MUST change
identity wherever source identity is part of authority.

#### Scenario: set-based vocabulary members are canonicalized

- **WHEN** vocabulary semantics are set-based, a member is added or removed, or a
  source checkpoint changes
- **THEN** member ORDER MUST canonicalize identically, member addition or removal
  MUST change identity, and a source checkpoint change MUST change identity
  wherever source identity is part of authority

### Requirement: runtime-unforgeable capability

A capability MUST be unforgeable at runtime, not by compile-time type
branding alone. An object that merely matches the capability's shape — in
particular one revived from serialized JSON — MUST NOT be accepted as a
trusted capability by any consumer.

#### Scenario: a shape-matching object is presented

- **WHEN** an object that merely matches the capability's shape — in particular
  one revived from serialized JSON — is presented to a consumer
- **THEN** it MUST NOT be accepted as a trusted capability

### Requirement: OpenAPI-derived vocabulary contents

An OpenAPI-derived route vocabulary MUST establish at minimum repository
identity, source path or root, source snapshot identity, source evidence
class, inventory-completeness state, generation currentness state where
applicable, operation identity, HTTP method, path template, `operationId`
where C-02a requires it, the canonical vocabulary members, and a canonical
digest derived by Nightwatch itself.

#### Scenario: an OpenAPI-derived route vocabulary is established

- **WHEN** an OpenAPI-derived route vocabulary is established
- **THEN** it MUST establish at minimum repository identity, source path or root,
  source snapshot identity, source evidence class, inventory-completeness state,
  generation currentness state where applicable, operation identity, HTTP method,
  path template, `operationId` where C-02a requires it, the canonical vocabulary
  members, and a canonical digest derived by Nightwatch itself

### Requirement: incomplete source evidence fails closed

Incomplete source evidence MUST fail closed. A non-COMPLETE inventory, a
truncated population, an unresolved operation identity, or a generated
artifact whose currentness is `STALE` or `UNKNOWN` where currency is
required, MUST deny authority rather than grant a weaker authority.

#### Scenario: source evidence is incomplete

- **WHEN** the inventory is non-COMPLETE, the population is truncated, an
  operation identity is unresolved, or a generated artifact's currentness is
  `STALE` or `UNKNOWN` where currency is required
- **THEN** authority SHALL be denied rather than granted a weaker authority

### Requirement: unknown provenance fails closed

Unknown provenance MUST fail closed. An evidence class that does not match
the vocabulary class being minted MUST deny.

#### Scenario: provenance is unknown

- **WHEN** an evidence class does not match the vocabulary class being minted
- **THEN** authority SHALL deny

### Requirement: PHP-derived route vocabulary

A PHP-derived route vocabulary MUST follow the same derivation rule from
mechanically resolved PHP route evidence. Where PHP evidence cannot yet
establish an admissible production route vocabulary, the derivation MUST
fail closed and the reason MUST be documented. Completeness MUST NOT be
invented.

#### Scenario: PHP route evidence cannot establish a vocabulary

- **WHEN** PHP evidence cannot yet establish an admissible production route
  vocabulary
- **THEN** the derivation MUST fail closed and the reason MUST be documented,
  and completeness MUST NOT be invented

### Requirement: fixed-contract authority adapter

A repository-owned fixed contract MUST still obtain authority through a
trusted adapter tied to the actual committed contract identity. No
unrestricted public constructor MAY allow arbitrary code to self-assert
`SOURCE_PROVEN_FIXED_CONTRACT`.

#### Scenario: a fixed contract obtains authority

- **WHEN** a repository-owned fixed contract obtains authority
- **THEN** it MUST obtain it through a trusted adapter tied to the actual
  committed contract identity, and no unrestricted public constructor MAY allow
  arbitrary code to self-assert `SOURCE_PROVEN_FIXED_CONTRACT`

### Requirement: test-only construction seam

A test-only construction seam MAY exist where fixtures require it. It MUST
be explicitly branded TEST ONLY and MUST be mechanically prevented from
producing a production-authoritative capability; the production authority
path MUST refuse a test-seam capability.

#### Scenario: a test-only construction seam is used

- **WHEN** a test-only construction seam constructs a capability
- **THEN** it MUST be explicitly branded TEST ONLY and MUST be mechanically
  prevented from producing a production-authoritative capability, and the
  production authority path MUST refuse a test-seam capability

### Requirement: derivation adapter outside the privacy cone

The derivation adapter MUST sit OUTSIDE `src/core/prodPrivacy/**`. The pure
privacy cone MUST NOT import filesystem, network, browser, persistence or
source-loader modules, and MUST continue to consume only the resulting
validated capability.

#### Scenario: the privacy cone is inspected

- **WHEN** the pure privacy cone is inspected
- **THEN** the derivation adapter MUST sit OUTSIDE `src/core/prodPrivacy/**`, the
  cone MUST NOT import filesystem, network, browser, persistence or source-loader
  modules, and it MUST continue to consume only the resulting validated capability

### Requirement: bounded capability minters

The set of modules permitted to mint a production-authoritative capability
MUST be mechanically bounded, so that arbitrary application code cannot
reach the mint directly.

#### Scenario: arbitrary application code reaches for the mint

- **WHEN** arbitrary application code attempts to reach the mint directly
- **THEN** it cannot, because the set of modules permitted to mint a
  production-authoritative capability MUST be mechanically bounded

### Requirement: persisted DTO field coverage

Every persisted production DTO field capable of carrying a string or bytes
MUST be covered by one of: proven membership of a finite closed vocabulary,
mechanical source-proof, or a hostile sentinel planted in that exact field
position and proven incapable of persisting. Coverage MUST be driven by a
field inventory rather than by a list of value classes, and adding a new
uncovered free-form persisted field MUST fail the suite.

#### Scenario: an uncovered persisted field is added

- **WHEN** a new uncovered free-form persisted field is added
- **THEN** the suite MUST fail, because coverage MUST be driven by a field
  inventory and every persisted production DTO field capable of carrying a string
  or bytes MUST be covered by proven membership of a finite closed vocabulary,
  mechanical source-proof, or a hostile sentinel planted in that exact field
  position and proven incapable of persisting

