# Design: Strict Durable Dossier Validation and Conservative Findings Truth

## Design principles

1. Runtime JSON is unknown until proven valid.
2. TypeScript casts are not validation.
3. The artifact facade owns durable acceptance; later consumers are defense in depth.
4. Historical schema compatibility means accepting valid historical shapes, not accepting malformed values.
5. Operator-facing currentness must be no stronger than the weakest required currentness fact.
6. A projection layer must not become a second domain authority.
7. Validation must remain pure, deterministic, bounded, privacy-safe, and non-executing.

## Component A — dossier v1/v2 runtime validators

Build strict reusable validators for the complete persisted dossier shape. Prefer small composable helpers over one monolithic function.

The validators must cover at least:

- root object and prototype
- exact allowed root keys per historical version/status
- schemaVersion and status
- candidateId format
- title type and boundedness
- firstObserved / lastObserved timestamp syntax and ordering when both are present
- journeys and seeds array shape, boundedness, safe identifiers, uniqueness where producer semantics require it
- minimalSequence structure
- routeClass and apiOperationFamily
- oracleFingerprint format
- evidenceLevel and L4 exclusion
- l4Datastore frozen value
- reproduction object: exact keys, result vocabulary, count bounds, minimality guarantee, and derivable coherence
- browserApiDifferential structure and vocabulary
- sourceChangeCandidates array and every SourceChangeCandidate field
- likelyFaultBoundary structure and vocabulary
- confidence structure and vocabulary
- semanticConfidence when present in v2
- technicalSeverity and triagePriority vocabulary
- knownNightwatchDefect
- alternativesRuledOut and missingEvidence list shape/bounds
- semanticEvidence and semanticTriageEvidence using their owning validators
- humanReproductionRecipe v2 structure
- aiReady v2 structure
- safety and privacy complete exact runtime shapes

Use existing owning-module constants and runtime helpers wherever possible. Do not fork vocabulary literals if the owner already exports them.

### SourceChangeCandidate validation

Each candidate must have the full frozen shape expected by the relevant dossier schema. Validate:

- repoId
- path
- edgeId optional/null semantics
- relevance vocabulary
- confidence vocabulary
- sourceFreshness vocabulary
- bounded reason / claim categorical semantics
- exact keys if the persisted schema is frozen

Reject unknown freshness values, missing required fields, non-array sourceChangeCandidates, unsafe strings, prototypes, excessive list sizes, and other malformed structures.

### Cross-field invariants

Only enforce invariants mechanically derivable from the artifact itself or existing owning-module contracts.

Examples:

- READY cannot carry an internally unresolved shape when the current producer contract already requires a terminal reproduced result.
- count fields are non-negative safe integers and agree with immediately derivable list cardinality when such a relation is part of the frozen format.
- candidate/source metadata must not contradict its own categorical state.
- firstObserved must not be after lastObserved.
- v2 UNRESOLVED remains readable if it is a valid historical v2 shape.

Do not invent new semantic requirements that would invalidate legitimate historical producer outputs.

## Component B — artifact validation identity and compatibility

The accepted dossier wire versions should remain v1 and v2 unless the wire shape itself changes. Tightening runtime validation of already-required fields does not automatically require dossier v3.

However the artifact validation facade's behavior changes materially. Audit all version fingerprints and currentness identities that include ARTIFACT_VALIDATION_FACADE_VERSION or equivalent.

If the facade version is part of a load-bearing execution fingerprint, bump it deliberately and update:

- version fingerprints
- hardening guards
- compatibility tests
- expected campaign/runtime identities
- documentation

Do not bump unrelated source analyzers, semantic contracts, replay schemas, or dossier schemas.

## Component C — false-accept mutation harness

Create a reusable deterministic mutation harness starting from producer-built valid artifacts.

For dossiers, mutate one field at a time:

- delete field
- unknown root/nested field
- primitive/object/array type swap
- invalid enum
- negative / fractional / excessive count
- malformed id/digest/timestamp
- duplicate array members where uniqueness is contractual
- malformed nested prototype when testable in-memory
- source freshness mutations
- cross-field contradiction
- sentinel/private payload mutation

For each mutation, assert:

- the owning validator rejects
- validateArtifact rejects
- rejection reason is bounded/categorical and contains no raw private input
- input object is not mutated

Avoid brittle tests that merely assert one exact long error string unless that code is part of the public durable contract.

## Component D — facade-wide bounded audit

The dossier hole is evidence that typed-assumption risk may exist elsewhere. Audit every registered durable artifact kind in ARTIFACT_KIND_VERSION_ACCEPTANCE.

For each kind:

1. identify the owning producer
2. identify the owning validator
3. identify nested typed structures
4. check whether unknown JSON can bypass runtime checks
5. add at least one high-value mutation probe per nested authority-bearing structure
6. reproduce before changing behavior

If another false accept is found in a pure/local validator, fix it in this campaign only when:

- the owning schema is unambiguous
- the fix does not add external authority
- the compatibility impact is bounded
- focused + full regression can prove it

If a false accept requires a schema redesign or ambiguous historical migration, fail closed at the consumer, document it in REPORT.md, and create a follow-up recommendation rather than guessing.

## Component E — one conservative finding-currentness reducer

Eliminate the duplicated ANY-current implementation.

The normal architecture should be:

validated durable dossier
-> findings authority
-> sanitized FindingsDossierMetadata
-> findings adapter
-> public DTO

The adapter should not reinterpret raw durable evidence if the authority has already projected currentness.

If direct raw-dossier adapter support is genuinely required by a non-test consumer, use one shared pure reducer owned outside the presentation layer.

### Required reducer semantics

For a whole-dossier freshness list, unless owning semantics prove a stricter distinction:

- empty => SOURCE_UNAVAILABLE
- any UNKNOWN => SOURCE_UNAVAILABLE
- otherwise any LOCAL_TRACKING_REF_ONLY => SOURCE_STALE
- otherwise if every value is SOURCE_CURRENT_LOCALLY or REMOTE_FRESHNESS_CONFIRMED => CURRENT
- anything malformed => reject the dossier before reduction

Mixed examples:

- current + remote-confirmed => CURRENT
- current + stale => SOURCE_STALE
- remote-confirmed + stale => SOURCE_STALE
- current + unknown => SOURCE_UNAVAILABLE
- stale + unknown => SOURCE_UNAVAILABLE

### Relevance/confidence nuance

correlateSourceChanges can mark a candidate relevance UNKNOWN / confidence UNRESOLVED when dependency-edge/source-map freshness is unresolved while preserving the input sourceFreshness value.

The executor must decide, from existing owning semantics, whether the Control Center field sourceCurrentness means only checkout/source freshness or means total source-evidence currentness.

Do not silently overload the term.

If the field is intentionally freshness-only:

- keep relevance/confidence separate
- document the distinction
- do not call an unresolved correlation a stronger causal proof

If the field is intended as total source-evidence currentness:

- make unresolved relevance/confidence fail closed in the reducer
- update tests/docs explicitly

## Component F — authority/projection differential checks

For equivalent valid input:

- normal findingsAuthority -> FindingsDossierMetadata -> adapter path
- any retained direct raw-dossier adapter path

must produce the same public sourceCurrentness, dossierStatus, evidence level, confidence, reproduction category, and provenance digest inputs.

Add permutation tests for source freshness order. Reordering sourceChangeCandidates must not change currentness.

Add malformed-artifact tests proving:

- authority snapshot becomes UNKNOWN / partial corruption as designed
- malformed artifact is not returned as a valid dossier metadata row
- other valid dossiers may remain visible only with explicit UNKNOWN collection state
- public response contains no raw path, source text, reason text, sentinel, or private field

## Component G — Control Center UI/browser qualification

No UI redesign is needed. Verify that the existing Findings view faithfully renders:

- SOURCE_STALE
- SOURCE_UNAVAILABLE
- CURRENT only for fully supported currentness
- collection UNKNOWN when partial corruption exists

A synthetic built-server browser test should cover at least one non-CURRENT finding and ensure no fallback text turns it into CURRENT/READY.

SSE remains advisory. GET snapshots remain authority.

## Component H — full acceptance and drift classification

Before edits capture:

- artifact validation focused tests
- findings authority/adapter tests
- Control Center server/contracts/snapshot tests
- UI tests/build
- project/typecheck/hardening
- current skip inventory
- current version identities

After each workstream classify changes:

- INTENTIONAL_VALIDATION_TIGHTENING
- INTENTIONAL_CURRENTNESS_CORRECTION
- EXPECTED_VALIDATION_VERSION_INVALIDATION
- UNEXPLAINED_DRIFT

Unexplained drift is a stop-and-investigate condition.

## Architecture boundaries

Keep:

- PrivateArtifactStore as filesystem policy authority
- artifactValidation facade as durable semantic acceptance authority
- triage dossier modules as dossier schema owners
- findingsAuthority as owner-local finding metadata authority
- findingsAdapter as a projection-only layer
- snapshotCoordinator as freshness/cache lifecycle authority
- Control Center server as loopback read-only transport
- Phase 24 as campaign eligibility authority

Do not create a new persistence store, selector, or operator command path.

## Performance and bounds

Validation is CPU-local and artifacts are already size-bounded at read boundaries. Still:

- maintain explicit max lengths/counts for newly traversed arrays/strings
- do not recursively traverse arbitrary object graphs without depth/shape limits
- mutation corpus must be deterministic and bounded
- measure focused validation runtime before/after if the validator becomes materially larger
- no disk cache is needed

## External CI

At final exact head, observe GitHub Actions at most once if repository policy requires it. A run with zero/null steps remains an external billing/platform block and is not green evidence.
