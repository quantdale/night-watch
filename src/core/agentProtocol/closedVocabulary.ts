// ---------------------------------------------------------------------------
// NW-01 — the one closure primitive for reasoner-facing vocabularies.
//
// A membership table built as an ordinary object inherits every name on
// `Object.prototype`, so `table['constructor']` is truthy and
// `table['toString']` returns a function. Model-controlled strings therefore
// passed closed-vocabulary checks that read as exhaustive, and a lookup that
// returned "something" handed callers `Object` itself.
//
// `Set` and `Map` carry no such inheritance: membership is exactly what was
// inserted. Every reasoner-facing vocabulary and catalog goes through here,
// and none rebuilds its own table.
//
// The guards also refuse non-strings outright rather than coercing them. A
// value stringified before membership lets any object with a cooperative
// `toString` name a member it does not equal.
//
// Pure data and closures: no I/O, no clock, no imports.
// ---------------------------------------------------------------------------

/**
 * A type guard for a frozen string vocabulary. Own membership only, no
 * coercion.
 */
export function closedVocabulary<T extends string>(values: readonly T[]): (value: unknown) => value is T {
  const members = new Set<string>(values);
  return (value: unknown): value is T => typeof value === 'string' && members.has(value);
}

export interface ClosedLookup<T> {
  /** True only for a key that was actually inserted. */
  readonly has: (value: unknown) => boolean;
  /** The inserted value, or null. Never an inherited property. */
  readonly get: (value: unknown) => T | null;
}

/** A keyed catalog with the same closure guarantee as `closedVocabulary`. */
export function closedLookup<T>(entries: readonly (readonly [string, T])[]): ClosedLookup<T> {
  const table = new Map<string, T>(entries);
  return Object.freeze({
    has: (value: unknown): boolean => typeof value === 'string' && table.has(value),
    get: (value: unknown): T | null => (typeof value === 'string' ? table.get(value) ?? null : null),
  });
}
