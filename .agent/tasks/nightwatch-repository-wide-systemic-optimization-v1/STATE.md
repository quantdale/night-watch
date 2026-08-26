# Task State

## Identity

Task ID: nightwatch-repository-wide-systemic-optimization-v1
Phase: REPOSITORY-SYSTEMIC-OPTIMIZATION-V1
Status: IN_PROGRESS
Starting SHA: 58b81015857e1d352c04a4545d78093071f5fbc6
Last validated implementation SHA: 58b81015857e1d352c04a4545d78093071f5fbc6
Last substantive checkpoint SHA: 58b81015857e1d352c04a4545d78093071f5fbc6
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: main
Last checkpoint: 2026-08-26 — M2/M3/M4 implemented and validated (checker -88%, warm typecheck -84%, phase16h suite -95%, hardening -68%); M5 closure in progress.
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 58b81015857e1d352c04a4545d78093071f5fbc6
LAST_VALIDATED_IMPLEMENTATION_SHA: 58b81015857e1d352c04a4545d78093071f5fbc6
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 58b81015857e1d352c04a4545d78093071f5fbc6
LIVE_HEAD_AUTHORITY: GIT

## Objective

Measurably reduce Nightwatch's validation-loop and analysis runtime costs
(typecheck, continuity/project/hardening checkers, Playwright suite mechanics)
with zero reduction in verification strength, safety, or determinism.

## Current Milestone

Milestone ID: M5-CLOSURE
Milestone status: IN_PROGRESS
What is being attempted: full validation matrix on the checkpointed tree,
documentation reconciliation, continuity closure, clean pushed main.

## Completed Milestones

- M1 BASELINE (2026-08-26): cold timings on live tree at `58b8101`:
  typecheck 47.0s / ~760MB RSS (tsc extendedDiagnostics: check time 26.9s,
  parse 3.35s, program build 4.26s); hardening:check 2.78s; project:check
  7.48s; agent:check 8.40s raw 7.25s with 880 git spawns (428 unique) and
  94% CPU in spawnSync; agent:audit 5.80s (same spawn pattern);
  history graph 704 commits (`git rev-list --all --parents`);
  test:semantic-compat 663.56s / RSS ~1.25GB / 1884 total 1871 passed 13
  skipped 0 failed; test:owner-provenance 28.25s / RSS ~236MB;
  campaign:synthetic 42.84s / RSS ~294MB / 66 passed.

- M2 CONTINUITY-CHECKER (2026-08-26): bin/agent-state.mjs now loads a one-shot
  git object census + full commit-parent graph (`cat-file --batch-all-objects
  --batch-check` + positional `cat-file --batch`) and answers isCommit /
  isAncestor / commit-parent queries in memory with exact cat-file/merge-base
  semantics (tag peeling included); per-root cache with legacy per-call spawn
  fallback on any load failure; origin/main rev-parse memoized per root.
  Git spawns per run: 880 → 64. Validation: tests/unit/agent-state.test.ts
  107/107 PASS; differential run vs HEAD implementation on live repo shows
  identical verdicts for all 78 task records except the expected
  classification of the modified checker file itself; timings: npm
  agent:check 8.40s→1.03s (-88%), npm agent:audit 5.80s→0.99s (-83%),
  raw node 7.25s→1.12s and ~5.5s→0.87s. Discovered and handled: git strips
  leading zeros when echoing full-SHA stdin requests in cat-file --batch
  (responses matched positionally, echoed OID never used as key).

- M3 TYPECHECK-INCREMENTAL (2026-08-26): tsconfig.json gained
  `incremental: true` + `tsBuildInfoFile: node_modules/.cache/
  nightwatch-typecheck.tsbuildinfo` (outside tracked tree so PATCH_INTEGRITY
  clean-checkout semantics are untouched). Cold 46.52s (unchanged), warm
  no-change 7.36s, one-file-change 6.68s (-86%). hardening-check tsconfig
  assertions unaffected (include pattern unchanged).

- M4 SUITE-RUNTIME (2026-08-26): JSON-reporter attribution of the
  semantic-compatibility suite (561.7s compute, 1884 specs, 141 files) found
  ONE file consuming 190.5s (34%): tests/unit/phase16hCliHandoffHardening
  .test.ts, because bin/portfolio.mjs deleted and re-ran `npx tsc`
  (~14.2s) on EVERY CLI invocation including twice within one invocation
  (loadCore + loadFixtures), and the suite invokes it ~15 times.
  Fix: content-addressed compile cache in bin/portfolio.mjs — sha256
  fingerprint over typescript version + exact compiler options + all of
  src/ + corpus/, marker written atomically after successful compile;
  stale on ANY source change (verified: append probe forced recompile);
  byte-identical stdout verified cold vs warm. Result:
  phase16hCliHandoffHardening suite 190.5s → 9.7s of test time (-95%).
  Additional static-gate fix: bin/hardening-check.mjs checkSyntax now runs
  ONE batched child performing the same syntax-only parse via
  vm.SourceTextModule instead of 49 `node --check` spawns; broken-file
  probe FAILs, clean PASSes; hardening:check 2.78s → 0.90s (-68%).
  Inherited wins re-measured: project:check 7.48s → 2.86s (spawns the
  optimized agent-state internally).
  Environmental note recorded: selfDevAdoptionCli tests fail on ANY dirty
  checkout by design (SELFDEV_AUTHORITATIVE_SOURCE_DIRTY guard) — verified
  passing after stash; not a regression.

## Work In Progress

M5 closure: task-file reconciliation, checkpoint commit, then post-commit
full validation (semantic-compat + gate:local require a clean checkout for
the selfDev dirty-tree guards and PATCH_INTEGRITY).

## Exact Next Action

Update PLAN.md milestone statuses, commit the implementation checkpoint with
anchors updated, then run `npm run test:semantic-compat` and
`npm run agent:check` / `npm run project:check` on the committed tree.

## Files Changed

| Path | Reason | Status |
|---|---|---|
| `.agent/ACTIVE_TASK.md` | route active task to this campaign | done |
| `.agent/tasks/nightwatch-repository-wide-systemic-optimization-v1/SPEC.md` | frozen intent | done |
| `.agent/tasks/nightwatch-repository-wide-systemic-optimization-v1/PLAN.md` | living plan | done |
| `.agent/tasks/nightwatch-repository-wide-systemic-optimization-v1/STATE.md` | this file | done |
| `.agent/tasks/nightwatch-repository-wide-systemic-optimization-v1/REPORT.md` | protocol-required; baseline evidence | done |
| `bin/agent-state.mjs` | M2: one-shot git graph + per-root caches, exact semantics, spawn fallback | done, validated |
| `tsconfig.json` | M3: incremental noEmit typecheck with untracked tsbuildinfo | done, validated |
| `bin/portfolio.mjs` | M4: content-addressed compile cache (fingerprint + atomic marker) | done, validated |
| `bin/hardening-check.mjs` | M4: batched single-child syntax check | done, validated |

## Validation Ledger

Command: `/usr/bin/time npm run typecheck` (+ per-command timings)
Result: PASS (baseline captured)
When: 2026-08-26
Relevant failure/output summary: typecheck 47.0s; hardening 2.78s;
project:check 7.48s; agent:check 8.40s; agent:audit 5.80s.

Command: `npx playwright test tests/unit/agent-state.test.ts --project=nightwatch --workers=1`
Result: PASS 107/107 (after M2; one intermediate regression caught by the
suite — module-level graph cache not keyed by repo root — repaired before
proceeding)
When: 2026-08-26

Command: differential checker run (HEAD implementation vs optimized) on live repo
Result: identical task-record verdicts and final PASS; only expected delta is
the STALE warning for the modified checker file itself
When: 2026-08-26

Command: `npx tsc --noEmit` x3 (cold / warm / one-file-change)
Result: PASS all; 46.52s / 7.36s / 6.68s
When: 2026-08-26

Command: `npx playwright test tests/unit/phase16hCliHandoffHardening.test.ts --workers=1`
Result: PASS 8/8; suite wall 13.33s (was 190.5s of test time pre-fix)
When: 2026-08-26

Command: portfolio CLI cold/warm/touched/content-changed probes
Result: PASS; plan stdout byte-identical cold vs warm (11.21s vs 0.42s);
content change forces recompile (11.90s), mtime-only touch does not
When: 2026-08-26

Command: `npm run hardening:check` + broken-file probe + clean re-run
Result: PASS 0.90s (baseline 2.78s); probe file FAILs, removal PASSes
When: 2026-08-26

Command: `npx playwright test tests/unit/phase23QualityGate.test.ts tests/unit/projectState.test.ts tests/unit/phase23Manifest.test.ts --workers=1`
Result: PASS 39/39
When: 2026-08-26

## Decisions Made During This Task

Decision: D-OPT-01 optimize checker mechanics, never gate schemas.
Reason: versioned gate contracts are load-bearing safety surfaces.
Evidence/constraint: quality-gate.v1 + receipt digests assert execution shape.

Decision: D-OPT-02 tsbuildinfo outside tracked tree.
Reason: PATCH_INTEGRITY requires clean checkout; node_modules is ignored.
Evidence/constraint: bin/quality-gate.mjs PATCH_INTEGRITY uses git status.

## Discoveries

- 94% of agent-state CPU time is child_process.spawnSync overhead; only 428
  unique git queries exist across 880 spawns per run.
- git strips a leading zero when echoing full-SHA stdin requests through
  `cat-file --batch`; `rev-list` echoes full SHAs. Batch responses must be
  matched positionally.
- One test file (phase16hCliHandoffHardening) was 34% of the entire
  semantic-compatibility suite because bin/portfolio.mjs recompiled via
  `npx tsc` on every CLI invocation.
- selfDevAdoptionCli tests fail closed on ANY dirty checkout
  (SELFDEV_AUTHORITATIVE_SOURCE_DIRTY); semantic-compat is only greenable at
  a clean checkpoint by design.
- The census CLI spends ~35% of its runtime in the per-script TypeScript
  require-hook transpilation; the same hook is copy-pasted across 20 bin
  scripts with identical options (consolidation candidate).
- The eligibility census analyzes 127 handler operations over only 26 unique
  files (~5x redundant file parsing inside the analyzer core) and re-reads
  handler files per operation (~10% of runtime in readFile).

## Blockers

None.

## Safety Events

NONE

## Deferred / Follow-Up

- TS require-hook consolidation + content-addressed transpile cache across
  all 20 bin scripts: expected ~10% semantic-compat reduction plus faster
  operator CLIs; deferred because it touches every hardened entrypoint and
  deserves a dedicated authorized task with per-script validation.
- Census analyzer-core deduplication (per-file shared parsing across symbols)
  and readFile memoization inside discoverSourceSurfaces: analyzer outputs
  feed evidence digests; restructuring the fixed syntax-aware extractor core
  risks byte drift in ev:sha256 identities. Requires its own proof task.
- Persistent cross-process source-surface cache (disk-backed): rejected —
  introduces a new persistence authority; current in-memory cache + SHA-bound
  keys are the sanctioned boundary.

## Resume Recipe

1. Read SPEC.
2. Read PLAN.
3. Inspect git status and current SHA.
4. Run the smallest relevant validation (`npm run agent:check`).
5. Continue Exact Next Action.

## Completion Snapshot

Not complete — snapshot intentionally absent while IN_PROGRESS.
