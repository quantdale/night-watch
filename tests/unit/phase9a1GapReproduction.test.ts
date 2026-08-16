// ---------------------------------------------------------------------------
// Nightwatch Phase 9A.1 — gap reproduction AND closure regression (SPEC §4,
// §5, §22, §23, §24, §37).
//
// Pre-fix record (2026-08-16, HEAD 91a64e5): these tests PROVED the three
// Phase 9A.1 observability gaps:
//
//   Gap A — real Alphaus source yields zero derived expectations
//           (REAL_SOURCE_EXPECTATION_CANARY: NOT_ADMITTED) — proven by
//           tests/unit/oracleExpectationRealSource.test.ts (blockCount 0,
//           expectations 0 against the live checkout).
//   Gap B — NO_EXPECTATION indistinguishable from PASS: both returned the
//           identical value { findings: [] } with no receipt, no outcome.
//   Gap C — a throwing semantic hook inside the network observer was
//           silent: the observer continued and NO semantic-evaluation
//           receipt or failure evidence existed anywhere.
//
// Post-fix: this file is the closure regression.
//   Gap B closed: NO_EXPECTATION is an explicit receipt outcome, distinct
//           from the PASS receipt (receiptId differs; outcome differs).
//   Gap C closed: a throwing oracle yields a safe INTERNAL_ERROR receipt in
//           the observer's semanticEvaluations() ledger, the observer stays
//           alive, and no raw exception text ever surfaces.
//   SPEC §24: a synthetic privacy-contract violation yields an explicit
//           INTERNAL_ERROR receipt + escalation (monitor hard failure) —
//           never findings: [] / PASS / NOT_APPLICABLE.
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
import { deriveExpectations, type SemanticExpectation } from '../../src/oracles/expectations';
import type { RealSourceResolution } from '../../src/oracles/expectations/resolver';
import { evaluateSemanticHook, type SemanticHookOracle } from '../../src/oracles/semantic';
import { validateSemanticEvaluationReceipt } from '../../src/oracles/semantic/receipts';

const CORPUS_ROOT = path.join(__dirname, '..', '..', 'corpus', 'phase9');
const FIXTURE_SHA = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const PROVENANCE = {
  repoId: 'corpus/phase9/source-fixture',
  sha: FIXTURE_SHA,
  relativePath: 'contracts/entityCatalog.ts',
  derivationVersion: 'nightwatch.expectation-derivation.v1',
};

function loadExpectation(expectationId: string): SemanticExpectation {
  const sourceText = fs.readFileSync(path.join(CORPUS_ROOT, 'source-fixture', 'contracts', 'entityCatalog.ts'), 'utf8');
  const { expectations } = deriveExpectations({ sourceText, provenance: PROVENANCE });
  const expectation = expectations.find((item) => item.expectationId === expectationId);
  if (expectation === undefined) throw new Error(`expectation not found: ${expectationId}`);
  return expectation;
}

function oracle(resolution: RealSourceResolution): SemanticHookOracle {
  return { resolve: () => resolution };
}

test.describe('Phase 9A.1 closure — Gap B: NO_EXPECTATION is now distinguishable from PASS', () => {
  test('NO_EXPECTATION and PASS produce different receipts with explicit outcomes', () => {
    const noExpectation = evaluateSemanticHook({
      oracle: oracle({ kind: 'NO_EXPECTATION', targetId: 'ripple.synthetic.unknown.read' }),
      rawText: JSON.stringify({ data: { id: 'synthetic-entity-a' } }),
      status: 200,
      contentType: 'application/json',
      url: 'https://synthetic.local/entity/read',
      method: 'GET',
      targetId: 'ripple.synthetic.unknown.read',
    });
    const genuinePass = evaluateSemanticHook({
      oracle: oracle({ kind: 'RESOLVED', expectation: loadExpectation('fixture.entity.read.success-envelope'), sourceSnapshot: { repoId: PROVENANCE.repoId, sha: FIXTURE_SHA } }),
      rawText: JSON.stringify({ data: { id: 'synthetic-entity-a' } }),
      status: 200,
      contentType: 'application/json',
      url: 'https://synthetic.local/entity/read',
      method: 'GET',
      targetId: 'fixture.entity.read.success-envelope',
    });

    // Both still carry zero findings...
    expect(noExpectation.findings).toHaveLength(0);
    expect(genuinePass.findings).toHaveLength(0);
    // ...but they are no longer indistinguishable: explicit receipts exist.
    expect(noExpectation.receipt?.outcome).toBe('NO_EXPECTATION');
    expect(genuinePass.receipt?.outcome).toBe('PASS');
    expect(noExpectation.receipt?.receiptId).not.toBe(genuinePass.receipt?.receiptId);
    expect(noExpectation.receipt?.expectationId).toBeUndefined();
    expect(genuinePass.receipt?.expectationId).toBe('fixture.entity.read.success-envelope');
    validateSemanticEvaluationReceipt(noExpectation.receipt!);
    validateSemanticEvaluationReceipt(genuinePass.receipt!);
  });
});

test.describe('Phase 9A.1 closure — Gap C: no silent semantic hook failure in the observer', () => {
  function fixtureEnvironment(origin: string): EnvironmentConfig {
    const host = new URL(origin).host;
    return {
      name: 'local',
      label: 'Phase 9A.1 closure regression fixture',
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

  async function startJsonServer(body: unknown = { data: { id: 'synthetic-entity-a' } }): Promise<{ origin: string; close: () => Promise<void> }> {
    const server = http.createServer((_req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    return {
      origin,
      close: () => new Promise<void>((resolve) => server.close(() => resolve())),
    };
  }

  test('a throwing semantic hook yields a safe INTERNAL_ERROR receipt; observer stays alive', async ({ browser }) => {
    const server = await startJsonServer();
    const env = fixtureEnvironment(server.origin);
    const recorder = new RunRecorder({
      runId: `phase9a1-gap-c-closed-${Date.now()}`,
      environment: 'local',
      product: 'ripple',
      browser: 'chromium',
      scenario: 'phase9a1-gap-c-closure',
    });
    const monitor = new RunMonitor(env.failOn);
    const observer = createNetworkObserver({
      policy: new OutboundPolicy(env),
      recorder,
      monitor,
      endpointClassifier: (): EndpointSemanticClassification | null => 'KNOWN_READ',
      semanticOracle: {
        resolve: () => {
          throw new Error('SENTINEL_HOOK_EXCEPTION_9A1');
        },
      },
    });

    const context = await browser.newContext();
    await observer.install(context);
    const page = await context.newPage();
    try {
      const response = await page.goto(`${server.origin}/api/entity`);
      expect(response?.status()).toBe(200);
      await page.waitForTimeout(250);

      // The observer never crashes and no raw exception text surfaces.
      expect(page.url()).toContain('/api/entity');

      // Explicit, safe, bounded evidence exists now:
      const evaluations = observer.semanticEvaluations();
      expect(evaluations.length).toBeGreaterThanOrEqual(1);
      expect(evaluations[0]?.outcome).toBe('INTERNAL_ERROR');
      validateSemanticEvaluationReceipt(evaluations[0]!);
      expect(observer.semanticEvaluationLedgerOverflow()).toBe(false);
      expect(observer.semanticFindings()).toHaveLength(0);

      const eventsFile = path.join(recorder.dir, 'events.jsonl');
      const ledger = fs.existsSync(eventsFile) ? fs.readFileSync(eventsFile, 'utf8') : '';
      expect(ledger).not.toContain('SENTINEL_HOOK_EXCEPTION_9A1');
      expect(ledger).toContain('semantic-oracle-internal-error');
      expect(ledger).toContain('INTERNAL_ERROR');
    } finally {
      await context.close();
      await server.close();
    }
  });

  test('a privacy-contract violation escalates explicitly and never looks benign', async ({ browser }) => {
    // The server returns a violation body ({error: ...}) for the corrupt
    // expectation; the safe-finding validator then throws a non-classified
    // defect inside the oracle core (SPEC §24).
    const server = await startJsonServer({ error: { code: 'synthetic-error', message: 'SENTINEL_PRIVACY_BODY' } });
    const env = fixtureEnvironment(server.origin);
    const recorder = new RunRecorder({
      runId: `phase9a1-privacy-${Date.now()}`,
      environment: 'local',
      product: 'ripple',
      browser: 'chromium',
      scenario: 'phase9a1-privacy-violation',
    });
    const monitor = new RunMonitor(env.failOn);
    // Synthetic privacy violation: an admitted-looking expectation whose
    // provenance carries an ABSOLUTE path (an impossible safe DTO) makes the
    // safe-finding validator throw a non-classified defect inside the oracle
    // core (SPEC §23/§24: a safe-DTO violation is a Nightwatch defect).
    const corrupt = {
      ...loadExpectation('fixture.entity.read.success-envelope'),
      sourceProvenance: { ...PROVENANCE, relativePath: '/private/abs/provenance-path' },
    };
    const observer = createNetworkObserver({
      policy: new OutboundPolicy(env),
      recorder,
      monitor,
      endpointClassifier: (): EndpointSemanticClassification | null => 'KNOWN_READ',
      semanticOracle: {
        resolve: (): RealSourceResolution => ({
          kind: 'RESOLVED',
          expectation: corrupt,
          sourceSnapshot: { repoId: PROVENANCE.repoId, sha: PROVENANCE.sha },
        }),
      },
    });

    const context = await browser.newContext();
    await observer.install(context);
    const page = await context.newPage();
    try {
      // The server returns a violation body ({error: ...}) for the corrupt
      // expectation; the safe-finding path throws -> explicit escalation.
      const response = await page.goto(`${server.origin}/api/entity`);
      expect(response?.status()).toBe(200);
      await page.waitForTimeout(250);

      // The observer survives, the run is NOT benign: monitor failed with
      // the explicit privacy-contract reason and an INTERNAL_ERROR receipt
      // was recorded.
      expect(monitor.failed).toBe(true);
      const evaluations = observer.semanticEvaluations();
      expect(evaluations.some((receipt) => receipt.outcome === 'INTERNAL_ERROR')).toBe(true);
      const eventsFile = path.join(recorder.dir, 'events.jsonl');
      const ledger = fs.existsSync(eventsFile) ? fs.readFileSync(eventsFile, 'utf8') : '';
      expect(ledger).toContain('semantic-privacy-contract-violation');
      // The sensitive value never appears anywhere.
      expect(ledger).not.toContain('/private/abs/provenance-path');
      expect(JSON.stringify(evaluations)).not.toContain('/private/abs/provenance-path');
      expect(observer.semanticFindings()).toHaveLength(0);
    } finally {
      await context.close();
      await server.close();
    }
  });
});
