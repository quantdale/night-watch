// Local-only regression for the fixed-category page bootstrap hooks. The page
// contains no external resources and the assertions inspect only event types
// and categories, never page text or script contents.

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { installBootstrapDiagnosticHooks } from '../../src/browser/observers/bootstrapHooks';
import { RunRecorder } from '../../src/core/evidence/runRecorder';

function readEvents(file: string): Array<Record<string, unknown>> {
  return fs.readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

test('bootstrap hooks capture lifecycle, route, rejection, and CSP categories without page values', async ({ context, page }) => {
  const runId = `bootstrap-hooks-${Date.now()}`;
  const recorder = new RunRecorder({
    runId,
    environment: 'local',
    product: 'ripple',
    browser: 'chromium',
    scenario: 'synthetic-bootstrap-hooks',
    artifactsRoot: path.join(process.cwd(), '.tmp-test', 'bootstrap-hooks'),
    authenticated: true,
  });
  try {
    await installBootstrapDiagnosticHooks(context, recorder);
    await page.goto('data:text/html,<html><body><div id="app"></div></body></html>');
    await page.evaluate(() => {
      const pageGlobal = globalThis as unknown as {
        history: { pushState: (state: unknown, title: string, url?: string) => void };
        dispatchEvent: (event: unknown) => boolean;
        Event: new (type: string) => unknown;
        Promise: PromiseConstructor;
        document: {
          querySelector: (selector: string) => { remove: () => void } | null;
          createElement: (tagName: string) => { className: string };
          body: { appendChild: (element: unknown) => void };
        };
      };
      pageGlobal.history.pushState({}, '', '#synthetic-route');
      const mount = pageGlobal.document.querySelector('#app');
      mount?.remove();
      const shell = pageGlobal.document.createElement('div');
      shell.className = 'q-layout-container layout';
      pageGlobal.document.body.appendChild(shell);
      pageGlobal.dispatchEvent(new pageGlobal.Event('securitypolicyviolation'));
      pageGlobal.Promise.reject(new Error('synthetic secret must not be recorded'));
    });
    await page.waitForTimeout(50);
    const events = readEvents(path.join(recorder.dir, 'events.jsonl'));
    const categories = events
      .filter((entry) => entry.type === 'bootstrap')
      .map((entry) => (entry.data as Record<string, unknown> | undefined)?.category)
      .filter((category): category is string => typeof category === 'string');
    expect(categories).toEqual(expect.arrayContaining([
      'observer-installed',
      'route-transition',
      'csp-violation',
      'unhandled-rejection',
      'bootstrap-target',
      'post-mount-structure',
      'rendered-shell',
    ]));
    const lifecycle = events.filter((entry) => entry.type === 'bootstrap' &&
      ['bootstrap-target', 'rendered-shell', 'route-transition'].includes(String((entry.data as Record<string, unknown> | undefined)?.category)));
    expect(lifecycle.some((entry) => (entry.data as Record<string, unknown>)?.phase === 'seen')).toBe(true);
    expect(lifecycle.some((entry) => (entry.data as Record<string, unknown>)?.phase === 'removed')).toBe(true);
    const replacement = events.find((entry) => entry.type === 'bootstrap' &&
      (entry.data as Record<string, unknown> | undefined)?.category === 'post-mount-structure');
    expect(replacement?.data).toMatchObject({
      phase: 'replacement',
      vueInitialPatchObserved: true,
      replacementNodeType: 'element',
      replacementTag: 'DIV',
      matchesDefaultLayout: true,
      matchesQLayout: true,
      rootBranch: 'default-layout',
    });
    const artifactText = fs.readFileSync(path.join(recorder.dir, 'events.jsonl'), 'utf8');
    expect(artifactText).not.toContain('synthetic secret');
    expect(artifactText).not.toContain('synthetic-route');
  } finally {
    await page.goto('about:blank').catch(() => undefined);
    fs.rmSync(recorder.dir, { recursive: true, force: true });
  }
});
