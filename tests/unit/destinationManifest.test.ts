// ---------------------------------------------------------------------------
// Nightwatch — sanitized destination manifest tests.
// Synthetic identifiers and query values must never enter the host manifest.
// ---------------------------------------------------------------------------

import { test, expect } from '@playwright/test';
import { loadEnvironmentConfig } from '../../src/core/environment';
import { buildDestinationManifest } from '../../src/core/evidence/destinationManifest';
import type { ProxyEvent } from '../../src/proxy/types';
import type { RunEvent } from '../../src/core/evidence/types';

const env = loadEnvironmentConfig('dev');

function proxy(overrides: Partial<ProxyEvent>): ProxyEvent {
  return {
    seq: 1,
    timestamp: '2026-08-09T00:00:00.000Z',
    runId: 'synthetic-run',
    protocol: 'https-connect',
    host: 'appdev.alphaus.cloud',
    port: 443,
    classification: 'dev',
    decision: 'allow',
    ruleId: 'environment-allowlist',
    reason: 'synthetic',
    ...overrides,
  };
}

function browserEvent(overrides: Partial<RunEvent>): RunEvent {
  return {
    seq: 2,
    ts: '2026-08-09T00:00:00.000Z',
    type: 'request',
    severity: 'info',
    message: 'synthetic',
    data: {
      url: 'https://unknown.alphaus.cloud/companies/<ID>?customer=[REDACTED]',
      verdict: 'deny',
      hostClass: 'unknown-alphaus',
    },
    ...overrides,
  };
}

test('manifest separates expected, blocked, and unresolved destinations without URLs or query values', () => {
  const result = buildDestinationManifest(
    env,
    [
      proxy({ host: 'appdev.alphaus.cloud' }),
      proxy({ host: 'api.alphaus.cloud', classification: 'production', decision: 'deny', ruleId: 'known-production' }),
      proxy({ host: 'sentry.io', classification: 'telemetry', decision: 'block-telemetry', ruleId: 'telemetry' }),
    ],
    [browserEvent({})]
  );

  expect(result.expected).toHaveLength(1);
  expect(result.blocked.map((entry) => entry.hostname)).toEqual(['api.alphaus.cloud', 'sentry.io']);
  expect(result.unresolved.map((entry) => entry.hostname)).toEqual(['unknown.alphaus.cloud']);
  const serialized = JSON.stringify(result);
  expect(serialized).not.toContain('/companies/');
  expect(serialized).not.toContain('FAKE_CUSTOMER');
  expect(serialized).not.toContain('?');
});
test('verified runtime host is explicit and never learned from an observation', () => {
  const result = buildDestinationManifest(
    env,
    [proxy({ host: 'newdev.alphaus.cloud', classification: 'dev', decision: 'allow', ruleId: 'verified-input' })],
    [],
    ['newdev.alphaus.cloud']
  );
  expect(result.newButVerified).toMatchObject([{ hostname: 'newdev.alphaus.cloud', requestCount: 1 }]);

  const unresolved = buildDestinationManifest(
    env,
    [proxy({ host: 'newdev.alphaus.cloud', classification: 'dev', decision: 'allow', ruleId: 'unexpected' })],
    []
  );
  expect(unresolved.unresolved).toMatchObject([{ hostname: 'newdev.alphaus.cloud' }]);
});

test('exact optional support blocking is represented as blocked, not unresolved, with a distinct category', () => {
  const result = buildDestinationManifest(
    env,
    [],
    [{
      ...browserEvent({
        type: 'optional-support',
        data: {
          url: 'https://widget.usepylon.com/widget/<ID>',
          verdict: 'block-optional-support',
          hostClass: 'optional-third-party-support',
          classification: 'OPTIONAL_THIRD_PARTY_SUPPORT',
        },
      }),
    }]
  );

  expect(result.blocked).toMatchObject([{
    hostname: 'widget.usepylon.com',
    environmentClassification: 'optional-third-party-support',
    policyRule: 'browser-policy',
    observedPurpose: 'optional-support-chat',
    decision: 'block-optional-support',
    requestCount: 1,
  }]);
  expect(result.unresolved).toEqual([]);
  expect(JSON.stringify(result)).not.toContain('<ID>');
});
