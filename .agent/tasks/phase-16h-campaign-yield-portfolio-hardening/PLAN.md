# PLAN — Phase 16H Campaign Yield & Portfolio Hardening

Task ID: `phase-16h-campaign-yield-portfolio-hardening`
Authorization at publication: NOT_GRANTED
Required execution token: `PHASE_16H_CAMPAIGN_YIELD_PORTFOLIO_HARDENING_LOCAL_ONLY`

## Purpose

Turn Phase 16A's focused-green portfolio implementation into an
evidence-backed local release candidate through exhaustive adversarial
hardening and complete regression proof.

## Starting State

Clean main == origin/main at `1e6a0445b5db6396a64491530f751dafe7646707`
(the Phase 16H publication package); predecessor implementation anchor
`1737e30afb64a1aed722f61182d87a4f2f6e3bb4`; focused Phase 16A evidence only.

## Scope

Milestones M0–M11, workstreams W1–W8, the complete ACCEPTANCE_MATRIX, the
Phase-16H adversarial corpus (>=80 scenarios), quality floors, compatibility,
canonical + isolated complete regressions, continuity/CI truth. Repair-and-
proof only: new production source is allowed solely to fix defects exposed by
this campaign.

## Non-Goals

No DEV/NEXT/production execution; no real campaign; no new endpoint/target
authority; no Phase 6 expansion; no Phase 11B/13B; no AI/model oracle
authority; no selfDev/promotion/catalog mutation; no Alphaus sibling writes;
no assertion weakening or skips to obtain green.

## Milestones

### M0 — Bootstrap / continuity / predecessor truth
- clean fetch + fast-forward;
- read Phase 16A STATE/REPORT;
- reproduce implementation/closure SHAs;
- activate Phase 16H only after owner token is present.

### M1 — Compiler / static / parser recovery
- run typecheck first;
- run hardening:check;
- exercise portfolio DTO/parser strictness;
- every failure enters DEFECT_LEDGER.

### M2 — Scoring + allocation adversarial hardening
- score monotonicity/bounds/tie-order matrix;
- allocation budgets/caps/floors/starvation/reserves/blockers;
- permutation determinism.

### M3 — Yield / manifest / replan hardening
- arithmetic/privacy edge cases;
- manifest parser/version/identity;
- exhaustive replan matrix.

### M4 — Simulator / CLI / DEV-handoff hardening
- pure deterministic simulator;
- all CLI subcommands;
- inert separately-gated handoff proof.

### M5 — Phase-16H adversarial corpus
- >=80 deterministic cases;
- >=3 repeats;
- all quality floors zero.

### M6 — Cross-phase compatibility
- focused Phase 16H suites;
- complete affected Phase 12-16 compatibility;
- campaign:synthetic + owner-provenance.

### M7 — Complete canonical regression
- `npx playwright test --project=nightwatch --workers=1`;
- zero failed;
- skips inventoried.

### M8 — Topology-correct isolated complete regression
- fresh isolated clone;
- deterministic `npm ci`;
- reproduce sibling topology read-only;
- exact same complete Playwright command;
- zero failed and counts compared.

### M9 — Closure gates
- typecheck;
- hardening;
- campaign synthetic;
- owner provenance;
- agent check/audit;
- project check;
- catalog integrity;
- diff check;
- privacy/authority final sweep.

### M10 — Validated implementation checkpoint + CI truth
- commit repair source/tests only after every local gate green;
- push fast-forward;
- inspect exact Actions run/job/steps once;
- no retry loop.

### M11 — Durable closure
- final REPORT / STATE / ACTIVE_TASK / current-state docs;
- exact terminal classification;
- clean HEAD == origin/main;
- STOP.

## Execution order

M0 -> M1 -> M2 -> M3 -> M4 -> M5 -> M6 -> M7 -> M8 -> M9 -> M10 -> M11.

Do not skip directly to complete regression before the Phase-16A-specific adversarial matrices are built and green. Do not execute the DEV handoff in this task.

## Authorization

Granted exactly `PHASE_16H_CAMPAIGN_YIELD_PORTFOLIO_HARDENING_LOCAL_ONLY`
(fresh context-free session). Recorded in ACTIVE_TASK.md and STATE.md before
any mutation.

## Safety Constraints

- Local/source/synthetic only; NO DEV/NEXT/production contact; no real campaign.
- No database/data-plane/cloud/infra operations; Phase 6 stays FROZEN_BY_OWNER.
- No Alphaus sibling writes; read-only sibling access only via existing paths.
- No new endpoint/target authority; no AI/model oracle authority; no
  selfDev/promotion/catalog mutation; Phase 11B/13B stay NOT_AUTHORIZED.
- The DEV handoff is never executed; it stays data-only/inert.
- Never weaken assertions or add skips to obtain green.

## Architecture / Approach

Adversarial repair-and-proof over the Phase-16A portfolio layer: build the
Phase-16H adversarial corpus (>=80 scenario cases plus negative catalogs),
reproduce every suspected defect as a failing test, classify, repair source
only for real defects, pin each repair with a permanent regression, then run
the affected compatibility matrix followed by complete canonical and
topology-correct isolated regressions and closure gates.

## Validation Strategy

- Typecheck FIRST at baseline and after every repair batch.
- Focused suites (phase16a* + phase16h*) must be green before broader gates.
- Quality-floor runner computes all ten named floors over the whole corpus
  across >=3 deterministic repeats; every floor must equal zero.
- M6 affected Phase 12-16 compatibility + campaign:synthetic +
  owner-provenance; M7 canonical full Playwright workers=1 zero failed;
  M8 fresh isolated checkout npm ci + identical command + count parity;
  M9 closure gates incl. agent/audit/project/catalog/diff.

## Decision Log

See STATE.md "Decisions Made During This Task" (D-16H-1..D-16H-5) and
DEFECT_LEDGER.md for the failure-driven decisions.

## Discoveries

- Score digests cover explainability basis strings; anti-false-novelty holds
  on totals/contributions while bases legitimately differ (TA-02).
- The exploration reserve binds non-exploration allocation only; explorers
  remain ceiling-bound (TA-03).
- compare-plan previously accepted arbitrary JSON — closed by strict parser
  with double digest recomputation (DEF-03).

## Deferred Work

- Contained DEV execution of the handoff manifest (separate owner token).
- Any semantic-depth expansion of the planner beyond repair scope.
- CI truth per M10; single inspection, no retry-loop on external blocks.

## Completion Criteria

All ACCEPTANCE_MATRIX rows PASS with raw counts recorded in REPORT.md:
focused + compatibility + campaign:synthetic + owner-provenance green,
canonical and isolated complete regressions zero failed with count parity,
all ten quality floors zero, catalog count/digest unchanged, promotion
authority NONE, agent/audit/project checks clean, validated implementation
SHA pushed fast-forward, exact Actions truth inspected once, terminal tokens
set truthfully, HEAD == origin/main, worktree clean.
