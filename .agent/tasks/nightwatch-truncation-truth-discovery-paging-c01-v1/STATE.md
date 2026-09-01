# Task State

## Identity

Task ID: nightwatch-truncation-truth-discovery-paging-c01-v1
Phase: TRUNCATION_TRUTH_DISCOVERY_PAGING_C01_V1
Status: IN_PROGRESS
Starting SHA: 68e64a143d40aea051df186e050b3c0fa33d6ae5
Last validated implementation SHA: 68e64a143d40aea051df186e050b3c0fa33d6ae5
Last substantive checkpoint SHA: 68e64a143d40aea051df186e050b3c0fa33d6ae5
Branch: session/nightwatch-truncation-truth-disc-b84ac363
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 68e64a143d40aea051df186e050b3c0fa33d6ae5
LAST_VALIDATED_IMPLEMENTATION_SHA: 68e64a143d40aea051df186e050b3c0fa33d6ae5
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 68e64a143d40aea051df186e050b3c0fa33d6ae5
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_TRUNCATION_TRUTH_DISCOVERY_PAGING_C01_V1_STATUS: IN_PROGRESS

## Objective

Establish mechanical truncation truth for source enumeration, content reading,
and operation projection: yield every discovered operation without a silent
cap, keep repository enumeration completeness disjoint from content-read
budget exhaustion, state COMPLETE | TRUNCATED | UNKNOWN explicitly with
truthful limit/examined/total/dropped, and surface that truth through the
census, CLI, and Control Center without changing runtime admission authority.

## Current Milestone

C-01 implementation complete and focused-green; required full validation
(`gate:local`, clean-checkout gate) not yet run and nothing committed.

## Work In Progress

Full validation and closure. All implementation acceptance criteria are
implemented and covered by focused tests; the remaining work is the required
full validation, `REPORT.md`, `ACTIVE_TASK.md`, and integration through the
C-00 session tooling.

## Exact Next Action

Run `npm run gate:local`, repair any failure, then run the clean-checkout gate,
then close out (REPORT.md, ACTIVE_TASK.md, `nightwatch-session integrate`).

## Starting evidence

- PRE-C01-BASELINE.md
- PRODUCTION-OBSERVABILITY-MASTER-PLAN.md
- PRODUCTION-OBSERVABILITY-INDEPENDENT-REVIEW.md
- openspec/changes/nightwatch-production-observability-system-map-master-plan-v1/tasks.md

## Completed Milestones

- Operation-projection truncation truth. The private silent
  `MAX_DISCOVERED_OPERATIONS = 128` (`continue` with no report) is replaced by
  the exported `MAX_PROJECTED_OPERATIONS = 4096`. The budget is dealt
  round-robin across repositories in deterministic `repoId` order and then
  re-sorted with the pre-existing comparator, so projection order is no longer
  eviction order and an earlier-sorting repository cannot silently evict
  another repository's operation identities. `operationCompleteness`
  participates in the discovery deterministic digest.
- Shared completeness vocabulary. New `src/core/source/completeness.ts`:
  `SourceCompletenessState = COMPLETE | TRUNCATED | UNKNOWN`;
  `worstCompleteness` with the conservative total order
  COMPLETE < TRUNCATED < UNKNOWN and UNKNOWN for zero inputs; `isComplete`,
  true for COMPLETE alone, as the only sanctioned "we saw everything"
  predicate; the seven `R2_COVERAGE_STATES`
  (PROVEN, UNPROVEN, UNSUPPORTED, TRUNCATED, STALE, UNKNOWN, UNMEASURED);
  `coverageAuthorityEffect` returning `DENY | NO_EFFECT` with no `GRANT`
  member by construction; `coverageStateForCompleteness`; `worstCoverageState`
  with UNMEASURED for zero inputs.
- Enumeration and content-read separation. `SourceScanCounters.budgetRejections`
  is removed and replaced by the disjoint `enumerationBudgetRejections` and
  `contentBudgetRejections`; the old counter charged an aborted directory walk
  and an unread file body to one number. `RealSourceSnapshotInventory` now
  carries `SourceInventoryCompleteness`
  (`nightwatch.source-inventory-completeness.v1`) with independent
  `enumeration` and `contentRead` dimensions and per-repository rows. An
  aborted walk reports `totalFiles: null`, `droppedFiles: null` and
  `remainingUnknown: true` instead of a fabricated zero. Content-read
  completeness is measured against the enumerated set, so it stays exact even
  when enumeration is bounded, and deliberate policy exclusions
  (`SOURCE_LANGUAGE_UNSUPPORTED`, `SOURCE_PRIVACY_REJECTED`) are counted as
  `policyExcludedFiles` and never weaken the state.
- Operation projection consumes both dimensions separately. `enumerationCompleteness`
  and `contentReadCompleteness` are reported alongside the projection's own
  state; a projection drop is countable and yields TRUNCATED, while an upstream
  bound is not countable and yields UNKNOWN with `totalOperations: null`.
- Census and CLI propagation. New
  `src/core/source/populationCompleteness.ts`
  (`nightwatch.source-population-completeness.v1`) is the single projection all
  consumers share, plus `unmeasuredSourcePopulationCompleteness` for fallbacks.
  `SourceEligibilityCensusSummary.population` added (census v2 → v3);
  `ReadOnlyCandidateCensus.population` added (census v1 → v2); every
  `bin/nightwatch-intelligence.mjs` source projection emits `completeness` and
  `operationCompleteness`, and `inventory.completeness` rides both inventory
  summaries.
- Downstream ceiling alignment. `buildPhase24CandidatePortfolio`'s hard `128`
  candidate ceiling became `MAX_PHASE24_CANDIDATES = 4096`, aligned with
  `MAX_PROJECTED_OPERATIONS`. It had silently coincided with the old discovery
  cap; with 223 real operations it made `eligibility-census`, `surfaces` and
  `review-queue` fail closed with `PHASE24_INVALID:CANDIDATE_COUNT`. Overflow
  still fails closed rather than dropping candidates.
- C-15a Control Center visibility. `ControlCenterSourceSummaryDto.completeness`
  added (`nightwatch.control-center.source-summary.v2 → v3`), projected in
  `sourceAdapter.ts` from `discovery.operationCompleteness` and
  `discovery.inventory.completeness`; the unavailable fallback is
  UNKNOWN/UNMEASURED with `total: null`, never a zeroed COMPLETE. The UI
  renders a POPULATION COMPLETENESS panel with separate ENUMERATION and
  CONTENT READ sub-panels, each with its own status pill, plus a warning
  callout; `statusTone` maps COMPLETE/PROVEN to ready and
  TRUNCATED/UNKNOWN/UNMEASURED to warning. `coverageState` is display-only.
- 43-vs-83 resolution recorded as D-105 (see Discoveries).

## Files Changed

- .agent/ACTIVE_TASK.md
- .agent/tasks/nightwatch-truncation-truth-discovery-paging-c01-v1/SPEC.md
- .agent/tasks/nightwatch-truncation-truth-discovery-paging-c01-v1/PLAN.md
- .agent/tasks/nightwatch-truncation-truth-discovery-paging-c01-v1/STATE.md
- .agent/tasks/nightwatch-truncation-truth-discovery-paging-c01-v1/REPORT.md
- src/core/source/completeness.ts (new)
- src/core/source/populationCompleteness.ts (new)
- src/core/source/scanTypes.ts
- src/core/source/scan.ts
- src/core/source/surfaceTypes.ts
- src/core/source/surfaces.ts
- src/core/source/eligibilityCensus.ts
- src/core/source/readonlyCandidateCensus.ts
- src/core/phase24/portfolio.ts
- bin/nightwatch-intelligence.mjs
- src/controlCenter/contracts/sourceGraph.ts
- src/controlCenter/adapters/sourceAdapter.ts
- src/controlCenter/server/defaultCollector.ts
- ui/control-center/src/types.ts
- ui/control-center/src/App.tsx
- ui/control-center/src/App.test.tsx
- tests/unit/sourceOperationCompleteness.test.ts (new)
- tests/unit/sourceInventoryCompleteness.test.ts (new)
- tests/unit/eligibilityCensus.test.ts
- tests/unit/cacheCurrentness.test.ts
- tests/unit/callScopedSourceRead.test.ts
- tests/unit/controlCenterAdapters.test.ts
- tests/unit/controlCenterAuthorityIntegration.test.ts
- tests/unit/controlCenterContracts.test.ts
- docs/CURRENT_STATE.md
- docs/ARCHITECTURE.md
- docs/ROADMAP.md
- docs/DECISIONS.md
- openspec/changes/nightwatch-production-observability-system-map-master-plan-v1/audit.md

## Validation Ledger

- `node_modules/.bin/tsc --noEmit` — exit 0.
- `npm run control-center:ui:typecheck` — exit 0.
- Focused Playwright `tests/unit/sourceInventoryCompleteness.test.ts` +
  `tests/unit/sourceOperationCompleteness.test.ts` — 13 passed.
- Focused Playwright `phase25SurfaceDiscovery`, `phase25SourceInventory`,
  `phase25Invalidation`, `phase25Adversarial`, `phase26SourceMetrics`,
  `cacheCurrentness`, `callScopedSourceRead`, `eligibilityCensus` — 40 passed.
- Focused Playwright `controlCenterAdapters`,
  `controlCenterAuthorityIntegration`, `controlCenterContracts` — 25 passed.
- `npm run control-center:ui:test` (vitest) — 12 passed.
- `npm run control-center:ui:browser` — build PASS, 1 browser qualification
  passed.
- `node bin/hardening-check.mjs` — PASS.
- Real approved source, read-only: `source-scan`, `source-gaps`,
  `readonly-census`, `eligibility-census`, `surfaces`, `review-queue` all run
  clean. `source-gaps` reports `routeOperationsFound: 223`,
  `routeOperationsTruncated: 0`, `responseContracts: 58`,
  `requestContracts: 222`, `routeProofs: 222`, `semanticContracts: 90`,
  `joinsAttempted: 223`, `joinsProven: 207`, discovery digest
  `source-surface-discovery:sha256:21de18a23a387d7b816db3c0`, snapshot
  `srcsnapshot:sha256:3d4b7a592ff57b139a8e9cc1`.
- Control Center visual verification at `http://127.0.0.1:7312/` over real
  source: operation projection UNKNOWN (warning tone), Population
  "223, TOTAL UNKNOWN", Remaining unknown YES; ENUMERATION TRUNCATED with
  Total files "TOTAL UNKNOWN" and Dropped files "UNKNOWN"; CONTENT READ
  COMPLETE (ready tone); callout "Coverage is reporting only and never grants
  admission."
- Required full validation (`gate:local`, clean-checkout gate) NOT run yet.
  Nothing committed or pushed.

## Decisions Made During This Task

- Truncation is bounded but never silent: the ceiling is a cost guard, and
  every drop is reported per repository.
- Per-repository round-robin dealing is the no-eviction mechanism.
- Enumeration completeness and content-read completeness are independent
  dimensions with independent states; the inventory-wide state is their
  conservative combination and is COMPLETE only when both are.
- An aborted enumeration reports null totals and `remainingUnknown: true`
  rather than a fabricated zero drop count.
- UNKNOWN ranks above TRUNCATED in the conservative order: a quantified loss is
  a stronger claim than an unquantifiable one, so combining can only weaken.
- Coverage may deny authority and never grants it; `R2CoverageAuthorityEffect`
  has no `GRANT` member by construction, and no admission path reads
  `coverageState`.
- The phase-24 candidate ceiling is raised, not removed: overflow still fails
  closed.
- Historical response-contract figures stay in the record, annotated as
  historical over the 128 cap; only current-truth statements were corrected.
  Analyzer semantics were not changed to force the numbers to agree.

## Discoveries

- The real approved-source population is enumeration-bounded in two of six
  repositories while content read is complete:
  `mobingilabs/ouchan` TRUNCATED (857 files, `SOURCE_FILE_COUNT_EXCEEDED`) and
  `mobingilabs/ripple-ui` TRUNCATED (773 files). `mobingilabs/ripple-api` is
  enumeration COMPLETE (96 files) and content COMPLETE (96/96), so its 223
  operations are a complete per-repository population. Both truncated
  repositories contribute zero operations. The old single `budgetRejections`
  counter made this state unreadable.
- 43-vs-83 is one metric measured twice over a silently capped population, not
  two metrics. `responseContracts` = surfaces with
  `contract.responseProof === 'PROVEN'`, defined identically at
  `src/core/source/eligibilityCensus.ts:728` and in the discovery counters.
  `83` was that metric at response-analyzer v3; `43` was the same metric at v4
  after the soundness hardening at `15fe2c1`; both at snapshot
  `srcsnapshot:sha256:04ff583971865f335902f5ad`. Decisive evidence that both
  were capped: `audit.md:166` records `43 (UNPROVEN 9, UNSUPPORTED 76)` and
  43 + 9 + 76 = 128 exactly, the old cap. The first honest whole-population
  measurement is 58 of 223. Recorded as D-105.
- The pre-C-01 128 discovery cap silently coincided with two downstream hard
  ceilings (`buildPhase24CandidatePortfolio` at 128 and
  `MAX_READONLY_CANDIDATE_HANDLER_FILES` at 128), so no overflow had ever been
  observed at those boundaries.

## Safety Events

- Two edits initially resolved against the canonical checkout through a
  relative path (`src/core/source/scan.ts`, `src/core/source/scanTypes.ts`).
  They were captured as a patch, reverted with `git checkout --`, canonical
  re-verified clean, and re-applied inside this worktree.
- One delegated documentation edit likewise landed in the canonical checkout
  (`openspec/.../audit.md`). It was byte-identical to the worktree edit,
  reverted with `git checkout --`, and canonical re-verified clean.
- No production, DEV, NEXT, credential, datastore, cloud, sibling-write, or
  publication authority was used. Sibling Alphaus repositories were read only,
  through the existing confined read-only access object.

## Blockers

NONE.

## Deferred / Follow-Up

- `MAX_READONLY_CANDIDATE_HANDLER_FILES = 128` in
  `readonlyCandidateCensus.ts` remains a hard fail-closed throw. It is not hit
  by the current approved source (the ripple-api handler set is smaller), but
  it is the next ceiling that will be reached as coverage widens; it is out of
  C-01 scope and belongs with the census-paging work.
- Per-repository enumeration limits for `mobingilabs/ouchan` and
  `mobingilabs/ripple-ui` are genuinely exhausted. Raising them is a coverage
  decision, not a truth decision, and is deferred.

## Resume Recipe

Read this file, then `.agent/ACTIVE_TASK.md`, then run
`node bin/nightwatch-session.mjs status` from this worktree. If the working
tree still holds the uncommitted C-01 change set, continue from Exact Next
Action: run `npm run gate:local`, repair, run the clean-checkout gate, then
close out and integrate.

## Completion Snapshot

NOT COMPLETE — full validation and integration pending.
