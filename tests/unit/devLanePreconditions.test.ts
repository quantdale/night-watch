// M8 task 9.1 — the DEV-lane precondition registry and the launcher refusal it
// authorizes: while any audited precondition is OPEN, every DEV-lane launcher
// refuses BEFORE argument validation, auth validation or child creation.
import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  DEV_LANE_OWNER_TOKEN_UNRECOGNIZED,
  DEV_LANE_PRECONDITION_OPEN,
  DEV_LANE_PRECONDITION_REGISTRY_PATH,
  DEV_LANE_REGISTRY_INVALID,
  assertDevLanePreconditionClear,
  loadDevLanePreconditions,
  parseDevLanePreconditions,
} from '../../src/core/policy/devLanePreconditions';
import { guardDevLane, isDevInvocation } from '../../bin/lib/dev-lane-precondition.mjs';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const EXPECTED_OPEN = ['NW-AUD-016', 'NW-AUD-022', 'NW-AUD-025', 'NW-AUD-026', 'NW-AUD-037', 'NW-AUD-038'];

const DEV_LAUNCHERS = [
  'phase2b-real.mjs',
  'phase2c-real.mjs',
  'phase4-real.mjs',
  'phase5-real.mjs',
  'phase7-real.mjs',
  'phase9b-real.mjs',
  'phase10b-real.mjs',
  'phase22-real.mjs',
  'phase23-dev.mjs',
  'observe-authenticated.mjs',
  'observe-canary.mjs',
  'observe-gate.mjs',
  'observe-preflight.mjs',
  'auth-capture.mjs',
];

function temporaryRoot(registry: unknown): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-dev-lane-'));
  fs.mkdirSync(path.join(root, 'config'), { recursive: true });
  fs.writeFileSync(path.join(root, DEV_LANE_PRECONDITION_REGISTRY_PATH), JSON.stringify(registry, null, 2));
  return root;
}

function registryOf(root: string) {
  return JSON.parse(fs.readFileSync(path.join(root, DEV_LANE_PRECONDITION_REGISTRY_PATH), 'utf8'));
}

test.describe('DEV-lane precondition registry (9.1)', () => {
  test('the shipped registry lists exactly the six audited OPEN preconditions and no standing authorization', () => {
    const state = loadDevLanePreconditions(REPO_ROOT);
    expect(state.open.map((entry) => entry.id)).toEqual(EXPECTED_OPEN);
    expect(state.closed).toEqual([]);
    expect(state.ownerAuthorizations).toEqual([]);
    expect(state.refusalCode).toBe(DEV_LANE_PRECONDITION_OPEN);
    for (const entry of state.open) {
      expect(entry.summary.length).toBeGreaterThan(0);
      expect(entry.scope.length).toBeGreaterThan(0);
    }
  });

  test('registry parsing fails closed on every shape it does not fully recognise', () => {
    const shipped = registryOf(REPO_ROOT);
    expect(() => parseDevLanePreconditions('{')).toThrow(DEV_LANE_REGISTRY_INVALID);
    expect(() => parseDevLanePreconditions(JSON.stringify({ ...shipped, schemaVersion: 'nightwatch.other.v1' }))).toThrow(DEV_LANE_REGISTRY_INVALID);
    expect(() => parseDevLanePreconditions(JSON.stringify({ ...shipped, refusalCode: 'SOMETHING_ELSE' }))).toThrow(DEV_LANE_REGISTRY_INVALID);
    expect(() => parseDevLanePreconditions(JSON.stringify({ ...shipped, preconditions: [] }))).toThrow(DEV_LANE_REGISTRY_INVALID);
    expect(() => parseDevLanePreconditions(JSON.stringify({ ...shipped, preconditions: [shipped.preconditions[0], shipped.preconditions[0]] }))).toThrow(DEV_LANE_REGISTRY_INVALID);
    expect(() => parseDevLanePreconditions(JSON.stringify({ ...shipped, preconditions: [{ ...shipped.preconditions[0], status: 'MAYBE' }] }))).toThrow(DEV_LANE_REGISTRY_INVALID);
    expect(() => parseDevLanePreconditions(JSON.stringify({ ...shipped, ownerAuthorizations: ['D-1x'] }))).toThrow(DEV_LANE_REGISTRY_INVALID);
  });

  test('an OPEN precondition refuses the launch with every open id listed', () => {
    expect(() => assertDevLanePreconditionClear({ root: REPO_ROOT, launcher: 'test-launcher.mjs' })).toThrow(DEV_LANE_PRECONDITION_OPEN);
    try {
      assertDevLanePreconditionClear({ root: REPO_ROOT, launcher: 'test-launcher.mjs' });
    } catch (error) {
      const message = (error as Error).message;
      for (const id of EXPECTED_OPEN) expect(message).toContain(id);
      expect(message).toContain('test-launcher.mjs');
    }
  });

  test('only an owner token citing an authorized DECISIONS entry can clear the refusal', () => {
    const shipped = registryOf(REPO_ROOT);
    // A token that is not a DECISIONS citation is refused as unrecognized.
    expect(() => assertDevLanePreconditionClear({ root: REPO_ROOT, launcher: 'x.mjs', ownerToken: 'please' }))
      .toThrow(DEV_LANE_OWNER_TOKEN_UNRECOGNIZED);
    // A well-formed citation the registry does not authorize is still refused.
    expect(() => assertDevLanePreconditionClear({ root: REPO_ROOT, launcher: 'x.mjs', ownerToken: 'D-146' }))
      .toThrow(DEV_LANE_OWNER_TOKEN_UNRECOGNIZED);
    // An authorized citation clears it — and only through the registry.
    const authorizedRoot = temporaryRoot({ ...shipped, ownerAuthorizations: ['D-146'] });
    expect(assertDevLanePreconditionClear({ root: authorizedRoot, launcher: 'x.mjs', ownerToken: 'D-146' }).open).toHaveLength(6);
    // With every precondition CLOSED no token is needed at all.
    const closedRoot = temporaryRoot({ ...shipped, preconditions: shipped.preconditions.map((entry: { status: string }) => ({ ...entry, status: 'CLOSED' })) });
    expect(assertDevLanePreconditionClear({ root: closedRoot, launcher: 'x.mjs' }).open).toEqual([]);
  });

  test('an unreadable registry fails closed', () => {
    expect(() => loadDevLanePreconditions(path.join(os.tmpdir(), 'nw-absent-dev-lane-root'))).toThrow(DEV_LANE_REGISTRY_INVALID);
  });

  test('the guard applies to DEV invocations only', () => {
    expect(isDevInvocation(['--env=dev'])).toBe(true);
    expect(isDevInvocation(['--env', 'dev'])).toBe(true);
    expect(isDevInvocation(['--env=next'])).toBe(false);
    expect(isDevInvocation([])).toBe(false);
    expect(isDevInvocation([], { devOnly: true })).toBe(true);
    expect(guardDevLane({ root: REPO_ROOT, launcher: 'next-launcher.mjs', args: ['--env=next'] })).toBe(false);
    expect(() => guardDevLane({ root: REPO_ROOT, launcher: 'dev-launcher.mjs', args: ['--env=dev'] })).toThrow(DEV_LANE_PRECONDITION_OPEN);
    expect(() => guardDevLane({ root: REPO_ROOT, launcher: 'dev-only-launcher.mjs', devOnly: true })).toThrow(DEV_LANE_PRECONDITION_OPEN);
  });

  test('every DEV launcher calls the guard before it can validate arguments or spawn anything', () => {
    for (const launcher of DEV_LAUNCHERS) {
      const source = fs.readFileSync(path.join(REPO_ROOT, 'bin', launcher), 'utf8');
      expect(source, `${launcher} must import the guard`).toContain("from './lib/dev-lane-precondition.mjs'");
      const guardAt = source.indexOf('guardDevLane(');
      expect(guardAt, `${launcher} must call the guard`).toBeGreaterThan(0);
      const spawnAt = source.indexOf('spawnSync(');
      if (spawnAt !== -1) expect(guardAt, `${launcher} must guard BEFORE its first spawn`).toBeLessThan(spawnAt);
      const authAt = source.indexOf('requireValidAuthCapability');
      if (authAt !== -1) expect(guardAt, `${launcher} must guard BEFORE auth validation`).toBeLessThan(authAt);
    }
  });

  test('every DEV launcher refuses the launch with the refusal code and contacts nothing', () => {
    for (const launcher of DEV_LAUNCHERS) {
      const result = spawnSync(process.execPath, [path.join(REPO_ROOT, 'bin', launcher), '--env=dev'], {
        cwd: REPO_ROOT,
        encoding: 'utf8',
        timeout: 60_000,
        env: { ...process.env, NIGHTWATCH_DEV_LANE_OWNER_TOKEN: '' },
      });
      const output = `${result.stdout}${result.stderr}`;
      expect(result.status, `${launcher} must exit non-zero`).not.toBe(0);
      expect(output, `${launcher} must refuse with the registry code`).toContain(DEV_LANE_PRECONDITION_OPEN);
      expect(output, `${launcher} must name at least one open precondition`).toMatch(/NW-AUD-(016|022|025|026|037|038)/);
    }
  });

  test('an unrecognized owner token is refused by the launcher too', () => {
    const result = spawnSync(process.execPath, [path.join(REPO_ROOT, 'bin', 'phase7-real.mjs'), '--env=dev'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      timeout: 60_000,
      env: { ...process.env, NIGHTWATCH_DEV_LANE_OWNER_TOKEN: 'D-146' },
    });
    expect(`${result.stdout}${result.stderr}`).toContain(DEV_LANE_OWNER_TOKEN_UNRECOGNIZED);
  });
});
