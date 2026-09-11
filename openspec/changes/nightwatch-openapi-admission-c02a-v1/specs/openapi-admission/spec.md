# Requirements — OpenAPI Admission (C-02a)

## ADDED Requirements

### Requirement: approved blueapi roots

`APPROVED_ROOTS['alphauslabs/blueapi']` MUST be exactly
`['billing', 'openapiv2']`. No other `alphauslabs/blueapi` root may become
readable, and an unapproved repository MUST continue to fail closed with
`REAL_SOURCE_SCAN_APPROVED_UNIVERSE`.

#### Scenario: approved roots are inspected

- **WHEN** `APPROVED_ROOTS['alphauslabs/blueapi']` is inspected
- **THEN** it MUST be exactly `['billing', 'openapiv2']`, no other
  `alphauslabs/blueapi` root may become readable, and an unapproved repository
  MUST continue to fail closed with `REAL_SOURCE_SCAN_APPROVED_UNIVERSE`

### Requirement: blueinternal remains unadmitted

`alphauslabs/blueinternal` MUST remain absent from
`PHASE25_APPROVED_REPOSITORY_IDS` and MUST NOT be added to
`RIPPLE_REPOSITORIES`. Its admission is a REPOSITORY admission reserved for
C-05.

#### Scenario: blueinternal admission is inspected

- **WHEN** `PHASE25_APPROVED_REPOSITORY_IDS` and `RIPPLE_REPOSITORIES` are
  inspected
- **THEN** `alphauslabs/blueinternal` MUST remain absent from
  `PHASE25_APPROVED_REPOSITORY_IDS` and MUST NOT be added to
  `RIPPLE_REPOSITORIES`, because its admission is a REPOSITORY admission
  reserved for C-05

### Requirement: existing parser only

No new OpenAPI parser may be written. Every blueapi operation MUST be
produced by the existing `parseOpenApiRoutes` through the existing
`parseRoutes` dispatch, with `language === 'OPENAPI'`.

#### Scenario: a blueapi operation is produced

- **WHEN** a blueapi operation is produced
- **THEN** no new OpenAPI parser may be written, and the operation MUST be
  produced by the existing `parseOpenApiRoutes` through the existing
  `parseRoutes` dispatch, with `language === 'OPENAPI'`

### Requirement: minimum recovered operations

At least 591 `alphauslabs/blueapi` operations MUST be recovered, each
carrying an HTTP verb, its exact path template, and a distinct
`operationId`. No path may be collapsed to `/`.

#### Scenario: blueapi operations are recovered

- **WHEN** `alphauslabs/blueapi` operations are recovered
- **THEN** at least 591 MUST be recovered, each carrying an HTTP verb, its exact
  path template, and a distinct `operationId`, and no path may be collapsed to `/`

### Requirement: in-document response schema resolution

`responses[code].schema.$ref` MUST be resolved against the same document's
`definitions` block, in-document only. At least 400 response contracts MUST
be mechanically bound from the available definitions.

#### Scenario: response schemas are bound

- **WHEN** `responses[code].schema.$ref` is resolved
- **THEN** it MUST be resolved against the same document's `definitions` block,
  in-document only, and at least 400 response contracts MUST be mechanically
  bound from the available definitions

### Requirement: every ref resolution outcome reported

Every `$ref` resolution outcome MUST be reported, never dropped:
`RESOLVED`, `REF_MALFORMED` (non-local reference), `DEFINITION_MISSING`
(absent name) and `DEFINITION_UNSAFE` (unsafe name), each surfacing as an
`OPENAPI_RESPONSE_DEFINITION` join whose state is `PROVEN` only when
resolved.

#### Scenario: a ref resolution outcome occurs

- **WHEN** a `$ref` resolution yields `RESOLVED`, `REF_MALFORMED` (non-local
  reference), `DEFINITION_MISSING` (absent name) or `DEFINITION_UNSAFE` (unsafe
  name)
- **THEN** the outcome MUST be reported, never dropped, each surfacing as an
  `OPENAPI_RESPONSE_DEFINITION` join whose state is `PROVEN` only when resolved

### Requirement: generated-root evidence classification

Evidence from a generated root MUST be classed `SOURCE_FACT` with a
`GENERATED_ARTIFACT` qualifier, attached to every surface derived from it.
A non-generated root MUST remain `DIRECT_SOURCE`.

#### Scenario: evidence derives from a generated or non-generated root

- **WHEN** evidence derives from a generated root or a non-generated root
- **THEN** generated-root evidence MUST be classed `SOURCE_FACT` with a
  `GENERATED_ARTIFACT` qualifier attached to every surface derived from it, and a
  non-generated root MUST remain `DIRECT_SOURCE`

### Requirement: generation-currency check

A generation-currency check against the proto surface MUST exist and MUST
NOT treat an unestablished relationship as current: absent, duplicated,
malformed, or differently-snapshotted corroboration MUST all yield
`UNKNOWN`; a count divergence MUST yield `STALE`; only a single
corroboration at the exact snapshot with a matching operation count may
yield `CURRENT`.

#### Scenario: corroboration against the proto surface is evaluated

- **WHEN** corroboration is absent, duplicated, malformed, or
  differently-snapshotted, a count divergence exists, or a single corroboration
  sits at the exact snapshot with a matching operation count
- **THEN** the absent, duplicated, malformed, or differently-snapshotted cases
  MUST all yield `UNKNOWN`, a count divergence MUST yield `STALE`, and only the
  exact-snapshot single corroboration with a matching operation count may yield
  `CURRENT`

### Requirement: generated-artifact sole evidence barred

`GENERATED_ARTIFACT` evidence MUST be mechanically barred from being the
sole basis of a production admission. The decision type MUST have no
`GRANTED` member; `GENERATED_ARTIFACT` without a `DIRECT_SOURCE` witness
MUST deny with `GENERATED_ARTIFACT_SOLE_EVIDENCE` even when currency is
`CURRENT`; `UNKNOWN` and `STALE` currency MUST each deny independently.

#### Scenario: production admission rests on generated-artifact evidence

- **WHEN** `GENERATED_ARTIFACT` evidence is offered as the sole basis of a
  production admission without a `DIRECT_SOURCE` witness
- **THEN** it MUST deny with `GENERATED_ARTIFACT_SOLE_EVIDENCE` even when
  currency is `CURRENT`, `UNKNOWN` and `STALE` currency MUST each deny
  independently, and the decision type MUST have no `GRANTED` member

### Requirement: no operation identity eviction

Every pre-C-02a operation identity MUST remain present. Admitting the
earlier-sorting `alphauslabs/blueapi` MUST NOT evict a single
`mobingilabs/ripple-api` operation: `droppedOperations` MUST be 0 for
every repository.

#### Scenario: blueapi is admitted without eviction

- **WHEN** the earlier-sorting `alphauslabs/blueapi` is admitted
- **THEN** every pre-C-02a operation identity MUST remain present, not a single
  `mobingilabs/ripple-api` operation may be evicted, and `droppedOperations` MUST
  be 0 for every repository

### Requirement: completeness remains truthful

Completeness MUST remain truthful after the population expansion: while
file enumeration is bounded, `state` MUST remain `UNKNOWN`,
`totalOperations` MUST remain `null`, and `remainingUnknown` MUST remain
`true`. No expansion may manufacture a `COMPLETE` claim.

#### Scenario: the population expands

- **WHEN** the population expands while file enumeration is bounded
- **THEN** `state` MUST remain `UNKNOWN`, `totalOperations` MUST remain `null`,
  and `remainingUnknown` MUST remain `true`, and no expansion may manufacture a
  `COMPLETE` claim

### Requirement: scope bounds of C-02a

C-02a MUST NOT implement a protobuf parser, `blueinternal` admission,
C-05, C-03 topology, C-06 read-only proof, or `PROD_OBSERVE`, and MUST NOT
contact DEV, NEXT, or production.

#### Scenario: C-02a scope is inspected

- **WHEN** C-02a is implemented
- **THEN** it MUST NOT implement a protobuf parser, `blueinternal` admission,
  C-05, C-03 topology, C-06 read-only proof, or `PROD_OBSERVE`, and MUST NOT
  contact DEV, NEXT, or production
