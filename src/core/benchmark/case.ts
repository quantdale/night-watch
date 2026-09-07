// ---------------------------------------------------------------------------
// Lane F: historical replay case definition + reasoner-visible construction.
// Ground truth never enters the visible context; construction is fail-closed
// through the frozen assertNoBenchmarkLeakage.
// ---------------------------------------------------------------------------

import {
  assertNoBenchmarkLeakage,
  BENCHMARK_CASE_VERSION,
  type BenchmarkCase,
  type HiddenGroundTruth,
  type ReasonerVisibleContext,
} from '../agentProtocol/benchmark';
import { parseMinedTestReplayDescriptor, type MinedTestReplayDescriptor } from './containedTestReplay';
import { parseVisibleDiscriminator, type VisibleDiscriminator } from './visibleRepro';

export const BENCHMARK_CORPUS_CATEGORIES = [
  'billing',
  'api',
  'backend',
  'frontend',
  'data',
  'integration',
  'regression',
  'state-transition',
] as const;
export type BenchmarkCorpusCategory = (typeof BENCHMARK_CORPUS_CATEGORIES)[number];

/** Pre-fix material the reasoner is allowed to see. Must never contain hidden strings. */
export interface BenchmarkPreFixView {
  readonly symptomReport: string;
  readonly sourceSnapshot: string;
  readonly reproSteps: string;
  /** Optional visible discriminator. Never hidden ground truth. */
  readonly discriminator?: VisibleDiscriminator | null;
}

export interface DefinedBenchmarkCase extends BenchmarkCase {
  readonly productFamily: string;
  readonly category: BenchmarkCorpusCategory;
  readonly preFix: BenchmarkPreFixView;
  /**
   * Hidden-only contained-replay coordinates for mined cases (null for
   * synthetic fixtures). Never enters the visible context: it names the
   * fix commit and the fix-added test file, both hidden ground truth.
   */
  readonly minedReplay: MinedTestReplayDescriptor | null;
}

export interface BenchmarkCaseInput {
  readonly caseId: string;
  readonly productFamily: string;
  readonly category: BenchmarkCorpusCategory;
  readonly hidden: HiddenGroundTruth;
  readonly preFix: BenchmarkPreFixView;
  readonly minedReplay?: MinedTestReplayDescriptor | null;
}

export class BenchmarkCaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BenchmarkCaseError';
  }
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function preFixBlob(value: unknown, field: string, caseId: string): string {
  if (!nonEmpty(value)) throw new BenchmarkCaseError(`case ${caseId}: preFix.${field} must be non-empty`);
  return value;
}

/** Validate + freeze a replay case. Hidden fields may be null (negative controls). */
export function defineBenchmarkCase(input: BenchmarkCaseInput): DefinedBenchmarkCase {
  if (!nonEmpty(input.caseId)) throw new BenchmarkCaseError('caseId must be a non-empty string');
  if (!nonEmpty(input.productFamily)) throw new BenchmarkCaseError(`case ${input.caseId}: productFamily must be non-empty`);
  if (!(BENCHMARK_CORPUS_CATEGORIES as readonly string[]).includes(input.category)) {
    throw new BenchmarkCaseError(`case ${input.caseId}: unknown category ${String(input.category)}`);
  }
  if (input.hidden === null || typeof input.hidden !== 'object') {
    throw new BenchmarkCaseError(`case ${input.caseId}: hidden ground truth must be an object`);
  }
  const rawDiscriminator = input.preFix?.discriminator;
  const discriminator =
    rawDiscriminator === undefined || rawDiscriminator === null
      ? null
      : parseVisibleDiscriminator(rawDiscriminator);
  if (rawDiscriminator !== undefined && rawDiscriminator !== null && discriminator === null) {
    throw new BenchmarkCaseError(`case ${input.caseId}: preFix.discriminator is malformed`);
  }
  const rawReplay = input.minedReplay;
  const minedReplay =
    rawReplay === undefined || rawReplay === null ? null : parseMinedTestReplayDescriptor(rawReplay);
  if (rawReplay !== undefined && rawReplay !== null && minedReplay === null) {
    throw new BenchmarkCaseError(`case ${input.caseId}: minedReplay descriptor is malformed`);
  }
  const defined: DefinedBenchmarkCase = Object.freeze({
    schemaVersion: BENCHMARK_CASE_VERSION,
    caseId: input.caseId,
    productFamily: input.productFamily,
    category: input.category,
    hidden: Object.freeze({ ...input.hidden }),
    preFix: Object.freeze({
      symptomReport: preFixBlob(input.preFix?.symptomReport, 'symptomReport', input.caseId),
      sourceSnapshot: preFixBlob(input.preFix?.sourceSnapshot, 'sourceSnapshot', input.caseId),
      reproSteps: preFixBlob(input.preFix?.reproSteps, 'reproSteps', input.caseId),
      discriminator,
    }),
    minedReplay,
  });
  // Fail-closed at definition time: fixture authors must not embed answers.
  const leakBlobs = [defined.preFix.symptomReport, defined.preFix.sourceSnapshot, defined.preFix.reproSteps];
  if (discriminator !== null) leakBlobs.push(JSON.stringify(discriminator));
  assertNoBenchmarkLeakage({ blobs: leakBlobs }, defined.hidden);
  if (minedReplay !== null) {
    // The descriptor re-states hidden secrets (fix SHA, added test path)
    // for the contained replay; prove they are absent from the visible
    // material even when hidden carries different values. The repository
    // id is intentionally not asserted: import paths in the snapshot may
    // legitimately contain it and it is not hidden ground truth.
    assertNoBenchmarkLeakage(
      { blobs: leakBlobs },
      {
        fixCommit: minedReplay.fixCommit,
        fixDiff: null,
        issueTitle: null,
        bugDescription: null,
        knownFailingTest: minedReplay.testPath,
        explanation: null,
      },
    );
  }
  return defined;
}

/**
 * Build the reasoner-visible context for a hunt. Only pre-fix blobs are
 * included; hidden ground truth is never referenced. Throws
 * BENCHMARK_GROUND_TRUTH_LEAK:* on any leakage (fail-closed).
 */
export function buildReasonerVisibleContext(defined: DefinedBenchmarkCase): ReasonerVisibleContext {
  const context: ReasonerVisibleContext = Object.freeze({
    blobs: Object.freeze([defined.preFix.symptomReport, defined.preFix.sourceSnapshot, defined.preFix.reproSteps]),
  });
  assertNoBenchmarkLeakage(context, defined.hidden);
  return context;
}
