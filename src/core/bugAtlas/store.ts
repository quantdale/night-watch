// ---------------------------------------------------------------------------
// Lane D — bounded in-memory Bug Atlas store.
//
// Historical knowledge is bounded retrieval, never a context dump: every
// query is clamped through the frozen protocol clampAtlasLimit (default 5,
// hard 8) and an empty term set retrieves nothing. Ranking is deterministic
// (matched-term count, then bugId) so the same corpus and query always return
// the same ids. Every outgoing record is guaranteed to carry provenance —
// ingest already enforces it and the query path re-checks fail-closed. Pure
// module: no fs/network/child_process/AI authority.
// ---------------------------------------------------------------------------

import {
  ATLAS_QUERY_VERSION,
  clampAtlasLimit,
  type AtlasQuery,
  type AtlasQueryResult,
  type BugAtlasRecord,
} from '../agentProtocol/atlas';
import { normalizeBugAtlasRecord } from './validate';

export interface BugAtlasStore {
  readonly size: number;
  query(query: AtlasQuery): AtlasQueryResult<BugAtlasRecord>;
  ids(): readonly string[];
}

function tokenizeTerms(terms: readonly string[]): readonly string[] {
  const tokens: string[] = [];
  for (const term of terms) {
    if (typeof term !== 'string') continue;
    for (const piece of term.toLowerCase().split(/[^a-z0-9]+/)) {
      if (piece.length >= 2 && !tokens.includes(piece)) tokens.push(piece);
    }
  }
  return tokens;
}

function recordHaystack(record: BugAtlasRecord): string {
  return [
    record.bugId,
    record.product,
    record.repository,
    record.service,
    record.symptom,
    record.expected,
    record.actual,
    record.trigger,
    record.rootCause,
    record.fixLocator,
    record.violatedInvariant,
    ...record.testsAdded,
    ...record.detectionSignals,
    ...record.relatedBugIds,
  ]
    .filter((part): part is string => typeof part === 'string' && part.length > 0)
    .join('\n')
    .toLowerCase();
}

/**
 * Create a store from candidate records. Every candidate is normalised
 * (provenance required, secrets scrubbed); the first invalid candidate
 * aborts creation fail-closed. Duplicate bugIds keep the first record.
 */
export function createBugAtlasStore(
  candidates: readonly unknown[],
): BugAtlasStore {
  const byId = new Map<string, BugAtlasRecord>();
  for (const candidate of candidates) {
    const { record } = normalizeBugAtlasRecord(candidate);
    if (!byId.has(record.bugId)) byId.set(record.bugId, record);
  }
  const records = [...byId.values()];
  const haystacks = new Map<string, string>();
  for (const record of records) haystacks.set(record.bugId, recordHaystack(record));

  return {
    size: records.length,
    ids(): readonly string[] {
      return records.map((record) => record.bugId);
    },
    query(query: AtlasQuery): AtlasQueryResult<BugAtlasRecord> {
      if (
        query === null ||
        typeof query !== 'object' ||
        query.schemaVersion !== ATLAS_QUERY_VERSION
      ) {
        throw new Error(`BUG_ATLAS_QUERY_SCHEMA_MISMATCH:${ATLAS_QUERY_VERSION}`);
      }
      const tokens = tokenizeTerms(query.terms ?? []);
      if (tokens.length === 0) return { records: [], truncated: false };
      const scored: { readonly record: BugAtlasRecord; readonly score: number }[] = [];
      for (const record of records) {
        const haystack = haystacks.get(record.bugId) ?? '';
        let score = 0;
        for (const token of tokens) {
          if (haystack.includes(token)) score += 1;
        }
        if (score > 0) scored.push({ record, score });
      }
      scored.sort((left, right) => {
        if (right.score !== left.score) return right.score - left.score;
        return left.record.bugId < right.record.bugId ? -1 : 1;
      });
      const limit = clampAtlasLimit(query.limit);
      const page = scored.slice(0, limit).map((entry) => {
        if (!entry.record.provenance || typeof entry.record.provenance.category !== 'string') {
          throw new Error('BUG_ATLAS_PROVENANCE_REQUIRED:stored record lost provenance');
        }
        return entry.record;
      });
      return { records: page, truncated: scored.length > page.length };
    },
  };
}
