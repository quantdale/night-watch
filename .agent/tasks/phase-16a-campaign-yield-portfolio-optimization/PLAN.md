# PLAN — Phase 16A Campaign Yield & Portfolio Optimization

Task ID: phase-16a-campaign-yield-portfolio-optimization
Execution token: `PHASE_16A_CAMPAIGN_YIELD_PORTFOLIO_LOCAL_ONLY`
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Purpose

Build a deterministic, local-only campaign portfolio/yield planner on top of
the Phase-15H-hardened Nightwatch core: decide which already-approved
read-only targets/journeys deserve campaign budget, why, and in what order,
without inventing authority, executing a real campaign, or using AI judgment.
SPEC.md is frozen intent; this PLAN is living execution guidance.

## Starting State

Clean local main fast-forwarded to origin/main `7ef8968f905cb16f1c3c7631be396eb9945a351c`
(the Phase 16A publication package) at task activation. Predecessor earned
hardening anchor `06ea7ca62b1d5c8770d42622d4655e942ec68336` carried forward as
the historical implementation baseline. No portfolio code existed before this
task (`src/core/portfolio/**`, `corpus/phase16a/**`, `bin/portfolio.mjs`,
`tests/unit/phase16a*.test.ts` are all new).

## Scope

- W1 portfolio model (versioned member DTO, strict parser, builder over
  approved targets only, duplicate pressure, sanitized evidence).
- W2 deterministic bounded explainable priority score with component
  contributions and digest (no model/AI score).
- W3 bounded budget allocator (total budget, ceiling/floor, starvation
  prevention, duplicate suppression, retry ceiling, reserved exploration;
  fail-closed on stale/unavailable evidence).
- W4 sanitized local-only novelty/yield accounting over synthetic/historical
  evidence (raw customer/product values never enter the record).
- W5 versioned deterministic campaign-plan manifest, executable only by a
  separately authorized runtime.
- W6 change-aware replan over existing source-movement/currentness APIs.
- W7 pure local synthetic shadow simulator/backtest with explicit
  synthetic-only interpretation.
- W8 local read-only operator CLI/report surfaces plus an owner-gated DEV
  handoff manifest that is produced but never executed here.
- Focused permanent tests per workstream plus one moderate integration pack.

## Non-Goals

- No real product campaign execution; no DEV/NEXT/production contact.
- No database/data-plane/cloud/infrastructure operations of any class.
- No Alphaus sibling writes; Alphaus repositories stay untouched.
- No AI/model oracle authority; no selfDev; no canonical promotion/catalog
  mutation; Phase 6 stays FROZEN_BY_OWNER; Phase 11B/13B stay NOT_AUTHORIZED.
- No complete canonical/isolated Playwright regression (deferred to the next
  dedicated hardening campaign).
- No new target universe: members come only from existing approved registries.

## Safety Constraints

- Authorization exactly `PHASE_16A_CAMPAIGN_YIELD_PORTFOLIO_LOCAL_ONLY`.
- Existing approved target universe only; unknown operation classes fail
  closed through decideOwnerScope/OWNER_POLICY_BLOCKED semantics.
- Source stale/unavailable cannot improve rank or certify readiness.
- Duplicate pressure cannot increase novelty score.
- Safety/owner-policy blocker always dominates ranking.
- Identical normalized inputs produce byte-identical score/plan output.
- SHA-only movement with unchanged normalized evidence never creates false
  semantic novelty; changed contract/derivation/authority invalidates or
  replans.
- Raw customer values never enter DTOs, manifests, digests, reports, errors,
  or `.agent` files; synthetic fixtures carry synthetic values only.

## Architecture / Approach

Single canonical integrator implements the coupled core type graph
sequentially under `src/core/portfolio/`: `types.ts` (W1 model), `scoring.ts`
(W2), `allocation.ts` (W3), `yield.ts` (W4), `manifest.ts` (W5), `replan.ts`
(W6), `simulator.ts` (W7), `report.ts` + `bin/portfolio.mjs` (W8), with
`index.ts` as the public seam. Deterministic fixtures live in
`corpus/phase16a/portfolioFixtures.ts`. Identity/digest reuse the existing
campaign/identity stable JSON helpers (single canonical serialization
authority); currentness vocabulary reuses LocalReadinessCurrentness; coverage
depth reuses DepthClass; owner blockers route through decideOwnerScope.
Independent review lanes may read but never concurrently mutate this
checkout. Each milestone lands focused permanent tests before advancing.

## Milestones

- M0 Bootstrap/continuity — COMPLETE (activation record in STATE.md).
- M1 W1 portfolio model + phase16aPortfolioModel tests — COMPLETE.
- M2 W2 scoring + phase16aScoring tests — COMPLETE.
- M3 W3 allocation + phase16aAllocation tests — COMPLETE.
- M4 W4 yield accounting + phase16aYieldManifest tests (with W5) — COMPLETE.
- M5 W5 manifest + replan surface — COMPLETE.
- M6 W6/W7 replan + shadow simulator + phase16aReplanSimulator tests — COMPLETE.
- M7 W8 tooling/DEV handoff + phase16aToolingHandoff tests — COMPLETE.
- M8 moderate integration pack + closure (typecheck, hardening:check, all
  phase16a suites, affected Phase 12–15 compatibility, campaign:synthetic,
  owner-provenance, determinism repeats x3, agent:check, project:check,
  diff-check, truthful terminal record) — COMPLETE at implementation
  checkpoint `1737e30afb64a1aed722f61182d87a4f2f6e3bb4`.

## Validation Strategy

Per workstream milestone: `npm run typecheck`, `git diff --check`, smallest
decisive focused suite before advancing. At M8 one moderate pack:
`npm run typecheck`, `npm run hardening:check`, all six `phase16a*` suites,
directly affected Phase 12–15 compatibility suites, `npm run campaign:synthetic`,
`npm run test:owner-provenance`, >=3 byte-deterministic `node bin/portfolio.mjs
plan` repeats (plus shadow-simulate and dev-handoff digests),
`git diff --check`, `npm run agent:check`, and post-commit-clean
`npm run project:check`. Full canonical/isolated regression stays deferred to
the next hardening campaign unless a focused defect cannot otherwise be
diagnosed.

## Decision Log

- D-16A-1: single canonical integrator implements the coupled core type graph
  (W1->W7) sequentially; parallel sub-agent lanes do post-implementation
  review only, never concurrent mutation of the same checkout.
- D-16A-2: portfolio identity reuses campaign/identity stable JSON + digest
  helpers; no parallel digest system.
- D-16A-3: currentness vocabulary reuses LocalReadinessCurrentness; coverage
  depth reuses DepthClass; owner blockers route through
  decideOwnerScope/OWNER_POLICY_BLOCKED — no competing currentness/
  lifecycle/owner-policy systems.
- D-16A-4: `bin/portfolio.mjs` compiles `src/core/portfolio/index.ts` in the
  same style as the existing `change-intelligence.mjs` CLI and reads/writes
  sanitized JSON on stdout only; no new persistence surface.

## Discoveries

- The planner composes entirely from pre-existing hardened APIs; no registry
  or lifecycle system needed duplication.
- Determinism holds end-to-end: repeated `plan`, `shadow-simulate`, and
  `dev-handoff` invocations produce identical digests for identical inputs.
- The DEV handoff manifest is data-only and explicitly inert without a
  separate runtime authorization.

## Deferred Work

- Exhaustive whole-system regression (canonical + isolated complete
  Playwright, repository-wide fuzz, full historical matrix): deferred to the
  next dedicated owner-authorized hardening campaign.
- Contained DEV acceptance of the portfolio layer: requires separate owner
  authorization; never implied by local green runs.

## Completion Criteria

All eight workstreams implemented with focused permanent green suites; one
moderate integration pack fully green locally; determinism repeats identical;
continuity/project validators PASS; truthful terminal record published with
`PHASE_16A_STATUS: COMPLETE (IMPLEMENTED_FOCUSED_GREEN_AWAITING_HARDENING)`
or an honest BLOCKED_LOCAL_GAP disposition; durable checkpoint committed per
AGENTS.md discipline.
