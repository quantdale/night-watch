# Post-Phase-9 — Next Bug-Hunting Architecture Design Review

> Repository-native design document (`docs/design/*.md` approved checkpoint
> path). Authoring task:
> `post-phase-9-next-architecture-design-review` (Phase `POST-9-DESIGN`,
> authorization `POST_PHASE_9_NEXT_ARCHITECTURE_DESIGN_REVIEW_ONLY`,
> 2026-08-16, starting SHA `aba46a9af1a1021ae58a1253f93fda297391576e`).
> This document SELECTS the next Nightwatch investment; it does NOT
> implement it. `NEXT_PHASE_IMPLEMENTATION_AUTHORITY: NOT_GRANTED`.
>
> **Implementation status (Phase 10A, 2026-08-16, D-59):** the owner
> separately authorized and Phase 10A implemented the selected architecture
> LOCAL/SYNTHETIC (`PHASE_10_DEEPER_SEMANTIC: COMPLETE`; substantive
> implementation `6cef0c45`, exact CI 31946005458, 32/32; full record in
> `docs/design/PHASE_10_DEEPER_SEMANTIC_CONTRACTS.md`). One historical
> source claim in §7 was corrected by re-verification: `exchange_rate` is
> ALWAYS a JSON OBJECT for common-exchange (the `(object)` cast fires on the
> EMPTY case, serializing `{}` — the "OBJECT when populated / ARRAY when
> empty" reading was wrong for both the pinned and the current SHA); and the
> finite-enum contract was NOT admitted (`SOURCE_ENUM_FLOW_UNPROVEN` — the
> constant is write-path validation only, not load-bearing for read-path
> output keys). Phase 10B contained DEV acceptance remains separately
> authorized and NOT executed.

---

## 1. Phase 9 proof summary (reconstructed from source + durable records)

| # | Capability | Synthetic proof | Real DEV proof | Scope | Remaining limitation |
|---|---|---|---|---|---|
| A | Safe semantic projection (`nightwatch.semantic-projection.v1`) | oracleProjection 22 tests; hostile-input fail-closed; canonical digests | R1 privacy audit PASS; projections served the real common-exchange evaluation | per-response, network-observed JSON only | no browser/DOM-side projection; no gRPC/stream projection |
| B | Deterministic semantic invariants (10-kind vocabulary) | oracleInvariant 25 tests; fixture precision 1 / recall 1 | R1: 3 invariants passed (root ARRAY + month + exchange_rate presence) | fixed vocabulary | real contracts use only TYPE_MATCH + FIELD_PRESENT |
| C | Five synthetic semantic defect classes | 5/5 detected; protocol baseline 0/5 (M1 ceiling proof) | n/a | synthetic corpus only | synthetic bodies are hand-built fixtures |
| D | Benign false-positive controls | 0 FP on 10 benign cases | R1 zero anomalies (not an FP test) | synthetic corpus | real-world benign variety untested (needs DEV) |
| E | Source-backed real expectation admission (recipes + extractors + ev digests) | 4/4 recipes validated; live canary 4 derived / 4 current / 0 stale | R1: re-derivation at `169df39d` (REDERIVE_FRESH_SNAPSHOT) | mobingilabs/ripple-api only | 3 extractor kinds; no const/cast/permission extraction |
| F | Source currentness/staleness (freshness A-F, atomic resolver) | matrix tests; multi-repo swap rejection; synthetic-rebinding rejection | R1: RESOLVED pre-launch at exact snapshot | per-expectation binding | re-derivation is a bespoke per-run ceremony |
| G | Evaluation receipts (nine outcomes) | receipts matrix; NO_EXPECTATION/STALE/etc. never PASS | R1: PASS receipts x2, zero hard outcomes | observer ledger (cap 512) | ledger is in-memory; no durable receipt history |
| H | No-silent semantic-hook failure | INTERNAL_ERROR receipts; privacy escalation | R1: zero internal errors | observer path | — |
| I | Real-source expectation derivation | 4 derived / 0 failures at `27bb007a` and `169df39d` | R1 derivationOk true | PHP list-row + route-binding classes | derives keys, not types/enums |
| J | Real contained DEV semantic evaluation | n/a (pre-9B designed) | R1 FIRST + REPLAY decisive PASS | ONE journey (common-exchange) | 2 of 3 DEV-reachable expectations never DEV-evaluated |
| K | FIRST/REPLAY determinism | semantic replay compare unit matrix | R1: both PASS, replay deterministic, zero hard outcomes | journey pair | single journey pair |
| L | Privacy / no raw persistence | sentinel matrix (15) incl. derived forms + failure paths | R1 structural privacy audit PASS | projections/findings/dossiers | DOM text never projected (by design) |
| M | Campaign/triage/dossier integration | semanticCampaign 4 tests: 5 classes to dossiers; baseline admits none; dossier `semanticEvidence` additive | real campaign does NOT wire semanticOracle (only the Phase 9B runner does) | synthetic campaigns | real campaign semantic hook not wired |
| N | Actual real-product findings produced | n/a | 0 (NONE_OBSERVED) | — | no natural semantic anomaly ever observed |

Phase 9B-R1 produced **semantic mechanism proof: YES; real semantic
anomaly: NO**. "No anomaly observed" is NOT evidence that anomaly handling
is unnecessary — it is evidence that the mechanism runs cleanly on one
narrow real contract.

## 2. Current pipeline (source-reconstructed, 2026-08-16)

```
source/change intelligence        collectChangeset/selectJourneys (6-repo,
                                  22-edge path-prefix map; empty/unknown
                                  window -> conservative BASELINE_HEALTH
                                  fallback incl. all 3 canaries)
        ↓
journey/test selection            buildCampaignSelection: fixed 3-journey
                                  lineage (JOURNEY→API→EXPLORATION→
                                  REPRODUCTION); exploration suppressed in
                                  the real profile (maxExplorationContexts 0)
        ↓
campaign orchestration            CampaignOrchestrator: resumable pure state
                                  machine; atomic budget; feasibility reserve;
                                  maxPromotedClusters 1 (real); storm
                                  suppression; FAILURE_STORM stop
        ↓
browser/API execution             declarative read-only journeys (3 reviewed
                                  contracts); Phase 5 restricted read-only
                                  API relay (3 ops); reproduction = full-
                                  sequence live re-execution
        ↓
oracles                           protocol/structural (passiveChecks,
                                  resourceChecks, Phase 5 oracle) + Phase 9
                                  semantic channel (composed stage in Phase 5
                                  semantic.ts + network-observer hook) — the
                                  real campaign does NOT construct a
                                  semanticOracle; only the Phase 9B runner
                                  does (one expectation)
        ↓
anomaly → triage                  triageAnomaly (pipeline.ts): minimizeFailure
                                  (ddmin + 1-deletion audit) + compareBrowser
                                  AndApi (class-level) + correlateSourceChanges
                                  + localizeFaultBoundary (heuristics) +
                                  createBugDossier; REAL ADAPTER reduced-
                                  candidate replay = invalidReducedReplay stub
        ↓
clustering/dedup                  fingerprint + 12 feature dims + transient
                                  class (metadata-based)
        ↓
dossier                           deterministic sanitized dossier +
                                  human recipe + AI-ready package, atomic
                                  owner-only persistence; additive
                                  semanticEvidence when present
```

## 3. Current coverage × depth matrix (real semantic targets)

| target | journey | source-backed expectation | DEV reachable | real DEV accepted | invariant depth | cross-step | differential | triage-ready |
|---|---|---|---|---|---|---|---|---|
| ripple.common-exchange.read | ripple-common-exchange-read | YES (`...real-source-shape`) | YES | **YES** (R1 PASS) | L2 (root ARRAY + month + exchange_rate) | no | no (api:null in adapter) | minimizer stub |
| ripple.payer-exchange.read | ripple-payer-exchange-read | YES | YES | no | L2 (root ARRAY + id/vendor/name/exchange_rate) | no | no | same |
| ripple.account-inventory.read | ripple-account-inventory | YES | YES | no | L2 (root ARRAY + 15 keys) | no | no | same |
| ripple.billing-group-exchange.read | none (no reviewed rule) | YES | no | no | L2 (root ARRAY + 4 keys) | no | no | same |

Totals: **admitted 4; DEV-reachable 3; real-DEV-accepted 1; invariant depth
L1/L2 only; differential/triage gaps identical across all rows.**

The matrix answers the §16 question: **both** rows are few AND columns are
shallow — but rows are *capped* (approved read-only target ceiling 6;
billing-groups-legacy REJECTED AMBIGUOUS; billing-groups gRPC deferred,
not observable by the JSON observer; billing-group-exchange needs a new
reviewed journey rule ⇒ realistic row ceiling ≈ 4–5), while columns have
*provable headroom* (§7). The binding constraint is **column depth**.

## 4. Real finding-history summary

- Real contained runs: several (Phase 2A/2B/2C journeys, Phase 4
  exploration, Phase 5 API, Phase 7 bounded campaign, Phase 9B-R1 pair).
- Admitted product anomalies: **0** (the only natural L0 candidate — J2
  font 502 — never reproduced; Phase 7 terminal state: NO ADMITTED PRODUCT
  ANOMALIES; the historical budget-starvation finding was a Nightwatch
  defect, fixed by Hardening I/I.1).
- Reproducible semantic anomalies: **0** (9B-R1: NONE_OBSERVED).
- Actionable dossiers: **0** (real).

Key question (§11): Nightwatch today suffers primarily from **not seeing
enough semantic detection depth on the surfaces it already exercises** —
not from a lack of anomalies to process (there are none), not from
post-detection machinery (which is well-designed but consumes nothing
real).

## 5. New primary bottleneck

```
CURRENT_PRIMARY_POST_PHASE9_BOTTLENECK:
  INSUFFICIENT_REAL_SEMANTIC_DEPTH
```

Evidence:
(a) Phase 9 raised P(detection) of semantic defects from ≈0 to non-zero —
but the real admitted expectations are **shape-only**: every one of the 4
derives exactly root `TYPE_MATCH ARRAY` + `FIELD_PRESENT` per source-literal
item key (`src/oracles/expectations/admission.ts:135-145`). No item-level
type, no enum, no relation, no envelope-class, no transition invariant
exists on any real contract (L3+ count = 0/4).
(b) The 10-kind invariant vocabulary and the projection layer are broad,
but the real contract surface uses 2 kinds. The framework is "proven on
one narrow real contract" (§6 question): mechanism YES, coverage/depth of
real contracts NO.
(c) The dependency map already names the unenforced risk classes
`COST_FINANCIAL_SEMANTICS` / `PROTO_CONTRACT` / `ACCOUNT_INVENTORY`
(`src/core/changeIntelligence/map.ts:137-145`) — Phase 10 depth directly
enforces the cost/financial-semantics class on the exchange-rate edges.
(d) Yield model (same conceptual form):
`surfaces × P(defect) × P(detection) × P(actionable)`.
Surfaces ≈ 3 journeys + 3 API ops (containment-fixed); P(defect) is a
product property, unknown, >0 on a real surface; **P(detection) is now the
term with the most headroom** — it went from zero to non-zero but only for
shape-class defects on 1 DEV-accepted operation; P(actionable) is
machinery-limited (minimization stub) but no real anomaly exists to be
actionable. More executions of shallow contracts multiply shape-check
noise, not useful bugs; deeper contracts multiply detection per unit of
contained execution.
(e) Old Phase 9 runner-up (triage confidence) NOT retained: triage
improves P(actionable) and cannot create detections; with zero real
anomalies ever observed, triage hardening is premature as the primary
investment (see §20-verdict and §8).

## 6. Option matrix (fixed criteria, 1–5, 5 = favorable)

Criteria: 1 expected increase in useful findings · 2 NEW detections · 3 FP
reduction · 4 actionable evidence · 5 deterministic testability · 6 local/
synthetic validation · 7 safety · 8 privacy · 9 Phase-6 independence · 10
implementation complexity (5 = low) · 11 operational complexity (5 = low) ·
12 owner burden (5 = low) · 13 time to first useful finding · 14 reuse
across Ripple surfaces · 15 reuse across products · 16 architecture fit ·
17 overengineering risk (5 = low) · 18 evidence gap closed.

| Opt | Direction | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | Σ | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A | REAL_SEMANTIC_COVERAGE_EXPANSION | 2 | 1 | 3 | 2 | 5 | 5 | 5 | 5 | 5 | 4 | 4 | 4 | 3 | 4 | 3 | 4 | 4 | 2 | 65 | NEXT_AFTER |
| B | HIGH_CONFIDENCE_SEMANTIC_TRIAGE | 2 | 1 | 4 | 5 | 5 | 5 | 5 | 5 | 5 | 3 | 4 | 4 | 3 | 5 | 5 | 5 | 3 | 3 | 72 | NEXT_AFTER |
| C | BROWSER_API_SEMANTIC_DIFFERENTIAL | 3 | 5 | 3 | 4 | 4 | 4 | 4 | 4 | 5 | 2 | 3 | 3 | 2 | 4 | 4 | 4 | 2 | 4 | 64 | VIABLE_LATER |
| D | SOURCE_CHANGE_GUIDED_SEMANTIC_SELECTION | 1 | 0 | 3 | 2 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 2 | 3 | 3 | 4 | 4 | 1 | 62 | DEFER |
| E | CAMPAIGN_SEMANTIC_YIELD_INTELLIGENCE | 2 | 0 | 3 | 2 | 5 | 5 | 5 | 5 | 5 | 4 | 4 | 4 | 2 | 4 | 3 | 4 | 4 | 2 | 63 | VIABLE_LATER |
| F | DEEPER_REAL_SOURCE_SEMANTICS | **5** | 4 | 4 | 3 | 5 | 5 | 5 | 5 | 5 | 4 | 4 | 4 | **4** | 5 | 4 | 5 | 4 | **5** | **80** | **RECOMMEND** |
| G | MULTI_PRODUCT_EXPANSION | 2 | 1 | 2 | 2 | 4 | 3 | 3 | 3 | 4 | 2 | 2 | 2 | 2 | 1 | 5 | 3 | 3 | 1 | 45 | DEFER |
| H | SELF_DEVELOPMENT_2ND_ADOPTION | 1 | 0 | 1 | 1 | 5 | 5 | 5 | 5 | 5 | 3 | 5 | 3 | 1 | 1 | 1 | 2 | 4 | 0 | 48 | DEFER |

Important scores (not arithmetic-only):

- **F scores 18/18 (evidence gap actually closed)**: it converts the
  proven framework into richer real contracts — the exact gap §18 lists
  ("deeper non-shape invariants" not proven by 9B-R1). Score 2 (new
  detections) = 4 because it adds NEW bug classes (type regression, enum
  violation) on EXISTING operations — genuinely new detections, but
  bounded to the covered operations.
- **B scores 4 (actionable evidence) = 5** — the strongest post-detection
  lever — but scores 1-2 (yield/new detections) low: it creates zero new
  findings. Its Σ is second, yet the decision is evidence-first: with zero
  real anomalies observed, B's yield is latent.
- **C scores 2 (new detections) = 5** — a genuinely new L5 class — but its
  complexity (browser-side DOM projection + real-adapter pairing + FP
  controls), lack of natural evidence, and privacy surface make it the
  highest-risk build; VIABLE_LATER after F proves deeper contracts.
- **A scores low on 18** because row growth is capped (ceiling ≈ 4–5
  ops) and adds the same shallow columns.
- **D/E score 0 on "new detections"** — selection/yield intelligence
  re-orders execution; they cannot create a detection the oracle set
  cannot express. Their leverage requires larger surfaces first.

## 7. Source evidence (depth ceiling — read-only, ripple-api @ `27bb007a`)

- `ExchangeRate.php:92-94` (`getCommonExchangeRate`): `$exchange_rate =
  (object)$exchange_rate;` when non-empty, `[]` when empty ⇒ **exchange_rate
  is OBJECT-or-ARRAY by construction** — an item-level TYPE_MATCH is
  mechanically provable (current blueprint omits it).
- `ExchangeRate.php:29-37`: `const CURRENCY_RANGE_VALIDATE = [usd, jpy,
  sgd, myr, idr, inr => ranges]`; read path builds `exchange_rate` keys
  only from `$currency` (`support_currency ?? DEFAULT_CURRENCY`, line 46)
  with `usd` skipped (line 88-90) ⇒ **finite-enum contract: exchange_rate
  object keys ⊆ {jpy,sgd,myr,idr,inr}** — a mechanically derivable L3
  invariant (derivation chain documented: read-path key source + write-path
  `CURRENCY_RANGE_VALIDATE[$currency]` lookup at line 117).
- `ExchangeRate.php:40`: `permission => ['aws','azure','gcp']` vendor
  validation — request-side enum (response rows do not echo vendor in
  common-exchange; payer rows carry runtime `vendor`) ⇒ usable for request
  envelope documentation, NOT a response invariant without more evidence.
- `getAccountExchangeForMonth` (payer): rows `{id, vendor, name,
  exchange_rate}` with `exchange_rate` polymorphic `[]` vs keyed array ⇒
  TYPE_MATCH with empty-vs-object polymorphism provable.
- `Account.php` (insertAccount/getAccountVendor): 15 fixed row keys; values
  nullable ⇒ **L2 ceiling for account-inventory** (no type/enum assertions
  provable).
- Current extractor vocabulary (`PHP_FUNCTION_LIST_ROW_KEYS`,
  `PHP_FUNCTION_RETURNS_LIST_OF_BUILDER`, `PHP_ROUTE_GET_BINDING`) cannot
  express const literals, cast sites, or permission lists ⇒ **new extractor
  kinds + recipe schema extension (v1 → v2) + evidence-digest extension**
  are the Phase 10 machinery. All strictly bounded lexical extraction,
  never execution; hardening purity guards extend unchanged.

Honest ceiling statement: deeper contracts are scarce but real — ≈ 2
operations gain L3 (typed + finite-enum) invariants; account-inventory
stays L2; billing-group-exchange gains L3 only if its `currency` field is
source-typed (currently runtime settings). No L4 (identity/cardinality)
and no L5 (transition/cross-surface) invariant is currently provable on
the approved surface without new observation capability (browser-side
projection) — that is C, VIABLE_LATER.

## 8. Top-three threat/opportunity analysis (bug-yield model impact)

| Option | surfaces | P(defect) | P(detection) | P(actionable) | Net effect |
|---|---|---|---|---|---|
| **F — DEEPER_REAL_SOURCE_SEMANTICS** | unchanged (3 ops) | unchanged | **raises** per operation: adds typed-field + finite-enum classes (2-3 new bug classes/op on the exchange-rate ops) | unchanged | every future contained DEV run returns more detection per unit of bounded execution; closes COST_FINANCIAL_SEMANTICS gap |
| **B — HIGH_CONFIDENCE_SEMANTIC_TRIAGE** | unchanged | unchanged | unchanged | **raises** (real reduced-candidate replay; fixes false-1-MINIMAL finding) | makes any future anomaly reducible + honestly localized; latent until a natural anomaly exists; synthetically validateable |
| **C — BROWSER_API_SEMANTIC_DIFFERENTIAL** | +3 paired surfaces | unchanged | **raises** with a new L5 cross-surface class | unchanged | genuinely new detection class; requires browser-side projection + adapter pairing; highest build risk, no natural evidence yet |

Opportunity cost (§24): F does NOT improve actionable (B) and does NOT add
the cross-surface class (C); B does NOT create detections; C does NOT
deepen per-operation contracts. F is chosen because the yield model's
dominant term — P(detection) on real contracts — is the one with provable
headroom and the smallest safe bound.

## 9. Selected architecture

```
POST_PHASE_9_NEXT_ARCHITECTURE:
  DEEPER_REAL_SOURCE_SEMANTICS
```

Primary objective: increase the semantic richness of real-source-derived
expectations (not their count) — extend the admission bridge so deeper
contracts are MECHANICALLY derivable from the existing approved read-only
surface, and prove them locally/synthetically. Subordinate mechanism: the
"more expectations per operation" part of coverage expansion (richer
blueprints on the existing 4 admitted targets). NOT a combined grab-bag:
the primary is depth; coverage of NEW operations and triage/differential
remain separate later options.

Layers (implementation-time scope, NOT authorized here):

1. **Extractor vocabulary extension** (`src/oracles/expectations/extract/**`):
   new bounded syntax-aware kinds — `PHP_CLASS_CONST_LITERALS` (e.g.
   CURRENCY_RANGE_VALIDATE keys), `PHP_OBJECT_CAST` (cast-site type
   establishment), `PHP_VALIDATE_PERMISSION_LIST` (finite enums) — with
   canonical extraction records feeding the existing `ev:sha256` evidence
   digest (digest semantics extended per kind, fail-closed on unknown
   kinds).
2. **Recipe schema v2** (`src/oracles/expectations/recipes/**`):
   `nightwatch.real-source-expectation-recipe.v2` (or v1 additive extension
   with a mandatory recipe version bump and strict validation); richer
   blueprint vocabulary: item-level TYPE_MATCH (with empty-vs-object
   polymorphism where the source casts), FINITE_ENUM invariants (path +
   literal enum set + derivation-chain note); every new invariant kind must
   trace to a literal source structure (no invented business semantics).
3. **Admission enrichment** (`admission.ts`): derive deeper invariant sets
   for the existing 4 targets; fail-closed when the source does not
   reproduce the expected literal structure (existing ITEM_KEYS_MISMATCH
   semantics extend to const/cast/permission evidence).
4. **Invariant evaluation** (`src/oracles/invariants/**`): FINITE_ENUM
   evaluation over safe projection keys (opaque tokens, no raw values;
   enum membership over sanitized key set — projection already emits key
   paths) + TYPE_MATCH extension for polymorphic OBJECT-vs-ARRAY; receipts
   unchanged (nine-outcome vocabulary).
5. **Fixture matrix + FP control** (`corpus/phase10/**`): seeded type
   regression + enum-violation bodies per target; benign counterparts;
   sentinel sweep extended to new extraction records; baseline comparison:
   current shape-only expectations detect seeded L3 classes 0/N (ceiling
   proof), enriched expectations N/N.
6. **Pipeline**: real campaign wiring of the semantic hook remains a
   separate decision (the Phase 9B runner pattern is the DEV vehicle);
   synthetic campaign proof via the existing orchestrator (enriched
   expectations → admission → dossier with enriched semanticEvidence).
7. **Expectation-drift sweep (subordinate, optional)**: a read-only
   currentness sweep over the recipe registry (`deriveRealSourceExpectations`
   against the pinned snapshot → current/stale report) as a standing local
   check, reusing the existing resolver; only if it materially increases
   bug-finding reliability at negligible cost.

## 10. Phase naming

```
NEXT_PHASE: PHASE_10
NEXT_PHASE_TITLE: Phase 10 — Deeper Real-Source Semantic Contracts
NEXT_PHASE_STATUS: DESIGNED_NOT_STARTED_NOT_AUTHORIZED
```

Rationale: Phase 9 is terminal COMPLETE (D-57, `COMPLETE_DEV_SEMANTIC_
ACCEPTANCE_VERIFIED`). A Phase 9.x continuation label would reopen a closed
phase boundary; Phase 10 stands on the proven Phase 9 machinery (projection,
expectations, receipts, admission, harness) and extends the real contract
surface — a new bug-hunting architecture, hence the next phase number.

## 11. Completion criteria (Phase 10, measurable)

1. New extractor kinds (class-const literals, cast sites, permission
   lists) implemented with deterministic evidence digests; recipe schema
   extended with strict validation; zero unsupported semantics (every new
   invariant kind traces to a literal source structure; hardening guards
   extended).
2. ≥2 new L3 invariant classes mechanically derived and admitted for the
   existing targets (item-level TYPE_MATCH with empty-vs-object
   polymorphism; finite-enum on exchange_rate object keys; additional only
   where the source literally establishes them).
3. Extended fixture matrix: seeded type-regression and enum-violation
   classes detected N/N; benign counterparts zero FP; sentinel sweep
   (incl. new extraction records) zero leaks; baseline (current shape-only
   expectations) detects seeded L3 classes 0/N.
4. Real-source canary at the pinned SHA: all admitted targets derive with
   the expected invariant-depth distribution (≥2 targets L3+), 0 stale, 0
   failures; derivation deterministic (3 repeats, 0 mismatches).
5. Synthetic campaign: enriched expectations flow through the existing
   orchestrator → admission → triage → dossier with enriched
   `semanticEvidence`; paired baseline (shape-only) admits fewer/no.
6. Full regression green (typecheck, hardening, focused matrices, agent:
   check/audit, project:check, catalog integrity, full Playwright 0
   failed); exact CI green for the implementation checkpoint.
7. Optional separately authorized Phase 10B: ONE contained DEV acceptance
   (existing common-exchange journey, enriched expectation) proving L3
   invariants against canonical DEV — or explicit NOT_AUTHORIZED here.

## 12. Implementation boundary

- Allowed (at implementation time, under fresh authorization):
  `src/oracles/expectations/**`, `src/oracles/invariants/**`,
  `src/oracles/semantic/**` (additive), `src/oracles/projections/**`
  (additive only), `corpus/phase10/**`, `tests/unit/**`,
  `bin/hardening-check.mjs` (narrow guards), `.github/workflows/hardening.yml`
  (matrix step), docs. Recipe registry data is a source change.
- Forbidden: `src/core/campaign/**`, `src/core/triage/**` (except dossier
  evidence passthrough already present), `src/core/changeIntelligence/**`,
  `src/api/phase5/**` (unless additive receipt passthrough),
  `tests/manual/**` (Phase 10B runner is a SEPARATE task), journey
  contracts/registry (no new endpoint authority), ownerScope, Phase 6
  surfaces, AI, selfDev/promotion/catalog.

## 13. Future authorization class

- Phase 10A (implementation): `PHASE_10_DEEPER_SEMANTIC_IMPLEMENTATION_ONLY`
  — local/synthetic only; NOT granted by this document or this task.
- Phase 10B (optional contained DEV acceptance): 
  `PHASE_10B_CONTAINED_DEV_SEMANTIC_ACCEPTANCE_ONLY` — ONE bounded run on
  the existing common-exchange journey with the enriched expectation,
  using the validated Phase 9B harness pattern (fresh source truth,
  re-derivation, resolver RESOLVED, auth gate, exact CI, one invocation,
  replay determinism, privacy audit); NOT granted here; L2 authority
  (contained DEV read-only observation) is the highest level needed for
  the overall program; no L4+.

## 14. Explicit non-goals

- No new product surfaces/journeys (billing-group-exchange, gRPC
  billing-groups, multi-product) — coverage expansion is a separate later
  option.
- No triage/minimization rework (B) and no differential build (C) in Phase
  10 — both remain designed-later options.
- No source-change selection sophistication (D), no campaign yield
  intelligence (E), no selfDev/promotion (H), no Phase 6 revival, no AI
  authority, no catalog mutation, no DEV/NEXT/production contact during
  Phase 10A, no expectation-count inflation for its own sake (no shallow
  FIELD_PRESENT proliferation).
- No invented business semantics: every deeper invariant must be
  mechanically derived with a documented source trace; a provenance label
  alone never grants semantic authority (Phase 9A.1 rule, unchanged).

---

## Appendix A — option decision table

| option | current evidence gap | new detection? | new surface? | actionable improvement? | local validation? | DEV needed? | source support? | complexity | safety | expected useful-bug yield | verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A | rows capped at ~4-5; +1 journey (billing-group-exchange), +1 gRPC heavy | no (same shallow classes) | yes (+1-2 ops) | no | yes | for acceptance only | yes (routes/literals) | low-med | high | low (shallow columns) | NEXT_AFTER |
| B | real minimization stub; false-1-MINIMAL risk (finding #1); no reproducibility scoring | no | no | yes (reducible + honest dossiers) | yes (seeded fault injection) | no (fixtures) | n/a | med | high | latent until a real anomaly | NEXT_AFTER |
| C | no browser-side projection; no real pairing; class-only comparator | yes (L5 cross-surface) | yes (3 paired ops) | partial (localization value) | partial (seeded conflicts) | acceptance only | partial (endpoint registry identity) | high | med (DOM privacy) | medium, speculative | VIABLE_LATER |
| D | selection never narrowed a real run; 3-4 semantic ops | no | no | no | yes (backtests) | no | n/a | low | high | low | DEFER |
| E | budget mechanics proven; small surface | no | no | no | yes | no | n/a | med | high | low | VIABLE_LATER |
| F | real contracts are L1/L2 only; source provably supports L3 | yes (type regression, enum violation) | no | partial (richer dossiers) | yes (extended matrix + sentinel) | acceptance only | yes (consts, casts, permission lists @ 27bb007a) | med | high | highest per unit of contained execution | **RECOMMEND** |
| G | zero real findings on Ripple | no | yes (product) | no | weak | yes | yes | high | med | speculative | DEFER |
| H | no bug-hunting-value candidate | no | no | no | yes | no | n/a | low | high | none | DEFER |

## Appendix B — implementation-ready future-task spec (Phase 10A; NOT authorized)

- **Task ID:** `phase-10-deeper-real-source-semantic-contracts`
- **Phase:** `10-DEEPER-REAL-SEMANTIC-CONTRACTS`
- **Title:** Nightwatch Phase 10 — Deeper Real-Source Semantic Contracts
- **Objective:** extend the real-source admission bridge so deeper L3
  invariants (item-level types, finite enums) are mechanically derived
  from the approved read-only Ripple source for the existing 4 admitted
  targets; prove detection on extended synthetic fixtures; integrate
  through the existing campaign/triage/dossier chain; close under
  continuity v2. NO DEV, NO new surface, NO Phase 6, NO AI.
- **Authorization class:** `PHASE_10_DEEPER_SEMANTIC_IMPLEMENTATION_ONLY`
  (NOT granted by this design review).
- **Allowed files:** `src/oracles/expectations/**`, `src/oracles/invariants/**`,
  `src/oracles/semantic/**` (additive), `src/oracles/projections/**`
  (additive), `corpus/phase10/**`, `tests/unit/**` (new + narrow edits),
  `bin/hardening-check.mjs` (narrow guards), `.github/workflows/hardening.yml`
  (matrix step), `docs/**`, `.agent/**`.
- **Forbidden authority:** campaign/triage core changes (beyond existing
  dossier passthrough), changeIntelligence, journeys/registry (no new
  endpoint authority), ownerScope, Phase 6 surfaces, DEV/NEXT/production,
  AI/model, selfDev/promotion/catalog/B adoption, Alphaus writes,
  publication, recipe re-targeting (approved read-only targets only).
- **Source modules:** as §9 layers 1-5.
- **State machine:** `P10_SPEC_DESIGNED (this doc; NOT_AUTHORIZED) →
  P10_IMPLEMENTATION_IN_PROGRESS → P10_VALIDATED_SYNTHETIC →
  (optional separately authorized) P10_VALIDATED_DEV → P10_COMPLETE`;
  STALE (source advanced → restart fresh), BLOCKED, DEFERRED per
  continuity v2.
- **Deterministic inputs:** pinned read-only source snapshots (repo @ SHA,
  disposable /tmp mirrors), recipe registry v2, fixture bodies; no clock/
  seed/randomness in oracle outputs.
- **Outputs:** enriched admitted expectations (with extended evidence
  digests), fixture-matrix report (detection recall/precision, sentinel
  leaks), synthetic campaign dossiers with enriched semanticEvidence,
  currentness sweep report.
- **Privacy:** unchanged — projections carry paths/types/presence/opaque
  tokens/enum-membership only; no raw values, no DOM; sentinel sweep
  extended to new extractor records and failure paths.
- **Provenance:** every new invariant carries its derivation chain
  (extractor kind + symbol + normalized structure digest); synthetic
  expectations never relabeled as real.
- **Boundedness:** recipe set fixed (4 targets); new extractor kinds
  bounded lexical (no execution); evaluation budgeted; fixture matrix
  fixed.
- **Tests:** extractor unit matrices per new kind; recipe v2 validation;
  admission enrichment (conforming PASS / mutated ANOMALY per target);
  invariant FINITE_ENUM + polymorphic TYPE_MATCH matrices; precision/
  recall on extended corpus; sentinel sweep; campaign integration +
  baseline; hardening purity.
- **Synthetic acceptance:** criteria 1-6 (§11) green locally + isolated
  full-history checkout + exact CI.
- **Optional DEV acceptance (10B, separate authorization):** ONE contained
  DEV run (common-exchange journey, enriched expectation) via the Phase 9B
  harness pattern — fresh source truth, re-derivation, restricted resolver
  RESOLVED, auth gate, one invocation, replay determinism, privacy audit.
- **CI:** extend hardening.yml with the Phase 10 matrix step; existing
  steps unchanged; exact CI green at the implementation checkpoint and the
  docs closure.
- **Stop conditions:** any need to touch campaign/triage core authority,
  journeys/registry, ownerScope, Phase 6, promotion/catalog → STOP and
  re-design; source drift → restart fresh; gate failure → repair before
  closing; any discovered privacy leak → STOP + escalation.
- **Success token:** `PHASE_10_DEEPER_SEMANTIC: COMPLETE` with criteria
  1-6 (and 7 only under a separate 10B authorization).

## Appendix C — second/third DEV canary verdict

With DEEPER contracts, a second/third DEV acceptance is NOT "the same
harness works twice more": re-running the common-exchange journey against
an enriched expectation exercises a DIFFERENT invariant class (L3
typed/enum) and a different privacy boundary (enum-membership projection)
— new architectural evidence. Payer-exchange/account-inventory would add
journey variety (different extractor chains). Verdict: **valuable as the
optional Phase 10B, not as standalone canaries**, and not required for
Phase 10A completion (synthetic criteria suffice; DEV stays
separately-authorized).

## Appendix D — timing verdicts

- **Triage timing (§20):** improve AFTER depth (NEXT_AFTER). A first real
  anomaly would already yield a deterministic dossier (invariant identity,
  source contract, full-sequence reproduction, fingerprint); the
  false-1-MINIMAL risk (finding #1) is real but fixes no finding-count
  problem. Synthetic fault injection makes the triage phase testable
  without a natural anomaly.
- **Differential timing (§21):** not yet the most valuable consumer of the
  projection layer. The projection layer removed the value-observation
  blocker, but browser-side projection + adapter pairing + FP controls are
  a large build with no natural evidence; F first.
- **Source-selection timing (§22):** selection sophistication does not
  matter yet — 3 semantic-covered operations make selection leverage
  near-zero; DEFER.
- **Expectation drift (§30):** adopt as a standing local sweep only as a
  Phase 10A subordinate mechanism (it is maintenance tooling, not a
  primary yield capability).

## Appendix E — decision and safety records

- Decision record: D-58 (docs/DECISIONS.md) — Phase 9 terminal proof;
  post-Phase-9 primary bottleneck INSUFFICIENT_REAL_SEMANTIC_DEPTH;
  chosen next architecture DEEPER_REAL_SOURCE_SEMANTICS (Phase 10); old
  Phase 9 runner-up (triage confidence) NOT retained — Phase 9 changed the
  architecture and triage cannot create detections; deferred alternatives
  (coverage, triage, differential, selection, yield, multi-product,
  selfDev); Phase 6 boundary; AI boundary; implementation NOT authorized.
- Safety vector (this design review): DEV 0, NEXT 0, production 0,
  mutations 0, DB 0, infra 0, AI/model 0, Alphaus writes 0, publication 0,
  selfDev 0, promotion 0, catalog 0, B adoption 0, runtime Git writes 0;
  Nightwatch docs commits expected only.

## Appendix F — follow-up finding (recorded, not fixed)

**Finding #1 — real minimization false-1-MINIMAL certification risk.**
`src/core/campaign/orchestrator.ts:799-802` wraps the real adapter's
stub `invalidReducedReplay` (`tests/manual/phase7-real-campaign.ts:360-366`)
so that FRESH_EXACT_REPLAY is forced REPRODUCES while every reduced
candidate returns INVALID; `minimizeFailure` then treats INVALID as
non-reproduction, can complete the one-deletion audit, and certify
`1-MINIMAL` (status UNCHANGED, confidence MEDIUM, reproductionCount 1)
having replayed ZERO genuine reduced candidates. Dossier honesty is
deterministic, but the guarantee token can overstate. Owner: the
HIGH_CONFIDENCE_SEMANTIC_TRIAGE option (NEXT_AFTER). Not fixed in this
task (source-change boundary).
