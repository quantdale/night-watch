# Report — C-01 Truncation Truth, Discovery Paging, and Early Coverage Surfacing

Task ID: nightwatch-truncation-truth-discovery-paging-c01-v1
Phase: TRUNCATION_TRUTH_DISCOVERY_PAGING_C01_V1
Status: COMPLETE
Starting SHA: 68e64a143d40aea051df186e050b3c0fa33d6ae5
Last validated implementation SHA: 4d8c88aba9bbb53b900e9f1d2c24bc3ed7b95778
Branch: session/nightwatch-truncation-truth-disc-b84ac363

## What changed and why

Nightwatch reported populations it had not observed. Operation projection
stopped at a private `MAX_DISCOVERED_OPERATIONS = 128` with a bare `continue`,
and `SourceScanCounters.budgetRejections` charged an aborted directory walk and
an unread file body to the same number. A census therefore could not
distinguish "this is the whole product surface" from "this is the first 128 of
it", nor "fully enumerated, some bodies unread" from "half-walked".

C-01 makes every reported population state, mechanically, whether it is the
whole population.

- **One vocabulary.** `src/core/source/completeness.ts` owns
  `COMPLETE | TRUNCATED | UNKNOWN`, the conservative combination order
  `COMPLETE < TRUNCATED < UNKNOWN` (combining may only weaken; zero inputs give
  UNKNOWN, never a vacuous COMPLETE), and `isComplete`, true for COMPLETE
  alone, as the only sanctioned "we saw everything" predicate.
- **Countability decides the state.** A bound whose drops can be counted yields
  TRUNCATED with an exact `droppedOperations`. A bound that aborts observation
  yields UNKNOWN with `totalOperations: null` and `remainingUnknown: true`.
  An aborted enumeration never reports a fabricated zero.
- **Two disjoint upstream dimensions.** `budgetRejections` is replaced by
  `enumerationBudgetRejections` and `contentBudgetRejections`.
  `SourceInventoryCompleteness` (`nightwatch.source-inventory-completeness.v1`)
  carries independent `enumeration` and `contentRead` states plus
  per-repository rows. Content-read completeness is measured against the
  enumerated set, so it stays exact even when enumeration is bounded, and
  deliberate policy exclusions (`SOURCE_LANGUAGE_UNSUPPORTED`,
  `SOURCE_PRIVACY_REJECTED`) are counted as `policyExcludedFiles` and never
  read as truncation.
- **Bounded, fair projection.** `MAX_PROJECTED_OPERATIONS = 4096` is exported
  and the budget is dealt round-robin across repositories in deterministic
  `repoId` order before re-sorting, so projection order is not eviction order
  and an earlier-sorting repository cannot silently evict another
  repository's operation identities. `operationCompleteness` participates in
  the discovery deterministic digest, so a truncated discovery can never share
  a digest with a complete one.
- **One projection everywhere.** `src/core/source/populationCompleteness.ts`
  (`nightwatch.source-population-completeness.v1`) is the single shared
  rendering used by the eligibility census (v2 → v3), the read-only census
  (v1 → v2), every `bin/nightwatch-intelligence.mjs` source command, and the
  Control Center, so two surfaces cannot disagree about the same population.
- **Seven R2 coverage states.**
  `PROVEN, UNPROVEN, UNSUPPORTED, TRUNCATED, STALE, UNKNOWN, UNMEASURED`.
  `coverageAuthorityEffect` returns `DENY | NO_EFFECT`. There is deliberately
  no `GRANT` member: coverage may deny authority and never grants it, and no
  admission, eligibility, or selector path reads `coverageState`.
- **C-15a visibility.** `nightwatch.control-center.source-summary.v3` exposes
  total/limit/dropped/completeness with separate enumeration and content-read
  blocks; the unavailable fallback is UNKNOWN/UNMEASURED with `total: null`,
  never a zeroed COMPLETE. The UI renders a POPULATION COMPLETENESS panel with
  its own status pills for ENUMERATION and CONTENT READ, and a warning callout.

## Measured result

`node bin/nightwatch-intelligence.mjs source-gaps` against the approved
read-only source:

| Metric | Value |
|---|---|
| `routeOperationsFound` | 223 |
| `routeOperationsTruncated` | 0 |
| `responseContracts` | 58 |
| `requestContracts` | 222 |
| `routeProofs` | 222 |
| `semanticContracts` | 90 |
| `joinsAttempted` / `joinsProven` | 223 / 207 |
| discovery digest | `source-surface-discovery:sha256:21de18a23a387d7b816db3c0` |

Per repository, the separation immediately pays for itself:

| Repository | Enumeration | Content read | Operations |
|---|---|---|---|
| `mobingilabs/ripple-api` | COMPLETE (96 files) | COMPLETE (96/96) | 223 |
| `mobingilabs/ouchan` | TRUNCATED (`SOURCE_FILE_COUNT_EXCEEDED`, 857 files) | COMPLETE | 0 |
| `mobingilabs/ripple-ui` | TRUNCATED (`SOURCE_FILE_COUNT_EXCEEDED`, 773 files) | COMPLETE | 0 |
| `alphauslabs/blue-sdk-go`, `alphauslabs/blueapi`, `alphauslabs/grpc-chunk-parser` | COMPLETE | COMPLETE | 0 |

The inventory-wide state is UNKNOWN because two repositories are
enumeration-bounded, while `ripple-api`'s 223 operations are a genuinely
complete per-repository population. The old single counter made that
distinction unreadable.

## 43 vs 83 — resolved as D-105

One metric, not two. `responseContracts` = surfaces with
`contract.responseProof === 'PROVEN'`, defined identically at
`src/core/source/eligibilityCensus.ts:728` and in the discovery counters.

- `83` — analyzer v3, before the soundness hardening at `15fe2c1`.
- `43` — the same metric at analyzer v4, same snapshot
  `srcsnapshot:sha256:04ff583971865f335902f5ad`.
- Both were measured over the silently capped population. The decisive
  evidence is `audit.md:166`, which records `43 (UNPROVEN 9, UNSUPPORTED 76)`:
  43 + 9 + 76 = 128 exactly, the old cap, not a real population.
- The first honest whole-population measurement is **58 of 223**.

Historical phase-qualified records were kept and annotated as historical over
the 128 cap; only current-truth statements were corrected. Analyzer semantics
were not changed to force the numbers to agree.

## Side effect found and fixed

`buildPhase24CandidatePortfolio` capped candidates at 128 and had silently
coincided with the discovery cap, so it had never been observed to overflow.
With 223 real operations it failed closed with
`PHASE24_INVALID:CANDIDATE_COUNT`, breaking `eligibility-census`, `surfaces`
and `review-queue`. The ceiling is now `MAX_PHASE24_CANDIDATES = 4096`, aligned
with `MAX_PROJECTED_OPERATIONS`; overflow still fails closed rather than
dropping candidates.

## Validation

- `npm run gate:local` — **PASS**, all eleven required groups
  (`GATE_DEFINITION`, `STATIC`, `HARDENING`, `HANDOFF_TRUTH`, `PROJECT_TRUTH`,
  `AGENT_CONTINUITY`, `SEMANTIC_COMPATIBILITY`, `OWNER_PROVENANCE`,
  `SYNTHETIC_CAMPAIGN`, `PATCH_INTEGRITY`, `WORKSPACE_INTEGRITY`).
- `npm run gate:clean` — **PASS** at `sourceHead`
  `4d8c88aba9bbb53b900e9f1d2c24bc3ed7b95778`, Node 20, `installResult: PASS`,
  `gateResult: PASS`, all eleven groups PASS,
  receipt `receipt:sha256:10e254cef07010adf2d56f8f`.
- Full canonical regression `npm test` — **2,753 passed, 13 skipped, 0 failed**.
- `npm run control-center:ui:test` — 12 passed.
  `npm run control-center:ui:browser` — build PASS, 1 qualification passed.
  `npm run control-center:ui:typecheck` — exit 0.
- Control Center visually verified against the running server over real
  source: operation projection UNKNOWN (warning tone), Population
  "223, TOTAL UNKNOWN", Remaining unknown YES; ENUMERATION TRUNCATED with
  Total files "TOTAL UNKNOWN" and Dropped files "UNKNOWN"; CONTENT READ
  COMPLETE (ready tone); callout "Coverage is reporting only and never grants
  admission."
- All six source CLI commands run clean against approved read-only source.

New focused suites: `tests/unit/sourceOperationCompleteness.test.ts` (3 cases)
and `tests/unit/sourceInventoryCompleteness.test.ts` (10 cases) cover the
enumeration limit with an unknown remainder, complete enumeration with limited
content reads, policy exclusion as non-truncation, deterministic truncation
metadata with digest separation, census propagation, the UNKNOWN-is-not-
COMPLETE invariant, and a projection above `MAX_PROJECTED_OPERATIONS`
producing explicit TRUNCATED rather than silent loss.

## Acceptance criteria

| Criterion | Result |
|---|---|
| ripple-api yields all 223 operations, no silent stop at 128 | MET |
| Permanent no-eviction regression | MET |
| Explicit limit / examined / total / dropped / UNKNOWN | MET |
| All previous operation identities preserved | MET |
| C-00 adversarial-matrix summary is the mechanically proven 39 | MET — `docs/CURRENT_STATE.md:125` and the C-00 `REPORT.md` already carried 39; `tests/unit/workspaceIsolation.test.ts` contains exactly 39 `test('` cases; the C-00 Validation Ledger's intermediate `36/36` / `38/38` progression is now explicitly labelled non-terminal |
| Full required validation green | MET |

## Authority

C-01 granted no new product or runtime authority. Coverage and completeness are
reporting only. No production, NEXT, DEV contact, credential inspection,
datastore, cloud/IAM/Kubernetes, sibling-repository write, or publication
authority was used. Sibling Alphaus repositories were read only, through the
existing confined read-only access object. C-02a was not started.

## Deferred

- `MAX_READONLY_CANDIDATE_HANDLER_FILES = 128` in
  `readonlyCandidateCensus.ts` remains a hard fail-closed throw. It is not
  reached by the current approved source but is the next ceiling coverage
  growth will hit.
- Raising the per-repository enumeration limits for `mobingilabs/ouchan` and
  `mobingilabs/ripple-ui` is a coverage decision, not a truth decision.

## Safety events

Two source edits and one delegated documentation edit initially resolved
against the canonical checkout through relative paths. Each was captured,
reverted with `git checkout --`, canonical re-verified clean, and re-applied
inside the owned session worktree. No other session's work was touched, no
force-push occurred, and nothing was deleted.
