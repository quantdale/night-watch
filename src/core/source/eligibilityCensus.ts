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
import { buildSourcePopulationCompleteness, type SourcePopulationCompleteness } from './populationCompleteness';
import type {
  RealSourceSurfaceDescriptor,
  SourceJoinState,
  SourceReadOnlyClassification,
  SourceRuntimeBinding,
  SourceSurfaceLifecycle,
  SourceSurfaceReplayCapability,
} from './surfaceTypes';

export const REAL_SOURCE_ELIGIBILITY_CENSUS_VERSION = 'nightwatch.real-source-eligibility-census.v3' as const;

export const SOURCE_ELIGIBILITY_STAGE_NAMES = [
  'SOURCE_DISCOVERED',
  'ROUTE_PROVEN',
  'REQUEST_CONTRACT',
  'RESPONSE_CONTRACT',
  'SEMANTIC_CONTRACT',
  'MUTABILITY_CLASSIFICATION',
  'READ_ONLY_PROOF',
  'JOIN_GRAPH_REQUIREMENTS',
  'RUNTIME_BINDING',
  'REPLAY_REQUIREMENTS',
  'DOSSIER_REQUIREMENTS',
  'PHASE24_ELIGIBILITY',
] as const;
export type SourceEligibilityStageName = (typeof SOURCE_ELIGIBILITY_STAGE_NAMES)[number];

export const SOURCE_PROOF_FAMILY_NAMES = [
  'RESPONSE_CONTRACT',
  'SEMANTIC_CONTRACT',
  'RUNTIME_BINDING',
  'JOIN_GRAPH',
  'PHASE24_BRIDGE',
] as const;
export type SourceProofFamilyName = (typeof SOURCE_PROOF_FAMILY_NAMES)[number];

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

export interface SourceEligibilityStageCount {
  readonly stage: SourceEligibilityStageName;
  readonly status: SourceEligibilityStageStatus;
  readonly count: number;
}

export interface SourceEligibilityCensusCost {
  readonly filesInspected: number;
  readonly bytesInspected: number;
  readonly directoriesVisited: number;
  readonly routeFilesConsidered: number;
  readonly analyzerInvocations: number;
  readonly responseFlowAttempts: number;
  readonly responseFlowDeclarations: number;
  readonly responseFlowEdges: number;
  readonly responseFlowMaxDepth: number;
  readonly declarationsIndexed: number;
  readonly maxDeclarationsPerFile: number;
  readonly maxTokens: number;
  readonly maxSourceBytes: number;
}

export interface SourceProofFamilyRanking {
  readonly family: SourceProofFamilyName;
  /** Surfaces whose corresponding stage is not proven. */
  readonly gapSurfaceCount: number;
  /** Surfaces for which this gap is the first blocker. */
  readonly firstBlockerCount: number;
  /** Surfaces that could clear the chain if this stage alone were proven. */
  readonly potentiallyUnlockableCount: number;
  /** Existing positive observations that are not, by themselves, admission. */
  readonly positiveObservationCount: number;
  readonly currentSurfaceCount: number;
  readonly replayReadyCount: number;
  readonly safety: 'HIGH' | 'OWNER_GATED' | 'NOT_PROVEN';
  readonly determinism: 'EXACT' | 'BOUNDED' | 'NOT_PROVEN';
  readonly proofCompleteness: 'EXACT' | 'PARTIAL' | 'NONE';
  readonly maintenanceBurden: 'LOW' | 'MEDIUM' | 'HIGH' | 'NOT_ASSESSED';
  readonly falsePositiveRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'NOT_ASSESSED';
  readonly dependencyFanOut: number;
  readonly bugHuntingValue: 'HIGH' | 'MEDIUM' | 'LOW' | 'NOT_ASSESSED';
  readonly assessment: 'MEASURE_ONLY' | 'NO_INDEPENDENT_GAP' | 'NO_CURRENT_MATCH' | 'BRIDGE_ALIGNED';
  readonly rank: number;
}

export interface SourceEligibilityChain {
  readonly stages: readonly SourceEligibilityStage[];
  readonly firstBlockingStage: SourceEligibilityStageName | null;
  readonly secondaryBlockingStages: readonly SourceEligibilityStageName[];
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
  readonly runtimeBinding: SourceRuntimeBinding;
  readonly replayCapability: SourceSurfaceReplayCapability;
  readonly dossierCompatibility: SourceEligibilityStageStatus;
  readonly sourceExclusionReasons: readonly string[];
  readonly phase24ReasonCodes: readonly Phase24ReasonCode[];
  readonly reasonFamilies: readonly SourceEligibilityReasonFamily[];
  readonly responseProofGapCodes: readonly string[];
  readonly semanticProofGapCodes: readonly string[];
  readonly replayProofGapCodes: readonly string[];
  readonly dossierProofGapCodes: readonly string[];
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
  /** Truthful population statement for every count in this summary.
   *
   * `totalOperations` below is the number of surfaces actually censused. When
   * `population.state` is not COMPLETE it is a floor, not a total, and every
   * derived count (responseContracts, joinsProven, ...) is a count over that
   * observed subset only. Read this block before comparing any two censuses. */
  readonly population: SourcePopulationCompleteness;
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
  readonly runtimeBindings: number;
  readonly runtimeBindingMissing: number;
  readonly runtimeBindingAmbiguous: number;
  readonly runtimeBindingStale: number;
  readonly replayRequirementsProven: number;
  readonly replayRequirementsUnproven: number;
  readonly dossierCompatible: number;
  readonly dossierIncompatible: number;
  readonly lifecycleCounts: readonly SourceEligibilityCodeCount[];
  readonly sourceCurrentnessCounts: readonly SourceEligibilityCodeCount[];
  readonly currentnessFailureCount: number;
  readonly stageStatusCounts: readonly SourceEligibilityStageCount[];
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
  readonly unsupportedConstructCounts: readonly SourceEligibilityCodeCount[];
  readonly cost: SourceEligibilityCensusCost;
  readonly proofFamilyRanking: readonly SourceProofFamilyRanking[];
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
    case 'PROVEN_MUTATION_CAPABLE': return 'PROVEN';
    case 'READ_ONLY_METHOD_ONLY': return 'UNPROVEN';
    case 'CONDITIONAL_MUTATION':
    case 'AMBIGUOUS': return 'AMBIGUOUS';
    case 'UNSUPPORTED': return 'UNSUPPORTED';
  }
}

function readOnlyProofStatus(classification: SourceReadOnlyClassification): SourceEligibilityStageStatus {
  switch (classification) {
    case 'PROVEN_READ_ONLY': return 'PROVEN';
    case 'PROVEN_MUTATION_CAPABLE':
    case 'CONDITIONAL_MUTATION': return 'UNSAFE';
    case 'READ_ONLY_METHOD_ONLY': return 'UNPROVEN';
    case 'AMBIGUOUS': return 'AMBIGUOUS';
    case 'UNSUPPORTED': return 'UNSUPPORTED';
  }
}

function runtimeBindingStatus(binding: SourceRuntimeBinding, currentness: RealSourceSurfaceDescriptor['currentness']): SourceEligibilityStageStatus {
  if (currentness === 'SOURCE_STALE') return 'STALE';
  if (currentness === 'SOURCE_UNAVAILABLE') return 'UNPROVEN';
  switch (binding) {
    case 'RUNTIME_BOUND_EXACT': return 'PROVEN';
    case 'RUNTIME_BOUND_PARTIAL': return 'PARTIAL';
    case 'AMBIGUOUS': return 'AMBIGUOUS';
    case 'STALE_BINDING':
    case 'SOURCE_VERSION_MISMATCH': return 'STALE';
    case 'SOURCE_ONLY': return 'UNPROVEN';
    case 'RUNTIME_ONLY': return 'UNSUPPORTED';
  }
}

function replayStatus(input: { readonly surface: RealSourceSurfaceDescriptor; readonly candidate: Phase24CandidatePortfolio['candidates'][number] }): SourceEligibilityStageStatus {
  if (input.surface.currentness === 'SOURCE_STALE') return 'STALE';
  if (input.surface.currentness === 'SOURCE_UNAVAILABLE') return 'UNPROVEN';
  const replay = input.candidate.replay;
  if (replay === null || input.surface.replayCapability !== 'SUPPORTED') return 'UNPROVEN';
  if (replay.strategy === 'UNSUPPORTED') return 'UNSUPPORTED';
  if (replay.strategy === 'UNBOUNDED' || replay.maxContexts !== 2) return 'UNSAFE';
  return 'PROVEN';
}

function dossierStatus(candidate: Phase24CandidatePortfolio['candidates'][number]): SourceEligibilityStageStatus {
  if (candidate.expectedEvidenceValue === 'NONE') return 'UNPROVEN';
  if (!Number.isInteger(candidate.anticipatedInvariantCount) || candidate.anticipatedInvariantCount < 1 || candidate.anticipatedInvariantCount > 32) return 'UNPROVEN';
  if (!Number.isInteger(candidate.selectionPriority) || candidate.selectionPriority < 1 || candidate.selectionPriority > 1000) return 'UNPROVEN';
  return 'PROVEN';
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

function chainFor(input: { readonly surface: RealSourceSurfaceDescriptor; readonly candidate: Phase24CandidatePortfolio['candidates'][number] }): SourceEligibilityChain {
  const surface = input.surface;
  const route = routeStatus(surface);
  const request = joinStatus(surface.contract.requestProof);
  const response = joinStatus(surface.contract.responseProof);
  const semantic = joinStatus(surface.contract.semanticProof);
  const mutability = readOnlyStatus(surface.operation.readOnlyClassification);
  const readOnly = readOnlyProofStatus(surface.operation.readOnlyClassification);
  const graph = joinGraphStatus(surface);
  const runtime = runtimeBindingStatus(surface.operation.runtimeBinding, surface.currentness);
  const replay = replayStatus(input);
  const dossier = dossierStatus(input.candidate);
  const phase24Eligible = input.candidate.eligibility === 'ELIGIBLE';
  const stages = [
    stage('SOURCE_DISCOVERED', 'PROVEN'),
    stage('ROUTE_PROVEN', route),
    stage('REQUEST_CONTRACT', request),
    stage('RESPONSE_CONTRACT', response),
    stage('SEMANTIC_CONTRACT', semantic),
    stage('MUTABILITY_CLASSIFICATION', mutability),
    stage('READ_ONLY_PROOF', readOnly),
    stage('JOIN_GRAPH_REQUIREMENTS', graph),
    stage('RUNTIME_BINDING', runtime),
    stage('REPLAY_REQUIREMENTS', replay),
    stage('DOSSIER_REQUIREMENTS', dossier),
    stage('PHASE24_ELIGIBILITY', phase24Eligible ? 'ELIGIBLE' : 'EXCLUDED'),
  ] as const;
  const blockingStages = stages.filter((entry) => !['PROVEN', 'ELIGIBLE'].includes(entry.status)).map((entry) => entry.stage);
  return {
    stages,
    firstBlockingStage: blockingStages[0] ?? null,
    secondaryBlockingStages: blockingStages.slice(1),
  };
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
  const rowById = new Map(rows.map((row) => [row.surfaceId, row] as const));
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
    phase24EligibleCount: selectedSurfaces.filter((surface) => rowById.get(surface.surfaceId)?.chain.stages.at(-1)?.status === 'ELIGIBLE').length,
    phase24ExcludedCount: selectedSurfaces.filter((surface) => rowById.get(surface.surfaceId)?.chain.stages.at(-1)?.status === 'EXCLUDED').length,
  };
}


function distributions(rows: readonly SourceEligibilitySurfaceRow[], surfaces: readonly RealSourceSurfaceDescriptor[], field: 'repository' | 'routeLanguage' | 'handlerLanguage'): readonly SourceEligibilityDistribution[] {
  const keys = [...new Set(rows.map((row) => row[field]))].sort(compareCodeUnits);
  return keys.map((key) => distribution(key, rows, surfaces, field));
}

function stageValue(chain: SourceEligibilityChain, stageName: SourceEligibilityStageName): SourceEligibilityStageStatus {
  const entry = chain.stages.find((candidate) => candidate.stage === stageName);
  if (entry === undefined) throw new Error('SOURCE_ELIGIBILITY_CENSUS_STAGE_MISSING');
  return entry.status;
}

function stageStatusCounts(rows: readonly SourceEligibilitySurfaceRow[]): readonly SourceEligibilityStageCount[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const entry of row.chain.stages) {
      const key = `${entry.stage}|${entry.status}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return SOURCE_ELIGIBILITY_STAGE_NAMES.flatMap((stageName) => SOURCE_ELIGIBILITY_STAGE_STATUSES
    .map((status) => ({ stage: stageName, status, count: counts.get(`${stageName}|${status}`) ?? 0 }))
    .filter((entry) => entry.count > 0));
}

function unsupportedConstructCounts(discovery: SourceSurfaceDiscovery): readonly SourceEligibilityCodeCount[] {
  const values = discovery.surfaces.flatMap((surface) => surface.contract.responseAnalyzerDiagnostics
    .filter((diagnostic) => diagnostic.status === 'REJECTED')
    .map((diagnostic) => diagnostic.rejectionFamily));
  return sortedCounts(values);
}

function censusCost(discovery: SourceSurfaceDiscovery): SourceEligibilityCensusCost {
  const inventory = discovery.inventory.counters ?? {} as Partial<SourceSurfaceDiscovery['inventory']['counters']>;
  const counters = discovery.counters ?? {} as Partial<SourceSurfaceDiscovery['counters']>;
  const performance = discovery.performance ?? {} as Partial<SourceSurfaceDiscovery['performance']>;
  return {
    filesInspected: inventory.filesRead ?? 0,
    bytesInspected: inventory.bytesRead ?? 0,
    directoriesVisited: inventory.directoriesVisited ?? 0,
    routeFilesConsidered: counters.routeFilesConsidered ?? 0,
    analyzerInvocations: counters.analyzerInvocations ?? 0,
    responseFlowAttempts: counters.responseFlowAttempts ?? 0,
    responseFlowDeclarations: counters.responseFlowDependencyDeclarations ?? 0,
    responseFlowEdges: counters.responseFlowDependencyEdges ?? 0,
    responseFlowMaxDepth: counters.responseFlowMaxDepth ?? 0,
    declarationsIndexed: performance.declarationsIndexed ?? 0,
    maxDeclarationsPerFile: performance.maxDeclarationsPerFile ?? 0,
    maxTokens: performance.maxTokens ?? 0,
    maxSourceBytes: performance.maxSourceBytes ?? 0,
  };
}

function familyStage(family: SourceProofFamilyName): SourceEligibilityStageName {
  switch (family) {
    case 'RESPONSE_CONTRACT': return 'RESPONSE_CONTRACT';
    case 'SEMANTIC_CONTRACT': return 'SEMANTIC_CONTRACT';
    case 'RUNTIME_BINDING': return 'RUNTIME_BINDING';
    case 'JOIN_GRAPH': return 'JOIN_GRAPH_REQUIREMENTS';
    case 'PHASE24_BRIDGE': return 'PHASE24_ELIGIBILITY';
  }
}

function familySafety(family: SourceProofFamilyName): SourceProofFamilyRanking['safety'] {
  switch (family) {
    case 'RESPONSE_CONTRACT':
    case 'SEMANTIC_CONTRACT':
    case 'JOIN_GRAPH': return 'HIGH';
    case 'RUNTIME_BINDING': return 'OWNER_GATED';
    case 'PHASE24_BRIDGE': return 'HIGH';
  }
}

function familyDeterminism(family: SourceProofFamilyName): SourceProofFamilyRanking['determinism'] {
  switch (family) {
    case 'RESPONSE_CONTRACT':
    case 'SEMANTIC_CONTRACT':
    case 'RUNTIME_BINDING':
    case 'JOIN_GRAPH': return 'BOUNDED';
    case 'PHASE24_BRIDGE': return 'EXACT';
  }
}

function familyFalsePositiveRisk(family: SourceProofFamilyName): SourceProofFamilyRanking['falsePositiveRisk'] {
  switch (family) {
    case 'RESPONSE_CONTRACT': return 'MEDIUM';
    case 'SEMANTIC_CONTRACT': return 'LOW';
    case 'RUNTIME_BINDING': return 'HIGH';
    case 'JOIN_GRAPH': return 'MEDIUM';
    case 'PHASE24_BRIDGE': return 'LOW';
  }
}

function familyMaintenanceBurden(family: SourceProofFamilyName): SourceProofFamilyRanking['maintenanceBurden'] {
  switch (family) {
    case 'RESPONSE_CONTRACT': return 'HIGH';
    case 'SEMANTIC_CONTRACT': return 'MEDIUM';
    case 'RUNTIME_BINDING': return 'HIGH';
    case 'JOIN_GRAPH': return 'MEDIUM';
    case 'PHASE24_BRIDGE': return 'LOW';
  }
}

function familyBugHuntingValue(family: SourceProofFamilyName): SourceProofFamilyRanking['bugHuntingValue'] {
  switch (family) {
    case 'RESPONSE_CONTRACT':
    case 'SEMANTIC_CONTRACT': return 'HIGH';
    case 'RUNTIME_BINDING': return 'HIGH';
    case 'JOIN_GRAPH': return 'MEDIUM';
    case 'PHASE24_BRIDGE': return 'LOW';
  }
}

function familyPositiveObservationCount(family: SourceProofFamilyName, rows: readonly SourceEligibilitySurfaceRow[]): number {
  const stage = familyStage(family);
  const gapRows = rows.filter((row) => !['PROVEN', 'ELIGIBLE'].includes(stageValue(row.chain, stage)));
  switch (family) {
    case 'RESPONSE_CONTRACT':
      return 0;
    case 'SEMANTIC_CONTRACT':
      return gapRows.filter((row) => row.semanticProofGapCodes.length === 0 && row.chain.firstBlockingStage === 'SEMANTIC_CONTRACT').length;
    case 'RUNTIME_BINDING':
      return gapRows.filter((row) => row.runtimeBinding === 'RUNTIME_BOUND_EXACT').length;
    case 'JOIN_GRAPH':
      return gapRows.filter((row) => stageValue(row.chain, 'JOIN_GRAPH_REQUIREMENTS') === 'PARTIAL').length;
    case 'PHASE24_BRIDGE':
      return gapRows.filter((row) => row.phase24ReasonCodes.length === 0).length;
  }
}

function semanticIndependentGapCount(rows: readonly SourceEligibilitySurfaceRow[]): number {
  return rows.filter((row) => stageValue(row.chain, 'SEMANTIC_CONTRACT') !== 'PROVEN'
    && stageValue(row.chain, 'SEMANTIC_CONTRACT') !== 'ELIGIBLE'
    && ['PROVEN', 'ELIGIBLE'].includes(stageValue(row.chain, 'RESPONSE_CONTRACT'))).length;
}

function familyDependencyFanOut(family: SourceProofFamilyName, rows: readonly SourceEligibilitySurfaceRow[], surfaces: readonly RealSourceSurfaceDescriptor[]): number {
  const gapIds = new Set(rows.filter((row) => !['PROVEN', 'ELIGIBLE'].includes(stageValue(row.chain, familyStage(family)))).map((row) => row.surfaceId));
  switch (family) {
    case 'RESPONSE_CONTRACT':
      return surfaces.filter((surface) => gapIds.has(surface.surfaceId)).reduce((count, surface) => count + surface.contract.responseAnalyzerDiagnostics.length, 0);
    case 'SEMANTIC_CONTRACT':
      return surfaces.filter((surface) => gapIds.has(surface.surfaceId)).reduce((count, surface) => count + surface.contract.semanticContractIds.length, 0);
    case 'RUNTIME_BINDING':
      return surfaces.filter((surface) => gapIds.has(surface.surfaceId)).length;
    case 'JOIN_GRAPH':
      return surfaces.filter((surface) => gapIds.has(surface.surfaceId)).reduce((count, surface) => count + surface.joins.length, 0);
    case 'PHASE24_BRIDGE':
      return surfaces.filter((surface) => gapIds.has(surface.surfaceId)).length;
  }
}

function familyAssessment(input: {
  readonly family: SourceProofFamilyName;
  readonly gapSurfaceCount: number;
  readonly potentiallyUnlockableCount: number;
  readonly rows: readonly SourceEligibilitySurfaceRow[];
}): SourceProofFamilyRanking['assessment'] {
  if (input.family === 'SEMANTIC_CONTRACT' && semanticIndependentGapCount(input.rows) === 0) return 'NO_INDEPENDENT_GAP';
  if (input.family === 'PHASE24_BRIDGE' && input.potentiallyUnlockableCount === 0) return 'BRIDGE_ALIGNED';
  if (input.family === 'RUNTIME_BINDING' && input.gapSurfaceCount > 0 && input.potentiallyUnlockableCount === 0) return 'NO_CURRENT_MATCH';
  return 'MEASURE_ONLY';
}

function familyAssessmentPriority(assessment: SourceProofFamilyRanking['assessment']): number {
  switch (assessment) {
    case 'MEASURE_ONLY': return 0;
    case 'NO_INDEPENDENT_GAP': return 1;
    case 'NO_CURRENT_MATCH': return 2;
    case 'BRIDGE_ALIGNED': return 3;
  }
}

function familyProofCompletenessPriority(completeness: SourceProofFamilyRanking['proofCompleteness']): number {
  switch (completeness) {
    case 'EXACT': return 2;
    case 'PARTIAL': return 1;
    case 'NONE': return 0;
  }
}

function familySafetyPriority(safety: SourceProofFamilyRanking['safety']): number {
  switch (safety) {
    case 'HIGH': return 2;
    case 'OWNER_GATED': return 1;
    case 'NOT_PROVEN': return 0;
  }
}

function familyDeterminismPriority(determinism: SourceProofFamilyRanking['determinism']): number {
  switch (determinism) {
    case 'EXACT': return 2;
    case 'BOUNDED': return 1;
    case 'NOT_PROVEN': return 0;
  }
}

function familyBugHuntingValuePriority(value: SourceProofFamilyRanking['bugHuntingValue']): number {
  switch (value) {
    case 'HIGH': return 2;
    case 'MEDIUM': return 1;
    case 'LOW': return 0;
    case 'NOT_ASSESSED': return 0;
  }
}

function proofFamilyRanking(input: { readonly rows: readonly SourceEligibilitySurfaceRow[]; readonly surfaces: readonly RealSourceSurfaceDescriptor[] }): readonly SourceProofFamilyRanking[] {
  const currentSurfaceCount = input.rows.filter((row) => row.sourceCurrentness === 'CURRENT').length;
  const measurements = SOURCE_PROOF_FAMILY_NAMES.map((family) => {
    const stage = familyStage(family);
    const gapRows = input.rows.filter((row) => !['PROVEN', 'ELIGIBLE'].includes(stageValue(row.chain, stage)));
    const potentiallyUnlockableCount = gapRows.filter((row) => row.chain.stages.every((entry) => entry.stage === stage || ['PROVEN', 'ELIGIBLE'].includes(entry.status))).length;
    return {
      family,
      gapSurfaceCount: gapRows.length,
      firstBlockerCount: input.rows.filter((row) => row.chain.firstBlockingStage === stage).length,
      potentiallyUnlockableCount,
      positiveObservationCount: familyPositiveObservationCount(family, input.rows),
      currentSurfaceCount,
      replayReadyCount: gapRows.filter((row) => stageValue(row.chain, 'REPLAY_REQUIREMENTS') === 'PROVEN').length,
      safety: familySafety(family),
      determinism: familyDeterminism(family),
      proofCompleteness: family === 'PHASE24_BRIDGE' ? 'EXACT' : familyPositiveObservationCount(family, input.rows) > 0 ? 'PARTIAL' : gapRows.length === 0 ? 'EXACT' : 'NONE',
      maintenanceBurden: familyMaintenanceBurden(family),
      falsePositiveRisk: familyFalsePositiveRisk(family),
      dependencyFanOut: familyDependencyFanOut(family, input.rows, input.surfaces),
      bugHuntingValue: familyBugHuntingValue(family),
      assessment: familyAssessment({ family, gapSurfaceCount: gapRows.length, potentiallyUnlockableCount, rows: input.rows }),
      rank: 0,
    } satisfies Omit<SourceProofFamilyRanking, 'rank'> & { readonly rank: number };
  });
  return [...measurements]
    .sort((left, right) => right.potentiallyUnlockableCount - left.potentiallyUnlockableCount
      || right.positiveObservationCount - left.positiveObservationCount
      || familyAssessmentPriority(left.assessment) - familyAssessmentPriority(right.assessment)
      || familyProofCompletenessPriority(right.proofCompleteness) - familyProofCompletenessPriority(left.proofCompleteness)
      || familySafetyPriority(right.safety) - familySafetyPriority(left.safety)
      || familyDeterminismPriority(right.determinism) - familyDeterminismPriority(left.determinism)
      || familyBugHuntingValuePriority(right.bugHuntingValue) - familyBugHuntingValuePriority(left.bugHuntingValue)
      || right.replayReadyCount - left.replayReadyCount
      || right.gapSurfaceCount - left.gapSurfaceCount
      || left.family.localeCompare(right.family))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
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
  const chain = chainFor({ surface: input.surface, candidate: input.candidate });
  const replayProofGapCodes = input.candidate.reasonCodes.filter((code) => code === 'REPLAY_UNSUPPORTED' || code === 'REPLAY_UNBOUNDED');
  const dossierProofGapCodes = input.candidate.reasonCodes.filter((code) => code === 'DOSSIER_VALUE_INSUFFICIENT' || code === 'ANTICIPATED_INVARIANT_COUNT_INVALID' || code === 'SELECTION_PRIORITY_INVALID');
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
    runtimeBinding: input.surface.operation.runtimeBinding,
    replayCapability: input.surface.replayCapability,
    dossierCompatibility: stageValue(chain, 'DOSSIER_REQUIREMENTS'),
    sourceExclusionReasons,
    phase24ReasonCodes,
    reasonFamilies,
    responseProofGapCodes: input.surface.contract.responseAnalyzerDiagnostics.filter((diagnostic) => diagnostic.status === 'REJECTED').map((diagnostic) => diagnostic.flowRejectionCode ?? diagnostic.rejectionCode ?? 'ANALYZER_UNPROVEN').sort(compareCodeUnits),
    semanticProofGapCodes: input.surface.contract.semanticProof === 'PROVEN' ? [] : input.surface.contract.responseAnalyzerDiagnostics.filter((diagnostic) => diagnostic.status === 'REJECTED').map((diagnostic) => diagnostic.flowRejectionCode ?? diagnostic.rejectionCode ?? 'ANALYZER_UNPROVEN').sort(compareCodeUnits),
    replayProofGapCodes,
    dossierProofGapCodes,
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
  const eligibleRows = rows.filter((row) => stageValue(row.chain, 'PHASE24_ELIGIBILITY') === 'ELIGIBLE').length;
  const excludedRows = rows.filter((row) => stageValue(row.chain, 'PHASE24_ELIGIBILITY') === 'EXCLUDED').length;
  if (eligibleRows !== input.portfolio.eligibleCount || excludedRows !== input.portfolio.excludedCount) throw new Error('SOURCE_ELIGIBILITY_CENSUS_PHASE24_COUNT');
  const surfaces = input.discovery.surfaces;
  const phase24ReasonCodes = rows.flatMap((row) => row.phase24ReasonCodes);
  const sourceReasons = rows.flatMap((row) => row.sourceExclusionReasons);
  const allFamilies = rows.flatMap((row) => row.reasonFamilies.filter((family) => family !== 'NONE'));
  const lifecycleCounts = sortedCounts(rows.map((row) => row.lifecycle));
  const sourceCurrentnessCounts = sortedCounts(rows.map((row) => row.sourceCurrentness));
  const stageCounts = stageStatusCounts(rows);
  const primaryBlockingStageCounts = sortedCounts(rows.map((row) => row.chain.firstBlockingStage ?? 'NONE'));
  const readOnlyRows = rows.filter((row) => row.sourceExclusionReasons.includes('READ_ONLY_NOT_PROVEN') || row.phase24ReasonCodes.includes('READ_ONLY_SUITABILITY_UNPROVEN'));
  const readOnlyOnlySourceBlockers = rows.filter((row) => row.sourceExclusionReasons.length === 1 && row.sourceExclusionReasons[0] === 'READ_ONLY_NOT_PROVEN');
  const reasonFamilyCounts = sortedCounts(allFamilies);
  const cost = censusCost(input.discovery);
  const proofFamilyMeasurements = proofFamilyRanking({ rows, surfaces });
  const summary: SourceEligibilityCensusSummary = {
    population: buildSourcePopulationCompleteness({ operationCompleteness: input.discovery.operationCompleteness, inventoryCompleteness: input.discovery.inventory.completeness }),
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
    runtimeBindings: rows.filter((row) => row.chain.stages.find((entry) => entry.stage === 'RUNTIME_BINDING')?.status === 'PROVEN').length,
    runtimeBindingMissing: rows.filter((row) => row.runtimeBinding === 'SOURCE_ONLY').length,
    runtimeBindingAmbiguous: rows.filter((row) => row.runtimeBinding === 'AMBIGUOUS').length,
    runtimeBindingStale: rows.filter((row) => ['STALE_BINDING', 'SOURCE_VERSION_MISMATCH'].includes(row.runtimeBinding)).length,
    replayRequirementsProven: rows.filter((row) => stageValue(row.chain, 'REPLAY_REQUIREMENTS') === 'PROVEN').length,
    replayRequirementsUnproven: rows.filter((row) => stageValue(row.chain, 'REPLAY_REQUIREMENTS') !== 'PROVEN').length,
    dossierCompatible: rows.filter((row) => row.dossierCompatibility === 'PROVEN').length,
    dossierIncompatible: rows.filter((row) => row.dossierCompatibility !== 'PROVEN').length,
    lifecycleCounts,
    sourceCurrentnessCounts,
    currentnessFailureCount: rows.filter((row) => row.sourceCurrentness !== 'CURRENT').length,
    stageStatusCounts: stageCounts,
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
    unsupportedConstructCounts: unsupportedConstructCounts(input.discovery),
    cost,
    proofFamilyRanking: proofFamilyMeasurements,
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
