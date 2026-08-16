// ---------------------------------------------------------------------------
// Nightwatch Phase 9 — safe path validation (SPEC §34).
//
// A SafePath is an array of fixed, source-known field segments. Every
// segment is validated: fixed string, non-empty, no prototype keys, no
// wildcards, bounded depth and length. Arbitrary JSONPath/JMESPath and
// recursive descent are rejected.
// ---------------------------------------------------------------------------

import { FORBIDDEN_FIELD_NAMES } from '../projections/types';
import {
  MAX_PATH_SEGMENTS,
  MAX_PATH_SEGMENT_LENGTH,
  type SafePath,
} from './types';

export function validateSafePath(value: unknown, label: string): SafePath {
  if (!Array.isArray(value)) throw new Error(`SEMANTIC_EXPECTATION_INVALID:${label}-not-an-array`);
  if (value.length === 0) throw new Error(`SEMANTIC_EXPECTATION_INVALID:${label}-empty-path`);
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
  }
  return [...value];
}
