// ---------------------------------------------------------------------------
// Nightwatch — privacy-safe anomaly fingerprints.
//
// Fingerprints compare observation classes across fresh contexts. They never
// contain raw URLs, query strings, bodies, DOM, customer values, account
// identifiers, costs, cookies, or tokens.
// ---------------------------------------------------------------------------

import { prefixedDigest24 } from '../identity/canonicalDigest';

// Phase 15P A15 convergence: de-exported (module-private, zero external callers).
interface AnomalyFingerprintInput {
  journeyId: string;
  stepId?: string | null;
  oracleId: string;
  resourceRole?: string;
  host?: string;
  path?: string;
  status?: number | null;
  contentType?: string | null;
  routeClass?: string | null;
  structuralCheckpoint?: string | null;
  runtimeCategory?: string | null;
}

// Phase 15P A15 convergence: de-exported (module-private, zero external callers).
interface SanitizedAnomalyFingerprintInput {
  journeyId: string;
  stepId: string | null;
  oracleId: string;
  resourceRole: string | null;
  hostClass: string | null;
  pathTemplate: string | null;
  statusClass: string | null;
  contentTypeClass: string | null;
  routeClass: string | null;
  structuralCheckpoint: string | null;
  runtimeCategory: string | null;
}

function statusClass(status: number | null | undefined): string | null {
  if (status === null || status === undefined) return null;
  if (status >= 500) return '5xx';
  if (status >= 400) return '4xx';
  if (status >= 300) return '3xx';
  if (status >= 200) return '2xx';
  return '0xx';
}

function contentTypeClass(contentType: string | null | undefined): string | null {
  if (contentType === null || contentType === undefined || contentType.trim() === '') return null;
  const value = contentType.toLowerCase();
  if (value.includes('json')) return 'json';
  if (value.includes('html')) return 'html';
  if (value.includes('javascript') || value.includes('ecmascript')) return 'javascript';
  if (value.includes('css')) return 'css';
  if (value.includes('font') || value.includes('octet-stream')) return 'font-or-binary';
  if (value.includes('text')) return 'text';
  return 'other';
}

function safeHostClass(host: string | undefined): string | null {
  if (host === undefined || host.trim() === '') return null;
  const normalized = host.toLowerCase().replace(/[^a-z0-9.*:-]/g, '');
  if (normalized === '') return null;
  if (normalized.includes('alphaus.cloud') || normalized.includes('mobingi.com')) return normalized;
  if (normalized.includes('google') || normalized.includes('gstatic') || normalized.includes('sentry')) return 'reviewed-external';
  return 'external-class';
}

function safePathTemplate(rawPath: string | undefined): string | null {
  if (rawPath === undefined || rawPath.trim() === '') return null;
  let pathname = rawPath;
  try {
    pathname = new URL(rawPath).pathname;
  } catch {
    pathname = rawPath.split(/[?#]/, 1)[0] ?? '/';
  }
  if (!pathname.startsWith('/')) return null;
  const safeSegments = new Set([
    'm', 'blue', 'ripple', 'v1', 'v2', 'static', 'js', 'css', 'fonts',
    'api', 'billing', 'exchange', 'global', 'accts', 'accounts', 'ripple',
  ]);
  return pathname.split('/').map((segment) => {
    if (segment === '') return '';
    if (/\.(?:js|mjs|css|woff2?|ttf|otf|eot|png|jpe?g|gif|svg|webp)$/i.test(segment)) {
      return `<RESOURCE>.${segment.split('.').pop()?.toLowerCase() ?? 'bin'}`;
    }
    if (safeSegments.has(segment.toLowerCase())) return segment.toLowerCase();
    if (/^v?\d+$/i.test(segment)) return segment.toLowerCase();
    return '<SEGMENT>';
  }).join('/') || '/';
}

export function sanitizeAnomalyFingerprintInput(input: AnomalyFingerprintInput): SanitizedAnomalyFingerprintInput {
  return {
    journeyId: input.journeyId,
    stepId: input.stepId ?? null,
    oracleId: input.oracleId,
    resourceRole: input.resourceRole ?? null,
    hostClass: safeHostClass(input.host),
    pathTemplate: safePathTemplate(input.path),
    statusClass: statusClass(input.status),
    contentTypeClass: contentTypeClass(input.contentType),
    routeClass: input.routeClass ?? null,
    structuralCheckpoint: input.structuralCheckpoint ?? null,
    runtimeCategory: input.runtimeCategory ?? null,
  };
}

export function fingerprintAnomaly(input: AnomalyFingerprintInput): string {
  const sanitized = sanitizeAnomalyFingerprintInput(input);
  return prefixedDigest24('fp', sanitized);
}
