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
  type MinedReplayAudit,
  type MinedReplayExecutorOptions,
} from './hunt';
export {
  CONTAINED_TEST_REPLAY_MATERIALIZE_MS_DEFAULT,
  CONTAINED_TEST_REPLAY_TIMEOUT_MS_DEFAULT,
  MINED_TEST_REPLAY_VERSION,
  REPLAY_STDERR_HEAD_CHARS,
  classifyPackageRun,
  compareGoVersions,
  findCachedToolchain,
  packageDirForTestPath,
  parseGoModRequiredVersion,
  parseMinedTestReplayDescriptor,
  runContainedTestReplay,
  scrubReplaySecrets,
  stringifyMinedReplayVerdict,
  type ContainedPackageRun,
  type ContainedTestReplayRequest,
  type ContainedTestReplayResult,
  type ContainedTestReplayVerdict,
  type ContainedTreeOutcome,
  type MinedTestReplayDescriptor,
  type PackageRunner,
  type PackageSignal,
} from './containedTestReplay';
export {
  PRE_FIX_SOURCE_VERSION,
  extractPreFixSnapshot,
  parsePreFixSnapshotFiles,
  type PreFixExtractionStatus,
  type PreFixSnapshot,
} from './preFixSource';

export {
  resolveMinedRepoPath,
  tryDefineMinedBenchmarkCase,
} from './minedCases';
export {
  parseVisibleDiscriminator,
  stringifyVisibleRepro,
  VISIBLE_DISCRIMINATOR_KINDS,
  type VisibleDiscriminator,
  type VisibleReproObservation,
} from './visibleRepro';
export { tryBuildMinedReplayDossier, tryBuildVisibleHuntDossier } from './huntDossier';
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
