# Tasks — OpenAPI Admission (C-02a)

- [x] M1 admit exactly one root: `APPROVED_ROOTS['alphauslabs/blueapi']`
      becomes `['billing', 'openapiv2']`; every other blueapi root stays
      unapproved; `alphauslabs/blueinternal` is not added and remains outside
      `RIPPLE_REPOSITORIES` behind C-05
- [x] M2 new data-only `src/core/source/generatedArtifact.ts` holding three
      separable facts: evidence qualifier (`DIRECT_SOURCE` |
      `GENERATED_ARTIFACT`), generation currency against the proto surface
      (`CURRENT` | `STALE` | `UNKNOWN`) with an explicit corroboration record,
      and a `DENIED | NOT_DENIED_BY_EVIDENCE_CLASS` production-admission gate
      with no `GRANTED` member by construction
- [x] M3 in-document `$ref` → `definitions` binding inside the existing
      OpenAPI branch of `parseRoutes`; zero new parsers; `RESOLVED`,
      `REF_MALFORMED`, `DEFINITION_MISSING`, `DEFINITION_UNSAFE` each reported
      as an `OPENAPI_RESPONSE_DEFINITION` join
- [x] M4 surfacing: descriptor `v3 → v4` with a `sourceEvidence` provenance
      block, `SourceContractEvidence.responseDefinitions`, and the counters
      `generatedArtifactOperations`, `openApiResponseDefinitionsBound`,
      `openApiResponseDefinitionsUnresolved`
- [x] M5 focused regressions in `tests/unit/c02aOpenApiAdmission.test.ts`
      covering admission, confinement, `blueinternal` exclusion, all five
      currency outcomes, the production bar, the three `$ref` failure modes,
      the real 591-operation extraction, and the C-01 invariants
- [x] M6 measured whole-population census and durable-truth reconciliation
      (`docs/CURRENT_STATE.md`, `docs/DECISIONS.md` D-106, `docs/ROADMAP.md`,
      master-plan `tasks.md`)
- [x] M7 full validation stack and integration through C-00 tooling
