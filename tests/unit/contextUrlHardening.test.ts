import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import type { EnvironmentConfig } from '../../src/core/environment/types';
import { validateUiUrl } from '../../src/browser/context';
import { loadEnvironmentConfig } from '../../src/core/environment';

const ENV: EnvironmentConfig = {
  name: 'local',
  label: 'synthetic local environment',
  uiBaseUrl: 'http://127.0.0.1:7311/',
  allowedHosts: ['127.0.0.1'],
  staticAssetHosts: [],
  telemetryHosts: [],
  failOn: [],
};

test('UI target validation rejects URL userinfo and fragment/query material', () => {
  for (const target of [
    'http://synthetic-user:synthetic-password@127.0.0.1:7311/',
    'http://127.0.0.1:7311/?synthetic-query=synthetic-value',
    'http://127.0.0.1:7311/#synthetic-fragment',
  ]) {
    let thrown: Error | undefined;
    try {
      validateUiUrl(ENV, target);
    } catch (error) {
      thrown = error as Error;
    }
    expect(thrown, target).toBeDefined();
    expect(thrown?.message).not.toContain('synthetic-password');
    expect(thrown?.message).not.toContain('synthetic-query');
    expect(thrown?.message).not.toContain('synthetic-fragment');
  }
});

test('UI target validation binds the exact configured origin, not any allowlisted host', () => {
  const environment = { ...ENV, allowedHosts: ['127.0.0.1', 'api.synthetic.local'] };
  expect(() => validateUiUrl(environment, 'http://api.synthetic.local:7311/')).toThrow(/verified environment origin/);
  expect(validateUiUrl(environment, 'http://127.0.0.1:7311/')).toBe('http://127.0.0.1:7311/');
});

test('a disallowed NIGHTWATCH_UI_URL override refuses before a browser context exists', () => {
  // F-19. The override path is the same value a --ui-url flag publishes to the
  // child environment; a host outside the selected environment's allowlist
  // must refuse, and the refusal must happen before the browser is touched.
  const dev = loadEnvironmentConfig('dev');
  expect(() => validateUiUrl(dev, 'https://override.invalid/ripple/')).toThrow(/not in the allowlist/);
  expect(() => validateUiUrl(dev, 'https://app.alphaus.cloud/ripple/')).toThrow(/not in the allowlist/);
  const factory = fs.readFileSync(path.join(process.cwd(), 'src', 'browser', 'context.ts'), 'utf8');
  const validateAt = factory.indexOf('validateUiUrl(opts.env, opts.uiBaseUrl)');
  const newContextAt = factory.indexOf('browser.newContext');
  expect(validateAt, 'the factory must validate the UI URL').toBeGreaterThan(-1);
  expect(newContextAt, 'the factory must create the context in this module').toBeGreaterThan(-1);
  expect(validateAt, 'UI URL validation must precede any browser context creation').toBeLessThan(newContextAt);
});
