// ---------------------------------------------------------------------------
// Lane C — Safe Agent Tool Protocol runtime.
//
// Executes frozen catalog tools by delegating to EXISTING Nightwatch modules
// (source lexical analysis, system-map projections, triage differential and
// replay-plan validation). This module contains no browser, network,
// filesystem, child-process, DB, or AI authority: adapters work only over
// caller-supplied fixtures plus those pure engines.
//
// Gate order per execution: intent-kind check → lookupAgentTool →
// mutation=NONE assertion → environment gate → owner-scope gate → adapter
// dispatch → sanitization + evidence refs. Unknown tool ids fail closed.
// ---------------------------------------------------------------------------

import { AGENT_TOOL_PROTOCOL_VERSION } from '../agentProtocol/versions';
import { ATLAS_QUERY_VERSION, clampAtlasLimit } from '../agentProtocol/atlas';
import { lookupAgentTool, type AgentToolId } from '../agentProtocol/tools';
import type { UntrustedSource } from '../agentProtocol/untrusted';
import { decideOwnerScope } from '../policy/ownerScope';
import { createBugAtlasStore } from '../bugAtlas/store';
import { bugAtlasFixtureCorpus } from '../bugAtlas/fixtures';
import { createAtlasQuery, querySystemAtlas } from '../systemAtlas/overlay';
import { createSyntheticSystemAtlasOverlay } from '../systemAtlas/fixtures';
import { buildAutonomousFindingDossier } from '../autonomousFinding/dossier';
import type { AutonomousFindingDraft } from '../autonomousFinding/types';
import { tokenizeStaticSource, type StaticLexicalLanguage } from '../source/lexical';
import {
  projectCompany,
  queryCoverageGaps,
  queryFindingsAttachedToTopology,
  queryMutationCapableRoutes,
  queryUntestedReadOnlyRoutes,
  type SystemMapInput,
} from '../systemMap/projections';
import { compareBrowserAndApi } from '../triage/differential';
import type { ApiObservation, BrowserObservation } from '../triage/types';
import { validateTriageReplayPlan } from '../triage/replayPlan';
import {
  evidenceRefFor,
  sanitizeJsonText,
  scanForInjection,
  wrapUntrusted,
} from './sanitize';
import type {
  AgentToolCallIntent,
  AgentToolExecutionContext,
  AgentToolFailure,
  AgentToolFailureClass,
  AgentToolFixtures,
  AgentToolResult,
  SourceSurfaceFixture,
} from './types';

export const AGENT_TOOL_RUNTIME_VERSION = 'nightwatch.agent-tool-runtime.v1' as const;

const DEFAULT_NODE_LIMIT = 50;
const DEFAULT_EDGE_LIMIT = 50;
const MAX_PROJECTION_LIMIT = 200;
const SOURCE_SNIPPET_CHARS = 1500;

type AdapterOutcome =
  | { readonly ok: true; readonly data: unknown; readonly source: UntrustedSource }
  | { readonly ok: false; readonly class: Extract<AgentToolFailureClass, 'MALFORMED_ARGUMENTS' | 'ADAPTER_UNAVAILABLE'>; readonly reason: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function fail(
  toolId: string | null,
  cls: AgentToolFailureClass,
  reason: string,
  injectionDetected: boolean,
): AgentToolFailure {
  return {
    ok: false,
    toolId,
    class: cls,
    reason,
    mutationCapability: 'NONE',
    evidenceRefs: [],
    injectionDetected,
  };
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function asLimit(value: unknown, fallback: number): number | null {
  if (value === undefined) return fallback;
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(MAX_PROJECTION_LIMIT, Math.trunc(value)));
}

// --- adapters (read-only; fixtures + existing engines only) ------------------

function adaptInspectSourceSurface(
  args: Record<string, unknown>,
  fixtures: AgentToolFixtures | undefined,
): AdapterOutcome {
  const surfaces = fixtures?.sourceSurfaces;
  if (!surfaces || surfaces.length === 0) {
    return { ok: false, class: 'ADAPTER_UNAVAILABLE', reason: 'no source surfaces provided; refusing to invent source text' };
  }
  const requestedPath = typeof args['path'] === 'string' ? (args['path'] as string) : null;
  let selected: SourceSurfaceFixture | null = null;
  if (requestedPath !== null) {
    selected = surfaces.find((surface) => surface.path === requestedPath) ?? null;
    if (selected === null) {
      return { ok: false, class: 'ADAPTER_UNAVAILABLE', reason: 'requested path is not in the provided source surfaces' };
    }
  } else {
    selected = surfaces[0] ?? null;
  }
  if (selected === null) {
    return { ok: false, class: 'ADAPTER_UNAVAILABLE', reason: 'no source surfaces provided; refusing to invent source text' };
  }
  // Real engine: static lexical analysis. Never executes source.
  const tokens = tokenizeStaticSource(selected.text, selected.language);
  if (tokens === null) {
    return { ok: false, class: 'ADAPTER_UNAVAILABLE', reason: 'source exceeds the static lexical bound; refusing a partial read' };
  }
  const kindHistogram: Record<string, number> = {};
  for (const token of tokens) {
    kindHistogram[token.kind] = (kindHistogram[token.kind] ?? 0) + 1;
  }
  return {
    ok: true,
    source: 'SOURCE_CODE',
    data: {
      path: selected.path,
      language: selected.language,
      charCount: selected.text.length,
      tokenCount: tokens.length,
      kindHistogram,
      snippet: selected.text.slice(0, SOURCE_SNIPPET_CHARS),
    },
  };
}

function adaptQuerySystemMap(
  args: Record<string, unknown>,
  fixtures: AgentToolFixtures | undefined,
): AdapterOutcome {
  const systemMap: SystemMapInput | undefined = fixtures?.systemMap;
  if (!systemMap) {
    return { ok: false, class: 'ADAPTER_UNAVAILABLE', reason: 'no system map provided; refusing to invent topology' };
  }
  const query = args['query'] === undefined ? 'COMPANY' : args['query'];
  if (typeof query !== 'string') {
    return { ok: false, class: 'MALFORMED_ARGUMENTS', reason: 'query must be a string operator query' };
  }
  const nodeLimit = asLimit(args['nodeLimit'], DEFAULT_NODE_LIMIT);
  const edgeLimit = asLimit(args['edgeLimit'], DEFAULT_EDGE_LIMIT);
  if (nodeLimit === null || edgeLimit === null) {
    return { ok: false, class: 'MALFORMED_ARGUMENTS', reason: 'nodeLimit/edgeLimit must be finite numbers' };
  }
  const limits = { nodeLimit, edgeLimit };
  // Real engines: frozen system-map projections over the provided input.
  switch (query) {
    case 'COMPANY':
      return { ok: true, source: 'DOCUMENTATION', data: projectCompany(systemMap, limits) };
    case 'COVERAGE_GAPS':
      return { ok: true, source: 'DOCUMENTATION', data: queryCoverageGaps(systemMap, limits) };
    case 'UNTESTED_READ_ONLY_ROUTES':
      return { ok: true, source: 'DOCUMENTATION', data: queryUntestedReadOnlyRoutes(systemMap, limits) };
    case 'MUTATION_CAPABLE_ROUTES':
      return { ok: true, source: 'DOCUMENTATION', data: queryMutationCapableRoutes(systemMap, limits) };
    case 'FINDINGS_ATTACHED_TO_TOPOLOGY':
      return { ok: true, source: 'DOCUMENTATION', data: queryFindingsAttachedToTopology(systemMap, limits) };
    default:
      return { ok: false, class: 'MALFORMED_ARGUMENTS', reason: `unknown system-map query: ${query}` };
  }
}

function adaptRetrieveSanitizedEvidence(
  args: Record<string, unknown>,
  fixtures: AgentToolFixtures | undefined,
): AdapterOutcome {
  const evidenceRef = asNonEmptyString(args['evidenceRef']);
  if (evidenceRef === null) {
    return { ok: false, class: 'MALFORMED_ARGUMENTS', reason: 'evidenceRef must be a non-empty string' };
  }
  const store = fixtures?.evidenceStore;
  if (!store || !(evidenceRef in store)) {
    return { ok: false, class: 'ADAPTER_UNAVAILABLE', reason: 'evidence ref is not in the provided store; refusing to invent evidence' };
  }
  return { ok: true, source: 'LOG', data: { evidenceRef, record: store[evidenceRef] } };
}

function adaptAskDeterministicOracle(
  args: Record<string, unknown>,
  fixtures: AgentToolFixtures | undefined,
): AdapterOutcome {
  const questionId = asNonEmptyString(args['questionId']);
  if (questionId === null) {
    return { ok: false, class: 'MALFORMED_ARGUMENTS', reason: 'questionId must be a non-empty string' };
  }
  const answers = fixtures?.oracleAnswers;
  if (!answers || !(questionId in answers)) {
    return { ok: false, class: 'ADAPTER_UNAVAILABLE', reason: 'no recorded oracle answer for this question; refusing to invent one' };
  }
  // Deterministic by construction: a pure lookup of a recorded answer.
  return { ok: true, source: 'DOCUMENTATION', data: { questionId, answer: answers[questionId] } };
}

function readBrowserObservation(value: unknown): BrowserObservation | null {
  if (!isRecord(value)) return null;
  const failed = value['failed'];
  const routeClass = asNonEmptyString(value['routeClass']);
  const structuralState = asNonEmptyString(value['structuralState']);
  const operationFamily = asNonEmptyString(value['operationFamily']);
  const statusClass = asNonEmptyString(value['statusClass']);
  const contentTypeClass = asNonEmptyString(value['contentTypeClass']);
  const oracleFingerprint = asNonEmptyString(value['oracleFingerprint']);
  const runtimeCategory = asNonEmptyString(value['runtimeCategory']);
  if (typeof failed !== 'boolean' || !routeClass || !structuralState || !operationFamily || !statusClass || !contentTypeClass || !oracleFingerprint || !runtimeCategory) {
    return null;
  }
  return { failed, routeClass, structuralState, operationFamily, statusClass, contentTypeClass, oracleFingerprint, runtimeCategory };
}

type ApiObservationInput = { readonly api: ApiObservation | null; readonly malformed: boolean };

function readApiObservation(value: unknown): ApiObservationInput {
  if (value === null || value === undefined) return { api: null, malformed: false };
  if (!isRecord(value)) return { api: null, malformed: true };
  const available = value['available'];
  const failed = value['failed'];
  const operationFamily = asNonEmptyString(value['operationFamily']);
  const statusClass = asNonEmptyString(value['statusClass']);
  const contentTypeClass = asNonEmptyString(value['contentTypeClass']);
  const parseCategory = asNonEmptyString(value['parseCategory']);
  const oracleFingerprint = asNonEmptyString(value['oracleFingerprint']);
  if (typeof available !== 'boolean' || typeof failed !== 'boolean' || !operationFamily || !statusClass || !contentTypeClass || !parseCategory || !oracleFingerprint) {
    return { api: null, malformed: true };
  }
  const routeClass = value['routeClass'];
  const structuralState = value['structuralState'];
  return {
    malformed: false,
    api: {
      available,
      failed,
      operationFamily,
      statusClass,
      contentTypeClass,
      parseCategory,
      oracleFingerprint,
      ...(typeof routeClass === 'string' ? { routeClass } : {}),
      ...(typeof structuralState === 'string' ? { structuralState } : {}),
    },
  };
}
function adaptCompareObservations(args: Record<string, unknown>): AdapterOutcome {
  const browser = readBrowserObservation(args['browser']);
  if (browser === null) {
    return { ok: false, class: 'MALFORMED_ARGUMENTS', reason: 'browser must be a complete browser observation' };
  }
  const parsedApi = readApiObservation(args['api'] ?? null);
  if (parsedApi.malformed) {
    return { ok: false, class: 'MALFORMED_ARGUMENTS', reason: 'api observation is malformed' };
  }
  // Real engine: browser/API app-layer differential. rootCauseClaim is NONE
  // by engine contract — this lane never upgrades it.
  return { ok: true, source: 'API_RESPONSE', data: compareBrowserAndApi(browser, parsedApi.api) };
}

function adaptRequestRouteContractProof(
  args: Record<string, unknown>,
  fixtures: AgentToolFixtures | undefined,
): AdapterOutcome {
  const systemMap = fixtures?.systemMap;
  if (!systemMap) {
    return { ok: false, class: 'ADAPTER_UNAVAILABLE', reason: 'no system map provided; refusing to invent route proofs' };
  }
  const operationId = typeof args['operationId'] === 'string' ? (args['operationId'] as string) : null;
  const routeTemplate = typeof args['routeTemplate'] === 'string' ? (args['routeTemplate'] as string) : null;
  const method = typeof args['method'] === 'string' ? (args['method'] as string) : null;
  if (operationId === null && routeTemplate === null) {
    return { ok: false, class: 'MALFORMED_ARGUMENTS', reason: 'operationId or routeTemplate is required' };
  }
  const match = systemMap.operations.find((operation) =>
    operationId !== null
      ? operation.operationId === operationId
      : operation.routeTemplate === routeTemplate && (method === null || operation.method === method),
  );
  if (!match) {
    return { ok: false, class: 'ADAPTER_UNAVAILABLE', reason: 'no matching operation in the provided system map; refusing to invent a proof' };
  }
  return {
    ok: true,
    source: 'SOURCE_CODE',
    data: {
      operationId: match.operationId,
      method: match.method,
      routeTemplate: match.routeTemplate,
      routeProof: match.routeProof,
      readOnlyClassification: match.readOnlyClassification,
      factCategory: match.factCategory,
    },
  };
}

function adaptRequestFindingProposal(args: Record<string, unknown>): AdapterOutcome {
  const candidateId = asNonEmptyString(args['candidateId']);
  const evidenceRefs = args['evidenceRefs'];
  if (candidateId === null) {
    return { ok: false, class: 'MALFORMED_ARGUMENTS', reason: 'candidateId must be a non-empty string' };
  }
  if (!Array.isArray(evidenceRefs) || evidenceRefs.length === 0 || !evidenceRefs.every((ref) => typeof ref === 'string' && ref.length > 0)) {
    return { ok: false, class: 'MALFORMED_ARGUMENTS', reason: 'evidenceRefs must be a non-empty string array' };
  }
  if (isRecord(args['draft'])) {
    try {
      const dossier = buildAutonomousFindingDossier(args['draft'] as unknown as AutonomousFindingDraft);
      return {
        ok: true,
        source: 'LOG',
        data: {
          candidateId,
          evidenceRefs: [...evidenceRefs],
          status: 'DOSSIER_BUILT_NO_AUTHORITY',
          dossier,
          authority: dossier.authority,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'INVALID_DRAFT';
      return { ok: false, class: 'MALFORMED_ARGUMENTS', reason: message };
    }
  }
  return {
    ok: true,
    source: 'HISTORICAL_RECORD',
    data: {
      candidateId,
      evidenceRefs: [...evidenceRefs],
      status: 'PROPOSAL_ONLY_NO_AUTHORITY',
      authority: {
        humanReviewRequired: true,
        externalPublication: 'PROHIBITED',
        autoFile: false,
        autoLeslie: false,
        autoSlack: false,
      },
    },
  };
}

function adaptRerunSafeReproduction(args: Record<string, unknown>): AdapterOutcome {
  if (!('plan' in args)) {
    return { ok: false, class: 'MALFORMED_ARGUMENTS', reason: 'plan is required' };
  }
  // Real engine: strict replay-plan validation. This lane validates only and
  // never executes a replay.
  const validated = validateTriageReplayPlan(args['plan']);
  if (!validated.valid) {
    return { ok: false, class: 'MALFORMED_ARGUMENTS', reason: `replay plan rejected: ${validated.reason}` };
  }
  return {
    ok: true,
    source: 'LOG',
    data: {
      planId: validated.plan.planId,
      phase: validated.plan.phase,
      targetId: validated.plan.targetId,
      execution: 'NOT_EXECUTED',
      note: 'Lane C validates the replay plan only; execution authority lives outside this lane.',
    },
  };
}

function adaptDevObservation(toolId: AgentToolId): AdapterOutcome {
  return {
    ok: false,
    class: 'ADAPTER_UNAVAILABLE',
    reason: `${toolId} requires a contained DEV harness, which this lane does not provide; no observation performed`,
  };
}

function parseAtlasTerms(args: Record<string, unknown>): readonly string[] {
  if (Array.isArray(args['terms']) && args['terms'].every((item) => typeof item === 'string')) {
    return args['terms'] as readonly string[];
  }
  const query = asNonEmptyString(args['query']);
  if (query === null) return [];
  return query.split(/[^A-Za-z0-9]+/).filter((token) => token.length >= 2);
}

function adaptQueryBugAtlas(args: Record<string, unknown>, fixtures: AgentToolFixtures | undefined): AdapterOutcome {
  const terms = parseAtlasTerms(args);
  const store = fixtures?.bugAtlas ?? createBugAtlasStore(bugAtlasFixtureCorpus());
  const result = store.query({
    schemaVersion: ATLAS_QUERY_VERSION,
    terms,
    limit: clampAtlasLimit(typeof args['limit'] === 'number' ? args['limit'] : 5),
  });
  return {
    ok: true,
    source: 'HISTORICAL_RECORD',
    data: {
      integration: 'BUG_ATLAS',
      truncated: result.truncated,
      records: result.records.map((record) => ({
        bugId: record.bugId,
        product: record.product,
        repository: record.repository,
        symptom: record.symptom,
        provenance: record.provenance,
      })),
    },
  };
}

function adaptQuerySystemAtlas(args: Record<string, unknown>, fixtures: AgentToolFixtures | undefined): AdapterOutcome {
  const terms = parseAtlasTerms(args);
  const overlay = fixtures?.systemAtlas ?? createSyntheticSystemAtlasOverlay();
  const result = querySystemAtlas(overlay, createAtlasQuery(terms, typeof args['limit'] === 'number' ? args['limit'] : 5));
  return {
    ok: true,
    source: 'DOCUMENTATION',
    data: {
      integration: 'SYSTEM_ATLAS',
      truncated: result.truncated,
      records: result.records.map((record) => ({
        conceptId: record.conceptId,
        kind: record.kind,
        label: record.label,
        provenance: record.provenance,
      })),
    },
  };
}

function adaptRelatedHistoricalBugs(args: Record<string, unknown>, fixtures: AgentToolFixtures | undefined): AdapterOutcome {
  return adaptQueryBugAtlas(args, fixtures);
}

// --- entry point -------------------------------------------------------------

/**
 * Execute one validated CALL_TOOL intent against the frozen catalog.
 *
 * The tool id is read ONLY from `intent.toolId`. Keys inside
 * `intent.arguments` (including a nested `toolId` or embedded instruction
 * text such as "ignore previous instructions") are untrusted data: they are
 * scanned for the `injectionDetected` flag and never change which tool runs.
 */
export function executeAgentTool(intent: unknown, context: AgentToolExecutionContext): AgentToolResult {
  const rawArgs = isRecord((intent as { arguments?: unknown } | null)?.arguments)
    ? ((intent as { arguments: unknown }).arguments as Record<string, unknown>)
    : null;
  const injectionDetected = rawArgs === null ? false : scanForInjection(rawArgs);

  if (!isRecord(intent) || intent['kind'] !== 'CALL_TOOL') {
    return fail(null, 'UNSAFE_INTENT', 'only CALL_TOOL intents are executable', injectionDetected);
  }
  const typed = intent as Partial<AgentToolCallIntent>;
  const rawToolId = typed.toolId;
  if (typeof rawToolId !== 'string') {
    return fail(null, 'UNKNOWN_TOOL', 'tool id is not a string; failing closed', injectionDetected);
  }
  const descriptor = lookupAgentTool(rawToolId);
  if (descriptor === null) {
    return fail(rawToolId, 'UNKNOWN_TOOL', `unknown tool id: ${rawToolId}`, injectionDetected);
  }
  if (descriptor.mutationCapability !== 'NONE') {
    return fail(descriptor.id, 'UNSAFE_INTENT', 'tool is not mutation-free; refusing', injectionDetected);
  }
  const authorized = Array.isArray(context?.authorizedEnvironments) ? context.authorizedEnvironments : [];
  if (!authorized.includes(descriptor.environment)) {
    return fail(descriptor.id, 'UNAUTHORIZED_ENVIRONMENT', `tool requires ${descriptor.environment}; not in authorized environments`, injectionDetected);
  }
  if (!decideOwnerScope(descriptor.authorizationClass).allowed) {
    return fail(descriptor.id, 'UNSAFE_INTENT', 'owner scope denies this tool class', injectionDetected);
  }
  const args = isRecord(typed.arguments) ? (typed.arguments as Record<string, unknown>) : null;
  if (args === null) {
    return fail(descriptor.id, 'MALFORMED_ARGUMENTS', 'arguments must be an object', injectionDetected);
  }
  const fixtures = context.fixtures;

  let outcome: AdapterOutcome;
  switch (descriptor.id) {
    case 'INSPECT_SOURCE_SURFACE':
      outcome = adaptInspectSourceSurface(args, fixtures);
      break;
    case 'QUERY_SYSTEM_MAP':
      outcome = adaptQuerySystemMap(args, fixtures);
      break;
    case 'RETRIEVE_SANITIZED_EVIDENCE':
      outcome = adaptRetrieveSanitizedEvidence(args, fixtures);
      break;
    case 'ASK_DETERMINISTIC_ORACLE':
      outcome = adaptAskDeterministicOracle(args, fixtures);
      break;
    case 'COMPARE_OBSERVATIONS':
      outcome = adaptCompareObservations(args);
      break;
    case 'REQUEST_ROUTE_CONTRACT_PROOF':
      outcome = adaptRequestRouteContractProof(args, fixtures);
      break;
    case 'REQUEST_FINDING_PROPOSAL':
      outcome = adaptRequestFindingProposal(args);
      break;
    case 'RERUN_SAFE_REPRODUCTION':
      outcome = adaptRerunSafeReproduction(args);
      break;
    case 'REQUEST_BROWSER_OBSERVATION':
    case 'REQUEST_API_OBSERVATION':
      outcome = adaptDevObservation(descriptor.id);
      break;
    case 'QUERY_BUG_ATLAS':
      outcome = adaptQueryBugAtlas(args, fixtures);
      break;
    case 'QUERY_SYSTEM_ATLAS':
      outcome = adaptQuerySystemAtlas(args, fixtures);
      break;
    case 'REQUEST_RELATED_HISTORICAL_BUGS':
      outcome = adaptRelatedHistoricalBugs(args, fixtures);
      break;
    default:
      return fail(rawToolId, 'UNKNOWN_TOOL', `unhandled tool id: ${rawToolId}`, injectionDetected);
  }

  if (!outcome.ok) {
    return fail(descriptor.id, outcome.class, outcome.reason, injectionDetected);
  }
  const sanitized = sanitizeJsonText(outcome.data);
  const envelope = wrapUntrusted(outcome.source, sanitized.text);
  return {
    ok: true,
    toolId: descriptor.id,
    mutationCapability: 'NONE',
    envelopes: [envelope],
    evidenceRefs: [evidenceRefFor(sanitized.text)],
    data: outcome.data,
    injectionDetected,
  };
}

/** Protocol identity this runtime executes against (re-exported, not forked). */
export { AGENT_TOOL_PROTOCOL_VERSION };

/** Keep the lexical language vocabulary import live for fixture validation. */
export type { StaticLexicalLanguage };
