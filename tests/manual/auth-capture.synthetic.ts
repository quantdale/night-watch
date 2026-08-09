// Local-only synthetic capture regression. This deliberately does not use
// bin/auth-capture.mjs because that CLI is reserved for the human-led dev/next
// workflow. It exercises the same guarded context, recorder, storage-state
// validator, and external output contract without human input or Alphaus I/O.

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createNightwatchContext } from '../../src/browser/context';
import { startFixtureServer } from '../../src/browser/fixtures/fixtureServer';
import { validateStorageStateFile } from '../../src/browser/fixtures/storageState';
import { selectEnvironment } from '../../src/core/environment';
import { OutboundPolicy } from '../../src/core/safety/outboundPolicy';
import { RunRecorder } from '../../src/core/evidence/runRecorder';

function readTextFiles(dir: string): string {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) return readTextFiles(absolute);
    if (absolute.endsWith('.zip') || absolute.endsWith('.png')) return [];
    return [fs.readFileSync(absolute, 'utf8')];
  }).join('\n');
}

test('synthetic guarded capture reaches authenticated destination and writes external state', async ({ browser }) => {
  const server = await startFixtureServer('auth');
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-auth-capture-'));
  const output = path.join(temp, 'synthetic-state.json');
  // System Chrome may make an optional control-plane CONNECT while starting.
  // Keep this exact observed host locally blocked as non-fatal telemetry for
  // the synthetic run only; it is not added to any real environment config.
  const localEnvironment = selectEnvironment('local');
  const environment = {
    ...localEnvironment,
    telemetryHosts: [...localEnvironment.telemetryHosts, 'redirector.gvt1.com'],
  };
  const recorder = new RunRecorder({
    runId: `synthetic-auth-capture-${Date.now()}`,
    environment: environment.name,
    product: 'ripple',
    browser: 'chromium',
    scenario: 'synthetic-auth-capture',
    authenticated: true,
  });
  const fakePassword = 'SYNTHETIC_CAPTURE_PASSWORD_ONLY';
  let ctx: Awaited<ReturnType<typeof createNightwatchContext>> | undefined;

  try {
    const policy = new OutboundPolicy(environment);
    expect(policy.decide('https://app.alphaus.cloud/').verdict).toBe('deny');
    expect(policy.decide('https://unknown.synthetic.invalid/').verdict).toBe('deny');
    expect(policy.decide('https://redirector.gvt1.com/').verdict).toBe('block-telemetry');

    ctx = await createNightwatchContext(browser, {
      env: environment,
      recorder,
      uiBaseUrl: `${server.origin}/`,
      trace: 'off',
    });
    await ctx.page.goto(`${server.origin}/`, { waitUntil: 'domcontentloaded' });
    await expect(ctx.page.getByRole('heading', { name: 'Synthetic Login' })).toBeVisible();
    await ctx.page.getByLabel('Username').fill('synthetic-user');
    await ctx.page.getByLabel('Password').fill(fakePassword);
    await ctx.page.getByRole('button', { name: 'Sign in' }).click();
    await expect(ctx.page).toHaveURL(`${server.origin}/synthetic-authenticated`);
    await expect(ctx.page.getByRole('heading', { name: 'Synthetic Authenticated Destination' })).toBeVisible();

    await ctx.context.storageState({ path: output });
    expect(validateStorageStateFile(output)).toBe(output);
    expect(fs.existsSync(output)).toBe(true);

    const summary = await recorder.finalize({
      passed: !ctx.monitor.failed,
      notes: ctx.monitor.summaryNotes(),
    });
    expect(summary.passed, JSON.stringify({ notes: summary.notes, proxy: summary.proxy })).toBe(true);
    expect(summary.proxy?.violations).toBe(0);
    expect(server.requests.some((request) => request.url === '/api/synthetic-login')).toBe(true);
    expect(server.requests.some((request) => request.url === '/synthetic-authenticated')).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(path.join(recorder.dir, 'manifest.json'), 'utf8')) as Record<string, any>;
    expect(manifest.evidencePolicy).toMatchObject({ mode: 'authenticated-metadata-first' });
    expect(manifest.networkContainment).toMatchObject({ proxyEnabled: true, browserGuardsEnabled: true });
    expect((manifest.trace as Record<string, unknown>).enabled).toBe(false);
    expect(fs.existsSync(path.join(recorder.dir, 'trace.zip'))).toBe(false);
    const artifactText = readTextFiles(recorder.dir);
    expect(artifactText).not.toContain(fakePassword);
    expect(artifactText).not.toContain('synthetic-user');
  } finally {
    if (ctx) await ctx.close();
    await server.close();
    fs.rmSync(temp, { recursive: true, force: true });
    fs.rmSync(recorder.dir, { recursive: true, force: true });
  }
});
