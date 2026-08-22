# PLAN — Phase 16A Campaign Yield & Portfolio Optimization

Status at publication: NONE
Execution token: `PHASE_16A_CAMPAIGN_YIELD_PORTFOLIO_LOCAL_ONLY`

## Sequence

M0 bootstrap/continuity; M1 portfolio model; M2 scoring; M3 budget allocator; M4 novelty/yield accounting; M5 plan manifest + replan; M6 shadow simulator; M7 operator tooling + DEV handoff; M8 focused integration/closure.

## Implementation discipline

Use existing Phase-15H-hardened shared APIs rather than phase-local duplication. Preserve durable historical IDs and owner gates. Each milestone adds focused permanent tests and records exact source SHA/checkpoint. If one workstream is blocked, continue independent workstreams.

## Validation

Per milestone: `npm run typecheck`, `git diff --check`, smallest decisive focused tests. After M7 run one moderate pack: typecheck, hardening:check, all Phase-16A suites, directly affected Phase 12–15 compatibility, campaign:synthetic, owner-provenance if touched, agent:check, project:check, diff-check, >=3 deterministic portfolio-plan repeats.

No full canonical/isolated regression in this implementation phase unless a focused defect cannot otherwise be diagnosed. Record such exhaustive tests as deferred to the next hardening campaign.

## Closure

Populate REPORT.md with portfolio count, selected/unselected reasons, score/allocator invariants, shadow-simulation metrics, deterministic digests, compatibility counts, exact Git SHAs, Actions truth, and the separately gated DEV handoff. Terminalize truthfully and STOP.
