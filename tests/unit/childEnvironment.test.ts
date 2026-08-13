import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(__dirname, '..', '..');
const builderModule = pathToFileURL(path.join(root, 'bin', 'child-environment.mjs')).href;
const fixture = path.join(root, 'tests', 'fixtures', 'inspect-child-env.mjs');

test('authenticated child receives an allowlisted environment only', () => {
  const parentEnvironment = {
    PATH: '/synthetic/bin',
    HOME: '/synthetic/home',
    LANG: 'C.UTF-8',
    TMPDIR: '/tmp',
    AWS_ACCESS_KEY_ID: 'synthetic-access-key',
    AWS_SECRET_ACCESS_KEY: 'synthetic-secret-key',
    AWS_SESSION_TOKEN: 'synthetic-session-token',
    GOOGLE_APPLICATION_CREDENTIALS: '/synthetic/credentials.json',
    GITHUB_TOKEN: 'synthetic-github-token',
    GH_TOKEN: 'synthetic-gh-token',
    SLACK_WEBHOOK: 'https://synthetic.invalid/webhook',
    OPENAI_API_KEY: 'synthetic-openai-key',
    ANTHROPIC_API_KEY: 'synthetic-anthropic-key',
    NPM_TOKEN: 'synthetic-npm-token',
    SSH_AUTH_SOCK: '/tmp/synthetic-agent.sock',
    CUSTOM_PARENT_SECRET: 'synthetic-custom-secret',
    RANDOMIZED_SYNTHETIC_PARENT_VALUE: 'synthetic-random-value',
  };
  const script = `
    import { buildChildEnvironment } from ${JSON.stringify(builderModule)};
    const child = buildChildEnvironment(${JSON.stringify(parentEnvironment)}, {
      NIGHTWATCH_ENV: 'dev',
      NIGHTWATCH_UI_URL: 'https://synthetic.invalid/',
    });
    process.stdout.write(JSON.stringify(child));
  `;
  const builder = spawnSync(process.execPath, ['--input-type=module', '--eval', script], { encoding: 'utf8' });
  expect(builder.status, builder.stderr).toBe(0);
  const childEnvironment = JSON.parse(builder.stdout) as Record<string, string>;
  const inspected = spawnSync(process.execPath, [fixture], {
    env: childEnvironment,
    encoding: 'utf8',
  });
  expect(inspected.status, inspected.stderr).toBe(0);
  const observed = JSON.parse(inspected.stdout) as Record<string, string>;

  expect(observed.PATH).toBe('/synthetic/bin');
  expect(observed.NIGHTWATCH_ENV).toBe('dev');
  expect(observed.NIGHTWATCH_UI_URL).toBe('https://synthetic.invalid/');
  for (const key of [
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_SESSION_TOKEN',
    'GOOGLE_APPLICATION_CREDENTIALS',
    'GITHUB_TOKEN',
    'GH_TOKEN',
    'SLACK_WEBHOOK',
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'NPM_TOKEN',
    'SSH_AUTH_SOCK',
    'CUSTOM_PARENT_SECRET',
    'RANDOMIZED_SYNTHETIC_PARENT_VALUE',
  ]) {
    expect(observed[key], key).toBeUndefined();
  }
});

test('child environment rejects non-Nightwatch explicit keys', () => {
  const script = `
    import { buildChildEnvironment } from ${JSON.stringify(builderModule)};
    try {
      buildChildEnvironment({}, { AWS_ACCESS_KEY_ID: 'synthetic' });
      process.exit(1);
    } catch (error) {
      process.stdout.write(String(error));
    }
  `;
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', script], { encoding: 'utf8' });
  expect(result.status).toBe(0);
  expect(result.stdout).toContain('CHILD_ENV_EXPLICIT_KEY_INVALID');
});
