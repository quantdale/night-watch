import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const CLI = path.join(__dirname, '..', '..', 'bin', 'observe-preflight.mjs');

function run(...args: string[]) {
  return spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });
}

test('dev preflight uses the verified configured UI URL without auth state', () => {
  const result = run('--env=dev');
  expect(result.status).toBe(0);
  expect(result.stdout).toContain('"environment": "dev"');
  expect(result.stdout).toContain('"target": "https://appdev.alphaus.cloud/ripple/"');
  expect(result.stdout).toContain('"uiHost": "appdev.alphaus.cloud"');
  expect(result.stdout).toContain('"authentication": "not required for preflight"');
  expect(result.stdout).not.toContain('storage');
});

test('next preflight accepts only the explicit verified UI host', () => {
  const result = run('--env=next', '--ui-url=https://next.alphaus.cloud/');
  expect(result.status).toBe(0);
  expect(result.stdout).toContain('"environment": "next"');
  expect(result.stdout).toContain('"uiHost": "next.alphaus.cloud"');
});

test('production and multiple environment selections fail closed', () => {
  const prod = run('--env=prod');
  expect(prod.status).toBe(2);
  expect(prod.stderr).toContain('production is forbidden');

  const both = run('--env=dev', '--env=next');
  expect(both.status).toBe(2);
  expect(both.stderr).toContain('exactly one --env selection');
});

test('production UI host, unknown host, and sensitive URL forms fail closed', () => {
  const prod = run('--env=dev', '--ui-url=https://app.alphaus.cloud/');
  expect(prod.status).toBe(2);
  expect(prod.stderr).toContain('selected UI host');

  const unknown = run('--env=dev', '--ui-url=https://unknown.alphaus.cloud/');
  expect(unknown.status).toBe(2);
  expect(unknown.stderr).toContain('selected UI host must match');

  const query = run('--env=dev', '--ui-url=https://appdev.alphaus.cloud/?customer=FAKE_CUSTOMER');
  expect(query.status).toBe(2);
  expect(query.stderr).toContain('query parameters');

  const wrongPath = run('--env=dev', '--ui-url=https://appdev.alphaus.cloud/');
  expect(wrongPath.status).toBe(2);
  expect(wrongPath.stderr).toContain('selected UI path must match');
});
