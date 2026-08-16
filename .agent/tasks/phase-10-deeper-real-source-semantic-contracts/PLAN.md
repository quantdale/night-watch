# PLAN — Nightwatch Phase 10A — Deeper Real-Source Semantic Contracts

Task ID: phase-10-deeper-real-source-semantic-contracts
Phase: 10A-DEEPER-REAL-SOURCE-SEMANTICS
Authorization class: PHASE_10_DEEPER_SEMANTIC_IMPLEMENTATION_ONLY
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Purpose

Implement the local/synthetic Phase 10A: enrich the real-source expectation
admission bridge with mechanically proven item-level JSON type contracts on
the two current-source-proven targets (common-exchange, payer-exchange) via
a fixed bounded PHP type-flow extractor and a new fixed invariant
(TYPE_IN_SET), prove baseline-vs-deep detection on a bounded synthetic
corpus, integrate through the existing semantic/campaign/dossier path, add
hardening + CI, close under continuity v2. NO DEV, NO new authority.

## Starting State

- HEAD == origin/main == c3393ce54ef53d10451da2465d0327a0796bcf4f (CASE D),
  worktree clean, branch main, remote https://github.com/quantdale/night-watch.git.
- Current remote master mobingilabs/ripple-api ==
  169df39d3cdf56c88f98d45d06eae6e48c3d8f6d (read-only git ls-remote);
  canonical sibling checkout at the Phase 5 pin 27bb007a (UNTOUCHED);
  disposable current-source snapshot at
  /tmp/nw-phase10-siblings/mobingilabs/ripple-api.
- Phase 9 / 9A.1 / 9B / 8 terminal states unchanged; recipe registry 4 v1
  recipes (shape-only); invariant vocabulary 10 kinds (no TYPE_IN_SET);
  D-58 design record: Phase 10 = DEEPER_REAL_SOURCE_SEMANTICS,
  DESIGNED_NOT_STARTED_NOT_AUTHORIZED (now authorized by the owner prompt).

## Scope

- `src/oracles/expectations/**` (v2 recipes, type-flow extractor, admission,
  resolver fail-closed dispatch, validator), `src/oracles/invariants/**`
  (TYPE_IN_SET), `src/oracles/semantic/oracle.ts` (class mapping),
  `corpus/phase10/**`, `tests/unit/phase10*.test.ts`,
  `bin/hardening-check.mjs`, `.github/workflows/hardening.yml`, docs, .agent.

## Non-Goals

- NO DEV/NEXT/production; no new endpoints/journeys; no recipe re-targeting;
  no finite-key contract (SOURCE_ENUM_FLOW_UNPROVEN); no
  PHP_CLASS_CONST_ARRAY_KEYS extractor (not load-bearing); no
  OBJECT_KEYS_SUBSET_OF invariant; no projection schema change; no
  campaign/triage core change; no real-minimization fix; no Phase 10B claim;
  no expectation-count inflation; no Phase 6/AI/selfDev/promotion/catalog.

## Milestones

- M0 — Bootstrap + task records (DONE): git state CASE D; durable reads;
  current-source freshness (169df39d; disposable /tmp snapshot); source
  claims re-verified (cast-on-empty ⇒ common OBJECT; payer OBJECT|ARRAY;
  finite keys UNPROVEN); SPEC/PLAN/STATE/REPORT created; ACTIVE_TASK.
- M1 — Parallel read-only reviews (DONE): PHP extractor review (PROVEN +
  2 corrections), versioning review (4-switch TYPE_IN_SET, digest/resolver
  fail-closed, v2 constant), privacy-FP review (blocker B1 class mapping,
  residual documented). All applied.
- M2 — Recipe v2 + extractor vocabulary (DONE): v2 schema/union, type-flow
  extractor + decision table, canonical digest branch + fail-closed throw,
  dual-schema validator, registry 2 v2 + 2 v1.
- M3 — Invariants (DONE): TYPE_IN_SET vocabulary/validator/evaluation/oracle
  class mapping.
- M4 — Admission + resolver (DONE): v2 derivation path, derivation v2,
  fail-closed extraction dispatch in both loops.
- M5 — Corpus (DONE): source-fixture mirror + v2/v1 fixture recipes,
  archived v1 recipes, 4 defects, 10 benign, README.
- M6 — Test matrices (DONE): 10 phase10 files, 112 tests; focused Phase
  9+9A.1+9B+10 matrix 342 passed; owner-local canary at 169df39d green
  (4/4 derived, depths [2,2,3,3]).
- M7 — Hardening + CI (DONE): checkPhase10DeeperContractPurity +
  checkPhase10IntegrationSeams; hardening:check PASS; hardening.yml Phase 10
  matrix step.
- M8 — Full local validation: typecheck, hardening, campaign:synthetic,
  owner-provenance, agent:check/audit (strict 0), project:check (clean-tree
  PASS), catalog integrity, git diff --check, full Playwright 0 failed.
- M9 — Substantive checkpoint: one implementation commit; push fast-forward;
  HEAD == origin/main; exact CI green (all steps incl. Phase 10 matrix).
- M10 — Fresh clean-checkout acceptance at the implementation SHA (current
  ripple-api SHA re-checked; recipe/derivation counts; depth distribution;
  seeded defects; baseline vs deep; benign FP 0; privacy 0; determinism;
  campaign findings; dossiers).
- M11 — Docs closure: D-59; ROADMAP/CURRENT_STATE/ARCHITECTURE/SAFETY_MODEL/
  POST_PHASE_9_NEXT_ARCHITECTURE.md; PHASE_10_DEEPER_SEMANTIC_CONTRACTS.md;
  AGENTS.md Phase 10 rule; STATE/ACTIVE_TASK/REPORT terminalized.
- M12 — Final docs checkpoint: push fast-forward; exact final CI green;
  STOP.

## Safety Constraints

- Read-only sibling access only; canonical Alphaus checkouts never mutated;
  disposable /tmp snapshots only.
- No code execution of PHP/application code; no eval/child_process/network/
  persistence in the oracle cores (hardening-guarded).
- Privacy: no raw values in contracts/findings/receipts/dossiers; sentinel
  sweep zero leaks; unknown key text never echoed downstream.
- Boundaries: Phase 8 catalog digest bd35b934... count 1; B
  AVAILABLE_NOT_ADOPTED; promotion authority NONE; Phase 9/9A.1/9B statuses
  unchanged; no campaign/triage/changeIntelligence/selfDev/ownerScope/
  journey changes.

## Architecture / Approach

- Recipe v2 = v1 semantics + `itemFieldTypeContracts` (field, itemIndex,
  allowedTypes) proven by the `PHP_ITEM_FIELD_TYPE_FLOW` extractor
  (EMPTY_CAST_OBJECT → ['OBJECT']; EMPTY_ARRAY_OR_STRING_KEYS →
  ['ARRAY','OBJECT']; anything else TYPE_FLOW_AMBIGUOUS).
- Normalized extraction participates in the ev:sha256 evidence digest
  (canonical branch; unknown kinds fail closed).
- Admission maps a single allowed type to TYPE_MATCH (existing vocabulary)
  and a multi-type set to the new TYPE_IN_SET invariant.
- TYPE_IN_SET: missing path / empty-uninspected-parent → NOT_APPLICABLE;
  observed ∈ set → PASS; outside → VIOLATED; validator 1..6 types, dedupe,
  canonical sort.
- New deep expectation IDs `...real-source-deep`; `...real-source-shape`
  stays historical (archived v1 recipes under corpus/phase10/historical/).
- Corpus: current-source mirror fixture + 4 seeded type defects + 10 benign;
  baseline = archived v1 shape expectations (0/4), enriched = 4/4, FP 0.
- Campaign integration reuses the existing orchestrator/triage/dossier
  chain (two-run pattern, one defect per target per run — the checkpoint
  rejects duplicate finding fingerprints).

## Validation Strategy

- `npm run typecheck`, `npm run hardening:check`, focused phase10 matrices,
  Phase 9/9A.1/9B regression matrices, `npm run campaign:synthetic`,
  `npm run test:owner-provenance`, `npm run agent:check`, `npm run
  agent:audit`, `npm run project:check`, `node bin/selfdev-catalog-integrity.mjs`,
  `git diff --check`, full `npx playwright test --project=nightwatch
  --workers=1` (0 failed), isolated full-history checkout, exact CI.

## Decisions Made

- D0 CASE D; D1 current-source authority (disposable 169df39d snapshot);
  D2 common exchange_rate OBJECT (cast-on-empty refutes D-58);
  D3 payer {OBJECT, ARRAY} ⇒ TYPE_IN_SET; D4 finite keys UNPROVEN (no
  const extractor, no key-set invariant); D5 recipe v2 for 2 targets, v1
  stable for the rest, archived v1 for baseline; D6 deep IDs + derivation
  v2 + semantic-expectation v1 envelope unchanged; D7 4 type-class seeded
  defects only.

## Decision Log

- M1 review corrections applied (4-switch TYPE_IN_SET; canonicalExtraction
  branch + throw; runExtractions/reExtractEvidence fail-closed; v1
  derivation constant kept + v2 added; observedClassFor TYPE_IN_SET →
  TYPE_CONTRADICTED; pattern→types table canonical-sorted).

## Discoveries

- ExchangeRate.php byte-identical across 27bb007a and 169df39d; the D-58
  "ARRAY when empty" premise is factually wrong (cast is on empty).
- CURRENCY_RANGE_VALIDATE is write-path validation only; read-path output
  keys are runtime/data-driven ⇒ finite-key contracts not mechanically
  provable.
- Same-invariant-class defects on one target share finding fingerprints ⇒
  campaign split into two runs.

## Deferred Work

- Finite-key / object-key-set contracts (SOURCE_ENUM_FLOW_UNPROVEN).
- Real-minimization false-1-MINIMAL finding (#1) — HIGH_CONFIDENCE_SEMANTIC
  TRIAGE NEXT_AFTER.
- Phase 10B contained DEV acceptance — separate owner authorization;
  disposition decided at closure; tests/manual/phase9b-contained-dev-semantic.ts
  will need repointing to the deep ID in that future task.

## Completion Criteria

- 2/4 targets L3+ (common TYPE_MATCH OBJECT, payer TYPE_IN_SET
  {OBJECT,ARRAY}); seeded deep defects 4/4 detected vs baseline 0/4; benign
  FP 0; privacy leaks 0; determinism 3/0; currentness A–E + §44 canaries
  fail-closed; identity historical-only; campaign/dossier integration with
  baseline zero semantic evidence; full regression + exact CI; docs closure
  D-59; PHASE_10_DEEPER_SEMANTIC COMPLETE; PHASE_10A_STATUS COMPLETE; STOP.
