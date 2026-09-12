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
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { EnvironmentConfig } from '../../src/core/environment/types';
import { loadEnvironmentConfig, selectEnvironment, validateEnvironmentConfig } from '../../src/core/environment/index';
import {
  assertEnvironmentSurface,
  effectiveConfiguration,
  loadEnvironmentSurface,
  renderEffectiveConfiguration,
  validateEnvironmentValues,
} from '../../src/core/config/environmentSurface';
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

test('environment config authority ignores a malicious current working directory', () => {
  const originalCwd = process.cwd();
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-malicious-cwd-'));
  const fakeConfigDirectory = path.join(fixture, 'config', 'environments');
  fs.mkdirSync(fakeConfigDirectory, { recursive: true, mode: 0o700 });
  fs.writeFileSync(path.join(fakeConfigDirectory, 'dev.json'), JSON.stringify({
    name: 'dev',
    label: 'malicious synthetic config',
    uiBaseUrl: 'https://unsafe.invalid/',
    apiHosts: ['unsafe.invalid'],
    authHosts: ['unsafe.invalid'],
    allowedHosts: ['unsafe.invalid'],
    staticAssetHosts: [],
    telemetryHosts: [],
    optionalThirdPartySupportHosts: [],
    browserBackgroundHosts: [],
    failOn: [],
  }), { mode: 0o600 });
  try {
    process.chdir(fixture);
    const loaded = loadEnvironmentConfig('dev');
    expect(loaded.uiBaseUrl).toBe('https://appdev.alphaus.cloud/ripple/');
    expect(loaded.allowedHosts).not.toContain('unsafe.invalid');
  } finally {
    process.chdir(originalCwd);
    fs.rmSync(fixture, { recursive: true, force: true });
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

test('the three approved browser-background hosts are exact, distinct, and non-fatal blocks', () => {
  const expected = [
    ['android.clients.google.com', 'BROWSER_BACKGROUND_GOOGLE', 'browser-background-google'],
    ['update.googleapis.com', 'BROWSER_BACKGROUND_UPDATE', 'browser-background-update'],
    ['redirector.gvt1.com', 'BROWSER_BACKGROUND_DOWNLOAD', 'browser-background-download'],
  ] as const;
  const related = ['clients.google.com', 'edgedl.me.gvt1.com', 'redirector.gvt2.com', 'update.googleapis.com.evil.invalid'];

  for (const envName of ENVS) {
    const env = loadEnvironmentConfig(envName);
    const policy = new OutboundPolicy(env);
    for (const [host, classification, hostClass] of expected) {
      const decision = policy.decide(`https://${host}/synthetic-background-path`);
      expect(decision.verdict, `${envName} :: ${host}`).toBe('block-browser-background');
      expect(decision.classification, `${envName} :: ${host}`).toBe(classification);
      expect(decision.hostClass, `${envName} :: ${host}`).toBe(hostClass);
      expect(env.allowedHosts, `${envName} allowlist :: ${host}`).not.toContain(host);
      expect(env.telemetryHosts, `${envName} telemetry :: ${host}`).not.toContain(host);
      expect(env.browserBackgroundHosts?.find((entry) => entry.host === host)?.classification).toBe(classification);
    }
    expect(env.browserBackgroundHosts?.every((entry) => !entry.host.includes('*'))).toBe(true);

    for (const host of related) {
      const decision = policy.decide(`https://${host}/`);
      expect(decision.verdict, `${envName} :: ${host}`).toBe('deny');
      expect(decision.classification, `${envName} :: ${host}`).toBe('UNKNOWN');
    }
  }
});

test('semantic categories for expected, telemetry, optional support, unknown, and production remain distinct', () => {
  const policy = new OutboundPolicy(loadEnvironmentConfig('dev'));
  expect(policy.decide('https://appdev.alphaus.cloud/ripple/').classification).toBe('EXPECTED');
  expect(policy.decide('https://www.google.com/').classification).toBe('TELEMETRY');
  expect(policy.decide('https://widget.usepylon.com/').classification).toBe('OPTIONAL_THIRD_PARTY_SUPPORT');
  expect(policy.decide('https://clients.google.com/').classification).toBe('UNKNOWN');
  expect(policy.decide('https://app.alphaus.cloud/').classification).toBe('PRODUCTION_DENIED');
});

test('browser-background config rejects wildcard or malformed entries', () => {
  const base = inlineEnv('local', []);
  expect(() => validateEnvironmentConfig('local', {
    ...base,
    browserBackgroundHosts: [{ host: '*.google.com', classification: 'BROWSER_BACKGROUND_GOOGLE' }],
  })).toThrow(/exact hostname/);
  expect(() => validateEnvironmentConfig('local', {
    ...base,
    browserBackgroundHosts: [{ host: 'android.clients.google.com', classification: 'TELEMETRY' }],
  })).toThrow(/supported browser-background classification/);
});

test('browser-background classification stays blocked even if an invalid allowlist includes the exact host', () => {
  const base = loadEnvironmentConfig('local');
  const policy = new OutboundPolicy({
    ...base,
    allowedHosts: [...base.allowedHosts, 'android.clients.google.com'],
  });
  const decision = policy.decide('https://android.clients.google.com/generate_204');
  expect(decision.verdict).toBe('block-browser-background');
  expect(decision.classification).toBe('BROWSER_BACKGROUND_GOOGLE');
});

test('the exact Pylon widget host is optional support, never telemetry or allowlisted', () => {
  const relatedHosts = [
    'api.usepylon.com',
    'cdn.usepylon.com',
    'widget.eu.usepylon.com',
    'widget.usepylon.com.evil.invalid',
  ];
  for (const envName of ENVS) {
    const env = loadEnvironmentConfig(envName);
    const policy = new OutboundPolicy(env);
    const exact = policy.decide('https://widget.usepylon.com/widget/synthetic-app-id');
    expect(env.allowedHosts, `${envName} allowlist`).not.toContain('widget.usepylon.com');
    expect(env.telemetryHosts, `${envName} telemetry`).not.toContain('widget.usepylon.com');
    expect(env.optionalThirdPartySupportHosts, `${envName} optional support`).toEqual(['widget.usepylon.com']);
    expect(exact.verdict, envName).toBe('block-optional-support');
    expect(exact.hostClass, envName).toBe('optional-third-party-support');
    for (const relatedHost of relatedHosts) {
      const related = policy.decide(`https://${relatedHost}/widget/synthetic-app-id`);
      expect(related.verdict, `${envName} :: ${relatedHost}`).toBe('deny');
      expect(related.hostClass, `${envName} :: ${relatedHost}`).toBe('external');
    }
  }
});

test('approved Chromium background hosts are blocked telemetry, never allowed', () => {
  const hosts = ['clients2.google.com', 'safebrowsingohttpgateway.googleapis.com'];
  for (const envName of ['dev', 'next'] as const) {
    const env = loadEnvironmentConfig(envName);
    const policy = new OutboundPolicy(env);
    for (const host of hosts) {
      expect(env.allowedHosts, `${envName} allowlist :: ${host}`).not.toContain(host);
      expect(env.telemetryHosts, `${envName} telemetry classification :: ${host}`).toContain(host);
      const decision = policy.decide(`https://${host}/background-check`);
      expect(decision.verdict, `${envName} :: ${host}`).toBe('block-telemetry');
      expect(decision.hostClass, `${envName} :: ${host}`).toBe('telemetry');
    }
  }
});

test('reviewed Chrome telemetry is blocked only in the observed local and DEV environments', () => {
  for (const envName of ['local', 'dev'] as const) {
    const env = loadEnvironmentConfig(envName);
    expect(env.allowedHosts, `${envName} allowlist`).not.toContain('www.gstatic.com');
    expect(env.browserBackgroundHosts?.some((entry) => entry.host === 'www.gstatic.com'), `${envName} background`).toBe(false);
    expect(env.telemetryHosts, `${envName} telemetry`).toContain('www.gstatic.com');
    const decision = new OutboundPolicy(env).decide('https://www.gstatic.com/synthetic-background-check');
    expect(decision.verdict, envName).toBe('block-telemetry');
    expect(decision.hostClass, envName).toBe('telemetry');
  }

  const next = loadEnvironmentConfig('next');
  expect(next.allowedHosts).not.toContain('www.gstatic.com');
  expect(next.telemetryHosts).not.toContain('www.gstatic.com');
  expect(new OutboundPolicy(next).decide('https://www.gstatic.com/synthetic-background-check').verdict).toBe('deny');
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

// ---------------------------------------------------------------------------
// Phase 1.1 — WebSocket URL classification (ws/wss are network schemes and
// must be governed with EXACTLY the same host rules as http/https; the
// harness's routeWebSocket policy uses this same decide()).
// ---------------------------------------------------------------------------

test.describe('WebSocket policy (ws/wss network schemes)', () => {
  const local = loadEnvironmentConfig('local');
  const dev = loadEnvironmentConfig('dev');
  const next = loadEnvironmentConfig('next');

  const localWithTelemetry = inlineEnv('local', ['127.0.0.1', 'localhost'], {
    telemetryHosts: ['sentry.example.invalid'],
  });

  test('allowed localhost WebSocket is permitted in the local environment', () => {
    const d = new OutboundPolicy(local).decide('ws://127.0.0.1:8080/ws');
    expect(d.verdict).toBe('allow');
    expect(d.hostClass).toBe('local');
  });

  test('production WebSocket destinations are hard-denied in every environment', () => {
    for (const env of [local, dev, next]) {
      const d = new OutboundPolicy(env).decide('wss://api.alphaus.cloud:8443/socket');
      expect(d.verdict).toBe('deny');
      expect(d.hostClass).toBe('production');
      const d2 = new OutboundPolicy(env).decide('ws://bluerpc.alphaus.cloud/ws');
      expect(d2.verdict).toBe('deny');
    }
  });

  test('unknown Alphaus WebSocket destinations fail closed', () => {
    for (const env of [local, dev, next]) {
      const d = new OutboundPolicy(env).decide('ws://random-host-xyz.alphaus.cloud/socket');
      expect(d.verdict).toBe('deny');
      expect(d.hostClass).toBe('unknown-alphaus');
    }
  });

  test('unexpected external WebSocket destinations are denied', () => {
    const d = new OutboundPolicy(local).decide('wss://example.invalid/socket');
    expect(d.verdict).toBe('deny');
    expect(d.hostClass).toBe('external');
  });

  test('telemetry WebSocket destinations are blocked, not denied', () => {
    const d = new OutboundPolicy(localWithTelemetry).decide('wss://sentry.example.invalid/ingest');
    expect(d.verdict).toBe('block-telemetry');
    expect(d.hostClass).toBe('telemetry');
  });

  test('dev/next hosts are only allowed in their own environment over ws too', () => {
    const devWs = new OutboundPolicy(dev).decide('wss://apidev.alphaus.cloud/ws');
    expect(devWs.verdict).toBe('allow');
    const localToDev = new OutboundPolicy(local).decide('wss://apidev.alphaus.cloud/ws');
    expect(localToDev.verdict).toBe('deny');
    expect(localToDev.hostClass).toBe('unknown-alphaus');
  });

  test('non-network schemes remain internal (data:/blob:/about:)', () => {
    for (const url of ['data:text/plain,hi', 'blob:https://x/y', 'about:blank', 'javascript:void(0)']) {
      const d = new OutboundPolicy(local).decide(url);
      expect(d.verdict).toBe('allow');
      expect(d.hostClass).toBe('internal');
    }
  });

  test('isNetworkUrl classifies ws/wss/http/https as network, others not', () => {
    const { isNetworkUrl } = require('../../src/core/safety/outboundPolicy') as typeof import('../../src/core/safety/outboundPolicy');
    expect(isNetworkUrl('http://a/')).toBe(true);
    expect(isNetworkUrl('https://a/')).toBe(true);
    expect(isNetworkUrl('ws://a/')).toBe(true);
    expect(isNetworkUrl('wss://a/')).toBe(true);
    expect(isNetworkUrl('data:text/plain,hi')).toBe(false);
    expect(isNetworkUrl('blob:https://x/y')).toBe(false);
    expect(isNetworkUrl('not a url')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// F-19 — configuration contract: the declared environment surface and the
// schema-validated environment configs.
// ---------------------------------------------------------------------------

test.describe('environment surface declaration', () => {
  const surface = loadEnvironmentSurface();

  test('declares the safety-relevant variables with secret-bearing flags', () => {
    const byName = new Map(surface.variables.map((entry) => [entry.name, entry]));
    for (const name of [
      'NIGHTWATCH_ENV',
      'NIGHTWATCH_UI_URL',
      'NIGHTWATCH_STORAGE_STATE',
      'NIGHTWATCH_REASONER_CLI',
      'NIGHTWATCH_PROXY_PORT',
      'NIGHTWATCH_PROXY_LEASE_TOKEN',
      'NIGHTWATCH_PROXY_LEASE_PATH',
      'NIGHTWATCH_HEADED',
      'NIGHTWATCH_PRINT_CLI',
      'NIGHTWATCH_PRINT_ARGS',
    ]) {
      expect(byName.has(name), `${name} must be declared`).toBe(true);
      expect(byName.get(name)?.purpose.length).toBeGreaterThan(12);
      expect(byName.get(name)?.consumers.length).toBeGreaterThan(0);
    }
    expect(byName.get('NIGHTWATCH_STORAGE_STATE')?.secretBearing).toBe(true);
    expect(byName.get('NIGHTWATCH_PROXY_LEASE_TOKEN')?.secretBearing).toBe(true);
    expect(byName.get('NIGHTWATCH_REASONER_CLI')?.shape.kind).toBe('absolute-executable');
    expect(byName.get('NIGHTWATCH_ENV')?.shape).toEqual({ kind: 'enum', values: ['local', 'dev', 'next'] });
  });

  test('a malformed value fails closed and an unknown name reports its closest declaration', () => {
    expect(() => assertEnvironmentSurface({ NIGHTWATCH_HEADED: 'maybe' }, surface)).toThrow(/NIGHTWATCH_HEADED/);
    expect(() => assertEnvironmentSurface({ NIGHTWATCH_ENV: 'production' }, surface)).toThrow(/NIGHTWATCH_ENV/);
    expect(() => assertEnvironmentSurface({ NIGHTWATCH_PROXY_PORT: '0' }, surface)).toThrow(/NIGHTWATCH_PROXY_PORT/);
    const verdict = validateEnvironmentValues({ NIGHTWATCH_REASONER_CLI_PATH: '/synthetic/reasoner' }, surface);
    expect(verdict.ok).toBe(true);
    expect(verdict.unknown).toHaveLength(1);
    expect(verdict.unknown[0]?.name).toBe('NIGHTWATCH_REASONER_CLI_PATH');
    expect(verdict.unknown[0]?.closest).toBe('NIGHTWATCH_REASONER_CLI');
    expect(verdict.unknown[0]?.distance).toBeGreaterThan(0);
    expect(() => assertEnvironmentSurface({ NIGHTWATCH_REASONER_CLI_PATH: '/x' }, surface)).not.toThrow();
  });

  test('the effective configuration is printed with per-variable source and redaction', () => {
    const rows = effectiveConfiguration(
      { NIGHTWATCH_ENV: 'local', NIGHTWATCH_STORAGE_STATE: '/synthetic/owner/state.json' },
      surface,
    );
    const envRow = rows.find((row) => row.name === 'NIGHTWATCH_ENV');
    expect(envRow?.source).toBe('PROCESS_ENVIRONMENT');
    expect(envRow?.value).toBe('local');
    const secretRow = rows.find((row) => row.name === 'NIGHTWATCH_STORAGE_STATE');
    expect(secretRow?.source).toBe('PROCESS_ENVIRONMENT');
    expect(secretRow?.secretBearing).toBe(true);
    expect(secretRow?.value).toBeNull();
    const rendered = renderEffectiveConfiguration(rows);
    expect(rendered).not.toContain('/synthetic/owner/state.json');
    expect(rendered).toContain('NIGHTWATCH_STORAGE_STATE = <set>  [PROCESS_ENVIRONMENT] [SECRET]');
    const defaultRow = rows.find((row) => row.name === 'NIGHTWATCH_HEADED');
    expect(defaultRow?.source).toBe('DECLARATION_DEFAULT');
  });
});

test.describe('environment config schema validation', () => {
  test('an unknown key fails the load', () => {
    const base = loadEnvironmentConfig('local');
    expect(() => validateEnvironmentConfig('local', { ...base, alloweHosts: [] })).toThrow(/unknown key "alloweHosts"/);
  });

  test('a malformed host entry fails naming the file, key and entry', () => {
    const base = loadEnvironmentConfig('dev');
    expect(() => validateEnvironmentConfig('dev', { ...base, allowedHosts: ['not a host!'] }, 'config/environments/dev.json'))
      .toThrow(/config\/environments\/dev\.json.*allowedHosts.*not a host!/);
    expect(() => validateEnvironmentConfig('dev', { ...base, telemetryHosts: ['*.*.sentry.io'] }))
      .toThrow(/telemetryHosts/);
  });

  test('a known production host in any allowlist is refused', () => {
    const base = loadEnvironmentConfig('dev');
    for (const host of KNOWN_PRODUCTION_HOSTS) {
      expect(() => validateEnvironmentConfig('dev', { ...base, allowedHosts: [...base.allowedHosts, host] })).toThrow(/production host/);
    }
    expect(() => validateEnvironmentConfig('dev', { ...base, staticAssetHosts: ['*.alphaus.cloud'] }))
      .toThrow(/production host "/);
  });

  test('local stays loopback-only', () => {
    const local = loadEnvironmentConfig('local');
    expect(() => validateEnvironmentConfig('local', { ...local, allowedHosts: ['example.invalid'] }))
      .toThrow(/loopback-only/);
    expect(() => validateEnvironmentConfig('local', { ...local, uiBaseUrl: 'https://example.invalid/' }))
      .toThrow(/loopback-only/);
  });

  test('production.json remains structurally unloadable', () => {
    expect(() => selectEnvironment('production')).toThrow();
    const raw = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'config', 'environments', 'production.json'), 'utf8')) as unknown;
    expect(() => validateEnvironmentConfig('production' as EnvName, raw, 'config/environments/production.json')).toThrow();
  });
});
