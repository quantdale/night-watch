// ---------------------------------------------------------------------------
// Nightwatch C-04 - frontend consumer graph and backend join.
//
// Two passes over the approved frontend source, then a categorical join to the
// backend route facts C-02a, C-02b and C-03 already produce.
//
// The join never upgrades. An edge's evidence class is the WEAKER of the
// consumer path class and the backend fact it lands on, so a structural
// frontend path joined to a generated-artifact route does not become a
// stronger claim than either input supports. There is no path in this module
// that raises an evidence class.
//
// Data-in / data-out over an already-scanned inventory. No filesystem
// authority of its own; the sibling-source boundary performs every read.
// ---------------------------------------------------------------------------

import { prefixedDigest24 } from '../identity/canonicalDigest';
import type { SourceCompletenessState } from './completeness';
import { readFrontendConsumers, type ConsumerEvidenceClass, type FrontendConsumerEdge } from './frontendConsumer';
import type { RealSourceSnapshotInventory } from './scanTypes';
import type { SiblingSourceAccess } from './siblingSource';
import type { SourceOperationMethod } from './surfaceTypes';
import { extractVueScripts } from './vueSfc';

export const FRONTEND_GRAPH_VERSION = 'nightwatch.frontend-consumer-graph.v1' as const;

export const FRONTEND_JOIN_STATES = ['PROVEN', 'AMBIGUOUS', 'MISSING', 'DYNAMIC', 'METHOD_MISMATCH', 'STALE'] as const;
export type FrontendJoinState = (typeof FRONTEND_JOIN_STATES)[number];

/** One backend route as this module needs to see it. */
export interface BackendRouteFact {
  readonly repoId: string;
  readonly sourceSha: string;
  readonly method: SourceOperationMethod;
  readonly routeTemplate: string;
  readonly operationId: string;
  /** The backend fact's own evidence strength. */
  readonly evidenceClass: ConsumerEvidenceClass;
}

export interface JoinedConsumerEdge {
  readonly repoId: string;
  readonly sourceSha: string;
  readonly relativePath: string;
  readonly clientIdentifier: string;
  readonly method: SourceOperationMethod | null;
  readonly routeTemplate: string | null;
  readonly pathClass: FrontendConsumerEdge['pathClass'];
  readonly consumerEvidenceClass: ConsumerEvidenceClass;
  readonly joinState: FrontendJoinState;
  readonly backendOperationId: string | null;
  readonly backendRepoId: string | null;
  /** The weaker of the consumer class and the backend class. Never stronger
   * than either. */
  readonly joinedEvidenceClass: ConsumerEvidenceClass;
  readonly evidenceDigest: string;
}

export interface FrontendConsumerGraph {
  readonly schemaVersion: typeof FRONTEND_GRAPH_VERSION;
  readonly instances: readonly string[];
  readonly edges: readonly JoinedConsumerEdge[];
  readonly completeness: {
    readonly enumerationState: SourceCompletenessState;
    readonly repositoryCompleteProof: boolean;
    readonly filesRead: number;
    readonly filesUnreadable: number;
  };
  readonly counters: {
    readonly total: number;
    readonly sourceFact: number;
    readonly inference: number;
    readonly unknown: number;
    readonly proven: number;
    readonly ambiguous: number;
    readonly missing: number;
    readonly dynamic: number;
    readonly methodMismatch: number;
    readonly nonLiteralSourceFacts: number;
  };
  readonly graphDigest: string;
}

const EVIDENCE_RANK: Readonly<Record<ConsumerEvidenceClass, number>> = { SOURCE_FACT: 3, INFERENCE: 2, UNKNOWN: 1 };

function weaker(left: ConsumerEvidenceClass, right: ConsumerEvidenceClass): ConsumerEvidenceClass {
  return EVIDENCE_RANK[left] <= EVIDENCE_RANK[right] ? left : right;
}

/** Canonical route identity: every placeholder collapses to `{}` and a leading
 * slash is optional, because ripple-ui writes both `admin/v1/x` and
 * `/admin/v1/x` for the same route. */
export function canonicalConsumerRoute(routeTemplate: string): string {
  const collapsed = routeTemplate.replace(/\{[^{}]*\}/g, '{}');
  return collapsed.startsWith('/') ? collapsed : `/${collapsed}`;
}

function scriptTextFor(language: string | null, sourceText: string): string | null {
  if (language === 'VUE') {
    const extraction = extractVueScripts(sourceText);
    if (extraction.blocks.length === 0) return null;
    return extraction.blocks.map((block) => block.content).join('\n');
  }
  if (language === 'JAVASCRIPT' || language === 'TYPESCRIPT') return sourceText;
  return null;
}

/**
 * Build the consumer graph for one frontend repository.
 *
 * Pass one finds the `axios.create` instances anywhere in the repository,
 * because ripple-ui declares all eight in `src/axios.config.js` and imports
 * them everywhere else. Pass two reads the call sites with that set in hand.
 */
export function buildFrontendConsumerGraph(input: {
  readonly access: SiblingSourceAccess;
  readonly inventory: RealSourceSnapshotInventory;
  readonly frontendRepoId: string;
  readonly backendRoutes: readonly BackendRouteFact[];
}): FrontendConsumerGraph {
  const files = input.inventory.files
    .filter((file) => file.status === 'ELIGIBLE' && file.repoId === input.frontendRepoId && file.sourceSha !== null)
    .slice()
    .sort((left, right) => left.relativePath.localeCompare(right.relativePath));

  const texts = new Map<string, string>();
  let filesUnreadable = 0;
  for (const file of files) {
    const raw = input.access.reader.readFile(file.repoId, file.relativePath);
    if (raw === null) { filesUnreadable += 1; continue; }
    const script = scriptTextFor(file.language, raw);
    if (script !== null) texts.set(file.relativePath, script);
  }

  const instances = new Set<string>();
  for (const text of texts.values()) for (const name of readFrontendConsumers(text, {}).instances) instances.add(name);
  const knownInstances = [...instances].sort();

  const backendByKey = new Map<string, BackendRouteFact[]>();
  for (const route of input.backendRoutes) {
    const key = `${route.method}|${canonicalConsumerRoute(route.routeTemplate)}`;
    backendByKey.set(key, [...(backendByKey.get(key) ?? []), route]);
  }
  const backendRoutesOnly = new Set(input.backendRoutes.map((route) => canonicalConsumerRoute(route.routeTemplate)));

  const edges: JoinedConsumerEdge[] = [];
  for (const file of files) {
    const text = texts.get(file.relativePath);
    if (text === undefined) continue;
    const facts = readFrontendConsumers(text, { knownInstances });
    for (const edge of facts.edges) {
      const base = {
        repoId: file.repoId,
        sourceSha: file.sourceSha as string,
        relativePath: file.relativePath,
        clientIdentifier: edge.clientIdentifier,
        method: edge.method,
        routeTemplate: edge.routeTemplate,
        pathClass: edge.pathClass,
        consumerEvidenceClass: edge.evidenceClass,
      };

      // An unresolved path cannot be joined at all. That is DYNAMIC, and it is
      // not a statement about the backend.
      if (edge.routeTemplate === null || edge.method === null) {
        const draft = { ...base, joinState: 'DYNAMIC' as const, backendOperationId: null, backendRepoId: null, joinedEvidenceClass: 'UNKNOWN' as const };
        edges.push({ ...draft, evidenceDigest: prefixedDigest24('frontendedge', draft) });
        continue;
      }

      const canonical = canonicalConsumerRoute(edge.routeTemplate);
      const matches = backendByKey.get(`${edge.method}|${canonical}`) ?? [];
      let joinState: FrontendJoinState;
      let backend: BackendRouteFact | null = null;
      if (matches.length === 1) { joinState = 'PROVEN'; backend = matches[0] as BackendRouteFact; }
      else if (matches.length > 1) joinState = 'AMBIGUOUS';
      else if (backendRoutesOnly.has(canonical)) joinState = 'METHOD_MISMATCH';
      else joinState = 'MISSING';

      // The join never raises evidence. An unjoined or ambiguous edge keeps
      // its consumer class rather than gaining one, and a joined edge takes
      // the weaker of the two.
      const joinedEvidenceClass = backend === null
        ? edge.evidenceClass
        : weaker(edge.evidenceClass, backend.evidenceClass);

      const draft = {
        ...base,
        joinState,
        backendOperationId: backend?.operationId ?? null,
        backendRepoId: backend?.repoId ?? null,
        joinedEvidenceClass,
      };
      edges.push({ ...draft, evidenceDigest: prefixedDigest24('frontendedge', draft) });
    }
  }

  const repositoryCompleteness = input.inventory.completeness.repositories.find((entry) => entry.repoId === input.frontendRepoId);
  const enumerationState = repositoryCompleteness?.enumeration.state ?? 'UNKNOWN';

  const nonLiteralSourceFacts = edges.filter((edge) =>
    edge.consumerEvidenceClass === 'SOURCE_FACT' && edge.pathClass !== 'LITERAL' && edge.pathClass !== 'STRUCTURAL').length;

  return {
    schemaVersion: FRONTEND_GRAPH_VERSION,
    instances: knownInstances,
    edges,
    completeness: {
      enumerationState,
      repositoryCompleteProof: enumerationState === 'COMPLETE',
      filesRead: texts.size,
      filesUnreadable,
    },
    counters: {
      total: edges.length,
      sourceFact: edges.filter((edge) => edge.consumerEvidenceClass === 'SOURCE_FACT').length,
      inference: edges.filter((edge) => edge.consumerEvidenceClass === 'INFERENCE').length,
      unknown: edges.filter((edge) => edge.consumerEvidenceClass === 'UNKNOWN').length,
      proven: edges.filter((edge) => edge.joinState === 'PROVEN').length,
      ambiguous: edges.filter((edge) => edge.joinState === 'AMBIGUOUS').length,
      missing: edges.filter((edge) => edge.joinState === 'MISSING').length,
      dynamic: edges.filter((edge) => edge.joinState === 'DYNAMIC').length,
      methodMismatch: edges.filter((edge) => edge.joinState === 'METHOD_MISMATCH').length,
      nonLiteralSourceFacts,
    },
    graphDigest: prefixedDigest24('frontendgraph', { edges: edges.map((edge) => edge.evidenceDigest) }),
  };
}
