# EXECUTION PROMPT — Nightwatch test infrastructure performance and parallelization

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: COMPLETE
Campaign ID: nightwatch-test-infrastructure-performance-v1
OpenSpec: openspec/changes/nightwatch-test-infrastructure-performance-v1/
Planned-From: 8dd8b163b567b939b977649d6ba7c371cf230ee6
Target Branch: main
Predecessor Task ID: nightwatch-provider-resilient-current-yield-w13-v1
Predecessor Status: COMPLETE

## Mission

Execute the owner-authorized test-infrastructure performance campaign: measure
the current validation lanes, remove or reuse duplicated expensive work where
identity permits, parallelize independent validation only where correctness is
mechanically preserved, add fast development and milestone lanes that cannot
masquerade as certification, keep the authoritative lanes authoritative and
measurably faster, and close with before/after timing evidence and exactly one
verdict.

The campaign is complete only when the slow paths are measured; duplicated
work is identified and removed where safe; independent validation is
parallelized where safe; a fast development lane exists; full/release lanes
remain authoritative; before/after timing evidence exists; no
test/assertion/coverage regression was introduced; all changes are integrated
through C-00; and final documentation explains exactly when developers should
use each lane.

## Scope

Test runner and Playwright configuration; test discovery/selection; sharding
and safe parallelization; fixture lifecycle and process startup; shared
immutable fixture caching; build reuse; gate orchestration; CI/local gate
scheduling; validation-universe metadata needed for performance;
timing/telemetry; development-only fast validation lanes; documentation and
task/OpenSpec surfaces; regression tests for the test infrastructure itself;
and C-00 commit/integration/release through one owned session.

## Ordered workstreams

1. M0 — governed activation and C-00 ownership: task/OpenSpec/handoff
   surfaces, live-state cross-check, activation checkpoint.
2. M1 — timing profiler plus baseline measurement for every named lane with
   host-load receipts and a top-N slowest list.
3. M2 — mechanical duplicate-work map with five-class classification.
4. M3 — per-file execution classes with mechanical detection and negative
   probes; unknown fails closed to serial.
5. M4 — shard runner with union/disjointness proof, bounded workers, and an
   evidence-based default from a 1/2/4/N benchmark.
6. M5 — `gate:dev` (target <= 120 s) and `gate:milestone` (target <= 300 s),
   both explicitly NOT certification.
7. M6 — affected-test selection with fail-closed broadening and the three
   required negative probes.
8. M7 — synthetic campaign and hardening-probe performance with preserved
   semantic coverage (1,897/1,897 and 94/94 probes).
9. M8 — deterministic digest-keyed reuse and gate orchestration overhead.
10. M9 — structural performance regression budgets.
11. M10 — validation-universe and lane registration with refreshed digest.
12. M11 — flakiness repeats and ownership-scoped resource hygiene.
13. M12 — final certification sequence once plus the before/after benchmark.
14. M13 — C-00 integration, documentation, and the final report/verdict.

## Constraints

LOCAL / OWNER-LOCAL only. No weakening of assertions, deletion of tests,
increase of skips, silent semantic-coverage change, safety-requirement
lowering, hardening-probe removal, product-authority change, DEV/NEXT/
production contact, sibling repository write, force push, or history rewrite.
Clean-checkout validation proves a fresh environment and never reuses local
state. Every parallel execution decision is backed by a declared per-file
execution class and a coverage-equality proof; mutation campaigns never
overlap against one checkout. C-00 is mandatory.

## Validation

Focused tests and probes during implementation; `gate:dev` after each logical
block; `gate:milestone` after coherent checkpoints; and once near
finalization: `npm run typecheck`, `npm run typecheck:bin`,
`npm run hardening:check`, `npm run hardening:rules`, `npm run agent:check`,
`npm run handoff:check`, `npm run project:check`, `npm run workspace:check`,
`npm run session:check`, `npm run validation:universe`, then `npm test`,
`npm run gate:local`, and `npm run gate:clean` at the C-00-approved lifecycle
point.

## Acceptance / completion gates

- The baseline exists before any optimization and carries host context.
- Every duplication carries exactly one five-class classification.
- Every discovered test file carries exactly one execution class; unknown
  fails closed.
- Shards prove `union == full universe` and pairwise disjointness.
- `gate:dev` and `gate:milestone` exist, state their non-authority, and are
  measured.
- The fast lane cannot satisfy a certification requirement.
- Synthetic coverage stays `1897/1897`; hardening stays 83 rules / 94 probes /
  94 detected with restore discipline.
- Before/after counts exist and no count silently shrinks.
- Parallel lanes pass repeated consecutive runs; races are fixed, not hidden.
- Resource hygiene is ownership-scoped and never touches foreign processes.
- Final certification is green, C-00 integration verifies
  `HEAD == origin/main`, and exactly one verdict is recorded.

## Git / reporting

Commit durable checkpoints only from the owned session worktree. Before
integration, inspect status/diff/untracked files, declared deletions, secrets,
and unresolved processes. If origin advances or a push is rejected, stop and
reconcile through the session CLI; never force-push. Record measured evidence
in the task directory and keep the final report truthful about remaining
limits.
