# Canonical pre-C-01 baseline (C-00 / F-32)

Independent review finding `F-32` observed that the planning audit measured
from `784d553` while local `main` advanced to `54df439` underneath it, and that
its "re-confirmed against the working tree" wording is weaker than a pinned
SHA. This file is the pinned replacement: the read-only, local/source-only
eligibility census measured **once**, from a clean checkout, at an exact
implementation SHA, under C-00 worktree isolation.

Every later campaign delta is measured against these digests.

## Measurement conditions

| Field | Value |
| --- | --- |
| `NIGHTWATCH_IMPLEMENTATION_SHA` | `886d8362b6f0979ccdfc2881abb46cb5ac79b359` |
| `MEASURED_FROM` | owned C-00 session worktree, branch `session/c00-a396cd1f`, clean |
| `COMMAND` | `npm run campaign:eligibility-census` |
| `SCOPE` | `LOCAL_SOURCE_ONLY` |
| `SAFETY` | `NO_NETWORK_NO_AUTH_NO_PRODUCT_CONTACT` |
| `WORKSPACE_VERDICT_AT_MEASUREMENT` | `PASS` (all seven C-00 invariants) |
| `DETERMINISM` | repeated invocation reproduced identical digests |

No DEV, NEXT, or production contact occurred. No sibling company repository
was modified; all six were read read-only.

## Baseline digests

| Digest | Value |
| --- | --- |
| `SOURCE_CONFIG_DIGEST` | `srcconfig:sha256:e8bdfc8f0e58d7d93a87215c` |
| `SOURCE_SNAPSHOT_DIGEST` | `srcsnapshot:sha256:04ff583971865f335902f5ad` |
| `SOURCE_SURFACE_DISCOVERY_DIGEST` | `source-surface-discovery:sha256:906830010ed198639d3c7b91` |
| `PHASE24_PORTFOLIO_DIGEST` | `portfolio:sha256:1f76e8a69b67c2ae2ce038a9` |
| `ELIGIBILITY_CENSUS_DIGEST` | `source-eligibility-census:sha256:2f97b732e0472df347f695a1` |
| `CENSUS_SCHEMA` | `nightwatch.real-source-eligibility-census.v2` |
| `EXTRACTOR_VERSION` | `nightwatch.real-source-scan-extractor.v1` |

The two digests `F-32` named as the baseline every campaign will be measured
against — `srcsnapshot:sha256:04ff5839…` and
`source-eligibility-census:sha256:2f97b732…` — reproduced exactly at this
pinned SHA.

## Source snapshot identity

| Repository | Source SHA | Status | Files considered | Admitted | Rejected |
| --- | --- | --- | --- | --- | --- |
| `alphauslabs/blue-sdk-go` | `8883ee3d3a073352626c8c35e20e9fc5ed765373` | `CURRENT` | 4 | 4 | 0 |
| `alphauslabs/blueapi` | `691422e5dc81afd263d064986fb50fcb3ea432a9` | `CURRENT` | 1 | 0 | 1 |
| `alphauslabs/grpc-chunk-parser` | `66802f281698dfcf0903f0a117d4637fce3fd945` | `CURRENT` | 1 | 1 | 0 |
| `mobingilabs/ouchan` | `565f00a87fb7616cc23c45d4ffeabee38a41c65f` | `CURRENT` | 857 | 753 | 104 |
| `mobingilabs/ripple-api` | `27bb007ad0c798800b6bd3b29760c966422966e7` | `CURRENT` | 96 | 95 | 1 |
| `mobingilabs/ripple-ui` | `d80b161b684d9153c7e5acaa65ae1752d93d8ba9` | `CURRENT` | 773 | 225 | 548 |

Inventory counters: 6 repositories considered / 6 inspected, 440 directories
visited, 1,732 files considered, 1,092 read, 1,078 admitted, 654 rejected,
12,449,877 bytes read, 0 symlink rejections, 0 path rejections, 2 budget
rejections.

## Operation and proof counts

| Metric | Value |
| --- | --- |
| `totalOperations` | 128 |
| `routeProofs` | 127 |
| `requestContracts` | 127 |
| `responseContracts` | 43 |
| `semanticContractSurfaces` | 43 |
| `semanticObservations` | 53 |
| `joinsAttempted` / `joinsProven` / `joinsRejected` | 128 / 118 / 10 |
| `mutationCapable` | 47 |
| `readOnlyProven` | 5 |
| `mutabilityUnknown` | 76 |
| `phase24Eligible` / `phase24Excluded` | 3 / 125 |
| `runtimeBindings` / `runtimeBindingMissing` | 5 / 123 |
| `replayRequirementsProven` / `replayRequirementsUnproven` | 5 / 123 |
| `dossierCompatible` / `dossierIncompatible` | 128 / 0 |
| Lifecycle | 85 `DISCOVERED` / 40 `MECHANICALLY_PROVEN` / 3 `PROJECTABLE` |
| `sourceCurrentnessCounts` | 128 `CURRENT`, 0 failures |
| `sourceGapSurfaceCount` | 85 |
| `rejectedDiagnosticCount` | 365 |
| `hardUnsafeExclusionCount` | 47 |
| `mechanicalProofGapCount` | 125 |
| `ambiguityCount` / `sourceUnavailableOrStaleCount` | 0 / 0 |

Primary blocking stage: 84 `RESPONSE_CONTRACT`, 34
`MUTABILITY_CLASSIFICATION`, 6 `READ_ONLY_PROOF`, 1 `ROUTE_PROVEN`, 3 `NONE`.

Unsupported-construct / proof-gap families: 179 `UNSUPPORTED_SYNTAX`, 155
`CONTROL_FLOW`, 22 `RETURN_EXPRESSION`, 9 `DYNAMIC_DISPATCH`, 20
`SOURCE_CURRENTNESS`.

## Truncation and budget counts

The 128-operation cap is **unchanged** by C-00 and is recorded here only as
measured state:

| Metric | Value |
| --- | --- |
| `totalOperations` at cap | 128 |
| `budgetRejections` (inventory) | 2 |
| `filesConsidered` − `filesRead` | 640 |
| `responseFlowAttempts` / `responseFlowEdges` / `responseFlowMaxDepth` | 13 / 0 / 0 |
| `analyzerInvocations` | 127 |
| `maxTokens` / `maxSourceBytes` (per file) | 32,027 / 242,093 |
| `maxDeclarationsPerFile` / `declarationsIndexed` | 60 / 766 |

## Recorded divergence for C-01 to reconcile

`docs/CURRENT_STATE.md` records, for the source-to-campaign proof-chain
expansion, "83 response contracts" under census digest
`source-eligibility-census:sha256:1a71425620210ac5fa6af6c4` at the same source
snapshot `srcsnapshot:sha256:04ff5839…`. The census surface invoked here
(`campaign:eligibility-census`, digest `…2f97b732…`) reports 43 at the same
snapshot.

C-00 does not reconcile this: it records it. Two census surfaces report
different response-contract counts for one identical source snapshot, so at
most one of them can be the trustworthy pre-C-01 baseline. The digest named by
`F-32` — and therefore the one used as this baseline — is `…2f97b732…`. C-01
must determine which surface is authoritative before treating any
response-contract delta as progress.
