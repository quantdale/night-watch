# PLAN — Phase 16H Campaign Yield & Portfolio Hardening

Task ID: `phase-16h-campaign-yield-portfolio-hardening`
Authorization at publication: NOT_GRANTED
Required execution token: `PHASE_16H_CAMPAIGN_YIELD_PORTFOLIO_HARDENING_LOCAL_ONLY`

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
