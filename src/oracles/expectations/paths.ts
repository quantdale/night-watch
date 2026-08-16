// ---------------------------------------------------------------------------
// Nightwatch Phase 9 — safe path validation (SPEC §34; Phase 9A.1 §17, §31).
//
// A SafePath is an array of fixed, source-known segments. Every segment is
// validated: fixed string, non-empty (except the whole path, which may be
// EMPTY to address the response ROOT), no prototype keys, no wildcards,
// bounded depth and length. Numeric segments are allowed ONLY as bounded
// non-negative array-index segments ('0'..'999') used to address array-item
// fields of source-established list contracts (Phase 9A.1 real-source
// expectations). Arbitrary JSONPath/JMESPath and recursive descent are
// rejected.
// ---------------------------------------------------------------------------

import { FORBIDDEN_FIELD_NAMES } from '../projections/types';
import {
  MAX_PATH_SEGMENTS,
  MAX_PATH_SEGMENT_LENGTH,
  type SafePath,
} from './types';

const ARRAY_INDEX_RE = /^(?:[0-9]|[1-9][0-9]{1,2})$/; // 0..999

export function validateSafePath(value: unknown, label: string): SafePath {
  if (!Array.isArray(value)) throw new Error(`SEMANTIC_EXPECTATION_INVALID:${label}-not-an-array`);
  if (value.length > MAX_PATH_SEGMENTS) throw new Error(`SEMANTIC_EXPECTATION_INVALID:${label}-too-deep`);
  for (const segment of value) {
    if (typeof segment !== 'string' || segment.length === 0) {
      throw new Error(`SEMANTIC_EXPECTATION_INVALID:${label}-non-string-segment`);
    }
    if (segment.length > MAX_PATH_SEGMENT_LENGTH) {
      throw new Error(`SEMANTIC_EXPECTATION_INVALID:${label}-segment-too-long`);
    }
    if (segment.includes('*') || segment.includes('..') || segment.includes('$') || segment.includes('/')) {
      throw new Error(`SEMANTIC_EXPECTATION_INVALID:${label}-wildcard-or-traversal`);
    }
    if (FORBIDDEN_FIELD_NAMES.has(segment)) {
      throw new Error(`SEMANTIC_EXPECTATION_INVALID:${label}-forbidden-segment`);
    }
    if (/^[0-9]+$/.test(segment) && !ARRAY_INDEX_RE.test(segment)) {
      throw new Error(`SEMANTIC_EXPECTATION_INVALID:${label}-array-index-out-of-range`);
    }
  }
  return [...value];
}
