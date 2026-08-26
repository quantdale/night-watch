// ---------------------------------------------------------------------------
// Nightwatch — deterministic source-to-Phase-24 eligibility census.
//
// This module is an additive projection over existing source-surface and
// Phase-24 authorities. It does not read source, select candidates, or infer
// hypothetical unlocks. Every row is categorical and safe for operator use.
// ---------------------------------------------------------------------------

import { safeSemanticDigest } from '../semanticCoverage/types';
import type { Phase24CandidatePortfolio, Phase24ReasonCode } from '../phase24/types';
import type { SourceSurfaceDiscovery } from './surfaces';
import type { SourceScanLanguage } from './scanTypes';
import type {
  RealSourceSurfaceDescriptor,
  SourceJoinState,
  SourceReadOnlyClassification,
  SourceSurfaceLifecycle,
} from './surfaceTypes';

export const REAL_SOURCE_ELIGIBILITY_CENSUS_VERSION = 'nightwatch.real-source-eligibility-census.v1' as const;

export const SOURCE_ELIGIBILITY_STAGE_NAMES = [
  'SOURCE_DISCOVERED',
  'ROUTE_PROVEN',
  'REQUEST_CONTRACT',
  'RESPONSE_CONTRACT',
  'SEMANTIC_CONTRACT',
  'MUTABILITY_CLASSIFICATION',
  'READ_ONLY_PROOF',
  'JOIN_GRAPH_REQUIREMENTS',
  'PHASE24_ELIGIBILITY',
] as const;
export type SourceEligibilityStageName = (typeof SOURCE_ELIGIBILITY_STAGE_NAMES)[number];

export const SOURCE_ELIGIBILITY_STAGE_STATUSES = [
  'PROVEN',
  'UNPROVEN',
  'UNSAFE',
  'AMBIGUOUS',
  'UNSUPPORTED',
  'STALE',
  'PARTIAL',
  'ELIGIBLE',
  'EXCLUDED',
] as const;
export type SourceEligibilityStageStatus = (typeof SOURCE_ELIGIBILITY_STAGE_STATUSES)[number];

export const SOURCE_ELIGIBILITY_REASON_FAMILIES = [
  'HARD_UNSAFE',
  'MECHANICAL_PROOF_GAP',
  'UNSUPPORTED_SYNTAX',
  'AMBIGUITY',
  'SOURCE_UNAVAILABLE_OR_STALE',
  'OWNER_POLICY',
  'SEMANTIC_OR_REPLAY_PREREQUISITE',
  'POLICY_EXCLUSION',
  'NONE',
] as const;
export type SourceEligibilityReasonFamily = (typeof SOURCE_ELIGIBILITY_REASON_FAMILIES)[number];

export interface SourceEligibilityStage {
  readonly stage: SourceEligibilityStageName;
  readonly status: SourceEligibilityStageStatus;
}

export interface SourceEligibilityChain {
  readonly stages: readonly SourceEligibilityStage[];
  readonly firstBlockingStage: SourceEligibilityStageName | null;
}

export interface SourceEligibilitySurfaceRow {
  readonly surfaceId: string;
  readonly operationId: string;
  readonly targetId: string | null;
  readonly repository: string;
  readonly routeLanguage: SourceScanLanguage;
  readonly handlerLanguage: SourceScanLanguage | 'UNKNOWN';
  readonly sourceCurrentness: RealSourceSurfaceDescriptor['currentness'];
  readonly lifecycle: SourceSurfaceLifecycle;
  readonly chain: SourceEligibilityChain;
  readonly sourceExclusionReasons: readonly string[];
  readonly phase24ReasonCodes: readonly Phase24ReasonCode[];
  readonly reasonFamilies: readonly SourceEligibilityReasonFamily[];
  readonly responseProofGapCodes: readonly string[];
  readonly semanticProofGapCodes: readonly string[];
}

export interface SourceEligibilityCodeCount {
  readonly code: string;
  readonly count: number;
}

export interface SourceEligibilityDistribution {
  readonly key: string;
  readonly surfaceCount: number;
  readonly routeProofCount: number;
  readonly requestContractCount: number;
  readonly responseContractCount: number;
  readonly semanticObservationCount: number;
  readonly mutationCapableCount: number;
  readonly readOnlyProvenCount: number;
  readonly mutabilityUnknownCount: number;
  readonly mutabilityAmbiguousCount: number;
  readonly phase24EligibleCount: number;
  readonly phase24ExcludedCount: number;
}

export interface SourceEligibilityCensusSummary {
  readonly totalOperations: number;
  readonly routeProofs: number;
  readonly requestContracts: number;
  readonly responseContracts: number;
  readonly semanticContractSurfaces: number;
  readonly semanticObservations: number;
  readonly joinsAttempted: number;
  readonly joinsProven: number;
  readonly joinsRejected: number;
  readonly mutationCapable: number;
  readonly readOnlyProven: number;
  readonly mutabilityUnknown: number;
  readonly mutabilityAmbiguous: number;
  readonly mutabilityUnsupported: number;
  readonly phase24Eligible: number;
  readonly phase24Excluded: number;
  readonly lifecycleCounts: readonly SourceEligibilityCodeCount[];
  readonly sourceCurrentnessCounts: readonly SourceEligibilityCodeCount[];
  readonly primaryBlockingStageCounts: readonly SourceEligibilityCodeCount[];
  readonly sourceExclusionReasonCounts: readonly SourceEligibilityCodeCount[];
  readonly phase24ReasonCounts: readonly SourceEligibilityCodeCount[];
  readonly reasonFamilyCounts: readonly SourceEligibilityCodeCount[];
  readonly proofGapFamilyCounts: readonly SourceEligibilityCodeCount[];
  readonly hardUnsafeExclusionCount: number;
  readonly mechanicalProofGapCount: number;
  readonly unsupportedSyntaxCount: number;
  readonly ambiguityCount: number;
  readonly sourceUnavailableOrStaleCount: number;
  readonly ownerPolicyCount: number;
  readonly semanticOrReplayPrerequisiteCount: number;
  readonly policyExclusionCount: number;
  readonly readOnlyExclusionCount: number;
  readonly readOnlyOnlySourceBlockerCount: number;
  readonly readOnlyWithOtherSourceBlockerCount: number;
  readonly sourceGapSurfaceCount: number;
  readonly rejectedDiagnosticCount: number;
  readonly repositories: readonly SourceEligibilityDistribution[];
  readonly routeLanguages: readonly SourceEligibilityDistribution[];
  readonly handlerLanguages: readonly SourceEligibilityDistribution[];
}

export interface SourceEligibilityCensus {
  readonly schemaVersion: typeof REAL_SOURCE_ELIGIBILITY_CENSUS_VERSION;
  readonly sourceSnapshotDigest: string;
  readonly sourceSurfaceDigest: string;
  readonly phase24PortfolioDigest: string;
  readonly summary: SourceEligibilityCensusSummary;
  readonly rows: readonly SourceEligibilitySurfaceRow[];
  readonly deterministicDigest: string;
}

function sortedCounts(values: readonly string[]): readonly SourceEligibilityCodeCount[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((left, right) => compareCodeUnits(left.code, right.code));
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function joinStatus(state: SourceJoinState): SourceEligibilityStageStatus {
  switch (state) {
    case 'PROVEN': return 'PROVEN';
    case 'MULTIPLE_SYMBOLS':
    case 'AMBIGUOUS': return 'AMBIGUOUS';
    case 'SOURCE_STALE': return 'STALE';
    case 'UNSUPPORTED_REFERENCE':
    case 'OUTSIDE_SCOPE': return 'UNSUPPORTED';
    case 'MISSING_SYMBOL': return 'UNPROVEN';
  }
}

function readOnlyStatus(classification: SourceReadOnlyClassification): SourceEligibilityStageStatus {
  switch (classification) {
    case 'PROVEN_READ_ONLY': return 'PROVEN';
    case 'PROVEN_MUTATION_CAPABLE': return 'UNSAFE';
    case 'READ_ONLY_METHOD_ONLY': return 'UNPROVEN';
    case 'CONDITIONAL_MUTATION':
    case 'AMBIGUOUS': return 'AMBIGUOUS';
    case 'UNSUPPORTED': return 'UNSUPPORTED';
  }
}

function routeStatus(surface: RealSourceSurfaceDescriptor): SourceEligibilityStageStatus {
  if (surface.currentness === 'SOURCE_STALE') return 'STALE';
  if (surface.currentness === 'SOURCE_UNAVAILABLE') return 'UNPROVEN';
  if (surface.operation.routeProof === 'PROVEN') return 'PROVEN';
  return surface.operation.routeProof === 'AMBIGUOUS' ? 'AMBIGUOUS' : 'UNSUPPORTED';
}

function joinGraphStatus(surface: RealSourceSurfaceDescriptor): SourceEligibilityStageStatus {
  if (surface.joins.length === 0) return 'UNPROVEN';
  const proven = surface.joins.filter((join) => join.state === 'PROVEN').length;
  if (proven === surface.joins.length) return 'PROVEN';
  if (proven > 0) return 'PARTIAL';
  const states = surface.joins.map((join) => joinStatus(join.state));
  if (states.includes('AMBIGUOUS')) return 'AMBIGUOUS';
  if (states.includes('STALE')) return 'STALE';
  if (states.every((state) => state === 'UNSUPPORTED')) return 'UNSUPPORTED';
  return 'UNPROVEN';
}

function stage(stage: SourceEligibilityStageName, status: SourceEligibilityStageStatus): SourceEligibilityStage {
  return { stage, status };
}

function chainFor(surface: RealSourceSurfaceDescriptor, phase24Eligible: boolean): SourceEligibilityChain {
  const route = routeStatus(surface);
  const request = joinStatus(surface.contract.requestProof);
  const response = joinStatus(surface.contract.responseProof);
  const semantic = joinStatus(surface.contract.semanticProof);
  const mutability = readOnlyStatus(surface.operation.readOnlyClassification);
  const readOnly = mutability;
  const graph = joinGraphStatus(surface);
  const stages = [
    stage('SOURCE_DISCOVERED', 'PROVEN'),
    stage('ROUTE_PROVEN', route),
    stage('REQUEST_CONTRACT', request),
    stage('RESPONSE_CONTRACT', response),
    stage('SEMANTIC_CONTRACT', semantic),
    stage('MUTABILITY_CLASSIFICATION', mutability),
    stage('READ_ONLY_PROOF', readOnly),
    stage('JOIN_GRAPH_REQUIREMENTS', graph),
    stage('PHASE24_ELIGIBILITY', phase24Eligible ? 'ELIGIBLE' : 'EXCLUDED'),
  ] as const;
  const firstBlockingStage = stages.find((entry) => !['PROVEN', 'ELIGIBLE'].includes(entry.status))?.stage ?? (phase24Eligible ? null : 'PHASE24_ELIGIBILITY');
  return { stages, firstBlockingStage };
}

function handlerLanguage(discovery: SourceSurfaceDiscovery, surface: RealSourceSurfaceDescriptor): SourceScanLanguage | 'UNKNOWN' {
  const handlerPath = surface.operation.handlerPath;
  if (handlerPath === null) return 'UNKNOWN';
  return discovery.inventory.files.find((file) => file.repoId === surface.operation.repository && file.relativePath === handlerPath)?.language ?? 'UNKNOWN';
}

function reasonFamily(input: { readonly code: string; readonly phase24: boolean; readonly classification: SourceReadOnlyClassification }): SourceEligibilityReasonFamily {
  const code = input.code;
  if (!/^[A-Za-z0-9_:-]{1,120}$/.test(code)) throw new Error('SOURCE_ELIGIBILITY_REASON_UNSAFE');
  if (['MUTATION_CAPABLE', 'PROVEN_MUTATION_CAPABLE'].includes(code)) return 'HARD_UNSAFE';
  if (code === 'MUTATION_REQUIRED') return input.classification === 'PROVEN_MUTATION_CAPABLE' ? 'HARD_UNSAFE' : 'MECHANICAL_PROOF_GAP';
  if (code.includes('AMBIGUOUS') || code.includes('MULTIPLE') || code === 'BEHAVIOR_OWNER_AMBIGUOUS') return code === 'BEHAVIOR_OWNER_AMBIGUOUS' ? 'OWNER_POLICY' : 'AMBIGUITY';
  if (code.includes('STALE') || code.includes('UNAVAILABLE') || code.includes('SOURCE_VERSION') || code.includes('SOURCE_SNAPSHOT')) return 'SOURCE_UNAVAILABLE_OR_STALE';
  if (code.includes('REPLAY') || code.includes('SEMANTIC') || code.includes('PROJECTION') || code.includes('DOSSIER') || code.includes('PRECONDITION')) return 'SEMANTIC_OR_REPLAY_PREREQUISITE';
  if (code.includes('UNSUPPORTED') || code.includes('SYNTAX') || code.includes('DYNAMIC')) return 'UNSUPPORTED_SYNTAX';
  if (code.includes('OWNER') || code.includes('DEPLOYMENT')) return 'OWNER_POLICY';
  if (code.includes('AUTH') || code.includes('ENVIRONMENT') || code.includes('INLINE_SECRET') || code.includes('POLICY')) return 'POLICY_EXCLUSION';
  if (code === 'NONE') return 'NONE';
  return 'MECHANICAL_PROOF_GAP';
}

function distribution(key: string, rows: readonly SourceEligibilitySurfaceRow[], surfaces: readonly RealSourceSurfaceDescriptor[], field: 'repository' | 'routeLanguage' | 'handlerLanguage'): SourceEligibilityDistribution {
  const selected = rows.filter((row) => row[field] === key);
  const byId = new Set(selected.map((row) => row.surfaceId));
  const selectedSurfaces = surfaces.filter((surface) => byId.has(surface.surfaceId));
  return {
    key,
    surfaceCount: selected.length,
    routeProofCount: selectedSurfaces.filter((surface) => surface.operation.routeProof === 'PROVEN').length,
    requestContractCount: selectedSurfaces.filter((surface) => surface.contract.requestProof === 'PROVEN').length,
    responseContractCount: selectedSurfaces.filter((surface) => surface.contract.responseProof === 'PROVEN').length,
    semanticObservationCount: selectedSurfaces.reduce((count, surface) => count + surface.contract.semanticContractIds.length, 0),
    mutationCapableCount: selectedSurfaces.filter((surface) => surface.operation.readOnlyClassification === 'PROVEN_MUTATION_CAPABLE').length,
    readOnlyProvenCount: selectedSurfaces.filter((surface) => surface.operation.readOnlyClassification === 'PROVEN_READ_ONLY').length,
    mutabilityUnknownCount: selectedSurfaces.filter((surface) => surface.operation.readOnlyClassification === 'READ_ONLY_METHOD_ONLY').length,
    mutabilityAmbiguousCount: selectedSurfaces.filter((surface) => ['AMBIGUOUS', 'CONDITIONAL_MUTATION'].includes(surface.operation.readOnlyClassification)).length,
    phase24EligibleCount: selectedSurfaces.filter((surface) => rows.find((row) => row.surfaceId === surface.surfaceId)?.chain.stages.at(-1)?.status === 'ELIGIBLE').length,
    phase24ExcludedCount: selectedSurfaces.filter((surface) => rows.find((row) => row.surfaceId === surface.surfaceId)?.chain.stages.at(-1)?.status === 'EXCLUDED').length,
  };
}

function distributions(rows: readonly SourceEligibilitySurfaceRow[], surfaces: readonly RealSourceSurfaceDescriptor[], field: 'repository' | 'routeLanguage' | 'handlerLanguage'): readonly SourceEligibilityDistribution[] {
  const keys = [...new Set(rows.map((row) => row[field]))].sort(compareCodeUnits);
  return keys.map((key) => distribution(key, rows, surfaces, field));
}

function rowFor(input: { readonly discovery: SourceSurfaceDiscovery; readonly surface: RealSourceSurfaceDescriptor; readonly candidate: Phase24CandidatePortfolio['candidates'][number] }): SourceEligibilitySurfaceRow {
  const phase24ReasonCodes = (input.candidate.eligibility === 'EXCLUDED' ? input.candidate.reasonCodes : []).slice().sort(compareCodeUnits);
  const sourceExclusionReasons = [...input.surface.exclusionReasons].sort(compareCodeUnits);
  const classification = input.surface.operation.readOnlyClassification;
  const reasonFamilies = [...new Set([
    ...sourceExclusionReasons.map((code) => reasonFamily({ code, phase24: false, classification })),
    ...phase24ReasonCodes.map((code) => reasonFamily({ code, phase24: true, classification })),
  ])].sort(compareCodeUnits) as SourceEligibilityReasonFamily[];
  if (reasonFamilies.length === 0) reasonFamilies.push('NONE');
  const chain = chainFor(input.surface, input.candidate.eligibility === 'ELIGIBLE');
  return {
    surfaceId: input.surface.surfaceId,
    operationId: input.surface.operation.operationId,
    targetId: input.surface.targetId,
    repository: input.surface.operation.repository,
    routeLanguage: input.surface.operation.language,
    handlerLanguage: handlerLanguage(input.discovery, input.surface),
    sourceCurrentness: input.surface.currentness,
    lifecycle: input.surface.lifecycle,
    chain,
    sourceExclusionReasons,
    phase24ReasonCodes,
    reasonFamilies,
    responseProofGapCodes: input.surface.contract.responseAnalyzerDiagnostics.filter((diagnostic) => diagnostic.status === 'REJECTED').map((diagnostic) => diagnostic.flowRejectionCode ?? diagnostic.rejectionCode ?? 'ANALYZER_UNPROVEN').sort(compareCodeUnits),
    semanticProofGapCodes: input.surface.contract.semanticProof === 'PROVEN' ? [] : input.surface.contract.responseAnalyzerDiagnostics.filter((diagnostic) => diagnostic.status === 'REJECTED').map((diagnostic) => diagnostic.flowRejectionCode ?? diagnostic.rejectionCode ?? 'ANALYZER_UNPROVEN').sort(compareCodeUnits),
  };
}

/** Build a complete, deterministic exclusion chain from existing authorities. */
export function buildSourceEligibilityCensus(input: { readonly discovery: SourceSurfaceDiscovery; readonly portfolio: Phase24CandidatePortfolio }): SourceEligibilityCensus {
  if (input.discovery.surfaces.length !== input.portfolio.consideredCount) throw new Error('SOURCE_ELIGIBILITY_CENSUS_SURFACE_COUNT');
  if (input.portfolio.candidates.length !== input.portfolio.consideredCount) throw new Error('SOURCE_ELIGIBILITY_CENSUS_CANDIDATE_COUNT');
  const candidates = new Map(input.portfolio.candidates.map((candidate) => [candidate.surfaceKey, candidate]));
  if (candidates.size !== input.portfolio.candidates.length) throw new Error('SOURCE_ELIGIBILITY_CENSUS_CANDIDATE_DUPLICATE');
  const surfaceIds = new Set(input.discovery.surfaces.map((surface) => surface.surfaceId));
  if (input.portfolio.candidates.some((candidate) => !surfaceIds.has(candidate.surfaceKey))) throw new Error('SOURCE_ELIGIBILITY_CENSUS_CANDIDATE_OUTSIDE_SURFACES');
  const rows = input.discovery.surfaces.map((surface) => {
    const candidate = candidates.get(surface.surfaceId);
    if (candidate === undefined) throw new Error('SOURCE_ELIGIBILITY_CENSUS_CANDIDATE_MISSING');
    return rowFor({ discovery: input.discovery, surface, candidate });
  }).sort((left, right) => compareCodeUnits(left.surfaceId, right.surfaceId));
  const surfaces = input.discovery.surfaces;
  const phase24ReasonCodes = rows.flatMap((row) => row.phase24ReasonCodes);
  const sourceReasons = rows.flatMap((row) => row.sourceExclusionReasons);
  const allFamilies = rows.flatMap((row) => row.reasonFamilies.filter((family) => family !== 'NONE'));
  const lifecycleCounts = sortedCounts(rows.map((row) => row.lifecycle));
  const sourceCurrentnessCounts = sortedCounts(rows.map((row) => row.sourceCurrentness));
  const primaryBlockingStageCounts = sortedCounts(rows.map((row) => row.chain.firstBlockingStage ?? 'NONE'));
  const readOnlyRows = rows.filter((row) => row.sourceExclusionReasons.includes('READ_ONLY_NOT_PROVEN') || row.phase24ReasonCodes.includes('READ_ONLY_SUITABILITY_UNPROVEN'));
  const readOnlyOnlySourceBlockers = rows.filter((row) => row.sourceExclusionReasons.length === 1 && row.sourceExclusionReasons[0] === 'READ_ONLY_NOT_PROVEN');
  const reasonFamilyCounts = sortedCounts(allFamilies);
  const summary: SourceEligibilityCensusSummary = {
    totalOperations: surfaces.length,
    routeProofs: surfaces.filter((surface) => surface.operation.routeProof === 'PROVEN').length,
    requestContracts: surfaces.filter((surface) => surface.contract.requestProof === 'PROVEN').length,
    responseContracts: surfaces.filter((surface) => surface.contract.responseProof === 'PROVEN').length,
    semanticContractSurfaces: surfaces.filter((surface) => surface.contract.semanticProof === 'PROVEN').length,
    semanticObservations: surfaces.reduce((count, surface) => count + surface.contract.semanticContractIds.length, 0),
    joinsAttempted: surfaces.reduce((count, surface) => count + surface.joins.length, 0),
    joinsProven: surfaces.reduce((count, surface) => count + surface.joins.filter((join) => join.state === 'PROVEN').length, 0),
    joinsRejected: surfaces.reduce((count, surface) => count + surface.joins.filter((join) => join.state !== 'PROVEN').length, 0),
    mutationCapable: surfaces.filter((surface) => surface.operation.readOnlyClassification === 'PROVEN_MUTATION_CAPABLE').length,
    readOnlyProven: surfaces.filter((surface) => surface.operation.readOnlyClassification === 'PROVEN_READ_ONLY').length,
    mutabilityUnknown: surfaces.filter((surface) => surface.operation.readOnlyClassification === 'READ_ONLY_METHOD_ONLY').length,
    mutabilityAmbiguous: surfaces.filter((surface) => ['AMBIGUOUS', 'CONDITIONAL_MUTATION'].includes(surface.operation.readOnlyClassification)).length,
    mutabilityUnsupported: surfaces.filter((surface) => surface.operation.readOnlyClassification === 'UNSUPPORTED').length,
    phase24Eligible: input.portfolio.eligibleCount,
    phase24Excluded: input.portfolio.excludedCount,
    lifecycleCounts,
    sourceCurrentnessCounts,
    primaryBlockingStageCounts,
    sourceExclusionReasonCounts: sortedCounts(sourceReasons),
    phase24ReasonCounts: sortedCounts(phase24ReasonCodes),
    reasonFamilyCounts,
    proofGapFamilyCounts: input.discovery.gapTaxonomy.dimensions.rejectionFamily,
    hardUnsafeExclusionCount: reasonFamilyCounts.find((entry) => entry.code === 'HARD_UNSAFE')?.count ?? 0,
    mechanicalProofGapCount: reasonFamilyCounts.find((entry) => entry.code === 'MECHANICAL_PROOF_GAP')?.count ?? 0,
    unsupportedSyntaxCount: reasonFamilyCounts.find((entry) => entry.code === 'UNSUPPORTED_SYNTAX')?.count ?? 0,
    ambiguityCount: reasonFamilyCounts.find((entry) => entry.code === 'AMBIGUITY')?.count ?? 0,
    sourceUnavailableOrStaleCount: reasonFamilyCounts.find((entry) => entry.code === 'SOURCE_UNAVAILABLE_OR_STALE')?.count ?? 0,
    ownerPolicyCount: reasonFamilyCounts.find((entry) => entry.code === 'OWNER_POLICY')?.count ?? 0,
    semanticOrReplayPrerequisiteCount: reasonFamilyCounts.find((entry) => entry.code === 'SEMANTIC_OR_REPLAY_PREREQUISITE')?.count ?? 0,
    policyExclusionCount: reasonFamilyCounts.find((entry) => entry.code === 'POLICY_EXCLUSION')?.count ?? 0,
    readOnlyExclusionCount: readOnlyRows.length,
    readOnlyOnlySourceBlockerCount: readOnlyOnlySourceBlockers.length,
    readOnlyWithOtherSourceBlockerCount: readOnlyRows.length - readOnlyOnlySourceBlockers.length,
    sourceGapSurfaceCount: input.discovery.gapTaxonomy.proofGapSurfaceCount,
    rejectedDiagnosticCount: input.discovery.gapTaxonomy.rejectedDiagnosticCount,
    repositories: distributions(rows, surfaces, 'repository'),
    routeLanguages: distributions(rows, surfaces, 'routeLanguage'),
    handlerLanguages: distributions(rows, surfaces, 'handlerLanguage'),
  };
  const core = {
    schemaVersion: REAL_SOURCE_ELIGIBILITY_CENSUS_VERSION,
    sourceSnapshotDigest: input.discovery.inventory.snapshotDigest,
    sourceSurfaceDigest: input.discovery.deterministicDigest,
    phase24PortfolioDigest: input.portfolio.deterministicDigest,
    summary,
    rows,
  };
  return { ...core, deterministicDigest: safeSemanticDigest(core, 'source-eligibility-census') };
}
