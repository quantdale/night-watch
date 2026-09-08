# M0 — Reproduction-capability census (bounded aggregate evidence)

Task: `nightwatch-reproduction-surface-coverage-autonomous-yield-v1`
Milestone: M0
Census base SHA: `1942ea37757bbb914de6281f505ee6118b5c67f0`
Sibling source SHA observed for `mobingilabs/ouchan`: `565f00a87fb7616cc23c45d4ffeabee38a41c65f`

Method: the LIVE W9 rules, unchanged. Enumeration through
`createApprovedRealSourceScanConfig` + `scanSource` over the owner-approved
sibling boundary; classification by calling `discoverOwnerLocalTarget` on every
eligible source path. No W9 semantics were modified to produce these numbers.

Aggregates only. No absolute host paths, no module-cache locations, no source
text. Raw per-file classification stayed owner-private outside Git.

## 1. Reasoner-visible universe (the live scan config)

| Measure | Value |
|---|---:|
| eligible source files | 4,109 |
| files mapping to `EXECUTABLE_NOW` | 1,120 (27.3%) |
| distinct executable targets (module+package, deduplicated) | 152 |
| inventory completeness | `TRUNCATED` (ouchan enumeration only) |

Refusal distribution over the eligible universe:

| Class | Files | Share |
|---|---:|---:|
| `NO_SUPPORTED_EXECUTOR` (non-Go source) | 1,605 | 39.1% |
| `PACKAGE_TEST_FILES_ABSENT` | 1,327 | 32.3% |
| `EXECUTABLE_NOW` | 1,120 | 27.3% |
| `VENDOR_DIRECTORY_ABSENT` | 57 | 1.4% |

Language distribution: `.go` 2,504; `.vue` 859; `.js` 387; `.php` 149;
`.yaml` 97; `.yml` 62; `.json` 34; `.proto` 16; `.ts` 1.

Per repository:

| Repository | Eligible | Go | `EXECUTABLE_NOW` | Distinct targets | Dominant refusal |
|---|---:|---:|---:|---:|---|
| `mobingilabs/ouchan` | 2,638 | 2,447 | 1,120 | 152 | `PACKAGE_TEST_FILES_ABSENT` 1,327 |
| `mobingilabs/ripple-ui` | 1,245 | 0 | 0 | 0 | `NO_SUPPORTED_EXECUTOR` 1,245 |
| `mobingilabs/ripple-api` | 95 | 0 | 0 | 0 | `NO_SUPPORTED_EXECUTOR` 95 |
| `alphauslabs/blue-sdk-go` | 57 | 57 | 0 | 0 | `VENDOR_DIRECTORY_ABSENT` 57 |
| `mobingilabs/wave-api` | 56 | 0 | 0 | 0 | `NO_SUPPORTED_EXECUTOR` 56 |
| `alphauslabs/blueapi` | 16 | 0 | 0 | 0 | `NO_SUPPORTED_EXECUTOR` 16 |
| `alphauslabs/blueinternal` | 1 | 0 | 0 | 0 | `NO_SUPPORTED_EXECUTOR` 1 |
| `alphauslabs/grpc-chunk-parser` | 1 | 0 | 0 | 0 | `NO_SUPPORTED_EXECUTOR` 1 |

Enumeration completeness: every repository is `COMPLETE` except
`mobingilabs/ouchan`, which is truthfully `TRUNCATED`
(`SOURCE_FILE_COUNT_EXCEEDED`, 3,156 entries examined, 2,638 admitted).

## 2. Full approved-root Go population (host diagnostic, beyond the scan budget)

| Repository | `.go` files | `EXECUTABLE_NOW` | Distinct targets | Refusals |
|---|---:|---:|---:|---|
| `mobingilabs/ouchan` | 2,733 | 1,199 | 157 | `PACKAGE_TEST_FILES_ABSENT` 1,534 |
| `alphauslabs/blue-sdk-go` | 57 | 0 | 0 | `VENDOR_DIRECTORY_ABSENT` 57 |

No other approved repository contains Go source under its approved roots.

The ouchan scan truncation therefore costs 5 distinct executable targets
(157 → 152), not the bulk of the surface.

## 3. Why the W9 campaign returned 7/7 `NOT_AVAILABLE`

Established mechanically, not inferred.

The owner-local source index is built in `loadEligibleEntries`
(`src/core/localInvestigation/ownerLocal.ts`) and sorted by
`(repository, relativePath)` ascending. `runSourceIndex`
(`src/core/localInvestigation/session.ts`) then hands the reasoner
`entries.slice(0, MAX_REASONER_SOURCE_INDEX_ENTRIES)` with the constant fixed
at **32**.

Measured against the live universe:

| Measure | Value |
|---|---:|
| total eligible entries in the ordered index | 4,109 |
| entries the reasoner can ever see | 32 |
| repositories represented in those 32 | 1 (`alphauslabs/blue-sdk-go`) |
| `EXECUTABLE_NOW` within those 32 | **0** |
| ordered index position of the first `mobingilabs/ouchan` entry | 75 |
| ordered index position of the first `EXECUTABLE_NOW` entry anywhere | **83** |

The reasoner's entire visible target universe ends 51 entries before the first
mechanically executable target in the approved universe. `alphauslabs/blue-sdk-go`
sorts first and has exactly zero executable coverage (no `vendor/`), so every
reproduction attempt in the W9 terminal campaign was refused before the reasoner
made any choice.

Confirmed against the preserved W9 checkpoint
(`w9-endurance-omen-1`): 32 unique source paths, **100% in
`alphauslabs/blue-sdk-go`**, 26 recorded in `inspectedTargets`, 7 reproduction
attempts, 7 deterministic no-target refusals.

**7/7 `NOT_AVAILABLE` was structurally guaranteed before the campaign started.**
It was not a reasoning-quality result and not evidence that reproduction
coverage is scarce.

## 4. Starting hypotheses

| ID | Claim | Verdict | Evidence |
|---|---|---|---|
| H1 | coverage, not reasoning, dominates `NOT_AVAILABLE` | **DISPROVED as stated / PARTIAL** | Coverage is 27.3% of the eligible universe and 152 distinct targets. Scarcity is not the cause. What dominates is that the reasoner-visible slice contains none of it. |
| H2 | the reasoner lacks pre-action capability information | **CONFIRMED** | `deriveExecutionReadiness` skips every target with `reproductionAttempts === 0` (`src/core/investigationMemory/derive.ts:278`), so executability is only ever knowable *after* spending a verification turn. `MemoryInspectedTarget` and `uninspectedTargets` carry no readiness field. |
| H3 | safe Go coverage can expand beyond vendor-only | **DISPROVED** | The only non-vendored Go module reachable under approved roots is `mobingilabs/ouchan/.github/mcp`, which is outside the approved roots (`services`, `pkg`). `alphauslabs/blue-sdk-go` has exactly one `_test.go` (`session/session_test.go`) and `session` is not an approved service root. A `GO_LOCAL_CACHE_PACKAGE_TEST` class would unlock **zero** approved targets. |
| H4 | a narrow safe non-Go class may exist | **DISPROVED for W10** | `mobingilabs/ripple-api` and `mobingilabs/wave-api` have no `vendor/bin`, so no local PHPUnit exists; `mobingilabs/ripple-ui` has no `node_modules`, so its 43 spec files have no local runner. Every candidate would require a network install, which is prohibited. |
| H5 | reproduced current failures need better triage | **UNPROVEN — no live instance** | Zero qualifying current-source reproductions exist to triage. Deferred behind capability-aware selection, which must first produce one. |

## 5. Consequences for the W10 plan

1. The dominant yield defect is **target-universe collapse by alphabetical
   truncation**, not executor coverage. Fixing selection is worth up to 152
   executable targets; every executor-expansion lane is worth 0.
2. **M4 (`GO_LOCAL_CACHE_PACKAGE_TEST`) is a mechanical NO-GO.** It unlocks no
   approved target. The SPEC explicitly permits recording NO-GO rather than
   forcing the class.
3. **M5 (non-Go execution class) is a mechanical NO-GO.** No approved repository
   has a local direct runner with already-local dependencies.
4. The capability-aware surface map (M3) must make executability visible
   *before* a reproduction attempt, and the campaign strategy must persist
   unsupported-target knowledge across investigations. The W9 checkpoint proves
   it currently does not: after 7 deterministic refusals,
   `unproductiveTargets` and `reproducedTargets` were both `[]`.
5. Repository/target diversity in the reasoner-visible index is a
   correctness requirement, not a tuning preference.

## 6. Owner-private material deliberately not committed

Per-file classification rows, absolute sibling paths, module-cache location and
size, and the raw census JSON remain outside Git. Only the aggregates above are
durable project evidence.
