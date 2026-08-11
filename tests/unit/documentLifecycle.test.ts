// Local-only CDP lifecycle regression. The HTTP server below binds to
// loopback and contains no Alphaus traffic, credentials, or customer data.

import { test, expect } from '@playwright/test';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { installBootstrapDiagnosticHooks } from '../../src/browser/observers/bootstrapHooks';
import { installDocumentLifecycleObserver } from '../../src/browser/observers/documentLifecycle';
import { RunRecorder } from '../../src/core/evidence/runRecorder';
import { buildRippleLifecycleDiagnostics } from '../../src/products/ripple/lifecycleDiagnostics';
import type { RunEvent } from '../../src/core/evidence/types';

interface LocalServer {
  origin: string;
  close(): Promise<void>;
}

async function startServer(mode: 'redirect' | 'reload' | 'route'): Promise<LocalServer> {
  const server = http.createServer((request, response) => {
    const pathname = (request.url ?? '/').split('?')[0];
    if (mode === 'redirect' && pathname === '/redirect') {
      response.writeHead(302, { Location: '/page' });
      response.end();
      return;
    }
    if (mode === 'reload' && pathname === '/missing.js') {
      response.writeHead(404, { 'Content-Type': 'application/javascript' });
      response.end('');
      return;
    }
    if (mode === 'reload') {
      response.writeHead(200, { 'Content-Type': 'text/html' });
      response.end(`<!doctype html><html><body><div id="app"></div>
        <script>
          window.addEventListener('error', function (event) {
            if (event.target && event.target.tagName === 'SCRIPT' && !sessionStorage.getItem('nw-reloaded')) {
              sessionStorage.setItem('nw-reloaded', '1');
              window.location.reload();
            }
          }, true);
          const failedScript = document.createElement('script');
          document.body.appendChild(failedScript);
          failedScript.dispatchEvent(new Event('error'));
        </script>
      </body></html>`);
      return;
    }
    response.writeHead(200, { 'Content-Type': 'text/html' });
    response.end(`<!doctype html><html><body><div id="app"></div>
      <script>
        history.pushState({}, '', '/ripple/dashboard');
        document.querySelector('#app').remove();
        const shell = document.createElement('div');
        shell.className = 'q-layout-container layout';
        document.body.appendChild(shell);
      </script>
    </body></html>`);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('loopback fixture did not bind');
  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: async () => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
}

function readEvents(file: string): RunEvent[] {
  return fs.readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as RunEvent);
}

async function withRecorder<T>(name: string, callback: (recorder: RunRecorder) => Promise<T>): Promise<T> {
  const recorder = new RunRecorder({
    runId: `${name}-${Date.now()}`,
    environment: 'local',
    product: 'ripple',
    browser: 'chromium',
    scenario: name,
    artifactsRoot: path.join(process.cwd(), '.tmp-test', 'document-lifecycle'),
    authenticated: true,
  });
  try {
    return await callback(recorder);
  } finally {
    fs.rmSync(recorder.dir, { recursive: true, force: true });
  }
}

test('pre-navigation lifecycle observer captures a route transition before goto returns', async ({ context, page }) => {
  const server = await startServer('route');
  try {
    await withRecorder('route-before-observer', async (recorder) => {
      await installBootstrapDiagnosticHooks(context, recorder);
      const lifecycle = await installDocumentLifecycleObserver(page, recorder);
      await page.goto(`${server.origin}/page`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(50);
      const diagnostics = buildRippleLifecycleDiagnostics(readEvents(path.join(recorder.dir, 'events.jsonl')), {
        finalPath: '/ripple/dashboard',
        applicationEntryCompleted: true,
        storageStateLoadedBeforeNavigation: false,
        provenanceMatch: false,
        authRequiredStatePresent: false,
        renderedShellPresent: true,
        runtimeExceptionCount: 0,
        unhandledRejectionCount: 0,
      });
      expect(diagnostics.initialMainDocumentRequested).toBe(true);
      expect(diagnostics.routeTransitionObserved).toBe(true);
      expect(diagnostics.routeTransitions[0]).toMatchObject({ method: 'pushState', path: '/ripple/dashboard' });
      expect(diagnostics.bootstrapTarget).toMatchObject({
        bootstrapMountTargetSeen: true,
        bootstrapMountTargetRemoved: true,
      });
      expect(diagnostics.renderedShellSeen).toBe(true);
      await lifecycle.close();
    });
  } finally {
    await server.close();
  }
});

test('server redirect and application reload remain distinct document classifications', async ({ browser, context, page }) => {
  const redirectServer = await startServer('redirect');
  try {
    await withRecorder('server-redirect', async (recorder) => {
      await installBootstrapDiagnosticHooks(context, recorder);
      const lifecycle = await installDocumentLifecycleObserver(page, recorder);
      await page.goto(`${redirectServer.origin}/redirect`, { waitUntil: 'domcontentloaded' });
      const events = readEvents(path.join(recorder.dir, 'events.jsonl'));
      const diagnostics = buildRippleLifecycleDiagnostics(events, {
        finalPath: '/page',
        applicationEntryCompleted: false,
        storageStateLoadedBeforeNavigation: false,
        provenanceMatch: false,
        authRequiredStatePresent: false,
        renderedShellPresent: false,
        runtimeExceptionCount: 0,
        unhandledRejectionCount: 0,
      });
      expect(diagnostics.documentLoads.length).toBeGreaterThanOrEqual(2);
      expect(diagnostics.documentNavigationClassifications).toContain('SERVER_REDIRECT');
      await lifecycle.close();
    });
  } finally {
    await redirectServer.close();
  }

  const reloadServer = await startServer('reload');
  const reloadContext = await browser.newContext();
  try {
    await withRecorder('expected-bootstrap-reload', async (recorder) => {
      await installBootstrapDiagnosticHooks(reloadContext, recorder);
      const reloadPage = await reloadContext.newPage();
      const lifecycle = await installDocumentLifecycleObserver(reloadPage, recorder);
      await reloadPage.goto(`${reloadServer.origin}/reload`, { waitUntil: 'domcontentloaded' });
      await reloadPage.waitForTimeout(150);
      const events = readEvents(path.join(recorder.dir, 'events.jsonl'));
      const diagnostics = buildRippleLifecycleDiagnostics(events, {
        finalPath: '/reload',
        applicationEntryCompleted: false,
        storageStateLoadedBeforeNavigation: false,
        provenanceMatch: false,
        authRequiredStatePresent: false,
        renderedShellPresent: false,
        runtimeExceptionCount: 0,
        unhandledRejectionCount: 0,
      });
      expect(diagnostics.documentLoads.length).toBeGreaterThanOrEqual(2);
      expect(diagnostics.documentNavigationClassifications).toContain('SOURCE_PROVEN_EXPECTED_BOOTSTRAP_RELOAD');
      expect(JSON.stringify(diagnostics)).not.toContain('nw-reloaded');
      await lifecycle.close();
    });
  } finally {
    await reloadContext.close();
    await reloadServer.close();
  }
});
