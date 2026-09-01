import { prefixedDigest24 } from '../../core/identity/canonicalDigest';
import type {
  RealSourceSurfaceDescriptor,
  SourceEvidenceJoin,
} from '../../core/source/surfaceTypes';
import type { SourceEligibilityCensus } from '../../core/source/eligibilityCensus';
import type { SourceInventoryCompleteness } from '../../core/source/scanTypes';
import type { SourceOperationProjectionCompleteness } from '../../core/source/surfaceTypes';
import {
  asSafeControlCenterCode,
  asSafeControlCenterDigest,
  asSafeControlCenterId,
  asSafeControlCenterLabel,
  asSafeControlCenterRouteTemplate,
  asSafeControlCenterSha,
  boundedGraphDepth,
  boundedInteger,
} from '../contracts/common';
import type {
  ControlCenterSourceCapability,
  ControlCenterSourceCompletenessDto,
  ControlCenterSourceCoverageState,
  ControlCenterSourceCurrentness,
  ControlCenterSourceGraphDto,
  ControlCenterSourceGraphEdgeDto,
  ControlCenterSourceGraphEdgeKind,
  ControlCenterSourceGraphNodeDto,
  ControlCenterSourceGraphNodeKind,
  ControlCenterSourceProofChainDto,
  ControlCenterSourceProofChainFamilyDto,
  ControlCenterSourceProofChainStageCountDto,
  ControlCenterSourceCompletenessState,
  ControlCenterSourceLifecycle,
  ControlCenterSourceSummaryDto,
  ControlCenterSourceSurfaceDto,
  ControlCenterSourceSurfacesDto,
} from '../contracts/sourceGraph';
import {
  CONTROL_CENTER_SOURCE_GRAPH_SCHEMA_VERSION,
  CONTROL_CENTER_SOURCE_SUMMARY_SCHEMA_VERSION,
  CONTROL_CENTER_SOURCE_SURFACES_SCHEMA_VERSION,
} from '../contracts/sourceGraph';
import { CONTROL_CENTER_LIMITS } from '../contracts/common';
import { boundedCollection, boundedCount, publicIdentity, safePublicId, sortedUniqueCodes } from './common';

function currentness(value: RealSourceSurfaceDescriptor['currentness']): ControlCenterSourceCurrentness {
  return value;
}

function lifecycle(value: RealSourceSurfaceDescriptor['lifecycle']): ControlCenterSourceLifecycle {
  return value;
}

function capability(value: 'SUPPORTED' | 'UNSUPPORTED' | 'UNPROVEN'): ControlCenterSourceCapability {
  return value;
}

function projectionCapability(value: RealSourceSurfaceDescriptor['projectionCapability']): ControlCenterSourceCapability {
  if (value === 'PROJECTABLE') return 'SUPPORTED';
  if (value === 'NOT_PROJECTABLE') return 'UNSUPPORTED';
  return 'UNPROVEN';
}

function handlerState(surface: RealSourceSurfaceDescriptor): ControlCenterSourceSurfaceDto['handlerState'] {
  const hasSymbol = surface.operation.handlerSymbol !== null;
  const hasPath = surface.operation.handlerPath !== null;
  if (surface.operation.routeProof === 'AMBIGUOUS') return 'AMBIGUOUS';
  if (surface.operation.routeProof === 'PROVEN' && hasSymbol && hasPath) return 'EXACT';
  if (hasSymbol || hasPath) return 'PARTIAL';
  return 'UNRESOLVED';
}

function surfaceDto(surface: RealSourceSurfaceDescriptor): ControlCenterSourceSurfaceDto | null {
  const surfaceId = asSafeControlCenterId(surface.surfaceId);
  if (surfaceId === null) return null;
  const routeProof = surface.operation.routeProof;
  const sourceSha = asSafeControlCenterSha(surface.source.sha);
  const evidenceDigest = asSafeControlCenterDigest(surface.source.evidenceDigest) ?? asSafeControlCenterDigest(surface.operation.evidenceDigest);
  const language = asSafeControlCenterCode(surface.operation.language) ?? asSafeControlCenterCode('UNKNOWN_LANGUAGE')!;
  const repositoryId = publicIdentity('cc-repository', surface.source.repoId);
  return {
    surfaceId,
    repositoryId,
    sourceSha,
    evidenceDigest,
    language,
    method: surface.operation.method,
    routeTemplate: asSafeControlCenterRouteTemplate(surface.operation.routeTemplate),
    handlerState: handlerState(surface),
    routeProof,
    readOnlyClassification: surface.operation.readOnlyClassification,
    runtimeBinding: surface.operation.runtimeBinding,
    currentness: currentness(surface.currentness),
    lifecycle: lifecycle(surface.lifecycle),
    projectionCapability: projectionCapability(surface.projectionCapability),
    replayCapability: capability(surface.replayCapability),
    differentialCapability: capability(surface.differentialCapability),
    exclusionReasons: sortedUniqueCodes(surface.exclusionReasons),
  };
}

function rollup(values: readonly string[]): readonly { readonly key: NonNullable<ReturnType<typeof asSafeControlCenterCode>>; readonly count: number }[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()]
    .map(([key, count]) => ({ key: asSafeControlCenterCode(key) ?? asSafeControlCenterCode('UNKNOWN')!, count: boundedCount(count) }))
    .sort((left, right) => left.key.localeCompare(right.key));
}

export interface SourceSummaryAuthorityInput {
  readonly state?: ControlCenterSourceSummaryDto['state'];
  readonly inventoryDigest?: string | null;
  readonly repositoryCount?: number;
  /** Repository-level currentness from the source inventory, when present. */
  readonly repositoryCurrentness?: readonly ControlCenterSourceCurrentness[];
  readonly reasonCodes?: readonly string[];
  readonly proofChain?: SourceEligibilityCensus | null;
  readonly operationCompleteness?: SourceOperationProjectionCompleteness | null;
  readonly inventoryCompleteness?: SourceInventoryCompleteness | null;
}

function proofChainRollup(values: readonly { readonly code: string; readonly count: number }[]): readonly { readonly key: NonNullable<ReturnType<typeof asSafeControlCenterCode>>; readonly count: number }[] {
  return values
    .map(({ code, count }) => ({ key: asSafeControlCenterCode(code) ?? asSafeControlCenterCode('UNKNOWN')!, count: boundedCount(count) }))
    .sort((left, right) => left.key.localeCompare(right.key));
}

function proofChainDto(census: SourceEligibilityCensus | null | undefined): ControlCenterSourceProofChainDto | null {
  if (census === null || census === undefined) return null;
  const stageStatusCounts: readonly ControlCenterSourceProofChainStageCountDto[] = census.summary.stageStatusCounts.map((entry) => ({
    stage: asSafeControlCenterCode(entry.stage) ?? asSafeControlCenterCode('UNKNOWN')!,
    status: asSafeControlCenterCode(entry.status) ?? asSafeControlCenterCode('UNKNOWN')!,
    count: boundedCount(entry.count),
  }));
  const proofFamilies: readonly ControlCenterSourceProofChainFamilyDto[] = census.summary.proofFamilyRanking
    .map((entry) => ({
      family: asSafeControlCenterCode(entry.family) ?? asSafeControlCenterCode('UNKNOWN')!,
      assessment: asSafeControlCenterCode(entry.assessment) ?? asSafeControlCenterCode('UNKNOWN')!,
      rank: boundedCount(entry.rank),
      gapSurfaceCount: boundedCount(entry.gapSurfaceCount),
      firstBlockerCount: boundedCount(entry.firstBlockerCount),
      potentiallyUnlockableCount: boundedCount(entry.potentiallyUnlockableCount),
      proofCompleteness: asSafeControlCenterCode(entry.proofCompleteness) ?? asSafeControlCenterCode('UNKNOWN')!,
      dependencyFanOut: boundedCount(entry.dependencyFanOut),
      bugHuntingValue: asSafeControlCenterCode(entry.bugHuntingValue) ?? asSafeControlCenterCode('UNKNOWN')!,
    }))
    .sort((left, right) => left.rank - right.rank || left.family.localeCompare(right.family));
  return {
    schemaVersion: census.schemaVersion,
    sourceSnapshotDigest: asSafeControlCenterDigest(census.sourceSnapshotDigest),
    sourceSurfaceDigest: asSafeControlCenterDigest(census.sourceSurfaceDigest),
    phase24PortfolioDigest: asSafeControlCenterDigest(census.phase24PortfolioDigest),
    censusDigest: asSafeControlCenterDigest(census.deterministicDigest),
    totalOperations: boundedCount(census.summary.totalOperations),
    phase24Eligible: boundedCount(census.summary.phase24Eligible),
    phase24Excluded: boundedCount(census.summary.phase24Excluded),
    runtimeBindings: boundedCount(census.summary.runtimeBindings),
    runtimeBindingMissing: boundedCount(census.summary.runtimeBindingMissing),
    replayRequirementsProven: boundedCount(census.summary.replayRequirementsProven),
    dossierCompatible: boundedCount(census.summary.dossierCompatible),
    currentnessFailureCount: boundedCount(census.summary.currentnessFailureCount),
    primaryBlockingStages: proofChainRollup(census.summary.primaryBlockingStageCounts),
    stageStatusCounts,
    proofFamilies,
  };
}


function unavailableSourceCompleteness(): ControlCenterSourceCompletenessDto {
  return {
    state: 'UNKNOWN',
    coverageState: 'UNMEASURED',
    limit: 0,
    total: null,
    examined: 0,
    projected: 0,
    dropped: 0,
    truncated: false,
    remainingUnknown: true,
    enumeration: {
      state: 'UNKNOWN',
      limit: 0,
      examinedFiles: 0,
      totalFiles: null,
      droppedFiles: null,
      remainingUnknown: true,
    },
    contentRead: {
      state: 'UNKNOWN',
      candidateFiles: 0,
      readFiles: 0,
      admittedFiles: 0,
      droppedFiles: 0,
      unreadableFiles: 0,
    },
  };
}

function sourceCompletenessDto(
  operationCompleteness: SourceOperationProjectionCompleteness | null | undefined,
  inventoryCompleteness: SourceInventoryCompleteness | null | undefined,
): ControlCenterSourceCompletenessDto {
  if (operationCompleteness === null || operationCompleteness === undefined || inventoryCompleteness === null || inventoryCompleteness === undefined) {
    return unavailableSourceCompleteness();
  }
  const validStates: readonly ControlCenterSourceCompletenessState[] = ['COMPLETE', 'TRUNCATED', 'UNKNOWN'];
  const state = validStates.includes(operationCompleteness.state as ControlCenterSourceCompletenessState)
    ? (operationCompleteness.state as ControlCenterSourceCompletenessState)
    : 'UNKNOWN';
  const validCoverage: readonly ControlCenterSourceCoverageState[] = ['PROVEN', 'UNPROVEN', 'UNSUPPORTED', 'TRUNCATED', 'STALE', 'UNKNOWN', 'UNMEASURED'];
  const rawCoverage = operationCompleteness.coverageState as ControlCenterSourceCoverageState;
  const coverageState = validCoverage.includes(rawCoverage) ? rawCoverage : 'UNMEASURED';
  const enumeration = inventoryCompleteness.enumeration;
  const enumState = validStates.includes(enumeration.state as ControlCenterSourceCompletenessState)
    ? (enumeration.state as ControlCenterSourceCompletenessState)
    : 'UNKNOWN';
  const contentRead = inventoryCompleteness.contentRead;
  const contentState = validStates.includes(contentRead.state as ControlCenterSourceCompletenessState)
    ? (contentRead.state as ControlCenterSourceCompletenessState)
    : 'UNKNOWN';
  return {
    state,
    coverageState,
    limit: boundedCount(operationCompleteness.limit),
    total: operationCompleteness.totalOperations === null ? null : boundedCount(operationCompleteness.totalOperations),
    examined: boundedCount(operationCompleteness.examinedOperations),
    projected: boundedCount(operationCompleteness.projectedOperations),
    dropped: boundedCount(operationCompleteness.droppedOperations),
    truncated: Boolean(operationCompleteness.truncated),
    remainingUnknown: Boolean(operationCompleteness.remainingUnknown),
    enumeration: {
      state: enumState,
      limit: boundedCount(enumeration.limit),
      examinedFiles: boundedCount(enumeration.examinedFiles),
      totalFiles: enumeration.totalFiles === null ? null : boundedCount(enumeration.totalFiles),
      droppedFiles: enumeration.droppedFiles === null ? null : boundedCount(enumeration.droppedFiles),
      remainingUnknown: Boolean(enumeration.remainingUnknown),
    },
    contentRead: {
      state: contentState,
      candidateFiles: boundedCount(contentRead.candidateFiles),
      readFiles: boundedCount(contentRead.readFiles),
      admittedFiles: boundedCount(contentRead.admittedFiles),
      droppedFiles: boundedCount(contentRead.droppedFiles),
      unreadableFiles: boundedCount(contentRead.unreadableFiles),
    },
  };
}

/** Project source descriptors without exposing source paths, symbols, or text. */
export function projectSourceSurfaces(descriptors: readonly RealSourceSurfaceDescriptor[], repositoryFilter?: unknown, requestedLimit?: unknown): ControlCenterSourceSurfacesDto {
  const filter = typeof repositoryFilter === 'string' ? repositoryFilter : null;
  const rows = descriptors
    .filter((descriptor) => filter === null || descriptor.source.repoId === filter)
    .map(surfaceDto)
    .filter((surface): surface is ControlCenterSourceSurfaceDto => surface !== null)
    .sort((left, right) => left.surfaceId.localeCompare(right.surfaceId));
  const collection = boundedCollection(rows, requestedLimit);
  return {
    schemaVersion: CONTROL_CENTER_SOURCE_SURFACES_SCHEMA_VERSION,
    ...collection,
    repositoryFilter: filter === null ? null : publicIdentity('cc-repository', filter),
  };
}

export function projectSourceSummary(
  descriptors: readonly RealSourceSurfaceDescriptor[],
  authority: SourceSummaryAuthorityInput = {},
): ControlCenterSourceSummaryDto {
  const rows = descriptors.map(surfaceDto).filter((surface): surface is ControlCenterSourceSurfaceDto => surface !== null);
  const currentnessValues = authority.repositoryCurrentness === undefined
    ? rows.map((row) => row.currentness)
    : [...authority.repositoryCurrentness];
  const lifecycleValues = rows.map((row) => row.lifecycle);
  const proofValues = rows.map((row) => row.routeProof);
  const capabilityValues = rows.map((row) => row.projectionCapability);
  const gapReasons = sortedUniqueCodes([...rows.flatMap((row) => row.exclusionReasons), ...(authority.reasonCodes ?? [])]);
  const derivedState: ControlCenterSourceSummaryDto['state'] = rows.length === 0
    ? 'EMPTY'
    : rows.some((row) => row.currentness === 'SOURCE_UNAVAILABLE')
      ? 'UNAVAILABLE'
      : rows.some((row) => row.currentness === 'SOURCE_STALE')
        ? 'STALE'
        : 'AVAILABLE';
  const state = authority.state ?? derivedState;
  const digest = prefixedDigest24('cc-source-inventory', rows.map((row) => ({
    id: row.surfaceId,
    repo: row.repositoryId,
    sha: row.sourceSha,
    evidence: row.evidenceDigest,
    currentness: row.currentness,
    lifecycle: row.lifecycle,
  })));
  const completeness = sourceCompletenessDto(authority.operationCompleteness, authority.inventoryCompleteness);
  return {
    schemaVersion: CONTROL_CENTER_SOURCE_SUMMARY_SCHEMA_VERSION,
    state,
    inventoryDigest: asSafeControlCenterDigest(authority.inventoryDigest) ?? asSafeControlCenterDigest(digest),
    repositoryCount: authority.repositoryCount === undefined ? new Set(rows.map((row) => row.repositoryId)).size : boundedCount(authority.repositoryCount),
    surfaceCount: rows.length,
    currentness: rollup(currentnessValues),
    lifecycle: rollup(lifecycleValues),
    proof: rollup(proofValues),
    capabilities: rollup(capabilityValues),
    gapReasons,
    proofChain: proofChainDto(authority.proofChain),
    completeness,
  };
}

function proofForJoin(join: SourceEvidenceJoin['state']): ControlCenterSourceGraphNodeDto['proof'] {
  if (join === 'PROVEN') return 'PROVEN';
  if (join === 'AMBIGUOUS' || join === 'MULTIPLE_SYMBOLS') return 'AMBIGUOUS';
  if (join === 'SOURCE_STALE') return 'STALE';
  if (join === 'MISSING_SYMBOL') return 'MISSING';
  return 'UNSUPPORTED';
}

function proofForSurface(surface: ControlCenterSourceSurfaceDto): ControlCenterSourceGraphNodeDto['proof'] {
  if (surface.routeProof === 'PROVEN') return 'PROVEN';
  if (surface.routeProof === 'AMBIGUOUS') return 'AMBIGUOUS';
  return 'UNSUPPORTED';
}

function joinNodeKind(join: SourceEvidenceJoin): ControlCenterSourceGraphNodeKind {
  if (join.kind === 'ROUTE_HANDLER') return 'HANDLER';
  if (join.kind === 'HANDLER_REQUEST_CONTRACT') return 'REQUEST_CONTRACT';
  if (join.kind === 'HANDLER_RESPONSE_CONTRACT') return 'RESPONSE_CONTRACT';
  if (join.kind === 'RESPONSE_FLOW') return 'RESPONSE_FLOW';
  return 'SEMANTIC_CONTRACT';
}

function joinEdgeKind(join: SourceEvidenceJoin): ControlCenterSourceGraphEdgeKind {
  if (join.kind === 'ROUTE_HANDLER') return 'RESOLVES_HANDLER';
  if (join.kind === 'HANDLER_REQUEST_CONTRACT') return 'JOINS_REQUEST';
  if (join.kind === 'HANDLER_RESPONSE_CONTRACT') return 'JOINS_RESPONSE';
  if (join.kind === 'RESPONSE_FLOW') return 'PROVES_RESPONSE_FLOW';
  return 'JOINS_SEMANTIC';
}

function graphLimit(value: unknown, fallback: number, maximum: number): number {
  return boundedInteger(value, 1, maximum) ?? fallback;
}

/** Build a bounded source-proof neighborhood. Identity-bearing source text is hashed, never emitted. */
export function projectSourceGraph(
  descriptors: readonly RealSourceSurfaceDescriptor[],
  requestedSurfaceId?: unknown,
  requestedDepth?: unknown,
  requestedNodeLimit?: unknown,
  requestedEdgeLimit?: unknown,
): ControlCenterSourceGraphDto {
  const depth = boundedGraphDepth(requestedDepth) ?? CONTROL_CENTER_LIMITS.defaultGraphDepth;
  const nodeLimit = graphLimit(requestedNodeLimit, CONTROL_CENTER_LIMITS.defaultGraphNodes, CONTROL_CENTER_LIMITS.maxGraphNodes);
  const edgeLimit = graphLimit(requestedEdgeLimit, CONTROL_CENTER_LIMITS.defaultGraphEdges, CONTROL_CENTER_LIMITS.maxGraphEdges);
  const requested = asSafeControlCenterId(requestedSurfaceId);
  const selected = descriptors
    .filter((descriptor) => requested === null || descriptor.surfaceId === requested)
    .map((descriptor) => ({ descriptor, dto: surfaceDto(descriptor) }))
    .filter((entry): entry is { descriptor: RealSourceSurfaceDescriptor; dto: ControlCenterSourceSurfaceDto } => entry.dto !== null)
    .slice(0, requested === null ? 100 : 1);
  const nodes: ControlCenterSourceGraphNodeDto[] = [];
  const edges: ControlCenterSourceGraphEdgeDto[] = [];
  for (const entry of selected) {
    const surface = entry.dto;
    const surfaceNodeId = publicIdentity('cc-source-node', { kind: 'SURFACE', surfaceId: surface.surfaceId });
    nodes.push({
      nodeId: surfaceNodeId,
      kind: 'SURFACE',
      label: asSafeControlCenterLabel(surface.surfaceId),
      proof: proofForSurface(surface),
      currentness: surface.currentness,
      lifecycle: surface.lifecycle,
      capability: surface.projectionCapability,
    });
    if (depth < 1) continue;
    const operationNodeId = publicIdentity('cc-source-node', { kind: 'OPERATION', surfaceId: surface.surfaceId });
    nodes.push({
      nodeId: operationNodeId,
      kind: 'OPERATION',
      label: surface.routeTemplate === null ? null : asSafeControlCenterLabel(surface.routeTemplate),
      proof: proofForSurface(surface),
      currentness: surface.currentness,
      lifecycle: surface.lifecycle,
      capability: surface.projectionCapability,
    });
    edges.push({
      edgeId: publicIdentity('cc-source-edge', { surfaceNodeId, operationNodeId, kind: 'IMPLEMENTS_ROUTE' }),
      fromNodeId: surfaceNodeId,
      toNodeId: operationNodeId,
      kind: 'IMPLEMENTS_ROUTE',
      proof: proofForSurface(surface),
    });
    if (depth < 2) continue;
    for (const join of entry.descriptor.joins) {
      const childKind = joinNodeKind(join);
      const childNodeId = publicIdentity('cc-source-node', {
        kind: childKind,
        surfaceId: surface.surfaceId,
        identity: join.toIdentity,
        from: join.fromIdentity,
      });
      nodes.push({
        nodeId: childNodeId,
        kind: childKind,
        label: null,
        proof: proofForJoin(join.state),
        currentness: surface.currentness,
        lifecycle: null,
        capability: join.state === 'PROVEN' ? 'SUPPORTED' : 'UNPROVEN',
      });
      edges.push({
        edgeId: publicIdentity('cc-source-edge', { operationNodeId, childNodeId, kind: joinEdgeKind(join) }),
        fromNodeId: operationNodeId,
        toNodeId: childNodeId,
        kind: joinEdgeKind(join),
        proof: proofForJoin(join.state),
      });
    }
  }
  const sortedNodes = [...new Map(nodes.map((node) => [node.nodeId, node])).values()]
    .sort((left, right) => left.nodeId.localeCompare(right.nodeId));
  const boundedNodes = sortedNodes.slice(0, nodeLimit);
  const nodeSet = new Set(boundedNodes.map((node) => node.nodeId));
  const sortedEdges = [...new Map(edges.map((edge) => [edge.edgeId, edge])).values()]
    .filter((edge) => nodeSet.has(edge.fromNodeId) && nodeSet.has(edge.toNodeId))
    .sort((left, right) => left.edgeId.localeCompare(right.edgeId));
  const boundedEdges = sortedEdges.slice(0, edgeLimit);
  return {
    schemaVersion: CONTROL_CENTER_SOURCE_GRAPH_SCHEMA_VERSION,
    surfaceId: requested,
    depth,
    nodes: boundedNodes,
    edges: boundedEdges,
    nodeLimit,
    edgeLimit,
    truncated: boundedNodes.length < sortedNodes.length || boundedEdges.length < sortedEdges.length,
  };
}
