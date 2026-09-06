# PLAN — nightwatch-historical-benchmark-v1 (Lane F, executed)

1. Claim session task with --adopt. ✅
2. Read frozen benchmark/reasoner/runtime/finding protocols + Lane A ports. ✅
3. Write lane SPEC (corpus policy, scoring thresholds, leak surfaces). ✅
4. Implement `src/core/benchmark/`: case.ts (define + visible context,
   fail-closed), score.ts (tiers), hunt.ts (AgentRuntime replay + leak-guard),
   fixtures.ts (8 categories + negative control), index.ts. ✅
5. Write `tests/unit/benchmark.test.ts` (16 tests). ✅
6. `npm ci --offline`, typecheck, focused tests, hardening:check. ✅
7. Write STATE/REPORT, commit on session branch. ✅
