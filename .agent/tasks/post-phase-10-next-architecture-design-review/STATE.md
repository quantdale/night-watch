# Task State

## Identity

Task ID: post-phase-10-next-architecture-design-review
Phase: POST-10-DESIGN
Title: Nightwatch Post-Phase-10 — Next Bug-Hunting Architecture Design Review
Authorization class: POST_PHASE_10_NEXT_ARCHITECTURE_DESIGN_REVIEW_ONLY
Status: COMPLETE
Starting SHA: 1d7dd6cb6525195e59602e106f50306859a7998d
Last validated implementation SHA: 1d7dd6cb6525195e59602e106f50306859a7998d
Last substantive checkpoint SHA: ab6d67bbe8f88d22b67109902c3c21077b14d6e0
Branch: main
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 1d7dd6cb6525195e59602e106f50306859a7998d
LAST_VALIDATED_IMPLEMENTATION_SHA: 1d7dd6cb6525195e59602e106f50306859a7998d
LAST_SUBSTANTIVE_CHECKPOINT_SHA: ab6d67bbe8f88d22b67109902c3c21077b14d6e0
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_LIVE_HEAD

## Status

PHASE_10_STATUS (unchanged): COMPLETE
PHASE_10B (unchanged): COMPLETE_DEV_DEEP_SEMANTIC_ACCEPTANCE_VERIFIED
PHASE_10B_DEV_RESULT (unchanged): PASS
PHASE_10A_STATUS (unchanged): COMPLETE
PHASE_9_STATUS (unchanged): COMPLETE
PHASE_8_STATUS (unchanged): COMPLETE
CANONICAL_CATALOG_ENTRY_COUNT (unchanged): 1 (digest bd35b934...)
NEXT_PORTFOLIO_MEMBER (unchanged): AVAILABLE_NOT_ADOPTED
NEXT_PROMOTION_AUTHORITY (unchanged): NONE
POST_PHASE_10_ARCHITECTURE_DESIGN_STATUS: COMPLETE

## Objective

Recompute the post-Phase-10 useful-bug-yield bottleneck from current
source, explicitly test item-0-only semantic collection coverage as a
primary candidate, re-verify the real minimization gap, evaluate options
A–J, select EXACTLY ONE primary next bug-hunting architecture with an
evidence-backed phase number/name, produce an implementation-ready
future-task spec, record the decision durably (design doc + D-61 +
ROADMAP + CURRENT_STATE), validate docs/continuity, push exact CI, and
STOP. NO implementation, NO DEV, NO Phase 6, NO AI, NO
selfDev/promotion/catalog, NO future authorization granted.

## Current Milestone

COMPLETE / STOP — design review closed: bottleneck recomputed
(COLLECTION_ITEM_SEMANTIC_COVERAGE_GAP), exactly one primary architecture
selected (BOUNDED_COLLECTION_WIDE_SEMANTIC_EVALUATION, Phase 11),
design document + D-61 + ROADMAP + CURRENT_STATE updated, validations
pass, docs-only substantive checkpoint ab6d67b pushed with exact CI
31982298205 success. Phase 11 implementation requires a separate owner
authorization.

## Completed Milestones

- M0 — bootstrap + durable reads (2026-08-16): CASE D confirmed
  (HEAD == origin/main == 1d7dd6cb, worktree clean, branch main, remote
  https://github.com/quantdale/night-watch.git); AGENTS.md; ACTIVE_TASK
  (phase-10b COMPLETE); CURRENT_STATE (1713 lines, incl. Phase 10A/10B
  records + machine block); ROADMAP (1497 lines, Phase 10 section);
  ARCHITECTURE + SAFETY_MODEL referenced; DECISIONS D-53..D-60 read
  (next D-number: D-61); design docs POST_PHASE_9_NEXT_ARCHITECTURE (546
  lines, incl. Appendix F finding #1) + PHASE_10_DEEPER_SEMANTIC_CONTRACTS
  (258 lines, §12 residual limitations) + PHASE_10B_DEV_ACCEPTANCE (113
  lines); task STATEs (post-phase-9 + phase-10 + phase-10b) read.
- M1 — source audit (2026-08-16): projections (projector.ts: items kept
  up to maxArrayItemsInspected 128 with full structure + arrayTruncated;
  types.ts DEFAULT_PROJECTION_LIMITS maxDepth 8 / fields 64 / array items
  128 / nodes 1024 / identities 256 / numerics 512 / raw bytes 1MB);
  invariants (evaluate.ts single-node verdicts; paths.ts
  resolvePathWithAmbiguity ONE numeric index, empty/uninspected → NA);
  expectations (admission.ts builds root TYPE_MATCH ARRAY + FIELD_PRESENT
  [itemIndex, field] + per contract TYPE_MATCH/TYPE_IN_SET [itemIndex,
  field]; types.ts invariant vocabulary 11 kinds, MAX_TYPE_SET_SIZE 6;
  paths.ts validateSafePath numeric segment 0..999);
  recipes/registry.ts (4 recipes: common v2 L3 TYPE_MATCH OBJECT,
  payer v2 L3 TYPE_IN_SET {OBJECT,ARRAY}, account-inventory v1 L2 15
  FIELD_PRESENT, billing-group-exchange v1 L2 4 FIELD_PRESENT; ALL
  itemIndex 0; approved read-only targets 6; DEV-reachable 3);
  triage (minimizer.ts ddmin + one-deletion audit; differential.ts
  class-level comparator; pipeline.ts correlation/localization/confidence;
  dossier.ts + semantic/dossier.ts); campaign (orchestrator.ts:799-802
  wrappedReplay; budget/reserves/storm hardened); changeIntelligence
  (map.ts EXACT edges j1/j2-api-handler ExchangeRate.php → journeys,
  COST_FINANCIAL_SEMANTICS risk class); real campaign adapter
  (phase7-real-campaign.ts: invalidReducedReplay at :360-366; journey
  candidates api:null; API candidates synthetic browser); phase5 semantic
  channel (semantic.ts composed stage; semanticOracle wired only via
  NightwatchContextOptions — real campaign does NOT wire it).
- M2 — synthetic proof (2026-08-16): throwaway test
  `tests/unit/__tmpPostPhase10Proof.test.ts` (DELETED after run; worktree
  clean) using derivePhase10FixtureExpectations + evaluateSemanticResponse:
  A all-rows-valid PASS; B row0-invalid ANOMALY (positive control); C
  row1-invalid PASS; D row57-invalid PASS; E row200-invalid (beyond 128
  bound) PASS; F empty-array PASS with item checks NOT_APPLICABLE (SPE C
  §31 semantics); G 201-row valid PASS; H row57-missing-field PASS; I
  payer row1 TYPE_IN_SET violation PASS; J projection retains 100/100
  rows (itemCount 100, inspectedCount 100, arrayTruncated false). =>
  CONFIRMED_COLLECTION_ITEM_COVERAGE_GAP (FIELD_PRESENT + TYPE_MATCH +
  TYPE_IN_SET all row-0-only; architectural — invariant vocabulary/path
  evaluate ONE node; projection already retains bounded multi-item
  structure; not a projection limitation).

## Work In Progress

NONE.

## Exact Next Action

STOP — the post-Phase-10 design review is complete
(POST_PHASE_10_ARCHITECTURE_DESIGN_STATUS: COMPLETE); the selected next
implementation (Phase 11 — Bounded Collection-Wide Semantic Evaluation)
requires a separate owner authorization. No further design work; no
implementation authority granted.

## Evidence Summary (context-compaction safe)

- **Phase 10 terminal proof (reconstructed from source + durable
  records)**: A recipe v2 (`nightwatch.real-source-expectation-recipe.v2`)
  for common-exchange + payer-exchange with itemFieldTypeContracts; v1
  byte-meaning-stable for account-inventory + billing-group-exchange;
  retired v1 archived corpus/phase10/historical. B PHP_ITEM_FIELD_TYPE_FLOW
  bounded lexical extraction (EMPTY_CAST_OBJECT ⇒ ['OBJECT'],
  EMPTY_ARRAY_OR_STRING_KEYS ⇒ ['ARRAY','OBJECT'], else
  TYPE_FLOW_AMBIGUOUS); participates in ev:sha256; admission + resolver
  fail closed on unknown kinds. C common-exchange exchange_rate ALWAYS
  OBJECT (empty `(object)`-cast to `{}`); deep contract TYPE_MATCH
  [0, exchange_rate] OBJECT; DEV VERIFIED (10B: FIRST+REPLAY 4/4/0/0/0,
  deep invariant decisive, deterministic; D-60). D payer-exchange
  exchange_rate OBJECT|ARRAY; TYPE_IN_SET [0, exchange_rate]
  {OBJECT,ARRAY}; synthetic only. E TYPE_IN_SET fixed invariant (1..6
  ProjectionNodeType, no dupes, canonical sorted; missing path/empty
  parent ⇒ NOT_APPLICABLE). F evidence digest + currentness: ev:sha256:<24>
  over normalized source structure; freshness matrix A–E + §44 mutation
  canaries fail closed. G baseline shape-only detects 0/4 seeded deep
  defects, enriched 4/4. H benign 10 cases / 0 FP (incl. payer valid
  empty-ARRAY union). I sentinel sweep + unknown-key probe 0 leaks. J
  synthetic campaign: TYPE_CONTRADICTED findings → orchestrator → triage →
  dossiers with semanticEvidence; paired baseline zero. K contained DEV
  common-exchange deep acceptance (D-60). L FIRST/REPLAY determinism
  (semanticReplayDeterministic true, journeyReplayDeterministic true). M
  real semantic anomalies observed: 0 (NONE_OBSERVED).
- **Coverage inventory**: admitted real-source recipes 4; L1 0, L2 2,
  L3+ 2 ([2,2,3,3]); DEV-reachable 3; real-DEV-accepted shape 1
  (historical 9B-R1) + real-DEV-accepted deep 1 (10B common-exchange);
  journeys 3 reviewed (ripple-payer-exchange-read,
  ripple-common-exchange-read, ripple-account-inventory);
  billing-group-exchange has NO reviewed journey; invariant kinds on real
  contracts: TYPE_MATCH (root ARRAY ×4; item OBJECT ×1), FIELD_PRESENT
  (2–15 keys ×4), TYPE_IN_SET (item {OBJECT,ARRAY} ×1); collection
  semantics: all 4 targets are top-level ARRAY collections of row objects
  (month rows / account rows); item checks operate on item 0 only.
- **Item-0 architecture trace**: recipe blueprint itemIndex (validator
  0..999; registry all 0) → admission builds single-index paths
  `[String(itemIndex), field]` → invariant path resolves exactly one
  numeric segment → projection lookup resolvePathWithAmbiguity returns ONE
  node → evaluator single-node verdict → per-invariant finding. The
  projector retains up to 128 items with full safe structure; nothing
  consumes items beyond index 0. Classification:
  CONFIRMED_COLLECTION_ITEM_COVERAGE_GAP (architectural + blueprint
  convention; projection capable). Later-row defect (row ≥1) ⇒ response
  PASS today (C/D/H/I proof); defect beyond inspected window (row ≥128)
  ⇒ PASS today (E proof) — uninspected tail can yield full PASS.
  Privacy: per-item projection carries type/presence/opaque tokens only;
  scanning more items adds NO raw values; counts/ordinals are safe bounded
  metadata; row identities need not persist (ephemeral evaluation).
- **Real minimization gap**: invalidReducedReplay() returns
  {status:'INVALID'} (ACTION_NOT_APPROVED / PRECONDITION_DIVERGENCE) for
  every reduced sequence; orchestrator wrappedReplay forces
  FRESH_EXACT_REPLAY → REPRODUCES; minimizeFailure ddmin finds no
  reduction (all INVALID), one-deletion audit completes vacuously,
  guarantee '1-MINIMAL', status UNCHANGED, reproductionCount 1, confidence
  MEDIUM — zero genuine reduced candidates replayed. Classification:
  CURRENT (matches D-58 Appendix F finding #1, unfixed).
  CONFIRMED_REAL_MINIMIZATION_REPLAY_GAP. A real anomaly today cannot be
  genuinely ddmin-reduced; a 1-MINIMAL conclusion can be produced without
  a valid real reduced replay.
- **Dossier actionability (if a semantic anomaly appeared tomorrow)**:
  violated expectation YES (expectationId/category/expectedClass/
  observedClass); source SHA YES (sourceSHA); evidence digest NO (not in
  SemanticFindingSummary); target YES; journey YES; semantic fingerprint
  YES; reproduction status YES (FRESH_EXACT_REPLAY REPRODUCED,
  deterministic FIRST/REPLAY); source correlation YES; minimized sequence
  PARTIAL (full original; 1-MINIMAL overstates; zero genuine reduced
  replays); fault boundary YES (heuristics); alternatives ruled out YES
  (fixed list).
- **Browser/API differential**: compareBrowserAndApi requires
  api.operationFamily === browser.operationFamily and a non-null api;
  class-level only (statusClass/contentTypeClass/routeClass/
  structuralState/parseability; rootCauseClaim NONE); browser opFamily =
  journeyId (e.g. ripple-common-exchange-read), API opFamily = operationId
  (e.g. ripple.common-exchange.read) — different namespaces; journey
  candidates api:null (phase7-real-campaign.ts:390); API candidates carry a
  synthetic browser observation (failed:false, /api-only); no browser-side
  semantic projection exists (DOM never projected by design). Viable honest
  paired observations today: 0.
- **Coverage-expansion ceiling**: approved read-only targets 6; recipes 4;
  billing-groups-legacy REJECTED AMBIGUOUS (Phase 9A.1); billing-groups
  gRPC not observable by the JSON observer; billing-group-exchange admitted
  but no reviewed journey. Meaningful additional expectations without new
  network authority ≈ 0–1 and would be shallow (L2) — scanning all items
  in existing rows is strictly more valuable than adding rows.
- **Payer second deep DEV canary**: LIMITED_NEW_EVIDENCE — would prove
  TYPE_IN_SET (union contract) + different route/source flow against the
  real product, but the harness pattern is identical (10B); adds
  union-invariant DEV truth only. Not a primary phase driver; fold into
  optional Phase 11B if needed.
- **Change intelligence**: recipes already identify exact source paths
  (sourcePaths, relativePath, symbol per recipe); changeIntelligence map
  has EXACT edges src/App/Handler/ExchangeRate.php → both exchange-rate
  journeys with COST_FINANCIAL_SEMANTICS risk class; deterministic
  changed-path → expectation → journey is constructible BUT the journey
  surface is tiny (3–4) and campaign volume bounded ⇒ selection leverage
  low; DEFER.
- **Campaign yield**: budget accounting, reproduction reserve, minimization
  reserve, storm suppression, maxPromotedClusters 1 all hardened
  (Hardening I/I.1 + Phase 7B); real profile bounds 3 journeys + 3 API ops;
  no natural anomalies ever; campaign scheduling loses fewer bugs than
  collection coverage (which loses ALL later-row defects on the only real
  L3 targets).
- **Real anomaly history**: natural real semantic anomalies 0;
  reproducible real product anomalies 0; high-confidence actionable
  dossiers 0 (durable records; no synthetic inference). Zero-anomaly does
  not imply triage unnecessary — the triage machinery remains designed and
  latently valuable; it cannot create detections.
- **Yield model (recomputed)**: useful bug yield = surfaces (fixed ~3–4
  journeys/ops, containment-capped) × P(real defect) (product property,
  unknown, >0) × P(detection) (now nonzero for shape/type classes BUT
  item-0-only for every collection contract — later-row defects invisible)
  × P(actionable) (machinery-limited; minimization stub; zero real anomalies
  to process). The LOWEST / most suppressive multiplier NOW is
  P(detection) — specifically its collection-item BREADTH: Phase 10 raised
  depth on existing rows but left row coverage at ITEM_0_ONLY for all 4
  contracts; a perfect L3 invariant still misses a real defect in row 1+.
  D-58's NEXT_AFTER (triage) is NOT auto-selected: it improves P(actionable)
  only, creates zero detections, and zero real anomalies exist to be
  actionable.
- **Option scoring (20 fixed criteria, 1–5, 5 favorable; Σ)**:
  A BOUNDED_COLLECTION_WIDE_SEMANTIC_EVALUATION 90 (RECOMMEND); B
  HIGH_CONFIDENCE_REAL_SEMANTIC_TRIAGE 74 (NEXT_AFTER); D
  REAL_SEMANTIC_SURFACE_EXPANSION 71 (NEXT_AFTER); F
  SOURCE_CHANGE_GUIDED_SEMANTIC_SELECTION 70 (DEFER); E
  DEEPER_RELATIONAL_SEMANTICS 68 (DEFER — no current source proof);
  G SEMANTIC_CAMPAIGN_YIELD_INTELLIGENCE 66 (VIABLE_LATER); H
  SECOND_DEEP_DEV_CANARY 65 (NOT_PRIMARY — LIMITED_NEW_EVIDENCE); C
  BROWSER_API_SEMANTIC_DIFFERENTIAL 61 (VIABLE_LATER — 0 viable pairs);
  J SELF_DEVELOPMENT_2ND_ADOPTION 52 (DEFER/REJECT); I MULTI_PRODUCT_
  EXPANSION 46 (DEFER). Load-bearing: A scores 5 on criteria 2 (covered
  defect locations: every inspected row), 3 (P(detection): raises the
  suppressive term directly), 5 (yield), 20 (evidence gap actually
  closed: Phase 10's documented residual limitation); B scores 5 on 4
  (P(actionable)) but 1–2 on detection/yield — latent; C scores 4 on 1
  (new class) but 2 on complexity and 0 viable pairs; D capped rows; E no
  source evidence (SOURCE_ENUM_FLOW_UNPROVEN precedent).
- **SELECTED (M3)**: CURRENT_PRIMARY_POST_PHASE10_BOTTLENECK:
  COLLECTION_ITEM_SEMANTIC_COVERAGE_GAP; POST_PHASE_10_NEXT_ARCHITECTURE:
  BOUNDED_COLLECTION_WIDE_SEMANTIC_EVALUATION; NEXT_PHASE: PHASE_11;
  title "Phase 11 — Bounded Collection-Wide Semantic Evaluation";
  NEXT_PHASE_STATUS: DESIGNED_NOT_STARTED_NOT_AUTHORIZED; implementation
  authority NOT_GRANTED; NEXT_AFTER: HIGH_CONFIDENCE_REAL_SEMANTIC_TRIAGE,
  REAL_SEMANTIC_SURFACE_EXPANSION; VIABLE_LATER: BROWSER_API_SEMANTIC_
  DIFFERENTIAL, SEMANTIC_CAMPAIGN_YIELD_INTELLIGENCE; DEFER:
  SOURCE_CHANGE_GUIDED_SEMANTIC_SELECTION, DEEPER_RELATIONAL_SEMANTICS,
  MULTI_PRODUCT_EXPANSION, SELF_DEVELOPMENT_2ND_ADOPTION,
  SECOND_DEEP_DEV_CANARY (folded into optional Phase 11B).

## Files Changed

| Path | Reason | Status |
|---|---|---|
| `.agent/tasks/post-phase-10-next-architecture-design-review/{SPEC,PLAN,STATE,REPORT}.md` | strict-v2 design-review task records | docs (created) |
| `.agent/ACTIVE_TASK.md` | point to this task | docs (changed) |
| `docs/design/POST_PHASE_10_NEXT_ARCHITECTURE.md` | repository-native design document | docs (created) |
| `docs/DECISIONS.md` | D-61 decision record | docs (changed) |
| `docs/ROADMAP.md` | post-Phase-10 design review section | docs (changed) |
| `docs/CURRENT_STATE.md` | header + post-Phase-10 design review record (machine block unchanged) | docs (changed) |

No Nightwatch source/test/config/workflow changes in this task.

## Validation Ledger

- M0 bootstrap: git fetch origin clean; HEAD == origin/main ==
  1d7dd6cb6525195e59602e106f50306859a7998d; branch main; remote
  https://github.com/quantdale/night-watch.git; worktree clean.
- M2 proof: one throwaway Playwright test run (owns A–J cases) then deleted;
  worktree clean again.
- M5 validation: `npm run hardening:check` PASS; `npm run agent:check`
  PASS (2 expected warnings: CHECKPOINT_ADVANCE, LEGACY v1);
  `npm run agent:audit` strict_errors 0 (24 legacy v1 warnings);
  `npm run project:check` PASS at the clean tree; `node
  bin/selfdev-catalog-integrity.mjs` PASS; `git diff --check` clean;
  worktree clean after push.
- M6 docs checkpoint ab6d67bb pushed fast-forward (1d7dd6c..ab6d67b);
  HEAD == origin/main == ab6d67bb; exact CI 31982298205: completed,
  success, exact head SHA.

## Decisions Made During This Task

- D0 (2026-08-16): CASE D — expected exact clean source; no prior
  post-Phase-10 design-review task exists; proceed.
- D1 (2026-08-16): Primary bottleneck =
  COLLECTION_ITEM_SEMANTIC_COVERAGE_GAP (P(detection) suppression:
  all 4 collection contracts evaluate item 0 only; later-row defects
  invisible).
- D2 (2026-08-16): Primary architecture = BOUNDED_COLLECTION_WIDE_SEMANTIC_
  EVALUATION (A), EXACTLY ONE; not triage (latent — zero real anomalies),
  not differential (0 viable pairs), not coverage expansion (capped rows).
- D3 (2026-08-16): Phase 11 (not a Phase 10.x continuation): Phase 10 is
  terminal COMPLETE; the next capability is a new architecture:
  Bounded Collection-Wide Semantic Evaluation. Phase 11A local/synthetic +
  optional separately authorized Phase 11B contained DEV acceptance.
- D4 (2026-08-16): CONFIRMED_REAL_MINIMIZATION_REPLAY_GAP recorded
  (invalidReducedReplay CURRENT, D-58 finding #1 preserved unfixed);
  owner HIGH_CONFIDENCE_REAL_SEMANTIC_TRIAGE (NEXT_AFTER).
- D5 (2026-08-16): No genuinely distinct OPTION K: expectation-drift
  monitoring is maintenance, not yield (recorded as cross-cutting note);
  browser semantic channel is part of differential (C).

## Discoveries

- The projector ALREADY retains bounded multi-item structure (up to 128
  items, full safe per-item metadata, arrayTruncated flag) — the item-0
  blind spot is NOT a projection limitation; it is the invariant-layer
  single-node evaluation + single-index path semantics + blueprint
  itemIndex-0 convention.
- The seeded Phase 10 corpus plants every deep defect at item 0; no
  later-row defect fixture exists — consistent with the residual
  limitation, and the reason a collection-wide baseline (row-0-only 0/N vs
  collection-wide N/N) is a load-bearing Phase 11 criterion.
- Empty top-level array yields aggregate outcome PASS with all item
  invariants NOT_APPLICABLE (documented SPEC §31 semantics; root
  TYPE_MATCH ARRAY passes on an empty list) — a future coverage-state
  model must keep item-level honesty (EMPTY_NOT_APPLICABLE) while never
  claiming uninspected rows were evaluated.
- Real campaign does NOT wire the semantic oracle (only the Phase 9B/10B
  runners do) — a real campaign semantic anomaly requires explicit wiring
  under a future task; not part of this review.

## Blockers

NONE.

## Safety Events

None. Safety vector: DEV/NEXT/production contacts 0, product mutations 0,
DB/infra queries 0, AI/model calls 0, Alphaus writes 0, publication 0,
selfDev intents 0, approvals 0, APPLY 0, catalog writes 0, B adoption 0,
runtime Git writes 0; Nightwatch development docs commits expected only.

## Deferred / Follow-Up

- Follow-up finding #1 (preserved, NOT fixed): real minimization
  false-1-MINIMAL certification risk (orchestrator.ts:799-802 +
  phase7-real-campaign.ts:360-366). Owner:
  HIGH_CONFIDENCE_REAL_SEMANTIC_TRIAGE (NEXT_AFTER).
- Coverage rows for a later phase: billing-group-exchange (new reviewed
  journey rule), gRPC billing-groups (new stream-projection capability).
- Expectation-drift sweep: standing local maintenance candidate
  (read-only currentness sweep over the recipe registry) — not primary.
- Real campaign semantic wiring: separate decision (future task).

## Resume Recipe

Task complete. Do not resume. The selected next implementation (Phase 11
— Bounded Collection-Wide Semantic Evaluation) requires a separate owner
authorization (`PHASE_11_COLLECTION_WIDE_SEMANTIC_IMPLEMENTATION_ONLY` for
the local/synthetic Phase 11A; optional later
`PHASE_11B_CONTAINED_DEV_SEMANTIC_ACCEPTANCE_ONLY`); this design review
granted none. Follow-up finding #1 (real minimization false-1-MINIMAL
certification risk) is owned by the HIGH_CONFIDENCE_REAL_SEMANTIC_TRIAGE
NEXT_AFTER option.

## Completion Snapshot

- Task records written: SPEC/PLAN/STATE/REPORT (this file) with all
  required headings under strict v2; ACTIVE_TASK.md updated to point to
  this task.
- Design document: `docs/design/POST_PHASE_10_NEXT_ARCHITECTURE.md`
  (19 sections) created; D-61 appended to `docs/DECISIONS.md`; ROADMAP
  and CURRENT_STATE updated with post-Phase-10 design review record.
- Substantive docs checkpoint: ab6d67bbe8f88d22b67109902c3c21077b14d6e0
  (1d7dd6c..ab6d67b fast-forward; exact CI 31982298205 success at the
  exact head SHA); live HEAD and origin/main discovered from Git
  (LIVE_HEAD_AUTHORITY: GIT; final CI authority: GitHub Actions for
  the live HEAD).
- Selection (final): bottleneck COLLECTION_ITEM_SEMANTIC_COVERAGE_GAP;
  architecture BOUNDED_COLLECTION_WIDE_SEMANTIC_EVALUATION; phase PHASE_11
  (Bounded Collection-Wide Semantic Evaluation); status
  DESIGNED_NOT_STARTED_NOT_AUTHORIZED; implementation authority
  NOT_GRANTED; D-61; design record
  docs/design/POST_PHASE_10_NEXT_ARCHITECTURE.md; ROADMAP + CURRENT_STATE
  updated.
- Project truth (unchanged): catalog count 1, raw digest
  sha256:bd35b934b852f192c2ba0f10c242dde3ebab492c66cd6760427f128a7dfba968
  (byte-identical through the task); NEXT_PORTFOLIO_MEMBER
  AVAILABLE_NOT_ADOPTED; NEXT_PROMOTION_AUTHORITY NONE; project-state
  protocol nightwatch.project-state.v1; project:check PASS.
- Safety vector: DEV/NEXT/production 0, mutations 0, DB 0, infra 0,
  AI/model 0, Alphaus writes 0, publication 0, selfDev 0, promotion 0,
  catalog 0, B adoption 0, runtime Git writes 0; Nightwatch docs commits
  expected only (ab6d67b substantive).