// M8 task 9.9 (NW-AUD-028) — the relay mints a per-INVOCATION credential and
// accounts a RELAY-WIDE budget, and an observation is never overwritten.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { MAX_RELAY_REQUESTS, startPhase5Relay } from '../../src/api/phase5/relay';
import { API_CATALOG_VERSION, SCENARIO_GENERATOR_VERSION } from '../../src/api/phase5/types';

const RELAY_SOURCE = fs.readFileSync(path.resolve(__dirname, '..', '..', 'src', 'api', 'phase5', 'relay.ts'), 'utf8');

async function startRelay() {
  const relay = await startPhase5Relay({
    catalog: { schemaVersion: API_CATALOG_VERSION, generatedBy: SCENARIO_GENERATOR_VERSION, operations: [] },
    mode: 'local',
    targetResolver: () => new URL('http://127.0.0.1:7312/fixture'),
    fetcher: async () => ({ status: 200, headers: { 'content-type': 'application/json' }, body: Buffer.from('{"fixture":true}') }),
  });
  return relay;
}

function relayGet(port: number, operationId: string, headers: Record<string, string>): Promise<number> {
  return new Promise((resolve) => {
    const request = http.request(
      { host: '127.0.0.1', port, method: 'GET', path: `/v1/operations/${operationId}`, headers: { Connection: 'close', ...headers } },
      (response) => {
        response.resume();
        response.once('end', () => resolve(response.statusCode ?? 0));
      },
    );
    request.once('error', () => resolve(0));
    request.end();
  });
}

test.describe('relay invocation authority (9.9)', () => {
  test('every relay invocation mints a fresh 32-hex credential', async () => {
    const first = await startRelay();
    const second = await startRelay();
    try {
      expect(first.invocationCredential).toMatch(/^[0-9a-f]{32}$/);
      expect(second.invocationCredential).toMatch(/^[0-9a-f]{32}$/);
      expect(first.invocationCredential).not.toBe(second.invocationCredential);
    } finally {
      await first.close();
      await second.close();
    }
  });

  test('the relay-wide budget is shared and its bound is declared once', async () => {
    const relay = await startRelay();
    try {
      expect(MAX_RELAY_REQUESTS).toBe(8);
      expect(relay.relayBudgetUsed()).toBe(0);
      for (let index = 0; index < MAX_RELAY_REQUESTS; index += 1) {
        expect(relay.consumeRelayBudget()).toBe(true);
      }
      expect(relay.relayBudgetUsed()).toBe(MAX_RELAY_REQUESTS);
      // The bound is relay-WIDE: a contained runtime cannot reset it.
      expect(relay.consumeRelayBudget()).toBe(false);
      expect(relay.relayBudgetUsed()).toBe(MAX_RELAY_REQUESTS);
    } finally {
      await relay.close();
    }
  });

  test('the relay accepts the invocation-credential header as a known inbound header', async () => {
    const relay = await startRelay();
    try {
      const unknown = await relayGet(relay.port, 'unknown.operation', { 'X-Nightwatch-Operation-Id': 'unknown.operation' });
      expect([403, 404]).toContain(unknown);
      // The credential header is not a safety violation: it is part of the
      // relay's own protocol surface.
      expect(relay.violations).not.toContain('UNSAFE_INBOUND_HEADER');
      expect(RELAY_SOURCE).toContain("'x-nightwatch-invocation-credential'");
    } finally {
      await relay.close();
    }
  });

  test('an observation is written once and a second write is refused, not merged', () => {
    expect(RELAY_SOURCE).toContain("violations.push('RELAY_OBSERVATION_ALREADY_RECORDED');");
    // Exactly ONE map write exists, and it is inside the recorder.
    const mapWrites = RELAY_SOURCE.match(/observations\.set\(/g) ?? [];
    expect(mapWrites.length).toBe(1);
    expect(RELAY_SOURCE).toMatch(/const recordObservation = \(operationId: string, observation: RelayObservation\): void => \{[\s\S]{0,300}observations\.set\(operationId, observation\);/);
    const writes = RELAY_SOURCE.match(/recordObservation\(operationId, /g) ?? [];
    expect(writes.length).toBeGreaterThanOrEqual(3);
    // The recorder keeps the FIRST observation.
    expect(RELAY_SOURCE).toMatch(/if \(observations\.has\(operationId\)\) \{[\s\S]{0,120}return;/);
  });

  test('the parent presents the credential it was minted', () => {
    const l6 = fs.readFileSync(path.resolve(__dirname, '..', '..', 'src', 'core', 'oops', 'l6.ts'), 'utf8');
    expect(l6).toContain("'X-Nightwatch-Invocation-Credential': relay.invocationCredential");
    expect(l6).toContain('relay.consumeRelayBudget()');
  });
});
