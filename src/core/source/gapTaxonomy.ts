// ---------------------------------------------------------------------------
// Phase 28 — bounded, privacy-safe source proof-gap taxonomy.
//
// This module consumes only sanitized inventory/surface DTOs. It does not read
// source, tokenize PHP, execute code, or retain diagnostic details. Categories
// are fixed architectural classes so a source update can be compared without
// persisting source fragments or exception text.
// ---------------------------------------------------------------------------

import { safeSemanticDigest } from '../semanticCoverage/types';
import type { RealSourceSnapshotInventory, SourceScanLanguage } from './scanTypes';
import type { SourceAnalyzerDiagnostic, SourceDiagnosticRejectionFamily, SourceJoinState } from './surfaceTypes';
import type { RealSourceSurfaceDescriptor } from './surfaceTypes';

export const REAL_SOURCE_GAP_TAXONOMY_VERSION = 'nightwatch.real-source-gap-taxonomy.v3' as const;
export const MAX_SOURCE_GAP_SURFACE_SAMPLES = 32;
export const MAX_SOURCE_GAP_DIMENSION_ROWS = 64;

export const SOURCE_GAP_DIMENSIONS = [
  'proofDomain',
  'repository',
  'language',
  'routeCategory',
  'handlerCategory',
  'responseProofState',
  'semanticProofState',
  'analyzerFamily',
  'analyzerVersion',
  'rejectionFamily',
  'rejectionCode',
  'syntaxFamily',
  'controlFlowFamily',
  'returnExpressionFamily',
  'declarationResolutionFamily',
  'lexicalBudgetFamily',
  'currentnessState',
  'ambiguityClass',
] as const;
export type SourceGapDimension = (typeof SOURCE_GAP_DIMENSIONS)[number];
export type SourceGapProofDomain = 'RESPONSE_ANALYZER' | 'RESPONSE_JOIN' | 'SEMANTIC_JOIN';

export interface SourceGapCount {
  readonly code: string;
  readonly count: number;
}

export interface SourceGapSurfaceSample {
  readonly surfaceId: string;
  readonly repository: string;
  readonly sourcePath: string;
  readonly routeTemplate: string;
  readonly handlerPath: string | null;
  readonly handlerSymbol: string | null;
  readonly gapCount: number;
}

export interface SourceScanGapCount {
  readonly repository: string;
  readonly language: SourceScanLanguage | 'UNKNOWN';
  readonly rejectionCode: string;
  readonly count: number;
}

export interface SourceGapTaxonomy {
  readonly schemaVersion: typeof REAL_SOURCE_GAP_TAXONOMY_VERSION;
  readonly inventoryDigest: string;
  readonly surfaceCount: number;
  readonly proofGapSurfaceCount: number;
  readonly rejectedDiagnosticCount: number;
  readonly dimensions: Readonly<Record<SourceGapDimension, readonly SourceGapCount[]>>;
  readonly scanRejectionCounts: readonly SourceScanGapCount[];
  readonly topGapSurfaces: readonly SourceGapSurfaceSample[];
  readonly omittedGapSurfaceSampleCount: number;
  readonly deterministicDigest: string;
}

export const REAL_SOURCE_GAP_TAXONOMY_CHANGE_VERSION = 'nightwatch.real-source-gap-taxonomy-change.v1' as const;

export interface SourceGapTaxonomyDimensionChange {
  readonly dimension: SourceGapDimension;
  readonly added: readonly SourceGapCount[];
  readonly removed: readonly SourceGapCount[];
  readonly changed: readonly { readonly code: string; readonly priorCount: number; readonly currentCount: number }[];
}

export interface SourceGapTaxonomyChange {
  readonly schemaVersion: typeof REAL_SOURCE_GAP_TAXONOMY_CHANGE_VERSION;
  readonly priorDigest: string | null;
  readonly currentDigest: string;
  readonly changedDimensions: readonly SourceGapTaxonomyDimensionChange[];
  readonly deterministicDigest: string;
}

interface GapContext {
  readonly proofDomain: SourceGapProofDomain;
  readonly analyzerFamily: string;
  readonly analyzerVersion: string;
  readonly rejectionCode: string;
  readonly rejectionFamily: SourceDiagnosticRejectionFamily;
  readonly responseProofState: SourceJoinState;
  readonly semanticProofState: SourceJoinState;
  readonly currentnessState: RealSourceSurfaceDescriptor['currentness'];
  readonly ambiguityClass: string;
}

interface SurfaceGapRecord {
  readonly surface: RealSourceSurfaceDescriptor;
  readonly context: GapContext;
  readonly syntaxFamily: string;
  readonly controlFlowFamily: string;
  readonly returnExpressionFamily: string;
  readonly declarationResolutionFamily: string;
  readonly lexicalBudgetFamily: string;
}

function sortedCounts(counts: Map<string, number>): readonly SourceGapCount[] {
  const entries = [...counts.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((left, right) => left.code.localeCompare(right.code));
  if (entries.length <= MAX_SOURCE_GAP_DIMENSION_ROWS) return entries;
  const kept = entries.slice(0, MAX_SOURCE_GAP_DIMENSION_ROWS - 1);
  const omittedCount = entries.slice(MAX_SOURCE_GAP_DIMENSION_ROWS - 1).reduce((total, entry) => total + entry.count, 0);
  return [...kept, { code: 'CATEGORY_CARDINALITY_EXCEEDED', count: omittedCount }];
}

function increment(dimensions: Map<SourceGapDimension, Map<string, number>>, dimension: SourceGapDimension, value: string): void {
  const counts = dimensions.get(dimension);
  if (counts === undefined) throw new Error('SOURCE_GAP_DIMENSION_MISSING');
  counts.set(value, (counts.get(value) ?? 0) + 1);
}

function safeRouteCategory(surface: RealSourceSurfaceDescriptor): string {
  const operation = surface.operation;
  return `${operation.language}_${operation.routeProof}`;
}

function safeHandlerCategory(surface: RealSourceSurfaceDescriptor): string {
  const path = surface.operation.handlerPath;
  if (path === null) return 'HANDLER_PATH_MISSING';
  if (path.endsWith('.php')) return 'PHP_HANDLER';
  if (path.endsWith('.go')) return 'GO_HANDLER';
  if (/\.(?:ts|tsx|js|jsx)$/i.test(path)) return 'SCRIPT_HANDLER';
  return 'OTHER_HANDLER';
}

function handlerLanguage(discovery: { readonly inventory: RealSourceSnapshotInventory }, surface: RealSourceSurfaceDescriptor): SourceScanLanguage | 'UNKNOWN' {
  const path = surface.operation.handlerPath;
  if (path === null) return surface.operation.language;
  const file = discovery.inventory.files.find((entry) => entry.repoId === surface.operation.repository && entry.relativePath === path);
  return file?.language ?? surface.operation.language;
}

function ambiguityClass(code: string, surface: RealSourceSurfaceDescriptor): string {
  if (code.includes('AMBIGUOUS') || surface.joins.some((join) => join.state === 'AMBIGUOUS' || join.state === 'MULTIPLE_SYMBOLS')) return 'AMBIGUOUS_BINDING';
  if (code.includes('DYNAMIC')) return 'DYNAMIC_DISPATCH';
  if (code.includes('MISSING')) return 'MISSING_SYMBOL';
  if (code.includes('STALE') || code.includes('CURRENT')) return 'CURRENTNESS_FAILURE';
  return 'NONE';
}

function syntaxFamily(analyzerFamily: string, rejectionCode: string): string {
  if (analyzerFamily === 'PHP_RESPONSE_FLOW') return rejectionCode.includes('DYNAMIC') ? 'DYNAMIC_CALL' : rejectionCode.includes('BRANCH') ? 'BRANCH_CALL_SET' : 'EXACT_CALL_FLOW';
  if (analyzerFamily === 'PHP_RETURN_ALIAS') return 'LOCAL_ALIAS';
  if (analyzerFamily === 'PHP_RETURN_OBJECT_FIELDS' || analyzerFamily === 'PHP_RETURN_ROOT_TYPE' || analyzerFamily === 'PHP_RETURN_FIELD_TYPE') return 'DIRECT_LITERAL_OR_BRANCH';
  if (analyzerFamily === 'PHP_ROW_KEYS_ASSIGN' || analyzerFamily === 'PHP_ROW_KEYS_PUSH') return 'ACCUMULATOR_LITERAL';
  if (analyzerFamily.startsWith('TS_')) return 'STATIC_SCRIPT_SCHEMA';
  if (analyzerFamily.startsWith('GO_')) return 'GO_STRUCT_SCHEMA';
  if (analyzerFamily.startsWith('OPENAPI_')) return 'OPENAPI_SCHEMA';
  if (rejectionCode.includes('SOURCE')) return 'SOURCE_BOUNDARY';
  return 'UNCLASSIFIED_SYNTAX';
}

function controlFlowFamily(analyzerFamily: string, rejectionCode: string, rejectionFamily: SourceDiagnosticRejectionFamily): string {
  if (rejectionCode.includes('BRANCH') || rejectionFamily === 'CONTROL_FLOW') return 'BRANCH_SET_INCOMPLETE';
  if (rejectionCode.includes('CYCLE')) return 'CYCLIC_FLOW';
  if (rejectionCode.includes('DEPTH') || rejectionCode.includes('DECLARATION')) return 'FLOW_BUDGET';
  if (rejectionCode.includes('DYNAMIC')) return 'DYNAMIC_CONTROL_FLOW';
  if (analyzerFamily === 'PHP_RETURN_ALIAS') return 'LOCAL_PRODUCER_NOT_PROVEN';
  return 'NOT_CLASSIFIED';
}

function returnExpressionFamily(analyzerFamily: string, rejectionCode: string): string {
  if (analyzerFamily === 'PHP_RESPONSE_FLOW') return rejectionCode.includes('DYNAMIC') ? 'DYNAMIC_CALL' : rejectionCode.includes('BRANCH') ? 'MIXED_RETURN_SET' : 'CALL_OR_TERMINAL';
  if (analyzerFamily === 'PHP_RETURN_ALIAS') return 'LOCAL_VARIABLE';
  if (analyzerFamily === 'PHP_RETURN_OBJECT_FIELDS' || analyzerFamily === 'PHP_RETURN_ROOT_TYPE' || analyzerFamily === 'PHP_RETURN_FIELD_TYPE') return 'DIRECT_ARRAY_OR_BRANCH';
  if (analyzerFamily === 'PHP_ROW_KEYS_ASSIGN' || analyzerFamily === 'PHP_ROW_KEYS_PUSH') return 'ACCUMULATOR_VARIABLE';
  return 'NOT_CLASSIFIED';
}

function declarationResolutionFamily(rejectionCode: string): string {
  if (rejectionCode.includes('AMBIGUOUS')) return 'AMBIGUOUS_SYMBOL';
  if (rejectionCode.includes('MISSING')) return 'MISSING_SYMBOL';
  if (rejectionCode.includes('UNAPPROVED')) return 'UNAPPROVED_DECLARATION';
  if (rejectionCode.includes('STALE')) return 'STALE_DECLARATION';
  if (rejectionCode.includes('UNAVAILABLE')) return 'UNAVAILABLE_DECLARATION';
  if (rejectionCode.includes('DYNAMIC')) return 'DYNAMIC_DISPATCH';
  if (rejectionCode.includes('DECLARATION')) return 'DECLARATION_BUDGET';
  return 'NOT_APPLICABLE';
}

function lexicalBudgetFamily(rejectionCode: string, rejectionFamily: SourceDiagnosticRejectionFamily): string {
  if (rejectionFamily === 'LEXICAL_BUDGET' || rejectionCode.includes('SOURCE_BUDGET') || rejectionCode.includes('INDEX_BUDGET')) return 'LEXICAL_OR_INDEX_BUDGET';
  if (rejectionCode.includes('DECLARATIONS_EXCEEDED') || rejectionCode.includes('BRANCH_BUDGET') || rejectionCode.includes('DEPTH_EXCEEDED')) return 'FLOW_RESOURCE_BUDGET';
  return 'NOT_APPLICABLE';
}

function diagnosticFamily(diagnostic: SourceAnalyzerDiagnostic): SourceDiagnosticRejectionFamily {
  return diagnostic.rejectionFamily ?? 'INTERNAL_UNCLASSIFIED';
}

function contextFor(input: { readonly surface: RealSourceSurfaceDescriptor; readonly proofDomain: SourceGapProofDomain; readonly analyzerFamily: string; readonly analyzerVersion: string; readonly rejectionCode: string; readonly rejectionFamily: SourceDiagnosticRejectionFamily }): GapContext {
  return {
    proofDomain: input.proofDomain,
    analyzerFamily: input.analyzerFamily,
    analyzerVersion: input.analyzerVersion,
    rejectionCode: input.rejectionCode,
    rejectionFamily: input.rejectionFamily,
    responseProofState: input.surface.contract.responseProof,
    semanticProofState: input.surface.contract.semanticProof,
    currentnessState: input.surface.currentness,
    ambiguityClass: ambiguityClass(input.rejectionCode, input.surface),
  };
}

function recordFor(input: { readonly discovery: { readonly inventory: RealSourceSnapshotInventory }; readonly surface: RealSourceSurfaceDescriptor; readonly proofDomain: SourceGapProofDomain; readonly analyzerFamily: string; readonly analyzerVersion: string; readonly rejectionCode: string; readonly rejectionFamily: SourceDiagnosticRejectionFamily }): SurfaceGapRecord {
  const context = contextFor(input);
  return {
    surface: input.surface,
    context,
    syntaxFamily: syntaxFamily(context.analyzerFamily, context.rejectionCode),
    controlFlowFamily: controlFlowFamily(context.analyzerFamily, context.rejectionCode, context.rejectionFamily),
    returnExpressionFamily: returnExpressionFamily(context.analyzerFamily, context.rejectionCode),
    declarationResolutionFamily: declarationResolutionFamily(context.rejectionCode),
    lexicalBudgetFamily: lexicalBudgetFamily(context.rejectionCode, context.rejectionFamily),
  };
}

function scanRejections(discovery: { readonly inventory: RealSourceSnapshotInventory }): readonly SourceScanGapCount[] {
  const counts = new Map<string, SourceScanGapCount & { count: number }>();
  for (const file of discovery.inventory.files) {
    if (file.status !== 'REJECTED' || file.rejectionReason === null) continue;
    const key = `${file.repoId}|${file.language ?? 'UNKNOWN'}|${file.rejectionReason}`;
    const current = counts.get(key);
    if (current === undefined) counts.set(key, { repository: file.repoId, language: file.language ?? 'UNKNOWN', rejectionCode: file.rejectionReason, count: 1 });
    else current.count += 1;
  }
  return [...counts.values()].sort((left, right) => left.repository.localeCompare(right.repository) || left.language.localeCompare(right.language) || left.rejectionCode.localeCompare(right.rejectionCode));
}

function gapRows(discovery: { readonly inventory: RealSourceSnapshotInventory; readonly surfaces: readonly RealSourceSurfaceDescriptor[] }): readonly SurfaceGapRecord[] {
  const records: SurfaceGapRecord[] = [];
  for (const surface of discovery.surfaces) {
    const rejected = surface.contract.responseAnalyzerDiagnostics.filter((diagnostic) => diagnostic.status === 'REJECTED');
    for (const diagnostic of rejected) {
      records.push(recordFor({
        discovery,
        surface,
        proofDomain: 'RESPONSE_ANALYZER',
        analyzerFamily: diagnostic.analyzerId,
        analyzerVersion: diagnostic.analyzerVersion,
        rejectionCode: diagnostic.flowRejectionCode ?? diagnostic.rejectionCode ?? 'ANALYZER_UNPROVEN',
        rejectionFamily: diagnosticFamily(diagnostic),
      }));
    }
    if (rejected.length === 0 && surface.contract.responseProof !== 'PROVEN') {
      records.push(recordFor({ discovery, surface, proofDomain: 'RESPONSE_JOIN', analyzerFamily: 'SOURCE_JOIN', analyzerVersion: 'nightwatch.source-join.v1', rejectionCode: `RESPONSE_${surface.contract.responseProof}`, rejectionFamily: 'SOURCE_CURRENTNESS' }));
    }
    if (rejected.length === 0 && surface.contract.semanticProof !== 'PROVEN') {
      records.push(recordFor({ discovery, surface, proofDomain: 'SEMANTIC_JOIN', analyzerFamily: 'SOURCE_JOIN', analyzerVersion: 'nightwatch.source-join.v1', rejectionCode: `SEMANTIC_${surface.contract.semanticProof}`, rejectionFamily: 'SOURCE_CURRENTNESS' }));
    }
  }
  return records;
}

function recordKey(record: SurfaceGapRecord, discovery: { readonly inventory: RealSourceSnapshotInventory }): Readonly<Record<SourceGapDimension, string>> {
  return {
    proofDomain: record.context.proofDomain,
    repository: record.surface.operation.repository,
    language: handlerLanguage(discovery, record.surface),
    routeCategory: safeRouteCategory(record.surface),
    handlerCategory: safeHandlerCategory(record.surface),
    responseProofState: record.context.responseProofState,
    semanticProofState: record.context.semanticProofState,
    analyzerFamily: record.context.analyzerFamily,
    analyzerVersion: record.context.analyzerVersion,
    rejectionFamily: record.context.rejectionFamily,
    rejectionCode: record.context.rejectionCode,
    syntaxFamily: record.syntaxFamily,
    controlFlowFamily: record.controlFlowFamily,
    returnExpressionFamily: record.returnExpressionFamily,
    declarationResolutionFamily: record.declarationResolutionFamily,
    lexicalBudgetFamily: record.lexicalBudgetFamily,
    currentnessState: record.context.currentnessState,
    ambiguityClass: record.context.ambiguityClass,
  };
}

function topSurfaces(records: readonly SurfaceGapRecord[]): { readonly samples: readonly SourceGapSurfaceSample[]; readonly omitted: number } {
  const counts = new Map<string, { readonly surface: RealSourceSurfaceDescriptor; count: number }>();
  for (const record of records) {
    const key = record.surface.surfaceId;
    const current = counts.get(key);
    if (current === undefined) counts.set(key, { surface: record.surface, count: 1 });
    else current.count += 1;
  }
  const sorted = [...counts.values()].sort((left, right) => right.count - left.count || left.surface.surfaceId.localeCompare(right.surface.surfaceId));
  const samples = sorted.slice(0, MAX_SOURCE_GAP_SURFACE_SAMPLES).map(({ surface, count }) => ({
    surfaceId: surface.surfaceId,
    repository: surface.operation.repository,
    sourcePath: surface.operation.sourcePath,
    routeTemplate: surface.operation.routeTemplate,
    handlerPath: surface.operation.handlerPath,
    handlerSymbol: surface.operation.handlerSymbol,
    gapCount: count,
  }));
  return { samples, omitted: Math.max(0, sorted.length - samples.length) };
}

/** Build a deterministic taxonomy from sanitized source-surface DTOs only. */
export function buildSourceGapTaxonomy(discovery: { readonly inventory: RealSourceSnapshotInventory; readonly surfaces: readonly RealSourceSurfaceDescriptor[] }): SourceGapTaxonomy {
  const dimensions = new Map<SourceGapDimension, Map<string, number>>();
  for (const dimension of SOURCE_GAP_DIMENSIONS) dimensions.set(dimension, new Map());
  const records = gapRows(discovery);
  for (const record of records) {
    const key = recordKey(record, discovery);
    for (const dimension of SOURCE_GAP_DIMENSIONS) increment(dimensions, dimension, key[dimension]);
  }
  const top = topSurfaces(records);
  const dimensionOutput = Object.fromEntries(SOURCE_GAP_DIMENSIONS.map((dimension) => [dimension, sortedCounts(dimensions.get(dimension) ?? new Map())])) as Readonly<Record<SourceGapDimension, readonly SourceGapCount[]>>;
  const core = {
    schemaVersion: REAL_SOURCE_GAP_TAXONOMY_VERSION,
    inventoryDigest: discovery.inventory.snapshotDigest,
    surfaceCount: discovery.surfaces.length,
    proofGapSurfaceCount: new Set(discovery.surfaces.filter((surface) => surface.contract.responseProof !== 'PROVEN' || surface.contract.semanticProof !== 'PROVEN').map((surface) => surface.surfaceId)).size,
    rejectedDiagnosticCount: discovery.surfaces.reduce((count, surface) => count + surface.contract.responseAnalyzerDiagnostics.filter((diagnostic) => diagnostic.status === 'REJECTED').length, 0),
    dimensions: dimensionOutput,
    scanRejectionCounts: scanRejections(discovery),
    topGapSurfaces: top.samples,
    omittedGapSurfaceSampleCount: top.omitted,
  } as const;
  return { ...core, deterministicDigest: safeSemanticDigest(core, 'source-gap-taxonomy') };
}

/** Compare only bounded categorical aggregates; source descriptors and values
 * never enter the delta. */
export function compareSourceGapTaxonomies(prior: SourceGapTaxonomy | null, current: SourceGapTaxonomy): SourceGapTaxonomyChange {
  const changedDimensions: SourceGapTaxonomyDimensionChange[] = [];
  for (const dimension of SOURCE_GAP_DIMENSIONS) {
    const priorCounts = new Map((prior?.dimensions[dimension] ?? []).map((entry) => [entry.code, entry.count]));
    const currentCounts = new Map(current.dimensions[dimension].map((entry) => [entry.code, entry.count]));
    const added = [...currentCounts.entries()].filter(([code]) => !priorCounts.has(code)).map(([code, count]) => ({ code, count }));
    const removed = [...priorCounts.entries()].filter(([code]) => !currentCounts.has(code)).map(([code, count]) => ({ code, count }));
    const changed = [...currentCounts.entries()]
      .filter(([code, count]) => priorCounts.has(code) && priorCounts.get(code) !== count)
      .map(([code, count]) => ({ code, priorCount: priorCounts.get(code)!, currentCount: count }));
    if (added.length === 0 && removed.length === 0 && changed.length === 0) continue;
    changedDimensions.push({ dimension, added, removed, changed });
  }
  const core = {
    schemaVersion: REAL_SOURCE_GAP_TAXONOMY_CHANGE_VERSION,
    priorDigest: prior?.deterministicDigest ?? null,
    currentDigest: current.deterministicDigest,
    changedDimensions,
  } as const;
  return { ...core, deterministicDigest: safeSemanticDigest(core, 'source-gap-taxonomy-change') };
}
