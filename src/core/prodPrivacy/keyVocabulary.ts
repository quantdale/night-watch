// ---------------------------------------------------------------------------
// Nightwatch C-10 / F-14 — source-proven finite key vocabulary.
//
// An object key literal is DATA, not metadata. In this domain objects are
// routinely keyed by AWS account id, MSP id, billing-group id, payer id or
// company name — Nightwatch's own EMPTY_ARRAY_OR_STRING_KEYS extractor exists
// precisely because dynamic string keys occur in Ripple responses.
//
// A key literal may therefore cross the production projection boundary ONLY as
// a proven member of a finite key set that a SOURCE mechanically establishes.
// "It looks like a normal field name" is not proof, and a regular expression
// over key names is not proof.
//
// The vocabulary is a FROZEN VALUE OBJECT constructed OUTSIDE this cone. Its
// proof sources (the C-02a generated OpenAPI `definitions`, the mechanically
// derived PHP row-key contracts) live behind filesystem loaders; importing one
// here would give the projection cone filesystem authority and break the
// Workstream E import-isolation invariant. So the vocabulary is passed
// call-scoped instead.
//
// This module is part of the PURE cone: no fs, no net, no process.
// ---------------------------------------------------------------------------

import { failProduction } from './errors';

export const PROVEN_KEY_VOCABULARY_VERSION = 'nightwatch.proven-key-vocabulary.v1' as const;

/**
 * How a finite key set was mechanically established. Each member names a real
 * Nightwatch proof source; there is deliberately no `ASSUMED` or `MANUAL`
 * member, because a provenance label alone never grants authority.
 */
export const KEY_PROVENANCE_CLASSES = [
  /** C-02a: a generated OpenAPI `definitions` schema for a response contract. */
  'SOURCE_PROVEN_OPENAPI_DEFINITION',
  /** Mechanically derived PHP row-key contract (PHP_FUNCTION_LIST_ROW_KEYS). */
  'SOURCE_PROVEN_PHP_ROW_KEYS',
  /** A repository-owned fixed finite schema (Nightwatch's own contracts). */
  'SOURCE_PROVEN_FIXED_CONTRACT',
] as const;
export type KeyProvenanceClass = (typeof KEY_PROVENANCE_CLASSES)[number];

const PROVENANCE_CLASS_SET: ReadonlySet<string> = new Set(KEY_PROVENANCE_CLASSES);

/** Upper bound on a finite key set. An unbounded "finite" set is not finite in practice. */
export const MAX_PROVEN_VOCABULARY_KEYS = 4096;
/** Upper bound on one key literal. */
export const MAX_PROVEN_KEY_LENGTH = 200;

/**
 * Evidence digest binding the vocabulary to the source it was derived from,
 * in the repository's existing `ev:sha256:<24 hex>` shape.
 */
const PROVENANCE_DIGEST_RE = /^ev:sha256:[0-9a-f]{24}$/;

/**
 * Object-key segments that must never be treated as data fields, whatever a
 * vocabulary claims (prototype pollution / hostile keys).
 */
export const FORBIDDEN_PRODUCTION_KEY_NAMES: ReadonlySet<string> = new Set([
  '__proto__',
  'constructor',
  'prototype',
  'toString',
  'valueOf',
  'hasOwnProperty',
]);

export interface ProvenKeyVocabulary {
  readonly version: typeof PROVEN_KEY_VOCABULARY_VERSION;
  readonly provenanceClass: KeyProvenanceClass;
  readonly provenanceDigest: string;
  readonly keys: ReadonlySet<string>;
}

/**
 * The explicit "no vocabulary" sentinel. A caller must pass either a
 * `ProvenKeyVocabulary` or this value: omission is a type error, so ambiguous
 * provenance cannot arrive by default. Every key is then dynamic and untrusted.
 */
export const NO_PROVEN_VOCABULARY = 'NO_PROVEN_VOCABULARY' as const;
export type NoProvenVocabulary = typeof NO_PROVEN_VOCABULARY;

export type KeyVocabularySource = ProvenKeyVocabulary | NoProvenVocabulary;

/**
 * Construct a frozen, validated vocabulary. Fail-closed on an unknown
 * provenance class, a malformed provenance digest, an empty or oversized key
 * set, a non-string key, an oversized key, or a prototype-hostile key.
 */
export function createProvenKeyVocabulary(input: {
  readonly provenanceClass: KeyProvenanceClass;
  readonly provenanceDigest: string;
  readonly keys: readonly string[];
}): ProvenKeyVocabulary {
  if (!PROVENANCE_CLASS_SET.has(input.provenanceClass)) {
    failProduction('PRODUCTION_PRIVACY_VOCABULARY_INVALID', 'PROVENANCE_AMBIGUOUS');
  }
  if (typeof input.provenanceDigest !== 'string' || !PROVENANCE_DIGEST_RE.test(input.provenanceDigest)) {
    failProduction('PRODUCTION_PRIVACY_VOCABULARY_INVALID', 'VOCABULARY_PROVENANCE_DIGEST');
  }
  if (!Array.isArray(input.keys) || input.keys.length === 0) {
    failProduction('PRODUCTION_PRIVACY_VOCABULARY_INVALID', 'VOCABULARY_EMPTY');
  }
  if (input.keys.length > MAX_PROVEN_VOCABULARY_KEYS) {
    failProduction('PRODUCTION_PRIVACY_VOCABULARY_INVALID', 'VOCABULARY_SIZE');
  }
  const keys = new Set<string>();
  for (const key of input.keys) {
    if (typeof key !== 'string' || key.length === 0 || key.length > MAX_PROVEN_KEY_LENGTH) {
      failProduction('PRODUCTION_PRIVACY_VOCABULARY_INVALID', 'KEY_LENGTH');
    }
    if (FORBIDDEN_PRODUCTION_KEY_NAMES.has(key)) {
      failProduction('PRODUCTION_PRIVACY_VOCABULARY_INVALID', 'FORBIDDEN_FIELD_NAME');
    }
    keys.add(key);
  }
  return Object.freeze({
    version: PROVEN_KEY_VOCABULARY_VERSION,
    provenanceClass: input.provenanceClass,
    provenanceDigest: input.provenanceDigest,
    keys: keys as ReadonlySet<string>,
  });
}

/**
 * Is this key literal mechanically proven safe to persist?
 *
 * The ONLY affirmative answer is membership in a source-proven finite set. No
 * syntactic judgement about the key is made or accepted anywhere.
 */
export function isSourceProvenKey(source: KeyVocabularySource, key: string): boolean {
  if (source === NO_PROVEN_VOCABULARY) return false;
  if (FORBIDDEN_PRODUCTION_KEY_NAMES.has(key)) return false;
  return source.keys.has(key);
}

/** Provenance identity for a receipt, carrying no key literals. */
export function vocabularyIdentity(source: KeyVocabularySource): {
  readonly provenanceClass: KeyProvenanceClass | 'NONE';
  readonly provenanceDigest: string | null;
  readonly keyCount: number;
} {
  if (source === NO_PROVEN_VOCABULARY) {
    return { provenanceClass: 'NONE', provenanceDigest: null, keyCount: 0 };
  }
  return {
    provenanceClass: source.provenanceClass,
    provenanceDigest: source.provenanceDigest,
    keyCount: source.keys.size,
  };
}
