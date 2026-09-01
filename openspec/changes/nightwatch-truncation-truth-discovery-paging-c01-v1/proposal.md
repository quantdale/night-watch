# Proposal — Truncation Truth, Discovery Paging, and Early Coverage Surfacing (C-01)

## Why

Nightwatch's source pipeline bounded three populations — file enumeration,
file-body reading, and operation projection — but reported only counts.
The operation projection capped its output at a private
`MAX_DISCOVERED_OPERATIONS = 128` and silently dropped the remainder, so a
real `mobingilabs/ripple-api` snapshot that yields 223 operations was
measured as 128 and every derived metric (`responseContracts`,
`semanticContracts`, joins, lifecycle) was a measurement over a clamped
population. Enumeration and content-read exhaustion shared one
`budgetRejections` counter, so a half-walked repository and a fully
enumerated snapshot with unread bodies were indistinguishable. Durable docs
therefore carried two different `responseContracts` counts (83 at analyzer v3
and 43 at v4) for the same source snapshot at the same 128 cap without ever
reconciling them, and the Control Center had no place to state whether the
population it projected was whole.

Every whole-population claim must therefore state, mechanically, whether it
is the whole population. C-01 is `MA-??` placement on the revised critical
path `C-00 → C-01 → C-02a → C-06(PHP) → C-10 → C-11 → C-12 → C-13 → C-14`
(see `docs/DECISIONS.md` D-105), required before any later campaign treats
its census as complete.

## Change

Establish a mechanically enforced population-completeness model that every
surface reports in the same way:

> a population is `COMPLETE | TRUNCATED | UNKNOWN`, combined with a
> conservative weakest-wins order; enumeration and content-read are
> independent dimensions; operation projection reports the two upstream
> states separately; one shared projection renders the three dimensions for
> census, CLI, and Control Center; ceilings are raised and aligned and
> remain fail-closed; coverage may deny authority and never grants it.

The implementation is a data-only vocabulary layer and a shared projection
module over the existing bounded scanners — no new filesystem, network,
process, persistence, or admission authority, no daemon, no sibling
repository write.

## Expected result

- `src/core/source/surfaces.ts` no longer silently truncates: the cap
  becomes the exported `MAX_PROJECTED_OPERATIONS = 4096`, dealt round-robin
  across repositories in deterministic `repoId` order, re-sorted with the
  pre-existing comparator; a projection drop is reported as TRUNCATED with
  `droppedOperations`, while an uncountable upstream remainder is reported as
  UNKNOWN with `totalOperations: null`.
- `src/core/source/completeness.ts` owns the three completeness states, the
  conservative order `COMPLETE < TRUNCATED < UNKNOWN`, `worstCompleteness`
  (zero args ⇒ UNKNOWN), `isComplete` (COMPLETE only), the seven R2
  coverage states, and `coverageAuthorityEffect` returning `DENY | NO_EFFECT`
  with no `GRANT` member by construction.
- `RealSourceSnapshotInventory` carries `SourceInventoryCompleteness`
  (`nightwatch.source-inventory-completeness.v1`) with independent
  `enumeration` and `contentRead` dimensions and per-repository rows; an
  aborted walk reports `totalFiles: null`, `droppedFiles: null`,
  `remainingUnknown: true`; policy exclusions
  (`SOURCE_LANGUAGE_UNSUPPORTED`, `SOURCE_PRIVACY_REJECTED`) are counted
  separately and never weaken the state.
- `src/core/source/populationCompleteness.ts`
  (`nightwatch.source-population-completeness.v1`) is the single projection
  all consumers share; `SourceEligibilityCensusSummary.population` (census
  v2→v3) and `ReadOnlyCandidateCensus.population` (v1→v2) and every
  `bin/nightwatch-intelligence.mjs` source projection now emit the honest
  `completeness` block; the unavailable fallback is UNKNOWN/UNMEASURED with
  `total: null`.
- `buildPhase24CandidatePortfolio`'s hard `128` candidate ceiling becomes
  `MAX_PHASE24_CANDIDATES = 4096`, aligned with the discovery ceiling, still
  fail-closed on overflow.
- `ControlCenterSourceSummaryDto` moves
  `nightwatch.control-center.source-summary.v2 → v3` with a `completeness`
  block; the UI renders a POPULATION COMPLETENESS panel with separate
  ENUMERATION and CONTENT READ pills and a warning callout; unavailable
  measurements arrive as UNKNOWN/UNMEASURED with `total: null`, never a
  zeroed COMPLETE.
- The 43-vs-83 durable discrepancy is resolved as D-105: one metric
  (`responseContracts = surfaces with responseProof === 'PROVEN'`), analyzer
  v3 vs v4, both over the 128 cap (43+9+76=128); first honest
  whole-population figure is 58 of 223.

## Non-goals

C-01 grants no new product or runtime authority. It does not implement C-02a
(OpenAPI admission), protobuf, C-06 read-only proof, DEV/NEXT/production
policy, auth, or sibling repository modification. It does not change analyzer
semantics to force the historical numbers to agree, and it does not rewrite
historical phase-qualified records.
