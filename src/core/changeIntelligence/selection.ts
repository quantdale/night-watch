import crypto from 'node:crypto';
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

const DOC_RE = /(^|\/)(docs?|documentation)(\/|$)|\.(md|mdx|txt|adoc)$/i;
const TEST_RE = /(^|\/)(__tests__|tests?|test-fixtures?|fixtures)(\/|$)|\.(test|spec)\.[^.]+$/i;
const CI_RE = /(^|\/)(\.github|\.circleci)(\/|$)|(^|\/)(Makefile|Dockerfile|.*\.ya?ml)$/i;
const CONFIG_RE = /(^|\/)(\.env[^/]*|config|configs?|vue\.config\.[^/]+|webpack[^/]*)($|\/)|(^|\/)(package\.json|package-lock\.json|yarn\.lock|pnpm-lock\.yaml)$/i;

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
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
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
  if (CI_RE.test(path) && !CONFIG_RE.test(path)) return { impactClass: 'TEST_ONLY_CHANGE', explanation: 'Path is CI metadata and is not runtime product source.' };
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

export interface SelectionOptions {
  repos?: readonly RepoDefinition[];
  edges?: readonly DependencyEdge[];
  now?: () => Date;
}

export function changesetId(input: Pick<ChangeSet, 'repoBaselines' | 'changedFiles' | 'selectorVersion'>): string {
  return `cs-${digest({ selectorVersion: input.selectorVersion, repoBaselines: input.repoBaselines, changedFiles: input.changedFiles }).slice(0, 24)}`;
}

export function selectJourneys(changeset: ChangeSet, options: SelectionOptions = {}): SelectionResult {
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
