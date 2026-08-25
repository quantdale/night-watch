import type {
  ApiErrorKind,
  HealthSnapshot,
  MetaSnapshot,
  OverviewSnapshot,
  ReadinessSnapshot,
  ExecutionGraphSnapshot,
  CampaignCoverageSnapshot,
  CampaignSummarySnapshot,
  RunDetailSnapshot,
  RunListSnapshot,
  SafetySnapshot,
  SourceSummarySnapshot,
  SourceGraphSnapshot,
  SourceSurfacesSnapshot,
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

function isSnapshot(value: unknown): value is { readonly schemaVersion: string } {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const schemaVersion = (value as { schemaVersion?: unknown }).schemaVersion;
  return typeof schemaVersion === 'string' && schemaVersion.startsWith('nightwatch.control-center.');
}

async function fetchSnapshot<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'error',
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
  if (!isSnapshot(payload)) throw new ControlCenterApiError('INVALID_RESPONSE');
  return payload as T;
}

export function loadOverview(): Promise<OverviewSnapshot> {
  const health = fetchSnapshot<HealthSnapshot>(CONTROL_CENTER_API_PATHS.health);
  const meta = fetchSnapshot<MetaSnapshot>(CONTROL_CENTER_API_PATHS.meta);
  const readiness = fetchSnapshot<ReadinessSnapshot>(CONTROL_CENTER_API_PATHS.readiness);
  const safety = fetchSnapshot<SafetySnapshot>(CONTROL_CENTER_API_PATHS.safety);
  const source = fetchSnapshot<SourceSummarySnapshot>(CONTROL_CENTER_API_PATHS.sourceSummary);
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

export function loadRuns(limit = 20): Promise<RunListSnapshot> {
  const boundedLimit = Number.isInteger(limit) && limit > 0 && limit <= 50 ? limit : 20;
  return fetchSnapshot<RunListSnapshot>(`/api/v1/runs?limit=${boundedLimit}`);
}

export function loadRunDetail(runId: string): Promise<RunDetailSnapshot> {
  const safeId = safePathId(runId);
  if (safeId === null) return Promise.reject(new ControlCenterApiError('INVALID_RESPONSE'));
  return fetchSnapshot<RunDetailSnapshot>(`/api/v1/runs/${safeId}`);
}

export function loadTimeline(runId: string, afterSeq = 0): Promise<TimelineSnapshot> {
  const safeId = safePathId(runId);
  const boundedSeq = Number.isInteger(afterSeq) && afterSeq >= 0 && afterSeq <= 10_000 ? afterSeq : 0;
  if (safeId === null) return Promise.reject(new ControlCenterApiError('INVALID_RESPONSE'));
  return fetchSnapshot<TimelineSnapshot>(`/api/v1/runs/${safeId}/timeline?afterSeq=${boundedSeq}&limit=100`);
}

export function loadExecutionGraph(runId: string): Promise<ExecutionGraphSnapshot> {
  const safeId = safePathId(runId);
  if (safeId === null) return Promise.reject(new ControlCenterApiError('INVALID_RESPONSE'));
  return fetchSnapshot<ExecutionGraphSnapshot>(`/api/v1/runs/${safeId}/execution-graph`);
}

export function loadCampaignSummary(): Promise<CampaignSummarySnapshot> {
  return fetchSnapshot<CampaignSummarySnapshot>(CONTROL_CENTER_API_PATHS.campaignSummary);
}

export function loadCampaignCoverage(limit = 50): Promise<CampaignCoverageSnapshot> {
  const boundedLimit = Number.isInteger(limit) && limit > 0 && limit <= 50 ? limit : 50;
  return fetchSnapshot<CampaignCoverageSnapshot>(`${CONTROL_CENTER_API_PATHS.campaignCoverage}?limit=${boundedLimit}`);
}

export function loadSourceSurfaces(limit = 50): Promise<SourceSurfacesSnapshot> {
  const boundedLimit = Number.isInteger(limit) && limit > 0 && limit <= 50 ? limit : 50;
  return fetchSnapshot<SourceSurfacesSnapshot>(`${CONTROL_CENTER_API_PATHS.sourceSurfaces}?limit=${boundedLimit}`);
}

export function loadSourceGraph(surfaceId: string | null, depth = 2): Promise<SourceGraphSnapshot> {
  const boundedDepth = Number.isInteger(depth) && depth >= 0 && depth <= 4 ? depth : 2;
  const params = new URLSearchParams({ depth: String(boundedDepth) });
  if (surfaceId !== null) {
    const safeId = safePathId(surfaceId);
    if (safeId === null) return Promise.reject(new ControlCenterApiError('INVALID_RESPONSE'));
    params.set('surface', safeId);
  }
  return fetchSnapshot<SourceGraphSnapshot>(`${CONTROL_CENTER_API_PATHS.sourceGraph}?${params.toString()}`);
}

const CONTROL_CENTER_NOTIFICATION_TYPES = ['readiness.changed', 'safety.changed', 'run.updated', 'run.completed', 'campaign.snapshot.changed', 'source.snapshot.changed', 'findings.snapshot.changed'] as const;

/** Notifications are advisory. Consumers use them only to trigger GET refreshes. */
export function subscribeToControlCenterEvents(onInvalidate: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.EventSource !== 'function') return () => undefined;
  let source: EventSource;
  try {
    source = new window.EventSource('/api/v1/events');
  } catch {
    return () => undefined;
  }
  const listeners = CONTROL_CENTER_NOTIFICATION_TYPES.map((type) => {
    const listener = (): void => onInvalidate();
    source.addEventListener(type, listener);
    return { type, listener };
  });
  source.onerror = (): void => undefined;
  return () => {
    for (const { type, listener } of listeners) source.removeEventListener(type, listener);
    source.close();
  };
}

export function apiErrorLabel(error: unknown): string {
  if (error instanceof ControlCenterApiError) {
    if (error.kind === 'NETWORK') return 'The local service is not reachable.';
    if (error.kind === 'HTTP') return 'The local service returned an unavailable response.';
    return 'The local service returned an invalid snapshot.';
  }
  return 'The local snapshot could not be loaded.';
}
