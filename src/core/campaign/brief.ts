// ---------------------------------------------------------------------------
// Phase 7 concise private morning brief.
// ---------------------------------------------------------------------------

import { buildMorningBrief, buildOvernightSummary } from '../triage/summaries';
import type { BugDossier, OvernightRunRecord } from '../triage/types';
import type { AnomalyCluster } from '../triage/types';
import {
  arraysExactlyEqual,
  assertExactKeys,
  assertEnum,
  assertNonNegativeInteger,
  assertString,
  requireRuntimeArray,
  requireRuntimeRecord,
} from './runtimeValidation';
import {
  CAMPAIGN_MORNING_BRIEF_VERSION,
  type CampaignManifest,
  type CampaignBriefFinding,
  type CampaignMorningBrief,
  type CampaignPrivacyStatus,
  type CampaignReproductionRecord,
  type CampaignResultClass,
  type CampaignSafetyVector,
} from './types';

function dossierSummary(dossier: BugDossier): CampaignBriefFinding {
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
  readonly reproductionQueue: readonly CampaignReproductionRecord[];
  readonly safety: CampaignSafetyVector;
  readonly privacy: CampaignPrivacyStatus;
  readonly nightwatchInternalIssues: readonly string[];
  readonly transientsAndNonFindings: readonly string[];
  readonly maxTopFindings?: number;
  /** Session-2 additive v2 dossier counts; top findings remain v1-only. */
  readonly semanticDossierCounts?: { readonly ready: number; readonly unresolved: number };
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
  const hasAnomalyObservation = input.clusters.some((cluster) => cluster.timingVariance !== 'TRANSIENT');
  const hasTransientObservation = input.runs.some((run) => run.result === 'TRANSIENT') || input.clusters.some((cluster) => cluster.timingVariance === 'TRANSIENT');
  const versionDrift = input.coverageGaps.includes('CAMPAIGN_VERSION_DRIFT');
  const budgetBlocked = input.resultClass === 'PARTIAL_BUDGET_EXHAUSTED'
    || input.coverageGaps.some((gap) => /BUDGET|MINIMIZATION/i.test(gap))
    || input.reproductionQueue.some((item) => item.state === 'BLOCKED' && /BUDGET/i.test(item.reasonCode ?? ''));
  const hasPendingReproduction = input.reproductionQueue.some((item) => ['PENDING', 'RUNNING', 'REPLAY_REQUIRED', 'BLOCKED'].includes(item.state));
  const headline = admitted > 0
    ? `${admitted} admitted finding(s) deserve attention first; ${input.clusters.length} private anomaly cluster(s) were observed.`
    : versionDrift
      ? 'CAMPAIGN VERSION DRIFT — RESUME REFUSED'
    : input.resultClass === 'PARTIAL_RUNTIME_INFRA_FAILURE' && input.nightwatchInternalIssues.some((issue) => issue.includes('FAILURE_STORM'))
      ? 'SHARED DEV FAILURE'
      : input.resultClass === 'PARTIAL_AUTH_BLOCKED' && !hasAnomalyObservation
        ? 'AUTH BLOCKED BEFORE PRODUCT WORK'
        : input.resultClass === 'PARTIAL_RUNTIME_INFRA_FAILURE' && !hasAnomalyObservation
          ? 'NIGHTWATCH INTERNAL DEFECT'
          : hasAnomalyObservation && budgetBlocked
            ? 'UNRESOLVED L0 CANDIDATES — REPRODUCTION BLOCKED BY BUDGET'
            : hasAnomalyObservation && (hasPendingReproduction || input.clusters.length > 0)
              ? 'UNRESOLVED L0 CANDIDATES — NO ADMITTED REPRODUCIBLE PRODUCT ANOMALIES'
              : hasTransientObservation
                ? 'TRANSIENTS NOT REPRODUCED'
                : budgetBlocked
                  ? 'REPRODUCTION BLOCKED BY BUDGET'
                  : 'NO ANOMALIES OBSERVED';
  const whatRan = [
    `mode=${input.manifest.mode}`,
    `journeys=${input.manifest.selectedJourneys.length}`,
    `envelopes=${input.manifest.selectedEnvelopes.length}`,
    `apiScenarios=${input.manifest.selectedApiScenarios.length}`,
    `seeds=${input.manifest.seedSet.length}`,
    `result=${input.resultClass}`,
    // Session-2 additive safe counts: only present when v2 dossiers exist so
    // historical briefs stay byte-compatible.
    ...(input.semanticDossierCounts !== undefined && input.semanticDossierCounts.ready + input.semanticDossierCounts.unresolved > 0
      ? [`semanticDossiersV2Ready=${input.semanticDossierCounts.ready}`, `semanticDossiersV2Unresolved=${input.semanticDossierCounts.unresolved}`]
      : []),
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

/** Validate the allowlisted morning-brief DTO before private persistence. */
export function validateCampaignMorningBrief(value: unknown): CampaignMorningBrief {
  const brief = requireRuntimeRecord(value, 'CAMPAIGN_MORNING_BRIEF_INTEGRITY_INVALID');
  assertExactKeys(brief, ['schemaVersion', 'campaignId', 'resultClass', 'headline', 'campaign', 'whatRan', 'topFindings', 'strongestReproductions', 'sourceAreasToInspect', 'transientsAndNonFindings', 'coverageGaps', 'nightwatchInternalIssues', 'safety', 'privacy', 'externalPublication'], 'CAMPAIGN_MORNING_BRIEF_INTEGRITY_INVALID');
  assertString(brief.schemaVersion, 'CAMPAIGN_MORNING_BRIEF_SCHEMA');
  if (brief.schemaVersion !== CAMPAIGN_MORNING_BRIEF_VERSION) throw new Error('CAMPAIGN_MORNING_BRIEF_SCHEMA');
  assertString(brief.campaignId, 'CAMPAIGN_MORNING_BRIEF_ID');
  assertEnum(brief.resultClass, ['COMPLETE_CLEAN', 'COMPLETE_WITH_FINDINGS', 'PARTIAL_BUDGET_EXHAUSTED', 'PARTIAL_AUTH_BLOCKED', 'PARTIAL_SAFETY_BLOCKED', 'PARTIAL_RUNTIME_INFRA_FAILURE', 'ABORTED_OWNER_POLICY', 'INCOMPLETE_PROCESS_INTERRUPTION'], 'CAMPAIGN_MORNING_BRIEF_RESULT');
  assertString(brief.headline, 'CAMPAIGN_MORNING_BRIEF_HEADLINE');
  const campaign = requireRuntimeRecord(brief.campaign, 'CAMPAIGN_MORNING_BRIEF_CAMPAIGN');
  assertExactKeys(campaign, ['campaignId', 'mode', 'manifestFingerprint', 'datastoreStatus', 'phase6'], 'CAMPAIGN_MORNING_BRIEF_CAMPAIGN');
  assertString(campaign.campaignId, 'CAMPAIGN_MORNING_BRIEF_CAMPAIGN_ID');
  if (campaign.campaignId !== brief.campaignId) throw new Error('CAMPAIGN_MORNING_BRIEF_ID_MISMATCH');
  assertEnum(campaign.mode, ['CHANGE_DIRECTED', 'BASELINE_HEALTH', 'COVERAGE_EXPANSION', 'REPRODUCTION_ONLY', 'LOCAL_SYNTHETIC'], 'CAMPAIGN_MORNING_BRIEF_MODE');
  assertString(campaign.manifestFingerprint, 'CAMPAIGN_MORNING_BRIEF_FINGERPRINT');
  if (campaign.datastoreStatus !== 'OUT_OF_SCOPE_BY_OWNER' || campaign.phase6 !== 'FROZEN_BY_OWNER') throw new Error('CAMPAIGN_MORNING_BRIEF_SCOPE_INVALID');
  for (const key of ['whatRan', 'strongestReproductions', 'sourceAreasToInspect', 'transientsAndNonFindings', 'coverageGaps', 'nightwatchInternalIssues']) {
    const values = requireRuntimeArray(brief[key], `CAMPAIGN_MORNING_BRIEF_${key.toUpperCase()}`);
    for (const valueItem of values) assertString(valueItem, `CAMPAIGN_MORNING_BRIEF_${key.toUpperCase()}_ITEM`);
  }
  const topFindings = requireRuntimeArray(brief.topFindings, 'CAMPAIGN_MORNING_BRIEF_TOP_FINDINGS');
  for (const item of topFindings) {
    const finding = requireRuntimeRecord(item, 'CAMPAIGN_MORNING_BRIEF_FINDING');
    assertExactKeys(finding, ['candidateId', 'title', 'priority', 'confidence', 'evidenceLevel', 'minimalSequence', 'faultBoundary', 'reproductionCount'], 'CAMPAIGN_MORNING_BRIEF_FINDING');
    for (const key of ['candidateId', 'title', 'faultBoundary']) assertString(finding[key], `CAMPAIGN_MORNING_BRIEF_FINDING_${key.toUpperCase()}`);
    assertEnum(finding.priority, ['P0', 'P1', 'P2', 'P3', 'UNRANKED'], 'CAMPAIGN_MORNING_BRIEF_FINDING_PRIORITY');
    assertEnum(finding.confidence, ['HIGH', 'MEDIUM', 'LOW', 'UNRESOLVED'], 'CAMPAIGN_MORNING_BRIEF_FINDING_CONFIDENCE');
    assertEnum(finding.evidenceLevel, ['L0', 'L1', 'L2', 'L3', 'L4'], 'CAMPAIGN_MORNING_BRIEF_FINDING_EVIDENCE');
    const sequence = requireRuntimeArray(finding.minimalSequence, 'CAMPAIGN_MORNING_BRIEF_FINDING_SEQUENCE');
    for (const action of sequence) assertString(action, 'CAMPAIGN_MORNING_BRIEF_FINDING_SEQUENCE_ITEM');
    assertNonNegativeInteger(finding.reproductionCount, 'CAMPAIGN_MORNING_BRIEF_FINDING_REPRODUCTION_COUNT');
  }
  const safety = requireRuntimeRecord(brief.safety, 'CAMPAIGN_MORNING_BRIEF_SAFETY');
  assertExactKeys(safety, ['productionAttempts', 'proxyViolations', 'unknownDestinations', 'unknownApprovals', 'productMutations', 'actionCausedUnknown', 'databaseQueries', 'infrastructureQueries', 'externalPublicationAttempts'], 'CAMPAIGN_MORNING_BRIEF_SAFETY');
  for (const key of Object.keys(safety)) assertNonNegativeInteger(safety[key], `CAMPAIGN_MORNING_BRIEF_SAFETY_${key.toUpperCase()}`);
  const privacy = requireRuntimeRecord(brief.privacy, 'CAMPAIGN_MORNING_BRIEF_PRIVACY');
  assertExactKeys(privacy, ['result', 'rawBodiesPersisted', 'customerValuesPersisted', 'credentialsPersisted', 'cookiesPersisted', 'tokensPersisted', 'domPersisted', 'screenshotsPersisted', 'authenticatedTracesPersisted'], 'CAMPAIGN_MORNING_BRIEF_PRIVACY');
  assertEnum(privacy.result, ['PASS', 'BLOCKED'], 'CAMPAIGN_MORNING_BRIEF_PRIVACY_RESULT');
  for (const key of Object.keys(privacy).filter((key) => key !== 'result')) assertNonNegativeInteger(privacy[key], `CAMPAIGN_MORNING_BRIEF_PRIVACY_${key.toUpperCase()}`);
  if (privacy.result === 'PASS' && Object.entries(privacy).some(([key, item]) => key !== 'result' && item !== 0)) throw new Error('CAMPAIGN_MORNING_BRIEF_PRIVACY_MISMATCH');
  if (brief.externalPublication !== 'PROHIBITED') throw new Error('CAMPAIGN_MORNING_BRIEF_PUBLICATION_INVALID');
  return brief as unknown as CampaignMorningBrief;
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
