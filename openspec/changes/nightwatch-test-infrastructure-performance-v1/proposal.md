## Why

Nightwatch's development and validation loop has become the dominant cost of
ordinary work. Inherited evidence from the W13 wave shows a synthetic
campaign lane measured at 422.94 s to 643 s on one unchanged clean tree
(122% CPU, workers=1), a 12-group `gate:local` at 818 s, and a clean-checkout
gate whose `SYNTHETIC_CAMPAIGN` lane timed out twice at its fixed 600 s
MEDIUM bound. The full regression declares 5,310 tests and runs `workers: 1` /
`fullyParallel: false` under D-1's original rationale. None of the
authoritative lanes emit duration telemetry, so regressions in validation
speed are invisible until a timeout fires.

The owner has authorized a focused test/gate performance campaign. The
objective is not "run fewer tests": it is to stop running the wrong tests at
the wrong time, stop doing the same expensive work repeatedly inside one
lifecycle, and execute independent required work concurrently — while keeping
the authoritative certification lanes strict and preserving every test,
assertion, skip, hardening rule, hardening probe, and synthetic scenario.

## What Changes

- Add a durable, offline timing surface: a Playwright timing reporter plus
  `npm run test:timings`, and additive duration fields on quality-gate
  receipts, so slow files, suites, and gate groups are continuously visible.
- Produce a measured baseline for every named lane with host-load receipts
  and a top-N slowest test/suite list before any optimization lands.
- Map duplicated expensive work mechanically (command -> gate group -> script
  -> manifest -> file set -> setup) and classify each duplication as
  `REQUIRED_INDEPENDENT_REEXECUTION`, `SAFE_TO_SHARE_WITHIN_ONE_RUN`,
  `SAFE_TO_CACHE_BY_CONTENT_DIGEST`, `SAFE_TO_SKIP_IN_FAST_DEV_LANE`, or
  `ACCIDENTAL_DUPLICATION`.
- Classify every executable test file into an explicit execution class
  (`PARALLEL_SAFE`, `PROCESS_ISOLATED_ONLY`, `SERIAL_REQUIRED`,
  `MUTATION_CAMPAIGN_EXCLUSIVE`) in a versioned config, with mechanical
  detection and negative probes; unknown files fail closed to the serial
  class.
- Add a shard runner that executes disjoint shards as concurrent serial
  Playwright invocations with per-shard output directories and leased proxy
  ports, bounded by a validated `NIGHTWATCH_TEST_WORKERS`, with a mechanical
  `union(shards) == universe` and pairwise-disjointness proof and an
  evidence-based default worker count.
- Add `gate:dev` (Tier 1, target <= 120 s) and `gate:milestone` (Tier 2,
  target <= 300 s) that are explicitly labelled NOT certification, leaving
  `gate:local`, `npm test`, and `gate:clean` authoritative.
- Add deterministic affected-test selection: explicit base SHA, non-zero
  changed-file assertion, reverse import graph, declared always-run safety
  classes, fail-closed broadening for unmapped or dynamically loaded paths,
  and full test-infrastructure suites for test-infrastructure changes.
- Move immutable synthetic-campaign setup out of the per-case path and add a
  v2 execution contract that runs concurrent shards, each still serial with
  zero retries, gated by a normalized result-set equivalence proof that keeps
  `1897/1897` semantic coverage.
- Reduce per-probe hardening-campaign cost without removing any probe
  (83 rules / 94 probes / 94 detected preserved) and without running two
  mutation probes concurrently against one checkout.
- Add deterministic immutable caching/reuse keyed by source SHA + config
  digest + tool version + schema version, and remove avoidable gate
  orchestration overhead without reordering the group dependency graph.
- Add structural performance regression guards (process launches, duplicate
  suite executions, build counts, shard membership, cache-key correctness)
  rather than brittle wall-clock assertions.
- Register every new executable surface in the validation universe and lane
  state, and document exactly when each validation lane applies.

## Impact

- Affected specs: `validation-performance-measurement`,
  `validation-execution-parallelism`, `developer-validation-lanes`.
- Affected code: `playwright.config.ts`, new timing reporter and tools under
  `bin/`, `bin/quality-gate.mjs` and its definition, `bin/quality-gate-clean.mjs`
  (duration reporting only), `bin/campaign-synthetic.mjs`, the synthetic
  campaign manifest, `bin/lib/hardening/probe-campaign.mjs`, `package.json`
  scripts, new versioned config under `config/`, focused regressions under
  `tests/unit/`, and developer documentation.
- Safety: read-only locally; no product, DEV, NEXT, production, database, or
  sibling-repository contact. Clean-checkout independence is preserved. No
  gate timeout bound is raised, no test is deleted, no skip is added, and no
  assertion is weakened.
