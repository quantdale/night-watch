// ---------------------------------------------------------------------------
// Nightwatch C-04 - frontend consumer edge extraction.
//
// Reads `<instance>.<verb>(<arg>)` call sites and classifies the path
// expression behind the argument. The classification IS the campaign: an edge
// is a SOURCE_FACT only when the route is mechanically known, and every other
// shape is named rather than approximated.
//
// Two measurements shaped this module, and a parser written to the historical
// design would have produced nothing:
//
//   * ripple-ui has ZERO `axios.get('/literal')` call sites. Every real call
//     goes through an `axios.create` instance and the path arrives as a
//     function-local variable.
//   * `.get(` alone is not an HTTP call. `Cookies.get(...)` appears 56 times.
//     Only identifiers bound by `axios.create` are treated as clients.
//
// Comment and string handling is delegated to `tokenizeStaticSource`, so a
// call written inside a comment or a string is invisible to every rule here.
//
// Data-in / data-out. No filesystem, process, or network authority, and
// nothing is ever evaluated.
// ---------------------------------------------------------------------------

import { tokenizeStaticSource, type StaticLexicalToken } from './lexical';
import type { SourceCompletenessState } from './completeness';
import type { SourceOperationMethod } from './surfaceTypes';

export const FRONTEND_CONSUMER_VERSION = 'nightwatch.frontend-consumer.v1' as const;

/** How far back a local resolution may look, in tokens. Bounded on purpose:
 * resolution serves the one real shape, it is not a dataflow engine. */
export const FRONTEND_MAX_LOOKBACK_TOKENS = 400;
export const FRONTEND_MAX_EDGES = 4096;
export const FRONTEND_MAX_ROUTE_LENGTH = 512;

export const PATH_EVIDENCE_CLASSES = ['LITERAL', 'STRUCTURAL', 'PARTIAL_SEGMENT', 'DYNAMIC', 'UNRESOLVED'] as const;
export type PathEvidenceClass = (typeof PATH_EVIDENCE_CLASSES)[number];

export const CONSUMER_EVIDENCE_CLASSES = ['SOURCE_FACT', 'INFERENCE', 'UNKNOWN'] as const;
export type ConsumerEvidenceClass = (typeof CONSUMER_EVIDENCE_CLASSES)[number];

export const FRONTEND_INCOMPLETENESS_REASONS = ['FRONTEND_LEXICAL_BUDGET_EXHAUSTED', 'FRONTEND_EDGE_CEILING_REACHED'] as const;
export type FrontendIncompletenessReason = (typeof FRONTEND_INCOMPLETENESS_REASONS)[number];

export interface FrontendConsumerEdge {
  readonly clientIdentifier: string;
  readonly method: SourceOperationMethod | null;
  /** Structural route with query and hash removed. Null unless resolved. */
  readonly routeTemplate: string | null;
  readonly pathClass: PathEvidenceClass;
  readonly evidenceClass: ConsumerEvidenceClass;
  readonly hasQuery: boolean;
  readonly hasHash: boolean;
  readonly ordinal: number;
}

export interface FrontendConsumerFacts {
  readonly schemaVersion: typeof FRONTEND_CONSUMER_VERSION;
  readonly instances: readonly string[];
  readonly edges: readonly FrontendConsumerEdge[];
  readonly completeness: { readonly state: SourceCompletenessState; readonly reason: FrontendIncompletenessReason | null };
}

export interface FrontendConsumerOptions {
  /** Instances declared elsewhere - ripple-ui declares all eight in one file
   * and imports them everywhere else. */
  readonly knownInstances?: readonly string[];
}

const VERBS: Readonly<Record<string, SourceOperationMethod>> = Object.freeze({
  get: 'GET', post: 'POST', put: 'PUT', patch: 'PATCH', delete: 'DELETE',
});

/** Route safety, matching the rule the backend route path already enforces so
 * a template that survives here is not silently dropped one layer later. */
const SAFE_ROUTE_RE = /^\/?[A-Za-z0-9._~{}:&-]{0,239}(?:\/[A-Za-z0-9._~{}:&-]{0,239})*$/;
const SAFE_IDENTIFIER_RE = /^[A-Za-z_$][A-Za-z0-9_$]{0,127}$/;

interface ClassifiedPath {
  readonly routeTemplate: string | null;
  readonly pathClass: PathEvidenceClass;
  readonly hasQuery: boolean;
  readonly hasHash: boolean;
}

const UNRESOLVED: ClassifiedPath = { routeTemplate: null, pathClass: 'UNRESOLVED', hasQuery: false, hasHash: false };
const DYNAMIC: ClassifiedPath = { routeTemplate: null, pathClass: 'DYNAMIC', hasQuery: false, hasHash: false };
const INTERPOLATION_OPEN = '$' + '{';

function normalizeRoute(value: string): string {
  const collapsed = value.replace(/\/{2,}/g, '/');
  return collapsed.length > 1 && collapsed.endsWith('/') ? collapsed.slice(0, -1) : collapsed;
}

function literalOrDynamic(pathPart: string, hasQuery: boolean, hasHash: boolean): ClassifiedPath {
  const route = normalizeRoute(pathPart);
  if (route.includes('..') || !SAFE_ROUTE_RE.test(route)) return { routeTemplate: null, pathClass: 'DYNAMIC', hasQuery, hasHash };
  return { routeTemplate: route, pathClass: 'LITERAL', hasQuery, hasHash };
}

/**
 * Classify a raw path expression.
 *
 * Query and hash are removed BEFORE anything else, so a runtime value in a
 * query never reaches the classifier and can never be persisted. Their
 * presence is recorded; their content is not.
 */
export function classifyPathExpression(raw: string, isTemplate: boolean): ClassifiedPath {
  if (raw.length === 0 || raw.length > FRONTEND_MAX_ROUTE_LENGTH) return UNRESOLVED;

  const hashIndex = raw.indexOf('#');
  const withoutHash = hashIndex === -1 ? raw : raw.slice(0, hashIndex);
  const queryIndex = withoutHash.indexOf('?');
  const pathPart = queryIndex === -1 ? withoutHash : withoutHash.slice(0, queryIndex);
  const hasQuery = queryIndex !== -1;
  const hasHash = hashIndex !== -1;

  if (!isTemplate) {
    if (pathPart.includes(INTERPOLATION_OPEN)) return DYNAMIC;
    return literalOrDynamic(pathPart, hasQuery, hasHash);
  }

  // Template. Replace each interpolation with a sentinel, then ask whether each
  // one occupied a WHOLE segment. A sentinel sharing a segment with literal
  // text means the segment boundary itself depends on a runtime value, which is
  // not a structure this campaign will call a fact.
  const SENTINEL = ' ';
  let replaced = '';
  let cursor = 0;
  let interpolations = 0;
  while (cursor < pathPart.length) {
    const open = pathPart.indexOf(INTERPOLATION_OPEN, cursor);
    if (open === -1) { replaced += pathPart.slice(cursor); break; }
    let depth = 1;
    let scan = open + 2;
    while (scan < pathPart.length && depth > 0) {
      if (pathPart[scan] === '{') depth += 1;
      else if (pathPart[scan] === '}') depth -= 1;
      scan += 1;
    }
    if (depth !== 0) return DYNAMIC;
    replaced += pathPart.slice(cursor, open) + SENTINEL;
    interpolations += 1;
    cursor = scan;
  }

  if (interpolations === 0) return literalOrDynamic(replaced, hasQuery, hasHash);

  const segments = replaced.split('/');
  if (segments.some((segment) => segment.includes(SENTINEL) && segment !== SENTINEL)) {
    return { routeTemplate: null, pathClass: 'PARTIAL_SEGMENT', hasQuery, hasHash };
  }
  const structural = normalizeRoute(segments.map((segment) => (segment === SENTINEL ? '{}' : segment)).join('/'));
  if (structural.includes('..') || !SAFE_ROUTE_RE.test(structural)) {
    return { routeTemplate: null, pathClass: 'PARTIAL_SEGMENT', hasQuery, hasHash };
  }
  return { routeTemplate: structural, pathClass: 'STRUCTURAL', hasQuery, hasHash };
}

function evidenceFor(pathClass: PathEvidenceClass): ConsumerEvidenceClass {
  if (pathClass === 'LITERAL' || pathClass === 'STRUCTURAL') return 'SOURCE_FACT';
  if (pathClass === 'PARTIAL_SEGMENT') return 'INFERENCE';
  return 'UNKNOWN';
}

/** Identifiers bound by `axios.create(`. Nothing else is an HTTP client. */
function declaredInstances(tokens: readonly StaticLexicalToken[]): readonly string[] {
  const found = new Set<string>();
  for (let index = 0; index + 4 < tokens.length; index += 1) {
    if (tokens[index]?.kind !== 'IDENTIFIER') continue;
    const name = tokens[index]?.value as string;
    if (!SAFE_IDENTIFIER_RE.test(name)) continue;
    if (tokens[index + 1]?.kind !== 'PUNCT' || tokens[index + 1]?.value !== '=') continue;
    if (tokens[index + 2]?.value !== 'axios') continue;
    if (tokens[index + 3]?.kind !== 'PUNCT' || tokens[index + 3]?.value !== '.') continue;
    if (tokens[index + 4]?.value !== 'create') continue;
    found.add(name);
  }
  return [...found].sort();
}

/**
 * Resolve an identifier argument to its assigned path expression.
 *
 * Bounded backwards scan, stopping at the enclosing `function` keyword so a
 * value assigned in a DIFFERENT function is never picked up - that case is
 * UNKNOWN by specification, and the boundary is what keeps it there. Any
 * assignment of a non-literal disqualifies the identifier entirely.
 */
function resolveIdentifier(tokens: readonly StaticLexicalToken[], callIndex: number, name: string): ClassifiedPath {
  let assignedDynamically = false;
  let resolved: ClassifiedPath | null = null;
  const limit = Math.max(0, callIndex - FRONTEND_MAX_LOOKBACK_TOKENS);
  for (let index = callIndex - 1; index >= limit; index -= 1) {
    const token = tokens[index];
    if (token === undefined) break;
    if (token.kind === 'IDENTIFIER' && token.value === 'function') break;
    if (token.kind !== 'IDENTIFIER' || token.value !== name) continue;
    const assign = tokens[index + 1];
    if (assign?.kind !== 'PUNCT' || assign.value !== '=') continue;
    const value = tokens[index + 2];
    if (value === undefined) continue;
    if (value.kind === 'STRING') {
      const after = tokens[index + 3];
      if (after?.kind === 'PUNCT' && after.value === '+') { assignedDynamically = true; continue; }
      if (resolved === null) resolved = classifyPathExpression(value.value, value.quote === '`');
      continue;
    }
    assignedDynamically = true;
  }
  if (assignedDynamically) return DYNAMIC;
  return resolved ?? UNRESOLVED;
}

/** Read the consumer edges of one JavaScript source text. */
export function readFrontendConsumers(sourceText: string, options: FrontendConsumerOptions = {}): FrontendConsumerFacts {
  const tokens = tokenizeStaticSource(sourceText, 'JAVASCRIPT', { preserveTemplates: true });
  if (tokens === null) {
    return {
      schemaVersion: FRONTEND_CONSUMER_VERSION,
      instances: [],
      edges: [],
      completeness: { state: 'UNKNOWN', reason: 'FRONTEND_LEXICAL_BUDGET_EXHAUSTED' },
    };
  }

  const localInstances = declaredInstances(tokens);
  const clients = new Set<string>([...localInstances, ...(options.knownInstances ?? [])]);
  const edges: FrontendConsumerEdge[] = [];
  let ceilingReached = false;

  for (let index = 0; index + 3 < tokens.length; index += 1) {
    const client = tokens[index];
    if (client?.kind !== 'IDENTIFIER' || !clients.has(client.value)) continue;
    if (tokens[index + 1]?.kind !== 'PUNCT' || tokens[index + 1]?.value !== '.') continue;
    const verbToken = tokens[index + 2];
    if (verbToken?.kind !== 'IDENTIFIER') continue;
    const method = VERBS[verbToken.value];
    if (method === undefined) continue;
    if (tokens[index + 3]?.kind !== 'PUNCT' || tokens[index + 3]?.value !== '(') continue;

    if (edges.length >= FRONTEND_MAX_EDGES) { ceilingReached = true; break; }

    const argument = tokens[index + 4];
    let classified: ClassifiedPath;
    if (argument === undefined) classified = UNRESOLVED;
    else if (argument.kind === 'STRING') classified = classifyPathExpression(argument.value, argument.quote === '`');
    else if (argument.kind === 'IDENTIFIER' && SAFE_IDENTIFIER_RE.test(argument.value)) {
      const following = tokens[index + 5];
      // `get(build())`, `get(a + b)` and `get(a.b)` are expressions, not names.
      classified = following?.kind === 'PUNCT' && (following.value === '(' || following.value === '+' || following.value === '.')
        ? DYNAMIC
        : resolveIdentifier(tokens, index, argument.value);
    } else classified = DYNAMIC;

    edges.push({
      clientIdentifier: client.value,
      method,
      routeTemplate: classified.routeTemplate,
      pathClass: classified.pathClass,
      evidenceClass: evidenceFor(classified.pathClass),
      hasQuery: classified.hasQuery,
      hasHash: classified.hasHash,
      ordinal: edges.length,
    });
    index += 3;
  }

  return {
    schemaVersion: FRONTEND_CONSUMER_VERSION,
    instances: localInstances,
    edges,
    completeness: ceilingReached
      ? { state: 'TRUNCATED', reason: 'FRONTEND_EDGE_CEILING_REACHED' }
      : { state: 'COMPLETE', reason: null },
  };
}
