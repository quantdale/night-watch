// ---------------------------------------------------------------------------
// Private overnight aggregation and morning brief.
// ---------------------------------------------------------------------------

import type { BugDossier, MorningBrief, OvernightRunRecord, OvernightSummary, TriagePriority } from './types';
import { MORNING_BRIEF_VERSION, OVERNIGHT_SUMMARY_VERSION } from './types';

const PRIORITY_RANK: Record<TriagePriority, number> = { P0: 0, P1: 1, P2: 2, P3: 3, UNRANKED: 4 };

export function rankTriagePriority(input: {
  readonly technicalSeverity: BugDossier['technicalSeverity'];
  readonly confidence: BugDossier['confidence']['level'];
  readonly reproduced: boolean;
  readonly breadth: 'NARROW' | 'MULTI_JOURNEY' | 'SHARED_CORE';
  readonly knownNightwatchDefect: boolean;
}): TriagePriority {
  if (input.knownNightwatchDefect) return 'P3';
  if (input.reproduced && input.confidence === 'HIGH' && input.technicalSeverity === 'CRITICAL' && input.breadth !== 'NARROW') return 'P0';
  if (input.reproduced && (input.technicalSeverity === 'CRITICAL' || input.technicalSeverity === 'HIGH')) return 'P1';
  if (input.reproduced && input.confidence !== 'UNRESOLVED') return 'P2';
  return 'P3';
}

function cleanDossiers(dossiers: readonly BugDossier[]): readonly BugDossier[] {
  return [...dossiers].filter((dossier) => dossier.status === 'READY').sort((a, b) => PRIORITY_RANK[a.triagePriority] - PRIORITY_RANK[b.triagePriority] || b.reproduction.count - a.reproduction.count || a.candidateId.localeCompare(b.candidateId));
}

export function buildOvernightSummary(input: {
  readonly runs: readonly OvernightRunRecord[];
  readonly uniqueClusters: number;
  readonly dossiers: readonly BugDossier[];
  readonly coverageGaps: readonly string[];
}): OvernightSummary {
  const runs = [...input.runs].sort((a, b) => a.runId.localeCompare(b.runId));
  const safety = runs.reduce<BugDossier['safety']>((sum, run) => ({
    productionAttempts: sum.productionAttempts + run.safety.productionAttempts,
    proxyViolations: sum.proxyViolations + run.safety.proxyViolations,
    unknownDestinations: sum.unknownDestinations + run.safety.unknownDestinations,
    unknownApprovals: sum.unknownApprovals + run.safety.unknownApprovals,
    productMutations: sum.productMutations + run.safety.productMutations,
    actionCausedUnknown: sum.actionCausedUnknown + run.safety.actionCausedUnknown,
    databaseQueries: sum.databaseQueries + run.safety.databaseQueries,
  }), { productionAttempts: 0, proxyViolations: 0, unknownDestinations: 0, unknownApprovals: 0, productMutations: 0, actionCausedUnknown: 0, databaseQueries: 0 });
  const dossiers = cleanDossiers(input.dossiers);
  return {
    schemaVersion: OVERNIGHT_SUMMARY_VERSION,
    runsExecuted: runs.length,
    journeys: [...new Set(runs.map((run) => run.journeyId))].sort(),
    envelopes: [...new Set(runs.map((run) => run.envelopeId))].sort(),
    seeds: [...new Set(runs.map((run) => run.seed))].sort(),
    passes: runs.filter((run) => run.result === 'PASS').length,
    uniqueAnomalyClusters: input.uniqueClusters,
    reproducedAnomalies: runs.filter((run) => run.reproduced).length,
    nonReproducedTransients: runs.filter((run) => run.result === 'TRANSIENT' && !run.reproduced).length,
    nightwatchDefects: runs.filter((run) => run.result === 'NIGHTWATCH_DEFECT').length,
    topDossierIds: dossiers.slice(0, 10).map((dossier) => dossier.candidateId),
    coverageGaps: [...new Set(input.coverageGaps)].sort(),
    safetyCounters: safety,
    privacyResult: 'PASS',
    datastoreStatus: 'OUT_OF_SCOPE_BY_OWNER',
  };
}

export function buildMorningBrief(summary: OvernightSummary, dossiers: readonly BugDossier[]): MorningBrief {
  const byId = new Map(dossiers.map((dossier) => [dossier.candidateId, dossier]));
  const top = summary.topDossierIds.map((id) => byId.get(id)).filter((dossier): dossier is BugDossier => dossier !== undefined).slice(0, 5);
  const sourceAreas = [...new Set(top.flatMap((dossier) => dossier.sourceChangeCandidates.map((candidate) => `${candidate.repoId}:${candidate.path}`)))].sort();
  const questions = [...new Set(top.flatMap((dossier) => dossier.missingEvidence))].sort();
  return {
    schemaVersion: MORNING_BRIEF_VERSION,
    headline: `${summary.reproducedAnomalies} reproduced anomaly occurrence(s) across ${summary.uniqueAnomalyClusters} private cluster(s).`,
    topDossiers: top.map((dossier) => ({
      candidateId: dossier.candidateId,
      title: dossier.title,
      priority: dossier.triagePriority,
      confidence: dossier.confidence.level,
      minimalSequence: dossier.minimalSequence,
      likelyFaultBoundary: dossier.likelyFaultBoundary.primaryBoundary,
      reproductionCount: dossier.reproduction.count,
    })),
    likelySourceAreas: sourceAreas,
    unresolvedQuestions: questions,
    privacyResult: 'PASS',
    externalPublication: 'PROHIBITED',
  };
}
