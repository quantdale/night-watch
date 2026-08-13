// Synthetic direct-runner stage diagnostics. Every browser target in this
// file is loopback-only; no Alphaus host, credential, MFA value, or external
// storage state is used.

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startFixtureServer } from '../../src/browser/fixtures/fixtureServer';
import { validateStorageStateFile } from '../../src/browser/fixtures/storageState';
import { selectEnvironment } from '../../src/core/environment';
import { runDirectAuthCapture, type DirectAuthCaptureOptions } from '../../src/auth/directRunner';
import type { AuthCaptureStageEvent } from '../../src/auth/stages';

const root = path.resolve(__dirname, '..', '..');

function localSyntheticEnvironment() {
  const base = selectEnvironment('local');
  return {
    ...base,
    telemetryHosts: [
      ...base.telemetryHosts,
      'clients2.google.com',
      'safebrowsingohttpgateway.googleapis.com',
    ],
  };
}

function stageNames(events: AuthCaptureStageEvent[]): string[] {
  return events.map((event) => `${event.stage}:${event.status}`);
}

async function expectStageFailure(options: DirectAuthCaptureOptions, stage: string, reason: string, events: AuthCaptureStageEvent[]) {
  let caught: any;
  try {
    await runDirectAuthCapture(options);
  } catch (error) {
    caught = error;
  }
  expect(caught).toMatchObject({ stage, reason });
  expect(stageNames(events)).toContain(`${stage}:FAIL`);
  expect(stageNames(events)).toContain('CLEANUP:PASS');
  expect(JSON.stringify(events)).not.toContain('SYNTHETIC_CAPTURE_SECRET');
  return caught;
}

async function baseOptions(
  serverOrigin: string,
  temp: string,
  events: AuthCaptureStageEvent[],
  overrides: Partial<DirectAuthCaptureOptions> = {}
): Promise<DirectAuthCaptureOptions> {
  fs.mkdirSync(temp, { recursive: true, mode: 0o700 });
  return {
    environment: localSyntheticEnvironment(),
    uiUrl: `${serverOrigin}/`,
    outputPath: path.join(temp, 'state.json'),
    completion: { kind: 'synthetic-test-only', wait: async () => undefined },
    testOnly: true,
    headless: true,
    nightwatchRoot: root,
    artifactsRoot: path.join(temp, 'artifacts'),
    stageReporter: (event) => events.push(event),
    ...overrides,
  };
}

test('real-mode target resolution is canonical and cannot resolve to the synthetic fixture', () => {
  const dev = selectEnvironment('dev');
  expect(dev.uiBaseUrl).toBe('https://appdev.alphaus.cloud/ripple/');
  expect(dev.uiBaseUrl).not.toContain('127.0.0.1');
  expect(selectEnvironment('local').uiBaseUrl).toBe('http://127.0.0.1:7311');
});

test('real-mode direct runner rejects a loopback fixture before proxy or browser startup', async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-auth-real-mode-'));
  try {
    await expect(runDirectAuthCapture({
      environment: selectEnvironment('dev'),
      uiUrl: 'http://127.0.0.1:7311/',
      outputPath: path.join(temp, 'state.json'),
      completion: { kind: 'human-parent-cli', wait: async () => undefined },
      headless: true,
      nightwatchRoot: root,
      artifactsRoot: path.join(temp, 'artifacts'),
    })).rejects.toThrow(/fail-closed/);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('target verification reports sanitized origin/path mismatch', async () => {
  const server = await startFixtureServer('auth');
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-auth-stages-'));
  const events: AuthCaptureStageEvent[] = [];
  try {
    await expectStageFailure(
      await baseOptions(server.origin, temp, events, {
        targetVerificationUrl: `${server.origin}/synthetic-auth?secret=SYNTHETIC_CAPTURE_SECRET`,
      }),
      'TARGET_VERIFICATION',
      'TARGET_ORIGIN_MISMATCH',
      events,
    );
    const failure = events.find((event) => event.stage === 'TARGET_VERIFICATION' && event.status === 'FAIL');
    expect(failure).toMatchObject({
      expected: { origin: server.origin, path: '/' },
      actual: { origin: server.origin, path: '/synthetic-auth' },
    });
  } finally {
    await server.close();
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('navigation, human wait, storage write, and state validation failures are stage-specific', async () => {
  const server = await startFixtureServer('auth');
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-auth-stages-'));
  try {
    const navigationEvents: AuthCaptureStageEvent[] = [];
    await expectStageFailure(
      await baseOptions(server.origin, path.join(temp, 'navigation'), navigationEvents, {
        targetNavigator: async () => { throw new Error('SYNTHETIC_CAPTURE_SECRET'); },
      }),
      'TARGET_NAVIGATION',
      'TARGET_NAVIGATION_FAILED',
      navigationEvents,
    );

    const waitServer = await startFixtureServer('auth');
    const waitEvents: AuthCaptureStageEvent[] = [];
    await expectStageFailure(
      await baseOptions(waitServer.origin, path.join(temp, 'wait'), waitEvents, {
        completion: { kind: 'synthetic-test-only', wait: async () => { throw new Error('SYNTHETIC_CAPTURE_SECRET'); } },
      }),
      'HUMAN_WAIT',
      'HUMAN_WAIT_FAILED',
      waitEvents,
    );
    await waitServer.close();

    const writeServer = await startFixtureServer('auth');
    const writeEvents: AuthCaptureStageEvent[] = [];
    await expectStageFailure(
      await baseOptions(writeServer.origin, path.join(temp, 'write'), writeEvents, {
        completion: { kind: 'synthetic-test-only', wait: async (page) => {
          await page.evaluate(async () => { await fetch('/api/synthetic-login', { method: 'POST' }); });
          await page.goto(`${writeServer.origin}/synthetic-authenticated`);
        } },
        storageStateWriter: async () => { throw new Error('SYNTHETIC_CAPTURE_SECRET'); },
      }),
      'STORAGE_STATE_WRITE',
      'STORAGE_STATE_WRITE_FAILED',
      writeEvents,
    );
    await writeServer.close();

    const validationServer = await startFixtureServer('auth');
    const validationEvents: AuthCaptureStageEvent[] = [];
    await expectStageFailure(
      await baseOptions(validationServer.origin, path.join(temp, 'validation'), validationEvents, {
        completion: { kind: 'synthetic-test-only', wait: async (page) => {
          await page.evaluate(async () => { await fetch('/api/synthetic-login', { method: 'POST' }); });
          await page.goto(`${validationServer.origin}/synthetic-authenticated`);
        } },
        stateValidator: () => { throw new Error('SYNTHETIC_CAPTURE_SECRET'); },
      }),
      'STATE_VALIDATION',
      'STATE_VALIDATION_FAILED',
      validationEvents,
    );
    await validationServer.close();
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('ENTER without an approved authenticated Ripple landing rejects before state write', async () => {
  const server = await startFixtureServer('auth');
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-auth-stages-'));
  const events: AuthCaptureStageEvent[] = [];
  try {
    await expectStageFailure(
      await baseOptions(server.origin, temp, events),
      'POST_LOGIN_VERIFICATION',
      'POST_LOGIN_NOT_CONFIRMED',
      events,
    );
    expect(fs.existsSync(path.join(temp, 'state.json'))).toBe(false);
    expect(stageNames(events)).not.toContain('STORAGE_STATE_WRITE:START');
  } finally {
    await server.close();
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('approved DEV authentication-host navigation remains allowed by target verification', async () => {
  const { verifyTargetLocation } = await import('../../src/auth/directRunner');
  const environment = selectEnvironment('dev');
  expect(verifyTargetLocation(
    environment,
    environment.uiBaseUrl,
    'https://logindev.alphaus.cloud/sso/callback?code=SYNTHETIC_CODE',
  )).toMatchObject({ origin: 'https://logindev.alphaus.cloud', path: '/sso/callback' });
});

test('proxy liveness failure is reported as a precise HUMAN_WAIT monitor reason', async () => {
  const server = await startFixtureServer('auth');
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-auth-monitor-'));
  const events: AuthCaptureStageEvent[] = [];
  let healthChecks = 0;
  try {
    const caught = await expectStageFailure(
      await baseOptions(server.origin, temp, events, {
        proxyPollIntervalMs: 25,
        proxyHealthCheck: async () => {
          healthChecks += 1;
          return healthChecks < 2;
        },
        completion: {
          kind: 'synthetic-test-only',
          wait: async (page) => {
            await page.evaluate(async () => { await fetch('/api/synthetic-malformed-json'); });
            await new Promise((resolve) => setTimeout(resolve, 100));
          },
        },
      }),
      'HUMAN_WAIT',
      'SAFETY_MONITOR_FAILED',
      events,
    );
    expect(caught).toMatchObject({
      monitorReason: 'PROXY_LIVENESS_FAILED',
      monitor: { reason: 'PROXY_LIVENESS_FAILED', guardType: 'outer-proxy' },
    });
    expect(healthChecks).toBeGreaterThanOrEqual(2);
  } finally {
    await server.close();
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('unknown and production destinations retain distinct fatal HUMAN_WAIT reasons', async () => {
  const cases = [
    { url: 'https://unknown.synthetic.invalid/blocked', reason: 'UNKNOWN_DESTINATION', host: 'unknown.synthetic.invalid' },
    { url: 'https://app.alphaus.cloud/blocked', reason: 'PRODUCTION_DESTINATION_ATTEMPT', host: 'app.alphaus.cloud' },
  ] as const;
  for (const item of cases) {
    const server = await startFixtureServer('auth');
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-auth-monitor-'));
    const events: AuthCaptureStageEvent[] = [];
    try {
      const caught = await expectStageFailure(
        await baseOptions(server.origin, temp, events, {
          proxyPollIntervalMs: 25,
          completion: {
            kind: 'synthetic-test-only',
            wait: async (page) => {
              await page.evaluate(async (url) => {
                await fetch('/api/synthetic-malformed-json');
                await fetch(url).catch(() => undefined);
              }, item.url);
              await new Promise((resolve) => setTimeout(resolve, 100));
            },
          },
        }),
        'HUMAN_WAIT',
        'SAFETY_MONITOR_FAILED',
        events,
      );
      expect(caught).toMatchObject({
        monitorReason: item.reason,
        monitor: { reason: item.reason, host: item.host },
      });
    } finally {
      await server.close();
      fs.rmSync(temp, { recursive: true, force: true });
    }
  }
});

test('malformed JSON during HUMAN_WAIT is recorded but auth capture continues', async () => {
  const server = await startFixtureServer('auth');
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-auth-oracle-'));
  const events: AuthCaptureStageEvent[] = [];
  try {
    const result = await runDirectAuthCapture(await baseOptions(server.origin, temp, events, {
      completion: {
        kind: 'synthetic-test-only',
        wait: async (page) => {
          await page.evaluate(async () => { await fetch('/api/synthetic-malformed-json'); });
          // Let the observer finish its asynchronous response-body capture
          // before the next navigation closes/replaces the response.
          await page.waitForTimeout(350);
          await page.evaluate(async () => { await fetch('/api/synthetic-login', { method: 'POST' }); });
          await page.goto(`${server.origin}/synthetic-authenticated`);
          await new Promise((resolve) => setTimeout(resolve, 150));
        },
      },
    }));

    expect(stageNames(events)).toContain('HUMAN_WAIT:PASS');
    expect(stageNames(events)).toContain('POST_LOGIN_VERIFICATION:PASS');
    expect(stageNames(events)).toContain('STORAGE_STATE_WRITE:PASS');
    expect(result.summary.passed).toBe(true);
    expect(fs.existsSync(path.join(temp, 'state.json'))).toBe(true);
    const evidence = fs.readFileSync(path.join(result.artifactDir, 'events.jsonl'), 'utf8');
    expect(evidence).toContain('"oracleCategory":"malformed-json"');
    expect(evidence).toContain('"oracleSeverity":"anomaly"');
    expect(evidence).toContain('"protocolObserved":"invalid-json"');
  } finally {
    await server.close();
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('successful capture atomically replaces an existing external state after validation', async () => {
  const server = await startFixtureServer('auth');
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-auth-replace-'));
  const output = path.join(temp, 'state.json');
  try {
    fs.writeFileSync(output, JSON.stringify({ cookies: [], origins: [], marker: 'OLD_STATE_MARKER' }), { mode: 0o600 });
    const result = await runDirectAuthCapture(await baseOptions(server.origin, temp, [], {
      completion: {
        kind: 'synthetic-test-only',
        wait: async (page) => {
          await page.evaluate(async () => { await fetch('/api/synthetic-login', { method: 'POST' }); });
          await page.goto(`${server.origin}/synthetic-authenticated`);
        },
      },
    }));
    expect(result.summary.passed).toBe(true);
    const replaced = fs.readFileSync(output, 'utf8');
    expect(replaced).not.toContain('OLD_STATE_MARKER');
    expect(validateStorageStateFile(output)).toBe(output);
  } finally {
    await server.close();
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('primary page closure is reported as PAGE_CLOSED rather than a generic monitor failure', async () => {
  const server = await startFixtureServer('auth');
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-auth-monitor-'));
  const events: AuthCaptureStageEvent[] = [];
  try {
    const caught = await expectStageFailure(
      await baseOptions(server.origin, temp, events, {
        completion: {
          kind: 'synthetic-test-only',
          wait: async (page) => {
            await page.close();
            await new Promise((resolve) => setTimeout(resolve, 50));
          },
        },
      }),
      'HUMAN_WAIT',
      'SAFETY_MONITOR_FAILED',
      events,
    );
    expect(caught).toMatchObject({
      monitorReason: 'PAGE_CLOSED',
      monitor: { reason: 'PAGE_CLOSED', lifecycleEvent: 'page-closed' },
    });
  } finally {
    await server.close();
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
