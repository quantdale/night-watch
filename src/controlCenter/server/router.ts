import { asSafeControlCenterId } from '../contracts/common';
import type { SafeControlCenterId } from '../contracts/common';

export type ControlCenterRoute =
  | { readonly kind: 'health' }
  | { readonly kind: 'meta' }
  | { readonly kind: 'readiness' }
  | { readonly kind: 'safety' }
  | { readonly kind: 'runs' }
  | { readonly kind: 'run'; readonly runId: SafeControlCenterId }
  | { readonly kind: 'timeline'; readonly runId: SafeControlCenterId }
  | { readonly kind: 'executionGraph'; readonly runId: SafeControlCenterId }
  | { readonly kind: 'campaignSummary' }
  | { readonly kind: 'campaignCoverage' }
  | { readonly kind: 'sourceSummary' }
  | { readonly kind: 'sourceSurfaces' }
  | { readonly kind: 'sourceGraph' }
  | { readonly kind: 'findings' }
  | { readonly kind: 'reviewer' }
  /**
   * The ONE local write route. It is a distinct route kind rather than a
   * method branch on `reviewer`, so a POST can never be answered by a read
   * handler and a GET can never be answered by the write handler.
   */
  | { readonly kind: 'reviewerDecision' }
  | { readonly kind: 'events' }
  /** C-15c: System Map V2. Versioned EXPLICITLY under /api/v2/, never by
   *  reinterpreting v1, so a client can always tell which shape it received. */
  | { readonly kind: 'systemMapLevel'; readonly level: SystemMapLevelSegment }
  | { readonly kind: 'systemMapQuery'; readonly query: SystemMapQuerySegment };

/** The only level segments that exist. An unknown one is not a route. */
export const SYSTEM_MAP_LEVEL_SEGMENTS = ['l1', 'l2', 'l3', 'l4'] as const;
export type SystemMapLevelSegment = (typeof SYSTEM_MAP_LEVEL_SEGMENTS)[number];

/** The eight operator queries, as URL segments. An unknown enum is REJECTED. */
export const SYSTEM_MAP_QUERY_SEGMENTS = [
  'why-unproven', 'ui-control-to-handler', 'surfaces-touching-service',
  'observed-production-paths', 'mutation-capable-routes',
  'untested-read-only-routes', 'coverage-gaps', 'findings-attached-to-topology',
] as const;
export type SystemMapQuerySegment = (typeof SYSTEM_MAP_QUERY_SEGMENTS)[number];

export type ControlCenterPathResult =
  | { readonly kind: 'route'; readonly route: ControlCenterRoute }
  | { readonly kind: 'unknown' }
  | { readonly kind: 'rejected' };

function safeDynamicId(value: string): SafeControlCenterId | null {
  return asSafeControlCenterId(value);
}

/** Parse only the fixed API path set. Percent-encoded separators fail closed. */
export function parseControlCenterPath(pathname: string): ControlCenterPathResult {
  if (pathname.includes('%') || pathname.includes('\\') || pathname.includes('\u0000') || pathname.includes('..')) return { kind: 'rejected' };
  if (pathname === '/healthz') return { kind: 'route', route: { kind: 'health' } };
  const parts = pathname.split('/');
  // C-15c: the v2 surface is parsed first and separately. It shares the
  // fail-closed prefix discipline and adds nothing to v1.
  if (parts[0] === '' && parts[1] === 'api' && parts[2] === 'v2') {
    if (parts.length === 5 && parts[3] === 'system-map') {
      const level = parts[4] as SystemMapLevelSegment;
      if (SYSTEM_MAP_LEVEL_SEGMENTS.includes(level)) return { kind: 'route', route: { kind: 'systemMapLevel', level } };
      return { kind: 'unknown' };
    }
    if (parts.length === 6 && parts[3] === 'system-map' && parts[4] === 'query') {
      const query = parts[5] as SystemMapQuerySegment;
      // An unknown query enum is refused rather than defaulted, so a typo
      // cannot silently answer a different question.
      if (SYSTEM_MAP_QUERY_SEGMENTS.includes(query)) return { kind: 'route', route: { kind: 'systemMapQuery', query } };
      return { kind: 'unknown' };
    }
    return { kind: 'unknown' };
  }
  if (parts[0] !== '' || parts[1] !== 'api' || parts[2] !== 'v1') return { kind: 'unknown' };
  if (parts.length === 4 && parts[3] === 'meta') return { kind: 'route', route: { kind: 'meta' } };
  if (parts.length === 4 && parts[3] === 'readiness') return { kind: 'route', route: { kind: 'readiness' } };
  if (parts.length === 4 && parts[3] === 'safety') return { kind: 'route', route: { kind: 'safety' } };
  if (parts.length === 4 && parts[3] === 'runs') return { kind: 'route', route: { kind: 'runs' } };
  if (parts.length === 5 && parts[3] === 'runs') {
    const runId = safeDynamicId(parts[4]!);
    if (runId === null) return { kind: 'rejected' };
    return { kind: 'route', route: { kind: 'run', runId } };
  }
  if (parts.length === 6 && parts[3] === 'runs' && parts[5] === 'timeline') {
    const runId = safeDynamicId(parts[4]!);
    if (runId === null) return { kind: 'rejected' };
    return { kind: 'route', route: { kind: 'timeline', runId } };
  }
  if (parts.length === 6 && parts[3] === 'runs' && parts[5] === 'execution-graph') {
    const runId = safeDynamicId(parts[4]!);
    if (runId === null) return { kind: 'rejected' };
    return { kind: 'route', route: { kind: 'executionGraph', runId } };
  }
  if (parts.length === 5 && parts[3] === 'campaign' && parts[4] === 'summary') return { kind: 'route', route: { kind: 'campaignSummary' } };
  if (parts.length === 5 && parts[3] === 'campaign' && parts[4] === 'coverage') return { kind: 'route', route: { kind: 'campaignCoverage' } };
  if (parts.length === 5 && parts[3] === 'source' && parts[4] === 'summary') return { kind: 'route', route: { kind: 'sourceSummary' } };
  if (parts.length === 5 && parts[3] === 'source' && parts[4] === 'surfaces') return { kind: 'route', route: { kind: 'sourceSurfaces' } };
  if (parts.length === 5 && parts[3] === 'source' && parts[4] === 'graph') return { kind: 'route', route: { kind: 'sourceGraph' } };
  if (parts.length === 4 && parts[3] === 'findings') return { kind: 'route', route: { kind: 'findings' } };
  if (parts.length === 4 && parts[3] === 'reviewer') return { kind: 'route', route: { kind: 'reviewer' } };
  if (parts.length === 5 && parts[3] === 'reviewer' && parts[4] === 'decision') return { kind: 'route', route: { kind: 'reviewerDecision' } };
  if (parts.length === 4 && parts[3] === 'events') return { kind: 'route', route: { kind: 'events' } };
  return { kind: 'unknown' };
}
