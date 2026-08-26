# Plan — Repository-Wide Systemic Optimization

Task ID: nightwatch-repository-wide-systemic-optimization-v1
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Purpose

Execute an evidence-driven optimization campaign over Nightwatch's validation
and analysis machinery while preserving every verification and safety
contract.

## Starting State

- Live HEAD `58b8101` on `main`, clean tree, synced with origin.
- Active task lineage complete; this task is the fresh authorized successor.
- Known initial evidence: typecheck ~47s (check-time dominated, 945 files);
  agent:check+audit ~14.2s with 94% of time in 880 git subprocess spawns per
  run (428 unique commands); full Playwright regression is serial workers=1.

## Scope

- In scope: `bin/agent-state.mjs` (+ protocol module), `tsconfig.json`
  incremental compilation, gate/launcher scripts where mechanics can be
  improved without contract drift, test-suite execution mechanics,
  documentation of non-obvious performance decisions.
- Out of scope: quality-gate schema/semantics changes, worker-count changes to
  canonical determinism contracts without parity proof, any Alphaus sibling
  write, any real-environment contact.

## Non-Goals

- No new features, no phase work, no roadmap expansion.
- No micro-optimizations without measured or reproducible cost.

## Safety Constraints

See SPEC permanent boundaries. All validation stays local/offline/synthetic.

## Architecture / Approach

1. Baseline each gate component and major suite with wall-clock + peak RSS.
2. Root-cause the dominant costs; batch git DAG queries in the continuity
   checker with exact-semantics in-memory ancestry; enable content-addressed
   incremental typecheck outside the tracked tree.
3. Investigate Playwright suite duration for safe mechanical wins.
4. Re-measure; protect fixes; document; close under continuity v2.

## Milestones

- M1 BASELINE: capture baseline table (static gates + suites). — DONE
- M2 CONTINUITY-CHECKER: batch git queries in bin/agent-state.mjs with exact
  semantics; validate with tests/unit/agent-state.test.ts + before/after
  timing. — DONE
- M3 TYPECHECK-INCREMENTAL: incremental tsc with tsbuildinfo outside tracked
  tree; verify warm/cold behavior + clean-tree invariant. — DONE
- M4 SUITE-RUNTIME: measure semantic-compat/full-suite; implement only
  semantics-preserving mechanical wins that evidence supports. — DONE
  (portfolio compile cache + batched hardening syntax check)
- M5 CLOSURE: full validation matrix, docs updates, STATE/REPORT closure,
  checkpoint commit. — IN_PROGRESS

## Validation Strategy

- Per-fix focused validation (`npx playwright test tests/unit/agent-state.test.ts`,
  `npm run agent:check`, `npm run agent:audit`, `npm run project:check`).
- Campaign-level: `npm run typecheck`, `npm run hardening:check`,
  focused unit sweep, timing re-measurement with identical method.
- No suite weakening; exact counts compared before/after.

## Decision Log

- D-OPT-01: Optimize checker mechanics, not gate schemas — versioned gate
  contracts are load-bearing safety surfaces; mechanics are not.
- D-OPT-02: tsbuildinfo must live outside the tracked tree so PATCH_INTEGRITY
  clean-checkout semantics are unaffected.

## Discoveries

- agent:check performs 880 git spawns (428 unique) per run; 94% of CPU time
  is spawnSync overhead; history graph is tiny (~704 commits), so one-shot DAG
  loading is exact and cheap.
- semantic-compat.mjs buffers child output via spawnSync pipes, so progress is
  invisible until completion (observability cost during long gates).

## Deferred Work

- To be recorded at closure with reasons.

## Completion Criteria

All SPEC outcomes met; M1–M5 done; validation ledger green; docs updated;
clean tree after checkpoint commit.
