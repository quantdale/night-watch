// ---------------------------------------------------------------------------
// Phase 7 concise private morning brief.
// ---------------------------------------------------------------------------

import { buildMorningBrief, buildOvernightSummary } from '../triage/summaries';
import type { BugDossier, OvernightRunRecord } from '../triage/types';
import type { AnomalyCluster } from '../triage/types';
import {
  CAMPAIGN_MORNING_BRIEF_VERSION,
  type CampaignManifest,
  type CampaignMorningBrief,
  type CampaignPrivacyStatus,
  type CampaignResultClass,
  type CampaignSafetyVector,
} from './types';

function dossierSummary(dossier: BugDossier): Readonly<Record<string, unknown>> {
  return {
    candidateId: dossier.candidateId,
    title: dossier.title,
    priority: dossier.triagePriority,
    confidence: dossier.confidence.level,
    evidenceLevel: dossier.evidenceLevel,
    minimalSequence: dossier.minimalSequence,
    faultBoundary: dossier.likelyFaultBoundary.primaryBoundary,
    reproductionCount: dossier.reproduction.count,
  };
}
export function buildCampaignMorningBrief(input: {
  readonly manifest: CampaignManifest;
  readonly resultClass: CampaignResultClass;
  readonly runs: readonly OvernightRunRecord[];
  readonly clusters: readonly AnomalyCluster[];
  readonly dossiers: readonly BugDossier[];
  readonly coverageGaps: readonly string[];
  readonly safety: CampaignSafetyVector;
  readonly privacy: CampaignPrivacyStatus;
  readonly nightwatchInternalIssues: readonly string[];
  readonly transientsAndNonFindings: readonly string[];
  readonly maxTopFindings?: number;
}): CampaignMorningBrief {
  const limit = Math.max(1, Math.min(3, input.maxTopFindings ?? 3));
  const summary = buildOvernightSummary({
    runs: input.runs,
    uniqueClusters: input.clusters.length,
    dossiers: input.dossiers,
    coverageGaps: input.coverageGaps,
  });
  const triageBrief = buildMorningBrief(summary, input.dossiers);
  const topDossiers = input.dossiers
    .filter((dossier) => dossier.status === 'READY')
    .sort((a, b) => a.triagePriority.localeCompare(b.triagePriority) || a.candidateId.localeCompare(b.candidateId))
    .slice(0, limit);
  const admitted = topDossiers.length;
  const headline = admitted === 0
    ? input.resultClass === 'PARTIAL_RUNTIME_INFRA_FAILURE' && input.nightwatchInternalIssues.some((issue) => issue.includes('FAILURE_STORM'))
      ? 'SHARED DEV FAILURE / CAMPAIGN DEGRADED — NO ADMITTED PRODUCT ANOMALIES'
      : 'NO ADMITTED PRODUCT ANOMALIES'
    : `${admitted} finding(s) deserve attention first; ${input.clusters.length} private anomaly cluster(s) were observed.`;
  const whatRan = [
    `mode=${input.manifest.mode}`,
    `journeys=${input.manifest.selectedJourneys.length}`,
    `envelopes=${input.manifest.selectedEnvelopes.length}`,
    `apiScenarios=${input.manifest.selectedApiScenarios.length}`,
    `seeds=${input.manifest.seedSet.length}`,
    `result=${input.resultClass}`,
  ];
  const strongest = topDossiers
    .filter((dossier) => dossier.reproduction.result === 'REPRODUCED' || dossier.reproduction.result === 'BOUNDED')
    .map((dossier) => `${dossier.candidateId} ${dossier.evidenceLevel}/${dossier.confidence.level}`);
  const sourceAreas = [...new Set(topDossiers.flatMap((dossier) => dossier.sourceChangeCandidates.map((candidate) => `${candidate.repoId}:${candidate.path}`)))].sort();
  return {
    schemaVersion: CAMPAIGN_MORNING_BRIEF_VERSION,
    campaignId: input.manifest.campaignId,
    resultClass: input.resultClass,
    headline,
    campaign: {
      campaignId: input.manifest.campaignId,
      mode: input.manifest.mode,
      manifestFingerprint: input.manifest.manifestFingerprint,
      datastoreStatus: 'OUT_OF_SCOPE_BY_OWNER',
      phase6: 'FROZEN_BY_OWNER',
    },
    whatRan,
    topFindings: topDossiers.map(dossierSummary),
    strongestReproductions: strongest.length > 0 ? strongest : ['None — no admitted anomaly reached fresh deterministic reproduction.'],
    sourceAreasToInspect: sourceAreas.length > 0 ? sourceAreas : ['None — no source-change candidate was established.'],
    transientsAndNonFindings: [
      ...input.transientsAndNonFindings,
      'Historical J2 font 502: L0_NOT_REPRODUCED; not promoted.',
      'Historical malformed JSON: UNKNOWN/HISTORICAL_ANOMALY_PRESENT; not deliberately replayed.',
    ].filter((value, index, all) => all.indexOf(value) === index).sort(),
    coverageGaps: [...new Set(input.coverageGaps)].sort(),
    nightwatchInternalIssues: [...new Set(input.nightwatchInternalIssues)].sort(),
    safety: input.safety,
    privacy: input.privacy,
    externalPublication: 'PROHIBITED',
  };
}

/** Render the structured brief as a short owner-only text report. */
export function renderCampaignMorningBrief(brief: CampaignMorningBrief): string {
  const lines = [
    brief.headline,
    '',
    'CAMPAIGN',
    ...Object.entries(brief.campaign).map(([key, value]) => `${key}: ${String(value)}`),
    '',
    'WHAT RAN',
    ...brief.whatRan.map((item) => `- ${item}`),
    '',
    'TOP FINDINGS',
    ...(brief.topFindings.length > 0 ? brief.topFindings.map((item) => `- ${String(item.candidateId)} ${String(item.priority)} ${String(item.confidence)} ${String(item.faultBoundary)}`) : ['- none']),
    '',
    'STRONGEST REPRODUCTIONS',
    ...brief.strongestReproductions.map((item) => `- ${item}`),
    '',
    'SOURCE AREAS TO INSPECT',
    ...brief.sourceAreasToInspect.map((item) => `- ${item}`),
    '',
    'TRANSIENTS / NON-FINDINGS',
    ...brief.transientsAndNonFindings.map((item) => `- ${item}`),
    '',
    'COVERAGE GAPS',
    ...(brief.coverageGaps.length > 0 ? brief.coverageGaps.map((item) => `- ${item}`) : ['- none recorded']),
    '',
    'NIGHTWATCH INTERNAL ISSUES',
    ...(brief.nightwatchInternalIssues.length > 0 ? brief.nightwatchInternalIssues.map((item) => `- ${item}`) : ['- none']),
    '',
    'SAFETY',
    JSON.stringify(brief.safety),
    '',
    'PRIVACY',
    `result=${brief.privacy.result}; external publication=${brief.externalPublication}`,
  ];
  return `${lines.join('\n')}\n`;
}
