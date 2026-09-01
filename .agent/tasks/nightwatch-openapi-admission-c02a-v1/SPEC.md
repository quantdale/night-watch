# SPEC.md

**Task:** nightwatch-openapi-admission-c02a-v1
**Campaign:** C-02a — OpenAPI admission
**Objective:** Admit `openapiv2` as an approved root of the already-admitted
`alphauslabs/blueapi` repository, recover its committed generated Swagger
artifact through the EXISTING `parseOpenApiRoutes` machinery, bind
`$ref` → `definitions` response contracts, and classify the resulting evidence
as `SOURCE_FACT (GENERATED_ARTIFACT)` with an explicit generation-currency
check that fails closed and can never solely grant a production admission.

**Scope:**

- `APPROVED_ROOTS['alphauslabs/blueapi']` gains exactly one root: `openapiv2`.
- `$ref` → Swagger `definitions` response binding inside the existing OpenAPI
  branch of `parseRoutes`.
- A generated-artifact evidence qualifier, a proto-surface generation-currency
  check, and a deny-only production-admission evidence gate.
- Focused regressions covering admission, extraction, binding, provenance,
  currency, the production bar, and the C-01 invariants.

**Non-goals:**

- No new OpenAPI parser. No protobuf parser (C-02b).
- No `alphauslabs/blueinternal` admission; no C-05.
- No Go/gRPC topology (C-03); no C-06 read-only proof; no `PROD_OBSERVE`.
- No DEV, NEXT, or production contact; no auth refresh; no credential or
  customer-data inspection.
- No sibling-repository writes; no database, cloud, IAM, or Kubernetes access.

**Safety constraints:**

- Company repositories are READ-ONLY source inputs, reached only through the
  existing confined `SiblingSourceAccess` boundary.
- Every pre-C-02a operation identity must survive unchanged.
- An earlier-sorting `alphauslabs/blueapi` must not evict Ripple operations.
- Truncation and completeness reporting must remain truthful; no silent
  projection loss.
- Generated-artifact evidence may deny authority and may never grant it.
- All work happens in the owned C-00 session worktree; the canonical checkout
  is never used for implementation.

**Acceptance criteria:**

- `blueapi/openapiv2` admitted; every other `blueapi` root stays unapproved.
- Unapproved repositories still fail closed; `blueinternal` remains outside
  the universe.
- ≥ 591 `blueapi` operations extracted through `parseOpenApiRoutes`, each with
  verb, path and `operationId`.
- ≥ 400 response contracts mechanically bound from the available generated
  `definitions`; malformed and unresolvable `$ref`s reported, never dropped.
- Every generated surface carries `SOURCE_FACT (GENERATED_ARTIFACT)`
  provenance with an explicit generation-currency state.
- `GENERATED_ARTIFACT` alone is mechanically barred from being the sole basis
  of a production admission.
- All pre-C-02a operation identities present; no-eviction and
  completeness-truth regressions green.
- Full validation stack green: typecheck, full regression, `gate:local`, clean
  Node 20 gate.

**Deliverables:**

- Implementation in the owned C-02a worktree.
- `tests/unit/c02aOpenApiAdmission.test.ts`.
- Truthful continuity-v2 SPEC / PLAN / STATE / REPORT.
- Updated durable docs where C-02a changes recorded project truth.
- Validated commit integrated through C-00 tooling.

**## Declared Deletions:**

NONE
