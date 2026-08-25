import type {
  ApiErrorKind,
  HealthSnapshot,
  MetaSnapshot,
  OverviewSnapshot,
  ReadinessSnapshot,
  SafetySnapshot,
} from './types';

export const CONTROL_CENTER_API_PATHS = Object.freeze({
  health: '/healthz',
  meta: '/api/v1/meta',
  readiness: '/api/v1/readiness',
  safety: '/api/v1/safety',
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
  return Promise.all([health, meta, readiness, safety]).then(([healthSnapshot, metaSnapshot, readinessSnapshot, safetySnapshot]) => ({
    health: healthSnapshot,
    meta: metaSnapshot,
    readiness: readinessSnapshot,
    safety: safetySnapshot,
  }));
}

export function apiErrorLabel(error: unknown): string {
  if (error instanceof ControlCenterApiError) {
    if (error.kind === 'NETWORK') return 'The local service is not reachable.';
    if (error.kind === 'HTTP') return 'The local service returned an unavailable response.';
    return 'The local service returned an invalid snapshot.';
  }
  return 'The local snapshot could not be loaded.';
}
