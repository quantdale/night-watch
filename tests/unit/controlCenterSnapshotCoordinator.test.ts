import { expect, test } from '@playwright/test';
import {
  CONTROL_CENTER_SNAPSHOT_KEYS,
  ControlCenterSnapshotCoordinator,
  type SnapshotReadSpec,
} from '../../src/controlCenter/server/snapshotCoordinator';

interface SyntheticSnapshot {
  readonly generation: string | null;
  readonly state: 'AVAILABLE' | 'UNAVAILABLE';
  readonly items: readonly string[];
}

const generationA = 'synthetic:sha256:' + 'a'.repeat(24);
const generationB = 'synthetic:sha256:' + 'b'.repeat(24);

function spec(input: {
  readonly ttlMs: number;
  readonly refresh: () => SyntheticSnapshot | Promise<SyntheticSnapshot>;
  readonly fallback?: () => SyntheticSnapshot;
}): SnapshotReadSpec<SyntheticSnapshot> {
  return {
    key: CONTROL_CENTER_SNAPSHOT_KEYS.AUTHORITY,
    ttlMs: input.ttlMs,
    refresh: input.refresh,
    fallback: input.fallback ?? (() => ({ generation: null, state: 'UNAVAILABLE', items: [] })),
    generation: (value) => value.generation,
  };
}

test.describe('Control Center snapshot lifecycle coordinator', () => {
  test('coalesces concurrent refreshes and binds the cache identity to the generation', async () => {
    let reads = 0;
    let release: (() => void) | null = null;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const coordinator = new ControlCenterSnapshotCoordinator({ now: () => 1_000 });
    const refresh = async (): Promise<SyntheticSnapshot> => {
      reads += 1;
      await gate;
      return { generation: generationA, state: 'AVAILABLE', items: ['one'] };
    };
    const firstPromise = coordinator.read(spec({ ttlMs: 100, refresh }));
    const secondPromise = coordinator.read(spec({ ttlMs: 100, refresh }));
    expect(reads).toBe(1);
    release!();
    const [first, second] = await Promise.all([firstPromise, secondPromise]);
    expect(first.value).toEqual(second.value);
    expect(first.state).toBe('REFRESHED');
    expect(first.freshness).toBe('CURRENT');
    expect(first.generation).toBe(generationA);
    expect(first.cacheIdentity).toBe(second.cacheIdentity);
    expect(first.cacheIdentity).toMatch(/^cc-snapshot-cache:sha256:[0-9a-f]{24}$/);
    expect(first.lastKnownGoodGeneration).toBe(generationA);
  });

  test('failed refresh serves only an explicit fallback and retains last-known-good metadata', async () => {
    let now = 1_000;
    let fail = false;
    const coordinator = new ControlCenterSnapshotCoordinator({ now: () => now });
    const refresh = (): SyntheticSnapshot => {
      if (fail) throw new Error('SYNTHETIC_REFRESH_FAILURE');
      return { generation: generationA, state: 'AVAILABLE', items: ['one'] };
    };
    const first = await coordinator.read(spec({ ttlMs: 10, refresh }));
    expect(first.freshness).toBe('CURRENT');
    now = 1_100;
    fail = true;
    const failed = await coordinator.read(spec({ ttlMs: 10, refresh }));
    expect(failed.state).toBe('FAILED');
    expect(failed.freshness).toBe('FAILED');
    expect(failed.value).toEqual({ generation: null, state: 'UNAVAILABLE', items: [] });
    expect(failed.generation).toBeNull();
    expect(failed.lastKnownGoodGeneration).toBe(generationA);
    now = 1_105;
    const cachedFailure = await coordinator.read(spec({ ttlMs: 10, refresh }));
    expect(cachedFailure.state).toBe('HIT');
    expect(cachedFailure.freshness).toBe('FAILED');
    expect(cachedFailure.value.state).toBe('UNAVAILABLE');
    now = 1_200;
    fail = false;
    const recovered = await coordinator.read(spec({ ttlMs: 10, refresh: () => ({ generation: generationB, state: 'AVAILABLE', items: ['two'] }) }));
    expect(recovered.state).toBe('REFRESHED');
    expect(recovered.freshness).toBe('CURRENT');
    expect(recovered.generation).toBe(generationB);
  });

  test('bounds entries and prevents refresh after shutdown', async () => {
    let refreshes = 0;
    const coordinator = new ControlCenterSnapshotCoordinator({ maxEntries: 1, now: () => 1_000 });
    await coordinator.read(spec({ ttlMs: 0, refresh: () => { refreshes += 1; return { generation: generationA, state: 'AVAILABLE', items: ['one'] }; } }));
    await coordinator.read({
      ...spec({ ttlMs: 0, refresh: () => { refreshes += 1; return { generation: generationB, state: 'AVAILABLE', items: ['two'] }; } }),
      key: CONTROL_CENTER_SNAPSHOT_KEYS.RUN_EVIDENCE,
    });
    expect(coordinator.entryCount).toBe(1);
    coordinator.close();
    const closed = await coordinator.read(spec({ ttlMs: 100, refresh: () => { refreshes += 1; return { generation: generationB, state: 'AVAILABLE', items: ['three'] }; } }));
    expect(closed.state).toBe('CLOSED');
    expect(closed.freshness).toBe('CLOSED');
    expect(closed.value.state).toBe('UNAVAILABLE');
    expect(refreshes).toBe(2);
  });
});
