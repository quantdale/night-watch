# Task Plan

Task ID: phase-9a-1-real-source-expectation-admission
Phase: 9A.1-REAL-SOURCE-EXPECTATION
Status: IN_PROGRESS
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Purpose

Close the Phase 9B readiness gaps locally: (A) real Alphaus source currently
yields zero derived expectations (annotation-only adapter); (B) NO_EXPECTATION
is indistinguishable from PASS (no evaluation receipts); (C) semantic hook
exceptions in the network observer are silent. Deliver a Nightwatch-owned
real-source expectation admission bridge (versioned data-only recipes + fixed
syntax-aware extractors + source-evidence binding + fail-closed currentness),
atomic expectation+snapshot resolution, safe semantic evaluation receipts with
the full outcome vocabulary, observer evaluation ledger + no-silent-failure,
hardening + CI, deep validation, exact checkpoints + exact CI, Phase 9B
readiness verdict, docs/decision closure (D-55), STOP. NO DEV / NO Phase 6 /
NO AI authority / NO selfDev/promotion activity.

## Starting State

- Starting SHA: 91a64e597bc0b28653fe53bf46e291126963baa5
  (HEAD == origin/main == expected authorization SHA; worktree clean — CASE D).
- Active task at start: phase-9-deterministic-semantic-oracle-depth COMPLETE.
  Phase 9 COMPLETE_LOCAL_SYNTHETIC; validated Phase 9 implementation
  e74185bf7b83783c2b7421e675ea2d3bb9053482; catalog digest bd35b934... count
  1; B AVAILABLE_NOT_ADOPTED; NEXT_PROMOTION_AUTHORITY NONE.
- Pre-fix gaps reproduced (2026-08-16):
  Gap A — oracleExpectationRealSource.test.ts: NOT_ADMITTED, blockCount 0,
  expectations 0, live checkout ripple-api@27bb007ad0c798800b6bd3b29760c966422966e7.
  Gap B — phase9a1GapReproduction.test.ts: identical {findings: []} for
  NO_EXPECTATION vs PASS; no receipt/outcome API.
  Gap C — phase9a1GapReproduction.test.ts: throwing semanticOracle -> observer
  continues, semanticFindings() empty, no receipt API, events.jsonl contains
  no semantic failure evidence, exception text never surfaces.
- Sibling repos at exact pinned SHAs (ripple-api 27bb007a, ripple-ui
  d80b161b, ouchan 565f00a8, blueapi 691422e5) with PRE-EXISTING dirt
  (ripple-api: untracked AGENTS.md; ripple-ui: deleted openspec files;
  ouchan: modified .gitignore/.goreleaser.yml/CODEOWNERS/CONTRIBUTING.md/
  build.sh; blueapi: untracked AGENTS.md) — recorded, never touched.

## Scope

- New source: src/oracles/expectations/recipes/** (recipe DTO
  nightwatch.real-source-expectation-recipe.v1 + validator + registry),
  src/oracles/expectations/extract/** (bounded syntax-aware extractors:
  PHP lexical array-shape/enum extractor, TS AST extractor for JS/TS source,
  normalized-structure source-evidence digest), src/oracles/expectations/
  admission.ts (recipe -> source snapshot -> evidence -> admitted
  expectation), atomic resolver (resolve() -> {expectation, sourceSnapshot}
  | null), src/oracles/semantic/receipts.ts
  (nightwatch.semantic-evaluation-receipt.v1 + validator + outcome
  vocabulary + NO_EXPECTATION != PASS invariants).
- Changed source: src/oracles/semantic/hook.ts (receipt+findings return,
  atomic resolver input, INTERNAL_ERROR receipts), src/browser/observers/
  networkObserver.ts (semanticEvaluations() bounded ledger with explicit
  overflow; INTERNAL_ERROR receipts; privacy-violation escalation),
  src/api/phase5/semantic.ts (composed stage semantic channel exposes receipt
  outcomes; additive), expectation provenance/currentness extensions where
  needed.
- Fixtures + tests: corpus/phase9a1/** (PHP source fixtures reproducing the
  real handler shapes, multi-repo A/B fixtures, recipes);
  tests/unit/realSourceRecipe.test.ts, realSourceExtraction.test.ts,
  realSourceAdmission.test.ts, realSourceCurrentness.test.ts,
  semanticReceipt.test.ts, semanticReceiptSentinel.test.ts,
  observerSemanticLedger.test.ts, observerSilentFailureRegression.test.ts,
  syntheticRebindingRejection.test.ts, multiRepoSnapshot.test.ts,
  realSourceCanary.test.ts (v2), realSourceConformingMutation.test.ts,
  phase9a1RecipeValidation.test.ts; phase9a1GapReproduction.test.ts (pre-fix
  proof, updated where the fix changes behavior).
- Hardening + CI: bin/hardening-check.mjs (real-source core purity: no
  eval/child-process/network/DB/AI/selfDev/persistence in recipe+extract+
  admission+receipt cores; receipt core no persistence imports; integration-
  seam guards); .github/workflows/hardening.yml Phase 9A.1 matrix step
  (fixture-backed, fail-closed without sibling source).
- Docs: DECISIONS D-55; ROADMAP/CURRENT_STATE/ARCHITECTURE/SAFETY_MODEL/
  PHASE_9_ROADMAP updates (Phase 9B wording correction: real-source-derived
  AND admitted expectations, never synthetic expectations bound to real SHAs);
  Phase 9B future-task spec (design only);
  .agent/** closure; AGENTS.md Phase 9A.1 permanent rule if warranted.

## Non-Goals

- No DEV/NEXT/production contact; no authenticated journeys; no real API
  traffic; no product mutations; no Alphaus repo writes/annotations; no
  DB/infra; no Phase 6; no AI/model; no selfDev/catalog/promotion; no
  variant-B adoption; no publication; no generic expression/script
  capability in recipes; no unbounded regex as semantic authority; no
  application-code execution; no silent re-binding; no Phase 9B execution.

## Milestones

- M0 — bootstrap + task records: git CASE D; durable reads; pre-fix gap
  reproduction (Gap A canary 2 passed; Gap B/C new tests 2 passed); task
  records + ACTIVE_TASK.
- M1 — candidate audit (paths A/B/C): candidate table with verdicts;
  record exact SHAs/paths/symbols/evidence.
- M2 — recipe + extractor design: recipe schema v1, extractor vocabulary,
  PHP lexical extractor + TS AST extractor, evidence digest model.
- M3 — admission bridge + currentness: derive/admit, freshness A-F,
  per-expectation snapshot binding, multi-repo resolver.
- M4 — receipts: receipt schema v1, outcome vocabulary, hook return
  change, NO_EXPECTATION != PASS, INTERNAL_ERROR, privacy violation
  escalation.
- M5 — observer integration: semanticEvaluations() ledger + cap/overflow,
  no-silent-failure regression, phase5 composed stage receipt exposure.
- M6 — test matrices: recipe validation, extraction, admission, freshness,
  receipts 1-9, sentinel, synthetic-rebinding rejection, multi-repo swap,
  observer regression, conforming/mutated synthetic evaluations.
- M7 — real-source offline canary v2: derive >= 1 real expectation from
  current source; report raw counts.
- M8 — hardening + CI: purity guards + workflow step.
- M9 — local validation: typecheck, hardening, focused matrices, campaign
  synthetic, owner provenance, agent:check/audit, project:check, catalog
  integrity, git diff --check, full Playwright.
- M10 — isolated full-history checkout at the implementation SHA.
- M11 — substantive checkpoint push + exact implementation CI.
- M12 — docs closure: D-55, roadmap corrections, Phase 9B future-task spec,
  CURRENT_STATE/ARCHITECTURE/SAFETY_MODEL/PHASE_9_ROADMAP, AGENTS.md rule;
  final docs push + exact final CI.
- M13 — terminal state + final report + STOP.

## Safety Constraints

- Local/source-only/synthetic only; read-only over Alphaus repos; sibling
  pre-existing dirt recorded, never modified; before/after git status --short
  for every inspected sibling repo.
- Recipes are data-only (fixed vocabulary); extractors are bounded
  syntax-aware; no eval/child-process/network/DB/AI/persistence in the
  cores; no arbitrary regex/script/expression as data.
- Receipts carry safe metadata only; raw values never cross the projection
  boundary; privacy-contract violations escalate, never look benign.
- No @nightwatch-contract requirement on Alphaus source; no annotations
  added.
- No DEV commands (observe:authenticated, journey:real, journey:phase2c,
  api:phase5, campaign:real, auth:capture) against product targets.

## Architecture / Approach

Design (settled 2026-08-16, see STATE D1-D6):

- Recipe layer: nightwatch.real-source-expectation-recipe.v1 (data-only;
  targetId, repoId, sourcePaths, extractors, expectedContract, blueprint)
  with the strict validator + fixed registry (approved read-only targets
  only, one recipe per target).
- Extraction: bounded syntax-aware PHP lexer (PUSH/ASSIGN row literals,
  builder-list returns, Routing.yaml route bindings) — no application-code
  execution, no regex-as-authority; evidence digest ev:sha256 over the
  canonical extraction (normalized structure only).
- Admission: deriveRealSourceExpectations — recipe + read-only snapshot ->
  admitted expectation bound to repo @ SHA + evidence digest; contract drift
  fails closed; synthetic expectations can never be relabeled as real.
- Resolution: createRealSourceResolver — atomic expectation + exact source
  snapshot; fail-closed currentness A-F; per-expectation binding.
- Receipts: nightwatch.semantic-evaluation-receipt.v1 with the nine-outcome
  vocabulary; hook returns receipt + findings; observer semanticEvaluations()
  bounded ledger with explicit overflow; INTERNAL_ERROR receipts; privacy-
  violation escalation via monitor.recordHardFailure.
- Source access: src/core/source/siblingSource.ts (read-only, path-confined)
  injected via interfaces; hardening guards keep the cores pure.

## Validation Strategy

- npm run typecheck; npm run hardening:check; npm run campaign:synthetic;
  npm run test:owner-provenance; npm run agent:check; npm run agent:audit;
  npm run project:check; npm run selfdev:catalog-integrity; git diff --check.
- Focused: all Phase 9 + Phase 9A.1 unit matrices; observer tests.
- Full regression: npx playwright test --project=nightwatch --workers=1 (0
  failures, only pre-existing environment-conditional skips).
- Isolated full-history checkout with read-only sibling mirrors: npm ci
  --ignore-scripts + all gates.
- Exact CI at the implementation SHA and at the final docs closure SHA.

## Decisions Made

- D0 (2026-08-16): CASE D — exact expected source; proceed with Phase 9A.1.
- D1 (2026-08-16): candidate contracts admitted only where the handler
  literal construction + routing chain (createRoutingClosureClient withJson)
  + client callsite agree on a bare top-level array shape; no envelope
  assumption beyond Slim withJson($result).
- (Living; candidate verdicts recorded in STATE under M1.)

## Decision Log

- D0/D1 (2026-08-16): see "Decisions Made" above; full candidate verdicts and
  design decisions D1-D6 are recorded in STATE.md "Decisions Made During This
  Task".

## Discoveries

- Real ripple-api handlers carry mechanically extractable row-literal
  contracts (fixed key sets, `$res[] = [...]` / builder patterns, route
  bindings); values are runtime-dependent (nullable) — contracts assert
  field presence + root class only.
- Slim withJson($result) makes the handler return array the JSON body (no
  outer envelope); errors are non-2xx JSON objects.

## Deferred Work

- billing-groups-legacy (AMBIGUOUS), billing-groups gRPC/proto (deferred),
  Phase 9B execution (separate authorization), P9-C/D/E follow-ups.

## Completion Criteria

- PHASE_9A_1_STATUS COMPLETE (or truthful BLOCKED with exact reason); >= 1
  real-source expectation mechanically derived/admitted; no Alphaus
  annotations required; expectation stronger than JSON parse/status; maps to
  an approved read-only DEV observation; exact source snapshot bound; stale
  fail-closed; conforming synthetic body -> PASS/N-A receipt; mutated body ->
  ANOMALY; NO_EXPECTATION != PASS; no silent hook failures; receipts
  privacy-safe; sentinel leaks 0; full regression + exact CI green; Phase 9B
  readiness verdict; docs/decision closure (D-55); STOP.

## Blockers

NONE (at plan time).

## Exact Next Action

Complete the M1 candidate audit (paths A/C pending), then design the recipe
schema (M2).
