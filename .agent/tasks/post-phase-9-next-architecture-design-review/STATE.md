# Task State

## Identity

Task ID: post-phase-9-next-architecture-design-review
Phase: POST-9-DESIGN
Title: Nightwatch Post-Phase-9 — Next Bug-Hunting Architecture Design Review
Authorization class: POST_PHASE_9_NEXT_ARCHITECTURE_DESIGN_REVIEW_ONLY
Status: COMPLETE
Starting SHA: aba46a9af1a1021ae58a1253f93fda297391576e
Last validated implementation SHA: aba46a9af1a1021ae58a1253f93fda297391576e
Last substantive checkpoint SHA: aba46a9af1a1021ae58a1253f93fda297391576e
Branch: main
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: aba46a9af1a1021ae58a1253f93fda297391576e
LAST_VALIDATED_IMPLEMENTATION_SHA: aba46a9af1a1021ae58a1253f93fda297391576e
LAST_SUBSTANTIVE_CHECKPOINT_SHA: aba46a9af1a1021ae58a1253f93fda297391576e
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_LIVE_HEAD

## Status

PHASE_9_STATUS (unchanged): COMPLETE
PHASE_9B_R1 (unchanged): COMPLETE_DEV_SEMANTIC_ACCEPTANCE_VERIFIED
PHASE_9B_R1_DEV_RESULT (unchanged): PASS
PHASE_9A_1_STATUS (unchanged): COMPLETE
PHASE_8_STATUS (unchanged): COMPLETE
CANONICAL_CATALOG_ENTRY_COUNT (unchanged): 1 (digest bd35b934...)
NEXT_PORTFOLIO_MEMBER (unchanged): AVAILABLE_NOT_ADOPTED
NEXT_PROMOTION_AUTHORITY (unchanged): NONE
POST_PHASE_9_ARCHITECTURE_DESIGN_STATUS: COMPLETE

## Objective

Recompute the post-Phase-9 bug-yield bottleneck from current source,
evaluate options A–H (+I if genuinely distinct), select exactly ONE primary
next bug-hunting architecture with an evidence-backed phase number/name,
produce an implementation-ready future-task spec, record the decision
durably (design doc + D-58 + ROADMAP + CURRENT_STATE), validate docs/
continuity, push exact CI, and STOP. NO implementation, NO DEV, NO Phase 6,
NO AI, NO selfDev/promotion/catalog, NO future authorization granted.

## Current Milestone

COMPLETE / STOP — the design review is closed: bottleneck recomputed,
exactly one primary architecture selected (DEEPER_REAL_SOURCE_SEMANTICS,
Phase 10), design document + D-58 + ROADMAP + CURRENT_STATE updated,
docs-only checkpoint c3d7fd1 pushed fast-forward with exact green CI
31942942455 (30/30 steps), task terminalized under continuity v2. Next
implementation requires a separate owner authorization.

## Completed Milestones

- M0 — bootstrap + durable reads (2026-08-16): CASE D confirmed (HEAD ==
  origin/main == aba46a9, worktree clean); AGENTS.md; ACTIVE_TASK
  (9B-R1 COMPLETE); CURRENT_STATE (incl. machine block); ROADMAP;
  ARCHITECTURE Phase 9/9A.1/9B/9B-R1 records; DECISIONS D-54..D-57 (next
  D-number: D-58); SAFETY_MODEL referenced; PHASE_9_ROADMAP §17-20;
  PHASE_9B_TASK_SPEC; task STATEs x4.
- M1 — source audit + evidence tables (2026-08-16): triage (minimizer,
  clustering, differential, pipeline, localization), real campaign adapter
  (phase7-real-campaign.ts: invalidReducedReplay stub at :360-366, wiring),
  campaign (orchestrator promoteFindings/triageAnomaly at :809, real budget
  profile), changeIntelligence (6-repo/22-edge map, fallback selection),
  semantic core (expectations types, admission.ts invariant generation,
  recipes registry 4/3/1, invariants vocabulary 10 kinds, receipts),
  journeys (3 reviewed contracts), Phase 9B runner (single expectation
  exposed), depth-ceiling source trace (ripple-api @ 27bb007a:
  ExchangeRate.php (object) cast, CURRENCY_RANGE_VALIDATE, vendor
  permission lists).
- M2 — analysis + selection (2026-08-16): yield model re-estimate;
  coverage × depth matrix; expectation classification L1/L2 only for real
  contracts; new primary bottleneck = INSUFFICIENT_REAL_SEMANTIC_DEPTH;
  primary architecture = DEEPER_REAL_SOURCE_SEMANTICS; phase = Phase 10
  (10A local/synthetic + optional 10B contained DEV acceptance);
  NEXT_AFTER = HIGH_CONFIDENCE_SEMANTIC_TRIAGE,
  REAL_SEMANTIC_COVERAGE_EXPANSION; VIABLE_LATER = BROWSER_API_SEMANTIC_
  DIFFERENTIAL, CAMPAIGN_SEMANTIC_YIELD_INTELLIGENCE; DEFER =
  SOURCE_CHANGE_GUIDED_SEMANTIC_SELECTION, MULTI_PRODUCT_EXPANSION,
  SELF_DEVELOPMENT_2ND_ADOPTION.

## Work In Progress

NONE.

## Exact Next Action

STOP — the post-Phase-9 design review is complete
(POST_PHASE_9_ARCHITECTURE_DESIGN_STATUS: COMPLETE); the selected next
implementation (Phase 10 — Deeper Real-Source Semantic Contracts) requires
a separate owner authorization. No further design work; no implementation
authority granted.

## Evidence Summary (context-compaction safe)

- Phase 9 terminal proof: projection layer (safe DTOs, opaque tokens,
  canonical digests, hard caps, hostile fail-closed) PROVEN synthetic
  (oracleProjection 22, sentinel 15) + real DEV (R1 privacy audit PASS);
  10-kind invariant vocabulary implemented; synthetic corpus 5/5 seeded
  classes detected, 0 FP on 10 benign, protocol baseline 0/5; real-source
  admission bridge: 4 recipes admitted (ripple-api @ 27bb007a), evidence
  digests ev:sha256, freshness matrix A-F, resolver atomic, receipts
  nine-outcome no-silent-failure; R1: ONE launcher invocation, FIRST+REPLAY
  decisive PASS (resolved 1, receipts 1, PASS 1, decisive 1, invariants 3,
  anomalies 0) @ 169df39d (digest ev:sha256:608265368c9a086f43c94e5c),
  replay deterministic, privacy audit PASS, safety zero.
- What R1 did NOT prove: other 2 DEV-reachable expectations; anomaly path
  against real product (zero anomalies observed — no-anomaly ≠ no-need);
  real semantic minimization; browser/API semantic differential;
  source-change-driven semantic selection; multi-expectation campaign
  behavior; deeper non-shape invariants; cross-product reuse.
- Current coverage: admitted real-source expectations 4 (common-exchange,
  payer-exchange, account-inventory, billing-group-exchange); DEV-reachable
  3; real-DEV-accepted 1; invariant classes used by real expectations:
  TYPE_MATCH root ARRAY + FIELD_PRESENT per item key ONLY (admission.ts
  lines 135-145); source repo 1 (mobingilabs/ripple-api); journeys 3
  (ripple-payer-exchange-read, ripple-common-exchange-read,
  ripple-account-inventory); expectation depth L1 (root/type) + L2
  (field/shape) only — zero L3+.
- Coverage ceiling: approved read-only target ceiling 6 (registry
  APPROVED_READ_ONLY_TARGET_IDS); recipes 4 (billing-groups-legacy REJECTED
  AMBIGUOUS; billing-groups gRPC DEFERRED — not observable by JSON
  observer); billing-group-exchange admitted but NOT DEV-reachable (needs
  a new reviewed journey rule). Realistic additional DEV-reachable rows:
  ~1 (billing-group-exchange via new journey) or ~1 (gRPC billing-groups
  via new stream-projection capability — heavy).
- Depth ceiling (read-only source trace at 27bb007a): ExchangeRate.php —
  getCommonExchangeRate builds exchange_rate via (object) cast (non-empty
  OBJECT / empty ARRAY); CURRENCY_RANGE_VALIDATE const keys {usd,jpy,sgd,
  myr,idr,inr} (line 30-37); vendor permission lists ['aws','azure','gcp']
  (line 40); payer-exchange rows {id,vendor,name,exchange_rate} with
  exchange_rate polymorphic [] vs {}; account-inventory 15 keys, values
  nullable (L2 ceiling). => TYPE_MATCH on typed fields + finite-enum
  (exchange_rate object keys subset of CURRENCY_RANGE_VALIDATE keys) are
  MECHANICALLY PROVABLE L3 invariants for the exchange-rate operations;
  current extractor vocabulary (PHP_FUNCTION_LIST_ROW_KEYS,
  PHP_FUNCTION_RETURNS_LIST_OF_BUILDER, PHP_ROUTE_GET_BINDING) does NOT
  extract const literals / cast sites / permission lists — new extractor
  kinds + recipe schema extension required.
- Triage (source-verified): minimizer algorithm real (ddmin + 1-deletion
  audit, honest budget semantics, confidence ladder) BUT real campaign
  adapter reduced-candidate replay is the stub invalidReducedReplay
  (phase7-real-campaign.ts:360-366: always INVALID/ACTION_NOT_APPROVED);
  orchestrator wraps it (orchestrator.ts:799-802) so FRESH_EXACT_REPLAY is
  forced REPRODUCES and every reduced candidate is INVALID => minimizer can
  terminate with status UNCHANGED + guarantee 1-MINIMAL + reproductionCount
  1 + MEDIUM confidence having replayed ZERO genuine reduced candidates —
  a false-1-MINIMAL certification risk (RECORDED FOLLOW-UP FINDING #1; not
  fixed in this task). Clustering metadata/fingerprint-based (12 feature
  dims + fingerprint + transient). Differential compareBrowserAndApi
  class-level only (statusClass/contentTypeClass/routeClass/
  structuralState/parseability/oracleFingerprint; rootCauseClaim NONE);
  real adapter: journey candidates api:null; API candidates synthetic
  browser failed:false — both sides never coexist for one operation.
  Localization keyword/edge-map heuristics; rootCauseClaim NONE. Dossier:
  deterministic; for a real anomaly TODAY it would answer invariant
  identity (semanticEvidence), location, source contract (expectationId +
  source SHA + evidence digest), reproduction (full-sequence), source
  currentness, fingerprint — but NOT reduced sequence, NOT genuine
  confidence, NOT value-level localization.
- Campaign (source-verified): real profile INITIAL_REAL_CAMPAIGN_BUDGET
  (6 browser contexts, 3 journeys, 0 exploration, 6 API executions, 8
  replays, 4 minimization candidates, 24 actions, 15 min, 1 promoted
  cluster); feasibility reserve + atomic consumption + I.1 positive-limit
  rule proven (budget mechanics non-primary); selection fixed 3-journey
  lineage; changeIntelligence 6 repos / 22 edges path-prefix only; real
  runs historically hit conservative fallback (7 backtests: 2 TP, 0
  material FP, 4 fallbacks).
- Real finding history: zero admitted product anomalies across real
  campaigns (Phase 2A-7; J2 font 502 L0 candidate never reproduced;
  historical budget-starvation was a NIGHTWATCH defect fixed by Hardening
  I/I.1); 9B-R1 zero anomalies. Real contained runs: several; admitted
  product anomalies 0; reproducible semantic anomalies 0; actionable
  dossiers 0. Nightwatch suffers from not seeing enough DETECTION DEPTH,
  not from post-detection handling.
- Yield model: surfaces (3 journeys/3 API ops, fixed by containment) ×
  P(defect) (unknown, >0 assumed) × P(detection) (raised ~0 -> non-zero by
  Phase 9 but ONLY shape-class on 1 DEV-accepted op; L3 classes absent) ×
  P(actionable) (machinery-limited: real minimization stub, differential
  unreachable). Dominant term NOW: P(detection) — specifically
  INSUFFICIENT_REAL_SEMANTIC_DEPTH (columns too shallow; rows capped ~4-5).
- Coverage × depth matrix (target | journey | expectation | DEV-reach |
  DEV-accept | depth | differential | triage-ready):
  common-exchange.read | ripple-common-exchange-read | yes | yes | YES |
  L2 (root ARRAY + month + exchange_rate) | no | minimizer stub;
  payer-exchange.read | ripple-payer-exchange-read | yes | yes | no | L2
  (root ARRAY + id/vendor/name/exchange_rate) | no | same;
  account-inventory.read | ripple-account-inventory | yes | yes | no | L2
  (root ARRAY + 15 keys) | no | same;
  billing-group-exchange.read | none (no reviewed rule) | yes | no | no |
  L2 (root ARRAY + 4 keys) | no | same.
- Expectation-quality classification: L1 root/type: 4/4 (root TYPE_MATCH
  ARRAY); L2 field/shape: 4/4 (FIELD_PRESENT 2-15 keys); L3 finite
  enum/envelope: 0/4; L4 relational/identity/cardinality: 0/4; L5
  transition/cross-surface: 0/4.
- Option matrix (verdicts): A REAL_SEMANTIC_COVERAGE_EXPANSION — NEXT_AFTER
  (row ceiling ~4-5; same shallow columns; +1 op via new journey, +1 gRPC
  heavy); B HIGH_CONFIDENCE_SEMANTIC_TRIAGE — NEXT_AFTER (improves
  actionable, creates no detections; synthetic fault injection can
  validate; fixes finding #1); C BROWSER_API_SEMANTIC_DIFFERENTIAL —
  VIABLE_LATER (genuinely new L5 class but needs browser-side DOM
  projection + real adapter pairing + FP controls; high build, no natural
  evidence); D SOURCE_CHANGE_GUIDED_SEMANTIC_SELECTION — DEFER (3-4
  semantic-covered ops => little leverage); E CAMPAIGN_SEMANTIC_YIELD_
  INTELLIGENCE — VIABLE_LATER (budget mechanics proven; small surface =>
  selection among few paths adds little); F DEEPER_REAL_SOURCE_SEMANTICS —
  RECOMMEND (raises P(detection) per operation on the EXISTING accepted
  surface: typed-field TYPE_MATCH + finite-enum L3 invariants mechanically
  provable from source; closes the named COST_FINANCIAL_SEMANTICS risk
  class gap; fully local/synthetic-first; zero new journeys/DEV surface;
  reuses all Phase 9 machinery); G MULTI_PRODUCT_EXPANSION — DEFER (zero
  real findings on Ripple; one clean PASS != finding yield); H
  SELF_DEVELOPMENT_2ND_ADOPTION — DEFER (no bug-hunting-value reason;
  variant B structural canary).
- SELECTED: POST_PHASE_9_NEXT_ARCHITECTURE: DEEPER_REAL_SOURCE_SEMANTICS;
  NEXT_PHASE: PHASE_10; title "Phase 10 — Deeper Real-Source Semantic
  Contracts"; 10A local/synthetic + optional separately authorized 10B
  contained DEV acceptance; NEXT_PHASE_STATUS:
  DESIGNED_NOT_STARTED_NOT_AUTHORIZED; implementation authority
  NOT_GRANTED. NOT the old P9 runner-up (which was triage confidence) —
  Phase 9 changed the architecture; depth is the new zero term.

## Files Changed

| Path | Reason | Status |
|---|---|---|
| `.agent/tasks/post-phase-9-next-architecture-design-review/{SPEC,PLAN,STATE,REPORT}.md` | strict-v2 design-review task records | docs (created) |
| `.agent/ACTIVE_TASK.md` | point to this task IN_PROGRESS | docs (changed) |
| `docs/design/POST_PHASE_9_NEXT_ARCHITECTURE.md` | repository-native design document | docs (created) |
| `docs/DECISIONS.md` | D-58 decision record | docs (changed) |
| `docs/ROADMAP.md` | post-Phase-9 design review section | docs (changed) |
| `docs/CURRENT_STATE.md` | header + post-Phase-9 design review record (machine block unchanged) | docs (changed) |

No Nightwatch source/test/config/workflow changes in this task.

## Validation Ledger

- M0 bootstrap: git fetch origin clean; HEAD == origin/main ==
  aba46a9; branch main; remote https://github.com/quantdale/night-watch.git;
  worktree clean.
- M5 validation: `npm run hardening:check` PASS; `npm run agent:check`
  PASS (2 expected warnings: CHECKPOINT_ADVANCE approved-paths-only,
  LEGACY v1 tasks); `npm run agent:audit` strict_errors 0 (24 legacy v1
  warnings); `npm run project:check` PASS at the clean tree (checkoutClean
  true; machine truth block intact); `node bin/selfdev-catalog-integrity.mjs`
  PASS at the clean tree (checkoutClean true, maxEntries 64); `git diff
  --check` clean; worktree clean after push.
- M6 docs checkpoint c3d7fd1 pushed fast-forward (aba46a9..c3d7fd1);
  HEAD == origin/main == c3d7fd1; exact CI 31942942455: completed,
  success, exact head SHA, 30/30 steps green (incl. Offline hardening
  check, Phase 9 matrix, Phase 9A.1 matrix, Phase 9B harness matrix,
  Project-memory truth check, Agent-state check, Completed-task continuity
  audit, Synthetic campaign, catalog integrity, whitespace).

## Decisions Made During This Task

- D0 (2026-08-16): CASE D — expected exact clean source; no prior
  post-phase-9 design-review task exists; proceed.
- D1 (2026-08-16): Primary bottleneck = INSUFFICIENT_REAL_SEMANTIC_DEPTH
  (columns too shallow, rows capped); depth ceiling mechanically provable
  from current ripple-api source (L3 typed/enum contracts).
- D2 (2026-08-16): Primary architecture = DEEPER_REAL_SOURCE_SEMANTICS
  (F), with subordinate mechanism = admission/extractor extension for
  deeper blueprints on the existing 4 admitted targets (the
  "more expectations per operation" part of A is absorbed as the
  subordinate mechanism).
- D3 (2026-08-16): Phase 10 (not a Phase 9.x continuation): Phase 9 is
  terminal COMPLETE (D-57); continuation labels would blur the closed
  boundary; Phase 10 stands on the proven Phase 9 machinery.
- D4 (2026-08-16): Follow-up finding #1 recorded (false-1-MINIMAL
  certification risk in the real adapter's stub-replay wrapper) — NOT
  fixed in this task (source-change boundary); assigned to the triage
  NEXT_AFTER option.
- D5 (2026-08-16): No parallel reviewer subagents — every architectural
  claim was verified directly from source with concrete citations; no
  additional independent option I found genuinely distinct (expectation
  drift / cross-run semantic memory are consumers of depth, not creators;
  recorded as cross-cutting notes).

## Discoveries

- The Phase 9A.1 D2 note claimed "TYPE_MATCH only where the source
  literally establishes the type (common-exchange exchange_rate OBJECT)" —
  the SHIPPED admission.ts emits ONLY root TYPE_MATCH ARRAY + FIELD_PRESENT
  per item key; no item-level TYPE_MATCH exists. The extractor vocabulary
  cannot extract cast sites or const literals. This is the exact depth gap
  Phase 10 closes.
- A real anomaly today would produce a dossier with UNCHANGED + possibly
  1-MINIMAL + MEDIUM confidence having replayed zero reduced candidates
  (orchestrator wrapper + stub replay) — dossier honesty is deterministic
  but the guarantee token can overstate (finding #1).
- The dependency map already names COST_FINANCIAL_SEMANTICS +
  PROTO_CONTRACT + ACCOUNT_INVENTORY risk classes with no enforcing oracle;
  Phase 10 depth directly addresses COST_FINANCIAL_SEMANTICS on the
  exchange-rate edges (j1-client, j2-client, j1/j2-api-handler).
- Clean semantic PASS produces zero semantic-oracle events in the recorder
  (PASS receipts live in the observer ledger only) — acceptance evidence is
  the summary JSON, not events.jsonl (reconfirms R1 discovery).

## Blockers

NONE.

## Safety Events

None. Safety vector: DEV/NEXT/production contacts 0, product mutations 0,
DB/infra queries 0, AI/model calls 0, Alphaus writes 0, publication 0,
selfDev intents 0, approvals 0, APPLY 0, catalog writes 0, B adoption 0,
runtime Git writes 0; Nightwatch development docs commits expected only.

## Deferred / Follow-Up

- Follow-up finding #1 (recorded, NOT fixed): real minimization
  false-1-MINIMAL certification risk (orchestrator.ts:799-802 wraps the
  stub replay; minimizer may certify 1-MINIMAL with zero genuine reduced
  replays). Owner of fix: HIGH_CONFIDENCE_SEMANTIC_TRIAGE (NEXT_AFTER).
- Coverage rows for a later phase: billing-group-exchange (new reviewed
  journey rule), gRPC billing-groups (new stream-projection capability,
  blueapi/ouchan recipes).
- Expectation drift as a permanent local check: candidate cross-cutting
  mechanism (read-only currentness sweep over admitted recipes) — not
  primary; optional subordinate in Phase 10A.
- Cross-run semantic memory (deterministic cross-run evaluation history):
  consumer of depth; not selected.

## Completion Snapshot

- Status: COMPLETE; POST_PHASE_9_ARCHITECTURE_DESIGN_STATUS: COMPLETE
  (ACTIVE_TASK, STATE, and REPORT agree); PHASE_9_STATUS COMPLETE
  (unchanged); PHASE_8_STATUS COMPLETE (unchanged).
- Current milestone: COMPLETE / STOP; Work In Progress: NONE; Exact Next
  Action: STOP — the selected next implementation (Phase 10) requires a
  separate owner authorization; no implementation authority granted.
- Substantive docs checkpoint: c3d7fd1adbb9402ed83ae141eba46bdeb62ffaa5
  (aba46a9a..c3d7fd1 fast-forward; exact CI 31942942455 success at the
  exact head SHA, 30/30 steps green); live HEAD and origin/main discovered
  from Git (LIVE_HEAD_AUTHORITY: GIT; final CI authority: GitHub Actions
  for the live HEAD).
- Selection (final): bottleneck INSUFFICIENT_REAL_SEMANTIC_DEPTH;
  architecture DEEPER_REAL_SOURCE_SEMANTICS; phase PHASE_10 (Deeper
  Real-Source Semantic Contracts); status DESIGNED_NOT_STARTED_NOT_
  AUTHORIZED; implementation authority NOT_GRANTED; D-58; design record
  docs/design/POST_PHASE_9_NEXT_ARCHITECTURE.md; ROADMAP + CURRENT_STATE
  updated.
- Project truth (unchanged): catalog count 1, raw digest
  sha256:bd35b934b852f192c2ba0f10c242dde3ebab492c66cd6760427f128a7dfba968
  (byte-identical through the task); NEXT_PORTFOLIO_MEMBER
  AVAILABLE_NOT_ADOPTED; NEXT_PROMOTION_AUTHORITY NONE; project-state
  protocol nightwatch.project-state.v1; project:check PASS.
- Safety vector: DEV/NEXT/production 0, mutations 0, DB 0, infra 0,
  AI/model 0, Alphaus writes 0, publication 0, selfDev 0, promotion 0,
  catalog 0, B adoption 0, runtime Git writes 0; Nightwatch docs commits
  expected only (c3d7fd1 substantive + final docs closure).
- Continuity: agent:check and agent:audit zero strict errors at the
  substantive checkpoint; final docs closure commit pushed fast-forward;
  final exact CI green (verified after push).

## Resume Recipe

Task complete. Do not resume. The selected next implementation (Phase 10
— Deeper Real-Source Semantic Contracts) requires a separate owner
authorization (`PHASE_10_DEEPER_SEMANTIC_IMPLEMENTATION_ONLY` for the
local/synthetic Phase 10A; optional later
`PHASE_10B_CONTAINED_DEV_SEMANTIC_ACCEPTANCE_ONLY`); this design review
granted none. Follow-up finding #1 (real minimization false-1-MINIMAL
certification risk) is owned by the HIGH_CONFIDENCE_SEMANTIC_TRIAGE
NEXT_AFTER option.
