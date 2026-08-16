# Nightwatch Phase 9A.1 — Real-Source Expectation Admission & Semantic Evaluation Observability

## Task purpose

Implement the owner-authorized Phase 9A.1 readiness stage:
`PHASE_9_REAL_SOURCE_EXPECTATION_ADMISSION_ONLY` (Phase `9A.1-REAL-SOURCE-EXPECTATION`).

Close the three confirmed Phase 9B readiness gaps before any contained DEV run:

1. **Gap A — real expectation count zero**: the current source adapter
   (`src/oracles/expectations/sourceAdapter.ts`) recognizes only
   `@nightwatch-contract` annotation blocks; real Alphaus source carries none,
   so real source yields zero derived expectations
   (`REAL_SOURCE_EXPECTATION_CANARY: NOT_ADMITTED`). Nightwatch needs a
   Nightwatch-owned deterministic admission bridge: real source + fixed
   derivation recipe + mechanical extraction -> admitted expectation, WITHOUT
   requiring any Alphaus annotation or write.
2. **Gap B — NO_EXPECTATION indistinguishable from PASS**: `evaluateSemanticHook`
   returns `{ findings: [] }` both when no expectation resolves and when an
   expectation genuinely passes; no safe evaluation receipt exists. A real run
   with zero findings cannot distinguish PASS from "no expectation resolved".
3. **Gap C — silent semantic hook failure**: the network observer wraps the
   semantic hook in `try { } catch { }` and records no safe semantic-evaluation
   failure evidence; a throwing hook disappears silently.

Deliverables: strict-v2 task records; candidate audit of current real Alphaus
source (3 paths); versioned data-only real-source expectation recipe format;
smallest fixed extractor vocabulary (syntax-aware, no application-code
execution, no regex-as-authority); source-evidence binding (repoId + full
40-hex SHA + relative path + symbol + derivation version + deterministic
source-evidence digest over the normalized source structure); fail-closed
source currentness (stale/unavailable invalidate expectations, never silent
re-binding); atomic expectation+snapshot resolution; safe versioned semantic
evaluation receipts (`nightwatch.semantic-evaluation-receipt.v1`) with the
required outcome vocabulary (PASS/ANOMALY/NOT_APPLICABLE/NO_EXPECTATION/
EXPECTATION_SOURCE_STALE/EXPECTATION_SOURCE_UNAVAILABLE/INVALID_INPUT/
PROJECTION_LIMIT_EXCEEDED/INTERNAL_ERROR); NO_EXPECTATION != PASS invariants;
semantic hook returning receipt + findings; no-silent-failure observer
behavior (safe INTERNAL_ERROR receipt, privacy-contract violations escalate
through the existing safety architecture); bounded sanitized observer
semantic-evaluation ledger with explicit overflow; safe recorder evidence
shape; Phase 5 composed stage update (additive); synthetic-rebinding
regression test (REJECTED); real-source offline canary (>= 1 derived
expectation); conforming + mutated synthetic response evaluations per admitted
expectation; recipe validation matrix; evaluation-receipt test matrix; source
freshness matrix; per-expectation snapshot binding + multi-repo swap test;
sentinel leakage matrix (0 leaks); hardening guards + CI matrix step;
full local validation + isolated full-history checkout; exact implementation
checkpoint push + exact CI; Phase 9B readiness verdict; docs/decision closure
(D-55 expected); terminal STOP.

This task is LOCAL / SOURCE-ONLY / SYNTHETIC. It performs NO DEV/NEXT/
production contact, NO authenticated product journeys, NO Phase 5 real API
traffic, NO product mutation, NO Alphaus repository modification, NO
DynamoDB/BigQuery/Spanner queries, NO GCP/GKE/Kubernetes/AWS infrastructure
access, NO Phase 6 revival, NO external/local AI models, NO AI oracle
authority, NO selfDev/catalog/promotion activity, NO variant-B adoption, NO
publication.

## Authorization

- Authorization class: `PHASE_9_REAL_SOURCE_EXPECTATION_ADMISSION_ONLY`
- Phase: `9A.1-REAL-SOURCE-EXPECTATION`
- Protocol: `CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2`
- This authorization covers ONLY the local/source-only/synthetic readiness
  stage. Phase 9B contained DEV acceptance remains
  `DESIGNED_NOT_STARTED_NOT_AUTHORIZED`; this task produces (but does NOT
  execute) the Phase 9B next-task spec and decides the
  `PHASE_9B_DEV_READINESS` verdict.

## Established starting state

- Task ID: `phase-9a-1-real-source-expectation-admission`
- Starting SHA (expected at authorization time):
  `91a64e597bc0b28653fe53bf46e291126963baa5`
  (HEAD == origin/main == expected SHA; worktree clean — CASE D).
- Active task at start: `phase-9-deterministic-semantic-oracle-depth`
  COMPLETE. Phase 8 COMPLETE; Phase 9 `COMPLETE_LOCAL_SYNTHETIC`;
  `PHASE_9_ORACLE_DEPTH_STATUS: COMPLETE`; validated Phase 9 implementation
  `e74185bf7b83783c2b7421e675ea2d3bb9053482`; catalog digest
  `sha256:bd35b934b852f192c2ba0f10c242dde3ebab492c66cd6760427f128a7dfba968`
  count 1; variant B `AVAILABLE_NOT_ADOPTED`; `NEXT_PROMOTION_AUTHORITY: NONE`.
- Pre-fix gap reproduction (2026-08-16): Gap A `NOT_ADMITTED` (blockCount 0,
  expectations 0, live checkout `mobingilabs/ripple-api@27bb007a...`);
  Gap B identical `{findings: []}` for NO_EXPECTATION vs PASS with no receipt
  API; Gap C throwing hook leaves zero semantic evidence (observer continues).

## Scope

- New source: `src/oracles/expectations/recipes/**` (versioned recipe DTO +
  validator + registry), `src/oracles/expectations/extract/**` (fixed
  syntax-aware extractors: PHP lexical + TypeScript AST + evidence digest),
  `src/oracles/expectations/admission.ts` (admission bridge: recipe ->
  source snapshot -> evidence -> admitted expectation), atomic resolver
  (`resolve()` -> expectation + sourceSnapshot), safe evaluation receipts
  (`src/oracles/semantic/receipts.ts` + types).
- Changed source: `src/oracles/semantic/hook.ts` (receipt + findings return;
  atomic resolver; no-silent-failure), `src/browser/observers/networkObserver.ts`
  (semantic evaluation ledger, INTERNAL_ERROR receipts, bounded overflow),
  `src/api/phase5/semantic.ts` (composed stage exposes receipt detail,
  additive), provenance/currentness extensions.
- Fixtures + tests: `corpus/phase9a1/**` (recipe fixtures, multi-repo
  fixtures, PHP source fixtures), new unit matrices (recipe validation,
  extraction, evidence binding, freshness A-F, receipts 1-9, sentinel,
  observer regression, synthetic-rebinding rejection, multi-repo snapshot,
  real-source canary v2, conforming/mutated synthetic evaluations).
- Hardening + CI: `bin/hardening-check.mjs` real-source core purity +
  receipt-core guards; `.github/workflows/hardening.yml` Phase 9A.1 matrix
  step (fixture-backed; fail-closed when real sibling source unavailable).
- Docs: DECISIONS D-55; ROADMAP/CURRENT_STATE/ARCHITECTURE/SAFETY_MODEL/
  PHASE_9_ROADMAP updates; Phase 9B future-task spec
  (`phase-9b-contained-dev-semantic-acceptance`, authorization class
  `PHASE_9B_CONTAINED_DEV_SEMANTIC_ACCEPTANCE_ONLY` — DESIGN ONLY); .agent/**
  closure.

## Non-Goals

- No DEV/NEXT/production contact; no authenticated journeys; no real API
  traffic; no product mutations; no Alphaus repo writes/annotations; no
  DB/infra queries; no Phase 6 revival; no AI/model calls; no selfDev/
  catalog/promotion activity; no variant-B adoption; no publication; no
  generic expression/script capability in recipes; no unbounded regex as
  semantic authority; no arbitrary application-code execution; no silent
  expectation re-binding; no Phase 9B execution.

## Safety Constraints

- Fail-closed, read-only, local/source-only/synthetic only.
- Raw customer values never cross the projection boundary; receipts carry
  safe metadata only (no raw body, no raw values, no raw IDs, no amounts,
  no arbitrary message, no DOM text, no URL query string, no absolute path).
- Privacy invariant failure must never look benign (never findings: [],
  PASS, or NOT_APPLICABLE); explicit safe failure classification; escalation
  through the existing safety architecture for true privacy-contract
  violations.
- Source repositories are inspected read-only; pre-existing sibling dirt is
  recorded and never touched; no checkout/reset/clean/commit/merge/rebase/
  write in sibling repos; before/after `git status --short` recorded.
- Recipe/extractor/admission core: no eval, no dynamic import of sibling
  code, no child processes, no network, no DB/infra, no AI import, no
  selfDev/promotion import, no persistence of raw source/customer values.
- Receipt core does not import persistence APIs.

## Success criteria

`PHASE_9A_1_STATUS: COMPLETE` (or truthful BLOCKED with exact reason) with:
>= 1 real-source expectation mechanically derived/admitted from current real
Alphaus source; no Alphaus annotation/write required; expectation stronger
than protocol parse/status; maps to an existing approved read-only DEV
observation; exact source snapshot bound; stale fail-closed; conforming
synthetic body -> safe PASS/N-A receipt; mutated synthetic body -> ANOMALY
receipt for at least one admitted expectation; NO_EXPECTATION distinguishable
from PASS; internal hook failure distinguishable from PASS; no silent
semantic errors; receipts privacy-safe; sentinel leaks 0; full regression and
exact CI green. Phase 9B readiness verdict:
`READY_FOR_SEPARATE_AUTHORIZATION` (all gates) or `NOT_READY` (exact blocker);
`PHASE_9B_STATUS: DESIGNED_NOT_STARTED_NOT_AUTHORIZED`; next action STOP.

## Stop conditions

Any need to touch catalog/portfolio/promotion machinery, owner-policy,
Phase 6 surfaces, product code, or to execute DEV/production traffic ->
STOP and record. Source drift -> re-verify freshness. Gate failure -> repair
before closing. Zero admissible real-source candidates ->
`PHASE_9A_1_BLOCKED_NO_ADMISSIBLE_REAL_SOURCE_EXPECTATION`,
`PHASE_9B_DEV_READINESS: NOT_READY`, STOP (never fabricate a candidate).
