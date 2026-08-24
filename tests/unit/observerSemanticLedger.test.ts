// ---------------------------------------------------------------------------
// Nightwatch Phase 9A.1 — observer semantic evaluation ledger (SPEC §25, §26).
//
// The network observer records a bounded sanitized receipt ledger
// (semanticEvaluations()) alongside the anomaly ledger (semanticFindings()).
// The cap is explicit: overflow latches a flag, never silent. Receipts carry
// only safe metadata — raw bodies never reach the ledger or the recorder.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { OutboundPolicy } from '../../src/core/safety/outboundPolicy';
import { RunRecorder } from '../../src/core/evidence/runRecorder';
import { RunMonitor } from '../../src/state/run';
import { createNetworkObserver } from '../../src/browser/observers/networkObserver';
import type { EnvironmentConfig } from '../../src/core/environment/types';
import type { EndpointSemanticClassification } from '../../src/core/safety/endpointSemantics';
import type { RealSourceResolution } from '../../src/oracles/expectations/resolver';
import type { SemanticHookOracle } from '../../src/oracles/semantic';
import { validateSemanticEvaluationReceipt } from '../../src/oracles/semantic/receipts';
import {
  FIXTURE_REPO_A,
  FIXTURE_SHA_A,
  createFixtureSourceState,
  deriveFixtureExpectations,
} from '../helpers/phase9a1Fixtures';

const CONFORMING_BODY = JSON.stringify([{ month: '2026-01', exchange_rate: { jpy: 150 } }]);
const MUTATED_BODY = JSON.stringify({ error: { code: '1001', message: 'SENTINEL_LEDGER_BODY_X7Q' } });

function fixtureEnvironment(origin: string): EnvironmentConfig {
  const host = new URL(origin).host;
  return {
    name: 'local',
    label: 'Phase 9A.1 observer ledger fixture',
    uiBaseUrl: origin,
    apiHosts: [host],
    authHosts: [],
    allowedHosts: [host, 'localhost'],
    staticAssetHosts: [],
    telemetryHosts: [],
    optionalThirdPartySupportHosts: [],
    browserBackgroundHosts: [],
    failOn: [],
  };
}

async function startServer(): Promise<{ origin: string; close: () => Promise<void> }> {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    if (req.url?.includes('mutated')) {
      res.end(MUTATED_BODY);
    } else {
      res.end(CONFORMING_BODY);
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  return { origin, close: () => new Promise<void>((resolve) => server.close(() => resolve())) };
}

function buildOracle(): { oracle: SemanticHookOracle; resolution: RealSourceResolution } {
  const state = createFixtureSourceState();
  const { derivedA } = deriveFixtureExpectations(state);
  const expectation = derivedA.find((e) => e.expectationId === 'fixture-a.common-exchange.read.real-source-shape')!;
  const resolution: RealSourceResolution = {
    kind: 'RESOLVED',
    expectation,
    sourceSnapshot: { repoId: FIXTURE_REPO_A, sha: FIXTURE_SHA_A },
  };
  return { oracle: { resolve: () => resolution }, resolution };
}

test.describe('Phase 9A.1 — observer semantic evaluation ledger', () => {
  test('every evaluated 2xx JSON response yields a receipt; anomalies also yield findings', async ({ browser }) => {
    const server = await startServer();
    const env = fixtureEnvironment(server.origin);
    const recorder = new RunRecorder({
      runId: `phase9a1-ledger-${Date.now()}`,
      environment: 'local',
      product: 'ripple',
      browser: 'chromium',
      scenario: 'phase9a1-observer-ledger',
    });
    const monitor = new RunMonitor(env.failOn);
    const { oracle } = buildOracle();
    const observer = createNetworkObserver({
      policy: new OutboundPolicy(env),
      recorder,
      monitor,
      endpointClassifier: (): EndpointSemanticClassification | null => 'KNOWN_READ',
      semanticOracle: oracle,
    });

    const context = await browser.newContext();
    await observer.install(context);
    const page = await context.newPage();
    try {
      await page.goto(`${server.origin}/api/conforming`);
      await page.goto(`${server.origin}/api/mutated`);
      await expect.poll(() => observer.semanticEvaluations().length, { timeout: 2_000 }).toBe(2);

      const evaluations = observer.semanticEvaluations();
      expect(evaluations.length).toBe(2);
      expect(evaluations[0]?.outcome).toBe('PASS');
      expect(evaluations[1]?.outcome).toBe('ANOMALY');
      for (const receipt of evaluations) validateSemanticEvaluationReceipt(receipt);
      // Anomalies additionally land in the findings ledger (root-type + item
      // field violations; categorical fingerprints dedupe identical DTOs).
      expect(observer.semanticFindings().length).toBeGreaterThanOrEqual(1);
      expect(observer.semanticFindings()[0]?.category).toBe('SOURCE_EXPECTATION_MISMATCH');
      expect(observer.semanticEvaluationLedgerOverflow()).toBe(false);

      // The receipt ledger contains only safe metadata; the sentinel body
      // never reaches the SEMANTIC channel (the protocol layer's redacted
      // body capture is pre-existing Phase 1 evidence, not semantic).
      expect(JSON.stringify(evaluations)).not.toContain('SENTINEL_LEDGER_BODY_X7Q');
      expect(JSON.stringify(evaluations)).not.toContain('2026-01');
      const eventsFile = path.join(recorder.dir, 'events.jsonl');
      const events = fs.existsSync(eventsFile) ? fs.readFileSync(eventsFile, 'utf8') : '';
      const semanticEvents = events.split(/\r?\n/).filter((line) => line.includes('semanticReceipt') || line.includes('semantic-oracle'));
      expect(semanticEvents.join('\n')).not.toContain('SENTINEL_LEDGER_BODY_X7Q');
      expect(semanticEvents.join('\n')).not.toContain('2026-01');
    } finally {
      await context.close();
      await server.close();
    }
  });

  test('ledger cap is bounded and overflow is explicit, never silent', async ({ browser }) => {
    const server = await startServer();
    const env = fixtureEnvironment(server.origin);
    const recorder = new RunRecorder({
      runId: `phase9a1-ledger-overflow-${Date.now()}`,
      environment: 'local',
      product: 'ripple',
      browser: 'chromium',
      scenario: 'phase9a1-observer-ledger-overflow',
    });
    const monitor = new RunMonitor(env.failOn);
    const { oracle } = buildOracle();
    const observer = createNetworkObserver({
      policy: new OutboundPolicy(env),
      recorder,
      monitor,
      endpointClassifier: (): EndpointSemanticClassification | null => 'KNOWN_READ',
      semanticOracle: oracle,
    });

    const context = await browser.newContext();
    await observer.install(context);
    const page = await context.newPage();
    try {
      // Fire 550 responses in a loop (well past the 512 cap).
      await page.goto(`${server.origin}/api/seed`);
      await page.evaluate(async (target) => {
        for (let i = 0; i < 550; i++) {
          await fetch(`${target}/api/bulk`);
        }
      }, server.origin);
      await expect.poll(() => observer.semanticEvaluations().length, { timeout: 5_000 }).toBe(512);

      const evaluations = observer.semanticEvaluations();
      expect(evaluations.length).toBe(512); // exactly the cap
      expect(observer.semanticEvaluationLedgerOverflow()).toBe(true); // explicit, not silent
      // The observer itself is still alive and functional.
      const response = await page.goto(`${server.origin}/api/after`);
      expect(response?.status()).toBe(200);
    } finally {
      await context.close();
      await server.close();
    }
  });
});
