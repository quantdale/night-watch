# SPEC — Phase 16A Campaign Yield & Portfolio Optimization

Task ID: `phase-16a-campaign-yield-portfolio-optimization`
Execution token: `PHASE_16A_CAMPAIGN_YIELD_PORTFOLIO_LOCAL_ONLY`
Status at publication: NONE

## Objective

Build a deterministic, private/local campaign portfolio layer on top of the Phase-15H-validated Nightwatch core. The planner must decide which already-approved read-only targets/journeys deserve campaign budget, why, and in what order, without inventing authority or relying on AI judgment.

## Required inputs

Use existing authoritative Nightwatch APIs for project snapshot/currentness, source movement, approved target/expectation registries, semantic coverage, campaign candidate lifecycle, replay/minimality, clustering/confidence, checkpoint/resume, readiness, owner scope, and project health. Do not create parallel substitutes when a hardened shared API already exists.

## Workstreams

### W1 — Portfolio model
Implement a versioned portfolio DTO representing existing approved target/journey members, provenance/currentness, semantic depth, recent source movement, historical synthetic yield metadata, duplicate pressure, starvation age, execution cost class, safety/authority class, and blocking reason.

No new target or endpoint may enter the portfolio unless already authorized by existing Nightwatch registries.

### W2 — Deterministic priority score
Implement a bounded explainable score from categorical/mechanical inputs only. Candidate factors may include source-change relevance, semantic-contract depth, coverage gap, prior anomaly yield, duplicate suppression, replayability, evidence quality, starvation age, execution cost, and freshness.

The score must expose component contributions and a deterministic digest. No model/AI score.

### W3 — Budget allocator
Implement bounded allocation across the portfolio with explicit total budget, per-member ceiling/floor, starvation prevention, duplicate suppression, retry ceiling, and reserved exploration budget. Allocation must be deterministic for identical inputs and fail closed on stale/unavailable required evidence.

### W4 — Novelty / yield accounting
Implement sanitized local-only yield accounting over synthetic/historical Nightwatch evidence: admitted anomaly count, reproduced count, minimized count, distinct semantic cluster count, dossier-ready count, duplicate rate, invalid/transient rate, and cost-per-useful-candidate. Raw customer/product values must never enter the portfolio record.

### W5 — Campaign-plan manifest
Produce a versioned deterministic plan manifest containing selected portfolio members, order, budgets, reasons, expected oracle/semantic coverage, replay/minimization policy, checkpoint policy, and owner-scope requirements. Manifest must be executable only by a separately authorized runtime campaign.

### W6 — Change-aware replan
Use existing source-movement/currentness APIs to deterministically classify when a prior plan is reusable, needs reprioritization, or is invalid because contract/evidence/authority changed.

### W7 — Shadow portfolio simulator
Build a pure local synthetic simulator/backtest over existing corpora and campaign evidence. It should compare baseline allocation vs new portfolio allocation on useful-yield proxies without claiming real-world improvement from synthetic data.

### W8 — Operator tooling and DEV handoff
Add local read-only CLI/reporting surfaces for portfolio inspect, explain-score, plan, compare-plan, and shadow-simulate. Produce an owner-gated DEV handoff manifest/package but do not execute it.

## Required invariants

- Existing approved target universe only.
- Source stale/unavailable cannot improve rank or certify readiness.
- Duplicate pressure cannot increase novelty score.
- Safety/owner-policy blocker always dominates ranking.
- Phase-6 members remain frozen/unselectable.
- Phase 11B/13B remain unselectable/not authorized.
- AI/selfDev/promotion state cannot grant campaign authority.
- Identical normalized inputs produce byte-identical plan/score output.
- SHA-only movement with unchanged normalized evidence must not create false semantic novelty.
- Changed contract/derivation/authority must invalidate or replan as appropriate.

## Testing cadence

Implementation-heavy with focused permanent tests per workstream, one moderate integration pack at the end, and no complete canonical/isolated Playwright unless required to diagnose a regression. The next dedicated hardening task will run exhaustive regression.

## Terminal states

Preferred local result:
`PHASE_16A_STATUS: IMPLEMENTED_FOCUSED_GREEN_AWAITING_HARDENING`

If local residual remains:
`PHASE_16A_STATUS: BLOCKED_LOCAL_GAP`

If all local gates are green and Actions remains externally blocked:
record the external CI condition separately; do not misclassify local implementation as failed.
