# Test infrastructure performance and parallelization — Report

Status: IN_PROGRESS. This report is a living handoff and makes no completion
claim until the profiler and baseline exist, duplication is classified,
parallelization is proven safe, the fast and milestone lanes are measured, the
authoritative lanes are remeasured, equivalence and flakiness evidence is
committed, final certification has passed, and C-00 integration and release
are done.

## A. BASELINE

- Starting SHA: `8dd8b163b567b939b977649d6ba7c371cf230ee6`
- Predecessor: W13 `nightwatch-provider-resilient-current-yield-w13-v1`,
  `COMPLETE`; its lane receipts are read-only inputs.
- Inherited measurements (W13 evidence, not re-derived):
  `campaign:synthetic` 422.94 s to 643 s on one clean tree at 122% CPU;
  `gate:local` 818 s; clean-gate synthetic lane timeout at the fixed 600 s
  MEDIUM bound in two terminal attempts; `npm test` 5,310 passed / 0 failed /
  18 skipped at workers=1.
- Fresh baseline for every named lane is pending M1 and requires an
  owner-quiesced host window.

## B. BOTTLENECKS

Not yet measured under this campaign. Directional facts from inherited
evidence: serial Playwright execution dominates both the synthetic lane and
the full regression; hardening probes spawn one Node process per probe.

## C. DUPLICATE WORK

Not yet mapped mechanically (M2). Known overlap to classify: the 1,897-test
synthetic set and the 149-file semantic set are each a subset of the full
regression, so a lifecycle running `npm test` plus `gate:local` executes both
sets twice.

## D. PARALLELIZATION

Not yet implemented (M3/M4/M7). Existing isolation affordances: cross-process
proxy port leases with lease-suffixed runtime state paths; most fixture
servers bind port 0. Serial-required work includes hardening probe mutation
against a single checkout (never concurrent on one checkout).

## E. CACHING / REUSE

Not yet implemented (M8). Constraint: digest-keyed immutable reuse only
(source SHA + config digest + tool version + schema version), never
filename-keyed, never mutable runtime state, never across a clean-checkout
boundary.

## F. FAST DEVELOPMENT LANE

Does not exist yet (M5/M6). Target <= 120 s, explicitly NOT certification.

## G. MILESTONE LANE

Does not exist yet (M5). Target <= 300 s, explicitly NOT certification.

## H. FULL CERTIFICATION PERFORMANCE

Before/after table pending M12. Baseline inherited figures above.

## I. COVERAGE EQUIVALENCE

Pending M4/M7. Required proofs: `union(shards) == full test universe`,
pairwise disjointness with no duplicate execution, `1897/1897` synthetic
semantic coverage, `83 rules / 94 probes / 94 detected`, and unchanged gate
group membership.

## J. FLAKINESS

Pending M11. Repeated consecutive runs of the fast and milestone lanes are
required; races are fixed rather than hidden by reducing workers.

## K. RESOURCE HYGIENE

Pending M11. Ownership-scoped checks for leaked browser, Node, server, port
lease, temp fixture, and worktree state; `npm run hygiene:status` plus
targeted ownership checks.

## L. VALIDATION

Activation validation results are recorded in STATE.md before the activation
commit. Final certification runs once at M12.

## M. GIT

Starting SHA: `8dd8b163b567b939b977649d6ba7c371cf230ee6`. Owned session:
`session/nightwatch-test-infrastructure-p-9ce4576b`. Integration and release
are pending M13.

## N. REMAINING PERFORMANCE LIMITS

Not yet measured. Only measured limits will be listed at closure.

## O. VERDICT

No verdict is claimed. The terminal choice will be exactly one of
`COMPLETE — DEVELOPMENT LOOP MATERIALLY ACCELERATED`,
`PARTIAL — PERFORMANCE IMPROVED, MAJOR BOTTLENECK REMAINS`, or `FAILED`.
