# REPORT.md — C-02a OpenAPI admission

Task ID: nightwatch-openapi-admission-c02a-v1
Phase: OPENAPI_ADMISSION_C02A_V1
Status: COMPLETE
Starting SHA: c64b56fff1237c489982a9d6cece7adea83c6387
Last validated implementation SHA: 6a70061729b224a78eeaced009149457bf75cb5b
Branch: session/nightwatch-openapi-admission-c02-602bf4e2
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## What changed and why

The highest-yield route parser in Nightwatch was already written, already
tested, and already unreachable. `parseOpenApiRoutes` existed; the reason it
never produced an operation is that `APPROVED_ROOTS['alphauslabs/blueapi']`
listed only `billing`, so the scan visited the repository, found one candidate
file, and rejected it as `SOURCE_LANGUAGE_UNSUPPORTED`. C-02a admits one more
root.

1. **Root admission** (`src/core/source/approvedScan.ts`).
   `alphauslabs/blueapi` roots become `['billing', 'openapiv2']`. This is a
   per-root change inside an existing member of `RIPPLE_REPOSITORIES`.
   `alphauslabs/blueinternal` is *not* a member at all, so admitting it would
   be a REPOSITORY admission — that is C-05's, and it is untouched here.

2. **`$ref` → `definitions` binding** (`src/core/source/surfaces.ts`). The
   OpenAPI branch of the existing parser now resolves each
   `responses[code].schema.$ref` against the same document's `definitions`
   block. Resolution is strictly in-document: a non-local reference is
   `REF_MALFORMED`, an absent name is `DEFINITION_MISSING`, an unsafe name is
   `DEFINITION_UNSAFE`. Nothing is fetched, and no failure is silent — each
   binding becomes an `OPENAPI_RESPONSE_DEFINITION` join carrying its own
   state. Zero new parsers were written.

3. **Generated-artifact evidence** (`src/core/source/generatedArtifact.ts`,
   new). Data-only policy with no filesystem, process, or network authority,
   holding three separable facts: the evidence qualifier
   (`DIRECT_SOURCE` | `GENERATED_ARTIFACT`), generation currency against the
   proto surface (`CURRENT` | `STALE` | `UNKNOWN`), and a production-admission
   decision that is `DENIED | NOT_DENIED_BY_EVIDENCE_CLASS` — a type with no
   `GRANTED` member, so no caller can read a grant out of it.

4. **Surfacing.** `RealSourceSurfaceDescriptor` advances `v3 → v4` with a
   `sourceEvidence` provenance block; `SourceContractEvidence` carries
   `responseDefinitions`; discovery counters gain
   `generatedArtifactOperations`, `openApiResponseDefinitionsBound` and
   `openApiResponseDefinitionsUnresolved`.

`SourceOperationDescriptor` was deliberately left untouched. Definition
bindings travel from parsed route to contract through a `Map` keyed on the
operation object, so every `operationId` and every `surfaceId` is unchanged.

One further change was required and is justified in source: `SAFE_ROUTE_RE`
now admits `&`. Exactly one real path,
`/v1/invoice/{date}:create&savesettings` — a gRPC-gateway custom-method
template — was otherwise collapsed to `/` and marked
`SOURCE_SYNTAX_UNSUPPORTED`. Widening the class can only promote a
previously-unsupported template to an exact one, and the widening is proven
inert: all 223 pre-C-02a operation identities are unchanged.

## Measured result

Real read-only census over the approved universe
(`alphauslabs/blueapi@691422e5dc81afd263d064986fb50fcb3ea432a9`,
`mobingilabs/ripple-api@27bb007ad0c798800b6bd3b29760c966422966e7`):

| Metric | Pre-C-02a | Post-C-02a |
|---|---|---|
| operations projected | 223 | **814** |
| `mobingilabs/ripple-api` | 223 | 223 |
| `alphauslabs/blueapi` | 0 | **591** |
| operations dropped | 0 | **0** |
| `routeProofs` | 222 | 813 |
| `requestContracts` | 222 | 813 |
| `responseContracts` | 58 | **649** |
| files considered / read / admitted | 1732 / 1092 / 1078 | 1733 / 1093 / 1079 |
| bytes read | 12,449,877 | 13,885,377 |

`223 + 591 = 814` exactly. The expected broad shape holds with no deviation to
explain: there is no deduplication, because the generated artifact contributes
591 distinct `(verb, path)` identities in a repository that previously
contributed none, and no Ripple identity collides with a `blueapi` one.

Response-contract recovery, stated in both defensible readings:

- **970** individual response contracts bound through in-document
  `definitions` (591 `default` + 379 `200`), with **0** unresolved.
- **591** operations reaching `responseProof: PROVEN` through those bindings.

Both clear the ≥ 400 floor. The narrower "operations declaring a `200`
schema" reading is 379 and would not; it is reported here so the number is not
quietly chosen to fit the target.

## Acceptance criteria

| Criterion | Result | Evidence |
|---|---|---|
| `blueapi/openapiv2` admitted | PASS | roots are exactly `['billing', 'openapiv2']` |
| unrelated `blueapi` roots confined | PASS | `protos`, `admin`, `iam`, `cost`, … remain unapproved |
| unapproved roots/repos fail closed | PASS | `REAL_SOURCE_SCAN_APPROVED_UNIVERSE` |
| `blueinternal` unapproved | PASS | absent from `PHASE25_APPROVED_REPOSITORY_IDS`; throws on request |
| existing `parseOpenApiRoutes` used | PASS | all 591 surfaces have `language === 'OPENAPI'`; zero new parsers |
| ≥ 591 blueapi operations | PASS | 591 |
| verb / path / operationId preserved | PASS | 591 distinct `operationId`s, 591 `routeProof: PROVEN`, no template collapsed to `/` |
| ≥ 400 response contracts bound | PASS | 970 bound / 0 unresolved; 591 operations `responseProof: PROVEN` |
| malformed / unresolved refs fail truthfully | PASS | `REF_MALFORMED`, `DEFINITION_MISSING`, `DEFINITION_UNSAFE` with `UNSUPPORTED_REFERENCE` joins |
| generated-artifact provenance attached | PASS | `SOURCE_FACT` + `GENERATED_ARTIFACT` on all 591 |
| currency explicit and fail-closed | PASS | `UNKNOWN` / `GENERATION_CORROBORATOR_UNAVAILABLE`; snapshot mismatch, duplicate and malformed all `UNKNOWN` |
| generated evidence cannot grant production | PASS | `DENIED` with `GENERATED_ARTIFACT_SOLE_EVIDENCE` even at `CURRENT` |
| all C-01 identities present | PASS | 0 of 223 missing |
| no-eviction regression green | PASS | `droppedOperations: 0` per repository |
| truncation / completeness truthful | PASS | `UNKNOWN`, `totalOperations: null`, `remainingUnknown: true` |

## Validation

- `npx tsc --noEmit` — exit 0.
- Focused `tests/unit/c02aOpenApiAdmission.test.ts` — 18 passed.
- Full canonical Playwright regression — 2,771 passed / 13 skipped / 0 failed.
- `npm run gate:local` — PASS, all eleven required groups, receipt
  `receipt:sha256:f901ce1e76c083cb867fd3e7` at
  `316ac761aa5de99da06db39ca0e242834a574467`, and
  `receipt:sha256:2e078aeabcbf539e411ed437` at the closeout commit
  `35cb82da9c91519bc2a4a6795431af1e06c31660`.
- `npm run gate:clean` — PASS on a clean Node 20 checkout, receipt
  `receipt:sha256:9a9be194536773d5dd2df458` at `316ac761`, and
  `receipt:sha256:808ae7475f4c43c9de5afcbc` at `35cb82da`.

Two pre-existing tests were repaired rather than weakened, because C-02a
changed a real measurement each of them had pinned:

- `phase26SyntheticCampaign` asserted descriptor `v3`; the schema legitimately
  advanced to `v4`.
- `eligibilityCensus` byte-stability asserted `RESPONSE_CONTRACT` as the
  top-ranked proof-gap family. Binding 591 response contracts left that
  family's gap unchanged at 165 surfaces while adding 591 handler-less
  operations, so `JOIN_GRAPH` (607 gap surfaces) now ranks first. The same
  test also needed an explicit `spawnSync` `maxBuffer`: the census now renders
  ~2.4 MB of JSON, past Node's 1 MB default, which surfaced as a null exit
  status — a harness limit, not a product fact.

## Authority

C-02a grants no new product or runtime authority. Generated-artifact evidence
is deny-only. No production, NEXT, or DEV contact; no auth refresh; no
credential or customer-data inspection; no datastore, cloud, IAM, or
Kubernetes access; no sibling-repository write; no publication. Sibling
Alphaus repositories were read only, through the existing confined read-only
access object.

## Deferred

- C-02b supplies the proto-surface corroborator that resolves the generated
  artifact's `UNKNOWN` currency.
- `blueinternal/openapiv2` (~57 operations) remains claimed by C-05.
- JOIN_GRAPH is now the dominant proof gap (607 surfaces), because a generated
  Swagger document declares no handler symbol. Closing it needs the proto
  service ↔ RPC symbol from C-02b and the topology binding of C-03.

## Safety events

NONE. One process deviation was caught and repaired: three source edits landed
in the canonical checkout because relative paths resolved against the session
start directory. The exact files were transplanted into the owned worktree and
restored in canonical with a path-scoped `git restore`; canonical returned to
a clean tree with no commit and no other path touched. All later edits used
absolute worktree paths.
