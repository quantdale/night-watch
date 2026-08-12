import { test, expect } from '@playwright/test';
import { loadEnvironmentConfig } from '../../src/core/environment';
import {
  classifyRippleEndpoint,
  matchRippleEndpoint,
  type EndpointSemanticRule,
} from '../../src/core/safety/endpointSemantics';
import { buildRippleJourneyEndpointRegistry } from '../../src/products/ripple/journeyContracts';

test('endpoint semantics never infer read/write meaning from HTTP method', () => {
  const env = loadEnvironmentConfig('dev');
  expect(classifyRippleEndpoint('https://apidev.alphaus.cloud/m/blue/cost/v1/', 'POST', env)).toBe('UNKNOWN');
  expect(classifyRippleEndpoint('https://apidev.alphaus.cloud/m/blue/cost/v1/', 'GET', env)).toBe('UNKNOWN');
});

test('exact reviewed registry rules can classify known read and mutation endpoints', () => {
  const env = loadEnvironmentConfig('dev');
  const rules: readonly EndpointSemanticRule[] = [
    {
      id: 'synthetic-reviewed-read',
      host: 'apidev.alphaus.cloud',
      method: 'GET',
      path: '/reviewed/read',
      classification: 'KNOWN_READ',
      provenance: 'synthetic-unit-test',
    },
    {
      id: 'synthetic-reviewed-mutation',
      host: 'apidev.alphaus.cloud',
      method: 'POST',
      path: '/reviewed/mutation',
      classification: 'KNOWN_MUTATION',
      provenance: 'synthetic-unit-test',
    },
  ];
  expect(classifyRippleEndpoint('https://apidev.alphaus.cloud/reviewed/read', 'GET', env, rules)).toBe('KNOWN_READ');
  expect(classifyRippleEndpoint('https://apidev.alphaus.cloud/reviewed/mutation', 'POST', env, rules)).toBe('KNOWN_MUTATION');
  expect(classifyRippleEndpoint('https://apidev.alphaus.cloud/reviewed/mutation', 'GET', env, rules)).toBe('UNKNOWN');
  expect(classifyRippleEndpoint('https://unknown.invalid/reviewed/read', 'GET', env, rules)).toBe(null);
});

test('Phase 2B registry preserves source-backed path and rule identity semantics', () => {
  const env = loadEnvironmentConfig('dev');
  const registry = buildRippleJourneyEndpointRegistry(env);
  expect(classifyRippleEndpoint(
    'https://apidev.alphaus.cloud/m/ripple/v2/payer/exchange_rate/2026-08?vendor=aws',
    'GET',
    env,
    registry,
  )).toBe('KNOWN_READ');
  expect(matchRippleEndpoint(
    'https://apidev.alphaus.cloud/m/ripple/v2/payer/exchange_rate/2026-08',
    'POST',
    env,
    registry,
  )).toEqual({ ruleId: 'ripple.payer-exchange.write', classification: 'KNOWN_MUTATION' });
  expect(matchRippleEndpoint(
    'https://apidev.alphaus.cloud/m/ripple/unknown',
    'GET',
    env,
    registry,
  )).toEqual({ ruleId: 'unreviewed-api-endpoint', classification: 'UNKNOWN' });
  expect(matchRippleEndpoint(
    'https://apidev.alphaus.cloud/m/ripple/accts',
    'DELETE',
    env,
    registry,
  )).toEqual({ ruleId: 'ripple.account-inventory.write.delete', classification: 'KNOWN_MUTATION' });
});
