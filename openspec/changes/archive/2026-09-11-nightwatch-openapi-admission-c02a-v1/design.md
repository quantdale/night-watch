# Design — OpenAPI Admission (C-02a)

## Problem

Three distinct properties of a committed generated artifact were being
conflated by the absence of any vocabulary for them:

- **What the file is.** A generated Swagger mirror is not hand-written source,
  but it is still committed, exact and mechanically parseable. Both
  "ordinary source" and "less than source" are wrong answers.
- **Whether the mirror is fresh.** Its relationship to the protos is
  established only by running the generator. Nightwatch had no way to say
  "I cannot establish this" other than saying nothing.
- **What either fact may authorize.** Without an explicit gate, a stale mirror
  could eventually justify a production read.

Separately, `parseOpenApiRoutes` read a non-standard `x-response-schema` key
instead of `responses[code].schema.$ref`, so the 1,179 machine-readable
definitions sitting in the same document were never used, and
`responseEvidence` required `handlerState === 'PROVEN'` — which a generated
Swagger document, having no handler symbol, can never satisfy.

## Approach

`src/core/source/generatedArtifact.ts` keeps the three properties in three
separate types:

1. `SourceEvidenceQualifier` — a pure function of repository plus first path
   segment over one frozen table. No I/O, no state.
2. `GenerationCurrency` — derived only from a `ProtoSurfaceCorroboration`
   carrying its own snapshot SHA. Absent, duplicated, malformed, or
   differently-snapshotted corroboration all yield `UNKNOWN`. Only a single
   record at the same SHA with a matching operation count yields `CURRENT`;
   a count divergence yields `STALE`.
3. `ProductionAdmissionEvidenceDecision` — `DENIED |
   NOT_DENIED_BY_EVIDENCE_CLASS`. There is no `GRANTED` member, so the gate is
   structurally incapable of granting. `GENERATED_ARTIFACT` with no
   `DIRECT_SOURCE` witness denies even at `CURRENT`; `UNKNOWN` and `STALE`
   each deny independently.

The corroboration registry is empty because C-02b owns the proto surface. The
check, its states and its denial effects ship now; only its input is deferred.

On the parser side the OpenAPI branch resolves each response `$ref` against
the same document's `definitions`, strictly in-document. Resolved bindings
prove the response contract through a separate, explicitly labelled
`OPENAPI_RESPONSE_DEFINITION` proof path rather than weakening the
handler-analyzer requirement. Bindings travel from parsed route to contract
through a `Map` keyed on the operation object, so `SourceOperationDescriptor`
is untouched and every pre-C-02a `operationId` and `surfaceId` is unchanged.

## Alternatives rejected

- A single scalar "trust score" fusing class, currency and admission effect:
  would have made the deny-only property unprovable.
- Weakening `responseEvidence`'s handler requirement so generated operations
  reuse the analyzer path: would have blurred two genuinely different kinds of
  proof.
- Admitting `blueinternal/openapiv2` at the same time: a REPOSITORY admission,
  which is C-05's.
