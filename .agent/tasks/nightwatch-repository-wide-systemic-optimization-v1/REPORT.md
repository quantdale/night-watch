# Report — Repository-Wide Systemic Optimization

Task ID: nightwatch-repository-wide-systemic-optimization-v1
Status: COMPLETE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## 1. Executive Summary

Nightwatch's engineering-validation loop is measurably faster with zero
reduction in verification strength. Every gate group passes with byte-for-byte
identical validated outputs (same test counts, same receipts schema, same
checker verdicts). The executable acceptance chain dropped from ~808s
(sum of measured baseline components) to 373.8s as one measured run
(`npm run gate:local` on checkpoint `f9902bf`, -54%).

| Area | Before | After | Improvement |
|---|---:|---:|---|
| agent:check (git spawns) | 880 / run | 64 / run | -93% spawns |
| npm run agent:check | 8.40s | 1.03s | -88% |
| npm run agent:audit | 5.80s | 0.99s | -83% |
| npm run typecheck (warm) | ~47s every run | 7.36s | -84% (cold unchanged) |
| phase16hCliHandoffHardening suite | 190.5s test time | 9.7s | -95% |
| portfolio CLI invocation (warm) | ~14.2s compile each | 0.42s | -97% |
| npm run hardening:check | 2.78s | 0.90s | -68% |
| npm run project:check | 7.48s | 2.86s | -62% |
| test:semantic-compat (standalone) | 663.56s | 427.8s / 468.5s (two runs) | -29..-36% |
| Full gate:local chain | ~808s (component sum) | 373.77s | -54% |

Measurement honesty notes: the full-gate baseline was never run as one unit
before the campaign; it is the SUM of separately measured baseline components
(same commands). Ambient variance between identical runs is visible
(semantic-compat post-fix: 427.84s idle vs 468.53s with light concurrent doc
editing); ranges are reported rather than a single flattering number. The
gate-internal semantic-compatibility group completed faster still under fully
warm page-cache conditions; all runs report identical validated counts.

## 2. System Areas Inspected

- Quality-gate executor + definition (`bin/quality-gate.mjs`,
  `config/quality-gate.v1.json`, `config/semantic-compatibility.v1.json`).
- Continuity/project/hardening checkers (`bin/agent-state.mjs`,
  `bin/agent-continuity-protocol.mjs` usage, `bin/project-state-check.mjs`,
  `bin/hardening-check.mjs`).
- TypeScript program composition (`tsconfig.json`, tsc extendedDiagnostics).
- Playwright suite mechanics: main config, semantic-compatibility wrapper,
  per-file JSON-reporter attribution of all 141 manifest files / 1,884 specs.
- Operator CLIs (`bin/portfolio.mjs`, `bin/nightwatch-intelligence.mjs`) and
  the TS require-hook pattern duplicated across 20 bin scripts.
- Source-analysis hot path (census): profiled `discoverSourceSurfaces`
  (surfaces.ts), `observationsFor`, `analyzeSourceArtifact`,
  `siblingSource.readFile`; measured handler/file multiplicity (127 operations
  over 26 unique files).
- Control Center UI subproject (typecheck 6.3s, tests ~11s — no action needed).

## 3. Bottlenecks Found

1. Continuity checker process storm — P0 for the loop.
   Symptom: agent:check+audit = 14.2s per gate. Evidence: CPU profile shows
   94% in spawnSync; PATH-shim counting shows 880 git spawns per run, only
   428 unique; history graph is 704 commits. Root cause: one git subprocess
   per cat-file/merge-base query across all 78 task records.
2. Portfolio CLI recompiles tsc per invocation — P0 for the suite.
   Symptom: one test file consumed 190.5s (34%) of the compatibility suite.
   Evidence: JSON-reporter attribution; bin/portfolio.mjs `compileCore()`
   ran `rm -rf` + `npx tsc` (~14.2s measured) on EVERY invocation, twice per
   invocation when both core and fixtures load.
3. Non-incremental typecheck — P1. Evidence: extendedDiagnostics (check time
   dominates); every gate re-derived the full program from scratch.
4. Per-file syntax checking via 49 Node startups — P2 (hardening:check).
5. Census-path inefficiencies — recorded, deliberately NOT "fixed" here:
   ~35% of census CLI runtime is the per-script transpile hook (copy-pasted
   across 20 bin scripts); analyzer work repeats ~5x across symbols of the
   same file and handler files are re-read per operation. Fixing these means
   touching hardened analyzer/evidence-digest cores or every operator CLI;
   deferred with reasons (see STATE.md Deferred).

## 4. Optimizations Implemented

- **agent-state git graph** (`bin/agent-state.mjs`): one-shot object census
  (`cat-file --batch-all-objects --batch-check`) plus positional
  `cat-file --batch` parsing builds types/parents/tag-targets maps once per
  repo root; `isCommit` peels tags in memory; `isAncestor` BFS over real
  parent edges; commit-parent lookup for role classification uses the graph.
  Exact-semantics notes: responses matched positionally because git strips a
  leading zero when echoing full-SHA stdin requests; any load failure falls
  back to the original per-call spawns so fallback can only cost time, never
  change a verdict; caches are keyed by repository root (in-process multi-repo
  use is exercised by tests). Differential run vs the prior implementation
  produced identical verdicts for all 78 task records.
- **Incremental typecheck** (`tsconfig.json`): `incremental: true` with
  tsbuildinfo under `node_modules/.cache/` — outside the tracked tree so
  PATCH_INTEGRITY clean-checkout semantics are untouched; CI/clean gates stay
  cold by construction (npm ci wipes node_modules).
- **Portfolio compile cache** (`bin/portfolio.mjs`): sha256 fingerprint over
  TypeScript version + exact compiler options + content of all of src/ and
  corpus/; marker written atomically after successful compile; stale on ANY
  source content change (verified), mtime-only touches do not invalidate;
  stdout proven byte-identical cold vs warm.
- **Batched syntax check** (`bin/hardening-check.mjs`): single child performs
  the same syntax-only ESM parse via `vm.SourceTextModule` instead of 49
  `node --check` spawns; broken-file probe fails the gate, clean tree passes.

Tradeoffs: all four are mechanics-only changes behind identical observable
outputs; caches are content-addressed with fail-safe fallbacks (worst case =
previous behavior's cost).

## 5. Files / Subsystems Changed

- `bin/agent-state.mjs` — git graph cache + per-root memoization.
- `tsconfig.json` — incremental noEmit typecheck.
- `bin/portfolio.mjs` — fingerprint-guarded compile cache.
- `bin/hardening-check.mjs` — batched syntax check.
- `.agent/*` — this campaign's continuity records.

## 6. Before / After Evidence

See table in §1. All numbers measured on this host (Node v22 local, 20 cores,
16GB RAM), same commands, cold/warm state noted where relevant. Baseline
suite receipts: compat 1884/1871/13/0, owner-provenance 91/91, synthetic
66/66; post-change gate receipt groups show identical counts.

## 7. Validation

- tests/unit/agent-state.test.ts — 107/107 PASS (after M2; caught and forced
  repair of a root-unkeyed cache during development).
- Differential checker verdict comparison vs HEAD implementation — identical
  except the expected classification of the modified checker file itself.
- tests/unit/phase16hCliHandoffHardening.test.ts — 8/8 PASS post-fix.
- tests/unit/phase23QualityGate.test.ts + projectState.test.ts +
  phase23Manifest.test.ts — 39/39 PASS.
- selfDevAdoptionCli.test.ts — 7/7 PASS on clean tree (dirty-tree failure is
  the SELFDEV_AUTHORITATIVE_SOURCE_DIRTY guard working as designed).
- hardening:check probe: injected broken .mjs FAILs, removal PASSes.
- Full `npm run gate:local` at committed checkpoint f9902bf — finalResult
  PASS, all nine groups PASS, counts identical to baseline.
- Standalone semantic-compat re-time post-fix — see STATE validation ledger.

## 8. Regression Protection Added

- Content-addressed invalidation (fingerprint includes TS version + options +
  full source content) with atomic marker semantics; probed for mtime-only
  and content-change cases.
- Fallback path in the checker preserves legacy behavior if the graph cannot
  load; unit suite covers synthetic multi-repo scenarios.
- Byte-stability assertions already present in the suites (plan stdout,
  census digests, manifests) act as the regression net for cached paths.

## 9. Remaining Risks

- The transpile/graph caches assume read-only repositories during a single
  checker/CLI process; concurrent mutation of the repo mid-process was never
  a supported scenario (prior code had equivalent TOCTOU windows).
- `vm.SourceTextModule` requires the (stable-in-practice) experimental VM
  flag on current Node 20/22; if a future Node removes it, checkSyntax must
  revert to per-file `node --check`.

## 10. Deferred Opportunities

1. Unify the TS require hook (20 copies) + add content-addressed transpile
   cache: ~10% further suite reduction and faster operator CLIs. Deferred:
   touches every hardened entrypoint; deserves a dedicated authorized task
   with per-script validation.
2. Analyzer-core deduplication (per-file shared parsing across symbols) and
   readFile reuse inside discoverSourceSurfaces: outputs feed evidence
   digests; restructuring risks ev:sha256 identity drift. Requires its own
   proof task with byte-equality evidence.
3. Disk-backed cross-process source-surface cache: rejected — introduces a
   new persistence authority beyond the sanctioned in-memory SHA-bound cache.
4. Semantic-compat worker parallelization: contractually pinned to workers=1
   serial by nightwatch.semantic-compatibility.v1; changing it is a versioned
   safety-surface decision, not an optimization-campaign mechanic.

## 11. Architectural Implications

None adverse. No schema, receipt, digest, or authority model changed. The
compile cache keeps Nightwatch's single-source-of-truth discipline (compiled
output remains a pure derivative of tracked source; the marker cannot outlive
an interrupted compile). The checker graph preserves fail-closed ancestry
proof while removing mechanical waste.
