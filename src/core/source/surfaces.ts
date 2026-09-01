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
import { createResponseFlowIndex, REAL_SOURCE_RESPONSE_FLOW_VERSION, resolveResponseFlow, type ResponseFlowProof } from './responseFlow';
import { buildSourceGapTaxonomy, type SourceGapTaxonomy } from './gapTaxonomy';
import { buildSourceEligibilityCensus, type SourceEligibilityCensus } from './eligibilityCensus';
import { createCallScopedSourceReadView } from './callScopedRead';
import { sourceContentDigest, type RealSourceScanConfig, type RealSourceSnapshotInventory, type SourceScanLanguage } from './scanTypes';
import type { SiblingSourceAccess } from './siblingSource';
import { tokenizeStaticSource, type StaticLexicalToken } from './lexical';
import { tokenizePhp } from '../../oracles/expectations/extract/php';
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
  type SourceAnalyzerCount,
  type SourceAnalyzerDiagnostic,
  type SourceDiagnosticRejectionFamily,
  type SourceProofGapCount,
  type SourceSurfacePerformanceMetrics,
  type SourceOperationProjectionCompleteness,
  type SourceOperationRepositoryCompleteness,
  type SourceOperationCompletenessState,
  REAL_SOURCE_OPERATION_COMPLETENESS_VERSION,
  REAL_SOURCE_SURFACE_PERFORMANCE_VERSION,
  type OpenApiResponseDefinitionBinding,
} from './surfaceTypes';
import { sourceEvidenceProvenance, type SourceEvidenceProvenance } from './generatedArtifact';
import { coverageStateForCompleteness, isComplete, worstCompleteness, type SourceCompletenessState } from './completeness';
import { analyzePhpEffectClosure, type PhpClosureEntrypoint, type PhpEffectClosureProof } from './phpEffectClosure';
import { parsePhpRouteMiddlewareFlags, parsePhpRoutePipelineModel, resolvePhpRoutePipeline, type PhpResolvedRoutePipeline, type PhpRouteMiddlewareFlags, type PhpRoutePipelineModel } from './phpPipeline';
import { buildReadOnlyProof, readOnlyClassificationFromProof, type ReadOnlyProof } from './readOnlyProof';

const SAFE_HANDLER_RE = /^[A-Za-z_][A-Za-z0-9_$\\.-]{0,159}$/;
const SAFE_REFERENCE_RE = /^src\/[A-Za-z0-9._/-]{1,239}\.(?:php|json|ya?ml|tsx?|jsx?|go)$/i;
// `&` is admitted because gRPC-gateway custom-method templates use it in the
// literal path segment (`/v1/invoice/{date}:create&savesettings`). Widening the
// character class can only make a previously UNSUPPORTED route template exact;
// it can never rewrite an already-safe template, and the C-02a regression
// proves the widening is inert for every pre-C-02a operation identity.
const SAFE_ROUTE_RE = /^\/[A-Za-z0-9._~{}:&-]{0,239}(?:\/[A-Za-z0-9._~{}:&-]{0,239})*$/;
const SAFE_OPERATION_RE = /^[A-Za-z][A-Za-z0-9_.:/-]{0,199}$/;
/** Swagger 2.0 local reference into the document's own `definitions` block. */
const OPENAPI_DEFINITION_REF_RE = /^#\/definitions\/([A-Za-z0-9_.-]{1,159})$/;
const SAFE_DEFINITION_RE = /^[A-Za-z_][A-Za-z0-9_.-]{0,159}$/;
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
/** Bounded projection ceiling. It is a memory/CPU guard, not a coverage
 * policy: it is aligned with the upstream file-scan ceiling
 * (MAX_SIBLING_SOURCE_SCAN_FILES) so that a fully enumerated snapshot
 * projects every parsed operation, and any drop is reported explicitly
 * through SourceOperationProjectionCompleteness. */
export const MAX_PROJECTED_OPERATIONS = 4096;
const ROUTE_FILE_RE = /(?:Routing\.ya?ml|routes?\.(?:json|ya?ml)|openapi\.json|swagger\.json)$/i;
const SOURCE_VERSION = 'nightwatch.real-source-surface-descriptor.v3';
/** The Slim-style route provider is located structurally, never by a
 * hand-maintained per-repository path. Zero or several matches leave the
 * pipeline model unresolved, which fails closed. */
const ROUTE_PROVIDER_RE = /(?:^|\/)Route\/Providor\/RouteProvidor\.php$/;

export interface SourceSurfaceDiscovery {
  readonly inventory: RealSourceSnapshotInventory;
  readonly operations: readonly SourceOperationDescriptor[];
  readonly surfaces: readonly RealSourceSurfaceDescriptor[];
  readonly phase24Inputs: readonly Phase24CandidateInput[];
  readonly counters: SourceSurfaceDiscoveryCounters;
  readonly gapTaxonomy: SourceGapTaxonomy;
  readonly performance: SourceSurfacePerformanceMetrics;
  readonly deterministicDigest: string;
  readonly operationCompleteness: SourceOperationProjectionCompleteness;
}

export interface SourcePhase24Integration {
  readonly discovery: SourceSurfaceDiscovery;
  readonly snapshotAnalyses: readonly Phase24SourceSnapshotAnalysis[];
  readonly portfolio: Phase24CandidatePortfolio;
  readonly selection: Phase24PortfolioSelection;
  readonly eligibilityCensus: SourceEligibilityCensus;
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
  /** C-02a — OpenAPI in-document `$ref` → `definitions` response bindings. */
  readonly responseDefinitions: readonly OpenApiResponseDefinitionBinding[];
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

// C-06 — the hand-authored eleven-row operation catalog is no longer a
// read-only classifier. `runtimeBinding` above still joins it, because a
// runtime binding is a different fact from a read-only property; but no
// `semanticClass` value can produce `PROVEN_READ_ONLY` any more. Read-only
// classification is derived at the post-join proof stage of
// `discoverSourceSurfaces` by `buildReadOnlyProof`, from the route's resolved
// middleware pipeline and its bounded effect closure.

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
    routes.push({ method: routeMethod ?? 'GET', routeTemplate: routeTemplate ?? '/', handlerClient: safeClient, handlerSymbol: safeMethod, requestReference, responseReference, sourcePath, language: 'YAML', routeProof, routeRejectionReason, responseDefinitions: [] });
  }
  return routes;
}

function parseStaticRoutes(sourcePath: string, sourceText: string, language: 'TYPESCRIPT' | 'JAVASCRIPT' | 'GO'): readonly ParsedRoute[] {
  // These raw anchors only avoid allocating a bounded token stream for files
  // that cannot contain the supported route shape. They are not authority:
  // every file that passes is still tokenized, and only token matches below
  // can produce a route.
  const methodAnchor = language === 'GO'
    ? /(?:^|[^A-Za-z0-9_$])(?:GET|POST|PUT|PATCH|DELETE)(?:[^A-Za-z0-9_$]|$)/
    : /(?:^|[^A-Za-z0-9_$])(?:get|post|put|patch|delete)(?:[^A-Za-z0-9_$]|$)/i;
  const receiverAnchor = language === 'GO' ? sourceText.includes('.') : /(?:^|[^A-Za-z0-9_$])(?:router|app|route)(?:[^A-Za-z0-9_$]|$)/i.test(sourceText);
  if (!receiverAnchor || !sourceText.includes('.') || !methodAnchor.test(sourceText)) return [];
  const tokens = tokenizeStaticSource(sourceText, language);
  if (tokens === null) return [];
  const routes: ParsedRoute[] = [];
  const routeReceivers = new Set(['router', 'app', 'route']);
  const tokenAt = (index: number): StaticLexicalToken | undefined => tokens[index];
  const qualifiedIdentifier = (start: number): { readonly value: string; readonly next: number } | null => {
    const first = tokenAt(start);
    if (first?.kind !== 'IDENTIFIER') return null;
    let value = first.value;
    let next = start + 1;
    while (tokenAt(next)?.kind === 'PUNCT' && tokenAt(next)?.value === '.' && tokenAt(next + 1)?.kind === 'IDENTIFIER') {
      value += `.${tokenAt(next + 1)!.value}`;
      next += 2;
    }
    return { value, next };
  };
  for (let index = 0; index < tokens.length; index += 1) {
    let methodIndex = -1;
    let openIndex = -1;
    if (language === 'GO') {
      if (tokenAt(index)?.kind !== 'PUNCT' || tokenAt(index)?.value !== '.' || tokenAt(index + 1)?.kind !== 'IDENTIFIER') continue;
      methodIndex = index + 1;
      openIndex = index + 2;
    } else {
      if (tokenAt(index)?.kind !== 'IDENTIFIER' || !routeReceivers.has(tokenAt(index)!.value.toLowerCase())) continue;
      if (tokenAt(index + 1)?.kind !== 'PUNCT' || tokenAt(index + 1)?.value !== '.' || tokenAt(index + 2)?.kind !== 'IDENTIFIER') continue;
      methodIndex = index + 2;
      openIndex = index + 3;
    }
    const rawMethod = tokenAt(methodIndex)?.value ?? '';
    const routeMethod = language === 'GO'
      ? (HTTP_METHODS as readonly string[]).includes(rawMethod) ? rawMethod as SourceOperationMethod : null
      : method(rawMethod);
    if (routeMethod === null || tokenAt(openIndex)?.kind !== 'PUNCT' || tokenAt(openIndex)?.value !== '(') continue;
    const routeToken = tokenAt(openIndex + 1);
    if (routeToken?.kind !== 'STRING' || (routeToken.quote !== "'" && routeToken.quote !== '"')) continue;
    if (tokenAt(openIndex + 2)?.kind !== 'PUNCT' || tokenAt(openIndex + 2)?.value !== ',') continue;
    const handler = safeHandler(qualifiedIdentifier(openIndex + 3)?.value ?? null);
    const routeTemplate = safeRoute(routeToken.value);
    const routeProof: SourceRouteProof = routeMethod !== null && routeTemplate !== null && handler !== null ? 'PROVEN' : 'UNSUPPORTED';
    routes.push({ method: routeMethod ?? 'GET', routeTemplate: routeTemplate ?? '/', handlerClient: null, handlerSymbol: handler, requestReference: null, responseReference: null, sourcePath, language, routeProof, routeRejectionReason: routeProof === 'PROVEN' ? null : 'SOURCE_SYNTAX_UNSUPPORTED', responseDefinitions: [] });
  }
  return routes;
}

/** Resolve one Swagger `responses[code].schema.$ref` against the document's own
 * `definitions` block. This is in-document resolution only: no external file,
 * no remote reference, and no value ever leaves the document boundary — only
 * the definition's name, its top-level property count, and a digest over its
 * sorted property name/type pairs. */
function bindOpenApiResponseDefinition(statusCode: string, response: unknown, definitions: Record<string, unknown>): OpenApiResponseDefinitionBinding | null {
  if (response === null || typeof response !== 'object' || Array.isArray(response)) return null;
  const schema = (response as Record<string, unknown>).schema;
  if (schema === null || typeof schema !== 'object' || Array.isArray(schema)) return null;
  const reference = (schema as Record<string, unknown>).$ref;
  if (typeof reference !== 'string') return null;
  const match = reference.match(OPENAPI_DEFINITION_REF_RE);
  const name = match?.[1];
  if (name === undefined) return { statusCode, state: 'REF_MALFORMED', definition: null, fieldCount: 0, definitionDigest: null };
  if (!SAFE_DEFINITION_RE.test(name)) return { statusCode, state: 'DEFINITION_UNSAFE', definition: null, fieldCount: 0, definitionDigest: null };
  if (!Object.prototype.hasOwnProperty.call(definitions, name)) return { statusCode, state: 'DEFINITION_MISSING', definition: name, fieldCount: 0, definitionDigest: null };
  const definition = definitions[name];
  if (definition === null || typeof definition !== 'object' || Array.isArray(definition)) return { statusCode, state: 'DEFINITION_MISSING', definition: name, fieldCount: 0, definitionDigest: null };
  const properties = (definition as Record<string, unknown>).properties;
  const fields = properties !== null && typeof properties === 'object' && !Array.isArray(properties)
    ? Object.entries(properties as Record<string, unknown>)
      .filter(([field]) => SAFE_DEFINITION_RE.test(field))
      .map(([field, shape]) => ({ field, type: shape !== null && typeof shape === 'object' && !Array.isArray(shape) && typeof (shape as Record<string, unknown>).type === 'string' ? (shape as Record<string, unknown>).type as string : null }))
      .sort((left, right) => left.field.localeCompare(right.field))
    : [];
  return { statusCode, state: 'RESOLVED', definition: name, fieldCount: fields.length, definitionDigest: safeSemanticDigest({ definition: name, fields }, 'openapi-definition') };
}

function parseOpenApiRoutes(sourcePath: string, sourceText: string): readonly ParsedRoute[] {
  let parsed: unknown;
  try { parsed = JSON.parse(sourceText); } catch { return []; }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return [];
  const paths = (parsed as Record<string, unknown>).paths;
  if (paths === null || typeof paths !== 'object' || Array.isArray(paths)) return [];
  const rawDefinitions = (parsed as Record<string, unknown>).definitions;
  const definitions = rawDefinitions !== null && typeof rawDefinitions === 'object' && !Array.isArray(rawDefinitions) ? rawDefinitions as Record<string, unknown> : {};
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
      const responses = operation !== null && operation.responses !== null && typeof operation.responses === 'object' && !Array.isArray(operation.responses) ? operation.responses as Record<string, unknown> : {};
      const responseDefinitions = Object.keys(responses).sort()
        .map((statusCode) => bindOpenApiResponseDefinition(statusCode, responses[statusCode], definitions))
        .filter((binding): binding is OpenApiResponseDefinitionBinding => binding !== null);
      const proven = safePath !== null && operation !== null;
      routes.push({ method: routeMethod, routeTemplate: safePath ?? '/', handlerClient: null, handlerSymbol: handler, requestReference, responseReference, sourcePath, language: 'OPENAPI', routeProof: proven ? 'PROVEN' : 'UNSUPPORTED', routeRejectionReason: proven ? null : 'SOURCE_SYNTAX_UNSUPPORTED', responseDefinitions });
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
    // Provisional. A parse-time descriptor has read no handler, no middleware
    // and no join, so it cannot carry a read-only property. The proof stage
    // replaces this with the projection of the assembled proof.
    readOnlyClassification: 'UNSUPPORTED',
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
  if (language === 'PHP') {
    try {
      const tokens = tokenizePhp(sourceText);
      let count = 0;
      for (let index = 0; index + 2 < tokens.length; index += 1) {
        const nameIndex = tokens[index + 1]?.t === 'PUNCT' && tokens[index + 1]?.v === '&' ? index + 2 : index + 1;
        if (tokens[index]?.t === 'WORD' && tokens[index]?.v === 'function' && tokens[nameIndex]?.t === 'WORD' && tokens[nameIndex]?.v === symbol && tokens[nameIndex + 1]?.t === 'PUNCT' && tokens[nameIndex + 1]?.v === '(') count += 1;
      }
      return count;
    } catch {
      return 2;
    }
  }
  if (language !== 'TYPESCRIPT' && language !== 'JAVASCRIPT' && language !== 'GO') return 0;
  const tokens = tokenizeStaticSource(sourceText, language === 'GO' ? 'GO' : language);
  if (tokens === null) return 2;
  let count = 0;
  if (language === 'GO') {
    for (let index = 0; index < tokens.length; index += 1) {
      if (tokens[index]?.kind !== 'IDENTIFIER' || tokens[index]?.value !== 'func') continue;
      let cursor = index + 1;
      if (tokens[cursor]?.kind === 'PUNCT' && tokens[cursor]?.value === '(') {
        let depth = 0;
        for (; cursor < tokens.length; cursor += 1) {
          if (tokens[cursor]?.kind !== 'PUNCT') continue;
          if (tokens[cursor]?.value === '(') depth += 1;
          if (tokens[cursor]?.value === ')') {
            depth -= 1;
            if (depth === 0) {
              cursor += 1;
              break;
            }
          }
        }
        if (depth !== 0) return 2;
      }
      if (tokens[cursor]?.kind === 'IDENTIFIER' && tokens[cursor]?.value === symbol && tokens[cursor + 1]?.kind === 'PUNCT' && tokens[cursor + 1]?.value === '(') count += 1;
    }
    return count;
  }
  const declarationKeywords = new Set(['class', 'const', 'function', 'let', 'var']);
  for (let index = 0; index + 1 < tokens.length; index += 1) {
    if (tokens[index]?.kind === 'IDENTIFIER' && declarationKeywords.has(tokens[index]!.value) && tokens[index + 1]?.kind === 'IDENTIFIER' && tokens[index + 1]?.value === symbol) count += 1;
  }
  return count;
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

/** C-02a — one join per OpenAPI response `$ref`. A resolved reference is a
 * PROVEN in-document contract binding; a malformed or missing definition is an
 * explicit UNSUPPORTED_REFERENCE join, never a silent omission. */
function openApiDefinitionJoins(operation: SourceOperationDescriptor, bindings: readonly OpenApiResponseDefinitionBinding[]): readonly SourceEvidenceJoin[] {
  return bindings.map((binding) => joinEvidence({
    operation,
    kind: 'OPENAPI_RESPONSE_DEFINITION',
    toIdentity: `${operation.repository}:${operation.sourcePath}#/definitions/${binding.definition ?? '?'}:${binding.statusCode}`,
    state: binding.state === 'RESOLVED' ? 'PROVEN' : 'UNSUPPORTED_REFERENCE',
    evidence: binding.state === 'RESOLVED' ? { kind: 'openapi-definition', statusCode: binding.statusCode, definition: binding.definition, fieldCount: binding.fieldCount, definitionDigest: binding.definitionDigest } : null,
  }));
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
        if (match.contentDigest === null || sourceContentDigest(sourceText) !== match.contentDigest) {
          handlerState = 'SOURCE_STALE';
          joins.push(joinEvidence({ operation, kind: 'ROUTE_HANDLER', toIdentity: handlerIdentity, state: handlerState, evidence: null }));
        } else {
          const declarations = declarationCount(sourceText, match.language, operation.handlerSymbol);
          handlerState = declarations === 1 ? 'PROVEN' : declarations === 0 ? 'MISSING_SYMBOL' : 'MULTIPLE_SYMBOLS';
          joins.push(joinEvidence({ operation, kind: 'ROUTE_HANDLER', toIdentity: handlerIdentity, state: handlerState, evidence: { kind: 'handler-symbol', repoId: operation.repository, path: operation.handlerPath, symbol: operation.handlerSymbol, contentDigest: match.contentDigest, declarationCount: declarations } }));
        }
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
    if (match.contentDigest === null || sourceContentDigest(sourceText) !== match.contentDigest) {
      joins.push(joinEvidence({ operation, kind, toIdentity: identity, state: 'SOURCE_STALE', evidence: null }));
      return 'SOURCE_STALE';
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

function observationRejectionFamily(input: { readonly analyzerId: string; readonly code: string | null; readonly detail: string | null }): SourceDiagnosticRejectionFamily {
  if (input.code === null) return 'NONE';
  if (input.code === 'PRIVACY_UNSAFE_SOURCE') return 'PRIVACY_BOUNDARY';
  if (input.code === 'SOURCE_UNAVAILABLE' || input.code === 'SOURCE_STALE' || input.code === 'SOURCE_PATH_INVALID') return 'SOURCE_CURRENTNESS';
  if (input.code === 'SOURCE_TOO_LARGE' || input.detail === 'token-limit' || input.detail === 'source-cap') return 'LEXICAL_BUDGET';
  if (input.code === 'DYNAMIC_KEY_FLOW' || input.code === 'RUNTIME_VALUE_UNPROVEN') return 'RETURN_EXPRESSION';
  if (input.code === 'BRANCH_SET_INCOMPLETE' || input.detail?.includes('branch-') === true || input.detail?.includes('control-flow') === true) return 'CONTROL_FLOW';
  if (input.code === 'MALFORMED_STATIC_SCHEMA' || input.code === 'FIELD_NAME_UNSAFE') return 'STATIC_SCHEMA';
  if (input.code === 'UNSUPPORTED_LANGUAGE') return 'SOURCE_BOUNDARY';
  if (input.code === 'UNSUPPORTED_SYNTAX') return input.detail === 'function-not-found' ? 'DECLARATION_LOOKUP' : 'UNSUPPORTED_SYNTAX';
  if (input.code === 'INTERNAL_ANALYZER_ERROR') return 'INTERNAL_UNCLASSIFIED';
  return input.analyzerId.startsWith('PHP_') ? 'UNSUPPORTED_SYNTAX' : 'INTERNAL_UNCLASSIFIED';
}

function flowRejectionFamily(code: NonNullable<ResponseFlowProof['rejectionCode']>): SourceDiagnosticRejectionFamily {
  if (code.includes('DYNAMIC')) return 'DYNAMIC_DISPATCH';
  if (code.includes('BRANCH') || code.includes('CYCLE') || code.includes('DEPTH')) return 'CONTROL_FLOW';
  if (code.includes('BUDGET') || code.includes('DECLARATIONS_EXCEEDED')) return 'LEXICAL_BUDGET';
  if (code.includes('SYMBOL') || code.includes('DECLARATION')) return 'DECLARATION_LOOKUP';
  if (code.includes('STALE')) return 'SOURCE_CURRENTNESS';
  return 'UNSUPPORTED_SYNTAX';
}

function analyzerDiagnostics(observations: readonly AnalyzerObservation[], responseFlow: ResponseFlowProof | null): readonly SourceAnalyzerDiagnostic[] {
  const diagnostics: SourceAnalyzerDiagnostic[] = observations.map((observation) => ({
    analyzerId: observation.analyzerId,
    analyzerVersion: observation.analyzerVersion,
    status: observation.status,
    behaviorClass: observation.behaviorClass,
    rejectionCode: observation.rejectionCode,
    flowRejectionCode: null,
    rejectionFamily: observationRejectionFamily({ analyzerId: observation.analyzerId, code: observation.rejectionCode, detail: observation.rejectionDetail }),
    evidenceDigest: observation.evidenceDigest,
  }));
  if (responseFlow !== null && responseFlow.status !== 'NOT_APPLICABLE') diagnostics.push({
    analyzerId: 'PHP_RESPONSE_FLOW',
    analyzerVersion: REAL_SOURCE_RESPONSE_FLOW_VERSION,
    status: responseFlow.status === 'PROVEN' ? 'MECHANICALLY_PROVABLE' : 'REJECTED',
    behaviorClass: null,
    rejectionCode: null,
    flowRejectionCode: responseFlow.rejectionCode,
    rejectionFamily: responseFlow.status === 'PROVEN' || responseFlow.rejectionCode === null ? 'NONE' : flowRejectionFamily(responseFlow.rejectionCode),
    evidenceDigest: responseFlow.proofDigest,
  });
  return diagnostics.sort((left, right) => left.analyzerId.localeCompare(right.analyzerId) || left.evidenceDigest.localeCompare(right.evidenceDigest));
}

/** C-02a — response contract recovered from the OpenAPI document itself.
 *
 * A generated Swagger document has no handler symbol to analyze, so the
 * handler-analyzer route can never prove its response shape. The document's
 * own `$ref` → `definitions` edge is the mechanical proof, and it is a
 * different, explicitly labelled kind of evidence: the surface's provenance
 * records that it came from a GENERATED_ARTIFACT, and that qualifier alone can
 * never grant a production admission. */
function openApiResponseEvidence(operation: SourceOperationDescriptor, bindings: readonly OpenApiResponseDefinitionBinding[]): { readonly responseContractId: string | null; readonly responseEvidenceDigest: string | null; readonly semanticContractIds: readonly string[]; readonly responseProof: SourceJoinState; readonly semanticProof: SourceJoinState } {
  const resolved = bindings.filter((binding) => binding.state === 'RESOLVED').sort((left, right) => left.statusCode.localeCompare(right.statusCode));
  if (resolved.length === 0) return { responseContractId: null, responseEvidenceDigest: null, semanticContractIds: [], responseProof: 'UNSUPPORTED_REFERENCE', semanticProof: 'UNSUPPORTED_REFERENCE' };
  const core = resolved.map((binding) => ({ statusCode: binding.statusCode, definition: binding.definition, fieldCount: binding.fieldCount, definitionDigest: binding.definitionDigest }));
  return {
    responseContractId: safeSemanticDigest({ operationId: operation.operationId, definitions: core }, 'response-contract'),
    responseEvidenceDigest: sourceEvidenceDigest({ kind: 'openapi-response-contract', operationId: operation.operationId, definitions: core }),
    semanticContractIds: core.map((binding) => safeSemanticDigest({ operationId: operation.operationId, definition: binding }, 'semantic-contract')).sort(),
    responseProof: 'PROVEN',
    semanticProof: 'PROVEN',
  };
}

function responseEvidence(input: { readonly operation: SourceOperationDescriptor; readonly observations: readonly AnalyzerObservation[]; readonly handlerState: SourceJoinState; readonly responseReferenceState: SourceJoinState | null; readonly responseFlow: ResponseFlowProof | null }): { readonly responseContractId: string | null; readonly responseEvidenceDigest: string | null; readonly semanticContractIds: readonly string[]; readonly responseProof: SourceJoinState; readonly semanticProof: SourceJoinState; readonly responseFlow: ResponseFlowProof | null } {
  if (input.handlerState !== 'PROVEN' || (input.responseReferenceState !== null && input.responseReferenceState !== 'PROVEN')) {
    const state = input.responseReferenceState !== null && input.responseReferenceState !== 'PROVEN' ? input.responseReferenceState : input.handlerState;
    return { responseContractId: null, responseEvidenceDigest: null, semanticContractIds: [], responseProof: state, semanticProof: state, responseFlow: input.responseFlow };
  }
  const proven = input.observations.filter((observation) => observation.status === 'MECHANICALLY_PROVABLE' && observation.shape !== null);
  if (proven.length === 0) return { responseContractId: null, responseEvidenceDigest: null, semanticContractIds: [], responseProof: 'UNSUPPORTED_REFERENCE', semanticProof: 'UNSUPPORTED_REFERENCE', responseFlow: input.responseFlow };
  const shapes = proven.map((observation) => ({ analyzerId: observation.analyzerId, behaviorClass: observation.behaviorClass, shape: observation.shape, evidenceDigest: observation.evidenceDigest })).sort((left, right) => left.evidenceDigest.localeCompare(right.evidenceDigest));
  const flowIdentity = input.responseFlow?.status === 'PROVEN' ? {
    version: input.responseFlow.schemaVersion,
    proofDigest: input.responseFlow.proofDigest,
    depth: input.responseFlow.depth,
    declarations: input.responseFlow.declarations.map((declaration) => ({ declarationId: declaration.declarationId, repoId: declaration.repoId, sha: declaration.sourceSha, path: declaration.relativePath, contentDigest: declaration.contentDigest })).sort((left, right) => left.declarationId.localeCompare(right.declarationId)),
    edges: input.responseFlow.edges,
  } : null;
  const responseEvidenceDigest = sourceEvidenceDigest({ kind: 'response-contract', operationId: input.operation.operationId, shapes, flow: flowIdentity });
  const responseContractId = safeSemanticDigest({ operationId: input.operation.operationId, shapes, flow: flowIdentity }, 'response-contract');
  const semanticContractIds = shapes.map((shape) => safeSemanticDigest({ operationId: input.operation.operationId, shape, flow: flowIdentity }, 'semantic-contract')).sort();
  return { responseContractId, responseEvidenceDigest, semanticContractIds, responseProof: 'PROVEN', semanticProof: 'PROVEN', responseFlow: input.responseFlow };
}

function contractEvidence(operation: SourceOperationDescriptor, analysis: { readonly observations: readonly AnalyzerObservation[]; readonly responseFlow: ResponseFlowProof | null }, joins: ResolvedSurfaceJoins, responseDefinitions: readonly OpenApiResponseDefinitionBinding[]): SourceContractEvidence {
  const fields = routeFields(operation.routeTemplate);
  const requestCore = { kind: 'request-contract', operationId: operation.operationId, method: operation.method, routeTemplate: operation.routeTemplate, fields };
  const requestEvidenceDigest = sourceEvidenceDigest(requestCore);
  const requestContractId = safeSemanticDigest(requestCore, 'request-contract');
  const requestProof = operation.requestReference === null ? operation.routeProof === 'PROVEN' ? 'PROVEN' : 'UNSUPPORTED_REFERENCE' : joins.requestState ?? 'UNSUPPORTED_REFERENCE';
  // An OpenAPI route with in-document definition bindings is proven by the
  // document; every other route still goes through the handler analyzers.
  const openApi = operation.language === 'OPENAPI' && operation.routeProof === 'PROVEN' && responseDefinitions.length > 0 ? openApiResponseEvidence(operation, responseDefinitions) : null;
  const response = openApi !== null && openApi.responseProof === 'PROVEN'
    ? { ...openApi, responseFlow: analysis.responseFlow }
    : responseEvidence({ operation, observations: analysis.observations, handlerState: joins.handlerState, responseReferenceState: joins.responseState, responseFlow: analysis.responseFlow });
  return { requestContractId, requestEvidenceDigest, requestProof, requestFieldCount: fields.length, responseContractId: response.responseContractId, responseEvidenceDigest: response.responseEvidenceDigest, responseProof: response.responseProof, semanticContractIds: response.semanticContractIds, semanticProof: response.semanticProof, responseAnalyzerDiagnostics: analyzerDiagnostics(analysis.observations, response.responseFlow), responseFlow: response.responseFlow, responseDefinitions: [...responseDefinitions].sort((left, right) => left.statusCode.localeCompare(right.statusCode)) };
}

export function sourceProofGapCode(proof: SourceJoinState, diagnostics: readonly SourceAnalyzerDiagnostic[], kind: 'RESPONSE' | 'SEMANTIC'): string | null {
  if (proof === 'PROVEN') return null;
  const flowRejectionCodes = [...new Set(diagnostics.map((diagnostic) => diagnostic.flowRejectionCode).filter((code): code is string => code !== null))].sort();
  if (flowRejectionCodes.length > 0) return `${kind}_FLOW_${flowRejectionCodes.map((code) => code.replace(/^RESPONSE_/, '')).join('+')}`;
  if (proof !== 'UNSUPPORTED_REFERENCE') return `${kind}_${proof}`;
  const rejectionCodes = [...new Set(diagnostics.map((diagnostic) => diagnostic.rejectionCode).filter((code): code is string => code !== null))].sort();
  if (rejectionCodes.length > 0) return `${kind}_ANALYZER_${rejectionCodes.join('+')}`;
  return `${kind}_ANALYZER_UNPROVEN`;
}

function gapCounts(values: readonly (string | null)[]): readonly SourceProofGapCount[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    if (value !== null) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()].map(([code, count]) => ({ code, count })).sort((left, right) => left.code.localeCompare(right.code));
}

function analyzerCounts(surfaces: readonly RealSourceSurfaceDescriptor[]): readonly SourceAnalyzerCount[] {
  const counts = new Map<string, { proven: number; rejected: number }>();
  for (const surface of surfaces) {
    for (const diagnostic of surface.contract.responseAnalyzerDiagnostics) {
      const current = counts.get(diagnostic.analyzerId) ?? { proven: 0, rejected: 0 };
      if (diagnostic.status === 'MECHANICALLY_PROVABLE') current.proven += 1;
      else current.rejected += 1;
      counts.set(diagnostic.analyzerId, current);
    }
  }
  return [...counts.entries()].map(([analyzerId, countsForAnalyzer]) => ({ analyzerId, ...countsForAnalyzer })).sort((left, right) => left.analyzerId.localeCompare(right.analyzerId));
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
  else if (handlerJoin?.state === 'SOURCE_STALE') reasons.push('SOURCE_STALE');
  else if (handlerJoin !== undefined && handlerJoin.state !== 'PROVEN') reasons.push('HANDLER_UNRESOLVED');
  if (contract.requestProof !== 'PROVEN') reasons.push('REQUEST_CONTRACT_UNPROVEN');
  if (contract.responseProof !== 'PROVEN') reasons.push('RESPONSE_CONTRACT_UNPROVEN');
  if (contract.semanticProof !== 'PROVEN') reasons.push('SEMANTIC_CONTRACT_UNPROVEN');
  if (operation.readOnlyClassification === 'PROVEN_MUTATION_CAPABLE' || operation.readOnlyClassification === 'CONDITIONAL_MUTATION') reasons.push('MUTATION_CAPABLE');
  else if (operation.readOnlyClassification !== 'PROVEN_READ_ONLY') reasons.push('READ_ONLY_NOT_PROVEN');
  if (operation.runtimeBinding === 'SOURCE_ONLY') reasons.push('RUNTIME_BINDING_MISSING');
  if (operation.runtimeBinding === 'SOURCE_VERSION_MISMATCH' || joins.some((join) => join.state === 'SOURCE_STALE')) reasons.push('SOURCE_STALE');
  if (component.state === 'AMBIGUOUS_COMPONENT' || component.state === 'UNRESOLVED') reasons.push('OWNER_COMPONENT_AMBIGUOUS');
  return [...new Set(reasons)].sort();
}

function lifecycle(operation: SourceOperationDescriptor, contract: SourceContractEvidence): RealSourceSurfaceDescriptor['lifecycle'] {
  if (contract.semanticProof !== 'PROVEN') return 'DISCOVERED';
  if (operation.runtimeBinding === 'RUNTIME_BOUND_EXACT' && contract.responseProof === 'PROVEN') return 'PROJECTABLE';
  return 'MECHANICALLY_PROVEN';
}

function descriptor(operation: SourceOperationDescriptor, source: { readonly repoId: string; readonly sha: string; readonly evidenceDigest: string }, relevantFiles: readonly string[], joins: readonly SourceEvidenceJoin[], contract: SourceContractEvidence, sourceEvidence: SourceEvidenceProvenance, readOnlyProof: ReadOnlyProof): RealSourceSurfaceDescriptor {
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
    currentness: joins.some((join) => join.state === 'SOURCE_STALE') ? 'SOURCE_STALE' as const : 'CURRENT' as const,
    lifecycle: lifecycle(operation, contract),
    projectionCapability: contract.semanticProof === 'PROVEN' ? 'PROJECTABLE' as const : 'UNPROVEN' as const,
    replayCapability: operation.runtimeBinding === 'RUNTIME_BOUND_EXACT' && operation.readOnlyClassification === 'PROVEN_READ_ONLY' ? 'SUPPORTED' as const : 'UNPROVEN' as const,
    differentialCapability: 'UNPROVEN' as const,
    exclusionReasons: exclusion,
    sourceEvidence,
    readOnlyProof,
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
    sourceVersion: surface.currentness === 'CURRENT' && surface.operation.runtimeBinding !== 'SOURCE_VERSION_MISMATCH' ? 'CURRENT' : 'DRIFTED',
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

interface SourceResponseAnalysis {
  readonly observations: readonly AnalyzerObservation[];
  readonly responseFlow: ResponseFlowProof | null;
  readonly responseFlowElapsedMs: number;
}

function mergeFlowObservations(observationsByDeclaration: readonly (readonly AnalyzerObservation[])[]): readonly AnalyzerObservation[] {
  const all = observationsByDeclaration.flat();
  if (observationsByDeclaration.length <= 1) return all;
  const provenKeys = observationsByDeclaration.map((observations) => new Set(observations
    .filter((observation) => observation.status === 'MECHANICALLY_PROVABLE' && observation.shape !== null)
    .map((observation) => `${observation.analyzerId}|${observation.behaviorClass ?? ''}|${JSON.stringify(observation.shape)}`)));
  const firstKeys = [...(provenKeys[0] ?? new Set())].sort();
  const compatible = provenKeys.every((set) => set.size === firstKeys.length && firstKeys.every((key) => set.has(key)));
  const commonSet = new Set(compatible ? firstKeys : []);
  const merged = all.filter((observation) => observation.status === 'MECHANICALLY_PROVABLE' && observation.shape !== null && commonSet.has(`${observation.analyzerId}|${observation.behaviorClass ?? ''}|${JSON.stringify(observation.shape)}`));
  const rejected = all.filter((observation) => observation.status === 'REJECTED');
  const seen = new Set<string>();
  return [...merged, ...rejected].filter((observation) => {
    const key = `${observation.analyzerId}|${observation.status}|${observation.evidenceDigest}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((left, right) => left.analyzerId.localeCompare(right.analyzerId) || left.evidenceDigest.localeCompare(right.evidenceDigest));
}

function observationsFor(input: { readonly access: SiblingSourceAccess; readonly inventory: RealSourceSnapshotInventory; readonly operation: SourceOperationDescriptor; readonly handlerState: SourceJoinState; readonly responseFlowIndex: ReturnType<typeof createResponseFlowIndex> }): SourceResponseAnalysis {
  if (input.operation.handlerPath === null || input.handlerState !== 'PROVEN') return { observations: [], responseFlow: null, responseFlowElapsedMs: 0 };
  const match = input.inventory.files.find((file) => file.repoId === input.operation.repository && file.relativePath === input.operation.handlerPath && file.status === 'ELIGIBLE');
  if (match === undefined || match.language === null || match.language === 'YAML') return { observations: [], responseFlow: null, responseFlowElapsedMs: 0 };
  const sourceText = input.access.reader.readFile(input.operation.repository, match.relativePath);
  if (sourceText === null) return { observations: [], responseFlow: null, responseFlowElapsedMs: 0 };
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
  const flowStartedAt = Date.now();
  const flow = resolveResponseFlow({ index: input.responseFlowIndex, operation: input.operation });
  const responseFlowElapsedMs = Math.max(0, Date.now() - flowStartedAt);
  if (match.contentDigest === null || sourceContentDigest(sourceText) !== match.contentDigest) {
    if (flow.status === 'NOT_APPLICABLE') return { observations: [], responseFlow: null, responseFlowElapsedMs };
    const staleFlow = { ...flow, status: 'REJECTED' as const, rejectionCode: 'RESPONSE_DECLARATION_STALE' as const };
    return { observations: [], responseFlow: { ...staleFlow, proofDigest: safeSemanticDigest(staleFlow, 'response-flow') }, responseFlowElapsedMs };
  }
  const direct = analyzeSourceArtifact(artifact);
  if (flow.status !== 'PROVEN') return { observations: direct, responseFlow: flow.status === 'REJECTED' ? flow : null, responseFlowElapsedMs };
  const terminalSources = flow.terminalDeclarationIds.map((declarationId) => {
    const declaration = flow.declarations.find((candidate) => candidate.declarationId === declarationId);
    const sourceText = declaration === undefined ? null : input.access.reader.readFile(declaration.repoId, declaration.relativePath);
    return { declaration, sourceText };
  });
  const staleTerminal = terminalSources.some(({ declaration, sourceText }) => declaration === undefined || sourceText === null || sourceContentDigest(sourceText) !== declaration.contentDigest);
  if (staleTerminal) {
    const staleFlow = { ...flow, status: 'REJECTED' as const, rejectionCode: 'RESPONSE_DECLARATION_STALE' as const };
    return { observations: direct, responseFlow: { ...staleFlow, proofDigest: safeSemanticDigest(staleFlow, 'response-flow') }, responseFlowElapsedMs };
  }
  const terminalObservations = terminalSources.map(({ declaration, sourceText }) => {
    if (declaration === undefined || sourceText === null) return [] as readonly AnalyzerObservation[];
    return analyzeSourceArtifact({
      artifactId: `surface-artifact-${declaration.sourceSha.slice(0, 12)}-flow-${declaration.declarationId.slice(-8)}`,
      language: 'PHP',
      repoId: declaration.repoId,
      sha: declaration.sourceSha,
      relativePath: declaration.relativePath,
      symbol: declaration.symbol,
      sourceText,
      observationSurfaces: ['API', 'SYNTHETIC'],
      includeExtendedResponseProof: true,
    });
  });
  const merged = mergeFlowObservations(terminalObservations);
  const hasProvenShape = merged.some((observation) => observation.status === 'MECHANICALLY_PROVABLE' && observation.shape !== null);
  return hasProvenShape ? { observations: merged, responseFlow: flow, responseFlowElapsedMs } : { observations: direct, responseFlow: { ...flow, status: 'REJECTED', rejectionCode: 'RESPONSE_BRANCH_INCOMPLETE', proofDigest: safeSemanticDigest({ ...flow, status: 'REJECTED', rejectionCode: 'RESPONSE_BRANCH_INCOMPLETE' }, 'response-flow') }, responseFlowElapsedMs };
}

/** Discover operations/surfaces from one bounded source inventory. */
export function discoverSourceSurfaces(input: { readonly access: SiblingSourceAccess; readonly config: RealSourceScanConfig; readonly cache?: RealSourceSurfaceCache }): SourceSurfaceDiscovery {
  const startedAt = Date.now();
  const scanStartedAt = startedAt;
  const inventory = scanSource({ access: input.access, config: input.config });
  const scanElapsedMs = Math.max(0, Date.now() - scanStartedAt);
  const cacheKey = input.cache === undefined ? null : sourceSurfaceCacheKey({ config: input.config, inventory });
  const cached = cacheKey === null ? undefined : input.cache?.get(cacheKey);
  if (cached !== undefined) return cached;
  const scopedAccess = createCallScopedSourceReadView({ access: input.access, inventory }).access;
  const operations: SourceOperationDescriptor[] = [];
  const responseFlowIndexStartedAt = Date.now();
  const responseFlowIndex = createResponseFlowIndex({ access: scopedAccess, inventory });
  const responseFlowIndexElapsedMs = Math.max(0, Date.now() - responseFlowIndexStartedAt);

  // --- C-06 read-only proof stage ---------------------------------------
  // Every read below goes through the same call-scoped view as the rest of
  // discovery, and every file is re-checked against the inventory's own
  // content digest, so a proof can never be decided over stale bytes.
  const currentSource = (repoId: string, relativePath: string): string | null => {
    const record = inventory.files.find((file) => file.repoId === repoId && file.relativePath === relativePath);
    if (record === undefined || record.status !== 'ELIGIBLE' || record.contentDigest === null) return null;
    const sourceText = scopedAccess.reader.readFile(repoId, relativePath);
    if (sourceText === null || sourceContentDigest(sourceText) !== record.contentDigest) return null;
    return sourceText;
  };
  const pipelineModels = new Map<string, PhpRoutePipelineModel>();
  const pipelineModelFor = (repoId: string): PhpRoutePipelineModel => {
    const cached = pipelineModels.get(repoId);
    if (cached !== undefined) return cached;
    const candidates = inventory.files.filter((file) => file.repoId === repoId && file.status === 'ELIGIBLE' && ROUTE_PROVIDER_RE.test(file.relativePath));
    const only = candidates.length === 1 ? candidates[0]! : null;
    const model = parsePhpRoutePipelineModel({
      providerPath: only?.relativePath ?? 'UNRESOLVED',
      providerSource: only === null ? null : currentSource(repoId, only.relativePath),
    });
    pipelineModels.set(repoId, model);
    return model;
  };
  const routeFlags = new Map<string, PhpRouteMiddlewareFlags>();
  const routeFlagsFor = (repoId: string, relativePath: string): PhpRouteMiddlewareFlags => {
    const key = `${repoId}|${relativePath}`;
    const cached = routeFlags.get(key);
    if (cached !== undefined) return cached;
    const sourceText = currentSource(repoId, relativePath);
    const flags: PhpRouteMiddlewareFlags = sourceText === null ? { defaults: null, overrides: new Map() } : parsePhpRouteMiddlewareFlags(sourceText);
    routeFlags.set(key, flags);
    return flags;
  };
  const repositoryEnumeration = (repoId: string): SourceCompletenessState =>
    inventory.completeness.repositories.find((entry) => entry.repoId === repoId)?.enumeration.state ?? 'UNKNOWN';
  const surfaceReadOnlyProof = (operation: SourceOperationDescriptor, handlerState: SourceJoinState): ReadOnlyProof => {
    let pipeline: PhpResolvedRoutePipeline | null = null;
    let closure: PhpEffectClosureProof | null = null;
    // The PHP lane is the only effect lane C-06 implements. A route in any
    // other language reaches the proof with no effect witness at all, which
    // is an absence, not a pass.
    if (operation.language === 'YAML' && operation.handlerPath !== null && operation.handlerSymbol !== null) {
      pipeline = resolvePhpRoutePipeline({
        model: pipelineModelFor(operation.repository),
        flags: routeFlagsFor(operation.repository, operation.sourcePath),
        method: operation.method,
        routeTemplate: operation.routeTemplate,
      });
      if (pipeline.state === 'RESOLVED') {
        const entrypoints: PhpClosureEntrypoint[] = [
          ...pipeline.middleware.map((attachment) => ({ relativePath: attachment.relativePath, symbol: attachment.symbol, role: 'MIDDLEWARE' as const })),
          { relativePath: operation.handlerPath, symbol: operation.handlerSymbol, role: 'HANDLER' as const },
        ];
        closure = analyzePhpEffectClosure({ entrypoints, resolver: { read: (relativePath) => currentSource(operation.repository, relativePath) } });
      }
    }
    return buildReadOnlyProof({
      method: operation.method,
      routeProof: operation.routeProof,
      joinState: handlerState,
      inventoryCompleteness: repositoryEnumeration(operation.repository),
      pipeline,
      closure,
    });
  };
  let routeFilesConsidered = 0;
  let routeOperationsTruncated = 0;
  let analyzerInvocations = 0;
  const parsedRoutes: { readonly file: (typeof inventory.files)[number]; readonly route: ParsedRoute }[] = [];
  for (const file of inventory.files.filter((entry) => entry.status === 'ELIGIBLE' && entry.language !== null && isRouteCandidateFile(entry.language, entry.relativePath)).sort((left, right) => left.repoId.localeCompare(right.repoId) || left.relativePath.localeCompare(right.relativePath))) {
    routeFilesConsidered += 1;
    const sourceText = scopedAccess.reader.readFile(file.repoId, file.relativePath);
    if (sourceText === null || file.language === null) continue;
    for (const route of parseRoutes(file.relativePath, file.language, sourceText)) parsedRoutes.push({ file, route });
  }
  const parsedKeys = new Map<string, number>();
  for (const entry of parsedRoutes) {
    const key = `${entry.file.repoId}:${entry.route.method}:${entry.route.routeTemplate}`;
    parsedKeys.set(key, (parsedKeys.get(key) ?? 0) + 1);
  }
  parsedRoutes.sort((left, right) => left.file.repoId.localeCompare(right.file.repoId) || left.file.relativePath.localeCompare(right.file.relativePath) || left.route.method.localeCompare(right.route.method) || left.route.routeTemplate.localeCompare(right.route.routeTemplate) || (left.route.handlerSymbol ?? '').localeCompare(right.route.handlerSymbol ?? ''));
  // Bounded projection with per-repository fairness. Projection order is not
  // the eviction order: the budget is dealt round-robin across repositories in
  // deterministic repoId order, so an earlier-sorting repository can never
  // consume the whole budget and silently evict another repository's
  // operations. Anything actually dropped is reported per repository.
  const entriesByRepository = new Map<string, typeof parsedRoutes>();
  for (const entry of parsedRoutes) {
    const existing = entriesByRepository.get(entry.file.repoId);
    if (existing === undefined) entriesByRepository.set(entry.file.repoId, [entry]);
    else existing.push(entry);
  }
  const projectionRepositories = [...entriesByRepository.keys()].sort((left, right) => left.localeCompare(right));
  const projectedEntries: typeof parsedRoutes = [];
  const maxRepositoryEntries = projectionRepositories.reduce((maximum, repoId) => Math.max(maximum, entriesByRepository.get(repoId)?.length ?? 0), 0);
  for (let round = 0; round < maxRepositoryEntries && projectedEntries.length < MAX_PROJECTED_OPERATIONS; round += 1) {
    for (const repoId of projectionRepositories) {
      if (projectedEntries.length >= MAX_PROJECTED_OPERATIONS) break;
      const entry = entriesByRepository.get(repoId)?.[round];
      if (entry === undefined) continue;
      projectedEntries.push(entry);
    }
  }
  projectedEntries.sort((left, right) => left.file.repoId.localeCompare(right.file.repoId) || left.file.relativePath.localeCompare(right.file.relativePath) || left.route.method.localeCompare(right.route.method) || left.route.routeTemplate.localeCompare(right.route.routeTemplate) || (left.route.handlerSymbol ?? '').localeCompare(right.route.handlerSymbol ?? ''));
  routeOperationsTruncated = parsedRoutes.length - projectedEntries.length;
  const projectedByRepository = new Map<string, number>();
  const duplicateOrdinals = new Map<string, number>();
  // Definition bindings belong to the parsed route, not to the safe operation
  // descriptor. They are carried by object identity so no descriptor field,
  // digest, or operation identity changes shape to transport them.
  const definitionsByOperation = new Map<SourceOperationDescriptor, readonly OpenApiResponseDefinitionBinding[]>();
  for (const entry of projectedEntries) {
    const { file, route } = entry;
    projectedByRepository.set(file.repoId, (projectedByRepository.get(file.repoId) ?? 0) + 1);
    const duplicateKey = `${file.repoId}:${route.method}:${route.routeTemplate}`;
    const duplicate = (parsedKeys.get(duplicateKey) ?? 0) > 1;
    const withDuplicate: ParsedRoute = duplicate ? { ...route, routeProof: 'AMBIGUOUS', routeRejectionReason: 'ROUTE_AMBIGUOUS' } : route;
    const baseOperation = routeOperation({ repoId: file.repoId, sha: file.sourceSha! }, withDuplicate);
    const ordinal = (duplicateOrdinals.get(duplicateKey) ?? 0) + 1;
    duplicateOrdinals.set(duplicateKey, ordinal);
    const operation = duplicate ? { ...baseOperation, operationId: sourceEvidenceDigest({ kind: 'ambiguous-route-operation', baseOperationId: baseOperation.operationId, duplicateOrdinal: ordinal }) } : baseOperation;
    operations.push(operation);
    if (route.responseDefinitions.length > 0) definitionsByOperation.set(operation, route.responseDefinitions);
    if (operation.handlerPath !== null) analyzerInvocations += 1;
  }
  // Enumeration truncation and content-read exhaustion are kept apart all the
  // way through: either makes the true operation total unknowable, but they
  // are different facts about the snapshot and are reported as such.
  const enumerationCompleteness = inventory.completeness.enumeration.state;
  const contentReadCompleteness = inventory.completeness.contentRead.state;
  const remainingUnknown = !isComplete(enumerationCompleteness) || !isComplete(contentReadCompleteness);
  // Own drops are countable (TRUNCATED); an upstream bound is not (UNKNOWN).
  const projectionState: SourceCompletenessState = routeOperationsTruncated > 0 ? 'TRUNCATED' : 'COMPLETE';
  const completenessState: SourceOperationCompletenessState = worstCompleteness(projectionState, remainingUnknown ? 'UNKNOWN' : 'COMPLETE');
  const completenessRepositories: readonly SourceOperationRepositoryCompleteness[] = projectionRepositories.map((repository) => {
    const examinedOperations = entriesByRepository.get(repository)?.length ?? 0;
    const projected = projectedByRepository.get(repository) ?? 0;
    return { repository, examinedOperations, projectedOperations: projected, droppedOperations: examinedOperations - projected };
  });
  const operationCompleteness: SourceOperationProjectionCompleteness = {
    schemaVersion: REAL_SOURCE_OPERATION_COMPLETENESS_VERSION,
    state: completenessState,
    limit: MAX_PROJECTED_OPERATIONS,
    examinedOperations: parsedRoutes.length,
    totalOperations: remainingUnknown ? null : parsedRoutes.length,
    projectedOperations: operations.length,
    droppedOperations: routeOperationsTruncated,
    truncated: routeOperationsTruncated > 0,
    remainingUnknown,
    enumerationCompleteness,
    contentReadCompleteness,
    coverageState: coverageStateForCompleteness(completenessState),
    repositories: completenessRepositories,
  };
  operations.sort((left, right) => left.repository.localeCompare(right.repository) || left.sourcePath.localeCompare(right.sourcePath) || left.method.localeCompare(right.method) || left.routeTemplate.localeCompare(right.routeTemplate) || left.operationId.localeCompare(right.operationId));
  const surfaces: RealSourceSurfaceDescriptor[] = [];
  let responseFlowResolveElapsedMs = 0;
  // Generation currency is a property of the artifact, not of one operation:
  // the corroborator compares the whole artifact's operation count against the
  // proto surface, so the per-artifact total is computed once, up front.
  const artifactOperationCounts = new Map<string, number>();
  for (const operation of operations) {
    const key = `${operation.repository}|${operation.sourcePath}`;
    artifactOperationCounts.set(key, (artifactOperationCounts.get(key) ?? 0) + 1);
  }
  const readOnlyProofs: ReadOnlyProof[] = [];
  for (let operationIndex = 0; operationIndex < operations.length; operationIndex += 1) {
    const operation = operations[operationIndex]!;
    const joins = resolveSurfaceJoins({ access: scopedAccess, inventory, operation });
    const analysis = observationsFor({ access: scopedAccess, inventory, operation, handlerState: joins.handlerState, responseFlowIndex });
    responseFlowResolveElapsedMs += analysis.responseFlowElapsedMs;
    const responseDefinitions = definitionsByOperation.get(operation) ?? [];
    const contract = contractEvidence(operation, analysis, joins, responseDefinitions);
    const responseFlowPaths = analysis.responseFlow?.declarations.map((declaration) => declaration.relativePath) ?? [];
    const references = [operation.handlerPath, operation.requestReference, operation.responseReference].filter((value): value is string => value !== null);
    const relevantFileEvidence = [operation.sourcePath, ...references, ...responseFlowPaths]
      .map((relativePath) => inventory.files.find((file) => file.repoId === operation.repository && file.relativePath === relativePath))
      .filter((file): file is (typeof inventory.files)[number] => file !== undefined)
      .map((file) => ({ path: file.relativePath, status: file.status, contentDigest: file.contentDigest, byteCount: file.byteCount }))
      .sort((left, right) => left.path.localeCompare(right.path));
    const surfaceEvidenceDigest = sourceEvidenceDigest({ kind: 'source-surface-evidence', operationEvidenceDigest: operation.evidenceDigest, files: relevantFileEvidence, joins: joins.joins.map((join) => ({ kind: join.kind, state: join.state, toIdentity: join.toIdentity, evidenceDigest: join.evidenceDigest })), contract: { requestEvidenceDigest: contract.requestEvidenceDigest, responseEvidenceDigest: contract.responseEvidenceDigest, semanticContractIds: contract.semanticContractIds } });
    const flowJoins = analysis.responseFlow?.status === 'PROVEN' ? analysis.responseFlow.edges.map((edge) => ({ kind: 'RESPONSE_FLOW' as const, fromIdentity: edge.fromDeclarationId, toIdentity: edge.toDeclarationId, state: 'PROVEN' as const, evidenceDigest: edge.callsiteId })) : [];
    const provenance = sourceEvidenceProvenance({
      repoId: operation.repository,
      sourceSha: operation.sourceSha,
      relativePath: operation.sourcePath,
      artifactOperationCount: artifactOperationCounts.get(`${operation.repository}|${operation.sourcePath}`) ?? 0,
    });
    // The read-only property is decided HERE, after the join and with the
    // handler, middleware and inventory in hand — never at parse time, and
    // never from an operation catalog.
    const readOnlyProof = surfaceReadOnlyProof(operation, joins.handlerState);
    readOnlyProofs.push(readOnlyProof);
    const provenOperation: SourceOperationDescriptor = { ...operation, readOnlyClassification: readOnlyClassificationFromProof(readOnlyProof) };
    operations[operationIndex] = provenOperation;
    surfaces.push(descriptor(provenOperation, { repoId: operation.repository, sha: operation.sourceSha, evidenceDigest: surfaceEvidenceDigest }, [operation.sourcePath, ...references, ...responseFlowPaths], [...joins.joins, ...flowJoins, ...openApiDefinitionJoins(operation, responseDefinitions)], contract, provenance, readOnlyProof));
  }
  surfaces.sort((left, right) => left.surfaceId.localeCompare(right.surfaceId));
  const gapTaxonomy = buildSourceGapTaxonomy({ inventory, surfaces });
  const responseFlows = surfaces.map((surface) => surface.contract.responseFlow).filter((flow): flow is NonNullable<typeof flow> => flow !== null);
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
    responseFlowAttempts: responseFlows.length,
    responseFlowProven: responseFlows.filter((flow) => flow.status === 'PROVEN').length,
    responseFlowRejected: responseFlows.filter((flow) => flow.status === 'REJECTED').length,
    responseFlowResolvedCalls: responseFlows.reduce((count, flow) => count + flow.edges.length, 0),
    responseFlowDependencyDeclarations: responseFlows.reduce((count, flow) => count + flow.declarations.length, 0),
    responseFlowDependencyEdges: responseFlows.reduce((count, flow) => count + flow.edges.length, 0),
    responseFlowMaxDepth: responseFlows.reduce((maximum, flow) => Math.max(maximum, flow.depth), 0),
    analyzerInvocations,
    responseProofGapCounts: gapCounts(surfaces.map((surface) => sourceProofGapCode(surface.contract.responseProof, surface.contract.responseAnalyzerDiagnostics, 'RESPONSE'))),
    semanticProofGapCounts: gapCounts(surfaces.map((surface) => sourceProofGapCode(surface.contract.semanticProof, surface.contract.responseAnalyzerDiagnostics, 'SEMANTIC'))),
    responseAnalyzerCounts: analyzerCounts(surfaces),
    gapDiagnosticCount: gapTaxonomy.rejectedDiagnosticCount,
    gapTaxonomyRows: gapTaxonomy.dimensions.rejectionCode.length,
    candidatesProduced: surfaces.length,
    generatedArtifactOperations: surfaces.filter((surface) => surface.sourceEvidence.qualifier === 'GENERATED_ARTIFACT').length,
    openApiResponseDefinitionsBound: surfaces.reduce((count, surface) => count + surface.contract.responseDefinitions.filter((binding) => binding.state === 'RESOLVED').length, 0),
    openApiResponseDefinitionsUnresolved: surfaces.reduce((count, surface) => count + surface.contract.responseDefinitions.filter((binding) => binding.state !== 'RESOLVED').length, 0),
    eligibleCandidates: 0,
    excludedCandidates: surfaces.length,
  };
  const phase24Inputs = surfaces.map(toPhase24CandidateInput);
  const performance: SourceSurfacePerformanceMetrics = {
    schemaVersion: REAL_SOURCE_SURFACE_PERFORMANCE_VERSION,
    elapsedMs: Math.max(0, Date.now() - startedAt),
    scanElapsedMs,
    responseFlowIndexElapsedMs,
    responseFlowResolveElapsedMs,
    projectionElapsedMs: Math.max(0, Date.now() - startedAt - scanElapsedMs),
    phpFilesConsidered: responseFlowIndex.metrics.filesConsidered,
    phpFilesTokenized: responseFlowIndex.metrics.filesTokenized,
    declarationsIndexed: responseFlowIndex.metrics.declarationsIndexed,
    maxDeclarationsPerFile: responseFlowIndex.metrics.maxDeclarationsPerFile,
    maxTokens: responseFlowIndex.metrics.maxTokens,
    maxSourceBytes: responseFlowIndex.metrics.maxSourceBytes,
  };
  const core = { inventoryDigest: inventory.snapshotDigest, operations, surfaces, counters, gapTaxonomyDigest: gapTaxonomy.deterministicDigest, operationCompleteness };
  // Timings are advisory operator instrumentation, not deterministic source
  // evidence. Keep the profile available to explicit CLI projections while
  // excluding it from object serialization, caches, and equality contracts.
  const discovery: SourceSurfaceDiscovery = { inventory, operations, surfaces, phase24Inputs, counters, gapTaxonomy, performance, operationCompleteness, deterministicDigest: safeSemanticDigest(core, 'source-surface-discovery') };
  Object.defineProperty(discovery, 'performance', { value: performance, enumerable: false, writable: false, configurable: false });
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
  const eligibilityCensus = buildSourceEligibilityCensus({ discovery, portfolio });
  const core = { discoveryDigest: discovery.deterministicDigest, snapshotAnalyses: snapshotAnalyses.map((analysis) => analysis.deterministicDigest), portfolioDigest: portfolio.deterministicDigest, selectionDigest: selection.deterministicDigest, eligibilityCensusDigest: eligibilityCensus.deterministicDigest, maxCandidates };
  return { discovery, snapshotAnalyses, portfolio, selection, eligibilityCensus, deterministicDigest: safeSemanticDigest(core, 'source-phase24-integration') };
}

export { SOURCE_SURFACE_REASON_CODES };
