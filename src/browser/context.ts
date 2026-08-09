// ---------------------------------------------------------------------------
// Nightwatch — browser context factory (fail-closed harness entry).
//
// createNightwatchContext() validates the UI URL against the environment
// allowlist, resolves authenticated storage state (fail closed on
// misconfiguration), starts a Playwright tracing session (OFF by default when
// auth state is present — traces can carry request headers/cookies), and
// installs the network/console/page observers with popup auto-wiring.
// ---------------------------------------------------------------------------

import path from 'node:path';
import type { Browser, BrowserContext, Page } from '@playwright/test';
import type { EnvironmentConfig } from '../core/environment/types';
import { EnvironmentSelectionError } from '../core/environment';
import { OutboundPolicy } from '../core/safety/outboundPolicy';
import type { RunRecorder } from '../core/evidence/runRecorder';
import { RunMonitor } from '../state/run';
import {
  createNetworkObserver,
  type NetworkObserver,
} from './observers/networkObserver';
import { createConsoleObserver } from './observers/consoleObserver';
import { createPageObserver } from './observers/pageObserver';
import { resolveStorageStatePath } from './fixtures/storageState';

export interface NightwatchContextOptions {
  env: EnvironmentConfig;
  recorder: RunRecorder;
  uiBaseUrl: string;
  productId?: string;
  failOn?: string[];
  storageStatePath?: string | null;
  trace?: 'on' | 'off';
}

export interface NightwatchContext {
  context: BrowserContext;
  page: Page;
  monitor: RunMonitor;
  network: NetworkObserver;
  close(): Promise<void>;
}

/**
 * Fail-closed startup gate for the target UI URL: must be http(s) and its
 * host must be allowlisted in the environment. An allowlist entry without a
 * port matches any port; an entry with a port requires an exact host:port
 * match. Returns the normalized URL.
 */
export function validateUiUrl(env: EnvironmentConfig, uiUrl: string): string {
  let u: URL;
  try {
    u = new URL(uiUrl);
  } catch (err) {
    throw new EnvironmentSelectionError(
      `fail-closed: UI URL "${uiUrl}" is not a valid URL: ${(err as Error).message}`
    );
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new EnvironmentSelectionError(
      `fail-closed: UI URL protocol "${u.protocol}" is not http(s) for environment "${env.name}"`
    );
  }
  const hostname = u.hostname.toLowerCase();
  const hostPortKey = u.port !== '' ? `${hostname}:${u.port}` : hostname;
  const allowed = env.allowedHosts.some((entry) => {
    const e = entry.toLowerCase();
    return e === hostname || e === hostPortKey;
  });
  if (!allowed) {
    throw new EnvironmentSelectionError(
      `fail-closed: UI URL host "${hostname}" is not in the allowlist of environment "${env.name}"`
    );
  }
  return u.toString();
}

export async function createNightwatchContext(
  browser: Browser,
  opts: NightwatchContextOptions
): Promise<NightwatchContext> {
  const validated = validateUiUrl(opts.env, opts.uiBaseUrl);

  // Fail closed: an unusable storage-state path aborts startup (propagates).
  const auth: string | null = opts.storageStatePath ?? resolveStorageStatePath();

  const traceOn = (opts.trace ?? (auth ? 'off' : 'on')) === 'on';
  if (auth !== null && !traceOn) {
    opts.recorder.event({
      type: 'env',
      severity: 'warn',
      message: 'tracing disabled (authenticated storage state)',
    });
  }

  const context = await browser.newContext({
    storageState: auth ?? undefined,
    viewport: { width: 1440, height: 900 },
  });

  if (traceOn) {
    await context.tracing.start({
      name: path.basename(opts.recorder.dir), // recorder.runId (private) == dir basename
      screenshots: true,
      snapshots: false,
    });
    opts.recorder.event({ type: 'env', severity: 'info', message: 'trace enabled' });
  }

  const monitor = new RunMonitor(opts.failOn ?? opts.env.failOn);
  opts.recorder.event({
    type: 'env',
    severity: 'info',
    message: `environment: ${opts.env.name}${auth !== null ? ' (authenticated mode)' : ' (UNAUTHENTICATED mode)'}`,
    data: { name: opts.env.name, uiBaseUrl: validated, authenticated: auth !== null },
  });

  const page: Page = context.pages()[0] ?? (await context.newPage());

  const network = createNetworkObserver({
    policy: new OutboundPolicy(opts.env),
    recorder: opts.recorder,
    monitor,
  });
  const consoleObserver = createConsoleObserver({ recorder: opts.recorder, monitor });
  const pageObserver = createPageObserver({ recorder: opts.recorder, monitor });

  network.install(context);
  consoleObserver.install(page);
  pageObserver.install(page);
  // Auto-wire the console/page observers onto popups and new pages
  // (the network observer auto-wires its own response/requestfailed handlers).
  context.on('page', (p: Page) => {
    consoleObserver.install(p);
    pageObserver.install(p);
  });

  const close = async (): Promise<void> => {
    if (traceOn) {
      try {
        await context.tracing.stop({ path: path.join(opts.recorder.dir, 'trace.zip') });
      } catch (err) {
        opts.recorder.event({
          type: 'env',
          severity: 'warn',
          message: `trace stop failed: ${opts.recorder.redaction.redactText(
            String(err instanceof Error ? err.message : err)
          )}`,
        });
      }
    }
    await context.close();
  };

  return { context, page, monitor, network, close };
}
