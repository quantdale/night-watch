// ---------------------------------------------------------------------------
// W8 efficacy corpus runner.
//
// Runs the SAME investigator policy over the SAME fixed corpus twice: once
// with every turn request projected down to the frozen W7 field set
// (`W7_BASELINE`) and once with the live request (`W8_MEMORY`). Both runs
// execute at one commit against one substrate, so the delta isolates the
// reasoner-visible contract instead of confounding it with model, corpus or
// provider changes.
//
// Scoring reuses the untouched `scoreBenchmarkCandidate` /
// `classifyVerifiedBenchmarkTier`. Hidden truth is read only by the existing
// scorer AFTER the hunt terminates; `runBenchmarkHunt` still fails closed if a
// hidden field ever reaches a reasoner request.
// ---------------------------------------------------------------------------

import { defaultBenchmarkBudgetPolicy, runBenchmarkHunt } from '../benchmark/hunt';
import { classifyVerifiedBenchmarkTier } from '../benchmark/score';
import { isNegativeControl } from '../benchmark/score';
import type { DefinedBenchmarkCase } from '../benchmark/case';
import { efficacyCorpus } from './corpus';
import { aggregateEfficacyMetrics, compareEfficacy, deriveEfficacyCaseMetrics } from './metrics';
import { createSimulatedInvestigatorDriver, SIMULATED_INVESTIGATOR_ID } from './simulatedInvestigator';
import {
  EFFICACY_CORPUS_REPORT_VERSION,
  type EfficacyCaseMetrics,
  type EfficacyComparison,
  type EfficacyContextMode,
  type EfficacyCorpusReport,
} from './types';

export interface RunEfficacyCorpusOptions {
  readonly mode: EfficacyContextMode;
  readonly cases?: readonly DefinedBenchmarkCase[];
  readonly maxTurns?: number;
}

/** Turn ceiling per case. Identical for both modes so cost is comparable. */
export const EFFICACY_MAX_TURNS = 16 as const;

export async function runEfficacyCorpus(options: RunEfficacyCorpusOptions): Promise<EfficacyCorpusReport> {
  const cases = options.cases ?? efficacyCorpus();
  const maxTurns = options.maxTurns ?? EFFICACY_MAX_TURNS;
  const metrics: EfficacyCaseMetrics[] = [];
  for (const definedCase of cases) {
    const driver = createSimulatedInvestigatorDriver({ mode: options.mode });
    const hunt = await runBenchmarkHunt(definedCase, {
      reasoner: driver,
      budgetPolicy: defaultBenchmarkBudgetPolicy(),
      maxTurns,
    });
    const verifiedTier = classifyVerifiedBenchmarkTier({
      admitted: hunt.admitted,
      score: hunt.score,
      mechanicalReproductionCount: hunt.reproductionCount,
      leakage: hunt.leaked,
    });
    metrics.push(
      deriveEfficacyCaseMetrics({
        caseId: definedCase.caseId,
        mode: options.mode,
        state: hunt.runtimeState,
        terminationReason: hunt.terminationReason,
        history: hunt.investigationHistory,
        negativeControl: isNegativeControl(definedCase.hidden),
        outcome: hunt.outcome,
        verifiedTier,
        exactRediscovery: hunt.outcome === 'EXACT_REDISCOVERY',
        leaked: hunt.leaked,
      }),
    );
  }
  return {
    schemaVersion: EFFICACY_CORPUS_REPORT_VERSION,
    mode: options.mode,
    investigatorId: SIMULATED_INVESTIGATOR_ID,
    corpusIds: Object.freeze(cases.map((item) => item.caseId)),
    cases: Object.freeze(metrics),
    aggregate: aggregateEfficacyMetrics(metrics),
  };
}

export interface EfficacyBeforeAfter {
  readonly baseline: EfficacyCorpusReport;
  readonly candidate: EfficacyCorpusReport;
  readonly comparison: EfficacyComparison;
}

/** Run both modes over one fixed corpus and compare. */
export async function runEfficacyBeforeAfter(
  options?: Omit<RunEfficacyCorpusOptions, 'mode'>,
): Promise<EfficacyBeforeAfter> {
  const baseline = await runEfficacyCorpus({ ...options, mode: 'W7_BASELINE' });
  const candidate = await runEfficacyCorpus({ ...options, mode: 'W8_MEMORY' });
  return { baseline, candidate, comparison: compareEfficacy(baseline.aggregate, candidate.aggregate) };
}
