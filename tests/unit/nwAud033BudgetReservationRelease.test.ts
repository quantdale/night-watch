// ---------------------------------------------------------------------------
// NW-AUD-033 — the production budget reservation is released on EVERY denial
// path.
//
// `G_BUDGET_RESERVATION` reserves the budget — including the in-flight
// concurrency slot — BEFORE the breaker and pre-dispatch kill-switch gates, and
// before grant consumption. A denial at any of those later points used to
// return without giving the slot back, so with the designed concurrency limit
// of one a single pre-dispatch denial left the ledger permanently full and
// every later run was refused with `BUDGET_EXHAUSTED`.
//
// These tests prove the release in both directions: a refused run gives the
// slot back and can be followed by a real run, AND the release never refunds
// the spend or charges a failure (the conservative direction is preserved), AND
// settlement stays exactly-once so a copied, foreign, or repeated token can no
// longer decrement generic in-flight state.
//
// Everything here is synthetic and loopback-free. No real production, DEV or
// NEXT host, no credential, no auth state.
// ---------------------------------------------------------------------------

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from '@playwright/test';

import {
  PRODUCTION_BUDGET_DEFAULTS,
  ProductionBreakerBoard,
  ProductionBudgetLedger,
  PROD_OBSERVE_CONFIG_ENV,
  PROD_OBSERVE_CONFIG_SCHEMA,
  clearProdObserveGrantRegistryForTest,
  consumeProdObserveGrant,
  evaluateProductionAdmission,
  issueProdObserveGrant,
  loadProdObserveConfig,
  type ProdObserveConfig,
  type ProductionAdmissionInput,
} from '../../src/core/prodObserve';
import { createProductionPrivacyPolicy } from '../../src/core/prodPrivacy/policy';
import { createOpaqueParameterHandle } from '../../src/core/prodPrivacy/parameterProvenance';
import { deriveOpenApiRouteVocabulary } from '../../src/core/prodProvenance/routeVocabularyDerivation';
import type { SourceOperationDescriptor, SourceOperationProjectionCompleteness } from '../../src/core/source/surfaceTypes';

const ROOT = path.resolve(__dirname, '../..');
const NOW = 1_760_000_000_000;
const SYNTHETIC_SHA = 'a'.repeat(40);
const SENTINEL_HANDLE = `pph_${'1'.repeat(32)}`;
const SYNTHETIC_ROUTE_PATH = '/v1/synthetic/things';
const SYNTHETIC_ROUTE_MEMBER = `GET ${SYNTHETIC_ROUTE_PATH}`;
const SYNTHETIC_HOST = 'synthetic-host.invalid';
const CAMPAIGN_ID = 'nightwatch-nw-aud-033-reservation-lifecycle';

function sha24(canonical: string): string {
  return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex').slice(0, 24);
}

function completeness(): SourceOperationProjectionCompleteness {
  return {
    schemaVersion: 'nightwatch.source-operation-projection-completeness.v1',
    state: 'COMPLETE',
    limit: 4096,
    examinedOperations: 1,
    totalOperations: 1,
    projectedOperations: 1,
    droppedOperations: 0,
    truncated: false,
    remainingUnknown: false,
    enumerationCompleteness: 'COMPLETE',
    contentReadCompleteness: 'COMPLETE',
    coverageState: 'COVERED',
    repositories: [],
  } as unknown as SourceOperationProjectionCompleteness;
}

function operation(): SourceOperationDescriptor {
  return {
    operationId: 'listSyntheticThings',
    repository: 'alphauslabs/blueapi',
    sourceSha: SYNTHETIC_SHA,
    sourcePath: 'openapiv2/billing.swagger.json',
    language: 'JSON',
    evidenceDigest: 'ev:sha256:000000000000000000000000',
    method: 'GET',
    routeTemplate: SYNTHETIC_ROUTE_PATH,
    handlerSymbol: null,
    handlerPath: null,
    requestReference: null,
    responseReference: null,
    transport: 'HTTP_API',
    routeProof: 'OPENAPI_OPERATION',
    routeRejectionReason: null,
    readOnlyClassification: 'UNKNOWN',
    runtimeBinding: 'UNRESOLVED',
    targetId: null,
    deploymentStatusUnresolved: true,
  } as unknown as SourceOperationDescriptor;
}

const CURRENT_GENERATION = {
  state: 'CURRENT' as const,
  reason: 'GENERATION_CORROBORATED_EXACT' as const,
  corroborator: 'PROTO_SURFACE' as const,
  artifactOperationCount: 1,
  corroboratedOperationCount: 1,
};

interface Harness {
  readonly budget: ProductionBudgetLedger;
  readonly cleanup: () => void;
  base: () => ProductionAdmissionInput;
}

function createHarness(): Harness {
  // A disposable EXTERNAL config: outside the repository and outside the
  // workspace, 0600, hostname-only allowlist. No server is needed — the gate
  // never dispatches, which is the property under test.
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-aud033-extcfg-'));
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-aud033-wsroot-'));
  const file = path.join(directory, 'prod-observe.v1.json');
  fs.writeFileSync(file, JSON.stringify({
    schemaVersion: PROD_OBSERVE_CONFIG_SCHEMA,
    admittedHosts: [SYNTHETIC_HOST],
    observationWindow: { notBeforeMs: NOW - 60_000, notAfterMs: NOW + 60_000 },
  }), { mode: 0o600 });
  fs.chmodSync(file, 0o600);
  const loaded = loadProdObserveConfig({
    environment: { [PROD_OBSERVE_CONFIG_ENV]: file },
    repositoryRoot: ROOT,
    workspaceRoot,
    digest: sha24,
  });
  if (!loaded.ok) throw new Error(`AUD033_TEST_CONFIG_LOAD_FAILED:${loaded.failure}`);
  const config: ProdObserveConfig = loaded.config;
  const cleanup = (): void => {
    fs.rmSync(directory, { recursive: true, force: true });
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
    clearProdObserveGrantRegistryForTest();
  };
  const base = (): ProductionAdmissionInput => ({
    campaignId: CAMPAIGN_ID,
    stage: 'PQ',
    nowMs: NOW,
    environmentClass: 'LOCAL',
    killSwitchProbe: () => false,
    requestedAuthorizationClass: 'PROD_OBSERVE',
    grant: issueProdObserveGrant({
      campaignId: CAMPAIGN_ID,
      stage: 'PQ',
      notBeforeMs: NOW - 1_000,
      expiresAtMs: NOW + 1_000,
    }),
    config,
    observerIdentityClass: 'ORDINARY_USER',
    source: { repository: 'alphauslabs/blueapi', sourceSha: SYNTHETIC_SHA, inventoryState: 'COMPLETE', currencyState: 'CURRENT' },
    readOnlyProof: { proven: true, witnessCount: 2, stale: false, proofIdentity: `roproof:${sha24('synthetic-two-witness')}` },
    routeVocabulary: deriveOpenApiRouteVocabulary({
      operations: [operation()],
      completeness: completeness(),
      sourceRoot: 'openapiv2',
      generationCurrency: CURRENT_GENERATION,
    }),
    resolvedAddressesAdmitted: true,
    intent: {
      method: 'GET',
      host: SYNTHETIC_HOST,
      routeTemplate: SYNTHETIC_ROUTE_MEMBER,
      hasBody: false,
      mutationClassification: null,
      parameters: [createOpaqueParameterHandle({ handle: SENTINEL_HANDLE, parameterName: 'id' })],
      serviceKey: 'synthetic-service',
      routeKey: 'synthetic-route',
    },
    privacyPolicy: createProductionPrivacyPolicy(),
    containment: 'PROVEN',
    budget: new ProductionBudgetLedger({ startedAtMs: NOW }),
    breakers: new ProductionBreakerBoard(),
  });
  const budget = new ProductionBudgetLedger({ startedAtMs: NOW });
  return { budget, cleanup, base };
}

test.describe('NW-AUD-033 a refused run never keeps a reserved concurrency slot', () => {
  test('a breaker denial AFTER the reservation releases the in-flight slot', () => {
    const harness = createHarness();
    try {
      const base = harness.base();
      const breakers = new ProductionBreakerBoard();
      breakers.open('PRIVACY_VIOLATION');
      const decision = evaluateProductionAdmission({ ...base, breakers }, sha24);

      expect(decision.allowed).toBe(false);
      expect(decision.denialCode).toBe('BREAKER_OPEN');
      expect(decision.deniedAtGate).toBe('G_BREAKER_STATE');
      // The reservation is returned to the ledger, not parked by a refusal.
      expect(base.budget.requestsInFlight).toBe(0);
      // The spend itself is NOT refunded and no failure is charged: the
      // reservation happened, and nothing ever touched production.
      expect(base.budget.campaignRequestsUsed).toBe(1);
      expect(base.budget.failures).toBe(0);
      // The decisive consequence: with the designed concurrency limit of one,
      // the next run can still reserve.
      const next = base.budget.reserve({ serviceKey: 'synthetic-service', routeKey: 'synthetic-route', nowMs: NOW });
      expect(next.ok).toBe(true);
    } finally {
      harness.cleanup();
    }
  });

  test('a pre-dispatch kill-switch denial AFTER the reservation releases the in-flight slot', () => {
    const harness = createHarness();
    try {
      const base = harness.base();
      // Absent at entry, engaged by the pre-dispatch check — the revocation
      // race that must never leave a parked reservation behind.
      let calls = 0;
      const decision = evaluateProductionAdmission({
        ...base,
        killSwitchProbe: () => { calls += 1; return calls > 1; },
      }, sha24);

      expect(decision.allowed).toBe(false);
      expect(decision.denialCode).toBe('KILL_SWITCH_ENGAGED_BEFORE_DISPATCH');
      expect(decision.deniedAtGate).toBe('G_KILL_SWITCH_PREDISPATCH');
      expect(base.budget.requestsInFlight).toBe(0);
      expect(base.budget.campaignRequestsUsed).toBe(1);
      expect(base.budget.failures).toBe(0);
      const next = base.budget.reserve({ serviceKey: 'synthetic-service', routeKey: 'synthetic-route', nowMs: NOW });
      expect(next.ok).toBe(true);
    } finally {
      harness.cleanup();
    }
  });

  test('a lost grant-consumption race AFTER the reservation releases the in-flight slot', () => {
    const harness = createHarness();
    try {
      const base = harness.base();
      // The race is induced through the gate's own injected side effect: the
      // pre-dispatch kill-switch probe runs AFTER `G_OWNER_AUTHORIZATION` has
      // validated the grant, and it consumes the grant underneath the
      // evaluator. Every gate then passes, the reservation is taken, and the
      // final consumption loses its race.
      let calls = 0;
      const decision = evaluateProductionAdmission({
        ...base,
        killSwitchProbe: () => {
          calls += 1;
          if (calls === 2) void consumeProdObserveGrant(base.grant);
          return false;
        },
      }, sha24);

      expect(decision.allowed).toBe(false);
      expect(decision.deniedAtGate).toBe('G_OWNER_AUTHORIZATION');
      expect(decision.denialCode).toBe('ALREADY_CONSUMED');
      expect(decision.deniedBeforeDispatch).toBe(true);
      expect(base.budget.requestsInFlight).toBe(0);
      expect(base.budget.campaignRequestsUsed).toBe(1);
      expect(base.budget.failures).toBe(0);
      const next = base.budget.reserve({ serviceKey: 'synthetic-service', routeKey: 'synthetic-route', nowMs: NOW });
      expect(next.ok).toBe(true);
    } finally {
      harness.cleanup();
    }
  });

  test('an ALLOW keeps its reservation; only a denial releases it', () => {
    const harness = createHarness();
    try {
      const base = harness.base();
      const decision = evaluateProductionAdmission(base, sha24);
      expect(decision.allowed).toBe(true);
      expect(decision.reservation).not.toBeNull();
      // The allowed run still holds the slot it legitimately reserved; the
      // caller settles it exactly once after dispatch.
      expect(base.budget.requestsInFlight).toBe(1);
      base.budget.settle(decision.reservation!, 'SUCCESS');
      expect(base.budget.requestsInFlight).toBe(0);
      // The campaign spend is never refunded, even on success.
      expect(base.budget.campaignRequestsUsed).toBe(1);
    } finally {
      harness.cleanup();
    }
  });

  test('the release is exactly-once and is never charged as a failure', () => {
    const ledger = new ProductionBudgetLedger({ startedAtMs: NOW });
    const first = ledger.reserve({ serviceKey: 'svc', routeKey: 'r', nowMs: NOW });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    ledger.releaseReservation(first.reservation);
    expect(ledger.requestsInFlight).toBe(0);
    expect(ledger.failures).toBe(0);
    // Releasing the same token again hands back nothing.
    ledger.releaseReservation(first.reservation);
    expect(ledger.requestsInFlight).toBe(0);
    // A token this ledger never issued mutates nothing.
    ledger.releaseReservation({ reservationId: 999_999, serviceKey: 'svc', routeKey: 'r' });
    expect(ledger.requestsInFlight).toBe(0);
    expect(ledger.campaignRequestsUsed).toBe(1);
    // The released slot is available again, and re-reserving is a new
    // reservation id rather than a resurrection of the old one.
    const second = ledger.reserve({ serviceKey: 'svc', routeKey: 'r', nowMs: NOW });
    expect(second.ok).toBe(true);
    if (second.ok) expect(second.reservation.reservationId).not.toBe(first.reservation.reservationId);
  });

  test('settlement is exactly-once: a repeated, copied or fabricated token settles nothing', () => {
    const ledger = new ProductionBudgetLedger({
      limits: { ...PRODUCTION_BUDGET_DEFAULTS, concurrency: 1 },
      startedAtMs: NOW,
    });
    const reserved = ledger.reserve({ serviceKey: 'svc', routeKey: 'r', nowMs: NOW });
    expect(reserved.ok).toBe(true);
    if (!reserved.ok) return;
    ledger.settle(reserved.reservation, 'FAILURE');
    expect(ledger.requestsInFlight).toBe(0);
    expect(ledger.failures).toBe(1);
    // A repeated settlement must not release a slot that is not held.
    ledger.settle(reserved.reservation, 'FAILURE');
    expect(ledger.requestsInFlight).toBe(0);
    expect(ledger.failures).toBe(1);
    // A fabricated token with an unknown id mutates nothing at all.
    ledger.settle({ reservationId: 424_242, serviceKey: 'svc', routeKey: 'r' }, 'FAILURE');
    expect(ledger.requestsInFlight).toBe(0);
    expect(ledger.failures).toBe(1);
    // The concurrency slot really is free again.
    expect(ledger.reserve({ serviceKey: 'svc', routeKey: 'r', nowMs: NOW }).ok).toBe(true);
  });

  test('a denied budget exhaustion does not reserve anything to release', () => {
    const harness = createHarness();
    try {
      const base = harness.base();
      const budget = new ProductionBudgetLedger({
        limits: { ...PRODUCTION_BUDGET_DEFAULTS, campaignRequests: 0 },
        startedAtMs: NOW,
      });
      const decision = evaluateProductionAdmission({ ...base, budget }, sha24);
      expect(decision.allowed).toBe(false);
      expect(decision.denialCode).toBe('BUDGET_EXHAUSTED');
      expect(decision.deniedAtGate).toBe('G_BUDGET_RESERVATION');
      // Nothing was reserved, so there is nothing to release, and the failure
      // budget was never charged by the refusal.
      expect(decision.reservation).toBeNull();
      expect(budget.requestsInFlight).toBe(0);
      expect(budget.failures).toBe(0);
    } finally {
      harness.cleanup();
    }
  });
});
