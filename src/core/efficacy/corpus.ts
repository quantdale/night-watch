// ---------------------------------------------------------------------------
// Fixed W8 efficacy corpus.
//
// The corpus is FIXED and declared here so a before/after comparison cannot be
// tuned by silently changing which cases are scored. It reuses the existing
// leak-isolated benchmark corpus (`defineBenchmarkCase` already fails closed if
// a fixture embeds its own answer) and keeps the negative control in scope so
// exploring more effectively cannot quietly buy a false positive.
//
// Pure data selection. No I/O.
// ---------------------------------------------------------------------------

import { benchmarkFixtureCorpus } from '../benchmark/fixtures';
import type { DefinedBenchmarkCase } from '../benchmark/case';

/**
 * Fixed corpus identity. Bump only with a deliberate, documented change: the
 * before/after report records it so a comparison across different corpora
 * cannot be presented as an improvement.
 */
export const EFFICACY_CORPUS_ID = 'nightwatch.efficacy-corpus.v1' as const;

/**
 * Every case in the frozen synthetic benchmark corpus, in declaration order.
 * Three cases carry a reproducing visible discriminator, one negative control
 * carries a non-reproducing discriminator, and the remainder have no available
 * reproduction at all — so the corpus scores source targeting, hypothesis
 * grounding, verification and honest abstention, not one lucky case.
 */
export function efficacyCorpus(): readonly DefinedBenchmarkCase[] {
  return benchmarkFixtureCorpus();
}

export function efficacyCorpusIds(): readonly string[] {
  return Object.freeze(efficacyCorpus().map((item) => item.caseId));
}
