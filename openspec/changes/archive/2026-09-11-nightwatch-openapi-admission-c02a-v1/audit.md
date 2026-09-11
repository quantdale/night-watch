# Audit — OpenAPI Admission (C-02a)

Every load-bearing number below was re-measured read-only in the C-02a session
worktree against the sibling checkouts at their recorded SHAs. Nothing here is
carried over from the master plan or the independent review on trust.

## The artifact

`alphauslabs/blueapi@691422e5dc81afd263d064986fb50fcb3ea432a9`,
`openapiv2/apidocs.swagger.json`:

| Property | Measured |
|---|---|
| swagger version | 2.0 |
| bytes | 1,435,500 (72 % of the 2,000,000 `maxFileBytes` ceiling) |
| paths | 462 |
| verb-bound operations | 591 (get 185, post 253, put 91, delete 60, patch 2) |
| definitions | 1,179 |
| operations with a resolvable response `$ref` | 591 |
| operations with a `200` response `$ref` | 379 |
| operations with a `default` response `$ref` | 591 |
| duplicate `operationId`s | 0 |
| paths rejected by the pre-C-02a `SAFE_ROUTE_RE` | 1 |

The single rejected path is `/v1/invoice/{date}:create&savesettings`, a
gRPC-gateway custom-method template. `SAFE_ROUTE_RE` was widened by the one
character `&`; the widening is proven inert against all 223 pre-C-02a
operation identities.

## Pre-C-02a state

`APPROVED_ROOTS['alphauslabs/blueapi'] = ['billing']`. The scan visited the
repository and reported `fileCount: 1`, `admittedFileCount: 0`,
`rejectedFileCount: 1`, rejection `SOURCE_LANGUAGE_UNSUPPORTED`,
`bytesInspected: 0`. Whole-population projection was 223 operations, all from
`mobingilabs/ripple-api`, with `responseContracts: 58`.

## Post-C-02a state

| Metric | Pre | Post |
|---|---|---|
| operations projected | 223 | 814 |
| `mobingilabs/ripple-api` | 223 | 223 |
| `alphauslabs/blueapi` | 0 | 591 |
| operations dropped | 0 | 0 |
| `routeProofs` | 222 | 813 |
| `requestContracts` | 222 | 813 |
| `responseContracts` | 58 | 649 |
| `generatedArtifactOperations` | 0 | 591 |
| `openApiResponseDefinitionsBound` | 0 | 970 |
| `openApiResponseDefinitionsUnresolved` | 0 | 0 |
| files considered / read / admitted | 1732 / 1092 / 1078 | 1733 / 1093 / 1079 |
| bytes read | 12,449,877 | 13,885,377 |

`223 + 591 = 814` exactly: no deduplication, no eviction, no loss. Comparing
census rows identity-by-identity, 0 of the 223 pre-C-02a
`(repository, operationId, surfaceId)` triples are missing and all 591
additions are `alphauslabs/blueapi`.

## Response-contract recovery, stated three ways

- 970 individual response contracts bound through in-document `definitions`
  (591 `default` + 379 `200`), 0 unresolved.
- 591 operations reaching `responseProof: PROVEN` through those bindings.
- 379 operations declaring a `200` response schema.

The first two clear the ≥ 400 acceptance floor; the third does not. All three
are recorded so the reported metric is not quietly the one that fits.

## Side effects found

- **Proof-gap ranking moved.** Binding 591 response contracts left the
  `RESPONSE_CONTRACT` gap unchanged at 165 surfaces while adding 591
  handler-less operations, so `JOIN_GRAPH` (607 gap surfaces) replaced
  `RESPONSE_CONTRACT` as the top-ranked proof-gap family. A generated Swagger
  document declares no handler symbol; closing that gap needs C-02b's proto
  service ↔ RPC symbol and C-03's topology binding.
- **Census output size.** The 814-operation census renders ~2.4 MB of JSON,
  past Node's default 1 MB `spawnSync` buffer. That is a test-harness limit,
  fixed with an explicit `maxBuffer`, not a product fact.
- **Descriptor schema.** Adding `sourceEvidence` to the descriptor digest core
  changes every `deterministicDigest`, so the schema advances `v3 → v4`.
  `surfaceId` and `operationId` — the actual identities — are unaffected
  because `SourceOperationDescriptor` was left untouched.

## Not measured, not claimed

Generation currency against the proto surface is `UNKNOWN` for all 591
surfaces. C-02a admits no proto parser, so no corroboration record exists and
the check reports `GENERATION_CORROBORATOR_UNAVAILABLE`. The divergence the
independent review measured (get 185 vs 187, delete 60 vs 61, post 253 vs 254)
is exactly what the `STALE` branch exists to catch once C-02b supplies the
input.
