// Regression for the Phase 2A authenticated runner's target plumbing.
// The child-process boundary is exercised with synthetic arguments/state only;
// no browser, target, DNS, or external authenticated state is used.

import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadEnvironmentConfig } from '../../src/core/environment';

const root = path.resolve(__dirname, '..', '..');
const cli = path.join(root, 'bin', 'observe-authenticated.mjs');
const configModule = pathToFileURL(path.join(root, 'bin', 'observe-authenticated-config.mjs')).href;
const syntheticState = '/tmp/nightwatch-synthetic-auth-state.json';

function runnerBoundary(args: string[], parentEnvironment: Record<string, string>) {
  const script = `
    import { buildObserveAuthenticatedEnvironment, parseObserveAuthenticatedArgs } from ${JSON.stringify(configModule)};
    const parsed = parseObserveAuthenticatedArgs(${JSON.stringify(args)});
    const child = buildObserveAuthenticatedEnvironment(${JSON.stringify(parentEnvironment)}, parsed);
    process.stdout.write(JSON.stringify({ parsed, child }));
  `;
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', script], { encoding: 'utf8' });
  expect(result.status, result.stderr).toBe(0);
  return JSON.parse(result.stdout) as {
    parsed: { env: string; storage: string; uiUrl?: string };
    child: Record<string, string>;
  };
}

test('normal authenticated command omits UI override and resolves canonical DEV target', () => {
  const parsed = runnerBoundary(
    ['--env=dev', `--storage-state=${syntheticState}`],
    { NIGHTWATCH_UI_URL: 'https://next.alphaus.cloud/', PATH: '/synthetic/bin' },
  );
  const environment = loadEnvironmentConfig('dev');

  expect(parsed.parsed.uiUrl).toBeUndefined();
  // No override parameter and a hostile parent NIGHTWATCH_UI_URL must NOT leak
  // into the child: the gate then derives the target from the env default.
  expect(Object.hasOwn(parsed.child, 'NIGHTWATCH_UI_URL')).toBe(false);
  expect(parsed.child.NIGHTWATCH_STORAGE_STATE).toBe(syntheticState);
  // The canonical DEV UI base is what the gate falls back to when the child
  // omits an override; assert this independently of the child map above so the
  // target resolution is not self-referential.
  expect(environment.uiBaseUrl).toBe('https://appdev.alphaus.cloud/ripple/');
});

test('explicit canonical override remains present for strict gate validation', () => {
  const canonical = loadEnvironmentConfig('dev').uiBaseUrl;
  const parsed = runnerBoundary(
    ['--env=dev', `--storage-state=${syntheticState}`, `--ui-url=${canonical}`],
    { NIGHTWATCH_UI_URL: 'https://next.alphaus.cloud/', PATH: '/synthetic/bin' },
  );

  expect(parsed.parsed.uiUrl).toBe(canonical);
  expect(parsed.child.NIGHTWATCH_UI_URL).toBe(canonical);
});

test('explicit blank override is rejected at the CLI boundary', () => {
  const result = spawnSync(process.execPath, [
    cli,
    '--env=dev',
    `--storage-state=${syntheticState}`,
    '--ui-url=',
  ], { encoding: 'utf8' });

  expect(result.status).toBe(2);
  expect(result.stderr).toContain('explicit blank --ui-url');
});
