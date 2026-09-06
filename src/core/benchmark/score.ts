// ---------------------------------------------------------------------------
// Lane F: deterministic scoring of a hunt candidate against hidden truth.
// Pure data + string comparison. Thresholds are documented in the lane SPEC.
// ---------------------------------------------------------------------------

import type { BenchmarkOutcome, HiddenGroundTruth } from '../agentProtocol/benchmark';

export const BENCHMARK_EXACT_MIN_FILE_RECALL = 0.5;
export const BENCHMARK_EXACT_MIN_KEYWORD_RECALL = 0.5;
export const BENCHMARK_PARTIAL_MIN_KEYWORD_RECALL = 0.5;
export const BENCHMARK_PARTIAL_MIN_FILE_RECALL = 0.5;
export const BENCHMARK_PARTIAL_MIN_KEYWORD_RECALL_WITH_FILES = 0.25;
export const BENCHMARK_ROOT_CAUSE_MIN_KEYWORD_RECALL = 0.25;

const STOPWORDS: ReadonlySet<string> = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'over', 'under',
  'when', 'where', 'which', 'while', 'after', 'before', 'then', 'than', 'also',
  'only', 'just', 'are', 'was', 'were', 'has', 'had', 'have', 'been', 'will',
  'would', 'should', 'could', 'there', 'their', 'they', 'them', 'its', 'per',
]);

/** Extract `+++ b/<path>` targets from a unified fix diff. */
export function parseFixDiffFiles(fixDiff: string | null): readonly string[] {
  if (typeof fixDiff !== 'string' || fixDiff.length === 0) return [];
  const files: string[] = [];
  for (const line of fixDiff.split('\n')) {
    const match = /^\+\+\+ b\/(.+?)\s*$/.exec(line.trim());
    if (match !== null && match[1] !== undefined && match[1] !== '/dev/null' && !files.includes(match[1])) files.push(match[1]);
  }
  return files;
}

function candidateMentionsFile(lowered: string, file: string, files: readonly string[]): boolean {
  if (file.length > 0 && lowered.includes(file.toLowerCase())) return true;
  const base = file.split('/').pop() ?? '';
  if (base.length <= 10) return false;
  const unique = files.filter((item) => (item.split('/').pop() ?? '') === base).length === 1;
  return unique && lowered.includes(base.toLowerCase());
}


/** Stopword-filtered lowercase tokens (length > 3) of an explanation. */
export function explanationKeywords(explanation: string | null): readonly string[] {
  if (typeof explanation !== 'string' || explanation.length === 0) return [];
  const keywords: string[] = [];
  for (const token of explanation.toLowerCase().split(/[^a-z0-9]+/)) {
    if (token.length > 3 && !STOPWORDS.has(token) && !keywords.includes(token)) keywords.push(token);
  }
  return keywords;
}

export interface BenchmarkScore {
  readonly outcome: BenchmarkOutcome;
  readonly testMatch: boolean;
  readonly fileHits: number;
  readonly fileTotal: number;
  readonly fileRecall: number;
  readonly keywordRecall: number;
  readonly keywordTotal: number;
}

export function isNegativeControl(hidden: HiddenGroundTruth): boolean {
  return (
    hidden.fixCommit === null &&
    hidden.fixDiff === null &&
    hidden.issueTitle === null &&
    hidden.bugDescription === null &&
    hidden.knownFailingTest === null &&
    hidden.explanation === null
  );
}

/**
 * Score candidate text (hunt hypothesis statements + candidate ids) against
 * hidden truth. Empty candidates always MISS. On negative controls a proposed
 * candidate is a FALSE_POSITIVE; a no-finding hypothesis is a MISS.
 * When hidden.fixDiff is not a unified diff (mined locator strings), optional
 * visibleFiles — pre-fix snapshot paths — are the file-recall set.
 */
export function scoreBenchmarkCandidate(
  candidateText: string,
  hidden: HiddenGroundTruth,
  options?: { readonly proposed?: boolean; readonly visibleFiles?: readonly string[] },
): BenchmarkScore {
  const text = typeof candidateText === 'string' ? candidateText : '';
  if (isNegativeControl(hidden)) {
    const falsePositive = options?.proposed === true;
    return {
      outcome: falsePositive ? 'FALSE_POSITIVE' : 'MISS',
      testMatch: false,
      fileHits: 0,
      fileTotal: 0,
      fileRecall: 0,
      keywordRecall: 0,
      keywordTotal: 0,
    };
  }
  if (text.trim().length === 0) {
    return { outcome: 'MISS', testMatch: false, fileHits: 0, fileTotal: 0, fileRecall: 0, keywordRecall: 0, keywordTotal: 0 };
  }
  const lowered = text.toLowerCase();
  const testMatch =
    typeof hidden.knownFailingTest === 'string' &&
    hidden.knownFailingTest.length > 0 &&
    text.includes(hidden.knownFailingTest);
  const filesFromDiff = parseFixDiffFiles(hidden.fixDiff);
  const files = filesFromDiff.length > 0
    ? filesFromDiff
    : (options?.visibleFiles ?? []).filter((file) => file.length > 0);
  let fileHits = 0;
  for (const file of files) {
    if (candidateMentionsFile(lowered, file, files)) fileHits += 1;
  }
  const fileTotal = files.length;
  const fileRecall = fileTotal === 0 ? 1 : fileHits / fileTotal;
  const keywords = explanationKeywords(hidden.explanation);
  let keywordHits = 0;
  for (const keyword of keywords) {
    if (lowered.includes(keyword)) keywordHits += 1;
  }
  const keywordTotal = keywords.length;
  const keywordRecall = keywordTotal === 0 ? 0 : keywordHits / keywordTotal;

  let outcome: BenchmarkOutcome = 'MISS';
  if (testMatch && fileRecall >= BENCHMARK_EXACT_MIN_FILE_RECALL && keywordRecall >= BENCHMARK_EXACT_MIN_KEYWORD_RECALL) {
    outcome = 'EXACT_REDISCOVERY';
  } else if (
    testMatch ||
    keywordRecall >= BENCHMARK_PARTIAL_MIN_KEYWORD_RECALL ||
    (fileRecall >= BENCHMARK_PARTIAL_MIN_FILE_RECALL && keywordRecall >= BENCHMARK_PARTIAL_MIN_KEYWORD_RECALL_WITH_FILES)
  ) {
    outcome = 'PARTIAL_REDISCOVERY';
  } else if (fileHits >= 1 || keywordRecall >= BENCHMARK_ROOT_CAUSE_MIN_KEYWORD_RECALL) {
    outcome = 'SAME_ROOT_CAUSE_ALTERNATE';
  }
  return { outcome, testMatch, fileHits, fileTotal, fileRecall, keywordRecall, keywordTotal };
}
