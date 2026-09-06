// ---------------------------------------------------------------------------
// Historical replay benchmark freeze.
// Ground truth is isolated from reasoner context. Leakage fails closed.
// Pure data.
// ---------------------------------------------------------------------------

import { BENCHMARK_CASE_VERSION } from './versions';

export { BENCHMARK_CASE_VERSION };

export const BENCHMARK_LEAKAGE_CLASSES = [
  'FIX_COMMIT',
  'FIX_DIFF',
  'ISSUE_TITLE',
  'BUG_DESCRIPTION',
  'KNOWN_FAILING_TEST',
  'GROUND_TRUTH_EXPLANATION',
] as const;
export type BenchmarkLeakageClass = (typeof BENCHMARK_LEAKAGE_CLASSES)[number];

export const BENCHMARK_OUTCOMES = [
  'EXACT_REDISCOVERY',
  'PARTIAL_REDISCOVERY',
  'SAME_ROOT_CAUSE_ALTERNATE',
  'MISS',
  'FALSE_POSITIVE',
] as const;
export type BenchmarkOutcome = (typeof BENCHMARK_OUTCOMES)[number];

export interface HiddenGroundTruth {
  readonly fixCommit: string | null;
  readonly fixDiff: string | null;
  readonly issueTitle: string | null;
  readonly bugDescription: string | null;
  readonly knownFailingTest: string | null;
  readonly explanation: string | null;
}

export interface BenchmarkCase {
  readonly schemaVersion: typeof BENCHMARK_CASE_VERSION;
  readonly caseId: string;
  readonly productFamily: string;
  readonly hidden: HiddenGroundTruth;
}

export interface ReasonerVisibleContext {
  readonly blobs: readonly string[];
}

const LEAK_FIELDS: readonly { key: keyof HiddenGroundTruth; cls: BenchmarkLeakageClass }[] = [
  { key: 'fixCommit', cls: 'FIX_COMMIT' },
  { key: 'fixDiff', cls: 'FIX_DIFF' },
  { key: 'issueTitle', cls: 'ISSUE_TITLE' },
  { key: 'bugDescription', cls: 'BUG_DESCRIPTION' },
  { key: 'knownFailingTest', cls: 'KNOWN_FAILING_TEST' },
  { key: 'explanation', cls: 'GROUND_TRUTH_EXPLANATION' },
];

export function detectBenchmarkLeakage(
  visible: ReasonerVisibleContext,
  hidden: HiddenGroundTruth,
): readonly BenchmarkLeakageClass[] {
  const haystack = visible.blobs.join('\n');
  const leaked: BenchmarkLeakageClass[] = [];
  for (const field of LEAK_FIELDS) {
    const secret = hidden[field.key];
    if (typeof secret === 'string' && secret.length > 0 && haystack.includes(secret)) leaked.push(field.cls);
  }
  return leaked;
}

export function assertNoBenchmarkLeakage(visible: ReasonerVisibleContext, hidden: HiddenGroundTruth): void {
  const leaked = detectBenchmarkLeakage(visible, hidden);
  if (leaked.length > 0) throw new Error(`BENCHMARK_GROUND_TRUTH_LEAK:${leaked.join(',')}`);
}
