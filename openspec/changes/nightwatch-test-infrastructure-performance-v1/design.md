## Context

Nightwatch validation is authoritative through versioned manifests and a
12-group quality gate. The gate dispatches fixed command keys; test-executing
groups are `SEMANTIC_COMPATIBILITY` (149-file manifest), `OWNER_PROVENANCE`
(3 suites), and `SYNTHETIC_CAMPAIGN` (105-file manifest, 1,897 tests), plus
the full regression `npm test` (378 files, 5,310 tests). All Playwright
execution is serial (`workers: 1`, `fullyParallel: false`) under D-1.

Constraints that shape every decision:

- One writing agent == one worktree == one session identity (C-00).
- Clean-checkout qualification must prove a fresh environment and may not
  reuse local validation state.
- Mutation campaigns (hardening probes) edit real guarded source and restore
  it; two probes must never run concurrently against one checkout.
- Only deterministic immutable inputs/outputs may be cached, never mutable
  runtime state, and never keyed by filename alone.
- The gate's group dependency graph and required membership are governance
  artifacts; performance work may not reorder or drop them.
- Proxy port leases are dynamic and cross-process coordinated, and proxy
  state/event paths are lease-suffixed; most fixture servers bind port 0.

## Goals / Non-Goals

Goals: measured baseline; duplicate-work removal/reuse; proven parallel
shards; fast/milestone lanes; faster authoritative lanes; durable timing
telemetry; structural regression guards; documented lane usage; one final
verdict with before/after evidence.

Non-Goals: product behavior, product authority, safety-model weakening, test
deletion, skip growth, assertion weakening, timeout-bound increases,
clean-gate state reuse, remote/product contact, sibling writes.

## Decisions

### D-PERF-1 — Measure before optimizing

No optimization lands before its baseline measurement exists, with a host-load
receipt. Rationale: inherited numbers were taken under contention and cannot
attribute time to a cause.

### D-PERF-2 — Sharded canonical full regression (supersedes D-1 shape)

The canonical full regression may adopt the shard runner as its execution
shape: disjoint file shards, each an independent serial Playwright invocation
with its own output directory and leased proxy port. Rationale: `npm test` is
dominated by serial Playwright execution and the owner's objective requires it
to be significantly faster. Constraint: a new recorded decision superseding
D-1's serialization rationale is required before the canonical shape changes,
backed by the per-file execution classes and the coverage-equality proof;
`gate:local` group membership/order and the required universe are unchanged.

### D-PERF-3 — Synthetic campaign v2 execution contract

The synthetic campaign may declare concurrent shards over a deterministic
partition of its 105 files, each shard still `workers=1` / `retries=0`.
Rationale: section 11 authorizes safe shards while preserving `1897/1897`.
Constraint: the v1 serial contract remains as a fallback until a normalized
result-set equivalence proof is green; shard membership is declared data, not
computed ad hoc.

### D-PERF-4 — Classification is declared data with mechanical detection

Execution classes live in a versioned config. Detection tooling proposes
classes from mechanical signals (git shell-outs, owner-local state paths,
fixed-port binds, `chdir`, scratch roots); unknown or unclassified files fail
closed to `SERIAL_REQUIRED`. Rationale: heuristics are not authority, and a
missing classification must broaden, never narrow.

### D-PERF-5 — Structural guards over wall-clock assertions

Performance regressions are guarded structurally: process-launch counts,
duplicate suite executions per lifecycle, build counts, shard membership, and
cache-key correctness. Wall-clock thresholds are reporting-only. Rationale:
wall-clock assertions under multi-agent load are flaky and would themselves
become a defect.

### D-PERF-6 — Benchmark windows are owner-quiesced

Baseline and final benchmarks request an owner-quiesced host window. If a
window is not quiesced, measurements carry load receipts and median-of-N
values, and the report says so. Rationale: W13 measured a 423-643 s spread on
one unchanged tree under concurrent agents.

## Architecture

### Timing telemetry

A Playwright reporter (loaded through the existing single config) writes a
normalized JSON timing document per invocation into the lane's own output
directory. `bin/test-timings.mjs` reads those documents plus persisted gate
receipts and renders a text summary and machine-readable JSON: slowest files,
slowest tests where available, suite totals, gate-group totals, percentage of
lane runtime, worker utilization, and repeated-setup hotspots. Additive
`durationMs` fields on gate receipt groups are written by the gate executor
from monotonic clocks; no existing field changes meaning.

### Execution classes and shards

`config/validation-execution-classes.v1.json` declares, per discovered test
file, exactly one class and the evidence for it. The shard runner:

1. reads the full universe from `playwright test --list` (JSON) and the
   versioned class config;
2. assigns members in declared order into `N` shards such that the union is
   exactly the universe and no file appears twice;
3. refuses to run when a file is unclassified, when the union differs, or
   when a shard would mix `MUTATION_CAMPAIGN_EXCLUSIVE` work with anything
   else;
4. executes each shard as a separate serial Playwright invocation with a
   distinct `--output` directory and its own leased proxy port, bounded by
   `NIGHTWATCH_TEST_WORKERS` (validated integer, bounded by a declared
   maximum);
5. emits a receipt with shard membership digests, per-shard wall/CPU, and the
   equality proof.

### Affected-test selection

`bin/affected-tests.mjs` takes an explicit base SHA (defaulting to the
session base or `origin/main` merge-base), asserts a non-zero changed-file
set, and computes impacted tests from a reverse import graph. Declared
always-run classes (safety, policy, hardening, continuity, gate meta, and the
test-infrastructure self-tests) are always included. A changed file that is
unmapped, dynamically loaded, or reachable only through a runtime loader
broadens the selection rather than narrowing it; a failed graph build selects
the full universe. Test-infrastructure changes select the full
test-infrastructure suite.

### Fast and milestone lanes

`gate:dev` composes: changed-file assertion, full or affected typecheck
(decided by measurement), cheap mandatory static/governance checks, affected
tests plus always-run classes, and validation-universe integrity. It prints an
explicit NOT-certification label and its selected-file count.

`gate:milestone` composes: the full static/hardening/governance groups that
are cheap, the affected broad selection, and the relevant shards (including
the browser lane when changed). It also prints the NOT-certification label.

Tier 3 remains `gate:local`, `npm test`, and `gate:clean`; their semantics are
not relaxed, and the fast lanes can never satisfy a Tier 3 requirement.

### Synthetic campaign and probes

Immutable campaign setup (manifest load, classification, environment
construction) moves outside the per-case path. Sharding partitions the
declared file list deterministically; each shard runs serially with zero
retries and reports its own counts, and the combined receipt must equal the
pre-optimization normalized result set exactly. The hardening probe campaign
keeps its serial mutation discipline; cost reduction comes from harness work
(shared registry load, scoped mutation directories, avoiding whole-repository
rescans), never from removing or co-scheduling probes.

## Risks / Trade-offs

- Parallel shards could interleave state across files. Mitigation: declared
  classes, fail-closed unknowns, per-shard output and port leases, and
  repeated-run flakiness evidence.
- Caching could serve stale artifacts. Mitigation: digest keys over source
  SHA + config digest + tool version + schema version, immutable outputs only.
- Fast lanes could be mistaken for certification. Mitigation: explicit
  labelling in output and documentation, and Tier 3 semantics unchanged.
- Wall-clock improvements could regress under load. Mitigation: structural
  guards plus load-receipted measurements.

## Migration

New surfaces are additive. `gate:local`'s definition file, group order, and
required membership are unchanged; only the executors behind test-executing
groups and the receipt's additive duration fields change. The synthetic v1
manifest remains valid until the v2 equivalence proof is green. Documentation
is updated in the same campaign so no developer has to guess which lane to
run.

## Open Questions

- Whether the canonical full regression's shard default should be host-core
  based or fixed after the 1/2/4/N benchmark — resolved by M4 evidence.
- Whether full `tsc --noEmit` stays inside the fast-lane target or needs a
  bounded affected route — resolved by M1/M5 measurement.
