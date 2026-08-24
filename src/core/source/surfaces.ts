// ---------------------------------------------------------------------------
// Nightwatch Phase 25 — fixed route/operation discovery and Phase 24 bridge.
//
// Route syntax is intentionally small and explicit. This module recognizes
// existing static route forms (Routing.yaml keys, fixed JS/TS registrations,
// fixed Go registrations, and OpenAPI JSON paths); it does not execute YAML,
// JavaScript, Go, or application code. Source text is read only for the
// duration of a bounded analyzer call and never enters a returned descriptor.
// ---------------------------------------------------------------------------

import { PHASE5_API_CATALOG } from '../../api/phase5/catalog';
import type { ApiOperation } from '../../api/phase5/types';
import { sourceEvidenceDigest, safeSemanticDigest, type AnalyzerObservation, type SourceAnalyzerArtifact } from '../semanticCoverage';
import { analyzeSourceArtifact } from '../semanticCoverage/sourceAnalyzers';
import { RIPPLE_REPOSITORIES } from '../changeIntelligence/map';
import type { Phase24BehaviorOwner, Phase24CandidateInput, Phase24ContractIdentity, Phase24MaterialClass, Phase24ReplayDescriptor, Phase24RouteIdentity, Phase24SourceIdentity } from '../phase24/types';
import { analyzePhase24SourceSnapshot } from '../phase24/sourceAnalysis';
import { buildPhase24CandidatePortfolio, prioritizePhase24Portfolio } from '../phase24/portfolio';
import type { Phase24CandidatePortfolio, Phase24PortfolioSelection, Phase24SourceSnapshotAnalysis } from '../phase24/types';
import { scanSource } from './scan';
import { sourceSurfaceCacheKey, type RealSourceSurfaceCache } from './cache';
import type { RealSourceScanConfig, RealSourceSnapshotInventory, SourceScanLanguage } from './scanTypes';
import type { SiblingSourceAccess } from './siblingSource';
import {
  REAL_SOURCE_SURFACE_DESCRIPTOR_VERSION,
  SOURCE_SURFACE_REASON_CODES,
  type RealSourceSurfaceDescriptor,
  type SourceComponentRoute,
  type SourceContractEvidence,
  type SourceEvidenceJoin,
  type SourceJoinKind,
  type SourceJoinState,
  type SourceOperationDescriptor,
  type SourceOperationMethod,
  type SourceReadOnlyClassification,
  type SourceRouteProof,
  type SourceRuntimeBinding,
  type SourceSurfaceDiscoveryCounters,
  type SourceSurfaceReasonCode,
} from './surfaceTypes';

const SAFE_HANDLER_RE = /^[A-Za-z_][A-Za-z0-9_$\\.-]{0,159}$/;
const SAFE_REFERENCE_RE = /^src\/[A-Za-z0-9._/-]{1,239}\.(?:php|json|ya?ml|tsx?|jsx?|go)$/i;
const SAFE_ROUTE_RE = /^\/[A-Za-z0-9._~{}:-]{0,239}(?:\/[A-Za-z0-9._~{}:-]{0,239})*$/;
const SAFE_OPERATION_RE = /^[A-Za-z][A-Za-z0-9_.:/-]{0,199}$/;
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
const MAX_DISCOVERED_OPERATIONS = 128;
const ROUTE_FILE_RE = /(?:Routing\.ya?ml|routes?\.(?:json|ya?ml)|openapi\.json|swagger\.json)$/i;
const SOURCE_VERSION = 'nightwatch.real-source-surface-descriptor.v1';

export interface SourceSurfaceDiscovery {
  readonly inventory: RealSourceSnapshotInventory;
  readonly operations: readonly SourceOperationDescriptor[];
  readonly surfaces: readonly RealSourceSurfaceDescriptor[];
  readonly phase24Inputs: readonly Phase24CandidateInput[];
  readonly counters: SourceSurfaceDiscoveryCounters;
  readonly deterministicDigest: string;
}

export interface SourcePhase24Integration {
  readonly discovery: SourceSurfaceDiscovery;
  readonly snapshotAnalyses: readonly Phase24SourceSnapshotAnalysis[];
  readonly portfolio: Phase24CandidatePortfolio;
  readonly selection: Phase24PortfolioSelection;
  readonly deterministicDigest: string;
}

function isRouteCandidateFile(language: SourceScanLanguage, relativePath: string): boolean {
  return language === 'YAML' || language === 'OPENAPI' || language === 'TYPESCRIPT' || language === 'JAVASCRIPT' || language === 'GO' || ROUTE_FILE_RE.test(relativePath);
}

interface ParsedRoute {
  readonly method: SourceOperationMethod;
  readonly routeTemplate: string;
  readonly handlerClient: string | null;
  readonly handlerSymbol: string | null;
  readonly requestReference: string | null;
  readonly responseReference: string | null;
  readonly sourcePath: string;
  readonly language: SourceScanLanguage;
  readonly routeProof: SourceRouteProof;
  readonly routeRejectionReason: SourceSurfaceReasonCode | null;
}

interface RuntimeMatch {
  readonly operation: ApiOperation | null;
  readonly ambiguous: boolean;
  readonly stale: boolean;
}

function invalid(reason: string): never {
  throw new Error(`REAL_SOURCE_SURFACE_INVALID:${reason}`);
}

function safeRoute(value: string): string | null {
  if (!SAFE_ROUTE_RE.test(value) || value.includes('..') || value.includes('\\')) return null;
  const placeholders = [...value.matchAll(/\{([^{}]+)\}/g)].map((match) => match[1] ?? '');
  if (placeholders.some((placeholder) => !/^[A-Za-z][A-Za-z0-9_:-]{0,63}$/.test(placeholder))) return null;
  return value;
}

function safeHandler(value: string | null): string | null {
  if (value === null || value.length === 0) return null;
  return SAFE_HANDLER_RE.test(value) ? value : null;
}

function safeReference(value: string | null): string | null {
  if (value === null || value.length === 0 || value.includes('..') || value.includes('\\')) return null;
  return SAFE_REFERENCE_RE.test(value) ? value : null;
}

function method(value: string): SourceOperationMethod | null {
  const upper = value.toUpperCase();
  return (HTTP_METHODS as readonly string[]).includes(upper) ? upper as SourceOperationMethod : null;
}

function handlerPath(client: string | null): string | null {
  if (client === null || !SAFE_HANDLER_RE.test(client)) return null;
  const normalized = client.replaceAll('\\', '/');
  if (!normalized.startsWith('App/')) return null;
  const path = `src/${normalized}.php`;
  return path.includes('..') ? null : path;
}

function canonicalRoute(value: string): string {
  return value.replace(/\$\{[^}]+\}/g, '{}').replace(/\{[^}]+\}/g, '{}');
}

function runtimeRoute(value: string): string {
  const withoutPrefix = value.replace(/^\/m\/ripple(?=\/|$)/, '');
  return canonicalRoute(withoutPrefix.length === 0 ? '/' : withoutPrefix);
}

function runtimeBinding(repoId: string, sourceSha: string, routeTemplate: string, routeMethod: SourceOperationMethod): RuntimeMatch {
  const matches = PHASE5_API_CATALOG.operations.filter((operation) => operation.sourceRepo === repoId && operation.httpMethod === routeMethod && runtimeRoute(operation.pathTemplate) === canonicalRoute(routeTemplate));
  if (matches.length > 1) return { operation: null, ambiguous: true, stale: false };
  const operation = matches[0] ?? null;
  return { operation, ambiguous: false, stale: operation !== null && operation.sourceSHA !== sourceSha };
}

function readOnlyClassification(routeMethod: SourceOperationMethod, binding: RuntimeMatch): SourceReadOnlyClassification {
  if (binding.ambiguous) return 'AMBIGUOUS';
  if (binding.operation?.semanticClass === 'KNOWN_MUTATION') return 'PROVEN_MUTATION_CAPABLE';
  if (routeMethod !== 'GET') return 'PROVEN_MUTATION_CAPABLE';
  if (binding.operation?.semanticClass === 'KNOWN_READ' && !binding.stale) return 'PROVEN_READ_ONLY';
  return 'READ_ONLY_METHOD_ONLY';
}

function parseYamlRoutes(sourcePath: string, sourceText: string): readonly ParsedRoute[] {
  const lines = sourceText.split(/\r?\n/);
  const routes: ParsedRoute[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    const key = line.match(/^\s*["'](get|post|put|patch|delete):([^"']+)["']:\s*$/i);
    if (key === null) continue;
    const routeMethod = method(key[1] ?? '');
    const routeTemplate = safeRoute(key[2] ?? '');
    const routeIndent = line.length - line.trimStart().length;
    let client: string | null = null;
    let handler: string | null = null;
    let requestReference: string | null = null;
    let responseReference: string | null = null;
    for (let child = index + 1; child < lines.length && child <= index + 48; child += 1) {
      const childLine = lines[child]!;
      const trimmed = childLine.trim();
      if (trimmed.length === 0 || trimmed.startsWith('#')) continue;
      const childIndent = childLine.length - childLine.trimStart().length;
      if (childIndent <= routeIndent) break;
      const clientMatch = trimmed.match(/^client:\s*(.+)$/);
      const methodMatch = trimmed.match(/^method:\s*(.+)$/);
      const requestMatch = trimmed.match(/^(?:request|requestSchema|requestDto):\s*["']?([^"']+?)["']?$/);
      const responseMatch = trimmed.match(/^(?:response|responseSchema|responseDto|schema):\s*["']?([^"']+?)["']?$/);
      if (clientMatch !== null && client === null) client = clientMatch[1]!.trim();
      if (methodMatch !== null && handler === null) handler = methodMatch[1]!.trim();
      if (requestMatch !== null && requestReference === null) requestReference = safeReference(requestMatch[1]!.trim());
      if (responseMatch !== null && responseReference === null) responseReference = safeReference(responseMatch[1]!.trim());
    }
    const safeClient = safeHandler(client);
    const safeMethod = safeHandler(handler);
    const routeProof: SourceRouteProof = routeMethod !== null && routeTemplate !== null && safeClient !== null && safeMethod !== null ? 'PROVEN' : 'UNSUPPORTED';
    const routeRejectionReason: SourceSurfaceReasonCode | null = routeProof === 'PROVEN' ? null : routeTemplate === null || routeMethod === null ? 'ROUTE_NOT_FOUND' : safeClient === null || safeMethod === null ? 'HANDLER_UNRESOLVED' : 'SOURCE_SYNTAX_UNSUPPORTED';
    routes.push({ method: routeMethod ?? 'GET', routeTemplate: routeTemplate ?? '/', handlerClient: safeClient, handlerSymbol: safeMethod, requestReference, responseReference, sourcePath, language: 'YAML', routeProof, routeRejectionReason });
  }
  return routes;
}

function parseStaticRoutes(sourcePath: string, sourceText: string, language: 'TYPESCRIPT' | 'JAVASCRIPT' | 'GO'): readonly ParsedRoute[] {
  const routes: ParsedRoute[] = [];
  const pattern = language === 'GO'
    ? /\.(GET|POST|PUT|PATCH|DELETE)\(\s*["'](\/[^"']+)["']\s*,\s*([A-Za-z_][A-Za-z0-9_.]*)/g
    : /(?:router|app|route)\.(get|post|put|patch|delete)\(\s*["'](\/[^"']+)["']\s*,\s*([A-Za-z_$][A-Za-z0-9_$.]*)/gi;
  for (const match of sourceText.matchAll(pattern)) {
    const routeMethod = method(match[1] ?? '');
    const routeTemplate = safeRoute(match[2] ?? '');
    const handler = safeHandler(match[3] ?? null);
    const routeProof: SourceRouteProof = routeMethod !== null && routeTemplate !== null && handler !== null ? 'PROVEN' : 'UNSUPPORTED';
    routes.push({ method: routeMethod ?? 'GET', routeTemplate: routeTemplate ?? '/', handlerClient: null, handlerSymbol: handler, requestReference: null, responseReference: null, sourcePath, language, routeProof, routeRejectionReason: routeProof === 'PROVEN' ? null : 'SOURCE_SYNTAX_UNSUPPORTED' });
  }
  return routes;
}

function parseOpenApiRoutes(sourcePath: string, sourceText: string): readonly ParsedRoute[] {
  let parsed: unknown;
  try { parsed = JSON.parse(sourceText); } catch { return []; }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return [];
  const paths = (parsed as Record<string, unknown>).paths;
  if (paths === null || typeof paths !== 'object' || Array.isArray(paths)) return [];
  const routes: ParsedRoute[] = [];
  for (const routeTemplate of Object.keys(paths as Record<string, unknown>).sort()) {
    const safePath = safeRoute(routeTemplate);
    const methods = (paths as Record<string, unknown>)[routeTemplate];
    if (methods === null || typeof methods !== 'object' || Array.isArray(methods)) continue;
    for (const [key, value] of Object.entries(methods as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right))) {
      const routeMethod = method(key);
      if (routeMethod === null) continue;
      const operation = value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
      const operationId = operation !== null && typeof operation.operationId === 'string' ? safeHandler(operation.operationId) : null;
      const handler = operation !== null && typeof operation['x-handler'] === 'string' ? safeHandler(operation['x-handler'] as string) : operationId;
      const requestReference = operation !== null && typeof operation['x-request-schema'] === 'string' ? safeReference(operation['x-request-schema'] as string) : null;
      const responseReference = operation !== null && typeof operation['x-response-schema'] === 'string' ? safeReference(operation['x-response-schema'] as string) : null;
      const proven = safePath !== null && operation !== null;
      routes.push({ method: routeMethod, routeTemplate: safePath ?? '/', handlerClient: null, handlerSymbol: handler, requestReference, responseReference, sourcePath, language: 'OPENAPI', routeProof: proven ? 'PROVEN' : 'UNSUPPORTED', routeRejectionReason: proven ? null : 'SOURCE_SYNTAX_UNSUPPORTED' });
    }
  }
  return routes;
}

function parseRoutes(sourcePath: string, language: SourceScanLanguage, sourceText: string): readonly ParsedRoute[] {
  if (language === 'YAML') return parseYamlRoutes(sourcePath, sourceText);
  if (language === 'OPENAPI') return parseOpenApiRoutes(sourcePath, sourceText);
  if (language === 'TYPESCRIPT' || language === 'JAVASCRIPT' || language === 'GO') return parseStaticRoutes(sourcePath, sourceText, language);
  return [];
}

function routeOperation(source: { readonly repoId: string; readonly sha: string }, route: ParsedRoute): SourceOperationDescriptor {
  const evidenceDigest = sourceEvidenceDigest({ kind: 'source-operation', repoId: source.repoId, sha: source.sha, sourcePath: route.sourcePath, method: route.method, routeTemplate: route.routeTemplate, handlerClient: route.handlerClient, handlerSymbol: route.handlerSymbol, requestReference: route.requestReference, responseReference: route.responseReference });
  const binding = runtimeBinding(source.repoId, source.sha, route.routeTemplate, route.method);
  const operationId = binding.operation?.operationId ?? evidenceDigest;
  const bindingState: SourceRuntimeBinding = binding.ambiguous ? 'AMBIGUOUS' : binding.operation === null ? 'SOURCE_ONLY' : binding.stale ? 'SOURCE_VERSION_MISMATCH' : 'RUNTIME_BOUND_EXACT';
  return {
    operationId,
    repository: source.repoId,
    sourceSha: source.sha,
    sourcePath: route.sourcePath,
    language: route.language,
    evidenceDigest,
    method: route.method,
    routeTemplate: route.routeTemplate,
    handlerSymbol: route.handlerSymbol,
    handlerPath: handlerPath(route.handlerClient),
    requestReference: route.requestReference,
    responseReference: route.responseReference,
    transport: 'HTTP_API',
    routeProof: route.routeProof,
    routeRejectionReason: route.routeRejectionReason,
    readOnlyClassification: readOnlyClassification(route.method, binding),
    runtimeBinding: bindingState,
    targetId: binding.operation?.operationId ?? null,
    deploymentStatusUnresolved: true,
  };
}

function routeFields(routeTemplate: string): readonly string[] {
  return [...routeTemplate.matchAll(/\{([^{}]+)\}/g)].map((match) => match[1] ?? '').filter((field, index, fields) => field.length > 0 && fields.indexOf(field) === index).sort();
}

function joinFromIdentity(operation: SourceOperationDescriptor): string {
  return `${operation.repository}:${operation.sourcePath}:${operation.method}:${operation.routeTemplate}`;
}

function joinIdentity(operation: SourceOperationDescriptor, path: string, symbol: string | null): string {
  return `${operation.repository}:${path}${symbol === null ? '' : `:${symbol}`}`;
}

function declarationCount(sourceText: string, language: SourceScanLanguage, symbol: string): number {
  const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = language === 'PHP'
    ? new RegExp(`\\bfunction\\s+${escaped}\\s*\\(`, 'g')
    : language === 'GO'
      ? new RegExp(`\\bfunc\\s+(?:\\([^)]*\\)\\s*)?${escaped}\\s*\\(`, 'g')
      : new RegExp(`\\b(?:function|class|const|let|var)\\s+${escaped}\\b`, 'g');
  return [...sourceText.matchAll(pattern)].length;
}

function joinEvidence(input: { readonly operation: SourceOperationDescriptor; readonly kind: SourceJoinKind; readonly toIdentity: string | null; readonly state: SourceJoinState; readonly evidence: unknown | null }): SourceEvidenceJoin {
  return {
    kind: input.kind,
    fromIdentity: joinFromIdentity(input.operation),
    toIdentity: input.toIdentity,
    state: input.state,
    evidenceDigest: input.evidence === null ? null : sourceEvidenceDigest(input.evidence),
  };
}

function staticSchemaProof(sourceText: string): boolean {
  try {
    const parsed: unknown = JSON.parse(sourceText);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return false;
    const record = parsed as Record<string, unknown>;
    const keys = Object.keys(record);
    if (keys.length === 0 || keys.length > 32) return false;
    const schemaKeywords = new Set(['$schema', 'type', 'properties', 'required', 'items', 'enum', 'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'default', 'allOf', 'oneOf', 'anyOf']);
    if (!keys.some((key) => schemaKeywords.has(key))) return false;
    const properties = record.properties;
    if (properties !== undefined && (properties === null || typeof properties !== 'object' || Array.isArray(properties) || Object.keys(properties as Record<string, unknown>).length > 128)) return false;
    const required = record.required;
    if (required !== undefined && (!Array.isArray(required) || required.length > 128 || required.some((value) => typeof value !== 'string' || !/^[A-Za-z][A-Za-z0-9_.-]{0,96}$/.test(value)))) return false;
    return true;
  } catch {
    return false;
  }
}

interface ResolvedSurfaceJoins {
  readonly joins: readonly SourceEvidenceJoin[];
  readonly handlerState: SourceJoinState;
  readonly requestState: SourceJoinState | null;
  readonly responseState: SourceJoinState | null;
}

function resolveSurfaceJoins(input: { readonly access: SiblingSourceAccess; readonly inventory: RealSourceSnapshotInventory; readonly operation: SourceOperationDescriptor }): ResolvedSurfaceJoins {
  const operation = input.operation;
  const joins: SourceEvidenceJoin[] = [];
  let handlerState: SourceJoinState = 'UNSUPPORTED_REFERENCE';
  if (operation.handlerPath === null || operation.handlerSymbol === null) {
    handlerState = operation.language === 'OPENAPI' ? 'UNSUPPORTED_REFERENCE' : 'MISSING_SYMBOL';
    joins.push(joinEvidence({ operation, kind: 'ROUTE_HANDLER', toIdentity: null, state: handlerState, evidence: null }));
  } else {
    const handlerIdentity = joinIdentity(operation, operation.handlerPath, operation.handlerSymbol);
    const matches = input.inventory.files.filter((file) => file.repoId === operation.repository && file.relativePath === operation.handlerPath);
    const match = matches[0];
    if (matches.length === 0) {
      handlerState = 'MISSING_SYMBOL';
      joins.push(joinEvidence({ operation, kind: 'ROUTE_HANDLER', toIdentity: handlerIdentity, state: handlerState, evidence: null }));
    } else if (match === undefined || match.status !== 'ELIGIBLE' || match.language === null) {
      handlerState = match?.rejectionReason === 'SOURCE_STALE' ? 'SOURCE_STALE' : 'OUTSIDE_SCOPE';
      joins.push(joinEvidence({ operation, kind: 'ROUTE_HANDLER', toIdentity: handlerIdentity, state: handlerState, evidence: null }));
    } else {
      const sourceText = input.access.reader.readFile(operation.repository, operation.handlerPath);
      if (sourceText === null) {
        handlerState = 'MISSING_SYMBOL';
        joins.push(joinEvidence({ operation, kind: 'ROUTE_HANDLER', toIdentity: handlerIdentity, state: handlerState, evidence: null }));
      } else {
        const declarations = declarationCount(sourceText, match.language, operation.handlerSymbol);
        handlerState = declarations === 1 ? 'PROVEN' : declarations === 0 ? 'MISSING_SYMBOL' : 'MULTIPLE_SYMBOLS';
        joins.push(joinEvidence({ operation, kind: 'ROUTE_HANDLER', toIdentity: handlerIdentity, state: handlerState, evidence: { kind: 'handler-symbol', repoId: operation.repository, path: operation.handlerPath, symbol: operation.handlerSymbol, contentDigest: match.contentDigest, declarationCount: declarations } }));
      }
    }
  }

  const resolveReference = (kind: 'HANDLER_REQUEST_CONTRACT' | 'HANDLER_RESPONSE_CONTRACT', reference: string | null): SourceJoinState | null => {
    if (reference === null) return null;
    const identity = joinIdentity(operation, reference, null);
    const match = input.inventory.files.find((file) => file.repoId === operation.repository && file.relativePath === reference);
    if (match === undefined) {
      joins.push(joinEvidence({ operation, kind, toIdentity: identity, state: 'MISSING_SYMBOL', evidence: null }));
      return 'MISSING_SYMBOL';
    }
    if (match.status !== 'ELIGIBLE' || match.language === null) {
      const state: SourceJoinState = match.rejectionReason === 'SOURCE_STALE' ? 'SOURCE_STALE' : 'OUTSIDE_SCOPE';
      joins.push(joinEvidence({ operation, kind, toIdentity: identity, state, evidence: null }));
      return state;
    }
    const sourceText = input.access.reader.readFile(operation.repository, reference);
    if (sourceText === null) {
      joins.push(joinEvidence({ operation, kind, toIdentity: identity, state: 'MISSING_SYMBOL', evidence: null }));
      return 'MISSING_SYMBOL';
    }
    // A non-empty source file is not a schema proof.  Only the bounded
    // OpenAPI/static JSON form has a parser-backed contract here; PHP,
    // TypeScript, Go, and YAML references remain unsupported until an
    // existing mechanical schema analyzer can prove their shape.
    const validStaticSchema = match.language === 'OPENAPI' && staticSchemaProof(sourceText);
    const state: SourceJoinState = validStaticSchema ? 'PROVEN' : 'UNSUPPORTED_REFERENCE';
    joins.push(joinEvidence({ operation, kind, toIdentity: identity, state, evidence: validStaticSchema ? { kind: 'schema-file', repoId: operation.repository, path: reference, contentDigest: match.contentDigest } : null }));
    return state;
  };

  const requestState = resolveReference('HANDLER_REQUEST_CONTRACT', operation.requestReference);
  const responseState = resolveReference('HANDLER_RESPONSE_CONTRACT', operation.responseReference);
  return { joins, handlerState, requestState, responseState };
}

function responseEvidence(input: { readonly operation: SourceOperationDescriptor; readonly observations: readonly AnalyzerObservation[]; readonly handlerState: SourceJoinState; readonly responseReferenceState: SourceJoinState | null }): { readonly responseContractId: string | null; readonly responseEvidenceDigest: string | null; readonly semanticContractIds: readonly string[]; readonly responseProof: SourceJoinState; readonly semanticProof: SourceJoinState } {
  if (input.handlerState !== 'PROVEN' || (input.responseReferenceState !== null && input.responseReferenceState !== 'PROVEN')) {
    const state = input.responseReferenceState !== null && input.responseReferenceState !== 'PROVEN' ? input.responseReferenceState : input.handlerState;
    return { responseContractId: null, responseEvidenceDigest: null, semanticContractIds: [], responseProof: state, semanticProof: state };
  }
  const proven = input.observations.filter((observation) => observation.status === 'MECHANICALLY_PROVABLE' && observation.shape !== null);
  if (proven.length === 0) return { responseContractId: null, responseEvidenceDigest: null, semanticContractIds: [], responseProof: 'UNSUPPORTED_REFERENCE', semanticProof: 'UNSUPPORTED_REFERENCE' };
  const shapes = proven.map((observation) => ({ analyzerId: observation.analyzerId, behaviorClass: observation.behaviorClass, shape: observation.shape, evidenceDigest: observation.evidenceDigest })).sort((left, right) => left.evidenceDigest.localeCompare(right.evidenceDigest));
  const responseEvidenceDigest = sourceEvidenceDigest({ kind: 'response-contract', operationId: input.operation.operationId, shapes });
  const responseContractId = safeSemanticDigest({ operationId: input.operation.operationId, shapes }, 'response-contract');
  const semanticContractIds = shapes.map((shape) => safeSemanticDigest({ operationId: input.operation.operationId, shape }, 'semantic-contract')).sort();
  return { responseContractId, responseEvidenceDigest, semanticContractIds, responseProof: 'PROVEN', semanticProof: 'PROVEN' };
}

function contractEvidence(operation: SourceOperationDescriptor, observations: readonly AnalyzerObservation[], joins: ResolvedSurfaceJoins): SourceContractEvidence {
  const fields = routeFields(operation.routeTemplate);
  const requestCore = { kind: 'request-contract', operationId: operation.operationId, method: operation.method, routeTemplate: operation.routeTemplate, fields };
  const requestEvidenceDigest = sourceEvidenceDigest(requestCore);
  const requestContractId = safeSemanticDigest(requestCore, 'request-contract');
  const requestProof = operation.requestReference === null ? operation.routeProof === 'PROVEN' ? 'PROVEN' : 'UNSUPPORTED_REFERENCE' : joins.requestState ?? 'UNSUPPORTED_REFERENCE';
  const response = responseEvidence({ operation, observations, handlerState: joins.handlerState, responseReferenceState: joins.responseState });
  return { requestContractId, requestEvidenceDigest, requestProof, requestFieldCount: fields.length, responseContractId: response.responseContractId, responseEvidenceDigest: response.responseEvidenceDigest, responseProof: response.responseProof, semanticContractIds: response.semanticContractIds, semanticProof: response.semanticProof };
}

function componentProvenance(operation: SourceOperationDescriptor): SourceComponentRoute {
  const repositoryKnown = RIPPLE_REPOSITORIES.some((repository) => repository.repoId === operation.repository);
  if (operation.handlerPath !== null) {
    const parts = operation.handlerPath.split('/');
    return { state: 'EXACT_COMPONENT', repository: operation.repository, packageName: parts.slice(0, 2).join('/'), component: operation.handlerPath.replace(/\.php$/, ''), confidence: operation.runtimeBinding === 'RUNTIME_BOUND_EXACT' ? 'HIGH' : 'MEDIUM' };
  }
  if (repositoryKnown) return { state: 'REPOSITORY_ONLY', repository: operation.repository, packageName: null, component: null, confidence: 'LOW' };
  return { state: 'UNRESOLVED', repository: operation.repository, packageName: null, component: null, confidence: 'UNRESOLVED' };
}

function exclusionReasons(operation: SourceOperationDescriptor, contract: SourceContractEvidence, component: SourceComponentRoute, joins: readonly SourceEvidenceJoin[]): readonly SourceSurfaceReasonCode[] {
  const reasons: SourceSurfaceReasonCode[] = [];
  if (operation.routeProof !== 'PROVEN') reasons.push(operation.routeRejectionReason ?? 'ROUTE_AMBIGUOUS');
  const handlerJoin = joins.find((join) => join.kind === 'ROUTE_HANDLER');
  if (handlerJoin?.state === 'MULTIPLE_SYMBOLS') reasons.push('HANDLER_AMBIGUOUS');
  else if (handlerJoin !== undefined && handlerJoin.state !== 'PROVEN') reasons.push('HANDLER_UNRESOLVED');
  if (contract.requestProof !== 'PROVEN') reasons.push('REQUEST_CONTRACT_UNPROVEN');
  if (contract.responseProof !== 'PROVEN') reasons.push('RESPONSE_CONTRACT_UNPROVEN');
  if (contract.semanticProof !== 'PROVEN') reasons.push('SEMANTIC_CONTRACT_UNPROVEN');
  if (operation.readOnlyClassification === 'PROVEN_MUTATION_CAPABLE' || operation.readOnlyClassification === 'CONDITIONAL_MUTATION') reasons.push('MUTATION_CAPABLE');
  else if (operation.readOnlyClassification !== 'PROVEN_READ_ONLY') reasons.push('READ_ONLY_NOT_PROVEN');
  if (operation.runtimeBinding === 'SOURCE_ONLY') reasons.push('RUNTIME_BINDING_MISSING');
  if (operation.runtimeBinding === 'SOURCE_VERSION_MISMATCH') reasons.push('SOURCE_STALE');
  if (component.state === 'AMBIGUOUS_COMPONENT' || component.state === 'UNRESOLVED') reasons.push('OWNER_COMPONENT_AMBIGUOUS');
  return [...new Set(reasons)].sort();
}

function lifecycle(operation: SourceOperationDescriptor, contract: SourceContractEvidence): RealSourceSurfaceDescriptor['lifecycle'] {
  if (contract.semanticProof !== 'PROVEN') return 'DISCOVERED';
  if (operation.runtimeBinding === 'RUNTIME_BOUND_EXACT' && contract.responseProof === 'PROVEN') return 'PROJECTABLE';
  return 'MECHANICALLY_PROVEN';
}

function descriptor(operation: SourceOperationDescriptor, source: { readonly repoId: string; readonly sha: string; readonly evidenceDigest: string }, relevantFiles: readonly string[], joins: readonly SourceEvidenceJoin[], contract: SourceContractEvidence): RealSourceSurfaceDescriptor {
  const component = componentProvenance(operation);
  const exclusion = exclusionReasons(operation, contract, component, joins);
  const surfaceId = safeSemanticDigest({ operationId: operation.operationId, sourcePath: operation.sourcePath, route: operation.routeTemplate, method: operation.method }, 'surface');
  const core = {
    schemaVersion: REAL_SOURCE_SURFACE_DESCRIPTOR_VERSION,
    surfaceId,
    targetId: operation.targetId,
    operation,
    source: { repoId: source.repoId, sha: source.sha, evidenceDigest: source.evidenceDigest },
    relevantFiles: [...new Set(relevantFiles)].sort(),
    joins: [...joins].sort((left, right) => `${left.kind}|${left.fromIdentity}|${left.toIdentity ?? ''}`.localeCompare(`${right.kind}|${right.fromIdentity}|${right.toIdentity ?? ''}`)),
    contract,
    componentProvenance: component,
    currentness: 'CURRENT' as const,
    lifecycle: lifecycle(operation, contract),
    projectionCapability: contract.semanticProof === 'PROVEN' ? 'PROJECTABLE' as const : 'UNPROVEN' as const,
    replayCapability: operation.runtimeBinding === 'RUNTIME_BOUND_EXACT' && operation.readOnlyClassification === 'PROVEN_READ_ONLY' ? 'SUPPORTED' as const : 'UNPROVEN' as const,
    differentialCapability: 'UNPROVEN' as const,
    exclusionReasons: exclusion,
  };
  return { ...core, deterministicDigest: safeSemanticDigest(core, 'surface-descriptor') };
}

function phase24Source(surface: RealSourceSurfaceDescriptor): Phase24SourceIdentity {
  return { repoId: surface.source.repoId, sha: surface.source.sha, evidenceDigest: surface.source.evidenceDigest };
}

function phase24Route(surface: RealSourceSurfaceDescriptor): Phase24RouteIdentity | null {
  if (surface.operation.routeProof !== 'PROVEN' || surface.operation.method !== 'GET') return null;
  return { endpointId: surface.operation.operationId, method: 'GET', routeTemplate: surface.operation.routeTemplate, transport: surface.operation.transport };
}

function phase24Contract(surface: RealSourceSurfaceDescriptor): Phase24ContractIdentity | null {
  if (surface.contract.requestProof !== 'PROVEN' || surface.contract.responseProof !== 'PROVEN' || surface.contract.requestEvidenceDigest === null || surface.contract.responseEvidenceDigest === null || surface.contract.requestContractId === null || surface.contract.responseContractId === null) return null;
  return { contractId: safeSemanticDigest({ request: surface.contract.requestContractId, response: surface.contract.responseContractId }, 'contract'), requestDigest: surface.contract.requestContractId, responseDigest: surface.contract.responseContractId, version: SOURCE_VERSION };
}

function phase24Owner(surface: RealSourceSurfaceDescriptor): Phase24BehaviorOwner | null {
  const owner = surface.componentProvenance;
  if (owner.state === 'UNRESOLVED' || owner.packageName === null || owner.component === null) return null;
  return { repository: owner.repository, packageName: owner.packageName, component: owner.component, confidence: owner.confidence === 'UNRESOLVED' ? 'UNCONFIRMED' : owner.confidence };
}

function materialClass(surface: RealSourceSurfaceDescriptor): Phase24MaterialClass {
  if (surface.contract.semanticContractIds.length === 0) return 'PROTOCOL';
  if (surface.contract.requestFieldCount > 0) return 'COLLECTION';
  return 'SHAPE';
}

/** Convert one safe descriptor into the existing Phase 24 candidate input. */
export function toPhase24CandidateInput(surface: RealSourceSurfaceDescriptor): Phase24CandidateInput {
  const route = phase24Route(surface);
  const contract = phase24Contract(surface);
  const owner = phase24Owner(surface);
  const readOnly = surface.operation.readOnlyClassification === 'PROVEN_READ_ONLY';
  const mutationClassification = readOnly ? 'READ_ONLY' : surface.operation.readOnlyClassification === 'PROVEN_MUTATION_CAPABLE' ? 'MUTATION' : 'UNKNOWN';
  const replay: Phase24ReplayDescriptor | null = readOnly && surface.operation.runtimeBinding === 'RUNTIME_BOUND_EXACT'
    ? { strategy: 'FIRST_REPLAY', planIdentity: safeSemanticDigest({ surfaceId: surface.surfaceId, kind: 'replay-plan' }, 'replay'), maxContexts: 2, prerequisites: ['SOURCE_CURRENT', 'RUNTIME_BOUND_EXACT', 'READ_ONLY_PROVEN'] }
    : null;
  return {
    surfaceKey: surface.surfaceId,
    targetId: surface.targetId ?? surface.operation.operationId,
    product: surface.targetId?.startsWith('ripple.') ? 'ripple' : 'source',
    source: phase24Source(surface),
    sourceAvailable: surface.currentness === 'CURRENT',
    sourceSnapshotMatches: true,
    relevantFiles: surface.relevantFiles,
    route,
    routeIdentityProven: route !== null,
    contract,
    contractIdentityProven: contract !== null,
    behaviorOwner: owner,
    behaviorOwnerProven: owner !== null && surface.componentProvenance.state === 'EXACT_COMPONENT',
    sourceVersion: surface.currentness === 'CURRENT' ? 'CURRENT' : 'DRIFTED',
    semanticExpectationId: safeSemanticDigest({ surfaceId: surface.surfaceId, kind: 'semantic-expectation' }, 'expectation'),
    semanticContractProven: surface.contract.semanticProof === 'PROVEN',
    semanticPreconditions: surface.contract.requestFieldCount > 0 ? ['ROUTE_PARAMETERS_BOUNDED'] : ['EMPTY_REQUEST_CONTRACT'],
    semanticPreconditionsBound: surface.contract.requestProof === 'PROVEN',
    materialClass: materialClass(surface),
    authRequirement: surface.targetId === null ? 'UNBOUND' : 'OWNER_EXTERNAL_PATH',
    environmentRequirement: 'DEV_ONLY',
    mutationClassification,
    readOnlySuitable: readOnly,
    projectionSafe: surface.projectionCapability === 'PROJECTABLE',
    replay,
    expectedEvidenceValue: surface.contract.semanticProof === 'PROVEN' ? 'HIGH' : surface.operation.routeProof === 'PROVEN' ? 'MEDIUM' : 'LOW',
    selectionPriority: surface.operation.runtimeBinding === 'RUNTIME_BOUND_EXACT' ? 10 : surface.operation.runtimeBinding === 'SOURCE_VERSION_MISMATCH' ? 80 : 50,
    anticipatedInvariantCount: Math.max(1, Math.min(32, surface.contract.semanticContractIds.length)),
  };
}

function observationsFor(input: { readonly access: SiblingSourceAccess; readonly inventory: RealSourceSnapshotInventory; readonly operation: SourceOperationDescriptor; readonly handlerState: SourceJoinState }): readonly AnalyzerObservation[] {
  if (input.operation.handlerPath === null || input.handlerState !== 'PROVEN') return [];
  const match = input.inventory.files.find((file) => file.repoId === input.operation.repository && file.relativePath === input.operation.handlerPath && file.status === 'ELIGIBLE');
  if (match === undefined || match.language === null || match.language === 'YAML') return [];
  const sourceText = input.access.reader.readFile(input.operation.repository, match.relativePath);
  if (sourceText === null) return [];
  const artifact: SourceAnalyzerArtifact = {
    artifactId: `surface-artifact-${input.operation.sourceSha.slice(0, 12)}`,
    language: match.language as Exclude<SourceScanLanguage, 'YAML'>,
    repoId: input.operation.repository,
    sha: input.operation.sourceSha,
    relativePath: match.relativePath,
    symbol: input.operation.handlerSymbol,
    sourceText,
    observationSurfaces: ['API', 'SYNTHETIC'],
    includeExtendedResponseProof: true,
  };
  return analyzeSourceArtifact(artifact);
}

/** Discover operations/surfaces from one bounded source inventory. */
export function discoverSourceSurfaces(input: { readonly access: SiblingSourceAccess; readonly config: RealSourceScanConfig; readonly cache?: RealSourceSurfaceCache }): SourceSurfaceDiscovery {
  const inventory = scanSource({ access: input.access, config: input.config });
  const cacheKey = input.cache === undefined ? null : sourceSurfaceCacheKey({ config: input.config, inventory });
  const cached = cacheKey === null ? undefined : input.cache?.get(cacheKey);
  if (cached !== undefined) return cached;
  const operations: SourceOperationDescriptor[] = [];
  let routeFilesConsidered = 0;
  let routeOperationsTruncated = 0;
  let analyzerInvocations = 0;
  const parsedRoutes: { readonly file: (typeof inventory.files)[number]; readonly route: ParsedRoute }[] = [];
  for (const file of inventory.files.filter((entry) => entry.status === 'ELIGIBLE' && entry.language !== null && isRouteCandidateFile(entry.language, entry.relativePath)).sort((left, right) => left.repoId.localeCompare(right.repoId) || left.relativePath.localeCompare(right.relativePath))) {
    routeFilesConsidered += 1;
    const sourceText = input.access.reader.readFile(file.repoId, file.relativePath);
    if (sourceText === null || file.language === null) continue;
    for (const route of parseRoutes(file.relativePath, file.language, sourceText)) parsedRoutes.push({ file, route });
  }
  const parsedKeys = new Map<string, number>();
  for (const entry of parsedRoutes) {
    const key = `${entry.file.repoId}:${entry.route.method}:${entry.route.routeTemplate}`;
    parsedKeys.set(key, (parsedKeys.get(key) ?? 0) + 1);
  }
  parsedRoutes.sort((left, right) => left.file.repoId.localeCompare(right.file.repoId) || left.file.relativePath.localeCompare(right.file.relativePath) || left.route.method.localeCompare(right.route.method) || left.route.routeTemplate.localeCompare(right.route.routeTemplate) || (left.route.handlerSymbol ?? '').localeCompare(right.route.handlerSymbol ?? ''));
  const duplicateOrdinals = new Map<string, number>();
  for (const entry of parsedRoutes) {
    if (operations.length >= MAX_DISCOVERED_OPERATIONS) {
      routeOperationsTruncated += 1;
      continue;
    }
    const { file, route } = entry;
    const duplicateKey = `${file.repoId}:${route.method}:${route.routeTemplate}`;
    const duplicate = (parsedKeys.get(duplicateKey) ?? 0) > 1;
    const withDuplicate: ParsedRoute = duplicate ? { ...route, routeProof: 'AMBIGUOUS', routeRejectionReason: 'ROUTE_AMBIGUOUS' } : route;
    const baseOperation = routeOperation({ repoId: file.repoId, sha: file.sourceSha! }, withDuplicate);
    const ordinal = (duplicateOrdinals.get(duplicateKey) ?? 0) + 1;
    duplicateOrdinals.set(duplicateKey, ordinal);
    const operation = duplicate ? { ...baseOperation, operationId: sourceEvidenceDigest({ kind: 'ambiguous-route-operation', baseOperationId: baseOperation.operationId, duplicateOrdinal: ordinal }) } : baseOperation;
    operations.push(operation);
    if (operation.handlerPath !== null) analyzerInvocations += 1;
  }
  operations.sort((left, right) => left.repository.localeCompare(right.repository) || left.sourcePath.localeCompare(right.sourcePath) || left.method.localeCompare(right.method) || left.routeTemplate.localeCompare(right.routeTemplate) || left.operationId.localeCompare(right.operationId));
  const surfaces: RealSourceSurfaceDescriptor[] = [];
  for (const operation of operations) {
    const joins = resolveSurfaceJoins({ access: input.access, inventory, operation });
    const observations = observationsFor({ access: input.access, inventory, operation, handlerState: joins.handlerState });
    const contract = contractEvidence(operation, observations, joins);
    const references = [operation.handlerPath, operation.requestReference, operation.responseReference].filter((value): value is string => value !== null);
    const relevantFileEvidence = [operation.sourcePath, ...references]
      .map((relativePath) => inventory.files.find((file) => file.repoId === operation.repository && file.relativePath === relativePath))
      .filter((file): file is (typeof inventory.files)[number] => file !== undefined)
      .map((file) => ({ path: file.relativePath, status: file.status, contentDigest: file.contentDigest, byteCount: file.byteCount }))
      .sort((left, right) => left.path.localeCompare(right.path));
    const surfaceEvidenceDigest = sourceEvidenceDigest({ kind: 'source-surface-evidence', operationEvidenceDigest: operation.evidenceDigest, files: relevantFileEvidence, joins: joins.joins.map((join) => ({ kind: join.kind, state: join.state, toIdentity: join.toIdentity, evidenceDigest: join.evidenceDigest })), contract: { requestEvidenceDigest: contract.requestEvidenceDigest, responseEvidenceDigest: contract.responseEvidenceDigest, semanticContractIds: contract.semanticContractIds } });
    surfaces.push(descriptor(operation, { repoId: operation.repository, sha: operation.sourceSha, evidenceDigest: surfaceEvidenceDigest }, [operation.sourcePath, ...references], joins.joins, contract));
  }
  surfaces.sort((left, right) => left.surfaceId.localeCompare(right.surfaceId));
  const counters: SourceSurfaceDiscoveryCounters = {
    routeFilesConsidered,
    routeOperationsFound: operations.length,
    routeOperationsTruncated,
    routeProofs: operations.filter((operation) => operation.routeProof === 'PROVEN').length,
    ambiguousRoutes: operations.filter((operation) => operation.routeProof === 'AMBIGUOUS').length,
    mutationCapableOperations: operations.filter((operation) => operation.readOnlyClassification === 'PROVEN_MUTATION_CAPABLE').length,
    readOnlyProvenOperations: operations.filter((operation) => operation.readOnlyClassification === 'PROVEN_READ_ONLY').length,
    requestContracts: surfaces.filter((surface) => surface.contract.requestProof === 'PROVEN').length,
    responseContracts: surfaces.filter((surface) => surface.contract.responseProof === 'PROVEN').length,
    semanticContracts: surfaces.reduce((count, surface) => count + surface.contract.semanticContractIds.length, 0),
    joinsAttempted: surfaces.reduce((count, surface) => count + surface.joins.length, 0),
    joinsProven: surfaces.reduce((count, surface) => count + surface.joins.filter((join) => join.state === 'PROVEN').length, 0),
    joinsRejected: surfaces.reduce((count, surface) => count + surface.joins.filter((join) => join.state !== 'PROVEN').length, 0),
    analyzerInvocations,
    candidatesProduced: surfaces.length,
    eligibleCandidates: 0,
    excludedCandidates: surfaces.length,
  };
  const phase24Inputs = surfaces.map(toPhase24CandidateInput);
  const core = { inventoryDigest: inventory.snapshotDigest, operations, surfaces, counters };
  const discovery = { inventory, operations, surfaces, phase24Inputs, counters, deterministicDigest: safeSemanticDigest(core, 'source-surface-discovery') };
  if (cacheKey !== null) input.cache?.put(cacheKey, discovery);
  return discovery;
}

/**
 * Run discovered safe inputs through the existing Phase 24 adapter, portfolio,
 * and selector. Each exact source identity is adapted separately so one
 * operation's evidence cannot be silently rebound to another operation.
 */
export function analyzeSourceSurfacesIntoPhase24(input: { readonly access: SiblingSourceAccess; readonly config: RealSourceScanConfig; readonly discovery?: SourceSurfaceDiscovery; readonly maxCandidates?: number }): SourcePhase24Integration {
  const maxCandidates = input.maxCandidates ?? 6;
  if (!Number.isInteger(maxCandidates) || maxCandidates < 1 || maxCandidates > 6) invalid('PHASE24_SELECTION_LIMIT');
  const discovery = input.discovery ?? discoverSourceSurfaces({ access: input.access, config: input.config });
  const grouped = new Map<string, Phase24CandidateInput[]>();
  for (const candidate of discovery.phase24Inputs) {
    if (candidate.source === null) continue;
    const key = `${candidate.source.repoId}|${candidate.source.sha}|${candidate.source.evidenceDigest}`;
    const entries = grouped.get(key) ?? [];
    entries.push(candidate);
    grouped.set(key, entries);
  }
  const snapshotAnalyses = [...grouped.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([, candidates]) => {
    const source = candidates[0]?.source;
    if (source === undefined || source === null) invalid('PHASE24_SOURCE_IDENTITY');
    return analyzePhase24SourceSnapshot({ snapshot: source, surfaces: candidates });
  });
  const portfolio = buildPhase24CandidatePortfolio({ candidates: discovery.phase24Inputs });
  const selection = prioritizePhase24Portfolio({ portfolio, maxCandidates });
  const core = { discoveryDigest: discovery.deterministicDigest, snapshotAnalyses: snapshotAnalyses.map((analysis) => analysis.deterministicDigest), portfolioDigest: portfolio.deterministicDigest, selectionDigest: selection.deterministicDigest, maxCandidates };
  return { discovery, snapshotAnalyses, portfolio, selection, deterministicDigest: safeSemanticDigest(core, 'source-phase24-integration') };
}

export { SOURCE_SURFACE_REASON_CODES };
