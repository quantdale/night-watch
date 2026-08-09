// ---------------------------------------------------------------------------
// Nightwatch — Phase 2A pre-real-run gate tests.
// All state and destinations are synthetic/local. No Alphaus DNS or upstream
// connection is used; the one runtime test checks only a loopback proxy.
// ---------------------------------------------------------------------------

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadEnvironmentConfig } from '../../src/core/environment';
import {
  AUTHENTICATED_BROWSER_CONTRACT,
  hasRequiredBrowserLaunchArgs,
  REQUIRED_BROWSER_LAUNCH_ARGS,
} from '../../src/browser/contract';
import {
  assertRealRunGate,
  evaluateRealRunGate,
  runRealRunGate,
  type AuthenticatedEvidenceContract,
  type PassiveActionContract,
  type RealRunGateInput,
  type RepositoryFreshnessContract,
} from '../../src/core/safety/realRunGate';
import { OutboundPolicy } from '../../src/core/safety/outboundPolicy';
import { startOutboundProxy, writeProxyRuntimeState } from '../../src/proxy/server';
import type { ProxyRuntimeState } from '../../src/proxy/types';

const ENV = loadEnvironmentConfig('dev');
const EVIDENCE: AuthenticatedEvidenceContract = {
  metadataFirst: true,
  requestHeadersPersisted: false,
  requestBodiesPersisted: false,
  responseBodiesPersisted: false,
  queryValuesPersisted: false,
  querySanitized: true,
  storageStatePersisted: false,
  customerDomPersisted: false,
  screenshotsEnabled: false,
  tracesEnabled: false,
};
const ACTIONS: PassiveActionContract = { passiveOnly: true, mutationRegistryEnabled: true };
const REPOSITORIES: RepositoryFreshnessContract = {
  snapshotRecorded: true,
  snapshotsValid: true,
  alphausRepositoriesSnapshotValid: true,
  nightwatchDirtyPaths: [],
  documentedNightwatchDirtyPaths: [],
};

function proxyFacts(overrides: Partial<ProxyRuntimeState> = {}) {
  const state: ProxyRuntimeState = {
    address: 'http://127.0.0.1:43123',
    host: '127.0.0.1',
    port: 43123,
    environment: 'dev',
    policyVersion: 'phase-1.2-outbound-policy-v1',
    eventLogPath: '/tmp/nightwatch-test-events.jsonl',
    ...overrides,
  };
  return { state, healthy: true };
}

function baseInput(overrides: Partial<RealRunGateInput> = {}): RealRunGateInput {
  return {
    environment: ENV,
    uiUrl: ENV.uiBaseUrl,
    storageStatePath: '/tmp/synthetic-external-state.json',
    storageStateValid: true,
    proxy: proxyFacts(),
    browser: AUTHENTICATED_BROWSER_CONTRACT,
    evidence: EVIDENCE,
    actions: ACTIONS,
    repositories: REPOSITORIES,
    ...overrides,
  };
}

function failedNames(input: RealRunGateInput): string[] {
  return evaluateRealRunGate(input).checks
    .filter((item) => item.status === 'FAIL')
    .map((item) => item.name);
}

test('pure gate passes only when every pre-real-run contract is satisfied', () => {
  const result = evaluateRealRunGate(baseInput());
  expect(result.pass).toBe(true);
  expect(result.checks.every((item) => item.status === 'PASS')).toBe(true);
  expect(() => assertRealRunGate(result)).not.toThrow();
});

test('browser launch contract retains all transport containment arguments', () => {
  expect(hasRequiredBrowserLaunchArgs(REQUIRED_BROWSER_LAUNCH_ARGS)).toBe(true);
  expect(hasRequiredBrowserLaunchArgs(REQUIRED_BROWSER_LAUNCH_ARGS.filter((arg) => arg !== '--disable-quic'))).toBe(false);
});

test('pre-auth canary mode requires that storage state is explicitly absent', () => {
  const canary = evaluateRealRunGate(baseInput({
    storageStatePath: null,
    storageStateValid: false,
    requireAuthenticationState: false,
  }));
  expect(canary.pass).toBe(true);

  const accidentalState = evaluateRealRunGate(baseInput({
    storageStatePath: '/tmp/unexpected-state.json',
    storageStateValid: true,
    requireAuthenticationState: false,
  }));
  expect(accidentalState.checks.filter((item) => item.status === 'FAIL').map((item) => item.name)).toContain('authentication-state');
});

test('environment, target, and production policy ambiguity fail closed', () => {
  expect(failedNames(baseInput({ environment: { ...ENV, name: 'local' }, uiUrl: 'http://127.0.0.1:7311/' }))).toEqual(
    expect.arrayContaining(['environment-selection', 'target-agreement', 'production-deny-canary'])
  );
  expect(failedNames(baseInput({ uiUrl: 'https://app.alphaus.cloud/' }))).toContain('target-agreement');
  expect(failedNames(baseInput({ uiUrl: 'https://appdev.alphaus.cloud/?customer=FAKE_CUSTOMER' }))).toContain('target-agreement');
});

test('missing/invalid proxy, state, browser, evidence, action, and repository facts fail closed', () => {
  const broken = baseInput({
    storageStatePath: null,
    storageStateValid: false,
    proxy: { state: null, healthy: false },
    browser: { ...AUTHENTICATED_BROWSER_CONTRACT, quicDisabled: false },
    evidence: { ...EVIDENCE, requestBodiesPersisted: true },
    actions: { passiveOnly: false, mutationRegistryEnabled: false },
    repositories: {
      ...REPOSITORIES,
      snapshotRecorded: false,
      alphausRepositoriesSnapshotValid: false,
      nightwatchDirtyPaths: ['src/unsafe-change.ts'],
      documentedNightwatchDirtyPaths: [],
    },
  });
  expect(failedNames(broken)).toEqual(
    expect.arrayContaining([
      'proxy-bound',
      'proxy-health',
      'proxy-contract',
      'authentication-state',
      'browser-containment',
      'authenticated-evidence',
      'passive-action-registry',
      'repository-freshness',
    ])
  );
  expect(() => assertRealRunGate(evaluateRealRunGate(broken))).toThrow(/pre-real-run safety gate FAILED/);
});

test('documented Nightwatch task changes are distinct from undocumented changes', () => {
  const documented = baseInput({
    repositories: {
      ...REPOSITORIES,
      nightwatchDirtyPaths: ['.agent/ACTIVE_TASK.md'],
      documentedNightwatchDirtyPaths: ['.agent/ACTIVE_TASK.md'],
    },
  });
  expect(evaluateRealRunGate(documented).pass).toBe(true);

  const undocumented = baseInput({
    repositories: {
      ...documented.repositories,
      nightwatchDirtyPaths: ['.agent/ACTIVE_TASK.md', 'src/unknown.ts'],
    },
  });
  expect(failedNames(undocumented)).toContain('repository-freshness');
});

test('runtime gate validates synthetic external state and loopback proxy health only', async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-real-gate-'));
  const stateFile = path.join(temp, 'synthetic-state.json');
  const eventLog = path.join(temp, 'proxy-events.jsonl');
  fs.writeFileSync(
    stateFile,
    JSON.stringify({
      cookies: [{ name: 'session', value: 'FAKE_SESSION_SECRET_123' }],
      origins: [{ origin: 'https://appdev.alphaus.cloud', localStorage: [{ name: 'token', value: 'FAKE_JWT_SECRET_456' }] }],
    })
  );

  const proxy = await startOutboundProxy({
    policy: new OutboundPolicy(ENV),
    environment: 'dev',
    host: '127.0.0.1',
    port: 0,
    eventLogPath: eventLog,
  });
  const proxyStateFile = path.join(temp, 'proxy-state.json');
  writeProxyRuntimeState(
    {
      address: proxy.address,
      host: '127.0.0.1',
      port: proxy.port,
      environment: 'dev',
      policyVersion: 'phase-1.2-outbound-policy-v1',
      eventLogPath: eventLog,
    },
    proxyStateFile
  );

  try {
    const result = await runRealRunGate({
      environment: ENV,
      uiUrl: ENV.uiBaseUrl,
      storageStatePath: stateFile,
      proxyStateFile,
      browser: AUTHENTICATED_BROWSER_CONTRACT,
      evidence: EVIDENCE,
      actions: ACTIONS,
      repositories: REPOSITORIES,
    });
    expect(result.pass).toBe(true);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('FAKE_SESSION_SECRET_123');
    expect(serialized).not.toContain('FAKE_JWT_SECRET_456');
  } finally {
    await proxy.close();
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
