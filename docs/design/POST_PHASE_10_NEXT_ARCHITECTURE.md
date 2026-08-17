# Post-Phase-10 — Next Bug-Hunting Architecture Design Review

> Repository-native design document (`docs/design/*.md` approved checkpoint
> path). Authoring task:
> `post-phase-10-next-architecture-design-review` (Phase `POST-10-DESIGN`,
> authorization `POST_PHASE_10_NEXT_ARCHITECTURE_DESIGN_REVIEW_ONLY`,
> 2026-08-16, starting SHA `1d7dd6cb6525195e59602e106f50306859a7998d`).
> This document SELECTS the next Nightwatch investment; it does NOT
> implement it. `NEXT_PHASE_IMPLEMENTATION_AUTHORITY: NOT_GRANTED`.

---

## 1. Phase 10 terminal proof (reconstructed from source + durable records)

| # | Capability | Synthetic proof | Real DEV proof | Scope | Current limitation |
|---|---|---|---|---|---|
| A | Recipe schema v2 (`nightwatch.real-source-expectation-recipe.v2`) | 2 v2 recipes validated; v1 byte-meaning-stable for 2 v1 targets; retired v1 archived `corpus/phase10/historical/` | v2 derivation at 169df39d: 4/4 derived, depths [2,2,3,3] | mobingilabs/ripple-api only | finite-key contracts NOT admitted (`SOURCE_ENUM_FLOW_UNPROVEN`) |
| B | Current-source type-flow extraction (`PHP_ITEM_FIELD_TYPE_FLOW`) | Fixed patterns: EMPTY_CAST_OBJECT => ['OBJECT']; EMPTY_ARRAY_OR_STRING_KEYS => ['ARRAY','OBJECT']; else TYPE_FLOW_AMBIGUOUS; deterministic 3 repeats / 0 mismatches; ev:sha256 bound | 10B: derivation PASS at exact snapshot | ExchangeRate.php cast/assignment patterns | 2 extractor patterns only; no const/permission extraction |
| C | Common-exchange deep OBJECT contract | TYPE_MATCH [0, exchange_rate] OBJECT — baseline 0/1 seeded deep defect (STRING scalar) vs enriched 1/1 | **10B DEV PASS** — FIRST+REPLAY 4/4/0/0/0, deep invariant decisive, deterministic | `ripple.common-exchange.read` | item-0 only (see §6) |
| D | Payer OBJECT\|ARRAY contract | TYPE_IN_SET [0, exchange_rate] {OBJECT, ARRAY} — 1/1 seeded defects detected; benign empty-ARRAY union PASS | synthetic only — no 10B for payer | `ripple.payer-exchange.read` | item-0 only; no DEV acceptance |
| E | `TYPE_IN_SET` invariant | Vocabulary validation 1..6 types; NOT_APPLICABLE for empty/uninspected parent; evaluated in invariant matrix | 10B: not exercised (common uses TYPE_MATCH, not TYPE_IN_SET) | 2 contracts use it | same single-index path limitation |
| F | Source-evidence digest / currentness | ev:sha256 over normalized extraction; freshness matrix A-E + section-44 mutation canaries all fail closed; no auto-rebinding | 10B: RESOLVED at exact snapshot | per-expectation binding | re-derivation is a bespoke per-run ceremony |
| G | Baseline 0/4 vs deep 4/4 synthetic detection | shape-only baseline detects 0/4 seeded deep defects; enriched v2 detects 4/4 (`baselineDeepDefectDetections=0`, `phase10DeepDefectDetections=4`) | n/a | synthetic corpus | all 4 planted defects are at item 0 |
| H | Benign false positives | 10/10 benign PASS, 0 FP including payer valid empty-ARRAY union | 10B: zero anomalies (healthy evidence) | synthetic corpus + 1 DEV pass | real-world benign variety untested beyond one journey |
| I | Privacy | sentinel sweep + unknown-key probe: 0 leaks; field-name surface is the only key-name projection | 10B structural audit PASS (0 raw body files/screenshots/traces) | projections/findings/dossiers/receipts | DOM text never projected (by design) |
| J | Campaign/dossier integration | TYPE_CONTRADICTED findings flow through orchestrator -> triage -> dossiers with `semanticEvidence`; paired baseline admits zero | real campaign does NOT wire semanticOracle | synthetic campaigns | real campaign semantic hook not wired |
| K | Contained DEV deep acceptance (common-exchange) | n/a (harness designed in 10A) | **10B: FIRST + REPLAY both 4/4/0/0/0, PASS, deterministic, zero safety events** | ONE journey + ONE deep expectation | 3 of 4 admitted targets never DEV-evaluated; item-0 only |
| L | FIRST/REPLAY determinism | semanticReplayDeterministic unit matrix | 10B: both passes deterministic | journey pair | single journey pair |
| M | Actual real semantic anomalies observed | n/a | **0** (NONE_OBSERVED) | — | no natural semantic anomaly ever observed |

Phase 10B produced **semantic mechanism proof: YES (PASS); real semantic
anomaly: NO (NONE_OBSERVED)**. "No anomaly observed" is NOT evidence that
anomaly handling or broader coverage is unnecessary — it is evidence that
the mechanism runs cleanly on one narrow real contract at one point in time.

## 2. Current pipeline (source-reconstructed, 2026-08-16)

```
source/change intelligence        collectChangeset/selectJourneys (6-repo,
                                  22-edge path-prefix map; empty/unknown
                                  window -> conservative BASELINE_HEALTH
                                  fallback incl. all 3 canaries)
        |
journey/test selection            buildCampaignSelection: fixed 3-journey
                                  lineage (JOURNEY->API->EXPLORATION->
                                  REPRODUCTION); exploration suppressed in
                                  the real profile (maxExplorationContexts 0)
        |
campaign orchestration            CampaignOrchestrator: resumable pure state
                                  machine; atomic budget; feasibility reserve;
                                  maxPromotedClusters 1 (real); storm
                                  suppression; FAILURE_STORM stop
        |
browser/API execution             declarative read-only journeys (3 reviewed
                                  contracts); Phase 5 restricted read-only
                                  API relay (3 ops); reproduction = full-
                                  sequence live re-execution
        |
oracles                           protocol/structural (passiveChecks,
                                  resourceChecks, Phase 5 oracle) + Phase 9
                                  semantic channel (composed stage in Phase 5
                                  semantic.ts + network-observer hook) -- the
                                  real campaign does NOT construct a
                                  semanticOracle; only the Phase 9B/10B
                                  runners do (one expectation each)
        |
anomaly -> triage                 triageAnomaly (pipeline.ts): minimizeFailure
                                  (ddmin + 1-deletion audit) + compareBrowser
                                  AndApi (class-level) + correlateSourceChanges
                                  + localizeFaultBoundary (heuristics) +
                                  createBugDossier; REAL ADAPTER reduced-
                                  candidate replay = invalidReducedReplay stub
        |
clustering/dedup                  fingerprint + 12 feature dims + transient
                                  class (metadata-based)
        |
dossier                           deterministic sanitized dossier +
                                  human recipe + AI-ready package, atomic
                                  owner-only persistence; additive
                                  semanticEvidence when present
```

## 3. Semantic depth x collection coverage (real semantic targets)

| target | journey | source-backed expectation | depth | DEV accepted | row coverage | differential | triage |
|---|---|---|---|---|---|---|---|
| ripple.common-exchange.read | ripple-common-exchange-read | YES (`...real-source-deep`, v2) | **L3** (TYPE_MATCH OBJECT at item) | **YES** (10B PASS) | **ITEM_0_ONLY** | NOT_AVAILABLE | minimizer stub |
| ripple.payer-exchange.read | ripple-payer-exchange-read | YES (`...real-source-deep`, v2) | **L3** (TYPE_IN_SET {OBJECT,ARRAY}) | no | **ITEM_0_ONLY** | NOT_AVAILABLE | minimizer stub |
| ripple.account-inventory.read | ripple-account-inventory | YES (`...real-source-shape`, v1) | L2 (15 FIELD_PRESENT) | shape-only (9B-R1) | **ITEM_0_ONLY** | NOT_AVAILABLE | minimizer stub |
| ripple.billing-group-exchange.read | none | YES (`...real-source-shape`, v1) | L2 (4 FIELD_PRESENT) | no | **ITEM_0_ONLY** | NOT_AVAILABLE | minimizer stub |

Totals: admitted 4; DEV-reachable 3; real-DEV-accepted deep 1; invariant
depth distribution [2,2,3,3] (L1 0, L2 2, L3+ 2); **ALL row coverage
ITEM_0_ONLY**; differential 0 viable pairs; triage stub on all.

The matrix answers the critical question: **depth increased (Phase 10)
but collection breadth stayed at one row for every target**. A perfect L3
invariant evaluated only at item 0 still misses a real defect at row 1+.

## 4. Natural real-finding history

- Real contained runs: several (Phase 2A/2B/2C journeys, Phase 4
  exploration, Phase 5 API, Phase 7 bounded campaign, Phase 9B-R1 pair,
  Phase 10B pair).
- Admitted product anomalies: **0** (the only natural L0 candidate — J2
  font 502 — never reproduced; Phase 7 terminal state: NO ADMITTED PRODUCT
  ANOMALIES; the historical budget-starvation finding was a Nightwatch
  defect, fixed by Hardening I/I.1).
- Reproducible semantic anomalies: **0** (9B-R1: NONE_OBSERVED; 10B:
  NONE_OBSERVED).
- High-confidence actionable dossiers: **0** (real).

Key observation: Nightwatch today suffers primarily from **not detecting
enough defects on the surfaces it exercises** — not from a lack of
anomalies to process (there are none), and not from post-detection
machinery (which is well-designed but consumes nothing real). However, the
post-detection machinery is also not fully proven: the minimization
reducer is stubbed (finding #1) and no cross-surface comparator is wired.

## 5. Current bug-yield model

```
useful bug yield =
  surfaces exercised
  x P(real defect)
  x P(detection)
  x P(actionable)
```

- **surfaces**: fixed by containment (~3 journeys + 3 API ops; ceiling
  ~4-5 admitted operations).
- **P(real defect)**: product property, unknown, assumed > 0 on any real
  surface. Cannot be controlled by Nightwatch.
- **P(detection)**: now nonzero for shape/type classes BUT **item-0-only**
  for every collection contract. A real defect at row 1+ of a multi-row
  response is INVISIBLE. This is the **most suppressive multiplier**.
- **P(actionable)**: machinery-limited (minimization stub, differential
  unreachable, zero natural anomalies to process). Latent; cannot create
  detections.

Phase 9 raised P(detection) from ~0 to nonzero (shape classes).
Phase 10 raised P(detection) further (L3 type classes on 2 targets).
**P(detection) has the most remaining headroom** — specifically its
collection-item breadth. Collection-wide evaluation directly raises this
term on every existing real L3+ contract.

## 6. Collection item-coverage gap (source-verified, synthetically proven)

### 6a. Architecture trace (end to end)

```
recipe blueprint
  itemIndex: 0 (registry.ts: all 4 recipes)
    |
admission (admission.ts)
  builds invariant at path [String(itemIndex), field]
  e.g. ['0', 'exchange_rate'], ['0', 'month']
    |
invariant path resolution (invariants/paths.ts: resolvePathWithAmbiguity)
  exactly ONE numeric segment; resolves exactly ONE node
  empty/uninspected parent array -> NOT_APPLICABLE (never anomaly)
  beyond inspected window -> NOT_APPLICABLE
    |
projection lookup (projections/projector.ts)
  retains up to maxArrayItemsInspected: 128 items
  full safe per-item metadata (types, presence, opaque tokens)
  arrayTruncated flag when itemCount > inspectedCount
    |
evaluator (invariants/evaluate.ts)
  single-node verdict: node.type === invariant.expectedType -> PASS
    |
finding per-invariant
```

**Limitation classification: CONFIRMED_COLLECTION_ITEM_COVERAGE_GAP**

The limitation is **architectural** (invariant vocabulary + path semantics
evaluate exactly one node) reinforced by **blueprint convention** (all 4
recipes use `itemIndex: 0`). It is NOT a projection limitation — the
projector retains up to 128 items with full safe structure.

### 6b. Synthetic proof (throwaway test, deleted after run)

Test body: `derivePhase10FixtureExpectations()` + `evaluateSemanticResponse()`
against common-exchange (TYPE_MATCH OBJECT) and payer (TYPE_IN_SET
{OBJECT,ARRAY}) deep expectations.

| case | body | current outcome | verdicts | meaning |
|---|---|---|---|---|
| A | 100 rows all valid | PASS | all PASS | baseline control |
| B | row 0 invalid (STRING) | **ANOMALY** | TYPE_MATCH:VIOLATED at [0,exchange_rate] | positive control |
| C | row 0 valid, row 1 invalid | **PASS** | all PASS | **later-row defect invisible** |
| D | row 0 valid, row 57 invalid (within 128) | **PASS** | all PASS | **within inspected bound: still invisible** |
| E | row 0 valid, row 200 invalid (beyond 128) | **PASS** | all PASS | **uninspected tail: invisible** |
| F | empty array | PASS | item checks NOT_APPLICABLE | honest (SPEC section 31) |
| G | 201 rows all valid (truncated) | PASS | all PASS | no false violation on truncation |
| H | row 0 has fields, row 57 missing `month` | **PASS** | all PASS | **FIELD_PRESENT gap: invisible** |
| I | payer row 0 valid, row 1 NUMBER scalar | **PASS** | TYPE_IN_SET:PASS at [0] | **TYPE_IN_SET gap: invisible** |
| J | projection: 100/100 items retained, not truncated | itemCount=100, inspectedCount=100 | — | projector supports multi-item |

**All 4 invariant kinds evaluated on real contracts are item-0-only.**
Every later-row defect — missing field, wrong type, type-set violation —
passes today. This is not a theoretical concern: real exchange-rate
responses are arrays of month-rows (multi-row when querying ranges); a
real defect in a later month's row would be missed.

### 6c. Classification

- **FIELD_PRESENT**: item-0 only — CONFIRMED
- **TYPE_MATCH**: item-0 only — CONFIRMED
- **TYPE_IN_SET**: item-0 only — CONFIRMED
- **Projection bound**: `maxArrayItemsInspected: 128`
  (DEFAULT_PROJECTION_LIMITS)
- **Architecture vs blueprint**: architectural (single-index path +
  single-node evaluation) reinforced by blueprint convention (all 4
  recipes `itemIndex: 0`)
- **Privacy of collection scan**: projection per-item carries only
  types/presence/opaque tokens — NO raw values; scanning additional items
  adds NO sensitive data; counts/ordinals are safe bounded metadata; row
  identities need not persist (ephemeral evaluation); raw values discarded
  immediately after projection
- **Uninspected-tail false PASS risk**: CONFIRMED — an array larger than
  `maxArrayItemsInspected` with a valid row 0 and an invalid row > 128
  produces outcome PASS (case E); the projector correctly sets
  `arrayTruncated: true`, but the current invariant evaluator does not
  treat truncation as ambiguous for FIELD_PRESENT/TYPE_MATCH/TYPE_IN_SET

## 7. Real minimization gap (source-verified, still CURRENT)

### Source trace

```
orchestrator.ts:799-802 (wrappedReplay)
  FRESH_EXACT_REPLAY -> exactOutcome (REPRODUCES, matching fingerprint)
  REDUCED_CANDIDATE -> replay(sequence, phase)
    -> invalidReducedReplay() [phase7-real-campaign.ts:360-366]
       returns { status: 'INVALID', invalidReason: 'ACTION_NOT_APPROVED' }
       for EVERY reduced sequence
```

### How this affects the minimizer

1. `minimizeFailure` (minimizer.ts) runs `evaluate(original, 'FRESH_EXACT_REPLAY')`
   -> REPRODUCES (reproductionCount=1).
2. ddmin loop: every reduced candidate -> INVALID -> no chunk accepted
   -> `reduced = false`.
3. One-deletion audit: every single-deletion candidate -> INVALID ->
   `changedInAudit = false`.
4. `oneDeletionProof = true` (budget not exhausted, no INVALID prevented
   it) -> guarantee `'1-MINIMAL'`.
5. Status `UNCHANGED`; confidence `MEDIUM` (fresh=REPRODUCED,
   reproductionCount=1, guarantee 1-MINIMAL, not budget-exhausted).
6. `minimalReproducingSequence` = full original sequence.

**A future anomaly would be classified 1-MINIMAL with ZERO genuine
reduced candidates replayed.** The guarantee token overstates.

### Classification

**CURRENT** (matches D-58 Appendix F finding #1, unfixed).
`CONFIRMED_REAL_MINIMIZATION_REPLAY_GAP`.

Impact: P(actionable) is limited — any real anomaly today would yield a
dossier with an over-claimed minimality guarantee. However, with zero
natural anomalies observed, this gap is latent — it cannot currently
suppress bug yield because there are no bugs to suppress. It becomes
critical only when a natural anomaly first appears.

## 8. Differential capability (source-verified)

`compareBrowserAndApi` (differential.ts) operates at class/category level:
statusClass, contentTypeClass, routeClass, structuralState, parseability,
oracleFingerprint. It requires `api.operationFamily === browser.operationFamily`
and a non-null API observation.

**Pairing reality today**:
- Browser observation `operationFamily` = journeyId (e.g.
  `ripple-common-exchange-read`) — set from journey candidates.
- API observation `operationFamily` = operationId (e.g.
  `ripple.common-exchange.read`) — set from the Phase 5 adapter.
- Journey candidates have `api: null` (phase7-real-campaign.ts:390).
- API candidates carry a synthetic browser observation (failed:false).

**Viable honest paired observations today: 0.** The two namespaces
(journeyId vs operationId) never match on the same candidate; no candidate
carries both a real browser and a real API observation.

Creating genuine differential would require: (1) a shared logical identity
mapping journeyId to operationId; (2) a paired execution where both
browser and API observations are collected for the same operation; (3)
browser-side semantic projection (currently absent — DOM never projected
by design); (4) FP controls for benign differentials. This is a large
build with no natural evidence yet.

## 9. Coverage expansion ceiling (source-verified)

- **Approved read-only targets**: 6 (APPROVED_READ_ONLY_TARGET_IDS)
- **Recipes admitted**: 4
- **Remaining approved without recipes**: 2
  - `ripple.billing-groups.read` — gRPC endpoint; not observable by the
    JSON observer; requires new stream-projection capability (heavy).
  - `ripple.billing-groups-legacy.read` — REJECTED AMBIGUOUS in Phase
    9A.1; source flow does not prove a fixed item shape.
- **billing-group-exchange** has no reviewed journey (needs a new reviewed
  endpoint semantic ruleId).

**Meaningful additional real expectations without new network authority:
  ~0-1** (at most billing-groups-legacy re-audit, which would be L2 at
best — same shallow columns).

**Row expansion vs column expansion**: adding new targets would repeat
root/field checks at the same shallow depth. Scanning all items in
existing L3 targets is strictly more valuable per unit of execution than
adding new shallow targets.

## 10. All candidate options

| Opt | Direction | Summary |
|---|---|---|
| **A** | BOUNDED_COLLECTION_WIDE_SEMANTIC_EVALUATION | Remove the item-0 blind spot: bounded multi-item iteration over inspected projection items; evaluate same source-backed invariant over every inspected row; honest aggregate coverage state; one finding per expectation+invariant kind with inspectedItemCount/violatingItemCount. |
| **B** | HIGH_CONFIDENCE_REAL_SEMANTIC_TRIAGE | Replace invalidReducedReplay stub with real reduced-candidate replay; honest ddmin; fault-boundary localization; synthetic fault injection proving reducible/non-reducible/precondition-divergence cases. |
| **C** | BROWSER_API_SEMANTIC_DIFFERENTIAL | Detect disagreement between independently observed product surfaces (browser vs API); requires browser-side projection + shared identity + FP controls. |
| **D** | REAL_SEMANTIC_SURFACE_EXPANSION | Add new admitted expectations over existing read-only Ripple authority (new targets, new operations). |
| **E** | DEEPER_RELATIONAL_SEMANTICS (L4) | Move from L3 type semantics to L4 relational (cardinality, identity, numeric, cross-field consistency) — only if current source mechanically proves them. |
| **F** | SOURCE_CHANGE_GUIDED_SEMANTIC_SELECTION | Map source changes directly to affected source-backed expectations and journeys for smarter test selection. |
| **G** | SEMANTIC_CAMPAIGN_YIELD_INTELLIGENCE | Spend bounded execution on higher-information semantic surfaces (novelty memory, depth weighting, uncovered-contract weighting, starvation prevention). |
| **H** | SECOND_DEEP_DEV_CANARY | Validate payer TYPE_IN_SET contract in contained DEV (one-off canary). |
| **I** | MULTI_PRODUCT_EXPANSION | Export the architecture beyond Ripple to other Alphaus products. |
| **J** | SELF_DEVELOPMENT_2ND_ADOPTION | Second canonical self-development promotion (variant B adoption). |
| **K** | SEMANTIC_EXPECTATION_DRIFT_MONITORING | Standing local currentness sweep over the recipe registry — maintenance, not yield. |

**No genuinely distinct OPTION K+ discovered from source.**

## 11. Scoring matrix

20 fixed criteria (1-5, 5 = favorable): 1 new detections · 2 covered
defect locations · 3 P(detection) · 4 P(actionable) · 5 expected useful
yield · 6 deterministic testability · 7 synthetic validation strength ·
8 safety compatibility · 9 privacy compatibility · 10 Phase 6
independence · 11 reuses current architecture · 12 implementation
complexity (5=low) · 13 operational complexity (5=low) · 14 owner burden
(5=low) · 15 time to first useful result · 16 Ripple reuse · 17
cross-product reuse · 18 false-positive risk (5=low) · 19 overengineering
risk (5=low) · 20 evidence gap actually closed.

| Opt | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | Sigma | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **A** | 4 | 5 | 5 | 2 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 4 | 5 | 5 | 4 | 5 | 4 | 4 | 4 | 5 | **90** | **RECOMMEND** |
| **B** | 2 | 1 | 1 | 5 | 2 | 5 | 5 | 5 | 5 | 5 | 4 | 3 | 4 | 4 | 3 | 4 | 4 | 5 | 4 | 3 | **74** | NEXT_AFTER |
| **C** | 4 | 2 | 3 | 3 | 3 | 4 | 3 | 4 | 3 | 5 | 2 | 2 | 3 | 3 | 2 | 3 | 3 | 3 | 3 | 3 | **61** | VIABLE_LATER |
| **D** | 2 | 2 | 2 | 2 | 2 | 5 | 5 | 5 | 5 | 5 | 4 | 4 | 4 | 4 | 3 | 4 | 3 | 4 | 4 | 2 | **71** | NEXT_AFTER |
| **E** | 3 | 2 | 3 | 2 | 3 | 4 | 3 | 5 | 5 | 5 | 4 | 3 | 4 | 4 | 2 | 3 | 3 | 4 | 4 | 2 | **68** | DEFER |
| **F** | 1 | 1 | 1 | 2 | 1 | 5 | 5 | 5 | 5 | 5 | 4 | 4 | 5 | 5 | 3 | 4 | 3 | 5 | 5 | 1 | **70** | DEFER |
| **G** | 1 | 1 | 2 | 1 | 2 | 4 | 4 | 5 | 5 | 5 | 4 | 3 | 4 | 4 | 3 | 4 | 4 | 4 | 4 | 2 | **66** | VIABLE_LATER |
| **H** | 1 | 1 | 1 | 1 | 1 | 5 | 4 | 5 | 5 | 5 | 5 | 4 | 4 | 3 | 2 | 4 | 3 | 5 | 4 | 2 | **65** | DEFER |
| **I** | 2 | 1 | 1 | 2 | 1 | 3 | 3 | 4 | 3 | 4 | 2 | 2 | 2 | 2 | 1 | 1 | 5 | 3 | 3 | 1 | **46** | DEFER |
| **J** | 0 | 0 | 0 | 1 | 0 | 5 | 5 | 5 | 5 | 5 | 3 | 4 | 4 | 3 | 1 | 1 | 1 | 5 | 4 | 0 | **52** | DEFER |

**Load-bearing scores** (not arithmetic-only):

- **A (collection-wide)** scores 5 on criteria 2 (covered defect locations:
  every inspected row, not just row 0), 3 (P(detection): directly raises the
  suppressive term on existing collection contracts), 5 (yield: every future
  contained DEV run checks all rows), 20 (evidence gap actually closed:
  exactly the Phase 10 residual limitation "item checks inspect item 0").
  Score 4 on criterion 1 (new detections) because the new detection
  CLASS is "later-row violation of existing contract" — genuinely new but
  bounded to the covered operations. Score 4 on 9 (privacy): counts and
  categorical ordinals are safe metadata, but scanning more items does add
  evaluation-time metadata that must be bounded.
- **B (triage)** scores 5 on 4 (P(actionable): honest ddmin, real reduced
  replay, proper fault boundary) — the strongest post-detection lever —
  but scores 1-2 on 1/2/3/5: creates zero new detections, covers no new
  defect locations, raises no detection, and yields zero useful bugs until
  a natural anomaly exists. Its Σ is second, but the decision is
  evidence-first.
- **C (differential)** scores 4 on 1 (genuinely new L5 cross-surface class)
  but 2 on 12/13 (complex build, 0 viable pairs today, needs browser-side
  projection absent by design). VIABLE_LATER after collection-wide
  proves the next layer.
- **D (coverage expansion)** scores low on 20 (row ceiling ~4-5; same
  shallow columns) — adding a row of shallow expectations is strictly
  less valuable than deepening item coverage on existing rows.

## 12. Top-three analysis

| Option | surfaces | P(defect) | P(detection) | P(actionable) | Net effect |
|---|---|---|---|---|---|
| **A — COLLECTION_WIDE** | unchanged (3-4 ops) | unchanged | **raises** directly: every inspected row now checked against the source-backed invariant | unchanged | every future contained DEV run detects later-row defects on the existing L3 contracts; closes the item-0 gap |
| **B — TRIAGE** | unchanged | unchanged | unchanged | **raises** (real reduced-candidate replay; honest ddmin; fault boundary; dossier confidence) | makes any future anomaly genuinely reducible + actionable; latent until a natural anomaly exists; synthetically validatable |
| **D — COVERAGE_EXPANSION** | +0-1 ops (capped) | unchanged | **raises slightly** (adds same L2 shape checks on new targets) | unchanged | marginal yield per operation; rows capped at ceiling |

### Opportunity cost

- **A** (if selected): detects later-row faults but does NOT fix minimization
  (B's job) and does NOT add cross-surface comparison (C's job). If an
  anomaly appears before B is implemented, it will be detected but not
  honestly minimizable.
- **B** (if selected): improves actionable evidence but creates zero new
  detections. The existing item-0 blind spot remains. If a later-row
  defect exists, B cannot find it.
- **D** (if selected): adds one shallow target but does not widen row
  coverage on existing targets.

A is selected because the dominant term — P(detection) on real contracts —
has provable headroom and the smallest safe bound. A's improvement
materializes on every existing contract and every future DEV run. B's
improvement is latent. D's improvement is marginal.

## 13. Selected bottleneck

```
CURRENT_PRIMARY_POST_PHASE10_BOTTLENECK:
  COLLECTION_ITEM_SEMANTIC_COVERAGE_GAP
```

Evidence: Phase 10 increased depth (L2->L3 on 2 targets) but ALL 4
real contracts inspect only item 0. A synthetic proof (section 6b) shows
later-row defects at row 1, 57, 200 are invisible for FIELD_PRESENT,
TYPE_MATCH, and TYPE_IN_SET. The projector retains 128 items — the
limitation is at the invariant evaluation layer. With P(detection) as the
most suppressive term and collection breadth as the specific gap, this is
the highest-leverage next investment.

## 14. Selected architecture

```
POST_PHASE_10_NEXT_ARCHITECTURE:
  BOUNDED_COLLECTION_WIDE_SEMANTIC_EVALUATION
```

Primary objective: remove the item-0-only blind spot while preserving
boundedness, privacy, and the fail-closed model. Evaluate the same
source-backed invariant over every inspected item in a collection response,
with honest aggregate coverage states that prevent uninspected tails from
producing false full PASS.

**NOT** a combined grab-bag: the primary is collection-wide evaluation.
Triage, differential, and coverage expansion remain separate later options.

Key design elements (implementation-time scope, NOT authorized here):

1. **Collection-aware invariant evaluation**: a new additive invariant kind
   (e.g. `COLLECTION_ITEM_CONTRACT`) or a collection-evaluation wrapper
   around existing item-level invariants that iterates over inspected items
   and aggregates results.
2. **Coverage state model**: honest states that prevent false PASS on
   uninspected tails — e.g. `FULLY_EVALUATED_PASS` (all inspected items
   pass, no truncation), `VIOLATION` (at least one inspected item violates),
   `EMPTY_NOT_APPLICABLE` (empty collection), `PARTIAL_COVERAGE_NO_VIOLATION`
   (truncated array, no violation in inspected items), `PROJECTION_LIMIT_EXCEEDED`.
3. **Finding deduplication**: one finding per expectation + invariant kind
   with safe aggregate metadata: `inspectedItemCount`, `violatingItemCount`,
   optional `firstViolationOrdinal` (safe — structural position, not
   customer data). No raw row values. No per-row findings.
4. **Fingerprinting**: one fingerprint per expectation + invariant kind
   (not per row) to avoid fingerprint explosion. Coverage state included
   in the fingerprint to distinguish FULLY_EVALUATED_PASS from
   PARTIAL_COVERAGE_NO_VIOLATION.
5. **Boundedness**: reuse `maxArrayItemsInspected` (128) from existing
   DEFAULT_PROJECTION_LIMITS; explicit bound documented and tested;
   cardinality beyond the bound yields PARTIAL_COVERAGE_NO_VIOLATION (never
   full PASS).
6. **Privacy**: per-item projection already carries only types/presence/
   opaque tokens — scanning more items adds NO raw values; counts are
   allowed bounded concepts; row ordinals are structural metadata, not
   customer data; raw values discarded immediately after projection.

## 15. Phase naming

```
NEXT_PHASE: PHASE_11
NEXT_PHASE_TITLE: Phase 11 — Bounded Collection-Wide Semantic Evaluation
NEXT_PHASE_STATUS: DESIGNED_NOT_STARTED_NOT_AUTHORIZED
```

Rationale: Phase 10 is terminal COMPLETE (D-60). Collection-wide
evaluation is a new bug-hunting architecture (new invariant capability,
new coverage states, new finding aggregation), not a Phase 10
continuation. Phase 11A local/synthetic + optional separately authorized
Phase 11B contained DEV acceptance (same pattern as 9A.1/9B and
10A/10B).

## 16. Completion criteria (Phase 11, measurable)

1. **Later-row planted defect detected**: a synthetic response with a
   violation at row >= 1 of a source-backed item contract yields
   ANOMALY (not PASS).
2. **Row-0-only baseline misses the same defect**: the historical row-0
   evaluation on the same body detects 0/N (proven baseline comparison
   ceiling proof).
3. **Boundedness explicit**: `maxArrayItemsInspected` constant documented;
   an array exceeding the bound is evaluated to
   PARTIAL_COVERAGE_NO_VIOLATION (never full PASS).
4. **Uninspected tail never produces false full PASS**: an array with
   valid row 0, invalid row > inspectedCount, and no violation within the
   inspected window yields PARTIAL_COVERAGE_NO_VIOLATION (not PASS).
5. **Benign corpus false positives 0**: expanded benign corpus including
   multi-row valid arrays, truncated arrays, and empty arrays; 0 FP.
6. **Raw-value leakage 0**: sentinel sweep extended to new aggregate fields
   (inspectedItemCount, violatingItemCount, firstViolationOrdinal, coverage
   state): 0 leaks.
7. **Existing Phase 9/10 regressions green**: typecheck, hardening,
   focused Phase 9+9A.1+9B+10+11 matrices, full Playwright 0 failed;
   exact CI green at the implementation checkpoint.
8. **Optional contained DEV acceptance (Phase 11B, separate authorization)**:
   ONE contained DEV run evaluating collection-wide coverage against the
   real product — or explicit NOT_AUTHORIZED in Phase 11A.

## 17. Future authorization

Phase 11 authority ladder:

- **L0**: source/docs analysis (this design review).
- **L1**: local/synthetic (Phase 11A) — planted defects, multi-row
  fixtures, coverage state proofs, FP controls, sentinel sweep. No DEV
  contact.
- **L2**: contained DEV read-only (Phase 11B, SEPARATE owner authorization)
  — one bounded run on an existing journey evaluating collection-wide
  coverage against the real product. Same harness pattern as 9B/10B:
  fresh source truth, re-derivation, resolver RESOLVED, auth gate,
  one invocation, replay determinism, privacy audit.
- **L3**: private finding evidence (if a semantic anomaly is observed).

No L4+ (no self-development, no production, no AI authority).

## 18. Non-goals

- No new product surfaces or journeys (coverage expansion is separate).
- No triage/minimization rework (B — NEXT_AFTER).
- No browser/API differential build (C — VIABLE_LATER).
- No source-change selection sophistication (F — DEFER).
- No campaign yield intelligence (G — VIABLE_LATER).
- No deeper relational semantics (E — DEFER; source evidence insufficient).
- No multi-product expansion (I — DEFER; zero real findings on Ripple).
- No selfDev/promotion/catalog (J — DEFER/REJECT; Phase 8 closed).
- No Phase 6 revival; no AI authority; no catalog mutation.
- No invented business rules: every collection invariant must trace to a
  source-backed recipe (same provenance model as Phase 9A.1/10A).

## 19. Next-after ordering

```
NEXT_AFTER:
  1. HIGH_CONFIDENCE_REAL_SEMANTIC_TRIAGE (B)
  2. REAL_SEMANTIC_SURFACE_EXPANSION (D)
VIABLE_LATER:
  BROWSER_API_SEMANTIC_DIFFERENTIAL (C)
  SEMANTIC_CAMPAIGN_YIELD_INTELLIGENCE (G)
DEFER:
  SOURCE_CHANGE_GUIDED_SEMANTIC_SELECTION (F)
  DEEPER_RELATIONAL_SEMANTICS (E)
  MULTI_PRODUCT_EXPANSION (I)
  SELF_DEVELOPMENT_2ND_ADOPTION (J)
  SECOND_DEEP_DEV_CANARY (H — fold into optional Phase 11B if useful)
```

HIGH_CONFIDENCE_REAL_SEMANTIC_TRIAGE remains NEXT_AFTER (as in D-58)
because: (1) it owns the confirmed minimization finding (#1); (2) it is
the natural consumer of collection-wide findings (when a future anomaly
is detected, triage must reduce it honestly); (3) zero real anomalies
today makes it latent but not obsolete. REAL_SEMANTIC_SURFACE_EXPANSION
is second NEXT_AFTER (marginal yield but low-risk additive recipes when
new source surfaces are available).

---

## Appendix A — Collection-coverage proof matrix

Design evidence matrix for collection-wide evaluation (future Phase 11):

| response structure | row 0 state | later-row state | current oracle result | desired future result |
|---|---|---|---|---|
| A. all rows valid | valid | valid | PASS | FULLY_EVALUATED_PASS |
| B. row 0 invalid | invalid | any | ANOMALY | VIOLATION |
| C. row 0 valid / row 1 invalid | valid | 1 invalid | **PASS** (gap) | VIOLATION |
| D. row 0 valid / last inspected row invalid | valid | N invalid | **PASS** (gap) | VIOLATION |
| E. defect beyond scan bound | valid | >N invalid | **PASS** (gap) | PARTIAL_COVERAGE_NO_VIOLATION |
| F. empty array | n/a | n/a | PASS (item checks N/A) | EMPTY_NOT_APPLICABLE |
| G. array larger than bound, all inspected valid | valid | unknown | PASS | PARTIAL_COVERAGE_NO_VIOLATION |

Key invariant: **uninspected tail must NOT silently become full semantic
PASS**. Rows C/D/E are the current blind spots; row G exposes the false-
PASS risk on truncated arrays.

## Appendix B — Decision and safety records

- Decision record: D-61 (docs/DECISIONS.md) — Phase 10 terminal proof;
  post-Phase-10 primary bottleneck COLLECTION_ITEM_SEMANTIC_COVERAGE_GAP;
  item-0-only verdict CONFIRMED; minimization verdict CURRENT; differential
  verdict 0 viable pairs; chosen architecture BOUNDED_COLLECTION_WIDE_
  SEMANTIC_EVALUATION (Phase 11); why competing options lost (triage latent,
  differential unbuilt, coverage capped, relational unsourced, campaign not
  bottleneck); next-after ordering; Phase 6 frozen; AI boundary;
  implementation NOT authorized.
- Safety vector (this design review): DEV 0, NEXT 0, production 0,
  mutations 0, DB 0, infra 0, AI/model 0, Alphaus writes 0, publication 0,
  selfDev 0, promotion 0, catalog 0, B adoption 0, runtime Git writes 0;
  Nightwatch docs commits expected only.

## Appendix C — Implementation-ready future-task spec (Phase 11A; NOT authorized)

- **Task ID:** `phase-11-bounded-collection-wide-semantic-evaluation`
- **Phase:** `11A-COLLECTION-WIDE-SEMANTIC`
- **Title:** Nightwatch Phase 11 — Bounded Collection-Wide Semantic Evaluation
- **Objective:** remove the item-0-only collection coverage blind spot by
  evaluating source-backed item-level invariants over every inspected array
  item; introduce honest coverage states that prevent uninspected tails from
  producing false full PASS; prove detection on synthetic later-row defect
  fixtures; integrate through the existing campaign/triage/dossier chain;
  close under continuity v2. NO DEV (11A), NO new surface, NO Phase 6, NO AI.
- **Authorization class:** `PHASE_11_COLLECTION_WIDE_SEMANTIC_IMPLEMENTATION_ONLY`
  (NOT granted by this design review).
- **Allowed files:** `src/oracles/invariants/**` (additive new collection-
  evaluation capability), `src/oracles/invariants/evaluate.ts` (additive
  collection wrapper), `src/oracles/invariants/paths.ts` (unchanged),
  `src/oracles/semantic/**` (additive finding aggregation + coverage state),
  `src/oracles/expectations/types.ts` (additive coverage-state vocabulary
  if needed), `corpus/phase11/**`, `tests/unit/**` (new + narrow edits for
  new invariant tests), `bin/hardening-check.mjs` (narrow guards),
  `.github/workflows/hardening.yml` (matrix step), `docs/**`, `.agent/**`.
- **Forbidden authority:** campaign/triage core changes (beyond existing
  dossier semanticEvidence passthrough), changeIntelligence,
  journeys/registry (no new endpoint authority), ownerScope, Phase 6
  surfaces, DEV/NEXT/production, AI/model, selfDev/promotion/catalog/
  B adoption, Alphaus writes, publication.
- **State machine:** `P11_SPEC_DESIGNED (this doc; NOT_AUTHORIZED) ->
  P11_IMPLEMENTATION_IN_PROGRESS -> P11_VALIDATED_SYNTHETIC ->
  (optional separately authorized) P11_VALIDATED_DEV -> P11_COMPLETE`;
  STALE/BLOCKED/DEFERRED per continuity v2.
- **Fixed DTO/state model:** evaluation results carry a `coverageState`
  field: `FULLY_EVALUATED_PASS` | `VIOLATION` | `EMPTY_NOT_APPLICABLE` |
  `PARTIAL_COVERAGE_NO_VIOLATION` | `PROJECTION_LIMIT_EXCEEDED`.
  Findings carry aggregate metadata: `inspectedItemCount`,
  `violatingItemCount`, optional `firstViolationOrdinal` (safe structural
  position). One finding per expectation + invariant kind (not per row).
- **Boundedness:** maxArrayItemsInspected (128, DEFAULT_PROJECTION_LIMITS)
  reused; explicit bound documented; cardinality beyond bound =>
  PARTIAL_COVERAGE_NO_VIOLATION.
- **Privacy contract:** categorical + counts only; no raw row values;
  no item identity persistence; raw values discarded immediately after
  projection; counts bounded by maxArrayItemsInspected.
- **Source provenance:** source-backed same as Phase 9A.1/10A; recipe
  registry unchanged; no new recipes needed for collection-wide evaluation
  (it enriches evaluation of existing recipes).
- **Synthetic corpus:** `corpus/phase11/defects/` — later-row planted
  defects (row 1, row N, row >maxArrayItemsInspected); multi-row valid
  arrays (benign); truncated valid arrays; empty arrays; mixed valid/invalid
  rows within the inspected window.
- **Baseline comparison:** row-0-only baseline on later-row bodies detects
  0/N; collection-wide evaluation detects N/N.
- **FP controls:** expanded benign corpus including truncated arrays and
  empty arrays; 0 FP required.
- **Hardening:** purity guards for the new collection-evaluation code
  (no fs/network/process/AI/persistence).
- **Regression:** Phase 9+9A.1+9B+10+11 focused matrices; full Playwright
  0 failed; exact CI at the implementation checkpoint.
- **CI:** new "Phase 11 bounded collection-wide semantic evaluation matrix"
  step in `.github/workflows/hardening.yml`.
- **Optional DEV acceptance (Phase 11B):** ONE contained DEV run
  (existing journey, existing deep expectation) evaluating collection-wide
  coverage against the real product via the Phase 9B/10B harness pattern
  — separate owner authorization required.
- **Stop conditions:** any need to touch campaign/triage core authority,
  journeys/registry, ownerScope, Phase 6, promotion/catalog => STOP;
  source drift => restart fresh; privacy leak => STOP + escalation.
- **Success token:** `PHASE_11_COLLECTION_WIDE_SEMANTIC: COMPLETE` with
  criteria 1-7 (and 8 only under a separate 11B authorization).

## Appendix D — Future expectation depth x row-coverage matrix (Phase 11 target state)

| target | depth | row coverage (today) | row coverage (Phase 11 target) | DEV reachable | DEV accepted |
|---|---|---|---|---|---|
| ripple.common-exchange.read | L3 (TYPE_MATCH OBJECT) | ITEM_0_ONLY | **BOUNDED_MULTI_ITEM** | yes | YES (10B) |
| ripple.payer-exchange.read | L3 (TYPE_IN_SET {OBJECT,ARRAY}) | ITEM_0_ONLY | **BOUNDED_MULTI_ITEM** | yes | no |
| ripple.account-inventory.read | L2 (15 FIELD_PRESENT) | ITEM_0_ONLY | **BOUNDED_MULTI_ITEM** | yes | no |
| ripple.billing-group-exchange.read | L2 (4 FIELD_PRESENT) | ITEM_0_ONLY | **BOUNDED_MULTI_ITEM** | no | no |

Phase 11 does NOT increase depth (columns) — it increases collection
breadth (rows) by evaluating existing invariants over every inspected
item. The invariant set per expectation is unchanged; the evaluation
scope expands from 1 item to all inspected items.

## Appendix E — Option timing verdicts

- **Collection-wide (A, selected):** NOW — directly addresses the lowest
  multiplier (P(detection) breadth) on every existing real L3 contract.
  Fully local/synthetic testable with planted later-row defects; reuses
  projection already built; no new network authority; closes Phase 10's
  documented residual limitation.
- **Triage (B, NEXT_AFTER):** AFTER collection-wide. A first real anomaly
  would benefit from both detection (A) AND honest reduction (B). With zero
  anomalies today, triage remains latent but its time comes as soon as
  collection-wide creates the possibility of detecting later-row anomalies.
  Synthetic fault injection makes B fully testable without a natural anomaly.
- **Coverage expansion (D, NEXT_AFTER):** AFTER collection-wide. Adding
  one shallow target is marginal; deepening row coverage on existing L3
  targets is strictly more valuable per unit of execution.
- **Differential (C, VIABLE_LATER):** requires browser-side semantic
  projection (absent by design) + shared identity mapping + FP controls.
  A large build with no viable pairs today; pursue after collection-wide
  proves the next detection layer.
- **Relational semantics (E, DEFER):** no current source evidence
  (`SOURCE_ENUM_FLOW_UNPROVEN` precedent). Defer until source proves
  relational contracts.
- **Source-selection (F, DEFER):** journey surface too small (3-4) for
  selection leverage. Defer until surface grows.
- **Campaign yield (G, VIABLE_LATER):** budget mechanics hardened; small
  surface; not currently a bottleneck vs detection breadth.
- **Second DEV canary (H, fold into 11B):** limited new evidence; not
  a primary phase. If useful, included as optional Phase 11B canary.
- **Multi-product (I, DEFER):** zero real findings on Ripple; no export
  rationale. Defer until Ripple yields real bugs.
- **SelfDev (J, DEFER/REJECT):** Phase 8 closed; no bug-hunting reason;
  variant B structural canary only.

## Appendix F — What Phase 10 did not prove (honest residual evidence gaps)

The following are remaining evidence gaps — not failures:

1. Later-row semantic defect detection (addressed by Phase 11).
2. Payer deep DEV acceptance (limited new evidence; optional Phase 11B).
3. Real anomaly handling (zero natural anomalies observed — mechanism
   runs cleanly but untested under anomaly conditions).
4. Real minimization (invalidReducedReplay stubbed — finding #1, owned
   by NEXT_AFTER triage).
5. Cross-surface differential (0 viable pairs; needs browser-side
   projection).
6. L4 relational contracts (source evidence insufficient).
7. Wider operation coverage (billing-group-exchange needs new journey;
   gRPC not JSON-observable).
8. Semantic campaign selection (surface too small for leverage).
9. Multi-product transfer (zero real findings to justify export).

None of these are defects. They are the natural scope boundary of a
focused phase that increased depth on existing real contracts. Phase 11
addresses #1; #4 is owned by NEXT_AFTER triage; the rest are appropriately
deferred to later phases or ruled out by source evidence.
