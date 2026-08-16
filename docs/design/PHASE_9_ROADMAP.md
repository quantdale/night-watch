# Phase 9 Roadmap — Deterministic Semantic Oracle Depth

> Repository-native design document (`docs/design/*.md` approved checkpoint
> path, Phase 8 closure task). Authoring task:
> `phase-8-final-closure-phase-9-roadmap-selection` (Phase 8-CLOSURE,
> authorization `PHASE_8_CLOSURE_AND_ROADMAP_SELECTION_ONLY`). This document
> SELECTS the next Nightwatch investment; it does NOT implement Phase 9.
> `PHASE_9_IMPLEMENTATION_AUTHORITY: NOT_GRANTED`.

## 1. Current Nightwatch bug-hunting pipeline (source-reconstructed, 2026-08-15)

The wired entry point is `tests/manual/phase7-real-campaign.ts`
(`bin/phase7-real.mjs`), composing all hops through the pure campaign state
machine (`src/core/campaign/orchestrator.ts`):

```
source/change intelligence          collectChangeset/combineChangesets/selectJourneys
                                    (src/core/changeIntelligence/git.ts, selection.ts,
                                    6-repo / 22-edge map.ts) — path-prefix only;
                                    changedFiles.length === 0 → BASELINE_HEALTH fallback
        ↓
journey/test selection              buildCampaignSelection (src/core/campaign/selection.ts)
                                    fixed 3-journey lineage (JOURNEY→API→EXPLORATION→
                                    REPRODUCTION); exploration suppressed in the real
                                    profile (maxExplorationContexts: 0)
        ↓
campaign orchestration              CampaignOrchestrator.run — resumable pure state
                                    machine, atomic budget bundles, feasibility
                                    reproduction reserve, storm suppression
        ↓
browser/API execution or replay     declarative read-only journeys (journeys/engine.ts);
                                    Phase 5 restricted read-only API relay
                                    (src/api/phase5); "reproduction" = live re-execution;
                                    offline deterministic replay comparator exists but is
                                    not wired into campaigns
        ↓
deterministic oracles               protocol/structural only: unexpected-status,
                                    malformed JSON/NDJSON, wrong content-type, resource
                                    role, request-failure class, pageerror/console/CSP,
                                    stability, auth validity, Phase 5 parseability
        ↓
anomaly → minimization              deterministic ddmin subsequence reducer + 1-deletion
                                    audit (src/core/triage/minimizer.ts); real-adapter
                                    reduced-candidate replay is currently a stub
                                    (invalidReducedReplay) — real minimization cannot
                                    reduce yet (honesty gap, Phase 9 follow-up)
        ↓
fingerprint clustering/dedup        SHA-256 over fingerprint + sanitized feature
                                    dimensions; occurrence cap (triage/clustering.ts)
        ↓
browser/API differential            class-level comparator (triage/differential.ts);
                                    currently unreachable in the real adapter (both
                                    sides never coexist for one operation)
        ↓
source relevance/localization       path-pattern correlation through the same edge map;
                                    keyword boundary heuristics; rootCauseClaim NONE
        ↓
dossier                             deterministic sanitized dossier + human recipe +
                                    AI-ready package, atomic owner-only persistence
        ↓
optional bounded AI review          not wired into campaigns; zero authority
```

Hop-by-hop verdicts (with citations in the Phase 9 evidence appendix):
change intelligence is a selection filter, never a budget allocator; journey
selection caps surface at 3 journeys + 3 API operations per campaign;
orchestration is mature but frozen-order with `maxPromotedClusters: 1`;
oracles stop at protocol depth; minimization is strong by design but its real
replay adapter is a stub; clustering is exact-match metadata; differential is
class-only and unreachable in real runs; localization is keyword heuristics;
dossier faithfully records upstream; AI review has no authority.

## 2. Phase 8 closure context

Phase 8 (self-development promotion research) is COMPLETE via this closure
task: one owner-gated canonical adoption (R1, commit `24fc437`), continuation
proven, current-source truth hardened (continuity v2 + project-state v1 +
catalog integrity + authority wording), no unresolved safety blocker. D-52
selected `CLOSE_PHASE_8`; D-53 records the terminal closure. Variant B stays
`AVAILABLE_NOT_ADOPTED`; promotion authority stays `NONE`; the canonical-
promotion machinery is retained for a future concrete candidate under fresh
owner authorization. Nightwatch's center of gravity returns to bug hunting.

## 3. Current primary bottleneck

```
CURRENT_PRIMARY_BUG_HUNTING_BOTTLENECK:
  insufficient semantic oracle depth
```

Evidence: (a) the deterministic oracle set is protocol/structural only —
13 protocol checks, ~3 structural presence checks, and zero DOMAIN, zero
RELATIONAL, zero value-level TEMPORAL/CROSS-SURFACE oracles
(`src/oracles/protocol/passiveChecks.ts`, `resourceChecks.ts`,
`src/api/phase5/oracle.ts`); (b) 11 common application bug classes (wrong
data rendered, stale state after navigation, list/detail mismatch, broken
pagination, incorrect computed totals, filter inconsistency, HTTP-200 error
envelopes, timezone errors, empty-state errors, business rejections, races)
are all undetectable by construction; (c) every real campaign from Phase 2A
through Phase 7 produced zero admitted findings — the only natural L0
candidate (J2 font 502) never reproduced, and Phase 7's terminal state was
`NO ADMITTED PRODUCT ANOMALIES`; (d) the historical budget-starvation
finding (Phase 7 real run) was a genuine defect but was repaired by
Hardening Campaign I/I.1 — `analyzeCampaignBudgetFeasibility`
(`src/core/campaign/budget.ts:128-171`) reserves reproduction capacity
before manifest freeze, exploration is suppressed in the real profile
(`maxExplorationContexts: 0`), consumption is atomic, and the
`BUDGET_STOP_WITHOUT_POSITIVE_LIMIT_EXHAUSTION` false positive is rejected
(I.1). Budget allocation is therefore no longer the primary yield
bottleneck: the fixed budget now reliably reaches triage, but the anomalies
it reaches triage with are protocol/infra noise, not semantic defects.

Finding-yield model: `surfaces × P(defect) × P(detection) × P(actionable)`.
Surfaces ≈ 3 journeys + 3 API ops; P(defect) is moderate on real product
surface; **P(detection) ≈ 0 for any semantic defect** (oracle ceiling);
P(actionable) is machinery-limited (minimization stub, differential
unreachable) but mature in design. The zero term is detection: more
executions of shallow oracles multiply protocol noise, not useful bugs.

## 4. Option matrix (required options evaluated)

| Option | Direction | Role | Yield | FP | Time | Det. | Safety | Env-dep | Impl. | Ops | Evidence | Reuse | Fit | Overeng. | Owner | Local val. | Increm. | Σ |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| P9-A | CAMPAIGN_YIELD_INTELLIGENCE | VIABLE_LATER | 3 | 2 | 3 | 5 | 5 | 2 | 3 | 4 | 3 | 5 | 4 | 3 | 4 | 5 | 3 | 59 |
| P9-B | DETERMINISTIC_ORACLE_DEPTH | **SELECTED** | 5 | 5 | 3 | 5 | 5 | 3 | 3 | 4 | 5 | 4 | 5 | 3 | 3 | 5 | 5 | 68 |
| P9-C | TRIAGE_CONFIDENCE | NEXT_AFTER_PHASE_9 | 3 | 4 | 3 | 5 | 5 | 2 | 4 | 4 | 4 | 5 | 5 | 4 | 4 | 5 | 3 | 60 |
| P9-D | DIFFERENTIAL_EXPANSION | NEXT_AFTER_PHASE_9 | 3 | 4 | 3 | 5 | 5 | 3 | 3 | 4 | 5 | 4 | 4 | 4 | 4 | 4 | 4 | 59 |
| P9-E | SOURCE_CHANGE_SELECTION | NEXT_AFTER_PHASE_9 | 2 | 4 | 4 | 5 | 5 | 3 | 4 | 5 | 3 | 4 | 4 | 4 | 5 | 5 | 2 | 59 |
| P9-F | MULTI_PRODUCT_EXPANSION | REJECT (premature) | 3 | 2 | 2 | 3 | 3 | 5 | 2 | 2 | 3 | 5 | 3 | 3 | 2 | 3 | 3 | 44 |
| P9-G | SELF_DEVELOPMENT_2ND | DEFER (D-52) | 1 | 1 | 1 | 5 | 5 | 1 | 4 | 5 | 1 | 2 | 3 | 4 | 3 | 5 | 1 | 42 |

Scoring: 1-5 per criterion; 5 best (complexity/ops/owner/overengineering
scored 5 = low). Σ is a guide only — the decision is evidence-based, not
arithmetic (see §5 and §6).

## 5. Evidence for each option

- **P9-A Campaign yield / budget intelligence.** Evidence: budget
  mechanics are already hardened (feasibility reserve, atomic accounting,
  I.1 positive-limit rule; `campaign.test.ts:852-927`); the remaining
  rigidity (frozen order, `maxPromotedClusters: 1`, exploration suppressed)
  is deliberate boundedness. Expected-information scoring, coverage-aware
  allocation, and cross-run exploration memory would improve *how* the
  fixed budget explores — but every allocation choice still lands on
  protocol-only oracles. Budget intelligence multiplies shallow executions;
  yield gain is bounded by the oracle ceiling.
- **P9-B Deterministic semantic oracle depth.** Evidence: oracle inventory
  (appendix B) shows RELATIONAL, DOMAIN, value-level TEMPORAL and
  CROSS-SURFACE classes are entirely absent, and the header comment
  `passiveChecks.ts:6-7` states business invariants were deferred past
  Phase 2C; Phase 5's max verdict is `ORACLE_PASS` after successful JSON
  parse (an HTTP-200 error envelope passes); the dependency map already
  names the missing semantics (`COST_FINANCIAL_SEMANTICS`,
  `PROTO_CONTRACT`, `ACCOUNT_INVENTORY`, `map.ts:137-145`) with no enforcing
  oracle. The triage machinery that consumes richer anomalies already
  exists and is mature (admission ladder, minimizer design, clustering,
  localization, dossier). This is the only option that raises P(detection)
  of semantic defects from ≈0 to meaningful on the existing surface.
- **P9-C Triage confidence & root-cause localization.** Evidence: triage is
  already the strongest part of the system (deterministic minimizer design,
  confidence ladder, FP catalog); its real ceilings are (i) the
  `invalidReducedReplay` stub so real minimization cannot reduce, and (ii)
  `rootCauseClaim` always NONE. Fixing (i) improves dossier honesty but
  does not create new detections; without deeper oracles, triage converts
  shallow anomalies into well-documented shallow dossiers (the oracle
  inventory's Part 3A verdict).
- **P9-D Browser/API differential expansion.** Evidence:
  `compareBrowserAndApi` exists (`triage/differential.ts:7-70`) but
  compares classes only, and the real adapter never produces both sides for
  one operation (`phase7-real-campaign.ts:389,483`). Value-level
  differential requires value-level observation, which is a P9-B
  prerequisite (sanitized projections). Natural successor once projections
  exist.
- **P9-E Source-change-driven test selection.** Evidence: the Phase 3
  selector is implemented and backtested (7 blind backtests: 2 TP, 0
  material FP, 4 conservative fallbacks) but has never narrowed a real
  campaign — every real run hit the conservative fallback or an empty
  window. Its ceiling is the 3-journey surface; selecting better among 3
  journeys adds little until surface and detection depth grow.
- **P9-F Multi-product expansion.** Evidence: zero high-quality findings
  have been produced on Ripple yet; expanding the containment/test
  architecture to other products multiplies setup cost and safety surface
  while inheriting the same oracle ceiling. Multi-product decision (§34 of
  the closure spec): depth/yield first, breadth later.
- **P9-G More self-development / second canonical adoption.** Control
  option. D-52: DEFER unless a real bug-hunting-value candidate exists; B
  is a structural canary with zero bug-hunting value. Not selected; no
  promotion authority implied.

## 6. Selected direction

```
PHASE_9_DIRECTION: DETERMINISTIC_ORACLE_DEPTH
PHASE_9_TITLE: Phase 9 — Deterministic Semantic Oracle Depth
```

Why it wins: it attacks the zero term in the finding-yield model
(P(detection) of semantic defects) rather than multiplying executions or
polishing post-processing of shallow anomalies; it reuses the mature triage
chain that is currently starved of deep anomalies; it is fully deterministic
and testable on synthetic fixtures before any DEV; it respects the Phase 6
owner freeze (no datastore/infra surface) and the AI boundary (core remains
deterministic). C scores close in raw sum but its yield is capped by B's
absence — the oracle inventory's verdict: "the binding constraint is oracle
depth"; "the machinery to consume richer anomalies already exists."

## 7. Rejected / deferred directions

- P9-A — VIABLE_LATER (budget intelligence after oracle depth proves
  selection among deep anomalies matters).
- P9-C — NEXT_AFTER_PHASE_9 (fix the minimization replay honesty gap and
  raise triage confidence once deep anomalies exist).
- P9-D — NEXT_AFTER_PHASE_9 (value-level differential is a consumer of the
  P9-B projection layer; also rewire the real adapter so both sides
  coexist).
- P9-E — NEXT_AFTER_PHASE_9 (narrowing matters once surface is larger and
  journeys carry semantic oracles).
- P9-F — REJECT for now: premature breadth; revisit after Phase 9 shows
  measurable yield on Ripple.
- P9-G — DEFER per D-52; no promotion machinery use; no standing authority.

## 8. Safety boundary (Phase 9)

- Execution remains limited to the existing approved contained DEV surface
  (read-only browser journeys + restricted Phase 5 read-only API relay) for
  any later acceptance; production remains impossible; no new mutation
  classes are implied.
- New observation is in-memory and redaction-compatible: projections carry
  shapes, counts, types, identities, and structure — never raw customer
  values, never DOM text (privacy contract), never persisted bodies.
- The Phase 9 implementation task requires its own owner authorization;
  this document grants none.

## 9. Phase 6 freeze boundary

Phase 6 remains permanently `FROZEN_BY_OWNER` /
`INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE` (D-29,
`src/core/policy/ownerScope.ts:82-122`). Phase 9 must be valid without
DynamoDB, BigQuery, Spanner, GCP/GKE/Kubernetes, runtime deployment
binding, or cloud infra/log archaeology. All expectations are source-backed
or observation-backed from the contained DEV browser/API plane. Store-vs-
store equality oracles (the strongest Phase 6 class) stay frozen and are
NOT revived.

## 10. AI boundary (Phase 9)

Phase 9 core is deterministic. AI remains optional downstream review only
and never: chooses safety, decides oracle truth, chooses canonical actions,
controls campaigns without deterministic admission, modifies source, or
promotes findings automatically. The campaign/triage/evidence layers stay
statically forbidden from importing AI authority (hardening guard).

## 11. Selected Phase 9 architecture (design sketch, not implementation)

Primary objective: detect deeper semantic application bugs with
deterministic oracles over sanitized projections, reusing the existing
triage chain. Subordinate mechanism: a redaction-compatible value-shape
observation/projection layer feeding deterministic invariant oracles.

Layers (source modules likely involved):

1. **Projection layer** (`src/oracles/projections/**`, new): capture
   in-memory sanitized projections of browser/API observations per
   operation — response shape tree (field names, types, cardinalities,
   nullability), row/entry counts, key identities, total-adjacent numeric
   fields (as abstract quantities, not raw values), request/route pairing
   per journey step. Deterministic, bounded, redaction-clean; never
   persisted raw.
2. **Source-backed expectation oracle** (`src/oracles/expectations/**`,
   new): derive schema/shape expectations from the read-only Alphaus
   source snapshot (response models, route/action contracts) and check
   projections against them (structural + relational consistency). Source
   repos remain read-only; expectations carry provenance (repo @ SHA).
3. **Cross-step invariant oracle** (`src/oracles/invariants/**`, new):
   deterministic state-transition consistency within a journey (before/
   after shape stability, identity continuity across steps, list/detail
   agreement when the same entity is observed in two projections,
   monotonicity/identity invariants over repeated observations).
4. **Triage integration** (reuse `src/core/triage/**`): new oracle
   findings flow through the existing clustering → admission →
   minimization → differential → localization → dossier chain unchanged;
   the differential comparator gains a projection-level mode (a P9-D
   successor) only if the closure review approves it as a subordinate
   mechanism — the primary deliverable is oracle depth, not new triage.
5. **Fixture matrix** (`tests/unit/oracleProjection*.test.ts` + synthetic
   journey fixtures): known-semantic-bug fixtures (wrong row count,
   list/detail mismatch, stale shape after navigation, HTTP-200 error
   envelope, totals inconsistency) prove detection; benign-corpus fixtures
   prove false-positive control; all synthetic/local.

The Phase 9 core adds no product mutations, no data-plane access, no AI.

## 12. State machine (future task)

```
P9_SPEC_DESIGNED (this document; NOT_AUTHORIZED)
  ↓ separate owner authorization (PHASE_9_ORACLE_DEPTH_IMPLEMENTATION_ONLY)
P9_IMPLEMENTATION_IN_PROGRESS  (local/synthetic implementation only)
  ↓ milestone gates: projection layer → expectation oracle → invariant
  ↓ oracle → fixture matrix → integration
P9_VALIDATED_SYNTHETIC (all synthetic gates green)
  ↓ optional separately authorized bounded contained-DEV acceptance
P9_VALIDATED_DEV (bounded DEV acceptance green) — or skip to close
  ↓
P9_COMPLETE (task closed under continuity v2; roadmap updated)
```

STALE (source advanced → restart from fresh source), BLOCKED (owner
declines / gate fails → stays in progress), DEFERRED (postponed → current
state). No promotion machinery states; catalog untouched.

## 13. Test strategy

- Deterministic unit matrices for projections (sanitization proof: no raw
  value leakage under the sentinel sweep), expectation derivation (fixture
  source snapshot), and each invariant oracle (positive detection +
  negative control + benign-corpus FP control).
- Synthetic campaign integration: run the existing campaign orchestrator
  with fixture journeys containing seeded semantic defects; assert the new
  oracles admit the seeded anomalies and dossiers carry them; assert the
  FP catalog still suppresses known-benign cases.
- Full existing regression remains green (no new skips); hardening check
  extended narrowly (projection layer purity: read-only, in-memory, no
  persistence, no AI import).
- Optional later bounded contained-DEV acceptance only under separate
  authorization; zero production surface.

## 14. Success criteria (Phase 9 completion, 4-7 measurable)

1. Projection layer implemented: sanitized in-memory projections with
   deterministic byte-identical output over the fixture matrix; sentinel
   sweep proves no raw-value leakage.
2. Source-backed expectation oracle implemented with provenance (repo @
   SHA) and deterministic failures; fixture matrix proves detection of ≥5
   seeded semantic bug classes (wrong row count, list/detail mismatch,
   stale shape after navigation, HTTP-200 error envelope, totals
   inconsistency).
3. Cross-step invariant oracle implemented; fixture matrix proves
   state-transition consistency detection with zero false positives on the
   benign corpus (oracle precision over the fixture matrix ≥ 99%, or an
   exact documented bound).
4. Synthetic campaign demonstrates measurable improvement: seeded defects
   admitted through the real orchestrator pipeline into dossiers with
   reproducible evidence; baseline protocol-only run admits none.
5. Full regression green (typecheck, hardening, matrices, agent:
   check/audit, project:check, catalog integrity, full Playwright 0
   failed); exact CI green for the implementation checkpoint.
6. Roadmap/decision records updated; task closed under continuity v2;
   promotion authority NONE; catalog byte-identical.

## 15. Implementation-ready next-task spec

- **Task ID:** `phase-9-deterministic-semantic-oracle-depth`
- **Phase:** `9-ORACLE-DEPTH`
- **Title:** Nightwatch Phase 9 — Deterministic Semantic Oracle Depth
- **Authorization class:** `PHASE_9_ORACLE_DEPTH_IMPLEMENTATION_ONLY`
  (NOT granted by this document or this closure task).
- **Objective:** implement the projection layer and the source-backed
  expectation + cross-step invariant oracles, prove them on the synthetic
  fixture matrix, integrate findings into the existing deterministic
  triage/dossier chain, and close under continuity v2. Optional separate
  later task (9B) for bounded contained-DEV acceptance.
- **Current evidence gap:** no value-level fixture corpus; no DOMAIN/
  RELATIONAL oracle; no cross-surface value test; no proof that semantic
  oracles are implementable under the redaction regime (oracle inventory
  gaps D1/D2).
- **Source modules likely involved (implementation-time scope, not
  authorized here):** new `src/oracles/projections/**`,
  `src/oracles/expectations/**`, `src/oracles/invariants/**`;
  integration seams in `src/core/journeys/engine.ts` /
  `src/browser/observers/networkObserver.ts` /
  `src/api/phase5/oracle.ts` observation points and
  `src/core/triage/**`; fixture corpus under `corpus/phase9/**`; tests
  under `tests/unit/**`; `bin/hardening-check.mjs` narrow guards.
- **Allowed files (at implementation):** the new oracle modules, their
  tests/fixtures, integration seams listed above, hardening guards, docs.
- **Forbidden authority:** promotion machinery (intent/approval/APPLY/
  adoption), catalog mutation, owner-policy changes, campaign/triage
  authority changes, product mutations, DEV/NEXT/production expansion,
  DB/infra (Phase 6 freeze), AI authority, Alphaus writes, publication.
- **State machine:** see §12.
- **Deterministic inputs:** read-only Alphaus source snapshots (repo @
  SHA), fixture journeys/bodies, campaign manifests; no clock/seed/
  randomness in oracle outputs.
- **Outputs:** sanitized projections (deterministic, byte-identical),
  oracle finding records in the existing anomaly schema, dossiers via the
  existing chain, fixture-matrix results.
- **Identity/provenance:** findings carry source snapshot provenance and
  the oracle/module version; deterministic candidate IDs.
- **Boundedness:** projection capture bounded per request (size/field/
  depth caps), oracle evaluation budgeted, fixture matrix fixed.
- **Safety constraints:** read-only; in-memory; no raw-value persistence;
  sentinel sweep; no AI import; Phase 6 surfaces forbidden.
- **Test strategy:** §13.
- **Synthetic acceptance:** §13 + §14 criteria 1-5.
- **Optional DEV acceptance (9B, separately authorized):** one bounded
  contained DEV run on approved journeys; production impossible.
- **CI:** extend hardening.yml with the Phase 9 oracle-depth matrix;
  existing steps unchanged; exact CI green.
- **Failure classifications:** `PHASE_9_ORACLE_DEPTH_BLOCKED_*` tokens
  (projection leakage, expectation drift, FP bound breach, regression
  failure, CI failure, continuity failure) — defined at implementation
  start.
- **Success token:** `PHASE_9_ORACLE_DEPTH: COMPLETE` with criteria 1-6.
- **Stop conditions:** any need to touch the catalog/portfolio/promotion
  machinery, owner-policy, or Phase 6 surfaces → STOP and re-design; source
  drift → restart fresh; gate failure → repair before closing.

## 16. NOT_AUTHORIZED marker

```
PHASE_9_IMPLEMENTATION_AUTHORITY: NOT_GRANTED
PHASE_9_STATUS: DESIGNED_NOT_STARTED_NOT_AUTHORIZED
```

This roadmap selects and specifies; it does not authorize. The Phase 9
implementation task requires a separate owner authorization
(`PHASE_9_ORACLE_DEPTH_IMPLEMENTATION_ONLY`) before any Phase 9 source
change. This closure task performs zero Phase 9 implementation and zero
product execution.

---

## Appendix A — pipeline hop evidence (citations)

| Hop | Capability | Evidence | Weakness |
|---|---|---|---|
| Change intelligence | `collectChangeset`/`selectJourneys`, 22-edge map | `changeIntelligence.test.ts` (20), backtest | path-prefix only; `symbols` never populated; empty changeset → fallback |
| Selection | fixed lineage, CHANGE_DIRECTED/BASELINE_HEALTH modes | `campaign.test.ts` selection tests | 3-journey ceiling; exploration suppressed |
| Orchestration | resumable pure state machine, atomic budget | `campaign.test.ts:464,521,619,726,852` | frozen order; `maxPromotedClusters: 1`; storm halts campaign |
| Execution/replay | declarative journeys; Phase 5 relay | `journeyEngine.test.ts`, `phase5Api.test.ts` | campaign reproduction = live re-run; no offline replay wired |
| Oracles | protocol/structural set | `phase2cOracleMatrix.test.ts`, `phase5Api.test.ts` | semantic classes absent |
| Minimization | ddmin + 1-deletion audit | `privateTriage.test.ts:70-170` | real-adapter replay stub |
| Clustering | exact fingerprint dedup | `privateTriage.test.ts:189` | metadata-only |
| Differential | class-level comparator | `privateTriage.test.ts:210` | unreachable in real adapter |
| Localization | edge-map + keyword boundary | `privateTriage.test.ts:281` | heuristics; rootCauseClaim NONE |
| Dossier | deterministic sanitized record | `privateTriage.test.ts:308-390` | ceiling set by oracles |

## Appendix B — oracle-class gap taxonomy (current)

- PROTOCOL: exists (13 checks) — malformed payload, failed request.
- STRUCTURAL: exists (shell/table markers, empty-body) — missing-field/
  wrong-type depth absent.
- RELATIONAL: **absent** — list/detail, cross-resource consistency.
- TRANSITIONAL: partial (route-level only) — no before/after data
  consistency.
- CROSS-SURFACE: class-level only — no value-level browser/API
  comparison.
- DOMAIN: **absent** — no product semantic invariant.
- TEMPORAL: partial (metadata replay compare) — no value-level stability/
  monotonicity.

Phase 9 builds the missing data-relevant layers (RELATIONAL, DOMAIN,
value-level TEMPORAL/CROSS-SURFACE-ready projections) without any Phase 6
surface.

## 17. Implementation record (2026-08-16, owner-authorized)

```
PHASE_9_IMPLEMENTATION_AUTHORITY: GRANTED (once) — PHASE_9_ORACLE_DEPTH_IMPLEMENTATION_ONLY
PHASE_9_STATUS: COMPLETE_LOCAL_SYNTHETIC
PHASE_9_ORACLE_DEPTH_STATUS: COMPLETE
```

Executed by task `phase-9-deterministic-semantic-oracle-depth` (starting SHA
`09a940340aaa537706d07140995de9bd26d0fdfd`; substantive implementation
`e74185bf7b83783c2b7421e675ea2d3bb9053482`; exact implementation CI
31929017844, 29/29 steps green incl. the "Phase 9 deterministic semantic
oracle depth matrix" step). Decision D-54; architecture record in
`docs/ARCHITECTURE.md` (Phase 9 implementation record).

Delivered (all local/synthetic; measured on the fixed corpus):

- Semantic projection layer (`nightwatch.semantic-projection.v1`) with
  opaque identity tokens, numeric relation refs, canonical byte-identical
  serialization + digests, hard bounds, hostile-input fail-closed; raw
  customer scalars never cross the projection boundary.
- Source-backed declarative expectations (`nightwatch.semantic-expectation.v1`):
  strict validation, provenance (repo @ SHA), fail-closed staleness; one
  static source adapter for the synthetic fixture + real read-only
  checkouts. `REAL_SOURCE_EXPECTATION_CANARY: NOT_ADMITTED` (annotation
  pattern absent in real source; live checkout SHA `27bb007a...` matches
  the Phase 5 catalog).
- Deterministic semantic expectation + cross-step invariant oracles over
  the fixed vocabulary; safe findings (`nightwatch.semantic-oracle-finding.v1`)
  with categorical fingerprints.
- Seeded corpus: 5/5 required classes detected; 0 false positives on 10
  benign cases (precision 1, recall 1); baseline protocol-only detection
  0/5 (proven at M1) vs Phase 9 semantic 5/5.
- Sentinel matrix: zero leaks across projections, findings, fingerprints,
  recorder events, campaign checkpoints, dossiers, briefs, artifacts, and
  failure-path errors (incl. derived forms and absolute private paths).
- Pipeline integration: Phase 5 composed protocol/semantic stage; network-
  observer semantic hook; findings through the EXISTING campaign
  orchestrator -> admission -> triage -> dossier (5 sanitized semantic
  dossiers from the seeded campaign pair; paired baseline admits none);
  dossier additive `semanticEvidence` (backward compatible).
- Hardening purity + integration-seam guards; dedicated CI matrix step.
- Full regression 896 passed / 1 skipped / 0 failed (local), 893 / 4 / 0
  (isolated full-history checkout); catalog byte-identical
  `sha256:bd35b934...`; `PHASE_8_STATUS: COMPLETE`; B
  AVAILABLE_NOT_ADOPTED; `NEXT_PROMOTION_AUTHORITY: NONE`.

State machine: `P9_SPEC_DESIGNED -> P9_IMPLEMENTATION_IN_PROGRESS ->
P9_VALIDATED_SYNTHETIC` (reached). Optional bounded contained-DEV
acceptance remains a SEPARATE later authorization (Phase 9B):

```
PHASE_9_DEV_ACCEPTANCE: RECOMMENDED_SEPARATE_AUTHORIZATION
```

Evidence gap a contained DEV run would close: real response shape variety,
real source-freshness drift, and end-to-end browser-observed semantic
findings on the real product surface — none of which the local/synthetic
stage can observe. Proposed narrow Phase 9B task: one bounded contained DEV
run on approved read-only journeys with the semantic hook enabled, synthetic
expectations bound to the current real source snapshots, asserting the same
privacy/sentinel contract. Not executed here; no DEV contact occurred.
