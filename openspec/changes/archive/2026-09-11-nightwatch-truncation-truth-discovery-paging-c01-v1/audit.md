# Audit — Truncation Truth, Discovery Paging, and Early Coverage Surfacing (C-01)

## Observed silence (historical, repaired in this worktree)

During the production-observability source expansion (Phases 25–28 and the
read-only census, source-to-campaign chain) the discovery pipeline silently
bounded the number of projected operations:

- `src/core/source/surfaces.ts:59` (pre-C-01) declared a private
  `MAX_DISCOVERED_OPERATIONS = 128` and, once the parsed route list exceeded
  that ceiling, dropped the remainder with a bare `continue`, incrementing
  `routeOperationsTruncated` without ever surfacing a population claim. The
  parser had produced the whole population; the projection discarded it.
- `SourceScanCounters.budgetRejections` charged two disjoint hazards to one
  number: an aborted directory walk (`SOURCE_FILE_COUNT_EXCEEDED` /
  `SOURCE_TOTAL_BUDGET_EXCEEDED` on enumeration) and an unread file body
  (`SOURCE_FILE_TOO_LARGE` / `SOURCE_TOTAL_BUDGET_EXCEEDED` on content read).
  A fully enumerated snapshot with unread bodies and a half-walked repository
  were indistinguishable in the counter and in every downstream projection.
- `buildPhase24CandidatePortfolio` capped its input at a hard `128` candidates
  and `MAX_READONLY_CANDIDATE_HANDLER_FILES` capped the handler set at `128`;
  both ceilings silently coincided with the discovery cap, so no overflow had
  ever been observed at those boundaries. Neither failure would have been
  silent after the cap was raised — both fail closed — but the coincidence
  hid the fact that the discovery cap was already constraining real source.

The damage was not a crash; it was a silent eviction. Adding an
earlier-sorting repository would have removed an existing operation identity
without any diagnostic, and durable documentation compared phase measurements
taken over differently capped populations as if they were comparable.

## Verified current state at the C-01 starting checkpoint

Measured read-only at `68e64a143d40aea051df186e050b3c0fa33d6ae5`
(`session/nightwatch-truncation-truth-disc-b84ac363` base, `HEAD == origin/main`
before C-01):

- `node bin/nightwatch-intelligence.mjs source-gaps` over the six approved
  repositories (`alphauslabs/blue-sdk-go`, `alphauslabs/blueapi`,
  `alphauslabs/grpc-chunk-parser`, `mobingilabs/ouchan`,
  `mobingilabs/ripple-api`, `mobingilabs/ripple-ui`) reports
  `routeOperationsFound: 223`, `routeOperationsTruncated: 0` after the C-01
  repair, with `responseContracts: 58`, `requestContracts: 222`,
  `routeProofs: 222`, `semanticContracts: 90`, `joinsAttempted: 223`,
  `joinsProven: 207` and discovery digest
  `source-surface-discovery:sha256:21de18a23a387d7b816db3c0`.
- Before the repair the same snapshot
  `srcsnapshot:sha256:04ff583971865f335902f5ad` yielded `128` operations
  deterministically, with `responseContracts: 83` at analyzer v3 and
  `responseContracts: 43` at analyzer v4 (`15fe2c1` soundness hardening);
  `audit.md:166` of the master-plan change records `43 (UNPROVEN 9,
  UNSUPPORTED 76)` — 43+9+76=128 exactly, the old cap, not the real
  population. The first honest whole-population measurement after the repair
  is 58 of 223 (same snapshot, same analyzer v4, new projection).
- File enumeration is independently bounded per repository:
  `mobingilabs/ripple-api` enumeration COMPLETE (96 files) and content
  COMPLETE (96/96, 1 privacy rejection counted as policy exclusion, not
  truncation); `mobingilabs/ouchan` enumeration TRUNCATED
  (`SOURCE_FILE_COUNT_EXCEEDED`, 857 files examined, `totalFiles: null`,
  `droppedFiles: null`, `remainingUnknown: true`, 91
  `SOURCE_LANGUAGE_UNSUPPORTED` + 13 `SOURCE_PRIVACY_REJECTED` as policy
  exclusions); `mobingilabs/ripple-ui` enumeration TRUNCATED
  (`SOURCE_FILE_COUNT_EXCEEDED`, 773 files examined, 548 rejected, 539 of
  them `SOURCE_LANGUAGE_UNSUPPORTED`). Both truncated repositories contribute
  zero operations today, so the 223 `ripple-api` operations are a complete
  per-repository population while the global population is UNKNOWN.
- `src/core/source/scan.ts` now splits the old `budgetRejections` counter
  into `enumerationBudgetRejections` and `contentBudgetRejections`; the
  inventory carries `SourceInventoryCompleteness`
  (`nightwatch.source-inventory-completeness.v1`) with independent
  `enumeration` and `contentRead` dimensions and per-repository rows. An
  aborted walk reports `totalFiles: null`, `droppedFiles: null`,
  `remainingUnknown: true`.
- `src/core/source/completeness.ts` (`nightwatch.planner-executor-handoff.v1`
  is the handoff protocol; this is the first population-truth vocabulary)
  owns `SourceCompletenessState = COMPLETE | TRUNCATED | UNKNOWN`,
  `worstCompleteness` (zero args ⇒ UNKNOWN), `isComplete` (COMPLETE only),
  and the seven R2 coverage states with `coverageAuthorityEffect` returning
  `DENY | NO_EFFECT` and no `GRANT` member.
- `src/core/source/populationCompleteness.ts`
  (`nightwatch.source-population-completeness.v1`) is the single shared
  projection for census, CLI, and Control Center; `SourceEligibilityCensusSummary`
  carries `population` (census v2→v3) and `ReadOnlyCandidateCensus` carries
  `population` (v1→v2); every `bin/nightwatch-intelligence.mjs` source
  projection now emits `completeness` and `operationCompleteness`.
- `MAX_PROJECTED_OPERATIONS = 4096` (exported, `src/core/source/surfaces.ts`)
  replaces the private 128 cap; `MAX_PHASE24_CANDIDATES = 4096`
  (`src/core/phase24/portfolio.ts:247`) is aligned with it and still
  fail-closed on overflow. `MAX_READONLY_CANDIDATE_HANDLER_FILES = 128`
  remains a hard fail-closed throw and is the next ceiling coverage growth
  will reach.

## Why the existing validators did not catch it

The repository already owns deterministic validation
(`agent:check`, `project:check`, `handoff:check`, `hardening:check`,
`gate:local`, `gate:clean`), and the source pipeline owns
`source-scan`, `source-gaps`, `eligibility-census`, `surfaces`,
`review-queue` projections. Every one of those checks projected **counts**,
not **population claims**:

| Silence element | Where it lived | Visible to a pre-C-01 validator |
|---|---|---|
| `MAX_DISCOVERED_OPERATIONS` overflow | private constant + `continue` in `surfaces.ts` | only as `routeOperationsTruncated` (a number with no schema, never in a digest) |
| enumeration vs content-read conflation | single `budgetRejections` counter in `scanTypes.ts` | as one integer; no dimension to assert |
| orphaned downstream 128 ceilings | `portfolio.ts` and `readonlyCandidateCensus.ts` | never exercised because discovery never exceeded 128 |
| 43-vs-83 response-contract discrepancy | durable docs over the capped population | as two historical rows, both over 128, never flagged clamped |

A bound whose drops cannot be counted (an aborted enumeration walk) was
represented as a numeric drop count, and a bound whose drops can be counted
(operation projection) was represented as no claim at all. Neither shape can
be distinguished from a complete measurement without an explicit
`COMPLETE | TRUNCATED | UNKNOWN` vocabulary, which did not exist before C-01.
C-01 adds that vocabulary, makes the two dimensions disjoint, and wires the
honest projection into every surface that reports a population so no two
surfaces can disagree.

## Correction to the 43-vs-83 durable truth

Review of durable docs found two different `responseContracts` counts for one
identical source snapshot `srcsnapshot:sha256:04ff583971865f335902f5ad`:

- `43` at `openspec/changes/nightwatch-production-observability-system-map-master-plan-v1/audit.md:166` (`43 UNPROVEN 9 UNSUPPORTED 76`);
- `83` at `docs/CURRENT_STATE.md` phase tables (Phase 27 anchor
  `237e537e154bdb7c0eb7b4bd04021f9c5437db29`) and earlier rows.

Both are `responseContracts = surfaces with contract.responseProof === 'PROVEN'`
defined identically at `src/core/source/eligibilityCensus.ts:728` and in the
discovery counters. The exact equality 43+9+76=128 proves both were measured
over the silently capped 128-operation projection, not over the real
population. `83` is that metric at response-analyzer v3 (pre-hardening, before
commit `15fe2c1`); `43` is the same metric at analyzer v4 (post-hardening,
bounded direct-return shape + mechanically complete branch requirement) at the
same snapshot and the same 128 cap (discovery digest
`source-surface-discovery:sha256:906830010ed198639d3c7b91` at that SHA). The
first honest whole-population figure at the same snapshot after removing the
cap is `58` of `223` (discovery digest
`source-surface-discovery:sha256:21de18a23a387d7b816db3c0`), verified in this
worktree with `node bin/nightwatch-intelligence.mjs source-gaps`. The earlier
C-01 digest `source-surface-discovery:sha256:fb553ea66d4cc98b29294565` is the
same 223-operation population measured before the inventory-completeness
contract entered the snapshot digest, not a different population.

C-01 resolves this as D-105 (`docs/DECISIONS.md`): historical
phase-qualified records stay intact and unambiguously historical; only
current-truth statements are corrected; analyzer semantics are not changed to
force agreement. Coverage remains reporting only and may deny authority and
never grants it.

## What C-01 must add

1. One shared, data-only completeness vocabulary that any population can
   import: three states with the conservative total order
   `COMPLETE < TRUNCATED < UNKNOWN`, a weakest-wins combiner whose zero-arg
   result is UNKNOWN, a single "we saw everything" predicate true for
   COMPLETE alone, and the seven R2 coverage states whose authority effect
   has no GRANT member by construction.
2. Disjoint enumeration and content-read completeness measured at the layer
   that owns each bound, with independent budgets, per-repository rows, and
   an honest null-total representation for aborted walks and uncountable
   remainders, plus policy exclusions counted separately and never read as
   truncation.
3. A bounded, per-repository-fair operation projection that replaces the
   silent private 128 cap with the exported `MAX_PROJECTED_OPERATIONS = 4096`
   dealt round-robin in deterministic `repoId` order, re-sorted with the
   pre-existing comparator so projection order is no longer eviction order,
   participation in the deterministic digest, and an explicit TRUNCATED vs
   UNKNOWN distinction for countable projection drops vs uncountable upstream
   remainder.
4. One shared population projection that renders the three dimensions for
   every consumer (`SourceEligibilityCensusSummary.population` v2→v3,
   `ReadOnlyCandidateCensus.population` v1→v2, every
   `bin/nightwatch-intelligence.mjs` source projection, and the Control Center)
   so no two surfaces can disagree, with an unmeasured fallback that reports
   UNKNOWN/UNMEASURED with `total: null` and never a zeroed COMPLETE.
5. An aligned, still fail-closed downstream ceiling
   (`MAX_PHASE24_CANDIDATES = 4096` in `buildPhase24CandidatePortfolio`)
   and a visible C-15a Control Center surface
   (`nightwatch.control-center.source-summary.v2 → v3`) that carries a
   `completeness` block and renders a POPULATION COMPLETENESS panel with
   separate ENUMERATION and CONTENT READ pills and a warning callout; coverage
   remains display-only and never grants admission.
