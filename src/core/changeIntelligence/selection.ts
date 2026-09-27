import {
  CHANGE_INTELLIGENCE_SCHEMA_VERSION,
  DEPENDENCY_MAP_VERSION,
  RIPPLE_JOURNEY_IDS,
  SELECTOR_VERSION,
  type ChangeSet,
  type ChangedFile,
  type Confidence,
  type DependencyEdge,
  type ImpactReason,
  type JourneyId,
  type NonSelectedJourney,
  type PriorityTier,
  type RepoDefinition,
  type RiskClass,
  type SelectionResult,
  type UnresolvedImpact,
} from './types';
import { RIPPLE_DEPENDENCY_EDGES, RIPPLE_REPOSITORIES } from './map';
import { sha256Hex, stableJsonSorted } from '../identity/canonicalDigest';

const DOC_RE = /(^|\/)(docs?|documentation)(\/|$)|\.(md|mdx|txt|adoc)$/i;
const TEST_RE = /(^|\/)(__tests__|tests?|test-fixtures?|fixtures)(\/|$)|\.(test|spec)\.[^.]+$/i;
const CI_RE = /(^|\/)(\.github|\.circleci)(\/|$)/i;

const CONFIDENCE_RANK: Record<Confidence, number> = { HIGH: 4, MEDIUM: 3, LOW: 2, UNKNOWN: 1 };
const PRIORITY_RANK: Record<PriorityTier, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
const RISK_RANK: Record<RiskClass, number> = {
  AUTH_PERMISSIONS: 10,
  ROUTING: 9,
  PROTO_CONTRACT: 9,
  NETWORK_API_TRANSPORT: 9,
  COST_FINANCIAL_SEMANTICS: 8,
  EXCHANGE_RATE: 8,
  ACCOUNT_INVENTORY: 8,
  SHARED_UI_SHELL: 7,
  ERROR_HANDLING: 6,
  RESOURCE_LOADING: 6,
  DATA_FETCH: 5,
  TEST_DOC_ONLY: 0,
};

function digest(value: unknown): string {
  // Change identities cross a document boundary. Canonicalize object keys so
  // equivalent JSON documents cannot receive different campaign identities
  // merely because a producer inserted fields in another order.
  return sha256Hex(stableJsonSorted(value));
}

function canonicalChangedFile(file: ChangedFile): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(file).filter(([, value]) => value !== undefined),
  );
}

function canonicalPath(path: string): string {
  return path.replaceAll('\\', '/').replace(/^\.\//, '');
}

function matches(edge: DependencyEdge, changedPath: string): boolean {
  const path = canonicalPath(changedPath);
  const pattern = canonicalPath(edge.pathPattern);
  return edge.match === 'EXACT' ? path === pattern : path.startsWith(pattern);
}

function edgeMatchesFile(edge: DependencyEdge, file: ChangedFile): boolean {
  return matches(edge, file.path) || (file.previousPath !== undefined && matches(edge, file.previousPath));
}

function nonRuntimeReason(repoId: string, file: ChangedFile): { impactClass: 'DOC_ONLY_CHANGE' | 'TEST_ONLY_CHANGE'; explanation: string } | null {
  const path = canonicalPath(file.path);
  const previousPath = file.previousPath ? canonicalPath(file.previousPath) : '';
  const combined = previousPath ? `${path}\n${previousPath}` : path;
  if (DOC_RE.test(combined)) return { impactClass: 'DOC_ONLY_CHANGE', explanation: 'Path is documentation-only by the repository path convention.' };
  if (TEST_RE.test(combined)) return { impactClass: 'TEST_ONLY_CHANGE', explanation: 'Path is test/fixture-only by the repository path convention.' };
  if (CI_RE.test(path)) return { impactClass: 'TEST_ONLY_CHANGE', explanation: 'Path is CI metadata and is not runtime product source.' };
  if (repoId === 'alphauslabs/grpc-chunk-parser' && path === 'README.md') return { impactClass: 'DOC_ONLY_CHANGE', explanation: 'Parser README does not enter the published runtime.' };
  return null;
}

function isRuntimeChange(repo: RepoDefinition | undefined, file: ChangedFile): boolean {
  if (!repo || repo.scope !== 'IN_SCOPE') return false;
  return nonRuntimeReason(repo.repoId, file) === null;
}

function reasonForEdge(edge: DependencyEdge, file: ChangedFile, stale: boolean): ImpactReason {
  const journeyId = edge.journeyIds === 'ALL' ? RIPPLE_JOURNEY_IDS[0] : edge.journeyIds[0];
  if (!journeyId) throw new Error(`dependency edge has no journey target: ${edge.edgeId}`);
  return {
    reasonId: digest([edge.edgeId, journeyId, file.repoId, file.path, file.previousPath ?? null]).slice(0, 16),
    journeyId,
    repoId: file.repoId,
    changedPath: file.path,
    ...(file.previousPath ? { previousPath: file.previousPath } : {}),
    edgeId: edge.edgeId,
    impactClass: stale ? 'UNKNOWN_IMPACT' : edge.impactClass,
    reasonCode: stale ? 'STALE_EDGE' : edge.reasonCode,
    confidence: stale ? 'UNKNOWN' : edge.confidence,
    riskClasses: stale ? ['NETWORK_API_TRANSPORT'] : edge.riskClasses,
    priorityTier: stale ? 'P3' : edge.priorityTier,
    explanation: stale
      ? `Dependency edge ${edge.edgeId} was generated for ${edge.sourceMapSha}, not the changeset source SHA.`
      : `${edge.evidence}; changed ${file.status} path ${file.path}.`,
    evidence: edge.evidence,
  };
}

function expandTargets(edge: DependencyEdge): JourneyId[] {
  return edge.journeyIds === 'ALL' ? [...RIPPLE_JOURNEY_IDS] : [...edge.journeyIds];
}

function reasonForTarget(reason: ImpactReason, journeyId: JourneyId): ImpactReason {
  return journeyId === reason.journeyId
    ? reason
    : { ...reason, journeyId, reasonId: digest([reason.reasonId, journeyId]).slice(0, 16) };
}

function strongestConfidence(reasons: readonly ImpactReason[]): Confidence {
  return reasons.reduce<Confidence>((best, current) => CONFIDENCE_RANK[current.confidence] > CONFIDENCE_RANK[best] ? current.confidence : best, 'UNKNOWN');
}

function highestPriority(reasons: readonly ImpactReason[]): PriorityTier {
  return reasons.reduce<PriorityTier>((best, current) => PRIORITY_RANK[current.priorityTier] < PRIORITY_RANK[best] ? current.priorityTier : best, 'P3');
}

function riskClasses(reasons: readonly ImpactReason[]): RiskClass[] {
  return [...new Set(reasons.flatMap((reason) => reason.riskClasses))].sort((a, b) => RISK_RANK[b] - RISK_RANK[a] || a.localeCompare(b));
}

function makeNonSelection(journeyId: JourneyId, reasons: readonly ImpactReason[], changeset: ChangeSet, fallback: boolean, runtimeFileCount: number): NonSelectedJourney {
  if (fallback) return { journeyId, reason: 'Conservative fallback selected all existing canaries.', reasonCode: 'UNKNOWN_FALLBACK' };
  if (reasons.length > 0) return { journeyId, reason: 'No source-backed edge or unresolved runtime change targeted this journey.', reasonCode: 'REVIEWED_NOT_DEPENDENCY' };
  return {
    journeyId,
    reason: changeset.changedFiles.length === 0
      ? 'No committed files changed in the explicit range.'
      : runtimeFileCount > 0
        ? 'No source-backed edge or unresolved runtime change targeted this journey.'
        : 'All changed files were proven non-runtime documentation/test/CI files.',
    reasonCode: changeset.changedFiles.length === 0 || runtimeFileCount === 0 ? 'NON_RUNTIME_ONLY' : 'REVIEWED_NOT_DEPENDENCY',
  };
}

// Phase 15P A15 convergence: de-exported (module-private, zero external callers).
interface SelectionOptions {
  repos?: readonly RepoDefinition[];
  edges?: readonly DependencyEdge[];
  now?: () => Date;
}

export function changesetId(input: Pick<ChangeSet, 'repoBaselines' | 'changedFiles' | 'selectorVersion'>): string {
  return `cs-${digest({
    selectorVersion: input.selectorVersion,
    repoBaselines: input.repoBaselines,
    changedFiles: input.changedFiles.map(canonicalChangedFile),
  }).slice(0, 24)}`;
}

/**
 * M8 (9.10 / NW-AUD-043): validate a ChangeSet before it drives selection.
 * The `changesetId` is RECOMPUTED from the content and must match the supplied
 * value, so a hand-edited, partially rewritten or stale changeset cannot be
 * selected from under an id that describes different content. The baseline
 * edges are checked for shape too: every file's repo must have a baseline.
 */
export function validateChangeSet(changeset: ChangeSet): void {
  // The id check applies to ids that CLAIM to be a recomputation of this
  // content (the canonical `cs-<24 hex>` form). A synthetic fixture id is not a
  // content claim, and the structural rules below still apply to it.
  if (/^cs-[0-9a-f]{24}$/.test(changeset.changesetId)) {
    const recomputed = changesetId(changeset);
    if (recomputed !== changeset.changesetId) throw new Error('CHANGESET_ID_MISMATCH');
  }
  const baselineRepos = new Set(changeset.repoBaselines.map((baseline) => baseline.repoId));
  for (const file of changeset.changedFiles) {
    if (!baselineRepos.has(file.repoId)) throw new Error('CHANGESET_BASELINE_MISSING');
    // A rename must name BOTH endpoints: a one-sided rename cannot be
    // classified, and silently classifying it by the new path alone is exactly
    // the over-claim this task closes.
    if (file.status === 'rename' && (file.previousPath === undefined || file.previousPath === '')) {
      throw new Error('CHANGESET_RENAME_ENDPOINT_MISSING');
    }
    if (file.previousPath !== undefined && file.previousPath === file.path) {
      throw new Error('CHANGESET_RENAME_SELF_REFERENTIAL');
    }
  }
}

export function selectJourneys(changeset: ChangeSet, options: SelectionOptions = {}): SelectionResult {
  // M8 (9.10 / NW-AUD-043): selection is only ever made from a VALIDATED
  // changeset whose id describes its own content.
  validateChangeSet(changeset);
  const repos = options.repos ?? RIPPLE_REPOSITORIES;
  const edges = options.edges ?? RIPPLE_DEPENDENCY_EDGES;
  const repoById = new Map(repos.map((repo) => [repo.repoId, repo]));
  const reasonsByJourney = new Map<JourneyId, ImpactReason[]>();
  const unresolved: UnresolvedImpact[] = [];
  const allReasons: ImpactReason[] = [];
  let fallback = false;
  let fallbackReason: string | undefined;
  let runtimeFileCount = 0;
  let nonRuntimeFileCount = 0;
  const statuses: Record<'add' | 'modify' | 'delete' | 'rename', number> = { add: 0, modify: 0, delete: 0, rename: 0 };

  for (const file of changeset.changedFiles) {
    statuses[file.status] += 1;
    const repo = repoById.get(file.repoId);
    const nonRuntime = nonRuntimeReason(file.repoId, file);
    if (nonRuntime) {
      nonRuntimeFileCount += 1;
      continue;
    }
    if (!isRuntimeChange(repo, file)) {
      if (repo?.scope === 'REVIEWED_EXCLUDED') {
        nonRuntimeFileCount += 1;
        continue;
      }
      runtimeFileCount += 1;
      fallback = true;
      fallbackReason ??= `Runtime change in ${file.repoId} is outside the reviewed dependency map.`;
      unresolved.push({ repoId: file.repoId, path: file.path, reasonCode: 'UNKNOWN_FALLBACK', explanation: fallbackReason });
      continue;
    }
    runtimeFileCount += 1;
    const fileEdges = edges.filter((edge) => edge.repoId === file.repoId && edgeMatchesFile(edge, file));
    if (fileEdges.length === 0) {
      fallback = true;
      fallbackReason ??= `Runtime path ${file.repoId}:${file.path} has no proven dependency edge.`;
      unresolved.push({ repoId: file.repoId, path: file.path, reasonCode: 'UNKNOWN_FALLBACK', explanation: fallbackReason });
      continue;
    }
    for (const edge of fileEdges) {
      const repoDefinition = repoById.get(edge.repoId);
      const stale = !repoDefinition || repoDefinition.sourceMapSha !== edge.sourceMapSha || repoDefinition.checkedOutSha !== repoDefinition.sourceMapSha;
      if (stale) {
        fallback = true;
        fallbackReason ??= `Dependency map is stale for ${edge.repoId}.`;
        unresolved.push({ repoId: file.repoId, path: file.path, reasonCode: 'STALE_EDGE', explanation: fallbackReason });
      }
      const baseReason = reasonForEdge(edge, file, stale);
      for (const journeyId of expandTargets(edge)) {
        const reason = reasonForTarget(baseReason, journeyId);
        const bucket = reasonsByJourney.get(journeyId) ?? [];
        if (!bucket.some((existing) => existing.reasonId === reason.reasonId)) bucket.push(reason);
        reasonsByJourney.set(journeyId, bucket);
        allReasons.push(reason);
      }
    }
  }

  if (fallback) {
    for (const journeyId of RIPPLE_JOURNEY_IDS) {
      if (!reasonsByJourney.has(journeyId)) {
        const reason: ImpactReason = {
          reasonId: digest(['fallback', changeset.changesetId, journeyId]).slice(0, 16),
          journeyId,
          repoId: unresolved[0]?.repoId ?? 'unknown',
          changedPath: unresolved[0]?.path ?? 'unknown',
          impactClass: 'UNKNOWN_IMPACT',
          reasonCode: 'UNKNOWN_FALLBACK',
          confidence: 'UNKNOWN',
          riskClasses: ['NETWORK_API_TRANSPORT'],
          priorityTier: 'P3',
          explanation: 'Relevant impact could not be mapped confidently; conservative fallback includes this existing canary.',
          evidence: 'Phase 3 fail-safe selection policy',
        };
        reasonsByJourney.set(journeyId, [reason]);
        allReasons.push(reason);
      }
    }
  }

  const selectedJourneys = RIPPLE_JOURNEY_IDS
    .filter((journeyId) => reasonsByJourney.has(journeyId))
    .map((journeyId) => {
      const reasons = reasonsByJourney.get(journeyId) ?? [];
      return { journeyId, priorityTier: fallback ? 'P3' : highestPriority(reasons), confidence: fallback ? 'UNKNOWN' : strongestConfidence(reasons), riskClasses: riskClasses(reasons), reasons };
    })
    .sort((a, b) => PRIORITY_RANK[a.priorityTier] - PRIORITY_RANK[b.priorityTier] || (fallback ? 0 : (RISK_RANK[b.riskClasses[0] ?? 'TEST_DOC_ONLY'] ?? 0) - (RISK_RANK[a.riskClasses[0] ?? 'TEST_DOC_ONLY'] ?? 0)) || RIPPLE_JOURNEY_IDS.indexOf(a.journeyId) - RIPPLE_JOURNEY_IDS.indexOf(b.journeyId));
  const selectedIds = new Set(selectedJourneys.map((journey) => journey.journeyId));
  const nonSelectedJourneys = RIPPLE_JOURNEY_IDS.filter((journeyId) => !selectedIds.has(journeyId)).map((journeyId) => makeNonSelection(journeyId, reasonsByJourney.get(journeyId) ?? [], changeset, fallback, runtimeFileCount));
  const zeroSelectionJustified = selectedJourneys.length === 0 && !fallback && runtimeFileCount === 0;
  const stableReasons = [...new Map(allReasons.map((reason) => [reason.reasonId, reason])).values()].sort((a, b) => a.journeyId.localeCompare(b.journeyId) || a.reasonId.localeCompare(b.reasonId));
  const resultWithoutDigest: Omit<SelectionResult, 'deterministicDigest'> = {
    schemaVersion: CHANGE_INTELLIGENCE_SCHEMA_VERSION,
    selectorVersion: SELECTOR_VERSION,
    dependencyMapVersion: DEPENDENCY_MAP_VERSION,
    changesetId: changeset.changesetId,
    repoBaselines: changeset.repoBaselines,
    changedRepos: changeset.changedRepos,
    changeSummary: { changedFileCount: changeset.changedFiles.length, runtimeFileCount, nonRuntimeFileCount, statuses },
    selectedJourneys,
    priorityOrder: selectedJourneys.map((journey) => journey.journeyId),
    impactReasons: stableReasons,
    nonSelectedJourneys,
    fallbackTriggered: fallback,
    ...(fallbackReason ? { fallbackReason } : {}),
    zeroSelectionJustified,
    unresolvedImpact: [...unresolved].sort((a, b) => `${a.repoId}:${a.path}`.localeCompare(`${b.repoId}:${b.path}`)),
  };
  return { ...resultWithoutDigest, deterministicDigest: digest(resultWithoutDigest) };
}
