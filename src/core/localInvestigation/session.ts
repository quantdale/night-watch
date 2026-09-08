// ---------------------------------------------------------------------------
// W7 context lane — stateful provider-backed investigation tool session.
//
// One session wraps one frozen LocalInvestigationContext and exposes a single
// AgentToolExecutor. Providers stay behind the session: callers never touch
// them. Every reasoner-visible byte is sanitized into UNTRUSTED envelopes and
// every success mints a content-derived evidence ref that is tracked in the
// harness-only history returned by snapshot().
//
// Authority preserved: LOCAL only (DEV browser/API tools fail closed), no
// sibling writes, no secrets (sanitized before envelopes), no network (no
// provider may add any; this module spawns nothing). Provider `audit` payloads
// never enter tool envelopes, tool data, or history.
//
// Tool semantics reuse the existing engines (static lexer, system-map
// projections, Bug/System Atlas retrieval, and browser/API differential)
// without restoring fixture fallbacks: a BLOCKED provider is an explicit
// ADAPTER_UNAVAILABLE failure, never a synthetic answer.
// ---------------------------------------------------------------------------

import { ATLAS_QUERY_VERSION, clampAtlasLimit } from '../agentProtocol/atlas';
import type { ActionFailureDisposition } from '../agentProtocol/runtime';
import { lookupAgentTool, type AgentToolId } from '../agentProtocol/tools';
import type { UntrustedSource } from '../agentProtocol/untrusted';
import type { AgentToolCall, AgentToolExecutor, AgentToolResult } from '../agentRuntime/types';
import {
  evidenceRefFor,
  sanitizeJsonText,
  wrapUntrusted,
} from '../agentTools/sanitize';
import { decideOwnerScope } from '../policy/ownerScope';
import { tokenizeStaticSource, type StaticLexicalLanguage } from '../source/lexical';
import { sourceContentDigest, type SourceScanLanguage } from '../source/scanTypes';
import {
  projectCompany,
  queryCoverageGaps,
  queryFindingsAttachedToTopology,
  queryMutationCapableRoutes,
  queryUntestedReadOnlyRoutes,
  type SystemMapInput,
} from '../systemMap/projections';
import { createAtlasQuery, querySystemAtlas } from '../systemAtlas/overlay';
import { compareBrowserAndApi } from '../triage/differential';
import type { ApiObservation, BrowserObservation } from '../triage/types';
import type {
  DeterministicReproductionProvider,
  LocalEvidenceRecord,
  LocalFindingProposal,
  LocalInvestigationContext,
  LocalInvestigationHistory,
  LocalInvestigationToolSession,
  LocalObservedEvidence,
  LocalProviderBlockClass,
  LocalProviderResult,
  LocalReproductionReceipt,
  LocalReproductionRequest,
  LocalSourceDocument,
  LocalSourceIndex,
  LocalSourceObservation,
} from './types';
import {
  LOCAL_INVESTIGATION_HISTORY_VERSION,
  LOCAL_REPRODUCTION_RECEIPT_VERSION,
} from './types';
import type { BugAtlasStore } from '../bugAtlas/store';
import type { SystemAtlasOverlay } from '../systemAtlas/overlay';

export const LOCAL_INVESTIGATION_SESSION_VERSION = 'nightwatch.local-investigation-session.v1' as const;

/** Success result classes minted by this session (reproduction mirrors the provider verdict). */
export const LOCAL_SESSION_RESULT_CLASSES = [
  'SOURCE_INDEX',
  'SOURCE_FILE',
  'SYSTEM_MAP',
  'BUG_ATLAS',
  'SYSTEM_ATLAS',
  'EVIDENCE',
  'OBSERVATION_COMPARISON',
  'ROUTE_CONTRACT_PROOF',
  'FINDING_PROPOSAL',
  'REPRODUCED',
  'NOT_REPRODUCED',
  'ENVIRONMENT_BLOCKED',
  'NOT_AVAILABLE',
  'REPRODUCED_CURRENT_FAILURE',
  'INCONCLUSIVE',
] as const;

const SAFE_EVIDENCE_REF_RE = /^[A-Za-z0-9][A-Za-z0-9:._/-]{0,511}$/;
const MAX_REASONER_SOURCE_INDEX_ENTRIES = 32;

const MAX_PROJECTION_LIMIT = 200;
const DEFAULT_NODE_LIMIT = 50;
const DEFAULT_EDGE_LIMIT = 50;
const ATLAS_DEFAULT_LIMIT = 5;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function asLimit(value: unknown, fallback: number): number | null {
  if (value === undefined) return fallback;
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(MAX_PROJECTION_LIMIT, Math.trunc(value)));
}

const SALIENT_PATH_RE = /[A-Za-z0-9_][A-Za-z0-9_./-]*\.[A-Za-z]{2,5}(?![A-Za-z])/g;
const SALIENT_IDENTIFIER_RE = /[A-Za-z_][A-Za-z0-9_]{5,}/g;
const MAX_SALIENT_SYMBOLS = 4;
const MAX_SALIENT_CHARS = 64;
const MAX_SALIENT_SCAN_CHARS = 8_192;

/**
 * Deterministic salient symbols for working memory: path-like tokens first (in
 * first-appearance order), then the longest identifiers (length desc, then
 * lexicographic) so the same text always yields the same list. Extracted from
 * text that was already sanitized and already delivered to the reasoner, so
 * this exposes nothing new — it only lets a stateless turn recall what it saw.
 */
export function extractSalientSymbols(text: string): readonly string[] {
  if (typeof text !== 'string' || text.length === 0) return Object.freeze([]);
  const scanned = text.length > MAX_SALIENT_SCAN_CHARS ? text.slice(0, MAX_SALIENT_SCAN_CHARS) : text;
  const out: string[] = [];
  for (const match of scanned.match(SALIENT_PATH_RE) ?? []) {
    if (out.length >= MAX_SALIENT_SYMBOLS) break;
    if (match.length > MAX_SALIENT_CHARS || out.includes(match)) continue;
    out.push(match);
  }
  if (out.length < MAX_SALIENT_SYMBOLS) {
    const identifiers = [...new Set(scanned.match(SALIENT_IDENTIFIER_RE) ?? [])]
      .filter((item) => item.length <= MAX_SALIENT_CHARS && !out.includes(item))
      .sort((left, right) => (right.length - left.length) || (left < right ? -1 : left > right ? 1 : 0));
    for (const identifier of identifiers) {
      if (out.length >= MAX_SALIENT_SYMBOLS) break;
      out.push(identifier);
    }
  }
  return Object.freeze(out);
}

/**
 * W9 host-owned failure result. The disposition is set ONLY here, from
 * fail-closed session constants and provider block classes — never from
 * reasoner arguments or text. The runtime lane declares `disposition` on
 * AgentToolResult and folds it into the action log; successes never carry one,
 * so this helper is the single failure constructor.
 */
function failResult(resultClass: string, disposition: ActionFailureDisposition): AgentToolResult {
  return {
    ok: false,
    resultClass,
    evidenceRefs: [],
    outputBytes: 0,
    untrusted: [],
    disposition,
  } as AgentToolResult;
}

/**
 * Host-owned mapping from provider block class to failure disposition.
 * Thrown providers surface as DATA_BLOCKED via resolveProvider below, hence
 * transient: a throw may be a filesystem race, never a verdict.
 */
function dispositionForBlockClass(cls: LocalProviderBlockClass): ActionFailureDisposition {
  switch (cls) {
    case 'NOT_CONFIGURED':
    case 'SOURCE_UNAVAILABLE':
      return 'ENVIRONMENT_BLOCKED';
    case 'SOURCE_STALE':
    case 'DATA_BLOCKED':
      return 'TRANSIENT_RETRYABLE';
    case 'UNSAFE_INPUT':
      return 'DETERMINISTIC_TERMINAL';
  }
}

function outputBytesOf(data: unknown): number {
  try {
    return Buffer.byteLength(JSON.stringify(data) ?? 'null', 'utf8');
  } catch {
    return Buffer.byteLength('{"unserializable":true}', 'utf8');
  }
}

/** Resolve a provider result fail-closed: BLOCKED and thrown providers both become null. */
async function resolveProvider<T>(
  invoke: () => Promise<LocalProviderResult<T>>,
): Promise<{ readonly value: T } | { readonly blocked: true; readonly class: LocalProviderBlockClass; readonly reason: string }> {
  let result: LocalProviderResult<T>;
  try {
    result = await invoke();
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'PROVIDER_THREW';
    return { blocked: true, class: 'DATA_BLOCKED', reason: `provider threw; failing closed: ${detail}` };
  }
  if (result.status === 'BLOCKED') {
    return { blocked: true, class: result.class, reason: result.reason };
  }
  return { value: result.value };
}

function lexicalLanguageFor(language: SourceScanLanguage): StaticLexicalLanguage | null {
  switch (language) {
    case 'TYPESCRIPT':
      return 'TYPESCRIPT';
    case 'JAVASCRIPT':
      return 'JAVASCRIPT';
    case 'GO':
      return 'GO';
    default:
      return null;
  }
}

function parseAtlasTerms(args: Record<string, unknown>): readonly string[] | null {
  if (args['terms'] !== undefined) {
    if (!Array.isArray(args['terms']) || !args['terms'].every((item) => typeof item === 'string')) {
      return null;
    }
    return args['terms'] as readonly string[];
  }
  const query = asNonEmptyString(args['query']);
  if (query === null) return [];
  return query.split(/[^A-Za-z0-9]+/).filter((token) => token.length >= 2);
}

function readAtlasLimit(args: Record<string, unknown>): number {
  return typeof args['limit'] === 'number' ? args['limit'] : ATLAS_DEFAULT_LIMIT;
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
  if (
    typeof failed !== 'boolean' || !routeClass || !structuralState || !operationFamily ||
    !statusClass || !contentTypeClass || !oracleFingerprint || !runtimeCategory
  ) {
    return null;
  }
  return { failed, routeClass, structuralState, operationFamily, statusClass, contentTypeClass, oracleFingerprint, runtimeCategory };
}

function readApiObservation(value: unknown): { readonly api: ApiObservation | null; readonly malformed: boolean } {
  if (value === null || value === undefined) return { api: null, malformed: false };
  if (!isRecord(value)) return { api: null, malformed: true };
  const available = value['available'];
  const failed = value['failed'];
  const operationFamily = asNonEmptyString(value['operationFamily']);
  const statusClass = asNonEmptyString(value['statusClass']);
  const contentTypeClass = asNonEmptyString(value['contentTypeClass']);
  const parseCategory = asNonEmptyString(value['parseCategory']);
  const oracleFingerprint = asNonEmptyString(value['oracleFingerprint']);
  if (
    typeof available !== 'boolean' || typeof failed !== 'boolean' || !operationFamily ||
    !statusClass || !contentTypeClass || !parseCategory || !oracleFingerprint
  ) {
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

function readReproductionRequest(args: Record<string, unknown>): LocalReproductionRequest | null {
  const reproductionId = asNonEmptyString(args['reproductionId']);
  const sourcePath = asNonEmptyString(args['sourcePath']);
  const sourceEvidenceRef = asNonEmptyString(args['sourceEvidenceRef']);
  if (reproductionId === null || sourcePath === null || sourceEvidenceRef === null) return null;
  const candidateRaw = args['candidateId'];
  if (candidateRaw !== undefined && candidateRaw !== null && typeof candidateRaw !== 'string') return null;
  const observedRaw = args['observedEvidenceRefs'];
  if (observedRaw !== undefined && (!Array.isArray(observedRaw) || !observedRaw.every((item) => typeof item === 'string'))) {
    return null;
  }
  return {
    reproductionId,
    candidateId: typeof candidateRaw === 'string' ? candidateRaw : null,
    sourcePath,
    sourceEvidenceRef,
    observedEvidenceRefs: observedRaw === undefined ? [] : [...(observedRaw as readonly string[])],
  };
}

interface MutableHistory {
  readonly observedEvidence: LocalObservedEvidence[];
  readonly inspectedSources: LocalSourceObservation[];
  readonly sourceEvidenceByPath: Map<string, string>;
  readonly observedRecords: Map<string, { readonly source: UntrustedSource; readonly record: unknown }>;
  readonly reproductions: LocalReproductionReceipt[];
  readonly findingProposals: LocalFindingProposal[];
}

/**
 * Create one stateful tool session over the given provider context.
 * History is harness-only: snapshot() is never reasoner-visible.
 */
export function createLocalInvestigationToolSession(context: LocalInvestigationContext): LocalInvestigationToolSession {
  const history: MutableHistory = {
    observedEvidence: [],
    inspectedSources: [],
    sourceEvidenceByPath: new Map<string, string>(),
    observedRecords: new Map(),
    reproductions: [],
    findingProposals: [],
  };

  function observe(toolId: AgentToolId, source: UntrustedSource, sanitizedBytes: string): string {
    const evidenceRef = evidenceRefFor(sanitizedBytes);
    let record: unknown = sanitizedBytes;
    try {
      record = JSON.parse(sanitizedBytes);
    } catch {
      // Sanitized non-JSON text remains a bounded string record.
    }
    history.observedEvidence.push({ evidenceRef, toolId, source });
    history.observedRecords.set(evidenceRef, { source, record });
    return evidenceRef;
  }

  function succeed(toolId: AgentToolId, resultClass: string, data: unknown, source: UntrustedSource): AgentToolResult {
    const sanitized = sanitizeJsonText(data);
    const envelope = wrapUntrusted(source, sanitized.text);
    const evidenceRef = observe(toolId, source, sanitized.text);
    return {
      ok: true,
      resultClass,
      evidenceRefs: [evidenceRef],
      outputBytes: outputBytesOf(data),
      untrusted: [envelope],
    };
  }

  async function runSourceIndex(): Promise<AgentToolResult> {
    const resolved = await resolveProvider<LocalSourceIndex>(() => context.source.index());
    if ('blocked' in resolved) return failResult('ADAPTER_UNAVAILABLE', dispositionForBlockClass(resolved.class));
    const entries = resolved.value.entries.slice(0, MAX_REASONER_SOURCE_INDEX_ENTRIES);
    // W10. The provider already ordered the window by repository round-robin,
    // so a prefix of it is diverse rather than one repository's alphabet.
    // `surface` is positionally aligned with the provider's entries, so the
    // same prefix length keeps the annotation aligned with what was shown.
    const surface = resolved.value.surface?.slice(0, entries.length);
    const indexed = succeed('INSPECT_SOURCE_SURFACE', 'SOURCE_INDEX', {
      entries,
      total: resolved.value.total,
      truncated: resolved.value.truncated || entries.length < resolved.value.entries.length,
      ...(surface === undefined ? {} : { surface }),
    }, 'SOURCE_CODE');
    // The approved paths are already inside the envelope the reasoner just
    // received; reporting them as memory facts is what lets a later stateless
    // turn still know they exist. The capability annotation rides with them so
    // a later turn knows which of them can actually be verified BEFORE it
    // spends a reproduction on one that cannot.
    return {
      ...indexed,
      memory: {
        availableTargets: entries.map((entry) => entry.path),
        ...(surface === undefined ? {} : { reproductionSurface: surface }),
      },
    };
  }

  async function runSourceRead(path: string): Promise<AgentToolResult> {
    const resolved = await resolveProvider<LocalSourceDocument>(() => context.source.read(path));
    // A refused read still names the requested subject so working memory can
    // record the attempt as exhausted. The runtime never promotes a failed
    // subject to an approved target.
    if ('blocked' in resolved) return { ...failResult('ADAPTER_UNAVAILABLE', dispositionForBlockClass(resolved.class)), memory: { target: path } };
    const document = resolved.value;
    // The session never trusts provider bytes blindly: the digest must match
    // the exact text before anything is observed or grounded on it.
    if (sourceContentDigest(document.text) !== document.contentDigest) {
      return { ...failResult('ADAPTER_UNAVAILABLE', 'DETERMINISTIC_TERMINAL'), memory: { target: path } };
    }
    const lexical = lexicalLanguageFor(document.language);
    const tokens = lexical === null ? null : tokenizeStaticSource(document.text, lexical);
    const kindHistogram: Record<string, number> | null = tokens === null
      ? null
      : (() => {
        const histogram: Record<string, number> = {};
        for (const token of tokens) histogram[token.kind] = (histogram[token.kind] ?? 0) + 1;
        return histogram;
      })();
    const data = {
      path: document.path,
      repository: document.repository,
      relativePath: document.relativePath,
      sourceSha: document.sourceSha,
      language: document.language,
      byteCount: document.byteCount,
      contentDigest: document.contentDigest,
      charCount: document.text.length,
      tokenCount: tokens === null ? null : tokens.length,
      kindHistogram,
      text: document.text,
    };
    const sanitized = sanitizeJsonText(data);
    const envelope = wrapUntrusted('SOURCE_CODE', sanitized.text);
    const evidenceRef = observe('INSPECT_SOURCE_SURFACE', 'SOURCE_CODE', sanitized.text);
    history.inspectedSources.push({ path: document.path, evidenceRef });
    history.sourceEvidenceByPath.set(document.path, evidenceRef);
    return {
      ok: true,
      resultClass: 'SOURCE_FILE',
      evidenceRefs: [evidenceRef],
      outputBytes: outputBytesOf(data),
      untrusted: [envelope],
      memory: { target: document.path, salient: extractSalientSymbols(document.text) },
    };
  }

  async function loadSystemMap(): Promise<
    { readonly input: SystemMapInput } | { readonly blocked: true; readonly class: LocalProviderBlockClass }
  > {
    const resolved = await resolveProvider<SystemMapInput>(() => context.systemMap.load());
    if ('blocked' in resolved) return { blocked: true, class: resolved.class };
    return { input: resolved.value };
  }

  async function runSystemMap(args: Record<string, unknown>): Promise<AgentToolResult> {
    const loaded = await loadSystemMap();
    if ('blocked' in loaded) return failResult('ADAPTER_UNAVAILABLE', dispositionForBlockClass(loaded.class));
    const systemMap = loaded.input;
    const query = args['query'] === undefined ? 'COMPANY' : args['query'];
    if (typeof query !== 'string') return failResult('MALFORMED_ARGUMENTS', 'DETERMINISTIC_TERMINAL');
    const nodeLimit = asLimit(args['nodeLimit'], DEFAULT_NODE_LIMIT);
    const edgeLimit = asLimit(args['edgeLimit'], DEFAULT_EDGE_LIMIT);
    if (nodeLimit === null || edgeLimit === null) return failResult('MALFORMED_ARGUMENTS', 'DETERMINISTIC_TERMINAL');
    const limits = { nodeLimit, edgeLimit };
    switch (query) {
      case 'COMPANY':
        return succeed('QUERY_SYSTEM_MAP', 'SYSTEM_MAP', projectCompany(systemMap, limits), 'DOCUMENTATION');
      case 'COVERAGE_GAPS':
        return succeed('QUERY_SYSTEM_MAP', 'SYSTEM_MAP', queryCoverageGaps(systemMap, limits), 'DOCUMENTATION');
      case 'UNTESTED_READ_ONLY_ROUTES':
        return succeed('QUERY_SYSTEM_MAP', 'SYSTEM_MAP', queryUntestedReadOnlyRoutes(systemMap, limits), 'DOCUMENTATION');
      case 'MUTATION_CAPABLE_ROUTES':
        return succeed('QUERY_SYSTEM_MAP', 'SYSTEM_MAP', queryMutationCapableRoutes(systemMap, limits), 'DOCUMENTATION');
      case 'FINDINGS_ATTACHED_TO_TOPOLOGY':
        return succeed('QUERY_SYSTEM_MAP', 'SYSTEM_MAP', queryFindingsAttachedToTopology(systemMap, limits), 'DOCUMENTATION');
      default:
        return failResult('MALFORMED_ARGUMENTS', 'DETERMINISTIC_TERMINAL');
    }
  }

  async function runRouteContractProof(args: Record<string, unknown>): Promise<AgentToolResult> {
    const loaded = await loadSystemMap();
    if ('blocked' in loaded) return failResult('ADAPTER_UNAVAILABLE', dispositionForBlockClass(loaded.class));
    const operationId = typeof args['operationId'] === 'string' ? (args['operationId'] as string) : null;
    const routeTemplate = typeof args['routeTemplate'] === 'string' ? (args['routeTemplate'] as string) : null;
    const method = typeof args['method'] === 'string' ? (args['method'] as string) : null;
    if (operationId === null && routeTemplate === null) return failResult('MALFORMED_ARGUMENTS', 'DETERMINISTIC_TERMINAL');
    const match = loaded.input.operations.find((operation) =>
      operationId !== null
        ? operation.operationId === operationId
        : operation.routeTemplate === routeTemplate && (method === null || operation.method === method),
    );
    if (!match) return failResult('ADAPTER_UNAVAILABLE', 'DETERMINISTIC_TERMINAL');
    return succeed('REQUEST_ROUTE_CONTRACT_PROOF', 'ROUTE_CONTRACT_PROOF', {
      operationId: match.operationId,
      method: match.method,
      routeTemplate: match.routeTemplate,
      routeProof: match.routeProof,
      readOnlyClassification: match.readOnlyClassification,
      factCategory: match.factCategory,
    }, 'SOURCE_CODE');
  }

  async function runBugAtlas(toolId: AgentToolId, args: Record<string, unknown>): Promise<AgentToolResult> {
    const terms = parseAtlasTerms(args);
    if (terms === null) return failResult('MALFORMED_ARGUMENTS', 'DETERMINISTIC_TERMINAL');
    const resolved = await resolveProvider<BugAtlasStore>(() => context.bugAtlas.load());
    if ('blocked' in resolved) return failResult('ADAPTER_UNAVAILABLE', dispositionForBlockClass(resolved.class));
    // No synthetic fallback: a BLOCKED provider fails here, above.
    const result = resolved.value.query({
      schemaVersion: ATLAS_QUERY_VERSION,
      terms,
      limit: clampAtlasLimit(readAtlasLimit(args)),
    });
    return succeed(toolId, 'BUG_ATLAS', {
      integration: 'BUG_ATLAS',
      truncated: result.truncated,
      records: result.records.map((record) => ({
        bugId: record.bugId,
        product: record.product,
        repository: record.repository,
        symptom: record.symptom,
        provenance: record.provenance,
      })),
    }, 'HISTORICAL_RECORD');
  }

  async function runSystemAtlas(args: Record<string, unknown>): Promise<AgentToolResult> {
    const terms = parseAtlasTerms(args);
    if (terms === null) return failResult('MALFORMED_ARGUMENTS', 'DETERMINISTIC_TERMINAL');
    let query;
    try {
      query = createAtlasQuery(terms, readAtlasLimit(args));
    } catch {
      return failResult('MALFORMED_ARGUMENTS', 'DETERMINISTIC_TERMINAL');
    }
    const resolved = await resolveProvider<SystemAtlasOverlay>(() => context.systemAtlas.load());
    if ('blocked' in resolved) return failResult('ADAPTER_UNAVAILABLE', dispositionForBlockClass(resolved.class));
    // No synthetic fallback: a BLOCKED provider fails here, above.
    const result = querySystemAtlas(resolved.value, query);
    return succeed('QUERY_SYSTEM_ATLAS', 'SYSTEM_ATLAS', {
      integration: 'SYSTEM_ATLAS',
      truncated: result.truncated,
      records: result.records.map((record) => ({
        conceptId: record.conceptId,
        kind: record.kind,
        label: record.label,
        provenance: record.provenance,
      })),
    }, 'DOCUMENTATION');
  }

  async function runEvidence(args: Record<string, unknown>): Promise<AgentToolResult> {
    const evidenceRef = asNonEmptyString(args['evidenceRef']);
    if (evidenceRef === null) return failResult('MALFORMED_ARGUMENTS', 'DETERMINISTIC_TERMINAL');
    const observed = history.observedRecords.get(evidenceRef);
    if (observed !== undefined) {
      return succeed('RETRIEVE_SANITIZED_EVIDENCE', 'EVIDENCE', {
        evidenceRef,
        record: observed.record,
      }, observed.source);
    }
    const resolved = await resolveProvider<LocalEvidenceRecord>(() => context.evidence.get(evidenceRef));
    if ('blocked' in resolved) return failResult('ADAPTER_UNAVAILABLE', dispositionForBlockClass(resolved.class));
    // Re-sanitized on the way out: provider bytes are still untrusted.
    return succeed('RETRIEVE_SANITIZED_EVIDENCE', 'EVIDENCE', {
      evidenceRef,
      record: resolved.value.record,
    }, resolved.value.source);
  }

  async function runReproduction(args: Record<string, unknown>): Promise<AgentToolResult> {
    const request = readReproductionRequest(args);
    if (request === null) return failResult('MALFORMED_ARGUMENTS', 'DETERMINISTIC_TERMINAL');
    // Grounding gate: the source path must have been inspected through this
    // session AND the presented ref must be that inspection's observed source
    // evidence ref. Anything else never reaches the provider.
    const observedRef = history.sourceEvidenceByPath.get(request.sourcePath);
    if (observedRef === undefined || observedRef !== request.sourceEvidenceRef) {
      return failResult('UNSAFE_INTENT', 'DETERMINISTIC_TERMINAL');
    }
    const provider: DeterministicReproductionProvider = context.reproduction;
    const resolved = await resolveProvider(() => provider.run(request));
    if ('blocked' in resolved) return failResult('ADAPTER_UNAVAILABLE', dispositionForBlockClass(resolved.class));
    const result = resolved.value;
    if (
      result.evidenceRef !== null &&
      !SAFE_EVIDENCE_REF_RE.test(result.evidenceRef)
    ) {
      return failResult('ADAPTER_UNAVAILABLE', 'DETERMINISTIC_TERMINAL');
    }
    if (!result.provenanceRefs.every((ref) => SAFE_EVIDENCE_REF_RE.test(ref))) {
      return failResult('ADAPTER_UNAVAILABLE', 'DETERMINISTIC_TERMINAL');
    }
    history.reproductions.push({
      schemaVersion: LOCAL_REPRODUCTION_RECEIPT_VERSION,
      providerId: provider.providerId,
      reproductionId: request.reproductionId,
      candidateId: request.candidateId,
      sourcePath: request.sourcePath,
      sourceEvidenceRef: request.sourceEvidenceRef,
      evidenceRef: result.evidenceRef,
      verdict: result.verdict,
      preFix: result.preFix,
      postFix: result.postFix,
      provenanceRefs: [...result.provenanceRefs],
      // W9: harness-only proof, carried verbatim when the provider minted one.
      // Absent (not null) on historical and blocked results, preserving the
      // W7 receipt shape byte-identically. Never sanitized into an envelope:
      // only reasonerVisible below crosses to the reasoner.
      ...(result.currentSourceProof === null || result.currentSourceProof === undefined
        ? {}
        : { currentSourceProof: result.currentSourceProof }),
    });
    // Only reasonerVisible crosses to the reasoner; the proof, audit payload
    // and raw provider stderr stay harness-side (they are not even stored —
    // receipts carry no audit field by construction).
    const sanitized = sanitizeJsonText(result.reasonerVisible);
    const envelope = wrapUntrusted('LOG', sanitized.text);
    if (result.evidenceRef !== null) {
      history.observedEvidence.push({ evidenceRef: result.evidenceRef, toolId: 'RERUN_SAFE_REPRODUCTION', source: 'LOG' });
      let record: unknown = sanitized.text;
      try {
        record = JSON.parse(sanitized.text);
      } catch {
        // Sanitized non-JSON text remains a bounded string record.
      }
      history.observedRecords.set(result.evidenceRef, { source: 'LOG', record });
      return {
        ok: true,
        resultClass: result.verdict,
        evidenceRefs: [result.evidenceRef],
        outputBytes: outputBytesOf(result.reasonerVisible),
        untrusted: [envelope],
        memory: { target: request.sourcePath },
      };
    }
    return {
      ok: true,
      resultClass: result.verdict,
      evidenceRefs: [],
      outputBytes: outputBytesOf(result.reasonerVisible),
      untrusted: [envelope],
      memory: { target: request.sourcePath },
    };
  }

  function runFindingProposal(args: Record<string, unknown>): AgentToolResult {
    const candidateId = asNonEmptyString(args['candidateId']);
    const evidenceRefs = args['evidenceRefs'];
    if (candidateId === null) return failResult('MALFORMED_ARGUMENTS', 'DETERMINISTIC_TERMINAL');
    if (
      !Array.isArray(evidenceRefs) || evidenceRefs.length === 0 ||
      !evidenceRefs.every((ref) => typeof ref === 'string' && ref.length > 0)
    ) {
      return failResult('MALFORMED_ARGUMENTS', 'DETERMINISTIC_TERMINAL');
    }
    const refs = [...(evidenceRefs as readonly string[])];
    const draftRaw = args['draft'];
    let draft: Readonly<Record<string, unknown>> | null = null;
    if (draftRaw !== undefined) {
      if (!isRecord(draftRaw)) return failResult('MALFORMED_ARGUMENTS', 'DETERMINISTIC_TERMINAL');
      const sanitizedDraft = sanitizeJsonText(draftRaw);
      try {
        const parsed: unknown = JSON.parse(sanitizedDraft.text);
        if (!isRecord(parsed)) return failResult('MALFORMED_ARGUMENTS', 'DETERMINISTIC_TERMINAL');
        draft = { ...parsed };
      } catch {
        return failResult('MALFORMED_ARGUMENTS', 'DETERMINISTIC_TERMINAL');
      }
    }
    // Capture-only: evidence membership and reproduction are checked by the
    // mechanical admission gate. This tool never builds a dossier and never
    // trusts model-supplied reproduction counts or authority.
    history.findingProposals.push({ candidateId, evidenceRefs: refs, draft });
    const data = {
      candidateId,
      evidenceRefs: refs,
      status: 'PROPOSAL_CAPTURED_NO_AUTHORITY',
      authority: {
        humanReviewRequired: true,
        externalPublication: 'PROHIBITED',
        autoFile: false,
        autoLeslie: false,
        autoSlack: false,
      },
    };
    return {
      ok: true,
      resultClass: 'FINDING_PROPOSAL',
      evidenceRefs: [],
      outputBytes: outputBytesOf(data),
      untrusted: [wrapUntrusted('HISTORICAL_RECORD', sanitizeJsonText(data).text)],
      memory: { target: candidateId },
    };
  }

  function runCompare(args: Record<string, unknown>): AgentToolResult {
    const browser = readBrowserObservation(args['browser']);
    if (browser === null) return failResult('MALFORMED_ARGUMENTS', 'DETERMINISTIC_TERMINAL');
    const parsedApi = readApiObservation(args['api'] ?? null);
    if (parsedApi.malformed) return failResult('MALFORMED_ARGUMENTS', 'DETERMINISTIC_TERMINAL');
    return succeed('COMPARE_OBSERVATIONS', 'OBSERVATION_COMPARISON', compareBrowserAndApi(browser, parsedApi.api), 'API_RESPONSE');
  }

  const executor: AgentToolExecutor = {
    async execute(call: AgentToolCall): Promise<AgentToolResult> {
      const descriptor = lookupAgentTool(call.toolId);
      if (descriptor === null) return failResult('UNKNOWN_TOOL', 'DETERMINISTIC_TERMINAL');
      if (descriptor.mutationCapability !== 'NONE') return failResult('UNSAFE_INTENT', 'DETERMINISTIC_TERMINAL');
      // This session is LOCAL-only by construction.
      if (descriptor.environment !== 'LOCAL') return failResult('UNAUTHORIZED_ENVIRONMENT', 'DETERMINISTIC_TERMINAL');
      if (!decideOwnerScope(descriptor.authorizationClass).allowed) return failResult('UNSAFE_INTENT', 'DETERMINISTIC_TERMINAL');
      const args = isRecord(call.arguments) ? (call.arguments as Record<string, unknown>) : null;
      if (args === null) return failResult('MALFORMED_ARGUMENTS', 'DETERMINISTIC_TERMINAL');
      switch (descriptor.id) {
        case 'INSPECT_SOURCE_SURFACE': {
          const requestedPath = typeof args['path'] === 'string' ? (args['path'] as string) : null;
          if (requestedPath === null) return runSourceIndex();
          if (requestedPath.length === 0) return failResult('MALFORMED_ARGUMENTS', 'DETERMINISTIC_TERMINAL');
          return runSourceRead(requestedPath);
        }
        case 'QUERY_SYSTEM_MAP':
          return runSystemMap(args);
        case 'QUERY_BUG_ATLAS':
          return runBugAtlas(descriptor.id, args);
        case 'REQUEST_RELATED_HISTORICAL_BUGS':
          return runBugAtlas(descriptor.id, args);
        case 'QUERY_SYSTEM_ATLAS':
          return runSystemAtlas(args);
        case 'RETRIEVE_SANITIZED_EVIDENCE':
          return runEvidence(args);
        case 'RERUN_SAFE_REPRODUCTION':
          return runReproduction(args);
        case 'REQUEST_FINDING_PROPOSAL':
          return runFindingProposal(args);
        case 'REQUEST_ROUTE_CONTRACT_PROOF':
          return runRouteContractProof(args);
        case 'COMPARE_OBSERVATIONS':
          return runCompare(args);
        case 'ASK_DETERMINISTIC_ORACLE':
          // No oracle provider exists in the frozen context: fail closed.
          return failResult('ADAPTER_UNAVAILABLE', 'DETERMINISTIC_TERMINAL');
        case 'REQUEST_BROWSER_OBSERVATION':
        case 'REQUEST_API_OBSERVATION':
          return failResult('UNAUTHORIZED_ENVIRONMENT', 'DETERMINISTIC_TERMINAL');
        default:
          return failResult('UNKNOWN_TOOL', 'DETERMINISTIC_TERMINAL');
      }
    },
  };

  return {
    executor,
    snapshot(): LocalInvestigationHistory {
      return {
        schemaVersion: LOCAL_INVESTIGATION_HISTORY_VERSION,
        observedEvidence: history.observedEvidence.map((entry) => ({ ...entry })),
        inspectedSources: history.inspectedSources.map((entry) => ({ ...entry })),
        reproductions: history.reproductions.map((entry) => ({ ...entry, provenanceRefs: [...entry.provenanceRefs] })),
        findingProposals: history.findingProposals.map((entry) => ({
          ...entry,
          evidenceRefs: [...entry.evidenceRefs],
          draft: entry.draft === null ? null : { ...entry.draft },
        })),
      };
    },
  };
}

/** End of session module. Provider vocabulary lives in ./types. */
