# SPEC — nightwatch-historical-benchmark-v1 (Lane F)

## Goal
Historical bug replay harness: given a hidden fixing commit, construct a
pre-fix view, hide ground truth from the reasoner, run a hunt via injected
AgentRuntime/ReasonerDriver ports, and score the outcome against hidden truth.

## Frozen inputs (do not fork)
- `src/core/agentProtocol/benchmark.ts`: `BenchmarkCase`, `HiddenGroundTruth`,
  `ReasonerVisibleContext`, `BENCHMARK_LEAKAGE_CLASSES` (6),
  `BENCHMARK_OUTCOMES` (5), `detectBenchmarkLeakage`,
  `assertNoBenchmarkLeakage`.
- Hunt loop: Lane A `AgentRuntime` + injected `ReasonerDriver` /
  `AgentToolExecutor` ports. Lane F owns only the harness around them.

## Leakage classes (all fail-closed via frozen assert)
FIX_COMMIT, FIX_DIFF, ISSUE_TITLE, BUG_DESCRIPTION, KNOWN_FAILING_TEST,
GROUND_TRUTH_EXPLANATION. The harness checks two surfaces:
1. Constructed visible context (`buildReasonerVisibleContext` asserts clean).
2. Every serialized reasoner request issued during the hunt (leak-guard
   wrapper records request-side JSON only — never reasoner outputs — and the
   hunt asserts clean after `run()`). Any leak throws
   `BENCHMARK_GROUND_TRUTH_LEAK:<classes>`.

## Corpus selection policy
Diversity across billing / api / backend / frontend / data / integration /
regression / state-transition. Representative local synthetic fixtures stand
in per the lane contract. Real historical sibling data: NOT used (no sibling
checkout reads were taken; classification is honest — results are synthetic
fixture replays, never historical claims). Fixtures live in
`src/core/benchmark/fixtures.ts` and are frozen synthetic data, not history.

## Scoring (deterministic, `score.ts`)
Candidate text = joined hunt hypothesis statements + proposed candidate ids.
- `testMatch`: hidden `knownFailingTest` non-null and substring of candidate.
- `fileRecall`: fraction of `parseFixDiffFiles(fixDiff)` paths substring-matched
  in candidate (vacuous 1 when fixDiff null/empty).
- `keywordRecall`: stopword-filtered token recall of hidden `explanation`.
- EXACT_REDISCOVERY: testMatch && fileRecall >= 0.5 && keywordRecall >= 0.5.
- PARTIAL_REDISCOVERY: testMatch || keywordRecall >= 0.5 ||
  (fileRecall >= 0.5 && keywordRecall >= 0.25).
- SAME_ROOT_CAUSE_ALTERNATE: fileHits >= 1 || keywordRecall >= 0.25.
- MISS: otherwise, including empty candidates.
- Negative controls (all hidden fields null): any admitted candidate is
  FALSE_POSITIVE; no admission yields MISS and the acceptance assertion is on
  `admitted === false` (the frozen outcome enum has no true-negative).

## Non-goals
No real-history mining, no network, no CLI spawn, no aiReview imports, no
protocol edits, no other-lane writes.
