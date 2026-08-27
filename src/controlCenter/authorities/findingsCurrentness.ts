// ---------------------------------------------------------------------------
// Shared findings source-freshness reducer.
//
// This field is deliberately freshness-only. Source-change relevance and
// causal confidence remain separate dossier facts and are not upgraded by
// this reducer. Unknown or empty freshness evidence stays unavailable.
// ---------------------------------------------------------------------------

import type { SourceFreshness } from '../../core/triage/types';

export type FindingsSourceCurrentness = 'CURRENT' | 'SOURCE_STALE' | 'SOURCE_UNAVAILABLE';

const VALID_FRESHNESS: ReadonlySet<string> = new Set([
  'SOURCE_CURRENT_LOCALLY',
  'LOCAL_TRACKING_REF_ONLY',
  'REMOTE_FRESHNESS_CONFIRMED',
  'UNKNOWN',
]);

export function reduceFindingsSourceCurrentness(freshness: readonly SourceFreshness[]): FindingsSourceCurrentness {
  if (freshness.length === 0 || freshness.some((value) => !VALID_FRESHNESS.has(value))) return 'SOURCE_UNAVAILABLE';
  if (freshness.some((value) => value === 'UNKNOWN')) return 'SOURCE_UNAVAILABLE';
  if (freshness.some((value) => value === 'LOCAL_TRACKING_REF_ONLY')) return 'SOURCE_STALE';
  return 'CURRENT';
}
