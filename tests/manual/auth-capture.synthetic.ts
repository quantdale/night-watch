// Local-only synthetic direct-runner regression. This deliberately does not
// use bin/auth-capture.mjs because that CLI is reserved for the human-led
// dev/next workflow. It exercises the same direct library runner with a
// clearly separated test-only completion callback and no Alphaus I/O.

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startFixtureServer } from '../../src/browser/fixtures/fixtureServer';
import { validateStorageStateFile } from '../../src/browser/fixtures/storageState';
import { selectEnvironment } from '../../src/core/environment';
import { OutboundPolicy } from '../../src/core/safety/outboundPolicy';
import { runDirectAuthCapture } from '../../src/auth/directRunner';
import {
  AUTH_CAPABILITY_RECORD_SUFFIX,
  evaluateAuthCapabilityPreflight,
} from '../../src/auth/capabilityLifecycle';

function readTextFiles(dir: string): string {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) return readTextFiles(absolute);
    if (absolute.endsWith('.zip') || absolute.endsWith('.png')) return [];
    return [fs.readFileSync(absolute, 'utf8')];
  }).join('\n');
}

test('synthetic direct runner launches guarded browser and writes external state', async () => {
  const server = await startFixtureServer('auth');
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-auth-capture-'));
  const output = path.join(temp, 'synthetic-state.json');
  // System Chrome may make exact control-plane attempts while starting.
  // Existing approved telemetry remains synthetic-only here; the three
  // reviewed browser-background hosts come from the canonical local config.
  const localEnvironment = selectEnvironment('local');
  const environment = {
    ...localEnvironment,
    telemetryHosts: [
      ...localEnvironment.telemetryHosts,
      'clients2.google.com',
      'safebrowsingohttpgateway.googleapis.com',
    ],
  };
  const fakePassword = 'SYNTHETIC_CAPTURE_PASSWORD_ONLY';
  const stages: string[] = [];
  let healthChecks = 0;
  let result: Awaited<ReturnType<typeof runDirectAuthCapture>> | undefined;

  try {
    const policy = new OutboundPolicy(environment);
    expect(policy.decide('https://app.alphaus.cloud/').verdict).toBe('deny');
    expect(policy.decide('https://unknown.synthetic.invalid/').verdict).toBe('deny');
    expect(policy.decide('https://redirector.gvt1.com/').verdict).toBe('block-browser-background');
    expect(policy.decide('https://redirector.gvt1.com/').classification).toBe('BROWSER_BACKGROUND_DOWNLOAD');
    expect(policy.decide('https://update.googleapis.com/').verdict).toBe('block-browser-background');
    expect(policy.decide('https://update.googleapis.com/').classification).toBe('BROWSER_BACKGROUND_UPDATE');
    expect(policy.decide('https://android.clients.google.com/').verdict).toBe('block-browser-background');
    expect(policy.decide('https://android.clients.google.com/').classification).toBe('BROWSER_BACKGROUND_GOOGLE');
    for (const sibling of ['clients.google.com', 'edgedl.me.gvt1.com', 'redirector.gvt2.com']) {
      const decision = policy.decide(`https://${sibling}/`);
      expect(decision.verdict, sibling).toBe('deny');
      expect(decision.classification, sibling).toBe('UNKNOWN');
    }

    const realDev = selectEnvironment('dev');
    for (const deniedUrl of ['https://app.alphaus.cloud/ripple/', 'https://unknown.synthetic.invalid/ripple/']) {
      await expect(
        runDirectAuthCapture({
          environment: realDev,
          uiUrl: deniedUrl,
          outputPath: path.join(temp, `denied-${Date.now()}.json`),
          completion: { kind: 'human-parent-cli', wait: async () => undefined },
        })
      ).rejects.toThrow(/fail-closed/);
    }

    result = await runDirectAuthCapture({
      environment,
      uiUrl: `${server.origin}/`,
      outputPath: output,
      testOnly: true,
      headless: true,
      proxyPollIntervalMs: 50,
      proxyHealthCheck: async () => {
        healthChecks += 1;
        return true;
      },
      stageReporter: (event) => stages.push(`${event.stage}:${event.status}`),
      completion: {
        kind: 'synthetic-test-only',
        wait: async (page) => {
          await expect(page.getByRole('heading', { name: 'Synthetic Login' })).toBeVisible();
          await page.getByLabel('Username').fill('synthetic-user');
          await page.getByLabel('Password').fill(fakePassword);
          await page.getByRole('button', { name: 'Sign in' }).click();
          await expect(page).toHaveURL(`${server.origin}/synthetic-authenticated`);
          await expect(page.getByRole('heading', { name: 'Synthetic Authenticated Destination' })).toBeVisible();
          await page.evaluate(async (backgroundUrls) => {
            await Promise.all(backgroundUrls.map(async (url) => {
              try {
                await fetch(url);
              } catch {
                // Expected local browser-guard containment.
              }
            }));
            console.error(`expected browser-background containment: ${backgroundUrls[0]}`);
            void fetch('https://www.google.com/chrome/background?synthetic=1').catch(() => undefined);
            void fetch('https://widget.usepylon.com/widget/synthetic-app-id').catch(() => undefined);
          }, [
            'https://android.clients.google.com/generate_204',
            'https://update.googleapis.com/service/update2/json',
            'https://redirector.gvt1.com/edgedl/chrome/dict/1.bdic',
          ]);
          // Exercise several real monitor polls without making this suite
          // depend on a human-scale wall-clock wait.
          await new Promise((resolve) => setTimeout(resolve, 250));
        },
      },
    });

    if (!result) throw new Error('synthetic direct capture did not return a result');

    expect(result.browserLaunched).toBe(true);
    expect(stages).toEqual([
      'PROXY_START:START', 'PROXY_START:PASS',
      'PROXY_HEALTH:START', 'PROXY_HEALTH:PASS',
      'BROWSER_LAUNCH:START', 'BROWSER_LAUNCH:PASS',
      'GUARD_INSTALL:START', 'GUARD_INSTALL:PASS',
      'TARGET_NAVIGATION:START', 'TARGET_NAVIGATION:PASS',
      'TARGET_VERIFICATION:START', 'TARGET_VERIFICATION:PASS',
      'HUMAN_WAIT:START', 'HUMAN_WAIT:PASS',
      'POST_LOGIN_VERIFICATION:START', 'POST_LOGIN_VERIFICATION:PASS',
      'STORAGE_STATE_WRITE:START', 'STORAGE_STATE_WRITE:PASS',
      'PROVENANCE_WRITE:START', 'PROVENANCE_WRITE:PASS',
      'STATE_VALIDATION:START', 'STATE_VALIDATION:PASS',
      'CLEANUP:START', 'CLEANUP:PASS',
    ]);
    expect(result.provenance).toMatchObject({
      schemaVersion: 'phase-2a-auth-capture-v1',
      mode: 'synthetic-test-only',
      environment: 'local',
      stateShape: 'playwright-storage-state',
      stateLocation: 'external-requested-path',
    });
    expect(validateStorageStateFile(output)).toBe(output);
    expect(fs.existsSync(output)).toBe(true);
    expect(result.authLifecycleRecordPath).toBe(`${output}${AUTH_CAPABILITY_RECORD_SUFFIX}`);
    expect(fs.existsSync(result.authLifecycleRecordPath)).toBe(true);
    const writtenPreflight = evaluateAuthCapabilityPreflight({
      artefactPath: output,
      environment: 'local',
      targetOrigin: new URL(server.origin).origin,
    });
    expect(writtenPreflight.state).toBe('VALID');
    expect(result.summary.passed, JSON.stringify({ notes: result.summary.notes, proxy: result.summary.proxy })).toBe(true);
    expect(result.summary.proxy?.allowed).toBeGreaterThan(0);
    expect(result.summary.proxy?.violations).toBe(0);
    expect(result.summary.proxy?.telemetryBlocked).toBeGreaterThan(0);
    expect(result.summary.proxy?.browserBackgroundBlocked).toBeGreaterThanOrEqual(0);
    expect(healthChecks).toBeGreaterThanOrEqual(3);
    const runtimeEvents = fs.readFileSync(path.join(result.artifactDir, 'events.jsonl'), 'utf8');
    expect(runtimeEvents).toContain('OPTIONAL_THIRD_PARTY_SUPPORT_BLOCKED');
    expect(runtimeEvents).toContain('BROWSER_BACKGROUND_BLOCKED');
    expect(runtimeEvents).toContain('BROWSER_BACKGROUND_GOOGLE');
    expect(runtimeEvents).toContain('BROWSER_BACKGROUND_UPDATE');
    expect(runtimeEvents).toContain('BROWSER_BACKGROUND_DOWNLOAD');
    for (const host of ['android.clients.google.com', 'update.googleapis.com', 'redirector.gvt1.com']) {
      expect(runtimeEvents).toContain(host);
    }
    expect(runtimeEvents).toContain('EXPECTED_CONTAINMENT_EFFECT');
    expect(runtimeEvents).toContain('telemetry blocked');
    expect(server.requests.some((request) => request.url === '/api/synthetic-login')).toBe(true);
    expect(server.requests.some((request) => request.url === '/synthetic-authenticated')).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(path.join(result.artifactDir, 'manifest.json'), 'utf8')) as Record<string, any>;
    expect(manifest.evidencePolicy).toMatchObject({ mode: 'authenticated-metadata-first' });
    expect(manifest.networkContainment).toMatchObject({ proxyEnabled: true, browserGuardsEnabled: true });
    expect(manifest.browserContainment).toMatchObject({
      proxyMandatory: true,
      browserGuardsEnabled: true,
      serviceWorkersBlocked: true,
      sharedWorkersBlocked: true,
      quicDisabled: true,
      nonProxiedWebrtcDisabled: true,
      authenticatedTraceDisabled: true,
    });
    expect(manifest.captureProvenance).toMatchObject({ mode: 'synthetic-test-only' });
    expect((manifest.trace as Record<string, unknown>).enabled).toBe(false);
    expect(fs.existsSync(path.join(result.artifactDir, 'trace.zip'))).toBe(false);
    const artifactText = readTextFiles(result.artifactDir);
    expect(artifactText).not.toContain(fakePassword);
    expect(artifactText).not.toContain('synthetic-user');
  } finally {
    await server.close();
    fs.rmSync(temp, { recursive: true, force: true });
    if (result) fs.rmSync(result.artifactDir, { recursive: true, force: true });
  }
});
