import { test, expect } from '@playwright/test';
import type { EnvironmentConfig } from '../../src/core/environment/types';
import { validateUiUrl } from '../../src/browser/context';

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
