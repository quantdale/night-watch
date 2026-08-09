// ---------------------------------------------------------------------------
// Nightwatch — safety kernel unit tests.
//
// PURE unit tests: no browser, no fixtures, no network. They exercise the
// fail-closed outbound policy (hosts + rules), the policy canary, the
// passive-action kernel, and the Ripple action classifier. Real environment
// configs are loaded via loadEnvironmentConfig(); edge cases use inline
// EnvironmentConfig objects.
// ---------------------------------------------------------------------------

import { test, expect } from '@playwright/test';
import type { EnvironmentConfig } from '../../src/core/environment/types';
import { loadEnvironmentConfig, selectEnvironment } from '../../src/core/environment/index';
import { KNOWN_PRODUCTION_HOSTS } from '../../src/core/safety/hosts';
import { OutboundPolicy } from '../../src/core/safety/outboundPolicy';
import { runCanary, assertCanary, CanaryFailureError } from '../../src/core/safety/canary';
import { assertPassiveAction, ActionNotPassiveError } from '../../src/core/safety/actions';
import { classifyRippleAction } from '../../src/products/ripple/actions';

const ENVS = ['local', 'dev', 'next'] as const;
type EnvName = (typeof ENVS)[number];

/** Inline EnvironmentConfig for edge cases that are not in the JSON configs. */
function inlineEnv(
  name: EnvName,
  allowedHosts: string[],
  opts: { staticAssetHosts?: string[]; telemetryHosts?: string[] } = {}
): EnvironmentConfig {
  return {
    name,
    label: `inline ${name} (test)`,
    uiBaseUrl: name === 'local' ? 'http://127.0.0.1:7311' : `https://${name}.alphaus.cloud`,
    allowedHosts,
    staticAssetHosts: opts.staticAssetHosts ?? [],
    telemetryHosts: opts.telemetryHosts ?? [],
    failOn: [],
  };
}

test('prod hostnames are rejected by policy in every environment', () => {
  const urls = [
    ...KNOWN_PRODUCTION_HOSTS.map((h) => `https://${h}/m/ripple`),
    'https://bluerpc.alphaus.cloud:8443/m/blue',
    'https://billing-prod-xyz.run.app/',
  ];
  for (const envName of ENVS) {
    const policy = new OutboundPolicy(loadEnvironmentConfig(envName));
    for (const url of urls) {
      const d = policy.decide(url);
      expect(d.verdict, `${envName} :: ${url}`).toBe('deny');
      expect(d.hostClass, `${envName} :: ${url}`).toBe('production');
    }
  }
});

test('unknown hostnames fail closed', () => {
  for (const envName of ENVS) {
    const policy = new OutboundPolicy(loadEnvironmentConfig(envName));

    const unknown = policy.decide('https://random-host-xyz.alphaus.cloud/');
    expect(unknown.verdict, `${envName} alphaus.cloud`).toBe('deny');
    expect(unknown.hostClass, `${envName} alphaus.cloud`).toBe('unknown-alphaus');

    const invalid = policy.decide('https://example.invalid/');
    expect(invalid.verdict, `${envName} example.invalid`).toBe('deny');
    expect(invalid.hostClass, `${envName} example.invalid`).toBe('external');

    const other = policy.decide('https://weird.other.tld/');
    expect(other.verdict, `${envName} weird.other.tld`).toBe('deny');
    expect(other.hostClass, `${envName} weird.other.tld`).toBe('external');
  }
});

test('allowed dev host allowed in dev env, denied in local env', () => {
  const url = 'https://apidev.alphaus.cloud/m/blue';

  const dev = new OutboundPolicy(loadEnvironmentConfig('dev')).decide(url);
  expect(dev.verdict).toBe('allow');
  expect(dev.hostClass).toBe('dev');

  const local = new OutboundPolicy(loadEnvironmentConfig('local')).decide(url);
  expect(local.verdict).toBe('deny');
  expect(local.hostClass).toBe('unknown-alphaus');
});

test('next host allowed only in next env', () => {
  const url = 'https://apinext.alphaus.cloud/';

  const next = new OutboundPolicy(loadEnvironmentConfig('next')).decide(url);
  expect(next.verdict).toBe('allow');
  expect(next.hostClass).toBe('next');

  for (const envName of ['local', 'dev'] as const) {
    const d = new OutboundPolicy(loadEnvironmentConfig(envName)).decide(url);
    expect(d.verdict, `${envName}`).toBe('deny');
    expect(d.hostClass, `${envName}`).toBe('unknown-alphaus');
  }
});

test('localhost allowed only in local env', () => {
  const urls = ['http://127.0.0.1:8080/', 'http://localhost:3000/'];

  for (const url of urls) {
    const local = new OutboundPolicy(loadEnvironmentConfig('local')).decide(url);
    expect(local.verdict, `local :: ${url}`).toBe('allow');
    expect(local.hostClass, `local :: ${url}`).toBe('local');
  }

  for (const envName of ['dev', 'next'] as const) {
    const policy = new OutboundPolicy(loadEnvironmentConfig(envName));
    for (const url of urls) {
      const d = policy.decide(url);
      expect(d.verdict, `${envName} :: ${url}`).toBe('deny');
      expect(d.hostClass, `${envName} :: ${url}`).toBe('local');
    }
  }
});

test('static assets allowed only when explicitly listed', () => {
  const url = 'https://fonts.googleapis.com/css2?family=Roboto';

  for (const envName of ['dev', 'next'] as const) {
    const d = new OutboundPolicy(loadEnvironmentConfig(envName)).decide(url);
    expect(d.verdict, `${envName}`).toBe('allow');
    expect(d.hostClass, `${envName}`).toBe('static');
  }

  const local = new OutboundPolicy(loadEnvironmentConfig('local')).decide(url);
  expect(local.verdict).toBe('deny');
  expect(local.hostClass).toBe('external');
});

test('telemetry hosts are blocked without failing', () => {
  const urls = ['https://sentry.io/ingest/x', 'https://o123456.ingest.sentry.io/ingest/x'];
  for (const envName of ENVS) {
    const policy = new OutboundPolicy(loadEnvironmentConfig(envName));
    for (const url of urls) {
      const d = policy.decide(url);
      expect(d.verdict, `${envName} :: ${url}`).toBe('block-telemetry');
      expect(d.hostClass, `${envName} :: ${url}`).toBe('telemetry');
    }
  }
});

test('port-exact allowlist entries', () => {
  const policy = new OutboundPolicy(inlineEnv('local', ['127.0.0.1:8080']));

  const allowed = policy.decide('http://127.0.0.1:8080/');
  expect(allowed.verdict).toBe('allow');
  expect(allowed.hostClass).toBe('local');

  const denied = policy.decide('http://127.0.0.1:9999/');
  expect(denied.verdict).toBe('deny');
  expect(denied.hostClass).toBe('local');
});

test('canary passes for all supported environments', () => {
  for (const envName of ENVS) {
    const policy = new OutboundPolicy(loadEnvironmentConfig(envName));
    const result = runCanary(policy);
    expect(result.pass, `${envName} canary`).toBe(true);
    expect(result.total).toBeGreaterThan(0);
    expect(result.failures).toEqual([]);
    expect(() => assertCanary(result)).not.toThrow();
  }
});

test('canary detects a compromised policy', () => {
  // Compromised allowlist: a production host sneaked into a local-style config.
  const policy = new OutboundPolicy(inlineEnv('local', ['api.alphaus.cloud']));
  const result = runCanary(policy);

  expect(result.pass).toBe(false);

  const prodFailure = result.failures.find((f) => f.label.startsWith('prod:'));
  expect(prodFailure).toBeDefined();
  expect(prodFailure?.expected).toBe('deny');
  expect(prodFailure?.decision.verdict).toBe('allow');
  expect(prodFailure?.decision.host).toBe('api.alphaus.cloud');

  expect(() => assertCanary(result)).toThrow(CanaryFailureError);
});

test('environment selection is fail-closed', () => {
  expect(() => selectEnvironment(undefined)).toThrow();
  expect(() => selectEnvironment('prod')).toThrow();
  expect(() => selectEnvironment('PROD')).toThrow();
  const env = selectEnvironment('local');
  expect(env.name).toBe('local');
});

test('passive-action policy rejects mutation-tagged actions', () => {
  // Mutation label on a click.
  const createInvoice = classifyRippleAction({ id: 'a1', label: 'Create invoice', kind: 'click' });
  expect(createInvoice.passive).toBe(false);
  expect(createInvoice.note).toBeDefined();
  expect(() => assertPassiveAction(createInvoice)).toThrow(ActionNotPassiveError);

  // Navigation to a mutation path.
  const navCalculate = classifyRippleAction({ id: 'a2', label: 'Go', kind: 'navigate', url: 'https://x/invoices/calculate' });
  expect(navCalculate.passive).toBe(false);

  // Navigation to a read-only path.
  const navPlain = classifyRippleAction({ id: 'a3', label: 'Go', kind: 'navigate', url: 'https://x/invoices' });
  expect(navPlain.passive).toBe(true);
  expect(() => assertPassiveAction(navPlain)).not.toThrow();

  // Plain label, no URL.
  const viewList = classifyRippleAction({ id: 'a4', label: 'View invoice list', kind: 'navigate' });
  expect(viewList.passive).toBe(true);
  expect(() => assertPassiveAction(viewList)).not.toThrow();

  // Fail closed: unparsable navigation URL is non-passive.
  const badUrl = classifyRippleAction({ id: 'a5', label: 'Go', kind: 'navigate', url: 'not a url' });
  expect(badUrl.passive).toBe(false);
});
