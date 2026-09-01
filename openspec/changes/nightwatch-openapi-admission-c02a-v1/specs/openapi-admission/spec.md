# Requirements — OpenAPI Admission (C-02a)

1. `APPROVED_ROOTS['alphauslabs/blueapi']` MUST be exactly
   `['billing', 'openapiv2']`. No other `alphauslabs/blueapi` root may become
   readable, and an unapproved repository MUST continue to fail closed with
   `REAL_SOURCE_SCAN_APPROVED_UNIVERSE`.
2. `alphauslabs/blueinternal` MUST remain absent from
   `PHASE25_APPROVED_REPOSITORY_IDS` and MUST NOT be added to
   `RIPPLE_REPOSITORIES`. Its admission is a REPOSITORY admission reserved for
   C-05.
3. No new OpenAPI parser may be written. Every blueapi operation MUST be
   produced by the existing `parseOpenApiRoutes` through the existing
   `parseRoutes` dispatch, with `language === 'OPENAPI'`.
4. At least 591 `alphauslabs/blueapi` operations MUST be recovered, each
   carrying an HTTP verb, its exact path template, and a distinct
   `operationId`. No path may be collapsed to `/`.
5. `responses[code].schema.$ref` MUST be resolved against the same document's
   `definitions` block, in-document only. At least 400 response contracts MUST
   be mechanically bound from the available definitions.
6. Every `$ref` resolution outcome MUST be reported, never dropped:
   `RESOLVED`, `REF_MALFORMED` (non-local reference), `DEFINITION_MISSING`
   (absent name) and `DEFINITION_UNSAFE` (unsafe name), each surfacing as an
   `OPENAPI_RESPONSE_DEFINITION` join whose state is `PROVEN` only when
   resolved.
7. Evidence from a generated root MUST be classed `SOURCE_FACT` with a
   `GENERATED_ARTIFACT` qualifier, attached to every surface derived from it.
   A non-generated root MUST remain `DIRECT_SOURCE`.
8. A generation-currency check against the proto surface MUST exist and MUST
   NOT treat an unestablished relationship as current: absent, duplicated,
   malformed, or differently-snapshotted corroboration MUST all yield
   `UNKNOWN`; a count divergence MUST yield `STALE`; only a single
   corroboration at the exact snapshot with a matching operation count may
   yield `CURRENT`.
9. `GENERATED_ARTIFACT` evidence MUST be mechanically barred from being the
   sole basis of a production admission. The decision type MUST have no
   `GRANTED` member; `GENERATED_ARTIFACT` without a `DIRECT_SOURCE` witness
   MUST deny with `GENERATED_ARTIFACT_SOLE_EVIDENCE` even when currency is
   `CURRENT`; `UNKNOWN` and `STALE` currency MUST each deny independently.
10. Every pre-C-02a operation identity MUST remain present. Admitting the
    earlier-sorting `alphauslabs/blueapi` MUST NOT evict a single
    `mobingilabs/ripple-api` operation: `droppedOperations` MUST be 0 for
    every repository.
11. Completeness MUST remain truthful after the population expansion: while
    file enumeration is bounded, `state` MUST remain `UNKNOWN`,
    `totalOperations` MUST remain `null`, and `remainingUnknown` MUST remain
    `true`. No expansion may manufacture a `COMPLETE` claim.
12. C-02a MUST NOT implement a protobuf parser, `blueinternal` admission,
    C-05, C-03 topology, C-06 read-only proof, or `PROD_OBSERVE`, and MUST NOT
    contact DEV, NEXT, or production.
