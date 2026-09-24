// explain-surface argument forms: the README-documented `--surface=<id>`
// form and the positional form must resolve identically; malformed ids
// stay refused. Surface ids come from a live `surfaces` call, never
// hardcoded digests. Local read-only sibling source only.

import { test, expect } from '@playwright/test';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { PHASE5_SOURCE_SHAS } from '../../src/api/phase5/catalog';
import { createSourceParityFixture, type SourceParityFixture } from '../helpers/sourceParity';

const ROOT = path.resolve(__dirname, '..', '..');
let fixture: SourceParityFixture;

test.beforeEach(() => {
  fixture = createSourceParityFixture({ sha: PHASE5_SOURCE_SHAS.rippleApi, prefix: 'nightwatch-explain-surface-test-' });
});

test.afterEach(() => {
  fixture?.dispose();
});


function runCli(args: readonly string[], siblingRoot: string): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'nightwatch-intelligence.mjs'), ...args], {
    cwd: ROOT,
    env: { ...process.env, NIGHTWATCH_REPOS_ROOT: siblingRoot },
    encoding: 'utf8',
    timeout: 180000,
    maxBuffer: 8 * 1024 * 1024,
  });
  return { status: result.status, stdout: String(result.stdout ?? ''), stderr: String(result.stderr ?? '') };
}

function discoverSurfaceId(siblingRoot: string): string {
  const result = runCli(['surfaces', '--repo=mobingilabs/ripple-api', '--json'], siblingRoot);
  expect(result.status).toBe(0);
  const document = JSON.parse(result.stdout) as { surfaces?: { surfaceId?: unknown }[] };
  const ids = (document.surfaces ?? [])
    .map((entry) => entry.surfaceId)
    .filter((value): value is string => typeof value === 'string' && value.length > 0);
  expect(ids.length).toBeGreaterThan(0);
  return ids[0] as string;
}

test.describe('explain-surface argument forms', () => {

  test('README flag order resolves a proven id', () => {
    const surfaceId = discoverSurfaceId(fixture.root);
    const result = runCli(['explain-surface', '--repo=mobingilabs/ripple-api', `--surface=${surfaceId}`, '--json'], fixture.root);
    expect(result.status).toBe(0);
    const document = JSON.parse(result.stdout) as { command?: unknown; requestedSurface?: unknown; surface?: unknown };
    expect(document.command).toBe('explain-surface');
    expect(document.requestedSurface).toBe(surfaceId);
    expect(document.surface).not.toBeNull();
  });

  test('positional-after-flags order resolves identically', () => {
    const surfaceId = discoverSurfaceId(fixture.root);
    const flagged = runCli(['explain-surface', '--repo=mobingilabs/ripple-api', `--surface=${surfaceId}`, '--json'], fixture.root);
    const positional = runCli(['explain-surface', '--repo=mobingilabs/ripple-api', surfaceId, '--json'], fixture.root);
    expect(positional.status).toBe(0);
    const flaggedDocument = JSON.parse(flagged.stdout) as { surface?: unknown };
    const positionalDocument = JSON.parse(positional.stdout) as { surface?: unknown };
    expect(positionalDocument.surface).toEqual(flaggedDocument.surface);
  });

  test('malformed id stays refused', () => {
    const result = runCli(['explain-surface', '--repo=mobingilabs/ripple-api', 'op:!!bad id!!', '--json'], fixture.root);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('EXPLAIN_SURFACE_ID_UNSAFE');
  });
});
