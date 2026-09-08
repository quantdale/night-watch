import type {
  ApiErrorKind,
  HealthSnapshot,
  MetaSnapshot,
  OverviewSnapshot,
  ReadinessSnapshot,
  ExecutionGraphSnapshot,
  CampaignCoverageSnapshot,
  CampaignSummarySnapshot,
  FindingsSnapshot,
  ReviewerSnapshot,
  RunDetailSnapshot,
  RunListSnapshot,
  SafetySnapshot,
  SourceSummarySnapshot,
  SourceGraphSnapshot,
  SourceSurfacesSnapshot,
  SystemMapLevelSegment,
  SystemMapQuerySegment,
  SystemMapSnapshot,
  TimelineSnapshot,
} from './types';

export const CONTROL_CENTER_API_PATHS = Object.freeze({
  health: '/healthz',
  meta: '/api/v1/meta',
  readiness: '/api/v1/readiness',
  safety: '/api/v1/safety',
  sourceSummary: '/api/v1/source/summary',
  campaignSummary: '/api/v1/campaign/summary',
  campaignCoverage: '/api/v1/campaign/coverage',
  sourceSurfaces: '/api/v1/source/surfaces',
  sourceGraph: '/api/v1/source/graph',
  findings: '/api/v1/findings',
  reviewer: '/api/v1/reviewer',
  reviewerDecision: '/api/v1/reviewer/decision',
  /** C-15c. Explicitly v2: v1 is never reinterpreted. */
  systemMap: '/api/v2/system-map',
});

export class ControlCenterApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;

  constructor(kind: ApiErrorKind, status: number | null = null) {
    super(`CONTROL_CENTER_${kind}_ERROR`);
    this.name = 'ControlCenterApiError';
    this.kind = kind;
    this.status = status;
  }
}

/**
 * NW-11. An exact per-endpoint contract.
 *
 * `isSnapshot` used to accept any object whose `schemaVersion` merely STARTED
 * WITH `nightwatch.control-center.` and then cast the payload to `T`. So a
 * findings response satisfied the reviewer check, a `.v1` payload satisfied a
 * `.v3` reader, and any object with a plausible prefix reached render logic
 * as a fully-typed snapshot. The version is now compared exactly and the
 * fields this client actually reads must be present.
 *
 * Deliberately not a whole-schema validator: unknown ADDED fields are
 * accepted, because rejecting them would break forward compatibility with a
 * server that grew a field. What is checked is the exact version plus the
 * owned required fields — enough that a wrong shape cannot be mistaken for a
 * right one.
 */
const NS = 'nightwatch.control-center';

interface SnapshotContract {
  readonly schemaVersion: string;
  readonly required: readonly string[];
}

const contract = (version: string, required: readonly string[]): SnapshotContract => ({
  schemaVersion: `${NS}.${version}`,
  required,
});

export const CONTROL_CENTER_SNAPSHOT_CONTRACTS = Object.freeze({
  health: contract('health.v1', ['status']),
  meta: contract('meta.v1', ['apiVersion', 'service', 'scope', 'readOnly', 'features', 'limits']),
  readiness: contract('readiness.v1', ['scope']),
  safety: contract('safety.v1', []),
  sourceSummary: contract('source-summary.v3', ['state', 'repositoryCount']),
  campaignSummary: contract('campaign.v1', ['planState', 'counts']),
  campaignCoverage: contract('campaign-coverage.v1', ['items', 'page', 'fullyCoveredContractCount']),
  sourceSurfaces: contract('source-surfaces.v1', ['items', 'page']),
  sourceGraph: contract('source-graph.v1', ['nodes']),
  findings: contract('findings.v1', ['state', 'items', 'page']),
  reviewer: contract('reviewer.v1', ['state', 'items', 'page', 'finalVerdictAuthority', 'organizationalAuthority']),
  runs: contract('run-list.v1', ['items', 'page']),
  runDetail: contract('run-detail.v1', ['run']),
  timeline: contract('timeline.v1', ['events']),
  executionGraph: contract('execution-graph.v1', ['nodes']),
  systemMap: contract('system-map.v2', []),
});

/**
 * Own-key membership only. An inherited `items` from `Object.prototype` is
 * not a field the server sent, and `in` would have accepted one.
 */
function hasOwnField(value: Record<string, unknown>, field: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, field);
}

function validateSnapshot(payload: unknown, expected: SnapshotContract): boolean {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return false;
  const record = payload as Record<string, unknown>;
  if (!hasOwnField(record, 'schemaVersion') || record.schemaVersion !== expected.schemaVersion) return false;
  for (const field of expected.required) {
    if (!hasOwnField(record, field)) return false;
  }
  return true;
}

/**
 * NW-11. One finite deadline per request, composed with the caller's own
 * cancellation.
 *
 * `fetch` received no signal at all, so an effect's cleanup suppressed the
 * state update while the transport kept running, and a hung request had no
 * termination at all. The deadline and the caller's signal now abort the same
 * operation, and the timer is disposed on every path.
 */
export const CONTROL_CENTER_REQUEST_DEADLINE_MS = 15_000;

async function fetchSnapshot<T>(
  path: string,
  expected: SnapshotContract,
  signal?: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  const abortForCaller = (): void => controller.abort();
  if (signal !== undefined) {
    if (signal.aborted) throw new ControlCenterApiError('ABORTED');
    signal.addEventListener('abort', abortForCaller, { once: true });
  }
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, CONTROL_CENTER_REQUEST_DEADLINE_MS);
  try {
    let response: Response;
    try {
      response = await fetch(path, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        credentials: 'omit',
        cache: 'no-store',
        redirect: 'error',
        signal: controller.signal,
      });
    } catch {
      if (timedOut) throw new ControlCenterApiError('TIMEOUT');
      if (controller.signal.aborted) throw new ControlCenterApiError('ABORTED');
      throw new ControlCenterApiError('NETWORK');
    }
    if (!response.ok) throw new ControlCenterApiError('HTTP', response.status);
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      if (timedOut) throw new ControlCenterApiError('TIMEOUT');
      if (controller.signal.aborted) throw new ControlCenterApiError('ABORTED');
      throw new ControlCenterApiError('INVALID_RESPONSE');
    }
    if (!validateSnapshot(payload, expected)) throw new ControlCenterApiError('INVALID_RESPONSE');
    return payload as T;
  } finally {
    clearTimeout(timer);
    if (signal !== undefined) signal.removeEventListener('abort', abortForCaller);
  }
}

/** The canonical local review decisions. The UI offers these and nothing else. */
export const REVIEW_DECISIONS = Object.freeze([
  'ACCEPT_EVIDENCE',
  'REQUEST_FOLLOWUP',
  'MARK_INSUFFICIENT',
  'MARK_DUPLICATE_CANDIDATE',
  'SUPERSEDE',
] as const);

export type ReviewDecision = (typeof REVIEW_DECISIONS)[number];

export interface ReviewDecisionResponse {
  readonly result: string;
  readonly reviewIdentity: string | null;
  readonly organizationalAuthority: string;
}

/**
 * Record one owner-local review decision.
 *
 * The `reviewIdentity` is the one the surface was SHOWN. If the artifacts
 * moved since, the server recomputes a different identity and answers
 * BINDING_MISMATCH rather than binding the decision to a state the reviewer
 * never saw. The UI reports that rather than retrying with a fresh identity,
 * because a silent retry would record a decision about something else.
 */
export async function submitReviewDecision(input: {
  readonly findingId: string;
  readonly reviewIdentity: string;
  readonly decision: ReviewDecision;
  readonly rationale?: string;
}): Promise<ReviewDecisionResponse> {
  let response: Response;
  try {
    response = await fetch(CONTROL_CENTER_API_PATHS.reviewerDecision, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        // Never settable by a cross-origin form or navigation.
        'X-Nightwatch-Local-Review': '1',
      },
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'error',
      body: JSON.stringify(input),
    });
  } catch {
    throw new ControlCenterApiError('NETWORK');
  }
  if (!response.ok) throw new ControlCenterApiError('HTTP', response.status);
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ControlCenterApiError('INVALID_RESPONSE');
  }
  if (payload === null || typeof payload !== 'object') throw new ControlCenterApiError('INVALID_RESPONSE');
  const body = payload as Record<string, unknown>;
  if (typeof body.result !== 'string') throw new ControlCenterApiError('INVALID_RESPONSE');
  // A local decision that came back claiming organizational authority is a
  // breach, not a success. It is refused at the client too.
  if (body.organizationalAuthority !== 'NONE_LOCAL_REVIEW_ONLY') throw new ControlCenterApiError('INVALID_RESPONSE');
  return {
    result: body.result,
    reviewIdentity: typeof body.reviewIdentity === 'string' ? body.reviewIdentity : null,
    organizationalAuthority: body.organizationalAuthority,
  };
}

/**
 * What a readback found about one submitted decision.
 *
 * NW-09. A POST whose response never arrived, or arrived unreadable, is
 * UNCERTAIN: the decision may or may not have been recorded. Retrying is not
 * an option — the store refuses a second decision on the same binding, so a
 * retry either duplicates the request or returns ALREADY_DECIDED, and the
 * operator still cannot tell which of the two attempts recorded it. So the
 * client asks the server what it now holds for that exact review identity.
 */
export type ReviewReadbackOutcome =
  | { readonly state: 'RECORDED'; readonly decision: string }
  | { readonly state: 'NOT_RECORDED' }
  | { readonly state: 'UNKNOWN' };

/**
 * Read back one submitted decision by review identity. Never writes, never
 * retries the POST.
 */
export async function readBackReviewDecision(input: {
  readonly findingId: string;
  readonly reviewIdentity: string;
}): Promise<ReviewReadbackOutcome> {
  let snapshot: ReviewerSnapshot;
  try {
    snapshot = await loadReviewer();
  } catch {
    return { state: 'UNKNOWN' };
  }
  const item = snapshot.items.find((candidate) => candidate.findingId === input.findingId);
  if (item === undefined) return { state: 'UNKNOWN' };
  // Identity must match exactly. A decision recorded against a DIFFERENT
  // identity is not this submission, and reporting it as such would be the
  // same mistake as retrying with a fresh identity.
  if (item.reviewIdentity !== input.reviewIdentity) return { state: 'UNKNOWN' };
  const value = item.localReview.value;
  if (value === null || value.decision === null) return { state: 'NOT_RECORDED' };
  return { state: 'RECORDED', decision: value.decision };
}

export function loadOverview(signal?: AbortSignal): Promise<OverviewSnapshot> {
  const C = CONTROL_CENTER_SNAPSHOT_CONTRACTS;
  const health = fetchSnapshot<HealthSnapshot>(CONTROL_CENTER_API_PATHS.health, C.health, signal);
  const meta = fetchSnapshot<MetaSnapshot>(CONTROL_CENTER_API_PATHS.meta, C.meta, signal);
  const readiness = fetchSnapshot<ReadinessSnapshot>(CONTROL_CENTER_API_PATHS.readiness, C.readiness, signal);
  const safety = fetchSnapshot<SafetySnapshot>(CONTROL_CENTER_API_PATHS.safety, C.safety, signal);
  const source = fetchSnapshot<SourceSummarySnapshot>(CONTROL_CENTER_API_PATHS.sourceSummary, C.sourceSummary, signal);
  return Promise.all([health, meta, readiness, safety, source]).then(([healthSnapshot, metaSnapshot, readinessSnapshot, safetySnapshot, sourceSnapshot]) => ({
    health: healthSnapshot,
    meta: metaSnapshot,
    readiness: readinessSnapshot,
    safety: safetySnapshot,
    source: sourceSnapshot,
  }));
}

function safePathId(value: string): string | null {
  return /^[A-Za-z0-9:_~.-]{1,96}$/.test(value) ? value : null;
}

/**
 * NW-10. Serialise an opaque continuation cursor.
 *
 * The cursor is the server's own token echoed back verbatim, screened against
 * the same shape the server accepts so a tampered or malformed value is
 * dropped here rather than producing a rejected request. An omitted cursor
 * means the first page, which is what every loader did unconditionally
 * before.
 */
function cursorParam(cursor: string | null): string {
  if (cursor === null || !/^[A-Za-z0-9._~-]{1,128}$/.test(cursor)) return '';
  return `&cursor=${encodeURIComponent(cursor)}`;
}

export function loadRuns(limit = 20, cursor: string | null = null, signal?: AbortSignal): Promise<RunListSnapshot> {
  const boundedLimit = Number.isInteger(limit) && limit > 0 && limit <= 50 ? limit : 20;
  return fetchSnapshot<RunListSnapshot>(`/api/v1/runs?limit=${boundedLimit}${cursorParam(cursor)}`, CONTROL_CENTER_SNAPSHOT_CONTRACTS.runs, signal);
}

export function loadRunDetail(runId: string, signal?: AbortSignal): Promise<RunDetailSnapshot> {
  const safeId = safePathId(runId);
  if (safeId === null) return Promise.reject(new ControlCenterApiError('INVALID_RESPONSE'));
  return fetchSnapshot<RunDetailSnapshot>(`/api/v1/runs/${safeId}`, CONTROL_CENTER_SNAPSHOT_CONTRACTS.runDetail, signal);
}

export function loadTimeline(runId: string, afterSeq = 0, signal?: AbortSignal): Promise<TimelineSnapshot> {
  const safeId = safePathId(runId);
  const boundedSeq = Number.isInteger(afterSeq) && afterSeq >= 0 && afterSeq <= 10_000 ? afterSeq : 0;
  if (safeId === null) return Promise.reject(new ControlCenterApiError('INVALID_RESPONSE'));
  return fetchSnapshot<TimelineSnapshot>(`/api/v1/runs/${safeId}/timeline?afterSeq=${boundedSeq}&limit=100`, CONTROL_CENTER_SNAPSHOT_CONTRACTS.timeline, signal);
}

export function loadExecutionGraph(runId: string, signal?: AbortSignal): Promise<ExecutionGraphSnapshot> {
  const safeId = safePathId(runId);
  if (safeId === null) return Promise.reject(new ControlCenterApiError('INVALID_RESPONSE'));
  return fetchSnapshot<ExecutionGraphSnapshot>(`/api/v1/runs/${safeId}/execution-graph`, CONTROL_CENTER_SNAPSHOT_CONTRACTS.executionGraph, signal);
}

export function loadCampaignSummary(signal?: AbortSignal): Promise<CampaignSummarySnapshot> {
  return fetchSnapshot<CampaignSummarySnapshot>(CONTROL_CENTER_API_PATHS.campaignSummary, CONTROL_CENTER_SNAPSHOT_CONTRACTS.campaignSummary, signal);
}

export function loadCampaignCoverage(limit = 50, cursor: string | null = null, signal?: AbortSignal): Promise<CampaignCoverageSnapshot> {
  const boundedLimit = Number.isInteger(limit) && limit > 0 && limit <= 50 ? limit : 50;
  return fetchSnapshot<CampaignCoverageSnapshot>(`${CONTROL_CENTER_API_PATHS.campaignCoverage}?limit=${boundedLimit}${cursorParam(cursor)}`, CONTROL_CENTER_SNAPSHOT_CONTRACTS.campaignCoverage, signal);
}

export function loadSourceSurfaces(limit = 50, cursor: string | null = null, signal?: AbortSignal): Promise<SourceSurfacesSnapshot> {
  const boundedLimit = Number.isInteger(limit) && limit > 0 && limit <= 50 ? limit : 50;
  return fetchSnapshot<SourceSurfacesSnapshot>(`${CONTROL_CENTER_API_PATHS.sourceSurfaces}?limit=${boundedLimit}${cursorParam(cursor)}`, CONTROL_CENTER_SNAPSHOT_CONTRACTS.sourceSurfaces, signal);
}

export function loadSourceGraph(surfaceId: string | null, depth = 2, signal?: AbortSignal): Promise<SourceGraphSnapshot> {
  const boundedDepth = Number.isInteger(depth) && depth >= 0 && depth <= 4 ? depth : 2;
  const params = new URLSearchParams({ depth: String(boundedDepth) });
  if (surfaceId !== null) {
    const safeId = safePathId(surfaceId);
    if (safeId === null) return Promise.reject(new ControlCenterApiError('INVALID_RESPONSE'));
    params.set('surface', safeId);
  }
  return fetchSnapshot<SourceGraphSnapshot>(`${CONTROL_CENTER_API_PATHS.sourceGraph}?${params.toString()}`, CONTROL_CENTER_SNAPSHOT_CONTRACTS.sourceGraph, signal);
}

export function loadReviewer(limit = 50, cursor: string | null = null, signal?: AbortSignal): Promise<ReviewerSnapshot> {
  const boundedLimit = Number.isInteger(limit) && limit > 0 && limit <= 50 ? limit : 50;
  return fetchSnapshot<ReviewerSnapshot>(`${CONTROL_CENTER_API_PATHS.reviewer}?limit=${boundedLimit}${cursorParam(cursor)}`, CONTROL_CENTER_SNAPSHOT_CONTRACTS.reviewer, signal);
}

export function loadFindings(limit = 50, cursor: string | null = null, signal?: AbortSignal): Promise<FindingsSnapshot> {
  const boundedLimit = Number.isInteger(limit) && limit > 0 && limit <= 50 ? limit : 50;
  return fetchSnapshot<FindingsSnapshot>(`${CONTROL_CENTER_API_PATHS.findings}?limit=${boundedLimit}${cursorParam(cursor)}`, CONTROL_CENTER_SNAPSHOT_CONTRACTS.findings, signal);
}

const CONTROL_CENTER_NOTIFICATION_TYPES = ['readiness.changed', 'safety.changed', 'run.updated', 'run.completed', 'campaign.snapshot.changed', 'source.snapshot.changed', 'findings.snapshot.changed'] as const;

/** Notifications are advisory. Consumers use them only to trigger GET refreshes. */
/**
 * Load ONE disclosure level. The browser asks for the level it is showing and
 * nothing more — there is no whole-company payload cached client-side, which
 * is the entire point of progressive disclosure.
 */
export function loadSystemMapLevel(level: SystemMapLevelSegment, focusId: string | null, signal?: AbortSignal): Promise<SystemMapSnapshot> {
  const search = focusId === null ? '' : `?focus=${encodeURIComponent(focusId)}`;
  return fetchSnapshot<SystemMapSnapshot>(`${CONTROL_CENTER_API_PATHS.systemMap}/${level}${search}`, CONTROL_CENTER_SNAPSHOT_CONTRACTS.systemMap, signal);
}

/** Run one of the eight operator queries. */
export function loadSystemMapQuery(query: SystemMapQuerySegment, focusId: string | null, signal?: AbortSignal): Promise<SystemMapSnapshot> {
  const search = focusId === null ? '' : `?focus=${encodeURIComponent(focusId)}`;
  return fetchSnapshot<SystemMapSnapshot>(`${CONTROL_CENTER_API_PATHS.systemMap}/query/${query}${search}`, CONTROL_CENTER_SNAPSHOT_CONTRACTS.systemMap, signal);
}

/**
 * NW-11. The coalescing window for invalidation bursts.
 *
 * Every notification used to increment the shared refresh key directly, so a
 * burst of N events caused N refreshes — each of which refetches the overview
 * plus the current view. One server-side snapshot change can emit several
 * notifications, so a burst amplified local load in proportion to the
 * server's chattiness.
 *
 * The policy is leading-edge plus one trailing follow-up: the first event in
 * a window invalidates immediately, so the UI stays responsive, and anything
 * that arrives during the window collapses into exactly ONE further
 * invalidation when it closes. A burst of any size inside one window
 * therefore costs at most 2 invalidations, and a steady stream costs at most
 * one per window.
 */
export const CONTROL_CENTER_INVALIDATION_WINDOW_MS = 250;

export function subscribeToControlCenterEvents(
  onInvalidate: () => void,
  options: { readonly windowMs?: number } = {},
): () => void {
  if (typeof window === 'undefined' || typeof window.EventSource !== 'function') return () => undefined;
  let source: EventSource;
  try {
    source = new window.EventSource('/api/v1/events');
  } catch {
    return () => undefined;
  }
  const windowMs = typeof options.windowMs === 'number' && options.windowMs >= 0 && options.windowMs <= 10_000
    ? options.windowMs
    : CONTROL_CENTER_INVALIDATION_WINDOW_MS;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let dirty = false;
  let closed = false;

  const closeWindow = (): void => {
    timer = null;
    if (closed || !dirty) return;
    dirty = false;
    onInvalidate();
    // One more window, so a continuing stream keeps costing one invalidation
    // per window rather than one per event.
    timer = setTimeout(closeWindow, windowMs);
  };

  const invalidate = (): void => {
    if (closed) return;
    if (timer !== null) {
      dirty = true;
      return;
    }
    onInvalidate();
    timer = setTimeout(closeWindow, windowMs);
  };

  const listeners = CONTROL_CENTER_NOTIFICATION_TYPES.map((type) => {
    const listener = (): void => invalidate();
    source.addEventListener(type, listener);
    return { type, listener };
  });
  source.onerror = (): void => undefined;
  return () => {
    closed = true;
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    dirty = false;
    for (const { type, listener } of listeners) source.removeEventListener(type, listener);
    source.close();
  };
}

export function apiErrorLabel(error: unknown): string {
  if (error instanceof ControlCenterApiError) {
    if (error.kind === 'NETWORK') return 'The local service is not reachable.';
    if (error.kind === 'HTTP') return 'The local service returned an unavailable response.';
    if (error.kind === 'TIMEOUT') return 'The local service did not answer within the request deadline.';
    if (error.kind === 'ABORTED') return 'The request was superseded before it completed.';
    return 'The local service returned an invalid snapshot.';
  }
  return 'The local snapshot could not be loaded.';
}
