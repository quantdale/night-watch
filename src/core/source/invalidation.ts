// ---------------------------------------------------------------------------
// Nightwatch Phase 25 — incremental source-surface change intelligence.
//
// This is a read-only comparison layer over bounded inventories/descriptors.
// Candidate invalidation remains owned by Phase 24; this module supplies the
// precise source/file/contract change context and delegates candidate state to
// the existing fail-closed ledger.
// ---------------------------------------------------------------------------

import { buildPhase24CandidateInvalidationLedger } from '../phase24/invalidation';
import type { Phase24CandidatePortfolio } from '../phase24/types';
import { safeSemanticDigest } from '../semanticCoverage/types';
import { compareSourceGapTaxonomies } from './gapTaxonomy';
import type { RealSourceSnapshotInventory, SourceSnapshotFileRecord } from './scanTypes';
import {
  REAL_SOURCE_SURFACE_CHANGE_REPORT_VERSION,
  type RealSourceSurfaceDescriptor,
  type SourceFileChangeRecord,
  type SourceSurfaceChangeReport,
} from './surfaceTypes';
import type { SourceSurfaceDiscovery } from './surfaces';

function sortedUnique(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function fileKey(file: Pick<SourceSnapshotFileRecord, 'repoId' | 'relativePath'>): string {
  return `${file.repoId}:${file.relativePath}`;
}

function fileFingerprint(file: SourceSnapshotFileRecord): string {
  return JSON.stringify({ sourceSha: file.sourceSha, language: file.language, byteCount: file.byteCount, contentDigest: file.contentDigest, status: file.status, rejectionReason: file.rejectionReason });
}

function fileChange(input: { readonly prior: SourceSnapshotFileRecord | undefined; readonly current: SourceSnapshotFileRecord | undefined; readonly change: SourceFileChangeRecord['change'] }): SourceFileChangeRecord {
  const file = input.current ?? input.prior;
  if (file === undefined) throw new Error('REAL_SOURCE_CHANGE_FILE_MISSING');
  return {
    repository: file.repoId,
    relativePath: file.relativePath,
    priorSourceSha: input.prior?.sourceSha ?? null,
    currentSourceSha: input.current?.sourceSha ?? null,
    priorContentDigest: input.prior?.contentDigest ?? null,
    currentContentDigest: input.current?.contentDigest ?? null,
    change: input.change,
  };
}

function stableSurfaceKey(surface: RealSourceSurfaceDescriptor): string {
  const operation = surface.operation;
  return `${operation.repository}:${operation.sourcePath}:${operation.method}:${operation.routeTemplate}:${operation.handlerPath ?? ''}:${operation.handlerSymbol ?? ''}`;
}

function operationFingerprint(surface: RealSourceSurfaceDescriptor): string {
  const operation = surface.operation;
  return JSON.stringify({ sourceSha: operation.sourceSha, evidenceDigest: operation.evidenceDigest, language: operation.language, routeProof: operation.routeProof, routeRejectionReason: operation.routeRejectionReason, readOnlyClassification: operation.readOnlyClassification, runtimeBinding: operation.runtimeBinding, targetId: operation.targetId, deploymentStatusUnresolved: operation.deploymentStatusUnresolved });
}

function joinFingerprint(surface: RealSourceSurfaceDescriptor, kind: 'ROUTE_HANDLER' | 'HANDLER_REQUEST_CONTRACT' | 'HANDLER_RESPONSE_CONTRACT'): string {
  const join = surface.joins.find((entry) => entry.kind === kind);
  return JSON.stringify({ state: join?.state ?? null, toIdentity: join?.toIdentity ?? null, evidenceDigest: join?.evidenceDigest ?? null });
}

function contractFingerprint(surface: RealSourceSurfaceDescriptor, kind: 'REQUEST' | 'RESPONSE' | 'SEMANTIC'): string {
  const contract = surface.contract;
  if (kind === 'REQUEST') return JSON.stringify({ id: contract.requestContractId, evidence: contract.requestEvidenceDigest, proof: contract.requestProof });
  const flow = contract.responseFlow === null ? null : {
    schemaVersion: contract.responseFlow.schemaVersion,
    status: contract.responseFlow.status,
    depth: contract.responseFlow.depth,
    rejectionCode: contract.responseFlow.rejectionCode,
    proofDigest: contract.responseFlow.proofDigest,
    declarations: contract.responseFlow.declarations.map((declaration) => ({ declarationId: declaration.declarationId, repoId: declaration.repoId, sourceSha: declaration.sourceSha, relativePath: declaration.relativePath, contentDigest: declaration.contentDigest })).sort((left, right) => left.declarationId.localeCompare(right.declarationId)),
    edges: contract.responseFlow.edges,
  };
  if (kind === 'RESPONSE') return JSON.stringify({ id: contract.responseContractId, evidence: contract.responseEvidenceDigest, proof: contract.responseProof, flow });
  return JSON.stringify({ ids: contract.semanticContractIds, proof: contract.semanticProof, flow });
}

function inventoryChangeReport(prior: RealSourceSnapshotInventory | null, current: RealSourceSnapshotInventory): { readonly addedFiles: readonly SourceFileChangeRecord[]; readonly removedFiles: readonly SourceFileChangeRecord[]; readonly changedFiles: readonly SourceFileChangeRecord[]; readonly unchangedFileCount: number } {
  const priorByKey = new Map((prior?.files ?? []).map((file) => [fileKey(file), file]));
  const currentByKey = new Map(current.files.map((file) => [fileKey(file), file]));
  const addedFiles: SourceFileChangeRecord[] = [];
  const removedFiles: SourceFileChangeRecord[] = [];
  const changedFiles: SourceFileChangeRecord[] = [];
  let unchangedFileCount = 0;
  for (const key of [...new Set([...priorByKey.keys(), ...currentByKey.keys()])].sort((left, right) => left.localeCompare(right))) {
    const oldFile = priorByKey.get(key);
    const newFile = currentByKey.get(key);
    if (oldFile === undefined && newFile !== undefined) addedFiles.push(fileChange({ prior: oldFile, current: newFile, change: 'ADDED' }));
    else if (oldFile !== undefined && newFile === undefined) removedFiles.push(fileChange({ prior: oldFile, current: newFile, change: 'REMOVED' }));
    else if (oldFile !== undefined && newFile !== undefined && fileFingerprint(oldFile) !== fileFingerprint(newFile)) changedFiles.push(fileChange({ prior: oldFile, current: newFile, change: 'CHANGED' }));
    else unchangedFileCount += 1;
  }
  return { addedFiles, removedFiles, changedFiles, unchangedFileCount };
}

function compareSurfaceEvidence(prior: SourceSurfaceDiscovery | null, current: SourceSurfaceDiscovery): { readonly changedOperations: readonly string[]; readonly changedHandlers: readonly string[]; readonly changedRequestContracts: readonly string[]; readonly changedResponseContracts: readonly string[]; readonly changedSemanticContracts: readonly string[]; readonly unchangedSurfaceIds: readonly string[]; readonly newSurfaceIds: readonly string[]; readonly removedSurfaceIds: readonly string[] } {
  const priorByKey = new Map((prior?.surfaces ?? []).map((surface) => [stableSurfaceKey(surface), surface]));
  const currentByKey = new Map(current.surfaces.map((surface) => [stableSurfaceKey(surface), surface]));
  const changedOperations: string[] = [];
  const changedHandlers: string[] = [];
  const changedRequestContracts: string[] = [];
  const changedResponseContracts: string[] = [];
  const changedSemanticContracts: string[] = [];
  const unchangedSurfaceIds: string[] = [];
  const newSurfaceIds: string[] = [];
  const removedSurfaceIds: string[] = [];
  for (const key of [...new Set([...priorByKey.keys(), ...currentByKey.keys()])].sort((left, right) => left.localeCompare(right))) {
    const oldSurface = priorByKey.get(key);
    const newSurface = currentByKey.get(key);
    if (oldSurface === undefined && newSurface !== undefined) {
      newSurfaceIds.push(newSurface.surfaceId);
      continue;
    }
    if (oldSurface !== undefined && newSurface === undefined) {
      removedSurfaceIds.push(oldSurface.surfaceId);
      continue;
    }
    if (oldSurface === undefined || newSurface === undefined) continue;
    if (operationFingerprint(oldSurface) !== operationFingerprint(newSurface)) changedOperations.push(key);
    if (joinFingerprint(oldSurface, 'ROUTE_HANDLER') !== joinFingerprint(newSurface, 'ROUTE_HANDLER')) changedHandlers.push(key);
    if (contractFingerprint(oldSurface, 'REQUEST') !== contractFingerprint(newSurface, 'REQUEST')) changedRequestContracts.push(key);
    if (contractFingerprint(oldSurface, 'RESPONSE') !== contractFingerprint(newSurface, 'RESPONSE')) changedResponseContracts.push(key);
    if (contractFingerprint(oldSurface, 'SEMANTIC') !== contractFingerprint(newSurface, 'SEMANTIC')) changedSemanticContracts.push(key);
    if (oldSurface.deterministicDigest === newSurface.deterministicDigest) unchangedSurfaceIds.push(newSurface.surfaceId);
  }
  return { changedOperations: sortedUnique(changedOperations), changedHandlers: sortedUnique(changedHandlers), changedRequestContracts: sortedUnique(changedRequestContracts), changedResponseContracts: sortedUnique(changedResponseContracts), changedSemanticContracts: sortedUnique(changedSemanticContracts), unchangedSurfaceIds: sortedUnique(unchangedSurfaceIds), newSurfaceIds: sortedUnique(newSurfaceIds), removedSurfaceIds: sortedUnique(removedSurfaceIds) };
}

function lifecycleCounts(discovery: SourceSurfaceDiscovery): SourceSurfaceChangeReport['lifecycleCounts'] {
  const counts: Record<SourceSurfaceChangeReport['lifecycleCounts'] extends Readonly<Record<infer K, number>> ? K : never, number> = {
    DISCOVERED: 0,
    MECHANICALLY_PROVEN: 0,
    PROJECTABLE: 0,
    SCENARIO_BOUND: 0,
    REPLAY_SUPPORTED: 0,
    MINIMIZATION_SUPPORTED: 0,
    DIFFERENTIAL_CAPABLE: 0,
    FULL_LIFECYCLE: 0,
  };
  for (const surface of discovery.surfaces) counts[surface.lifecycle] += 1;
  return counts;
}

/** Compare two bounded source discoveries while delegating candidate state to Phase24. */
export function compareSourceSurfaces(input: {
  readonly prior: { readonly discovery: SourceSurfaceDiscovery; readonly portfolio: Phase24CandidatePortfolio | null } | null;
  readonly current: { readonly discovery: SourceSurfaceDiscovery; readonly portfolio: Phase24CandidatePortfolio | null };
}): SourceSurfaceChangeReport {
  const files = inventoryChangeReport(input.prior?.discovery.inventory ?? null, input.current.discovery.inventory);
  const surfaces = compareSurfaceEvidence(input.prior?.discovery ?? null, input.current.discovery);
  // Availability is part of the current source authority and must remain
  // scoped to each approved repository. A healthy repository must not mask a
  // different repository whose candidate source disappeared.
  const sourceAvailability = input.current.discovery.inventory.repositories
    .map((repository) => ({ repoId: repository.repoId, available: repository.status === 'CURRENT' }))
    .sort((left, right) => left.repoId.localeCompare(right.repoId));
  const gapTaxonomyChange = compareSourceGapTaxonomies(input.prior?.discovery.gapTaxonomy ?? null, input.current.discovery.gapTaxonomy);
  const invalidationLedger = input.prior?.portfolio !== null || input.current.portfolio !== null
    ? buildPhase24CandidateInvalidationLedger({ prior: input.prior?.portfolio ?? null, current: input.current.portfolio ?? null, sourceAvailability })
    : null;
  const core = {
    schemaVersion: REAL_SOURCE_SURFACE_CHANGE_REPORT_VERSION,
    priorInventoryDigest: input.prior?.discovery.inventory.snapshotDigest ?? null,
    currentInventoryDigest: input.current.discovery.inventory.snapshotDigest,
    addedFiles: files.addedFiles,
    removedFiles: files.removedFiles,
    changedFiles: files.changedFiles,
    unchangedFileCount: files.unchangedFileCount,
    changedOperations: surfaces.changedOperations,
    changedHandlers: surfaces.changedHandlers,
    changedRequestContracts: surfaces.changedRequestContracts,
    changedResponseContracts: surfaces.changedResponseContracts,
    changedSemanticContracts: surfaces.changedSemanticContracts,
    unchangedSurfaceIds: surfaces.unchangedSurfaceIds,
    newSurfaceIds: surfaces.newSurfaceIds,
    removedSurfaceIds: surfaces.removedSurfaceIds,
    lifecycleCounts: lifecycleCounts(input.current.discovery),
    gapTaxonomyChange,
    invalidationLedger,
  };
  return { ...core, deterministicDigest: safeSemanticDigest(core, 'source-surface-change-report') };
}
