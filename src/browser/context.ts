// ---------------------------------------------------------------------------
// Nightwatch — browser context factory (fail-closed harness entry, Phase 1.1).
//
// createNightwatchContext() builds the containment stack for one run:
//
//   L0 (browser-internal)  — raw-CDP Fetch guard per page (fetchGuard.ts):
//                            pauses EVERY request incl. redirect follow-ups,
//                            fails denied/telemetry URLs with the same policy
//                            decision before network I/O. Backstop; never
//                            authoritative.
//   L1 (Playwright)        — context.route('**/*') policy gate (see
//                            networkObserver).
//   L2 (Playwright)        — context.routeWebSocket('**/*') WebSocket policy
//                            with identical semantics.
//   L3 (context options +  — serviceWorkers:'block' (Playwright-native SW
//       init scripts)        blocking), Service Worker API stub (register()
//                            rejects, evidence via console marker), SharedWorker
//                            constructor stub (shared-worker fetches are NOT
//                            intercepted by Playwright routing — blocking
//                            creation is the only client-side containment),
//                            plus a hard-failure alarm on any 'serviceworker'
//                            event that fires despite blocking.
//   L4 (events)            — unrouted-request detection (redirect follow-ups,
//                            download-manager traffic): observed + recorded as
//                            hard failures; downloads are cancelled.
// Traces: Playwright traces can embed request headers, cookies, bodies and
// console content and CANNOT be sanitized before persistence. For
// authenticated runs (storage state present) traces are ALWAYS disabled —
// even when NIGHTWATCH_TRACE=on — and the manifest records why. Nightwatch's
// own redacted network/event evidence is preserved instead.
// ---------------------------------------------------------------------------

import path from 'node:path';
import type { Browser, BrowserContext, Download, Page } from '@playwright/test';
import type { EnvironmentConfig } from '../core/environment/types';
import { EnvironmentSelectionError } from '../core/environment';
import { OutboundPolicy } from '../core/safety/outboundPolicy';
import type { RunRecorder } from '../core/evidence/runRecorder';
import { RunMonitor } from '../state/run';
import {
  createNetworkObserver,
  type NetworkObserver,
  type SemanticResponseOracle,
} from './observers/networkObserver';
import { createConsoleObserver } from './observers/consoleObserver';
import {
  classifyBrowserBackgroundConsoleEffect,
  classifyOptionalSupportConsoleEffect,
  classifyTelemetryConsoleEffect,
} from './observers/containmentEffect';
import { createPageObserver } from './observers/pageObserver';
import { installBootstrapDiagnosticHooks } from './observers/bootstrapHooks';
import { resolveStorageStatePath, validateStorageStateFile } from './fixtures/storageState';
import { installFetchGuard } from './network/fetchGuard';
import { checkProxyHealth, requireProxyRuntime } from '../proxy/runtime';
import type { ProxyRuntimeState } from '../proxy/types';
import {
  classifyRippleEndpoint,
  matchRippleEndpoint,
  type EndpointSemanticRule,
} from '../core/safety/endpointSemantics';

// Phase 15P A15 convergence: options shape is module-private; callers use
// createNightwatchContext with object literals (no external type refs remain).
interface NightwatchContextOptions {
  env: EnvironmentConfig;
  recorder: RunRecorder;
  uiBaseUrl: string;
  productId?: string;
  failOn?: string[];
  storageStatePath?: string | null;
  trace?: 'on' | 'off';
  /** Direct runners may use an isolated runtime state file for local tests. */
  proxyStateFile?: string;
  /** Local failure injection; real callers use the canonical health check. */
  proxyHealthCheck?: (state: ProxyRuntimeState) => Promise<boolean>;
  /** Local failure injection / direct-runner process lifecycle check. */
  proxyProcessAlive?: () => boolean;
  /** Local timing control; real capture uses the conservative default. */
  proxyPollIntervalMs?: number;
  /** Opt-in fixed-category bootstrap/runtime diagnostics for Phase 2A. */
  bootstrapDiagnostics?: boolean;
  /** Explicit source-reviewed endpoint rules for a Phase 2B journey run. */
  endpointRegistry?: readonly EndpointSemanticRule[];
  /** Metadata-only identity for anomaly fingerprints; never page data. */
  journeyId?: string;
  /** Phase 9B explicit semantic-oracle option: the caller provides an
   *  admitted real-source resolver; there is no global default and no
   *  environment-variable-created semantic authority. */
  semanticOracle?: SemanticResponseOracle;
}

export interface NightwatchContext {
  context: BrowserContext;
  page: Page;
  monitor: RunMonitor;
  network: NetworkObserver;
  close(): Promise<void>;
}

/**
 * Fail-closed startup gate for the target UI URL: must be http(s), must not
 * carry userinfo/query/fragment material, must match the selected
 * environment's verified origin exactly, and its path must match the
 * verified UI base path. The environment host allowlist remains a defense in
 * depth check. Returns the normalized URL.
 */
export function validateUiUrl(env: EnvironmentConfig, uiUrl: string): string {
  let u: URL;
  try {
    u = new URL(uiUrl);
  } catch {
    throw new EnvironmentSelectionError(`fail-closed: UI URL is not a valid URL for environment "${env.name}"`);
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new EnvironmentSelectionError(`fail-closed: UI URL protocol is not http(s) for environment "${env.name}"`);
  }
  if (u.username !== '' || u.password !== '' || u.search !== '' || u.hash !== '') {
    throw new EnvironmentSelectionError(`fail-closed: UI URL must not contain credentials, query, or fragment material`);
  }
  const hostname = u.hostname.toLowerCase();
  const hostPortKey = u.port !== '' ? `${hostname}:${u.port}` : hostname;
  const allowed = env.allowedHosts.some((entry) => {
    const e = entry.toLowerCase();
    return e === hostname || e === hostPortKey;
  });
  if (!allowed) {
    throw new EnvironmentSelectionError(`fail-closed: UI URL host is not in the allowlist of environment "${env.name}"`);
  }
  let configured: URL;
  try {
    configured = new URL(env.uiBaseUrl);
  } catch {
    throw new EnvironmentSelectionError(`fail-closed: configured UI URL for environment "${env.name}" is invalid`);
  }
  if (
    (configured.protocol !== 'http:' && configured.protocol !== 'https:') ||
    configured.username !== '' ||
    configured.password !== '' ||
    configured.search !== '' ||
    configured.hash !== ''
  ) {
    throw new EnvironmentSelectionError(`fail-closed: configured UI URL for environment "${env.name}" is unsafe`);
  }
  if (u.protocol !== configured.protocol || u.hostname.toLowerCase() !== configured.hostname.toLowerCase() || u.port !== configured.port) {
    throw new EnvironmentSelectionError(`fail-closed: UI URL does not match the verified environment origin`);
  }
  if (u.pathname !== configured.pathname) {
    throw new EnvironmentSelectionError(`fail-closed: UI URL does not match the verified environment path`);
  }
  return u.toString();
}

/**
 * L3 — init script: Service Worker API stub + SharedWorker constructor stub.
 * Runs in every page of the context before page scripts. Service workers are
 * already hard-blocked via the context option; this stub makes the BLOCK
 * observable (register() rejects; a console marker is emitted) and fails the
 * app's registration path so evidence exists. Shared workers are blocked at
 * construction because shared-worker fetches bypass Playwright routing.
 *
 * `ready` never settles rather than rejecting, so apps awaiting it hang
 * instead of producing unhandled-rejection console noise.
 */
function containmentInitScript(): void {
  // Runs inside the browser page context; DOM globals are accessed through
  // globalThis because this module compiles without the DOM lib.
  const g = globalThis as unknown as Record<string, any>;
  try {
    const warn = () => console.warn('[nightwatch] service-worker-blocked');
    const blocker = {
      register: () => {
        warn();
        return Promise.reject(new Error('Service workers are disabled by Nightwatch'));
      },
      getRegistrations: () => Promise.resolve([]),
      getRegistration: () => Promise.resolve(undefined),
      ready: new Promise(() => undefined),
    };
    const Navigator = g['Navigator'] as { prototype: object } | undefined;
    if (Navigator) {
      Object.defineProperty(Navigator.prototype, 'serviceWorker', {
        configurable: true,
        get: () => blocker,
      });
    }
  } catch {
    // environment without the SW API — nothing to block
  }
  try {
    const SharedWorkerCtor = g['SharedWorker'] as (new (...args: any[]) => unknown) | undefined;
    if (typeof SharedWorkerCtor === 'function') {
      g['SharedWorker'] = new Proxy(SharedWorkerCtor, {
        construct() {
          console.warn('[nightwatch] shared-worker-blocked');
          throw new Error('Shared workers are disabled by Nightwatch');
        },
      });
    }
  } catch {
    // environment without SharedWorker — nothing to block
  }
}

export async function createNightwatchContext(
  browser: Browser,
  opts: NightwatchContextOptions
): Promise<NightwatchContext> {
  // L5 is a mandatory startup precondition. A browser context is never
  // created on the assumption that an environment proxy variable happens to
  // be configured by the shell.
  const proxyRuntime = await requireProxyRuntime(opts.env.name, opts.proxyStateFile);
  const validated = validateUiUrl(opts.env, opts.uiBaseUrl);
  const recorder = opts.recorder;

  // Fail closed: an unusable storage-state path aborts startup (propagates).
  // Explicitly provided paths go through the SAME validation as the env-var
  // path (location outside repo/workspace, existence, shape, size).
  const auth: string | null =
    typeof opts.storageStatePath === 'string'
      ? validateStorageStateFile(opts.storageStatePath)
      : resolveStorageStatePath();

  if (auth !== null) recorder.enableAuthenticatedEvidence();

  // Trace policy — authenticated traces are NEVER enabled (fail-safe even
  // against an explicit NIGHTWATCH_TRACE=on): Playwright traces can embed
  // request headers/cookies/bodies and cannot be sanitized before persistence.
  const traceRequested = (opts.trace ?? (auth ? 'off' : 'on')) === 'on';
  const traceOn = traceRequested && auth === null;
  if (auth !== null) {
    recorder.addManifestEntry('trace', {
      enabled: false,
      reason:
        'authenticated storage state — Playwright traces can embed request headers/cookies and cannot be sanitized; Nightwatch\'s own redacted network/event evidence is preserved instead',
    });
    recorder.event({
      type: 'env',
      severity: 'warn',
      message: 'authenticated run: Playwright tracing forced OFF (traces can embed request headers/cookies and cannot be sanitized)',
    });
  } else {
    recorder.addManifestEntry('trace', {
      enabled: traceOn,
      reason: traceOn ? 'unauthenticated run' : 'explicitly disabled (NIGHTWATCH_TRACE=off)',
    });
  }

  const context = await browser.newContext({
    storageState: auth ?? undefined,
    viewport: { width: 1440, height: 900 },
    // L3 — Playwright-native service worker blocking: SW-controlled fetches
    // are NOT visible to route interception, so they must not exist at all.
    serviceWorkers: 'block',
  });

  if (traceOn) {
    await context.tracing.start({
      name: path.basename(recorder.dir), // recorder.runId (private) == dir basename
      screenshots: true,
      snapshots: false,
    });
    recorder.event({ type: 'env', severity: 'info', message: 'trace enabled' });
  }

  const monitor = new RunMonitor(opts.failOn ?? opts.env.failOn);
  recorder.configureProxy({
    state: proxyRuntime,
    browserGuardsEnabled: true,
    onViolation: (proxyEvent, failureEvent) => {
      const safeUrl = `${proxyEvent.protocol}://${proxyEvent.host}${proxyEvent.port === null ? '' : `:${proxyEvent.port}`}/`;
      monitor.recordHardFailure(failureEvent, {
        url: safeUrl,
        verdict: proxyEvent.decision,
        hostClass: proxyEvent.classification,
        reason: proxyEvent.containmentViolation ?? proxyEvent.reason,
      });
    },
  });
  recorder.event({
    type: 'env',
    severity: 'info',
    message: `environment: ${opts.env.name}${auth !== null ? ' (authenticated mode)' : ' (UNAUTHENTICATED mode)'}`,
    data: { name: opts.env.name, uiBaseUrl: validated, authenticated: auth !== null },
  });

  // L3 — init scripts + serviceworker alarm (defense in depth).
  await context.addInitScript(containmentInitScript);
  if (opts.bootstrapDiagnostics === true) {
    await installBootstrapDiagnosticHooks(context, recorder, monitor);
  }
  context.on('serviceworker', (worker) => {
    const ev = recorder.event({
      type: 'service-worker',
      severity: 'fatal',
      message: 'HARD FAILURE: service worker registered despite blocking (containment violation)',
      data: {
        reason: 'service-worker-registered',
        path: 'service-worker',
        monitorReason: 'GUARD_ALARM',
        guardType: 'service-worker-alarm',
        url: recorder.redactUrl(worker.url()),
      },
    });
    monitor.recordHardFailure(ev, {
      url: worker.url(),
      verdict: 'deny',
      hostClass: 'unknown-alphaus',
      reason: 'service worker registered despite blocking',
    });
  });

  const page: Page = context.pages()[0] ?? (await context.newPage());

  const policy = new OutboundPolicy(opts.env);

  const optionalSupportBlockedHosts = new Set<string>();
  const browserBackgroundBlockedHosts = new Map<string, import('../core/safety/types').BrowserBackgroundClassification>();
  const network = createNetworkObserver({
    policy,
    recorder,
    monitor,
    endpointClassifier: (url, method) => classifyRippleEndpoint(url, method, opts.env),
    endpointMatcher: (url, method) => matchRippleEndpoint(url, method, opts.env, opts.endpointRegistry),
    optionalSupportBlockedHosts,
    browserBackgroundBlockedHosts,
    targetOrigin: new URL(validated).origin,
    journeyId: opts.journeyId,
    ...(opts.semanticOracle === undefined ? {} : { semanticOracle: opts.semanticOracle }),
  });
  let proxyPollStopped = false;
  let proxyHealthCheckInFlight = false;
  let proxyDownRecorded = false;
  let lifecycleStopping = false;
  let lifecycleFailureRecorded = false;

  const recordLifecycleFailure = (reason: 'BROWSER_DISCONNECTED' | 'CONTEXT_CLOSED' | 'PAGE_CLOSED', lifecycleEvent: string): void => {
    if (lifecycleStopping || lifecycleFailureRecorded) return;
    lifecycleFailureRecorded = true;
    const failureEvent = recorder.event({
      type: 'hard-failure',
      severity: 'fatal',
      message: `HARD FAILURE: browser lifecycle ${lifecycleEvent}`,
      data: {
        reason: 'browser-lifecycle',
        path: 'browser-lifecycle',
        monitorReason: reason,
        lifecycleEvent,
        guardType: 'browser-lifecycle',
      },
    });
    monitor.recordHardFailure(failureEvent, {
      url: 'about:blank',
      verdict: 'deny',
      hostClass: 'external',
      reason: 'browser lifecycle failure',
      monitorReason: reason,
      guardType: 'browser-lifecycle',
      lifecycleEvent,
    });
  };

  browser.on('disconnected', () => recordLifecycleFailure('BROWSER_DISCONNECTED', 'browser-disconnected'));
  context.on('close', () => recordLifecycleFailure('CONTEXT_CLOSED', 'context-closed'));
  page.on('close', () => recordLifecycleFailure('PAGE_CLOSED', 'page-closed'));

  const healthCheck = opts.proxyHealthCheck ?? checkProxyHealth;
  const proxyPoll = setInterval(() => {
    try {
      recorder.syncProxyViolations();
    } catch {
      monitor.recordInternalFailure('proxy-violation-sync');
    }
    if (proxyPollStopped || proxyHealthCheckInFlight || proxyDownRecorded) return;
    proxyHealthCheckInFlight = true;
    void Promise.resolve()
      .then(() => {
        try {
          return { processAlive: opts.proxyProcessAlive?.() ?? true };
        } catch {
          monitor.recordInternalFailure('proxy-process-lifecycle-check');
          return { processAlive: true };
        }
      })
      .then(async ({ processAlive }) => {
        if (proxyPollStopped || proxyDownRecorded) return { healthy: true, processAlive };
        if (!processAlive) return { healthy: false, processAlive };
        try {
          return { healthy: await healthCheck(proxyRuntime), processAlive };
        } catch {
          monitor.recordInternalFailure('proxy-health-check');
          return { healthy: false, processAlive };
        }
      })
      .then(({ healthy, processAlive }) => {
        if (healthy || proxyPollStopped || proxyDownRecorded) return;
        proxyDownRecorded = true;
        const monitorReason = processAlive ? 'PROXY_LIVENESS_FAILED' : 'PROXY_PROCESS_EXITED';
        const failureEvent = recorder.event({
          type: 'hard-failure',
          severity: 'fatal',
          message: processAlive
            ? 'HARD FAILURE: outer proxy became unavailable during run'
            : 'HARD FAILURE: outer proxy process exited during run',
          data: {
            path: 'outer-proxy-runtime',
            proxyAddress: `loopback:${proxyRuntime.port}`,
            reason: processAlive ? 'proxy health check failed during run' : 'proxy process exited during run',
            monitorReason,
            guardType: 'outer-proxy',
          },
        });
        monitor.recordHardFailure(failureEvent, {
          url: `${proxyRuntime.address}/__nightwatch_health`,
          verdict: 'deny',
          hostClass: 'external',
          reason: processAlive ? 'proxy health check failed during run' : 'proxy process exited during run',
          monitorReason,
          guardType: 'outer-proxy',
        });
      })
      .finally(() => {
        proxyHealthCheckInFlight = false;
      });
  }, opts.proxyPollIntervalMs ?? 100);
  const consoleObserver = createConsoleObserver({
    recorder,
    monitor,
    isExpectedOptionalResourceFailure: (locationUrl) => locationUrl !== undefined && network.optionalResourceFailureUrls().has(locationUrl),
    classifyExpectedContainmentEffect: (text, locationUrl) =>
      classifyOptionalSupportConsoleEffect(text, locationUrl, network.optionalSupportBlockedHosts()) ??
      classifyTelemetryConsoleEffect(text, locationUrl, network.telemetryBlockedHosts()) ??
      classifyBrowserBackgroundConsoleEffect(text, locationUrl, network.browserBackgroundBlockedHosts()),
  });
  const pageObserver = createPageObserver({ recorder, monitor });

  // L1/L2 — route + WebSocket policy gates. Both registrations are
  // asynchronous (routeWebSocket installs an in-page init script + binding);
  // they MUST complete before any navigation, hence the await.
  await network.install(context);
  consoleObserver.install(page);
  pageObserver.install(page);

  // L0 — raw CDP Fetch guard (backstop for redirect follow-ups and any
  // request Playwright routing does not re-intercept). Same policy decision,
  // resolved at the network layer BEFORE the request leaves the browser.
  // Installed per page: initial page + every popup/new page.
  await installFetchGuard(context, page, {
    policy,
    recorder,
    monitor,
    sharedBlocked: network.blockedUrls(),
    optionalSupportBlockedHosts: network.optionalSupportBlockedHosts(),
    telemetryBlockedHosts: network.telemetryBlockedHosts(),
    browserBackgroundBlockedHosts: network.browserBackgroundBlockedHosts(),
  });
  page.on('download', onDownload);

  // Auto-wire observers, the Fetch guard and download handling onto popups
  // and new pages (the network observer auto-wires its own response/
  // requestfailed/observation handlers context-wide).
  context.on('page', (p: Page) => {
    consoleObserver.install(p);
    pageObserver.install(p);
    void installFetchGuard(context, p, {
      policy,
      recorder,
      monitor,
      sharedBlocked: network.blockedUrls(),
      optionalSupportBlockedHosts: network.optionalSupportBlockedHosts(),
      telemetryBlockedHosts: network.telemetryBlockedHosts(),
      browserBackgroundBlockedHosts: network.browserBackgroundBlockedHosts(),
    });
    p.on('download', onDownload);
  });

  // L4 — downloads: record + cancel; denied downloads hard-fail even when the
  // request bypassed routing (download-manager traffic).
  async function onDownload(download: Download): Promise<void> {
    try {
      const rawUrl = download.url();
      const redactedUrl = recorder.redactUrl(rawUrl);
      const decision = policy.decide(rawUrl);
      recorder.event({
        type: 'download',
        severity: decision.verdict === 'deny' ? 'error' : 'warn',
        message: `download initiated: ${redactedUrl}`,
        data: { url: redactedUrl, verdict: decision.verdict, reason: decision.reason },
      });
      if (decision.verdict === 'deny' && !network.blockedUrls().has(rawUrl)) {
        network.blockedUrls().add(rawUrl);
        const ev = recorder.event({
          type: 'hard-failure',
          severity: 'fatal',
          message: `HARD FAILURE: ${redactedUrl}`,
          data: {
            url: redactedUrl,
            verdict: 'deny',
            hostClass: decision.hostClass,
            reason: decision.reason,
            path: 'download-cancel',
          },
        });
        monitor.recordHardFailure(ev, {
          url: rawUrl,
          verdict: 'deny',
          hostClass: decision.hostClass,
          reason: decision.reason,
        });
      }
      try {
        await download.cancel();
      } catch {
        // download already finished/failed — ignore
      }
    } catch {
      // observer must never crash the run
    }
  }

  const close = async (): Promise<void> => {
    lifecycleStopping = true;
    proxyPollStopped = true;
    clearInterval(proxyPoll);
    recorder.syncProxyViolations();
    if (traceOn) {
      try {
        await context.tracing.stop({ path: path.join(recorder.dir, 'trace.zip') });
      } catch (err) {
        recorder.event({
          type: 'env',
          severity: 'warn',
          message: `trace stop failed: ${recorder.redaction.redactText(
            String(err instanceof Error ? err.message : err)
          )}`,
        });
      }
    }
    await context.close();
  };

  return { context, page, monitor, network, close };
}
