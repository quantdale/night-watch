# Design — Truncation Truth, Discovery Paging, and Early Coverage Surfacing (C-01)

## Problem

`src/core/source/surfaces.ts` isolated `HEAD` of enumeration correctly — the
bounded file walk respected per-repository limits — but it did not isolate
the *claim* about that enumeration. The discovery pipeline parsed a whole
population and then projected a clamped one:

- `MAX_DISCOVERED_OPERATIONS = 128` (private) truncated per-repository-fair
  by coincidence: the parsed route list was iterated in repository discovery
  order, so an earlier-sorting repository could evict a later-sorting one's
  operations silently. The overflow was counted as `routeOperationsTruncated`
  but never participated in any schema, digest, or census. Every downstream
  metric therefore measured a clamped population without stating it.
- `SourceScanCounters.budgetRejections` collapsed two independent bounds
  (file-count/total-bytes on enumeration vs file-byte/total-bytes on content
  read) into one integer, so `scan.ts` could not report whether the walk was
  aborted or bodies were unread, and the inventory could not carry two
  independent states.
- `buildPhase24CandidatePortfolio` (hard `128`) and
  `MAX_READONLY_CANDIDATE_HANDLER_FILES` (hard `128`) silently coincided
  with the discovery cap, so overflow at those layers had never been
  observed and the census that proved them was itself capped.
- Durable docs treated two measurements of one metric over two caps as two
  metrics, because no vocabulary existed to say "this census is TRUNCATED
  and this total is UNKNOWN".

Isolation of the working directory does not fix a vocabulary gap. C-01 must
therefore add a vocabulary *and* the disjoint measurements that vocabulary
describes, and then wire one shared projection into every surface so no two
surfaces can disagree. The design is:
**bounded but never silent + disjoint dimensions + one shared projection +
fail-closed ceilings + coverage that may deny but never grants**.

## Component map

| Component | File | Authority |
|---|---|---|
| Shared vocabulary | `src/core/source/completeness.ts` | data-only; no filesystem, no network, no admission; owns `SourceCompletenessState`, `R2CoverageState`, `coverageAuthorityEffect` |
| Inventory completeness | `src/core/source/scanTypes.ts`, `src/core/source/scan.ts` | data-only scan contracts; disjoint `enumeration` / `contentRead` on `RealSourceSnapshotInventory` (`nightwatch.source-inventory-completeness.v1`) |
| Population projection | `src/core/source/populationCompleteness.ts` | data-only; single `buildSourcePopulationCompleteness` + `unmeasuredSourcePopulationCompleteness` for every consumer |
| Discovery paging | `src/core/source/surfaces.ts`, `src/core/source/surfaceTypes.ts` | exported `MAX_PROJECTED_OPERATIONS = 4096`, per-repository round-robin dealing, `SourceOperationProjectionCompleteness` (`nightwatch.source-operation-projection-completeness.v1`) |
| Census layer | `src/core/source/eligibilityCensus.ts`, `src/core/source/readonlyCandidateCensus.ts` | `SourceEligibilityCensusSummary.population` (v2→v3), `ReadOnlyCandidateCensus.population` (v1→v2) |
| CLI layer | `bin/nightwatch-intelligence.mjs` | every source projection emits `completeness` + `operationCompleteness`; `inventory.completeness` rides both inventories |
| Downstream ceiling | `src/core/phase24/portfolio.ts` | `MAX_PHASE24_CANDIDATES = 4096`, still fail-closed |
| Control Center backend | `src/controlCenter/contracts/sourceGraph.ts`, `src/controlCenter/adapters/sourceAdapter.ts`, `src/controlCenter/server/defaultCollector.ts` | `ControlCenterSourceSummaryDto` `v2→v3` with `completeness`; unavailable fallback is UNKNOWN/UNMEASURED with `total: null` |
| Control Center UI | `ui/control-center/src/types.ts`, `ui/control-center/src/App.tsx` | POPULATION COMPLETENESS panel with ENUMERATION + CONTENT READ pills; `statusTone` maps COMPLETE/PROVEN→ready, TRUNCATED/UNKNOWN→warning |

`src/core/source/completeness.ts` must stay free of filesystem or analyzer
imports (enforced by the handoff boundary), so every consumer can import the
vocabulary without pulling in a scanner, and the vocabulary can be tested
without sibling source.

## Ownership model

Invariant: `ONE_POPULATION == ONE_STATE == ONE_PROJECTION`.

The ownership of a population claim is layered, not centralized:

- each *enumeration* walk that hits a file-count or total-byte limit owns
  that fact for its repository and must report `totalFiles: null`,
  `droppedFiles: null`, `remainingUnknown: true` rather than a fabricated
  zero;
- each *content-read* pass that hits a per-file or total-byte limit owns its
  `droppedFiles` exactly, over the enumerated set;
- the *projection* layer that hits `MAX_PROJECTED_OPERATIONS` owns its
  `droppedOperations` exactly, and must also surface the two upstream states
  it inherited.

Rationale for that layering:

- it is *per dimension*, so a counterexample that is enumeration-bound but
  content-complete cannot be misread as "the census is truncated";
- `remainingUnknown` is per-repository and roll-up, so a single aborted walk
  weakens the whole `completeness.state` without inventing a total;
- it is visible from every projection through one module
  (`populationCompleteness.ts`), so the census, CLI, and Control Center never
  need separate logic and never disagree.

Record schema (`nightwatch.source-inventory-completeness.v1`):

```
schemaVersion, state, enumeration{state, limit, byteLimit, examinedFiles,
  totalFiles|null, droppedFiles|null, remainingUnknown},
  contentRead{state, fileByteLimit, totalByteLimit, candidateFiles, readFiles,
  admittedFiles, bytesRead, droppedFiles, unreadableFiles},
  repositories[{repository, state, enumeration, contentRead}]
```

No absolute path is stored: repository identity is `repoId`.
`SourcePopulationCompleteness` (`nightwatch.source-population-completeness.v1`)
carries the rendered `state`, `coverageState`, `operations{state, limit,
examined, total|null, projected, dropped, truncated, remainingUnknown}`,
`enumeration`, `contentRead`, and the repository distribution. The inventory
completeness and the operation completeness are always carried together; a
population claim without both is unmeasured.

Completeness classification:

| Class | Meaning | Honest headline |
|---|---|---|
| `COMPLETE` | bound not hit; total is exact | ready tone |
| `TRUNCATED` | bound hit, known number dropped | warning tone |
| `UNKNOWN` | bound aborted observation; remainder uncountable | warning tone |

The conservative total order `COMPLETE < TRUNCATED < UNKNOWN` means combining
states may only weaken a claim. `worstCompleteness` over zero args is UNKNOWN
— an unmeasured population is never COMPLETE by default — and `isComplete`
is true for COMPLETE alone. There is deliberately no `isNotTruncated` helper
that a caller could mistake for "we saw everything".

Coverage states (`R2_COVERAGE_STATES`) are exhaustive over "what do we know
about this population or contract": `PROVEN, UNPROVEN, UNSUPPORTED,
TRUNCATED, STALE, UNKNOWN, UNMEASURED`. `coverageAuthorityEffect` maps
`PROVEN → NO_EFFECT` and every other state → `DENY`; there is no `GRANT`
member by construction, and no admission path reads `coverageState`.

## Enumeration and content-read disjointness

The shared per-repository walk in `scan.ts` now reports two counters:

1. **Enumeration.** The directory walk enumerates `maxFiles` /
   `maxTotalBytes` files. When the walk is aborted mid-tree the inventory
   reports `state: TRUNCATED` for a countable overflow and `state: UNKNOWN`
   for an abort where the remainder cannot be quantified; `totalFiles` and
   `droppedFiles` are `null` and `remainingUnknown` is `true`. Policy
   exclusions (`SOURCE_LANGUAGE_UNSUPPORTED`, `SOURCE_PRIVACY_REJECTED`) are
   counted as `policyExcludedFiles` and never weaken the state, because they
   are deliberate, not resource-bounded.
2. **Content read.** Only the enumerated set is considered. Bodies that exceed
   `maxFileBytes` or cause `maxTotalBytes` to be exceeded are counted as
   `droppedFiles`; they are always knowable because the enumerated list is
   already in scope. The content-read dimension therefore stays exact even
   when enumeration is bounded (e.g. `mobingilabs/ripple-api` stays
   enumeration COMPLETE with 96 examined and content COMPLETE with 95 admitted
   + 1 privacy rejection, while `mobingilabs/ouchan` is enumeration TRUNCATED
   yet its content-read state over the 1732 enumerated files remains
   COMPLETE).

Additional cross-layer invariant: **if any repository walk is bounded, the
global `completeness.state` is at least TRUNCATED; if any walk is aborted,
it is UNKNOWN**. This is the mechanical detection of "the census total is a
floor, not a total" — the precise shape of the pre-C-01 misreading. It is
inert in a fully enumerated snapshot and never fabricates a completeness
value.

Policy exclusion has three mechanical detections: a file whose extension maps
to no `SourceScanLanguage`, a file whose path matches the privacy sentinel,
and a file that is not regular or is a symlink. Each increments a
rejection-count bucket, not a truncation counter, and the content-read state
treats them as "not truncation" by construction.

## Discovery paging

The previous silent `continue` is replaced by an exported, bounded,
per-repository-fair dealing:

```
entriesByRepository: Map<repoId, ParsedRoute[]>
projectionRepositories: sorted repoIds
maxRepositoryEntries = max length of any bucket
for round in 0..maxRepositoryEntries:
  for repoId in projectionRepositories:
    if projected.length >= MAX_PROJECTED_OPERATIONS break
    entry = buckets[repoId][round]; if missing continue
    project entry
```

`MAX_PROJECTED_OPERATIONS = 4096` is aligned with the upstream
`MAX_SIBLING_SOURCE_SCAN_FILES` so that a fully enumerated snapshot projects
every parsed operation. Projection order is no longer eviction order because
the dealt list is re-sorted with the pre-existing deterministic comparator
before digest and census; an earlier-sorting repository cannot silently evict
a later-sorting repository's operation identities — the no-eviction regression
proves this permanently. The projection's own truncation is countable, so it
yields `state: TRUNCATED` with `droppedOperations` and participates in the
discovery deterministic digest; an uncountable upstream remainder yields
`state: UNKNOWN` with `totalOperations: null`.

## One shared projection

`buildSourcePopulationCompleteness({ operationCompleteness,
inventoryCompleteness })` is the single rendering function every consumer
imports. It produces:

- `state` = weakest of `operations.state`, `enumeration.state`,
  `contentRead.state`;
- `coverageState` = `coverageStateForCompleteness(state)`;
- the three fact blocks with exact `limit`, `examined`, `total` (nullable),
  `projected`/`dropped`/`truncated`/`remainingUnknown`.

`unmeasuredSourcePopulationCompleteness(limit)` is the fallback for an
unavailable inventory or operation completeness; it reports UNKNOWN with
`total: null` and UNMEASURED coverage, never a zeroed COMPLETE, so an absent
measurement cannot be mistaken for a clean snapshot.

Behavioral rules that remain rules (documented in `AGENTS.md` and
`docs/DECISIONS.md`, not mechanically preventable from inside the censor):
no silent `continue` for a population member, no collapsed dimension, no
re-interpretation of `total: null` as `total: 0`, no zeroing of unmeasured
state. Their *effects* are caught by the completeness schemas and the
CLI/Control Center projections.

## Downstream ceiling alignment

```
discovery MAX_PROJECTED_OPERATIONS (4096) → phase-24 MAX_PHASE24_CANDIDATES (4096)
→ census population → CLI completeness → Control Center completeness
```

The phase-24 candidate ceiling is raised, not removed: overflow still fails
closed with `PHASE24_INVALID:CANDIDATE_COUNT` rather than dropping candidates,
which would reintroduce silent eviction at a lower layer. The handler file
ceiling `MAX_READONLY_CANDIDATE_HANDLER_FILES = 128` remains a hard
fail-closed throw; it is not hit by the current approved source but is the
next ceiling that will be reached as coverage widens. Raising it is a
coverage decision, not a truth decision, and is deferred to the census-paging
campaign.

## Control Center C-15a visibility

Backend: `ControlCenterSourceSummaryDto` (`v2→v3`) adds a required
`completeness: ControlCenterSourceCompletenessDto` block carrying the three
populations rendered by `populationCompleteness.ts`. The adapter projects it
from `discovery.operationCompleteness` and `discovery.inventory.completeness`;
the unavailable fallback is the unmeasured projection above.

UI: the Source Intelligence view renders a POPULATION COMPLETENESS article
with an operation-projection header pill plus two sub-panels, ENUMERATION
(File walk) and CONTENT READ (File bodies), each with its own status pill
and `statusTone` mapping (COMPLETE/PROVEN→ready, TRUNCATED/UNKNOWN/
UNMEASURED→warning). An unavailable inventory shows UNKNOWN/UNMEASURED with
`total: null` and `remainingUnknown: YES`, never a zeroed COMPLETE. A
warning callout states "Coverage is reporting only and never grants
admission." `coverageState` is display-only; no adapter, route, or dossier
code path reads it for authorization.

## D-105 truth resolution — analysis and decision

**Decision: keep history intact and correct only current truth.**

Every `128 operations` row that reports `62`, `83`, or `43`
`responseContracts` is the same metric
(`surface.contract.responseProof === 'PROVEN'` at
`src/core/source/eligibilityCensus.ts:728`) measured over the silently capped
128-operation projection. `83` is that metric at response-analyzer v3 before
commit `15fe2c1`; `43` is the same metric at v4 (soundness hardening, bounded
direct-return shape + mechanically complete branch requirement) at the same
snapshot `srcsnapshot:sha256:04ff583971865f335902f5ad` and the same 128 cap
(43+9+76=128 is the cap). Analyzer semantics are not changed to make the
numbers agree; historical phase-qualified anchors stay valid at their own SHA
and digest (`source-surface-discovery:sha256:906830010ed198639d3c7b91` at that
SHA); only current-truth statements are corrected. The first honest
whole-population measurement at the same snapshot after removing the cap is
58 of 223 (`source-surface-discovery:sha256:21de18a23a387d7b816db3c0`) with
`requestContracts: 222`, `routeProofs: 222`, `semanticContracts: 90`,
`joinsAttempted: 223`, `joinsProven: 207`.

## Diagnostics contract

All diagnostics are categorical, deterministic, and actionable:
fixed `SOURCE_*` and `REAL_SOURCE_*` codes, repository-relative counts only,
no environment dumps, no absolute machine paths, no credential-shaped values.
Completeness triples are never inferred — they are projected from the
bounded counters that measured the bound.
