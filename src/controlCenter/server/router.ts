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
  | { readonly kind: 'events' };

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
  if (parts.length === 4 && parts[3] === 'events') return { kind: 'route', route: { kind: 'events' } };
  return { kind: 'unknown' };
}
