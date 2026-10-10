## 1. Activation and C-00 ownership

- [x] 1.1 Re-verify live state: `npm run session:status`, `git status`,
      branch/HEAD/origin/main, registered worktrees, `AGENTS.md`,
      `.agent/ACTIVE_TASK.md`, `.agent/EXECUTION_PROMPT.md`, the W13
      predecessor task/report/evidence, `package.json`, the Playwright
      configs, `config/quality-gate.v1.json`,
      `config/validation-universe.v1.json`, `bin/quality-gate.mjs`,
      `bin/quality-gate-clean.mjs`, `bin/semantic-compat.mjs`,
      `bin/campaign-synthetic.mjs`, and the synthetic/semantic manifests. Do
      not assume any SHA in this change is still live.
- [x] 1.2 Claim a fresh owned C-00 session/worktree via
      `bin/nightwatch-session.mjs`; route `.agent/ACTIVE_TASK.md` and
      `.agent/EXECUTION_PROMPT.md` to this task. Do not adopt, release, or
      modify the foreign live session or the pre-existing stale worktrees.
- [x] 1.3 Create
      `.agent/tasks/nightwatch-test-infrastructure-performance-v1/{SPEC,PLAN,STATE,REPORT}.md`,
      the OpenSpec change, and the updated live-state cross-check; commit the
      activation checkpoint before any performance change.

## 2. Measurement foundation

- [x] 2.1 Add the Playwright timing reporter and
      `bin/test-timings.mjs` (`npm run test:timings`), offline, JSON plus text
      summary: slowest files/tests, suite totals, gate-group totals,
      percentage of runtime, worker utilization, repeated-setup hotspots.
- [x] 2.2 Add additive `durationMs` fields to quality-gate receipt groups
      without changing any existing field's meaning, and regenerate/verify the
      receipt-shape regressions still pass.
- [x] 2.3 Capture the baseline for every named lane with host-load receipts
      and median-of-N where needed; commit the baseline table and the top-N
      slowest list under the task evidence directory.
- [x] 2.4 Build the mechanical duplicate-work map and classify every
      duplication with the five-class taxonomy; preserve clean-checkout
      independence explicitly.

## 3. Execution classes

- [x] 3.1 Add `config/validation-execution-classes.v1.json` plus mechanical
      detection tooling and a validator; unclassified files fail closed to
      `SERIAL_REQUIRED`.
- [x] 3.2 Add focused tests and negative probes proving a misclassified
      parallel-safe file is detected (including a git-mutating and a
      fixed-port case).

## 4. Shard runner

- [x] 4.1 Implement the shard runner with declared-order membership, union and
      disjointness proof, per-shard output directory, leased proxy port, and a
      validated bounded `NIGHTWATCH_TEST_WORKERS`.
- [x] 4.2 Benchmark 1/2/4/host-core worker counts (wall, CPU, failures,
      memory) and set the evidence-based default; record the benchmark.
- [x] 4.3 Add the structural guards for shard membership and duplicate
      execution, and prove `union(shards) == npm test --list` universe.
- [x] 4.4 Record the recorded decision superseding D-1's serialization
      rationale before the canonical full regression adopts the shard shape.

## 5. Developer lanes

- [x] 5.1 Implement affected-test selection with explicit base SHA, non-zero
      changed-file assertion, reverse import graph, always-run classes, and
      fail-closed broadening; add the three required negative probes (hidden
      dependency, core shared module, unmapped path).
- [x] 5.2 Implement `gate:dev` (target <= 120 s) with an explicit
      NOT-certification label and its selected-file/count output.
- [x] 5.3 Implement `gate:milestone` (target <= 300 s) with the broader
      selection and the same label.
- [x] 5.4 Measure both lanes and record their durations against the targets.

## 6. Synthetic campaign and probe performance

- [x] 6.1 Move immutable synthetic setup out of the per-case path and measure
      the improvement with case count unchanged.
- [x] 6.2 Implement the v2 execution contract with deterministic concurrent
      shards, each serial and zero-retry, plus the normalized result-set
      equivalence proof; keep the v1 serial contract as fallback until green.
- [x] 6.3 Reduce per-probe hardening-campaign cost while preserving 83 rules /
      94 probes / 94 detected / restore discipline; never run two probes
      concurrently against one checkout.

## 7. Reuse and orchestration

- [x] 7.1 Add digest-keyed immutable caching for proven-expensive
      deterministic setup (source SHA + config digest + tool version + schema
      version) with cache-key correctness tests and negative stale-input
      probes.
- [x] 7.2 Remove avoidable gate orchestration overhead (single metadata load,
      no semantic reordering, direct Node invocation where
      governance-equivalent) and measure the group totals.

## 8. Guards, registration, hygiene

- [x] 8.1 Add the structural performance regression budgets and prove they
      fail on a deliberately regressed probe.
- [x] 8.2 Register every new executable surface in
      `config/validation-universe.v1.json` and
      `config/validation-lane-state.v1.json`; refresh the inventory digest;
      keep discovered/unclassified at zero.
- [x] 8.3 Run repeated consecutive fast/milestone lanes and changed-shard
      repeats; fix races; run ownership-scoped resource-hygiene checks.

## 9. Certification and closure

- [x] 9.1 Run the full final certification sequence once: typecheck,
      typecheck:bin, hardening:check, hardening:rules, agent:check,
      handoff:check, project:check, workspace:check, session:check,
      validation:universe, gate:dev, gate:milestone, npm test, gate:local.
- [x] 9.2 Commit the before/after benchmark table, coverage-equivalence
      evidence, flakiness results, and resource-hygiene results.
- [x] 9.3 Complete C-00 integration and release; verify `HEAD == origin/main`.
- [x] 9.4 Run `gate:clean` at the lifecycle-approved point and record its
      receipt.
- [x] 9.5 Update developer documentation and write the final REPORT sections
      A-O with exactly one verdict.
