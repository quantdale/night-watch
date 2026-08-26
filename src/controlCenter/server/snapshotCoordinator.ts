// ---------------------------------------------------------------------------
// Nightwatch Control Center — bounded snapshot lifecycle coordinator.
//
// This module coordinates already-sanitized/domain snapshots. It has no
// filesystem, network, process, browser, or mutation authority. A failed
// refresh is represented by the caller's explicit fallback and is never
// returned as the previous generation marked CURRENT.
// ---------------------------------------------------------------------------

import { prefixedDigest24 } from '../../core/identity/canonicalDigest';

export const CONTROL_CENTER_SNAPSHOT_COORDINATOR_VERSION = 'nightwatch.control-center-snapshot-coordinator.v1' as const;

export const CONTROL_CENTER_SNAPSHOT_KEYS = Object.freeze({
  RUN_EVIDENCE: 'run-evidence',
  AUTHORITY: 'authority',
} as const);

export type ControlCenterSnapshotKey = (typeof CONTROL_CENTER_SNAPSHOT_KEYS)[keyof typeof CONTROL_CENTER_SNAPSHOT_KEYS];
export type SnapshotFreshness = 'CURRENT' | 'FAILED' | 'CLOSED';
export type SnapshotReadState = 'HIT' | 'REFRESHED' | 'FAILED' | 'CLOSED';

export interface SnapshotReadSpec<T> {
  readonly key: ControlCenterSnapshotKey;
  readonly ttlMs: number;
  readonly refresh: () => T | Promise<T>;
  readonly fallback: () => T | Promise<T>;
  readonly generation: (value: T) => string | null;
}
export interface SnapshotReadResult<T> {
  readonly value: T;
  readonly key: ControlCenterSnapshotKey;
  /** Identity-bearing cache key; it contains only the fixed key and digest. */
  readonly cacheIdentity: string;
  readonly generation: string | null;
  readonly capturedAt: number;
  readonly freshness: SnapshotFreshness;
  readonly state: SnapshotReadState;
  /** The prior valid generation is diagnostic metadata, never the served value. */
  readonly lastKnownGoodGeneration: string | null;
}

interface SnapshotCacheEntry<T> {
  readonly value: T;
  readonly key: ControlCenterSnapshotKey;
  readonly cacheIdentity: string;
  readonly generation: string | null;
  readonly capturedAt: number;
  readonly freshness: SnapshotFreshness;
  readonly lastKnownGoodGeneration: string | null;
}

const DEFAULT_MAX_ENTRIES = 2;
const MAX_ENTRIES = 8;
const MAX_TTL_MS = 10_000;

function validTtl(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= MAX_TTL_MS;
}

function cacheIdentity(key: ControlCenterSnapshotKey, generation: string | null, freshness: SnapshotFreshness): string {
  return prefixedDigest24('cc-snapshot-cache', {
    schemaVersion: CONTROL_CENTER_SNAPSHOT_COORDINATOR_VERSION,
    key,
    generation,
    freshness,
  });
}

function safeGeneration<T>(generation: (value: T) => string | null, value: T): string | null {
  try {
    const result = generation(value);
    return typeof result === 'string' && result.length > 0 ? result : null;
  } catch {
    return null;
  }
}

export class ControlCenterSnapshotCoordinator {
  private readonly maxEntries: number;
  private readonly now: () => number;
  private readonly entries = new Map<ControlCenterSnapshotKey, SnapshotCacheEntry<unknown>>();
  private readonly lastKnownGood = new Map<ControlCenterSnapshotKey, string>();
  private readonly inFlight = new Map<ControlCenterSnapshotKey, Promise<SnapshotReadResult<unknown>>>();
  private closed = false;

  constructor(input: { readonly maxEntries?: number; readonly now?: () => number } = {}) {
    const maxEntries = input.maxEntries ?? DEFAULT_MAX_ENTRIES;
    if (!Number.isInteger(maxEntries) || maxEntries < 1 || maxEntries > MAX_ENTRIES) throw new Error('CONTROL_CENTER_SNAPSHOT_CACHE_BOUND');
    this.maxEntries = maxEntries;
    this.now = input.now ?? (() => Date.now());
  }

  get isClosed(): boolean {
    return this.closed;
  }

  get entryCount(): number {
    return this.entries.size;
  }

  async read<T>(spec: SnapshotReadSpec<T>): Promise<SnapshotReadResult<T>> {
    if (!validTtl(spec.ttlMs)) throw new Error('CONTROL_CENTER_SNAPSHOT_TTL_BOUND');
    const cached = this.entries.get(spec.key) as SnapshotCacheEntry<T> | undefined;
    const capturedAt = this.now();
    if (cached !== undefined && capturedAt - cached.capturedAt <= spec.ttlMs) return this.result(cached, 'HIT');
    if (this.closed) {
      const value = await spec.fallback();
      return this.closedResult(spec, value, capturedAt);
    }
    const existing = this.inFlight.get(spec.key) as Promise<SnapshotReadResult<T>> | undefined;
    if (existing !== undefined) return existing;
    const promise = this.refresh(spec, cached);
    this.inFlight.set(spec.key, promise as Promise<SnapshotReadResult<unknown>>);
    try {
      return await promise;
    } finally {
      if (this.inFlight.get(spec.key) === promise) this.inFlight.delete(spec.key);
    }
  }

  close(): void {
    this.closed = true;
    this.entries.clear();
  }

  clear(): void {
    if (this.closed) return;
    this.entries.clear();
    this.lastKnownGood.clear();
  }

  private async refresh<T>(spec: SnapshotReadSpec<T>, previous: SnapshotCacheEntry<T> | undefined): Promise<SnapshotReadResult<T>> {
    try {
      const value = await spec.refresh();
      const generation = safeGeneration(spec.generation, value);
      if (this.closed) return this.closedResult(spec, value, this.now(), generation);
      const lastKnownGoodGeneration = generation ?? previous?.lastKnownGoodGeneration ?? this.lastKnownGood.get(spec.key) ?? null;
      if (generation !== null) this.lastKnownGood.set(spec.key, generation);
      const entry: SnapshotCacheEntry<T> = {
        value,
        key: spec.key,
        cacheIdentity: cacheIdentity(spec.key, generation, 'CURRENT'),
        generation,
        capturedAt: this.now(),
        freshness: 'CURRENT',
        lastKnownGoodGeneration,
      };
      this.put(entry);
      return this.result(entry, 'REFRESHED');
    } catch {
      const value = await spec.fallback();
      const lastKnownGoodGeneration = previous?.freshness === 'CURRENT'
        ? previous.generation
        : previous?.lastKnownGoodGeneration ?? this.lastKnownGood.get(spec.key) ?? null;
      const generation = safeGeneration(spec.generation, value);
      const entry: SnapshotCacheEntry<T> = {
        value,
        key: spec.key,
        cacheIdentity: cacheIdentity(spec.key, generation, 'FAILED'),
        generation,
        capturedAt: this.now(),
        freshness: 'FAILED',
        lastKnownGoodGeneration,
      };
      if (!this.closed) this.put(entry);
      return this.result(entry, 'FAILED');
    }
  }

  private put<T>(entry: SnapshotCacheEntry<T>): void {
    this.entries.delete(entry.key);
    this.entries.set(entry.key, entry as SnapshotCacheEntry<unknown>);
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value as ControlCenterSnapshotKey | undefined;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }

  private result<T>(entry: SnapshotCacheEntry<T>, state: SnapshotReadState): SnapshotReadResult<T> {
    return {
      value: entry.value,
      key: entry.key,
      cacheIdentity: entry.cacheIdentity,
      generation: entry.generation,
      capturedAt: entry.capturedAt,
      freshness: entry.freshness,
      state,
      lastKnownGoodGeneration: entry.lastKnownGoodGeneration,
    };
  }

  private closedResult<T>(spec: SnapshotReadSpec<T>, value: T, capturedAt: number, generation = safeGeneration(spec.generation, value)): SnapshotReadResult<T> {
    return {
      value,
      key: spec.key,
      cacheIdentity: cacheIdentity(spec.key, generation, 'CLOSED'),
      generation,
      capturedAt,
      freshness: 'CLOSED',
      state: 'CLOSED',
      lastKnownGoodGeneration: this.lastKnownGood.get(spec.key) ?? null,
    };
  }
}
