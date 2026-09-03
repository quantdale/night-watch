// C-08 — deployment-fact binding.
//
// Before C-08 every operation descriptor carried `deploymentStatusUnresolved:
// true` — a field typed as the literal `true`, so it could never say anything
// else. It looked like an answer and conveyed nothing: an operation whose
// deployment was investigated and found unknowable was indistinguishable from
// one nobody had looked at. An unrecorded unknown is the shape a guess hides
// in, and the campaigns after this one want to make requests.
//
// This module gives every operation an explicit binding. The important design
// choice is that a binding is a three-hop CHAIN rather than one flat verdict:
//
//     route ──▶ host ──▶ kubernetes service ──▶ deployed?
//              (1)     (2)                  (3)
//
// because the only information available today is WHICH hop is missing. Hop 1
// is establishable from committed source; hops 2 and 3 need `mochi`'s
// `services/{env}/{appproxy,serviceproxy}/ingress.yaml`, which is not
// available through any existing authorized access. A flat `UNKNOWN` cannot
// distinguish "nobody looked" from "hop 1 is established and hops 2-3 are
// blocked on organizational access", and the second statement is the useful one.
//
// This is data-only policy: no filesystem, process or network authority. The
// extractors take already-read text. And it grants NO request authority —
// knowing where something runs is not permission to call it.

import { FACT_CATEGORIES, type FactCategory } from '../systemMap/model';

export const DEPLOYMENT_BINDING_VERSION = 'nightwatch.deployment-binding.v1' as const;
/** Bumped whenever extraction semantics change, so old evidence is detectable. */
export const DEPLOYMENT_EXTRACTOR_VERSION = 'c08.deployment-extractor.v1' as const;

/** The hops of the route → runtime-endpoint chain, in order. */
export const DEPLOYMENT_CHAIN_HOPS = ['ROUTE_TO_HOST', 'HOST_TO_SERVICE', 'SERVICE_TO_DEPLOYMENT'] as const;
export type DeploymentChainHop = (typeof DEPLOYMENT_CHAIN_HOPS)[number];

/**
 * `AMBIGUOUS` and `UNKNOWN` are deliberately distinct: one means the evidence
 * disagrees with itself, the other that there is none. Collapsing them would
 * hide a contradiction inside an absence.
 */
export const DEPLOYMENT_BINDING_STATES = ['EXACT', 'PARTIAL', 'UNKNOWN', 'UNSUPPORTED', 'STALE', 'AMBIGUOUS'] as const;
export type DeploymentBindingState = (typeof DEPLOYMENT_BINDING_STATES)[number];

/** Why a hop is not established. Every value is a fact about our evidence. */
export const DEPLOYMENT_UNKNOWN_REASONS = [
  /** `mochi`'s ingress manifests are not reachable through existing access. */
  'C08B_BLOCKED_BY_ORGANIZATIONAL_ACCESS',
  /** The operation's shape cannot carry a route → endpoint chain at all. */
  'OPERATION_NOT_ROUTE_SHAPED',
  /** No host-matrix entry covers this route prefix. */
  'NO_HOST_MATRIX_ENTRY',
  /**
   * The host matrix is extracted and available, but nothing mechanically ties
   * THIS operation to one of its client families.
   *
   * The matrix is keyed `apiUrl.<brand>.<family>.<env>`, with families like
   * `basic`, `blue`, `login` and `auth`. C-04 proved which frontend call site
   * reaches which backend operation, but NOT which axios client instance that
   * call site uses, and therefore not which family's base URL applies.
   * Closing that gap would need the client construction in
   * `axios.config.js` resolved; matching `baseApi` to `basic` by name would be
   * `SERVICE_NAME_SIMILARITY`. So the hop stays unknown and the missing
   * extraction is named.
   */
  'NO_PROVEN_CLIENT_FAMILY_BINDING',
  /** No C-03-proven service identity for this operation. */
  'NO_PROVEN_SERVICE_IDENTITY',
  /** Evidence existed and its artifact has since changed. */
  'EVIDENCE_ARTIFACT_CHANGED',
  /** More than one host-matrix entry claims the route. */
  'MULTIPLE_HOST_MATRIX_ENTRIES',
] as const;
export type DeploymentUnknownReason = (typeof DEPLOYMENT_UNKNOWN_REASONS)[number];

/**
 * The bases that may NEVER produce a `DEPLOYMENT_FACT`. Named as data so the
 * prohibition is reviewable and testable rather than a comment.
 *
 * `CLIENT_CONFIGURATION` is the one that actually arises here, and the one a
 * well-meaning implementation gets wrong. `ripple-ui/src/config/common.js`
 * looks authoritative — committed, current, naming real hosts per environment
 * — but it states what the FRONTEND CALLS. What the infrastructure SERVES is a
 * different proposition, and the gap between them is exactly where a stale or
 * rerouted deployment hides.
 */
export const FORBIDDEN_DEPLOYMENT_FACT_BASES = Object.freeze([
  'SERVICE_NAME_SIMILARITY',
  'ROUTE_PREFIX_SIMILARITY',
  'GUESSED_HOSTNAME',
  'HISTORICAL_FAMILIARITY',
  'DOCUMENT_DESCRIBING_EXPECTED_ARCHITECTURE',
  'CLIENT_CONFIGURATION',
]);

/** Identity of one piece of evidence. Complete enough to detect staleness. */
export interface DeploymentEvidence {
  readonly repoId: string;
  readonly sourceSha: string;
  readonly path: string;
  readonly extractorVersion: typeof DEPLOYMENT_EXTRACTOR_VERSION;
  /** Digest over the NORMALIZED extracted structure, not the raw bytes, so
   *  reformatting does not invalidate a binding while a semantic change does. */
  readonly digest: string;
  readonly factCategory: FactCategory;
  /** Which hop this evidence speaks to. */
  readonly hop: DeploymentChainHop;
}

export interface DeploymentChainLink {
  readonly hop: DeploymentChainHop;
  readonly established: boolean;
  readonly factCategory: FactCategory | null;
  readonly value: string | null;
  readonly unknownReason: DeploymentUnknownReason | null;
}

export interface DeploymentBinding {
  readonly schemaVersion: typeof DEPLOYMENT_BINDING_VERSION;
  readonly operationId: string;
  readonly repository: string;
  readonly state: DeploymentBindingState;
  /** The weakest category across established links, or null when none is. */
  readonly factCategory: FactCategory | null;
  readonly chain: readonly DeploymentChainLink[];
  readonly evidence: readonly DeploymentEvidence[];
  /** Negative deployment facts: environments this service is NOT built for. */
  readonly excludedEnvironments: readonly string[];
  readonly unknownReason: DeploymentUnknownReason | null;
}

const CATEGORY_STRENGTH: Readonly<Record<FactCategory, number>> = Object.freeze({
  SOURCE_FACT: 5, DEPLOYMENT_FACT: 4, RUNTIME_FACT: 3, OBSERVATION: 2, INFERENCE: 1,
});

/**
 * A join is never stronger than its weakest input. Returns null when no input
 * is established, because "no category" and "the weakest category" are
 * different claims.
 */
export function weakestCategory(categories: readonly (FactCategory | null)[]): FactCategory | null {
  const present = categories.filter((category): category is FactCategory => category !== null);
  if (present.length === 0) return null;
  return present.reduce((weakest, candidate) => (CATEGORY_STRENGTH[candidate] < CATEGORY_STRENGTH[weakest] ? candidate : weakest));
}

/** Derive the chain state from its links. */
export function chainState(links: readonly DeploymentChainLink[]): DeploymentBindingState {
  if (links.length === 0) return 'UNSUPPORTED';
  const established = links.filter((link) => link.established);
  if (links.some((link) => link.unknownReason === 'MULTIPLE_HOST_MATRIX_ENTRIES')) return 'AMBIGUOUS';
  if (links.some((link) => link.unknownReason === 'EVIDENCE_ARTIFACT_CHANGED')) return 'STALE';
  if (links.some((link) => link.unknownReason === 'OPERATION_NOT_ROUTE_SHAPED')) return 'UNSUPPORTED';
  if (established.length === links.length) return 'EXACT';
  // PARTIAL is a real state, not a hedge: it is the expected steady state
  // while hops 2 and 3 are blocked, and it is strictly more informative than
  // UNKNOWN because an established hop 1 is real knowledge.
  if (established.length > 0) return 'PARTIAL';
  return 'UNKNOWN';
}

/** A host-matrix entry: route prefix → host, per environment. SOURCE_FACT. */
export interface HostMatrixEntry {
  readonly routePrefix: string;
  readonly environment: string;
  readonly host: string;
}

/** A build exclusion: this service is not built on this branch/environment. */
export interface BuildExclusion {
  readonly servicePattern: string;
  readonly isRegex: boolean;
  readonly negated: boolean;
  readonly branches: readonly string[];
}

export interface DeploymentEvidenceInput {
  readonly hostMatrix: readonly HostMatrixEntry[];
  readonly hostMatrixEvidence: DeploymentEvidence | null;
  readonly buildExclusions: readonly BuildExclusion[];
  readonly buildExclusionEvidence: DeploymentEvidence | null;
  /**
   * Operations reached by a PROVEN C-04 frontend consumer edge, mapped to the
   * call site's resolved route prefix.
   *
   * This is what ties an operation to a host WITHOUT guessing. A route
   * template like `/user` is relative to an API base, and the host matrix
   * keys are absolute URL paths, so matching them directly would bind `/user`
   * to the UI host. Deciding instead that `ripple-api` must serve `/m/ripple`
   * because the names look alike is exactly `SERVICE_NAME_SIMILARITY`, which
   * this campaign forbids. C-04 already PROVED which frontend call site
   * reaches which backend operation, so that proof is consumed here rather
   * than re-derived or approximated.
   */
  readonly provenConsumerPrefixes: ReadonlyMap<string, string>;
  /**
   * Operation id → the SERVICE that serves it, as PROVEN by C-03's
   * proto-service-to-registration binding.
   *
   * This is consumed rather than re-derived, and it is what makes the negative
   * deployment fact per-operation. An earlier draft of this module used
   * `repository.split('/').pop()` as the service name, which is
   * `SERVICE_NAME_SIMILARITY` — the very basis this campaign forbids — and it
   * would have attributed every ouchan operation to a service called "ouchan".
   */
  readonly provenServiceByOperation: ReadonlyMap<string, string>;
  /** Present only when the ingress manifests become readable. Absent today. */
  readonly ingressManifests?: readonly { readonly host: string; readonly service: string; readonly environment: string }[];
}

export interface OperationForBinding {
  readonly operationId: string;
  readonly repository: string;
  readonly routeTemplate: string;
  readonly transport: string;
}

/**
 * The service directory an operation is DEFINED IN, from its own source path.
 *
 * This is a SOURCE_FACT about file location, not a naming inference: an
 * operation whose source path is `services/reportd/handler.go` is defined in
 * the `reportd` daemon directory, and `build/config.yaml` keys its exclusions
 * on exactly those directory names. All 341 `ouchan` operations are under
 * `services/<dir>/`, so the derivation is total for that repository.
 *
 * It is deliberately NOT the same claim as C-03's `protoServiceIdentity`.
 * C-03 records that the daemon directory "is never a join key" because
 * `services/blued` registers six proto services — so this establishes which
 * BUILD UNIT an operation belongs to, which is what the exclusion evidence is
 * keyed on, and says nothing about which proto service serves it.
 */
export function serviceDirectoryFromSourcePath(sourcePath: string): string | null {
  const match = /^services\/([A-Za-z0-9._-]{1,64})\//.exec(sourcePath);
  const segment = match === null ? null : match[1] ?? null;
  // `.` and `..` match the character class, so `services/../etc/passwd` would
  // otherwise yield `..` as a build unit. A traversal segment is not a
  // directory name, and a build unit that is not a real directory could be
  // matched against an exclusion pattern and produce a fabricated deployment
  // fact. Caught by this campaign's own test.
  if (segment === null || segment === '.' || segment === '..') return null;
  return segment;
}

/** Which environments a service is provably NOT built for. */
export function excludedEnvironmentsFor(service: string, exclusions: readonly BuildExclusion[]): readonly string[] {
  const environments = new Set<string>();
  for (const exclusion of exclusions) {
    let matches: boolean;
    if (exclusion.isRegex) {
      try {
        matches = new RegExp(exclusion.servicePattern).test(service);
      } catch {
        // An unusable pattern proves nothing. It must not be read as a match
        // (which would claim a deployment fact) nor as a non-match (which
        // would silently drop the exclusion), so it is skipped and the
        // environment simply stays unproven.
        continue;
      }
      if (exclusion.negated) matches = !matches;
    } else {
      matches = exclusion.servicePattern === service;
    }
    if (matches) for (const branch of exclusion.branches) environments.add(branch);
  }
  return Object.freeze([...environments].sort());
}

/** Longest-prefix host-matrix lookup, refusing ties as AMBIGUOUS. */
function hostFor(routeTemplate: string, matrix: readonly HostMatrixEntry[], environment: string):
  { host: string | null; ambiguous: boolean } {
  const candidates = matrix.filter((entry) => entry.environment === environment && routeTemplate.startsWith(entry.routePrefix));
  if (candidates.length === 0) return { host: null, ambiguous: false };
  const longest = Math.max(...candidates.map((entry) => entry.routePrefix.length));
  const best = candidates.filter((entry) => entry.routePrefix.length === longest);
  const hosts = new Set(best.map((entry) => entry.host));
  // Two entries with the SAME prefix and DIFFERENT hosts is a contradiction in
  // the evidence, not an absence of it.
  if (hosts.size > 1) return { host: null, ambiguous: true };
  return { host: best[0]!.host, ambiguous: false };
}

/**
 * Bind ONE operation. Every return path produces a binding; there is no path
 * that yields undefined, which is what makes the totality guarantee
 * structural rather than a convention each caller must remember.
 */
export function bindOperation(
  operation: OperationForBinding,
  evidence: DeploymentEvidenceInput,
  environment = 'prod',
): DeploymentBinding {
  const used: DeploymentEvidence[] = [];

  // --- hop 1: route → host ---
  //
  // Two things must both hold, and neither may be substituted for the other:
  // a PROVEN C-04 consumer edge must tie this operation to a call site (which
  // is what supplies its absolute route prefix), and the host matrix must
  // cover that prefix. Without the C-04 proof the operation's own route
  // template is relative to an unknown API base, and closing that gap by
  // repository name would be `SERVICE_NAME_SIMILARITY`.
  const routeShaped = operation.transport === 'HTTP_API' && operation.routeTemplate.startsWith('/');
  let hop1: DeploymentChainLink;
  const provenPrefix = evidence.provenConsumerPrefixes.get(operation.operationId);
  if (!routeShaped) {
    hop1 = { hop: 'ROUTE_TO_HOST', established: false, factCategory: null, value: null, unknownReason: 'OPERATION_NOT_ROUTE_SHAPED' };
  } else if (provenPrefix === undefined) {
    hop1 = { hop: 'ROUTE_TO_HOST', established: false, factCategory: null, value: null, unknownReason: 'NO_PROVEN_CLIENT_FAMILY_BINDING' };
  } else {
    const { host, ambiguous } = hostFor(provenPrefix, evidence.hostMatrix, environment);
    if (ambiguous) {
      hop1 = { hop: 'ROUTE_TO_HOST', established: false, factCategory: null, value: null, unknownReason: 'MULTIPLE_HOST_MATRIX_ENTRIES' };
    } else if (host === null) {
      hop1 = { hop: 'ROUTE_TO_HOST', established: false, factCategory: null, value: null, unknownReason: 'NO_HOST_MATRIX_ENTRY' };
    } else {
      // SOURCE_FACT, never DEPLOYMENT_FACT. The host matrix says what the
      // frontend CALLS; what the infrastructure SERVES is hop 2.
      hop1 = { hop: 'ROUTE_TO_HOST', established: true, factCategory: 'SOURCE_FACT', value: host, unknownReason: null };
      if (evidence.hostMatrixEvidence !== null) used.push(evidence.hostMatrixEvidence);
    }
  }

  // --- hop 2: host → kubernetes service. U-1. ---
  const manifests = evidence.ingressManifests ?? [];
  let hop2: DeploymentChainLink;
  if (manifests.length === 0) {
    hop2 = { hop: 'HOST_TO_SERVICE', established: false, factCategory: null, value: null, unknownReason: 'C08B_BLOCKED_BY_ORGANIZATIONAL_ACCESS' };
  } else {
    const matched = manifests.filter((entry) => entry.environment === environment && entry.host === hop1.value);
    hop2 = matched.length === 1
      ? { hop: 'HOST_TO_SERVICE', established: true, factCategory: 'DEPLOYMENT_FACT', value: matched[0]!.service, unknownReason: null }
      : { hop: 'HOST_TO_SERVICE', established: false, factCategory: null, value: null, unknownReason: matched.length > 1 ? 'MULTIPLE_HOST_MATRIX_ENTRIES' : 'C08B_BLOCKED_BY_ORGANIZATIONAL_ACCESS' };
  }

  // --- hop 3: service → deployed? U-2, with one genuinely provable case ---
  //
  // The POSITIVE direction needs the manifests and stays U-2. The NEGATIVE
  // direction is provable today: if C-03 proved which service serves this
  // operation, and the build config excludes that service on the branch
  // naming this environment, then it is not built or deployed here from this
  // repository at this revision. That is deployment configuration, not a
  // naming coincidence, so it is a DEPLOYMENT_FACT — and it is negative.
  const provenService = evidence.provenServiceByOperation.get(operation.operationId);
  const excluded = provenService === undefined
    ? Object.freeze([] as readonly string[])
    : excludedEnvironmentsFor(provenService, evidence.buildExclusions);
  if (excluded.length > 0 && evidence.buildExclusionEvidence !== null) used.push(evidence.buildExclusionEvidence);

  let hop3: DeploymentChainLink;
  if (provenService === undefined) {
    hop3 = { hop: 'SERVICE_TO_DEPLOYMENT', established: false, factCategory: null, value: null, unknownReason: 'NO_PROVEN_SERVICE_IDENTITY' };
  } else if (excluded.includes(environment)) {
    // Established, and what it establishes is a NEGATIVE: not deployed here.
    hop3 = { hop: 'SERVICE_TO_DEPLOYMENT', established: true, factCategory: 'DEPLOYMENT_FACT', value: `NOT_DEPLOYED:${provenService}`, unknownReason: null };
  } else {
    // Not excluded means ELIGIBLE to be built, which is not deployment.
    hop3 = { hop: 'SERVICE_TO_DEPLOYMENT', established: false, factCategory: null, value: null, unknownReason: 'C08B_BLOCKED_BY_ORGANIZATIONAL_ACCESS' };
  }

  const chain = Object.freeze([hop1, hop2, hop3]);

  const state = chainState(chain);
  return Object.freeze({
    schemaVersion: DEPLOYMENT_BINDING_VERSION,
    operationId: operation.operationId,
    repository: operation.repository,
    state,
    factCategory: weakestCategory(chain.map((link) => link.factCategory)),
    chain,
    evidence: Object.freeze(used),
    excludedEnvironments: excluded,
    unknownReason: state === 'UNKNOWN' || state === 'PARTIAL'
      ? (chain.find((link) => !link.established)?.unknownReason ?? null)
      : null,
  });
}

export interface DeploymentBindingProjection {
  readonly schemaVersion: typeof DEPLOYMENT_BINDING_VERSION;
  readonly operationCount: number;
  readonly bindingCount: number;
  /** Totality: these two must be equal, by construction and by assertion. */
  readonly totalityHolds: boolean;
  readonly byState: Readonly<Record<DeploymentBindingState, number>>;
  readonly byFactCategory: Readonly<Record<string, number>>;
  /** Positive route → endpoint deployment facts. Legitimately zero today. */
  readonly positiveDeploymentFacts: number;
  readonly u1: { readonly resolved: false; readonly reason: DeploymentUnknownReason };
  readonly u2: { readonly resolved: false; readonly reason: DeploymentUnknownReason };
  readonly bindings: readonly DeploymentBinding[];
}

/**
 * Bind EVERY operation. Totality is structural: the projection is built by
 * mapping over the population, so a binding cannot be omitted, and
 * `totalityHolds` is asserted rather than assumed.
 */
export function bindDeployments(
  operations: readonly OperationForBinding[],
  evidence: DeploymentEvidenceInput,
  environment = 'prod',
): DeploymentBindingProjection {
  const bindings = operations.map((operation) => bindOperation(operation, evidence, environment));
  const byState = Object.fromEntries(DEPLOYMENT_BINDING_STATES.map((state) => [state, 0])) as Record<DeploymentBindingState, number>;
  const byFactCategory: Record<string, number> = Object.fromEntries([...FACT_CATEGORIES, 'NONE'].map((category) => [category, 0]));
  let positive = 0;
  for (const binding of bindings) {
    byState[binding.state] += 1;
    const categoryKey = binding.factCategory ?? 'NONE';
    byFactCategory[categoryKey] = (byFactCategory[categoryKey] ?? 0) + 1;
    if (binding.chain.some((link) => link.established && link.factCategory === 'DEPLOYMENT_FACT')) positive += 1;
  }
  return Object.freeze({
    schemaVersion: DEPLOYMENT_BINDING_VERSION,
    operationCount: operations.length,
    bindingCount: bindings.length,
    totalityHolds: operations.length === bindings.length,
    byState: Object.freeze(byState),
    byFactCategory: Object.freeze(byFactCategory),
    positiveDeploymentFacts: positive,
    // Typed as `resolved: false` so that "resolved" cannot be set without a
    // type change, which is a deliberate speed bump: resolving these requires
    // the manifests, not a boolean.
    u1: Object.freeze({ resolved: false as const, reason: 'C08B_BLOCKED_BY_ORGANIZATIONAL_ACCESS' as const }),
    u2: Object.freeze({ resolved: false as const, reason: 'C08B_BLOCKED_BY_ORGANIZATIONAL_ACCESS' as const }),
    bindings: Object.freeze(bindings),
  });
}
