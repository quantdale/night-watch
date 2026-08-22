# SPEC — Phase 16H Campaign Yield & Portfolio Hardening

Task ID: `phase-16h-campaign-yield-portfolio-hardening`
Phase: `16H-CAMPAIGN-YIELD-PORTFOLIO-HARDENING`
Required execution token: `PHASE_16H_CAMPAIGN_YIELD_PORTFOLIO_HARDENING_LOCAL_ONLY`

## 1. Starting truth

Phase 16A closed at implementation SHA `1737e30afb64a1aed722f61182d87a4f2f6e3bb4` with closure descendant `192ff75d1e264190fc06da27362a04f91046d233`.

Focused local evidence recorded by Phase 16A:
- typecheck PASS;
- hardening:check PASS;
- six Phase-16A suites: 59/0;
- affected Phase 12-15 compatibility: 115/0;
- campaign:synthetic: 27/0;
- owner-provenance: 91/0;
- repeated plan output byte-identical;
- no real campaign/DEV execution.

These are predecessor evidence only. Complete canonical and topology-correct isolated regressions were explicitly deferred and must be earned here.

## 2. Objective

Prove that the Phase-16A portfolio layer is deterministic, authority-safe, privacy-safe, mechanically coherent, historically compatible, and regression-safe across the complete Nightwatch local/synthetic codebase.

Hardening is repair-and-proof, not feature expansion. New production source is allowed only to fix defects exposed by this campaign.

## 3. Failure discipline

For every observed failure:
1. preserve exact reproducer and raw failure;
2. identify root cause from current source;
3. classify as source defect, stale oracle, fixture/topology defect, compatibility defect, or external condition;
4. repair Nightwatch source when it is a real source defect;
5. add/repair a permanent regression;
6. rerun the narrow reproducer;
7. rerun the affected broader gate.

Never weaken assertions, add skips, silently regenerate expected artifacts, or rewrite historical compatibility merely to obtain green.

## 4. Hardening surfaces

### H1 — Portfolio model / parser strictness

Validate the versioned portfolio DTO and parser against:
- unknown fields;
- missing required fields;
- duplicate target IDs;
- foreign/unapproved target IDs;
- malformed categorical values;
- unsafe/unbounded numeric values;
- inconsistent currentness/depth/authority combinations;
- deterministic canonical serialization.

### H2 — Scoring invariants

Prove scoring is deterministic and explainable. At minimum:
- safety/authority blockers dominate all positive factors;
- stale/unavailable evidence cannot improve rank;
- increased duplicate pressure cannot improve novelty-derived score;
- increased execution cost cannot accidentally increase score unless an explicitly documented bounded component says otherwise;
- identical normalized evidence + SHA-only movement does not create novelty;
- tie breaking is deterministic and independent of input iteration order;
- score components stay within documented bounds;
- score digest changes iff normalized score semantics change.

Do not assert general real-world yield optimality.

### H3 — Allocation / starvation / reserve invariants

Adversarially validate:
- total allocated budget <= configured budget;
- blocked members receive exactly zero;
- per-member caps/floors hold;
- reserved exploration budget cannot exceed total budget;
- starvation protection cannot bypass hard authority/currentness gates;
- duplicate suppression cannot create negative/overflow allocation;
- zero-budget, one-unit, exact-fit, over-subscribed, all-blocked, all-stale, and equal-score portfolios;
- stable allocation under input permutation;
- deterministic unselected reasons;
- retry ceilings and checkpoint policy remain bounded.

### H4 — Yield accounting

Validate sanitized yield metrics for:
- zero denominators;
- empty candidate sets;
- duplicate-heavy sets;
- all-invalid/all-transient sets;
- mixed reproduced/minimized/dossier-ready cases;
- arithmetic bounds and monotonicity where mechanically defined;
- no NaN/Infinity/negative counters;
- no customer/auth/raw values in records, digests, reports, or errors.

Synthetic/historical proxy metrics must remain explicitly non-causal and non-real-world.

### H5 — Manifest / version / identity

Hardening must prove:
- strict parser rejects unknown/malformed manifest fields where schema is frozen;
- plan ID / portfolio digest / allocation digest are deterministic;
- current plan remains inert without runtime authority;
- runtime authority is not inferred from manifest existence;
- plan ordering/budgets/reasons are coherent;
- checkpoint/resume requirements are explicit;
- historical reader compatibility remains intentional;
- version changes are load-bearing in identity where required.

### H6 — Replan matrix

Build an exhaustive transition matrix covering at least:
- unchanged source/evidence;
- SHA-only movement, normalized evidence unchanged;
- compatible evidence movement;
- breaking evidence movement;
- derivation-version change;
- authority change;
- stale source;
- unavailable source;
- contract becomes ambiguous;
- contract becomes provable;
- depth improvement/regression;
- target removed from approved registry.

Each row must deterministically classify reuse / reprioritize / invalidate (or the canonical equivalent) and must fail closed where authority/currentness is insufficient.

### H7 — Shadow simulator / backtest

Prove the simulator is pure and deterministic:
- no filesystem/network/browser/product execution outside explicitly local fixture reads permitted by existing policy;
- repeated identical input >=3 times is byte-identical;
- input order permutation does not alter semantic result;
- synthetic proxy improvements are labelled synthetic-only;
- baseline-vs-portfolio comparison cannot claim real bug-yield improvement;
- empty/bad baselines fail explicitly rather than fabricate uplift.

### H8 — Operator CLI

Hardening must cover every `bin/portfolio.mjs` subcommand:
- inspect;
- explain-score;
- plan;
- compare-plan;
- shadow-simulate;
- dev-handoff.

Prove deterministic stdout, stable exit codes, sanitized errors, no persistence/network authority, strict malformed-input handling, and no secret/customer/raw product output.

### H9 — DEV handoff safety

The data-only DEV handoff must remain non-executable by construction:
- `executable:false`;
- `environmentRestriction` remains DEV-only / never production;
- separate authorization token is present;
- owner-policy/containment/checkpoint obligations remain explicit;
- no embedded credentials/auth state;
- no implicit endpoint/target authority;
- no code path in Phase 16H executes it.

### H10 — Cross-phase compatibility

Run complete affected compatibility for Phase 12-16 and then the full local Nightwatch suite. Portfolio integration must not regress:
- semantic confidence/yield;
- campaign lifecycle;
- replay/minimization;
- checkpoint/resume;
- currentness/drift;
- privacy/authority;
- source-contract lifecycle;
- project readiness;
- artifact validation.

### H11 — Complete canonical and isolated regressions

Run complete canonical Playwright with `--project=nightwatch --workers=1`, then reproduce the required sibling topology in a fresh isolated checkout and run the exact same complete command.

Both must have zero failures. Count differences must be explained from exact enumeration evidence; unexplained differences are defects.

### H12 — Continuity / project / catalog / CI truth

Require:
- typecheck PASS;
- hardening:check PASS;
- campaign:synthetic PASS;
- owner-provenance PASS;
- agent:check PASS;
- agent:audit strict errors 0;
- project:check PASS;
- catalog count/digest unchanged;
- promotion authority NONE;
- git diff --check PASS;
- exact GitHub Actions run/job/step truth for the validated implementation SHA.

If Actions remains externally billing/spending blocked before steps execute, do not retry-loop and terminalize `BLOCKED_EXTERNAL_CI` only after all local gates are green.

## 5. Corpus requirement

Create/extend deterministic Phase-16H adversarial fixtures to at least 80 scenario cases spanning H1-H9. The fixture count is a coverage floor, not a success metric.

Run at least three full deterministic repeats over the portfolio planner/simulator/handoff path and require zero mismatches.

## 6. Quality floors

At terminal local green require exactly zero:
- determinismMismatchCount;
- privacyLeakCount;
- falseCurrentCount;
- authorityEscapeCount;
- blockedMemberBudgetCount;
- budgetOverflowCount;
- falseNoveltyIncreaseCount;
- invalidReplanReuseCount;
- realYieldClaimCount;
- executableHandoffCount.

## 7. Permanent boundaries

No DEV/NEXT/production execution. No real campaign. No database/data-plane/cloud/Phase-6 expansion. No Alphaus sibling writes. No new endpoint/target authority. No AI/model oracle authority. No selfDev/promotion/catalog mutation. Phase 11B and Phase 13B remain NOT_AUTHORIZED.

## 8. Terminal semantics

If all local gates green and exact CI cannot execute due external billing/spending:

`PHASE_16H_STATUS: BLOCKED_EXTERNAL_CI`
`PHASE_16A_PORTFOLIO: VERIFIED_LOCAL_NOT_CI_VERIFIED`

If local + real CI green:

`PHASE_16H_STATUS: COMPLETE`
`PHASE_16A_PORTFOLIO: VERIFIED_LOCAL_AND_CI`

If any local gate remains unresolved:

`PHASE_16H_STATUS: BLOCKED`
`PHASE_16A_PORTFOLIO: HARDENING_INCOMPLETE`

DEV execution remains separately unauthorized in every terminal state.
