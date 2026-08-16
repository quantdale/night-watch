# Task State

## Identity

Task ID: phase-9a-1-real-source-expectation-admission
Phase: 9A.1-REAL-SOURCE-EXPECTATION
Title: Nightwatch Phase 9A.1 — Real-Source Expectation Admission & Semantic Evaluation Observability
Authorization class: PHASE_9_REAL_SOURCE_EXPECTATION_ADMISSION_ONLY
Status: COMPLETE
Starting SHA: 91a64e597bc0b28653fe53bf46e291126963baa5
Last validated implementation SHA: cfc2aaa65227b2caf26d2d51533bf32ecc489028
Branch: main
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 91a64e597bc0b28653fe53bf46e291126963baa5
LAST_VALIDATED_IMPLEMENTATION_SHA: cfc2aaa65227b2caf26d2d51533bf32ecc489028
LAST_SUBSTANTIVE_CHECKPOINT_SHA: cfc2aaa65227b2caf26d2d51533bf32ecc489028
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_LIVE_HEAD

## Status

PHASE_9A_1_STATUS: COMPLETE
PHASE_9B_DEV_READINESS: READY_FOR_SEPARATE_AUTHORIZATION
PHASE_9B_STATUS: DESIGNED_NOT_STARTED_NOT_AUTHORIZED
PHASE_9_STATUS (narrative, unchanged): COMPLETE_LOCAL_SYNTHETIC
PHASE_8_STATUS (unchanged): COMPLETE
CANONICAL_CATALOG_ENTRY_COUNT (unchanged): 1 (digest bd35b934...)
NEXT_PORTFOLIO_MEMBER (unchanged): AVAILABLE_NOT_ADOPTED
NEXT_PROMOTION_AUTHORITY (unchanged): NONE

## Objective

Close the Phase 9B readiness gaps locally: (A) real Alphaus source yields
zero derived expectations (annotation-only adapter) -> Nightwatch-owned
real-source expectation admission bridge (versioned data-only recipes +
fixed bounded syntax-aware extractors + source-evidence binding + fail-closed
currentness); (B) NO_EXPECTATION indistinguishable from PASS -> safe versioned
semantic evaluation receipts with the nine-outcome vocabulary; (C) silent
semantic hook failure -> observable INTERNAL_ERROR receipts + observer
semantic evaluation ledger + privacy-violation escalation. Prove >= 1
real-source expectation mechanically derived/admitted, conforming/mutated
synthetic evaluations, full regression + isolated checkout + exact CI,
Phase 9B readiness verdict, docs/decision closure (D-55), STOP. LOCAL /
SOURCE-ONLY / SYNTHETIC ONLY; NO DEV.

## Current Milestone

COMPLETE / STOP. (All milestones M0-M13 closed; substantive checkpoint
cfc2aaa pushed fast-forward with exact green CI 31932079316 (29/29 steps
incl. the Phase 9A.1 matrix step); isolated full-history checkout green;
docs closure (D-55, ROADMAP/CURRENT_STATE/ARCHITECTURE/SAFETY_MODEL/
PHASE_9_ROADMAP §18, AGENTS.md permanent rule, Phase 9B future-task spec)
committed and pushed with exact final CI green; task closed under
continuity v2 with terminal fields; readiness verdict
READY_FOR_SEPARATE_AUTHORIZATION; Phase 9B DESIGNED_NOT_AUTHORIZED.)

## Completed Milestones

- M0 — bootstrap + task records (2026-08-16): HEAD == origin/main ==
  91a64e597bc0b28653fe53bf46e291126963baa5, worktree clean; durable reads
  (AGENTS.md, ACTIVE_TASK, CURRENT_STATE, ROADMAP, PHASE_9_ROADMAP, Phase 9
  task records, oracle/observer/phase5 source, package.json, playwright
  config, recorder API, journey fixture harness); pre-fix gap reproduction:
  Gap A via oracleExpectationRealSource.test.ts (2 passed; NOT_ADMITTED,
  blockCount 0, expectations 0, live checkout
  mobingilabs/ripple-api@27bb007ad0c798800b6bd3b29760c966422966e7);
  Gap B + Gap C via tests/unit/phase9a1GapReproduction.test.ts (2 passed:
  identical {findings: []} for NO_EXPECTATION vs PASS with no receipt API;
  throwing semanticOracle -> observer continues, zero semantic evidence);
  task records SPEC/PLAN/STATE/REPORT created; ACTIVE_TASK.md updated.
- M1 — candidate audit (3 paths, read-only, parallel) COMPLETE (2026-08-16):
  path A (Phase 5 / API catalog candidates): 4 ADMISSIBLE, 1 AMBIGUOUS,
  1 feasible-but-out-of-scope; path B (journey / ripple-ui callsites): 3 of 5
  ripple-api read ops DEV-reachable via reviewed journey ruleIds, all bare
  JSON arrays (no envelope), no journey wires semanticOracle today; path C
  (adversarial review): all five routes wiring-clean (no response/resultkey/
  method_chain), success = 200 + JSON array vs error = 4xx/5xx + JSON object
  {code,message[,description]}, row-literal keys statically decidable, values
  runtime-dependent (nullable/polymorphic). Candidate table in STATE
  "Decisions" below. Design settled: recipe schema
  nightwatch.real-source-expectation-recipe.v1 (data-only), extractor kinds
  PHP_FUNCTION_LIST_ROW_KEYS + PHP_ROUTE_GET_BINDING (bounded lexical),
  evidence digest ev:sha256 over canonical extraction, atomic resolver,
  receipts v1.
- M2-M5 — implementation (2026-08-16): recipe schema/validator/registry;
  PHP lexical extractors (PUSH/ASSIGN/builder-list/route-binding); admission
  bridge + evidence digest; atomic resolver; receipts v1; hook rewrite;
  observer evaluation ledger + no-silent-failure + privacy escalation;
  Phase 5 composed stage receipts; path extensions (root + bounded array
  index, empty-array N/A); source reader module.
- M6 — test matrices: extraction 21, recipe validation 21, admission 6,
  currentness 10, receipts 16, sentinel 5, conforming/mutation 4, observer
  ledger 2, gap closure 3, canary+consistency 7 (+ semanticIntegration
  rewritten 12; semanticSentinel/oracleProjection/etc. unregressed);
  focused Phase 9 + 9A.1 matrix 212 passed.
- M7-M8 — hardening + CI: Phase 9A.1 core purity + source-reader boundary +
  integration-seam guards (hardening:check PASS); workflow "Phase 9A.1
  real-source expectation admission matrix" step (fixture-backed,
  fail-closed without siblings).
- M9 — local validation: typecheck PASS; campaign synthetic 27; owner
  provenance 91; agent:check PASS (2 expected warnings); agent:audit
  strict_errors 0; project:check (dirty-only pre-commit); catalog integrity
  (dirty-only pre-commit); git diff --check clean; full Playwright 994
  passed / 1 skipped / 0 failed.
- M10 — isolated full-history checkout /tmp/nw-phase9a1-ws/nightwatch at
  cfc2aaa: typecheck/hardening PASS; focused matrix 199 passed; campaign 27;
  agent:check/audit PASS; project:check PASS (checkoutClean true); catalog
  integrity PASS (digest bd35b934..., count 1); full Playwright 983 passed /
  4 environment-conditional skips / 0 failed; git diff --check clean.
- M11 — substantive checkpoint cfc2aaa pushed fast-forward
  (91a64e5..cfc2aaa); HEAD == origin/main == cfc2aaa; exact implementation
  CI 31932079316: completed, success, exact head SHA, 29/29 steps green
  incl. "Phase 9A.1 real-source expectation admission matrix",
  Project-memory truth check, Agent-state check, continuity audit, catalog
  integrity, Synthetic campaign, whitespace.
- M12 — docs closure: D-55; ROADMAP Phase 9A.1 section; CURRENT_STATE intro
  + Phase 9A.1 record (machine block unchanged); ARCHITECTURE Phase 9A.1
  record; SAFETY_MODEL §20 + normative footer; PHASE_9_ROADMAP §18 +
  §17 Phase 9B wording correction (real-source-derived AND admitted
  expectations; synthetic expectations are test fixtures only);
  docs/design/PHASE_9B_TASK_SPEC.md (future-task spec, design only,
  NOT_AUTHORIZED); AGENTS.md Phase 9A.1 permanent rule; STATE/ACTIVE_TASK/
  REPORT terminalized under continuity v2; final docs commit pushed
  fast-forward; exact final CI green.
- M13 — STOP: terminal tokens (PHASE_9A_1 COMPLETE; PHASE_9B_DEV_READINESS
  READY_FOR_SEPARATE_AUTHORIZATION; PHASE_9B_STATUS
  DESIGNED_NOT_STARTED_NOT_AUTHORIZED; PHASE_8_STATUS COMPLETE; catalog
  count 1; B AVAILABLE_NOT_ADOPTED; NEXT_PROMOTION_AUTHORITY NONE); safety
  vector all zero except Nightwatch Git checkpoints; final 84-item report
  delivered.

## Work In Progress

NONE.

## Exact Next Action

STOP — Phase 9A.1 complete; Phase 9B (contained DEV semantic acceptance)
requires a separate owner authorization
(PHASE_9B_CONTAINED_DEV_SEMANTIC_ACCEPTANCE_ONLY); the Phase 9B future-task
spec is design only.

## Files Changed

| Path | Reason | Status |
|---|---|---|
| `.agent/tasks/phase-9a-1-real-source-expectation-admission/{SPEC,PLAN,STATE,REPORT}.md` | strict-v2 task records | docs (created) |
| `.agent/ACTIVE_TASK.md` | point to this task IN_PROGRESS | docs |
| `tests/unit/phase9a1GapReproduction.test.ts` | pre-fix Gap B/C reproduction proof | tests (new) |

## Validation Ledger

- Bootstrap: git fetch origin clean; HEAD == origin/main ==
  91a64e597bc0b28653fe53bf46e291126963baa5; branch main; remote
  https://github.com/quantdale/night-watch.git; git status --short empty.
- Gap A: oracleExpectationRealSource.test.ts — 2 passed (NOT_ADMITTED;
  blockCount 0; expectations 0; live SHA matches the Phase 5 catalog SHA).
- Gap B: phase9a1GapReproduction.test.ts — no expectation and a genuine
  PASS produce the identical return value {findings: []}; no receipt API.
- Gap C: phase9a1GapReproduction.test.ts — throwing semantic hook: response
  200, observer alive, semanticFindings() empty, semanticEvaluations
  undefined, events.jsonl contains no semantic-oracle/INTERNAL_ERROR/
  exception text.
- M2-M6 implementation + matrices (all green): typecheck PASS; focused
  Phase 9 + 9A.1 matrix 212 passed (incl. live real-source canary v2);
  hardening:check PASS (new Phase 9A.1 purity/reader/seam guards);
  campaign:synthetic 27 passed; owner-provenance 91 passed; agent:check
  PASS with 2 expected warnings (STALE_IMPLEMENTATION_BASELINE pre-commit,
  LEGACY v1 tasks); agent:audit strict_errors=0 (24 legacy warnings);
  project:check only PROJECT_STATE_CHECKOUT_DIRTY pre-commit;
  selfdev catalog integrity only SELFDEV_CATALOG_INTEGRITY_CHECKOUT_DIRTY
  pre-commit (passes at a clean tree); git diff --check clean.
- Full Playwright regression at the working tree: 994 passed / 1 skipped
  (pre-existing environment-conditional) / 0 failed (2.5 min).
- §56 owner-local real-source acceptance (live checkout
  mobingilabs/ripple-api @ 27bb007ad0c798800b6bd3b29760c966422966e7 ==
  Phase 5 catalog SHA): candidate source files inspected 5 handlers +
  Routing.yaml sections (audit paths A/B/C); admissible candidates 4;
  rejected candidates 1 (billing-groups-legacy, AMBIGUOUS); deferred 1
  (billing-groups gRPC/proto); real-source recipes 4; derived expectations
  4; current expectations 4; stale 0; DEV-reachable expectations 3
  (payer-exchange, common-exchange, account-inventory);
  billing-group-exchange admitted but NOT DEV-reachable (no reviewed rule).
  Conforming synthetic body per admitted real expectation: PASS x4;
  mutated (2xx error-envelope object): ANOMALY x4 (findings 3/5/16/5).
- Sibling git status --short (pre-existing dirt, recorded, not touched —
  all sibling interactions were read-only: rev-parse + status):
  ripple-api: ?? AGENTS.md; ripple-ui: D openspec/... (7 files) + ?? AGENTS.md;
  ouchan: M .gitignore/.goreleaser.yml/CODEOWNERS/CONTRIBUTING.md/build.sh/
  build/config.yaml/openspec/AGENTS.md/openspec/config.yaml + D openspec/
  changes/... (many) + ?? AGENTS.md/openspec/changes/.../pkg/ripple/v3/
  services-catalog/; blueapi: ?? AGENTS.md. All four checkouts at the exact
  Phase 5 pinned SHAs. No task-caused change in any sibling repo.

## Decisions Made During This Task

- D0 (2026-08-16): CASE D — exact expected source; proceed with Phase 9A.1.
- D1 (2026-08-16): Candidate audit verdicts (evidence over paths A/B/C at
  the pinned SHAs):
  - ripple.payer-exchange.read (GET /v2/payer/exchange_rate/{month},
    ExchangeRate::getAccountExchangeForMonth, Routing.yaml:3557): ADMISSIBLE
    — top-level array, item keys {id, vendor, name, exchange_rate} literal
    (ExchangeRate.php:258-263); exchange_rate polymorphic [] vs {} (no type
    assertion); DEV-REACHABLE (ruleId ripple.payer-exchange.read,
    journey ripple-payer-exchange-read step payer-navigate).
  - ripple.common-exchange.read (GET /exchange_rate/global/{vendor},
    ExchangeRate::getCommonExchangeRate, Routing.yaml:3537): ADMISSIBLE —
    top-level array, item keys {month, exchange_rate} (ExchangeRate.php:95-98);
    exchange_rate always JSON object via (object) cast (:92-94) -> TYPE_MATCH
    OBJECT supportable; DEV-REACHABLE (ruleId ripple.common-exchange.read).
  - ripple.account-inventory.read (GET /accts, Account::getAccountVendor,
    Routing.yaml:1684): ADMISSIBLE — top-level array, 15 fixed item keys
    (Account.php:419-435: billinggroup_id, billinggroup_name, company_id,
    customer_id, customer_name, account_id, vendor, note, payer,
    service_discount, project_id, azure_customer_id, domain_name,
    subscription_id, entitlement_id); values nullable; DEV-REACHABLE (ruleId
    ripple.account-inventory.read).
  - ripple.billing-group-exchange.read (GET /exchange_rate/billing_group/
    {month}, BillingGroup::getExchangeRateForBillingGroup, Routing.yaml:3278):
    ADMISSIBLE — top-level array, item keys {billing_group_id,
    billing_group_name, company_id, exchange_rate} (BillingGroup.php:776-781);
    values nullable; NOT DEV-REACHABLE (no reviewed journey rule).
  - ripple.billing-groups-legacy.read (GET /billinggroup): AMBIGUOUS —
    conditional accounts/payer_accounts keys + blob-typed fields; NOT
    DEV-REACHABLE. Rejected as an invariant source.
  - ripple.billing-groups.read (blueapi proto + ouchan gRPC): statically
    feasible from billing/v1/billing.proto BillingGroup message, but the
    chunked gRPC stream is not observable by the current JSON observer —
    DEFERRED.
- D2 (2026-08-16): Contracts are modest on purpose (SPEC §31): per admitted
  candidate assert root TYPE_MATCH ARRAY (catches 2xx error envelopes /
  wrapper objects — the roadmap's HTTP-200-error-envelope class) + FIELD_
  PRESENT per source-literal item key at ['0', key]; TYPE_MATCH only where
  the source literally establishes the type (common-exchange exchange_rate
  OBJECT). No value relations, no cardinality (row counts runtime-dependent),
  no invented relations.
- D3 (2026-08-16): Path machinery extension (narrow, additive): SafePath may
  be empty (root) and may carry bounded numeric array-index segments; item
  checks on an EMPTY array resolve NOT_APPLICABLE (ambiguity never an
  anomaly, consistent with SPEC §31 / CARDINALITY_MATCH absent-collection
  rule); indices beyond the inspected window are NOT_APPLICABLE.
- D4 (2026-08-16): Evidence digest ev:sha256:<24> over the canonical
  extraction (normalized source structure used to derive), never the whole
  repo; runtime currentness = current HEAD sha == bound sha AND re-extraction
  digest == bound digest (dirty-worktree / structure change -> STALE); no
  silent re-binding — fresh derivation only through the explicit offline
  derivation run.
- D5 (2026-08-16): Receipt schema nightwatch.semantic-evaluation-receipt.v1
  with the nine outcomes; NO_EXPECTATION/STALE/UNAVAILABLE/NOT_APPLICABLE/
  INTERNAL_ERROR are never PASS; hook returns {receipt, findings}; observer
  gets a bounded semanticEvaluations() ledger with explicit overflow; hook
  exceptions -> safe INTERNAL_ERROR receipt; privacy-contract violations
  escalate via monitor.recordHardFailure (existing safety architecture).
- D6 (2026-08-16): fs-based read-only sibling source reader/currentness
  lives OUTSIDE the purity-guarded oracle dirs (src/core/source/), injected
  via interfaces into the expectations core; separate narrow hardening guard
  for the reader (read-only fs only, path-confined, no child processes, no
  network).
- D7 (2026-08-16, close): PHASE_9B_DEV_READINESS =
  READY_FOR_SEPARATE_AUTHORIZATION — all 14 gates of the readiness contract
  verified (>=1 real-source expectation mechanically derived/admitted: 4;
  no Alphaus annotation/write required; stronger than protocol parse/status;
  maps to existing approved read-only DEV observations: 3 via reviewed
  journey ruleIds; exact source snapshot bound; stale fail-closed;
  conforming synthetic body -> PASS x4; mutated synthetic body -> ANOMALY
  x4; NO_EXPECTATION distinguishable from PASS; internal hook failure
  distinguishable from PASS; no silent semantic errors; receipts
  privacy-safe; sentinel leaks 0; full regression + exact CI green).
  PHASE_9B_STATUS = DESIGNED_NOT_STARTED_NOT_AUTHORIZED; Phase 9B future-task
  spec produced (design only).

## Discoveries

- Response chain: createRoutingClosureClient (src/App/Route/Config.php) ends
  with $response->withJson($result) — the handler return array IS the JSON
  body (no outer envelope) for ripple-api.
- ExchangeRate.php carries mechanically extractable contracts:
  getCommonExchangeRate returns a list of {month, exchange_rate} where
  exchange_rate is object-or-empty-array; validation permission lists
  ['aws','azure','gcp']; CURRENCY_RANGE_VALIDATE const {usd,jpy,sgd,myr,idr,inr}.
  getAccountExchangeForMonth returns a list of {id, vendor, name,
  exchange_rate}. BillingGroup handlers similar.
- ripple-ui callsites consume bare arrays (no envelope) and cross-validate
  the field sets; the Phase 5 journey registry (buildRippleJourneyEndpointRegistry)
  provides reviewed ruleIds ripple.payer-exchange.read /
  ripple.common-exchange.read / ripple.account-inventory.read for the three
  DEV-reachable read operations.
- No journey wires semanticOracle today; the observer hook option exists but
  nothing constructs an oracle — Phase 9A.1 must supply the admission bridge
  and oracle factory.

## Blockers

NONE.

## Safety Events

None so far. Safety vector baseline: catalog writes 0, promotion intents 0,
approvals 0, APPLY 0, B adoption 0, DEV/NEXT/production contacts 0, product
mutations 0, DB/infra queries 0, AI/model calls 0, Alphaus writes 0,
publication 0, runtime Git writes 0.

## Deferred / Follow-Up

- Phase 9B contained DEV acceptance — DESIGNED_NOT_STARTED_NOT_AUTHORIZED;
  future-task spec produced by this task (design only), authorization class
  PHASE_9B_CONTAINED_DEV_SEMANTIC_ACCEPTANCE_ONLY.
- ripple.billing-groups-legacy.read / ripple.billing-group-exchange.read:
  billing-groups-legacy rejected (AMBIGUOUS); billing-group-exchange
  admitted but NOT DEV-REACHABLE (no reviewed journey rule today).
- ripple.billing-groups.read (blueapi proto + ouchan gRPC): statically
  feasible via proto but not observable by the current JSON observer —
  deferred.

## Resume Recipe

Task complete. Do not resume.

## Completion Snapshot

- Status: COMPLETE; PHASE_9A_1_STATUS: COMPLETE (ACTIVE_TASK, STATE, and
  REPORT agree); readiness verdict READY_FOR_SEPARATE_AUTHORIZATION;
  Phase 9B DESIGNED_NOT_AUTHORIZED.
- Current milestone: COMPLETE / STOP; Work In Progress: NONE; Exact Next
  Action: STOP — Phase 9B requires separate owner authorization.
- Substantive implementation: cfc2aaa65227b2caf26d2d51533bf32ecc489028
  (LAST_VALIDATED_IMPLEMENTATION_SHA = LAST_SUBSTANTIVE_CHECKPOINT_SHA);
  exact implementation CI 31932079316 success at the exact head SHA, 29/29
  steps green incl. the "Phase 9A.1 real-source expectation admission
  matrix" step; live canary 4 derived / 4 current / 0 stale / 3
  DEV-reachable; conforming synthetic bodies PASS x4; mutated synthetic
  bodies ANOMALY x4; full regression 994 passed / 1 skipped / 0 failed;
  isolated full-history checkout 983 / 4 environment-conditional skips / 0.
- Project truth: PHASE_8_STATUS COMPLETE; catalog count 1; raw digest
  sha256:bd35b934b852f192c2ba0f10c242dde3ebab492c66cd6760427f128a7dfba968
  (byte-identical through the task); NEXT_PORTFOLIO_MEMBER
  AVAILABLE_NOT_ADOPTED (variant B); NEXT_PROMOTION_AUTHORITY NONE;
  project-state protocol nightwatch.project-state.v1.
- Phase 9A.1: PHASE_9A_1_STATUS COMPLETE; authorization class
  PHASE_9_REAL_SOURCE_EXPECTATION_ADMISSION_ONLY (executed once, local/
  source-only/synthetic); REAL_SOURCE_EXPECTATION_COUNT 4; D-55;
  implementation record in docs/design/PHASE_9_ROADMAP.md §18;
  ROADMAP/CURRENT_STATE/ARCHITECTURE/SAFETY_MODEL Phase 9A.1 sections;
  AGENTS.md permanent rule; Phase 9B future-task spec
  docs/design/PHASE_9B_TASK_SPEC.md (design only, NOT_AUTHORIZED).
- Safety vector: catalog writes 0, promotion intents 0, approvals 0,
  APPLY 0, B adoption 0, DEV/NEXT/production 0, product mutations 0,
  DB/infra 0, AI/model 0, Alphaus writes 0, publication 0, runtime Git
  writes 0; Nightwatch Git commits expected only (cfc2aaa substantive +
  final docs closure).
- Continuity: agent:check and agent:audit zero strict errors at the
  implementation SHA; final docs closure commit pushed; exact final CI
  green (FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_LIVE_HEAD).
