// ---------------------------------------------------------------------------
// NW-HIST-004 (Wave 2) — the minimal deterministic synthetic keyed store.
//
// This models ONLY what the record-identity sequences need: PUT / GET / DELETE,
// an optional conditional-create, and deterministic failure injection. It has
// no clock, no randomness, no database library, no persistence, and no
// visibility semantics beyond the immediate one the sequences declare.
//
// It is a reproduction instrument, NOT a datastore simulator: a state it shows
// is a synthetic state produced by declared operations, never production data.
// ---------------------------------------------------------------------------

import { prefixedDigest24 } from '../identity/canonicalDigest';

export interface SyntheticStore {
  put(key: string, value: string, options?: { readonly conditionalCreate?: boolean }): boolean;
  get(key: string): string | null;
  delete(key: string, options?: { readonly fail?: boolean }): boolean;
  keys(): readonly string[];
  size(): number;
  snapshot(): readonly { readonly key: string; readonly value: string }[];
}

export function createSyntheticStore(): SyntheticStore {
  const records = new Map<string, string>();
  return {
    put(key: string, value: string, options?: { readonly conditionalCreate?: boolean }): boolean {
      if (options?.conditionalCreate === true && records.has(key)) return false;
      records.set(key, value);
      return true;
    },
    get(key: string): string | null {
      return records.has(key) ? records.get(key)! : null;
    },
    delete(key: string, options?: { readonly fail?: boolean }): boolean {
      if (options?.fail === true) return false;
      return records.delete(key);
    },
    keys(): readonly string[] {
      return [...records.keys()].sort();
    },
    size(): number {
      return records.size;
    },
    snapshot(): readonly { readonly key: string; readonly value: string }[] {
      return [...records.entries()]
        .map(([key, value]) => ({ key, value }))
        .sort((left, right) => (left.key < right.key ? -1 : left.key > right.key ? 1 : 0));
    },
  };
}

export function syntheticStoreDigest(store: SyntheticStore): string {
  return prefixedDigest24('rst', { records: store.snapshot() });
}
