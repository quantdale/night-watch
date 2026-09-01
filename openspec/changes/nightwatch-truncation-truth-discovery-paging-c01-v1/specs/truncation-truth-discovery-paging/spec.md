# Requirements — Truncation Truth, Discovery Paging, and Early Coverage Surfacing (C-01)

1. The discovery pipeline MUST NOT silently bound operation projection: the
   private `MAX_DISCOVERED_OPERATIONS = 128` with a bare `continue` MUST be
   removed and replaced by the exported `MAX_PROJECTED_OPERATIONS = 4096`
   (`src/core/source/surfaces.ts`), a memory/CPU guard that is aligned with
   the upstream file-scan ceiling and whose overflow is always reported.
2. Operation projection MUST be per-repository-fair: parsed routes MUST be
   bucketed by `repoId`, dealt round-robin in deterministic `repoId` sort
   order, and re-sorted with the pre-existing comparator before digest and
   census, so that projection order is no longer eviction order.
3. Adding an earlier-sorting repository MUST NOT silently remove an existing
   operation identity: the no-eviction invariant MUST be enforced and a
   permanent deterministic regression MUST exist that proves an earlier
   `repoId` cannot evict a later repository's operation.
4. A shared, data-only truncation vocabulary MUST exist at
   `src/core/source/completeness.ts`: `SourceCompletenessState = COMPLETE |
   TRUNCATED | UNKNOWN` with the conservative total order `COMPLETE <
   TRUNCATED < UNKNOWN`.
5. `worstCompleteness(...states)` MUST return the weakest claim (maximum rank)
   and with zero inputs MUST return UNKNOWN; `isComplete(state)` MUST be
   true for COMPLETE alone and false for TRUNCATED and UNKNOWN; there MUST
   be no helper that could be mistaken for an "isNotTruncated" predicate.
6. The seven R2 coverage states `PROVEN, UNPROVEN, UNSUPPORTED, TRUNCATED,
   STALE, UNKNOWN, UNMEASURED` MUST exist as `R2_COVERAGE_STATES`; their
   weakest-wins reduction `worstCoverageState(...states)` MUST return
   UNMEASURED for zero inputs.
7. Coverage MUST be reporting only: `coverageAuthorityEffect(state)` MUST
   return `DENY | NO_EFFECT` with no `GRANT` member by construction, and no
   admission or runtime authority path MUST read `coverageState` for a
   permission.
8. `SourceScanCounters.budgetRejections` MUST be removed and replaced by two
   disjoint counters `enumerationBudgetRejections` and
   `contentBudgetRejections`; an aborted directory walk and an unread file
   body MUST increment different counters.
9. Enumeration completeness (`SourceEnumerationCompleteness`) MUST be measured
   at the file-walk layer with `limit`, `byteLimit`, `examinedFiles`,
   `totalFiles` (exact only when the walk completes, otherwise `null`),
   `droppedFiles` (exact only when knowable, otherwise `null`), and
   `remainingUnknown`; an aborted walk MUST report `totalFiles: null`,
   `droppedFiles: null`, `remainingUnknown: true` and never a fabricated
   zero.
10. Content-read completeness (`SourceContentReadCompleteness`) MUST be
   measured over the enumerated set with `candidateFiles`, `readFiles`,
   `admittedFiles`, `bytesRead`, `droppedFiles` (always knowable),
   `unreadableFiles`, `fileByteLimit`, `totalByteLimit`; it MUST remain
   exact even when enumeration is bounded and it MUST NOT be collapsed into
   enumeration completeness.
11. Deliberate policy exclusions (`SOURCE_LANGUAGE_UNSUPPORTED`,
   `SOURCE_PRIVACY_REJECTED`) MUST be counted as `policyExcludedFiles` /
   rejection-count buckets and MUST never weaken a completeness state; they
   are not truncation.
12. `RealSourceSnapshotInventory` MUST carry `SourceInventoryCompleteness`
   (`nightwatch.source-inventory-completeness.v1`) with independent
   `enumeration` and `contentRead` dimensions and a per-repository row
   (`SourceRepositoryCompleteness`); the inventory-wide `state` MUST be the
   conservative (`worstCompleteness`) combination and MUST be COMPLETE only
   when both dimensions are COMPLETE.
13. One shared projection module `src/core/source/populationCompleteness.ts`
   (`nightwatch.source-population-completeness.v1`) MUST be the single
   renderer for every consumer; it MUST expose
   `buildSourcePopulationCompleteness({ operationCompleteness,
   inventoryCompleteness })` and `unmeasuredSourcePopulationCompleteness(limit)`
   whose unavailable case reports `state: UNKNOWN`, `coverageState:
   UNMEASURED`, `total: null` with `null` totals and `remainingUnknown:
   true`, never a zeroed COMPLETE.
14. `SourceEligibilityCensusSummary` MUST carry a required
   `population: SourcePopulationCompleteness` field and the census version
   MUST be `v2 → v3`; `population.totalOperations` is the number of surfaces
   actually censused and when `population.state` is not COMPLETE it is a
   floor, not a total.
15. `ReadOnlyCandidateCensus` MUST carry a required
   `population: SourcePopulationCompleteness` field and the census version
   MUST be `v1 → v2`.
16. Every `bin/nightwatch-intelligence.mjs` source projection
   (`source-scan`, `source-gaps`, `readonly-census`, `eligibility-census`,
   `surfaces`, `review-queue`) MUST emit `completeness: SourcePopulationCompleteness`
   and `operationCompleteness: SourceOperationProjectionCompleteness`, and
   both inventory summaries MUST ride `inventory.completeness`.
17. Operation-projection completeness (`SourceOperationProjectionCompleteness`,
   `nightwatch.source-operation-projection-completeness.v1`) MUST report the
   dimension-specific `limit`, `examinedOperations`, `totalOperations`
   (`null` when `remainingUnknown`), `projectedOperations`,
   `droppedOperations`, `truncated`, `remainingUnknown`, plus the inherited
   `enumerationCompleteness` and `contentReadCompleteness` and
   `coverageState`; a countable projection drop MUST be TRUNCATED and an
   uncountable upstream remainder MUST be UNKNOWN with `totalOperations:
   null`.
18. `buildPhase24CandidatePortfolio` MUST raise its hard `128` candidate
   ceiling to `MAX_PHASE24_CANDIDATES = 4096`, aligned with
   `MAX_PROJECTED_OPERATIONS`; overflow MUST still fail closed with
   `PHASE24_INVALID:CANDIDATE_COUNT` rather than dropping candidates.
19. `MAX_READONLY_CANDIDATE_HANDLER_FILES = 128` MUST remain a hard
   fail-closed throw in `readonlyCandidateCensus.ts`; it is not hit by the
   current approved source but it MUST be the next ceiling that fails closed
   as coverage widens, out of C-01 scope.
20. `ControlCenterSourceSummaryDto` MUST move
   `nightwatch.control-center.source-summary.v2 → v3` and carry a required
   `completeness: ControlCenterSourceCompletenessDto` block rendered from
   `discovery.operationCompleteness` and
   `discovery.inventory.completeness`; the unavailable projection MUST be
   UNKNOWN/UNMEASURED with `total: null`.
21. The Control Center UI MUST render a POPULATION COMPLETENESS article with
   an operation-projection header pill and separate ENUMERATION (File walk)
   and CONTENT READ (File bodies) sub-panels, each with its own status pill;
   `statusTone` MUST map COMPLETE/PROVEN to `ready` and
   TRUNCATED/UNKNOWN/UNMEASURED to `warning`; a warning callout MUST state
   that coverage is reporting only and never grants admission; an absent
   measurement MUST appear as UNKNOWN/UNMEASURED with `total: null`, never a
   zeroed COMPLETE.
22. The 43-vs-83 response-contract resolution MUST be recorded as D-105:
   historical `responseContracts = surfaces with responseProof === 'PROVEN'`
   measurements of `83` (analyzer v3) and `43` (analyzer v4, commit `15fe2c1`,
   discovery `source-surface-discovery:sha256:906830010ed198639d3c7b91` at
   `srcsnapshot:sha256:04ff583971865f335902f5ad`, with 43+9+76=128 proving the
   cap) are one metric over two analyzer checkpoints on the silently capped
   128-operation projection; the first honest whole-population figure at the
   same snapshot after removing the cap MUST be `58` of `223`
   (`source-surface-discovery:sha256:21de18a23a387d7b816db3c0`,
   `requestContracts: 222`, `routeProofs: 222`, `semanticContracts: 90`,
   `joinsAttempted: 223`, `joinsProven: 207`); historical phase-qualified
   records MUST stay intact and be annotated as historical, and analyzer
   semantics MUST NOT be changed to force agreement.
23. C-01 MUST grant no new product or runtime authority, MUST NOT weaken an
   existing validator to pass, MUST NOT contact DEV, NEXT, or production, and
   MUST NOT modify sibling company repositories.
