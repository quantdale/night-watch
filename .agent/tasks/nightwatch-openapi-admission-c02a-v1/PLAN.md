# Plan

## Purpose

The highest-yield parser in Nightwatch was one allowlist entry away from being
reachable. `parseOpenApiRoutes` already existed and was already exercised;
`APPROVED_ROOTS['alphauslabs/blueapi']` simply did not contain `openapiv2`, so
the committed generated Swagger artifact — 462 paths, 591 verb-bound
operations, 1,179 `definitions` — was never read. C-02a admits that one root,
teaches the existing parser to resolve its own in-document `$ref`s, and marks
the resulting evidence as generated so it can never be mistaken for a
production-admission witness.

## Starting State

Measured read-only at `c64b56fff1237c489982a9d6cece7adea83c6387`:

- `APPROVED_ROOTS['alphauslabs/blueapi'] = ['billing']`. The scan visited
  `alphauslabs/blueapi` and rejected its single candidate file as
  `SOURCE_LANGUAGE_UNSUPPORTED`; `admittedFileCount: 0`.
- Whole-population operation projection: `223`, all from
  `mobingilabs/ripple-api`; `responseContracts: 58`.
- `parseOpenApiRoutes` read a non-standard `x-response-schema` key and never
  looked at `responses[code].schema.$ref`.
- `SAFE_ROUTE_RE` rejected `&`, which the gRPC-gateway custom-method template
  `/v1/invoice/{date}:create&savesettings` requires.
- No evidence-class vocabulary existed: every surface was implicitly direct
  source, and nothing distinguished a generated mirror from hand-written code.

## Scope

- One data-only root admission.
- In-document `$ref` → `definitions` response binding.
- Generated-artifact provenance, generation currency, production-admission
  denial.
- Focused regressions and one measured whole-population census.

## Non-Goals

- C-02b protobuf source intelligence.
- C-05 universe discovery and `blueinternal` admission.
- C-03 Go/gRPC topology, C-06 read-only proof, `PROD_OBSERVE`.

## Safety Constraints

- Company repositories are READ-ONLY source inputs, reached only through the
  existing confined `SiblingSourceAccess` boundary. No sibling repository is
  written, annotated, or modified.
- No DEV, NEXT, or production contact; no auth refresh; no credential,
  cookie, token, or customer-data inspection; no datastore, cloud, IAM, or
  Kubernetes access; no publication.
- Every pre-C-02a operation identity must survive byte-identical.
- An earlier-sorting `alphauslabs/blueapi` must not evict Ripple operations.
- Truncation and completeness reporting stays truthful; no silent projection
  loss and no manufactured COMPLETE claim.
- Generated-artifact evidence may deny authority and may never grant it.
- `src/core/source/generatedArtifact.ts` is data-only policy with no
  filesystem, process, or network authority.
- All implementation happens in the owned C-00 session worktree.

## Architecture / Approach

Three concerns are deliberately kept apart rather than fused into one
"trustworthiness" score:

1. **Evidence qualifier** — `DIRECT_SOURCE` vs `GENERATED_ARTIFACT`. A pure
   function of repository plus first path segment, driven by one frozen
   data table. It says what the file *is*.
2. **Generation currency** — `CURRENT | STALE | UNKNOWN` against the proto
   surface, derived from an explicit corroboration record carrying its own
   snapshot SHA. It says whether the mirror is *fresh*, and answers UNKNOWN
   whenever it cannot answer honestly.
3. **Production-admission effect** — a `DENIED | NOT_DENIED_BY_EVIDENCE_CLASS`
   decision with no `GRANTED` member in the type. It says what the first two
   are allowed to *authorize*, and structurally cannot authorize anything.

On the parser side there is no second OpenAPI implementation. The existing
`parseOpenApiRoutes` gains in-document `$ref` resolution against the same
document's `definitions` block; the binding results ride the existing
`ParsedRoute` and become an `OPENAPI_RESPONSE_DEFINITION` join and, when
resolved, a response contract on the existing `SourceContractEvidence`. The
bindings reach `contractEvidence` through a `Map` keyed on the operation
object, so `SourceOperationDescriptor` — and therefore every `operationId` —
is untouched.

## Milestones

- **M1 — Root admission.** `APPROVED_ROOTS['alphauslabs/blueapi']` becomes
  `['billing', 'openapiv2']`, with the reasoning that this is a per-root change
  inside an existing member of the universe recorded in the source.
  *Status:* COMPLETE.
- **M2 — Generated-artifact evidence module.** New
  `src/core/source/generatedArtifact.ts`: evidence qualifier classification,
  proto-surface corroboration record and registry, generation-currency
  evaluation, deny-only production-admission gate, and the per-surface
  provenance builder.
  *Status:* COMPLETE.
- **M3 — `$ref` → `definitions` binding.** `parseOpenApiRoutes` resolves each
  `responses[code].schema.$ref` against the document's own `definitions`,
  emitting `RESOLVED | REF_MALFORMED | DEFINITION_MISSING | DEFINITION_UNSAFE`.
  Bindings become `OPENAPI_RESPONSE_DEFINITION` joins and, when resolved, an
  in-document response contract that does not require a handler symbol.
  *Status:* COMPLETE.
- **M4 — Descriptor and counter surfacing.** Descriptor schema advances
  `v3 → v4` with a `sourceEvidence` provenance block; `SourceContractEvidence`
  carries `responseDefinitions`; discovery counters gain
  `generatedArtifactOperations`, `openApiResponseDefinitionsBound`,
  `openApiResponseDefinitionsUnresolved`.
  *Status:* COMPLETE.
- **M5 — Focused regressions.** `tests/unit/c02aOpenApiAdmission.test.ts`,
  18 cases across admission, classification, currency, the production bar,
  binding failure modes, the real artifact, and the C-01 invariants.
  *Status:* COMPLETE.
- **M6 — Measured population and durable truth.** Whole-population census
  re-measured; `docs/CURRENT_STATE.md`, `docs/DECISIONS.md`, `docs/ROADMAP.md`
  and the master-plan task list reconciled to the measured numbers.
  *Status:* COMPLETE.
- **M7 — Full validation and integration.** Full regression, `gate:local`,
  clean Node 20 gate, then integration through C-00 tooling.
  *Status:* COMPLETE.

## Validation Strategy

- `npx tsc --noEmit` for the whole repository including tests.
- A focused suite, `tests/unit/c02aOpenApiAdmission.test.ts`, covering root
  admission, confinement, `blueinternal` exclusion, evidence classification,
  all five generation-currency outcomes, the production-admission bar, the
  three `$ref` failure modes, and — against the real sibling checkouts — the
  591-operation extraction, the response-binding floor, and the C-01
  no-eviction and completeness invariants.
- A real read-only whole-population census before and after, compared
  identity-by-identity.
- The full canonical Playwright regression, `npm run gate:local`, and the
  clean Node 20 `npm run gate:clean`.

## Decision Log

Recorded in full in `STATE.md` under "Decisions Made During This Task", and
durably as D-106 in `docs/DECISIONS.md`.

## Discoveries

Recorded in `STATE.md` under "Discoveries".

## Deferred Work

- **C-02b owns generation currency.** The corroboration registry
  (`PROTO_SURFACE_CORROBORATIONS`) is deliberately empty, so every generated
  surface reports `UNKNOWN` currency. C-02b supplies the proto-surface
  operation count that turns `UNKNOWN` into `CURRENT` or `STALE`. The check,
  its states, and its denial effects are implemented and tested now; only the
  input is absent.
- **Size headroom.** The artifact is 1,435,500 of 2,000,000 `maxFileBytes`
  (72 %). Growth past the ceiling flips it to `SOURCE_FILE_TOO_LARGE`. Under
  C-01 that is now a visible rejection rather than a silent cliff, but the
  headroom itself is unchanged and is not C-02a's to raise.
- **`blueinternal/openapiv2`** (~57 operations) remains claimed by C-05.

## Completion Criteria

Every acceptance criterion in `SPEC.md` is met and mechanically evidenced in
`REPORT.md`; the full validation stack is green; the work is integrated
through C-00 tooling with `HEAD == origin/main`, a clean canonical checkout,
a closed session worktree, and a `main`-only remote topology.
