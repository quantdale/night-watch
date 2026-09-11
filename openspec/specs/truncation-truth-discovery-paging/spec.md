# truncation-truth-discovery-paging Specification

## Purpose
TBD - created by archiving change nightwatch-truncation-truth-discovery-paging-c01-v1. Update Purpose after archive.
## Requirements
### Requirement: Operation projection has no silent bound

The discovery pipeline MUST NOT silently bound operation projection: the
private `MAX_DISCOVERED_OPERATIONS = 128` with a bare `continue` MUST be
removed and replaced by the exported `MAX_PROJECTED_OPERATIONS = 4096`
(`src/core/source/surfaces.ts`), a memory/CPU guard that is aligned with
the upstream file-scan ceiling and whose overflow is always reported.

#### Scenario: the silent bound is replaced by a reported guard
- **WHEN** the discovery pipeline projects operations
- **THEN** the private `MAX_DISCOVERED_OPERATIONS = 128` with a bare `continue` MUST be removed and replaced by the exported `MAX_PROJECTED_OPERATIONS = 4096` (`src/core/source/surfaces.ts`), a memory/CPU guard whose overflow is always reported

### Requirement: Operation projection is per-repository-fair

Operation projection MUST be per-repository-fair: parsed routes MUST be
bucketed by `repoId`, dealt round-robin in deterministic `repoId` sort
order, and re-sorted with the pre-existing comparator before digest and
census, so that projection order is no longer eviction order.

#### Scenario: round-robin repoId order is not eviction order
- **WHEN** parsed routes are projected
- **THEN** they MUST be bucketed by `repoId`, dealt round-robin in deterministic `repoId` sort order, and re-sorted with the pre-existing comparator before digest and census

### Requirement: An earlier-sorting repository cannot evict an operation identity

Adding an earlier-sorting repository MUST NOT silently remove an existing
operation identity: the no-eviction invariant MUST be enforced and a
permanent deterministic regression MUST exist that proves an earlier
`repoId` cannot evict a later repository's operation.

#### Scenario: the no-eviction invariant has a deterministic regression
- **WHEN** an earlier-sorting repository is added
- **THEN** it MUST NOT silently remove an existing operation identity and the no-eviction invariant MUST be enforced by a permanent deterministic regression proving an earlier `repoId` cannot evict a later repository's operation

### Requirement: A shared truncation vocabulary exists

A shared, data-only truncation vocabulary MUST exist at
`src/core/source/completeness.ts`: `SourceCompletenessState = COMPLETE |
TRUNCATED | UNKNOWN` with the conservative total order `COMPLETE <
TRUNCATED < UNKNOWN`.

#### Scenario: the completeness states form a conservative total order
- **WHEN** truncation is represented
- **THEN** a shared, data-only vocabulary MUST exist at `src/core/source/completeness.ts` with `SourceCompletenessState = COMPLETE | TRUNCATED | UNKNOWN` and the conservative total order `COMPLETE < TRUNCATED < UNKNOWN`

### Requirement: worstCompleteness returns the weakest claim

`worstCompleteness(...states)` MUST return the weakest claim (maximum rank)
and with zero inputs MUST return UNKNOWN; `isComplete(state)` MUST be
true for COMPLETE alone and false for TRUNCATED and UNKNOWN; there MUST
be no helper that could be mistaken for an "isNotTruncated" predicate.

#### Scenario: zero inputs return UNKNOWN and only COMPLETE is complete
- **WHEN** `worstCompleteness(...states)` is called with zero inputs
- **THEN** it MUST return UNKNOWN, `isComplete(state)` MUST be true for COMPLETE alone and false for TRUNCATED and UNKNOWN, and no helper that could be mistaken for an "isNotTruncated" predicate may exist

### Requirement: The seven R2 coverage states exist

The seven R2 coverage states `PROVEN, UNPROVEN, UNSUPPORTED, TRUNCATED,
STALE, UNKNOWN, UNMEASURED` MUST exist as `R2_COVERAGE_STATES`; their
weakest-wins reduction `worstCoverageState(...states)` MUST return
UNMEASURED for zero inputs.

#### Scenario: worstCoverageState returns UNMEASURED for zero inputs
- **WHEN** `worstCoverageState(...states)` is called with zero inputs
- **THEN** the seven R2 coverage states `PROVEN, UNPROVEN, UNSUPPORTED, TRUNCATED, STALE, UNKNOWN, UNMEASURED` MUST exist as `R2_COVERAGE_STATES` and it MUST return UNMEASURED

### Requirement: Coverage is reporting only

Coverage MUST be reporting only: `coverageAuthorityEffect(state)` MUST
return `DENY | NO_EFFECT` with no `GRANT` member by construction, and no
admission or runtime authority path MUST read `coverageState` for a
permission.

#### Scenario: coverage cannot grant permission
- **WHEN** `coverageAuthorityEffect(state)` is evaluated
- **THEN** it MUST return `DENY | NO_EFFECT` with no `GRANT` member by construction and no admission or runtime authority path may read `coverageState` for a permission

### Requirement: Budget rejections are split by dimension

`SourceScanCounters.budgetRejections` MUST be removed and replaced by two
disjoint counters `enumerationBudgetRejections` and
`contentBudgetRejections`; an aborted directory walk and an unread file
body MUST increment different counters.

#### Scenario: enumeration and content aborts increment different counters
- **WHEN** a directory walk is aborted or a file body is unread
- **THEN** `SourceScanCounters.budgetRejections` MUST be removed and replaced by two disjoint counters `enumerationBudgetRejections` and `contentBudgetRejections`, and the two events MUST increment different counters

### Requirement: Enumeration completeness is measured at the file walk

Enumeration completeness (`SourceEnumerationCompleteness`) MUST be measured
at the file-walk layer with `limit`, `byteLimit`, `examinedFiles`,
`totalFiles` (exact only when the walk completes, otherwise `null`),
`droppedFiles` (exact only when knowable, otherwise `null`), and
`remainingUnknown`; an aborted walk MUST report `totalFiles: null`,
`droppedFiles: null`, `remainingUnknown: true` and never a fabricated
zero.

#### Scenario: an aborted walk reports unknown totals, not a fabricated zero
- **WHEN** a directory walk is aborted
- **THEN** enumeration completeness (`SourceEnumerationCompleteness`) MUST report `totalFiles: null`, `droppedFiles: null`, `remainingUnknown: true` and never a fabricated zero

### Requirement: Content-read completeness stays exact over the enumerated set

Content-read completeness (`SourceContentReadCompleteness`) MUST be
measured over the enumerated set with `candidateFiles`, `readFiles`,
`admittedFiles`, `bytesRead`, `droppedFiles` (always knowable),
`unreadableFiles`, `fileByteLimit`, `totalByteLimit`; it MUST remain
exact even when enumeration is bounded and it MUST NOT be collapsed into
enumeration completeness.

#### Scenario: content-read completeness is not collapsed into enumeration completeness
- **WHEN** content-read completeness (`SourceContentReadCompleteness`) is measured over the enumerated set
- **THEN** it MUST remain exact even when enumeration is bounded and MUST NOT be collapsed into enumeration completeness

### Requirement: Deliberate policy exclusions are never truncation

Deliberate policy exclusions (`SOURCE_LANGUAGE_UNSUPPORTED`,
`SOURCE_PRIVACY_REJECTED`) MUST be counted as `policyExcludedFiles` /
rejection-count buckets and MUST never weaken a completeness state; they
are not truncation.

#### Scenario: policy exclusions do not weaken a completeness state
- **WHEN** `SOURCE_LANGUAGE_UNSUPPORTED` or `SOURCE_PRIVACY_REJECTED` files are excluded by policy
- **THEN** they MUST be counted as `policyExcludedFiles` / rejection-count buckets and MUST never weaken a completeness state

### Requirement: The real-source snapshot inventory carries completeness

`RealSourceSnapshotInventory` MUST carry `SourceInventoryCompleteness`
(`nightwatch.source-inventory-completeness.v1`) with independent
`enumeration` and `contentRead` dimensions and a per-repository row
(`SourceRepositoryCompleteness`); the inventory-wide `state` MUST be the
conservative (`worstCompleteness`) combination and MUST be COMPLETE only
when both dimensions are COMPLETE.

#### Scenario: the inventory state is the conservative combination
- **WHEN** the inventory-wide `state` is computed
- **THEN** `RealSourceSnapshotInventory` MUST carry `SourceInventoryCompleteness` (`nightwatch.source-inventory-completeness.v1`) with independent `enumeration` and `contentRead` dimensions and a per-repository row (`SourceRepositoryCompleteness`)
- **AND** the `state` MUST be the conservative (`worstCompleteness`) combination and MUST be COMPLETE only when both dimensions are COMPLETE

### Requirement: One shared population-completeness renderer serves every consumer

One shared projection module `src/core/source/populationCompleteness.ts`
(`nightwatch.source-population-completeness.v1`) MUST be the single
renderer for every consumer; it MUST expose
`buildSourcePopulationCompleteness({ operationCompleteness,
inventoryCompleteness })` and `unmeasuredSourcePopulationCompleteness(limit)`
whose unavailable case reports `state: UNKNOWN`, `coverageState:
UNMEASURED`, `total: null` with `null` totals and `remainingUnknown:
true`, never a zeroed COMPLETE.

#### Scenario: the unavailable case reports unknown, never a zeroed COMPLETE
- **WHEN** `unmeasuredSourcePopulationCompleteness(limit)` reports its unavailable case
- **THEN** it MUST report `state: UNKNOWN`, `coverageState: UNMEASURED`, `total: null` with `null` totals and `remainingUnknown: true`, never a zeroed COMPLETE

### Requirement: The eligibility census carries population completeness

`SourceEligibilityCensusSummary` MUST carry a required
`population: SourcePopulationCompleteness` field and the census version
MUST be `v2 → v3`; `population.totalOperations` is the number of surfaces
actually censused and when `population.state` is not COMPLETE it is a
floor, not a total.

#### Scenario: an incomplete census total is a floor, not a total
- **WHEN** `population.state` is not COMPLETE
- **THEN** `SourceEligibilityCensusSummary` MUST carry a required `population: SourcePopulationCompleteness` field with the census version `v2 → v3`, and `population.totalOperations` MUST be a floor, not a total

### Requirement: The read-only candidate census carries population completeness

`ReadOnlyCandidateCensus` MUST carry a required
`population: SourcePopulationCompleteness` field and the census version
MUST be `v1 → v2`.

#### Scenario: the candidate census requires the population field
- **WHEN** a `ReadOnlyCandidateCensus` is produced
- **THEN** it MUST carry a required `population: SourcePopulationCompleteness` field and the census version MUST be `v1 → v2`

### Requirement: Every intelligence source projection emits completeness

Every `bin/nightwatch-intelligence.mjs` source projection
(`source-scan`, `source-gaps`, `readonly-census`, `eligibility-census`,
`surfaces`, `review-queue`) MUST emit `completeness: SourcePopulationCompleteness`
and `operationCompleteness: SourceOperationProjectionCompleteness`, and
both inventory summaries MUST ride `inventory.completeness`.

#### Scenario: projections and inventory summaries carry completeness
- **WHEN** a `bin/nightwatch-intelligence.mjs` source projection is emitted
- **THEN** it MUST emit `completeness: SourcePopulationCompleteness` and `operationCompleteness: SourceOperationProjectionCompleteness`, and both inventory summaries MUST ride `inventory.completeness`

### Requirement: Operation-projection completeness is dimension-specific

Operation-projection completeness (`SourceOperationProjectionCompleteness`,
`nightwatch.source-operation-projection-completeness.v1`) MUST report the
dimension-specific `limit`, `examinedOperations`, `totalOperations`
(`null` when `remainingUnknown`), `projectedOperations`,
`droppedOperations`, `truncated`, `remainingUnknown`, plus the inherited
`enumerationCompleteness` and `contentReadCompleteness` and
`coverageState`; a countable projection drop MUST be TRUNCATED and an
uncountable upstream remainder MUST be UNKNOWN with `totalOperations:
null`.

#### Scenario: a countable drop is TRUNCATED and an uncountable remainder is UNKNOWN
- **WHEN** operation-projection completeness (`SourceOperationProjectionCompleteness`, `nightwatch.source-operation-projection-completeness.v1`) is reported
- **THEN** a countable projection drop MUST be TRUNCATED and an uncountable upstream remainder MUST be UNKNOWN with `totalOperations: null`

### Requirement: The phase24 candidate portfolio ceiling aligns with projection

`buildPhase24CandidatePortfolio` MUST raise its hard `128` candidate
ceiling to `MAX_PHASE24_CANDIDATES = 4096`, aligned with
`MAX_PROJECTED_OPERATIONS`; overflow MUST still fail closed with
`PHASE24_INVALID:CANDIDATE_COUNT` rather than dropping candidates.

#### Scenario: overflow fails closed rather than dropping candidates
- **WHEN** `buildPhase24CandidatePortfolio` would exceed its candidate ceiling
- **THEN** it MUST raise its hard `128` candidate ceiling to `MAX_PHASE24_CANDIDATES = 4096`, aligned with `MAX_PROJECTED_OPERATIONS`, and overflow MUST still fail closed with `PHASE24_INVALID:CANDIDATE_COUNT` rather than dropping candidates

### Requirement: The read-only candidate handler-file ceiling fails closed

`MAX_READONLY_CANDIDATE_HANDLER_FILES = 128` MUST remain a hard
fail-closed throw in `readonlyCandidateCensus.ts`; it is not hit by the
current approved source but it MUST be the next ceiling that fails closed
as coverage widens, out of C-01 scope.

#### Scenario: the handler-file ceiling remains a hard throw
- **WHEN** `MAX_READONLY_CANDIDATE_HANDLER_FILES = 128` is exceeded
- **THEN** it MUST remain a hard fail-closed throw in `readonlyCandidateCensus.ts` and MUST be the next ceiling that fails closed as coverage widens

### Requirement: The control-center source summary carries completeness

`ControlCenterSourceSummaryDto` MUST move
`nightwatch.control-center.source-summary.v2 → v3` and carry a required
`completeness: ControlCenterSourceCompletenessDto` block rendered from
`discovery.operationCompleteness` and
`discovery.inventory.completeness`; the unavailable projection MUST be
UNKNOWN/UNMEASURED with `total: null`.

#### Scenario: the unavailable projection is UNKNOWN/UNMEASURED with a null total
- **WHEN** the source-summary projection is unavailable
- **THEN** `ControlCenterSourceSummaryDto` MUST move `nightwatch.control-center.source-summary.v2 → v3` and carry a required `completeness: ControlCenterSourceCompletenessDto` block rendered from `discovery.operationCompleteness` and `discovery.inventory.completeness`
- **AND** the unavailable projection MUST be UNKNOWN/UNMEASURED with `total: null`

### Requirement: The Control Center renders population completeness

The Control Center UI MUST render a POPULATION COMPLETENESS article with
an operation-projection header pill and separate ENUMERATION (File walk)
and CONTENT READ (File bodies) sub-panels, each with its own status pill;
`statusTone` MUST map COMPLETE/PROVEN to `ready` and
TRUNCATED/UNKNOWN/UNMEASURED to `warning`; a warning callout MUST state
that coverage is reporting only and never grants admission; an absent
measurement MUST appear as UNKNOWN/UNMEASURED with `total: null`, never a
zeroed COMPLETE.

#### Scenario: an absent measurement appears as UNKNOWN/UNMEASURED
- **WHEN** the Control Center UI renders the POPULATION COMPLETENESS article
- **THEN** `statusTone` MUST map COMPLETE/PROVEN to `ready` and TRUNCATED/UNKNOWN/UNMEASURED to `warning`, a warning callout MUST state that coverage is reporting only and never grants admission, and an absent measurement MUST appear as UNKNOWN/UNMEASURED with `total: null`, never a zeroed COMPLETE

### Requirement: The 43-vs-83 response-contract resolution is recorded as D-105

The 43-vs-83 response-contract resolution MUST be recorded as D-105:
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

#### Scenario: the D-105 record preserves the historical measurements
- **WHEN** the 43-vs-83 response-contract resolution is recorded
- **THEN** it MUST be recorded as D-105 as one metric over two analyzer checkpoints on the silently capped 128-operation projection, historical phase-qualified records MUST stay intact and be annotated as historical, and analyzer semantics MUST NOT be changed to force agreement

### Requirement: C-01 grants no new authority

C-01 MUST grant no new product or runtime authority, MUST NOT weaken an
existing validator to pass, MUST NOT contact DEV, NEXT, or production, and
MUST NOT modify sibling company repositories.

#### Scenario: C-01 contacts nothing and modifies no sibling repository
- **WHEN** C-01 is implemented
- **THEN** it MUST grant no new product or runtime authority, MUST NOT weaken an existing validator to pass, MUST NOT contact DEV, NEXT, or production, and MUST NOT modify sibling company repositories

