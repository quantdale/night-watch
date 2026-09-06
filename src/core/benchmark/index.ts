// ---------------------------------------------------------------------------
// Lane F: historical replay harness public surface.
// ---------------------------------------------------------------------------

export {
  BENCHMARK_CORPUS_CATEGORIES,
  BenchmarkCaseError,
  buildReasonerVisibleContext,
  defineBenchmarkCase,
  type BenchmarkCaseInput,
  type BenchmarkCorpusCategory,
  type BenchmarkPreFixView,
  type DefinedBenchmarkCase,
} from './case';
export {
  BENCHMARK_FIXTURE_IDS,
  benchmarkFixtureById,
  benchmarkFixtureCorpus,
} from './fixtures';
export {
  BENCHMARK_HUNT_MAX_TURNS,
  createLeakRecordingDriver,
  createPreFixViewExecutor,
  defaultBenchmarkBudgetPolicy,
  runBenchmarkHunt,
  type BenchmarkHuntPorts,
  type BenchmarkHuntResult,
  type LeakRecordingDriver,
} from './hunt';
export {
  PRE_FIX_SOURCE_VERSION,
  extractPreFixSnapshot,
  type PreFixExtractionStatus,
  type PreFixSnapshot,
} from './preFixSource';

export {
  resolveMinedRepoPath,
  tryDefineMinedBenchmarkCase,
} from './minedCases';

export {
  BENCHMARK_EXACT_MIN_FILE_RECALL,
  BENCHMARK_EXACT_MIN_KEYWORD_RECALL,
  BENCHMARK_PARTIAL_MIN_FILE_RECALL,
  BENCHMARK_PARTIAL_MIN_KEYWORD_RECALL,
  BENCHMARK_PARTIAL_MIN_KEYWORD_RECALL_WITH_FILES,
  BENCHMARK_ROOT_CAUSE_MIN_KEYWORD_RECALL,
  explanationKeywords,
  parseFixDiffFiles,
  scoreBenchmarkCandidate,
  type BenchmarkScore,
} from './score';
