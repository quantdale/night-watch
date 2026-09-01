# Tasks — Truncation Truth, Discovery Paging, and Early Coverage Surfacing (C-01)

- [x] M1 bounded, per-repository-fair operation projection with explicit
      completeness: replace private `MAX_DISCOVERED_OPERATIONS = 128` with
      exported `MAX_PROJECTED_OPERATIONS = 4096`, deal round-robin in
      deterministic `repoId` order, re-sort with the existing comparator,
      participate in the discovery digest, permanent no-eviction regression
- [x] M2 shared completeness and R2 coverage vocabulary: new
      `src/core/source/completeness.ts` with `SourceCompletenessState`,
      `worstCompleteness` (zero args ⇒ UNKNOWN), `isComplete` (COMPLETE
      only), the seven `R2_COVERAGE_STATES`, `coverageAuthorityEffect`
      (`DENY | NO_EFFECT`, no `GRANT`), `coverageStateForCompleteness`
- [x] M3 disjoint enumeration and content-read completeness in the inventory:
      split `SourceScanCounters.budgetRejections` into
      `enumerationBudgetRejections` / `contentBudgetRejections`, add
      `SourceInventoryCompleteness` (`nightwatch.source-inventory-completeness.v1`)
      with independent `enumeration` and `contentRead` dimensions and
      per-repository rows; aborted walk ⇒ `totalFiles: null`,
      `droppedFiles: null`, `remainingUnknown: true`; policy exclusions
      (`SOURCE_LANGUAGE_UNSUPPORTED`, `SOURCE_PRIVACY_REJECTED`) counted
      separately and never truncation
- [x] M4 operation projection consumes both upstream dimensions separately:
      `enumerationCompleteness` + `contentReadCompleteness` alongside the
      projection's own state; countable drop ⇒ TRUNCATED, uncountable
      upstream remainder ⇒ UNKNOWN with `totalOperations: null`
- [x] M5 census, CLI, and downstream ceiling propagation: new
      `src/core/source/populationCompleteness.ts`
      (`nightwatch.source-population-completeness.v1`) as the single shared
      projection, `SourceEligibilityCensusSummary.population` (census v2→v3),
      `ReadOnlyCandidateCensus.population` (v1→v2), every
      `bin/nightwatch-intelligence.mjs` source projection emits
      `completeness` and `operationCompleteness`; `inventory.completeness`
      rides both inventories; `MAX_PHASE24_CANDIDATES = 4096` aligned with
      `MAX_PROJECTED_OPERATIONS`, still fail-closed
- [x] M6 C-15a Control Center backend contract and visible UI marking:
      `ControlCenterSourceSummaryDto` (`v2→v3`) with a `completeness` block
      projected from `discovery.operationCompleteness` +
      `discovery.inventory.completeness`; unavailable fallback is
      UNKNOWN/UNMEASURED with `total: null`; UI POPULATION COMPLETENESS
      panel with separate ENUMERATION and CONTENT READ pills and a warning
      callout; `statusTone` maps COMPLETE/PROVEN→ready,
      TRUNCATED/UNKNOWN/UNMEASURED→warning; `coverageState` display-only
- [x] M7 43-vs-83 durable-truth resolution (D-105): one metric, analyzer v3
      vs v4, both over the 128 cap (43+9+76=128); first honest
      whole-population figure 58 of 223 at same snapshot, discovery digest
      `source-surface-discovery:sha256:21de18a23a387d7b816db3c0`; historical
      rows preserved and annotated, analyzer semantics unchanged
- [ ] M8 full validation and closure: run `npm run gate:local`, repair any
      failure, run the clean-checkout gate, then close out (`REPORT.md`,
      `ACTIVE_TASK.md`, `nightwatch-session integrate` through the C-00
      fast-forward protocol)
