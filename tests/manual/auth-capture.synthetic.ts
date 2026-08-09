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
  // System Chrome may make an optional control-plane CONNECT while starting.
  // Keep this exact observed host locally blocked as non-fatal telemetry for
  // the synthetic run only; it is not added to any real environment config.
  const localEnvironment = selectEnvironment('local');
  const environment = {
    ...localEnvironment,
    telemetryHosts: [
      ...localEnvironment.telemetryHosts,
      'redirector.gvt1.com',
      'clients2.google.com',
      'safebrowsingohttpgateway.googleapis.com',
      'update.googleapis.com',
    ],
  };
  const fakePassword = 'SYNTHETIC_CAPTURE_PASSWORD_ONLY';
  let result: Awaited<ReturnType<typeof runDirectAuthCapture>> | undefined;

  try {
    const policy = new OutboundPolicy(environment);
    expect(policy.decide('https://app.alphaus.cloud/').verdict).toBe('deny');
    expect(policy.decide('https://unknown.synthetic.invalid/').verdict).toBe('deny');
    expect(policy.decide('https://redirector.gvt1.com/').verdict).toBe('block-telemetry');
    expect(policy.decide('https://update.googleapis.com/').verdict).toBe('block-telemetry');

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
      completion: {
        kind: 'synthetic-test-only',
        wait: async (page) => {
          await expect(page.getByRole('heading', { name: 'Synthetic Login' })).toBeVisible();
          await page.getByLabel('Username').fill('synthetic-user');
          await page.getByLabel('Password').fill(fakePassword);
          await page.getByRole('button', { name: 'Sign in' }).click();
          await expect(page).toHaveURL(`${server.origin}/synthetic-authenticated`);
          await expect(page.getByRole('heading', { name: 'Synthetic Authenticated Destination' })).toBeVisible();
        },
      },
    });

    if (!result) throw new Error('synthetic direct capture did not return a result');

    expect(result.browserLaunched).toBe(true);
    expect(result.provenance).toMatchObject({
      schemaVersion: 'phase-2a-auth-capture-v1',
      mode: 'synthetic-test-only',
      environment: 'local',
      stateShape: 'playwright-storage-state',
      stateLocation: 'external-requested-path',
    });
    expect(validateStorageStateFile(output)).toBe(output);
    expect(fs.existsSync(output)).toBe(true);
    expect(result.summary.passed, JSON.stringify({ notes: result.summary.notes, proxy: result.summary.proxy })).toBe(true);
    expect(result.summary.proxy?.allowed).toBeGreaterThan(0);
    expect(result.summary.proxy?.violations).toBe(0);
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
