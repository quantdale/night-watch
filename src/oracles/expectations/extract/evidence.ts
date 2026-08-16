// ---------------------------------------------------------------------------
// Nightwatch Phase 9A.1 — deterministic source-evidence digest (SPEC §14,
// §15, §16).
//
// The evidence digest is computed over the NORMALIZED SOURCE STRUCTURE used
// to derive an expectation — the canonical extraction (extractor kind,
// symbol, top-level class, literal key sets, route binding) — never over the
// entire unrelated repository. If that source structure changes (function
// literal edited, route rebound, keys removed/added/reordered), the digest
// changes and the expectation becomes stale/unverified fail-closed. An
// unrelated change in another file leaves the digest unchanged (test F of
// the source-freshness matrix).
//
// This module performs NO persistence and NO network I/O (hardening guard).
// ---------------------------------------------------------------------------

import type { SourceExtraction } from '../recipes/types';
import crypto from 'node:crypto';

export type EvidenceDigest = string;

export const EVIDENCE_DIGEST_RE = /^ev:sha256:[0-9a-f]{24}$/;

/** Canonical serialization of one extraction (sorted keys, stable shape). */
export function canonicalExtraction(extraction: SourceExtraction): string {
  if (extraction.kind === 'PHP_FUNCTION_LIST_ROW_KEYS') {
    return JSON.stringify({
      kind: extraction.kind,
      symbol: extraction.symbol,
      pattern: extraction.pattern,
      itemKeys: [...extraction.itemKeys].sort(),
      rowLiteralCount: extraction.rowLiteralCount,
    });
  }
  if (extraction.kind === 'PHP_FUNCTION_RETURNS_LIST_OF_BUILDER') {
    return JSON.stringify({
      kind: extraction.kind,
      symbol: extraction.symbol,
      builderSymbol: extraction.builderSymbol,
      pushCount: extraction.pushCount,
      returnsAccumulatorList: extraction.returnsAccumulatorList,
    });
  }
  return JSON.stringify({
    kind: extraction.kind,
    routePath: extraction.routePath,
    client: extraction.client,
    method: extraction.method,
    found: extraction.found,
  });
}

/** Evidence digest over one or more extractions in recipe order. */
export function evidenceDigestFor(extractions: readonly SourceExtraction[]): EvidenceDigest {
  const canonical = JSON.stringify(extractions.map((extraction) => canonicalExtraction(extraction)));
  const digest = crypto.createHash('sha256').update(canonical, 'utf8').digest('hex').slice(0, 24);
  return `ev:sha256:${digest}`;
}

/** Constant-time-ish comparison of two evidence digests. */
export function evidenceDigestEquals(left: EvidenceDigest | undefined, right: EvidenceDigest | undefined): boolean {
  if (left === undefined || right === undefined) return false;
  return left === right;
}
