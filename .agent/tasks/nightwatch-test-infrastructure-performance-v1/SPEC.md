# Test infrastructure performance and parallelization

## Task purpose

Make Nightwatch's development and validation loop significantly faster
without reducing test coverage, safety, determinism, or release confidence.
The campaign is a performance-engineering task for the test/gate
infrastructure, not a product feature campaign and not an opportunity to
weaken correctness for better timings.

The observable capability afterward is a three-tier validation model:

- a fast development lane that gives normal coding feedback in about one to
  two minutes and is explicitly not a certification authority;
- a milestone lane that validates a coherent integration checkpoint in about
  five minutes;
- the existing authoritative local, clean-checkout, and full regression lanes,
  which remain authoritative and become materially faster through measurement,
  duplicate-work removal, safe parallelization, and deterministic reuse.

## Starting state

- Task ID: `nightwatch-test-infrastructure-performance-v1`
- Phase: `TEST_INFRASTRUCTURE_PERFORMANCE_V1`
- Starting Nightwatch SHA: `8dd8b163b567b939b977649d6ba7c371cf230ee6`
- Predecessor: `nightwatch-provider-resilient-current-yield-w13-v1`,
  status `COMPLETE`; its measured lane evidence is a read-only input.
- OpenSpec: `openspec/changes/nightwatch-test-infrastructure-performance-v1/`
- Owner authorization: the Nightwatch test-infrastructure performance and
  parallelization master execution prompt, plus the owner's recorded answers
  choosing (a) a sharded canonical full regression superseding D-1's
  serialization rationale, (b) a synthetic-campaign v2 execution contract with
  concurrent shards and an equivalence proof, and (c) owner-quiesced
  benchmark windows for baseline and final measurement.

Established facts that must not be rediscovered:

- `playwright.config.ts` runs `workers: 1` / `fullyParallel: false` under D-1's
  documented rationale (policy state and fixture servers must not race).
- `config/synthetic-campaign.v1.json` declares `project: nightwatch`,
  `workers: 1`, `retries: 0`, `serial: true`, 105 files, 1,897 tests.
- `config/semantic-compatibility.v1.json` declares 149 files, disjoint from
  the synthetic manifest.
- W13 measured `campaign:synthetic` at 422.94 s to 643 s on one clean tree
  (122% CPU), a `gate:local` 12-group PASS at 818 s, and a clean-gate
  `SYNTHETIC_CAMPAIGN` timeout at the fixed 600 s MEDIUM bound in two terminal
  attempts classified `EXPECTED_ENVIRONMENT_VARIANCE` (no bound change).
- The quality-gate receipt carries no durations; there is no `test:timings`,
  `gate:dev`, or `gate:milestone` surface.
- Proxy port leases are dynamic and cross-process coordinated, and proxy
  state/event paths carry the lease suffix, so concurrent Playwright
  invocations are already isolated at the proxy layer.
- 29 test files shell out to `git`, 19 touch owner-local state, 5 write
  `artifacts/`, 2 call `process.chdir`, and most servers bind port 0.

## Scope

- Test runner configuration, test discovery/selection, sharding, safe
  parallelization, fixture lifecycle, process startup, immutable fixture
  caching, build reuse, gate orchestration, and validation-universe metadata
  needed for performance.
- Timing/telemetry surfaces and machine-readable evidence.
- Development-only fast and milestone validation lanes that cannot masquerade
  as certification.
- CI/local gate scheduling that preserves the declared group dependency graph.
- Documentation of exactly when each lane applies.
- Regression tests for the test infrastructure itself, including negative
  probes and coverage-equality proofs.
- Validation/integration through one owned C-00 session.

## Explicit non-goals

- Weakening assertions, deleting tests, increasing skips, silently changing
  semantic coverage, lowering safety requirements, or removing hardening
  probes.
- Changing product authority, product behavior, or the frozen owner scope.
- DEV, NEXT, production, authenticated Alphaus runtime, database, cloud, or
  infrastructure contact; sibling repository writes.
- Cleaning a clean-checkout qualification merely because local validation ran.
- Force push, history rewrite, or raising any gate timeout bound.
- Making a clean gate reuse local validation state.

## Fixed lane vocabulary

- `gate:dev` — Tier 1 fast development feedback. NOT a certification
  authority. Must state that in its own output.
- `gate:milestone` — Tier 2 coherent integration checkpoint. Broader than
  Tier 1, still not certification.
- `gate:local`, `npm test`, `gate:clean` — Tier 3 authoritative
  certification, preserved as the release/campaign-closeout authority.

## Required evidence per milestone

Every milestone records the exact command, the exact result, and either a
timing measurement with a host-load receipt or a structural equivalence proof.
Coverage claims require set-equality evidence (`union(shards) == full test
universe`, pairwise disjoint) and count preservation; ordering differences
from concurrency are compared as normalized semantic results.

## Declared Deletions

None planned. No tracked file may be deleted without being declared here
first.

## Completion criteria

The task is complete only when all of the following hold:

- the current slow paths are measured with a durable profiler and a committed
  baseline;
- duplicated expensive work is identified and removed or reused where safe,
  and each duplication is classified;
- independent validation is parallelized only where correctness is
  mechanically preserved, with an explicit execution class per test file;
- the fast and milestone lanes exist, are documented, and are measured inside
  their targets or an evidenced explanation is recorded;
- full/release lanes remain authoritative and are measurably faster;
- before/after timing evidence exists for every named lane;
- no test, assertion, coverage, skip, gate group, hardening rule, hardening
  probe, or synthetic scenario regression was introduced;
- all changes are integrated through C-00 with `HEAD == origin/main`;
- final documentation explains exactly when developers should use each lane.
