// ---------------------------------------------------------------------------
// Nightwatch — network stability wait.
//
// Polls the network observer until no requests are in flight and the last
// observed activity is older than quietMs (default 500ms). On timeout
// (default 15s) records a 'stability' event and a 'stability-timeout' issue
// (failOn-configured) and returns false.
// ---------------------------------------------------------------------------

import type { RunEvent } from '../../core/evidence/types';
import type { RunRecorder } from '../../core/evidence/runRecorder';
import type { RunMonitor } from '../../state/run';
import type { NetworkObserver } from './networkObserver';
import { isRippleStructurallyReady, type RippleStructuralState } from '../../products/ripple/readiness';

const POLL_MS = 100;

export async function waitForStability(opts: {
  network: NetworkObserver;
  quietMs?: number;
  timeoutMs?: number;
  recorder?: RunRecorder;
  monitor?: RunMonitor;
}): Promise<boolean> {
  const quietMs = opts.quietMs ?? 500;
  const timeoutMs = opts.timeoutMs ?? 15_000;
  const deadline = Date.now() + timeoutMs;

  for (;;) {
    if (opts.network.activeRequests() === 0 && Date.now() - opts.network.lastActivityAt() >= quietMs) {
      return true;
    }
    if (Date.now() >= deadline) {
      if (opts.recorder !== undefined && opts.monitor !== undefined) {
        opts.recorder.event({
          type: 'stability',
          severity: 'error',
          message: 'page never reached stable state within timeout',
          data: { reason: 'stability-timeout' },
        });
        const issueEvent: RunEvent = opts.recorder.event({
          type: 'issue',
          severity: 'error',
          message: 'stability-timeout: page never reached stable state within timeout',
          data: { reason: 'stability-timeout' },
        });
        opts.monitor.recordIssue(issueEvent);
      }
      return false;
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
}

export interface RippleStabilitySample extends RippleStructuralState {
  /** The current browser URL, held in memory and never persisted by this wait. */
  route: string;
  /** Fatal browser/page/containment state already classified by the monitor. */
  fatal: boolean;
}

/**
 * SPA-appropriate authenticated Ripple stability.
 *
 * This deliberately does not inspect NetworkObserver.activeRequests(). Ripple
 * may continue benign background reads after its shell is ready, so generic
 * network-idle is not a reliable application readiness signal. Stability is
 * the source-backed structural state remaining ready while the route stays
 * unchanged for quietMs. Target confirmation is intentionally not an input;
 * the caller reports that signal independently.
 */
export async function waitForRippleStability(opts: {
  sample: () => Promise<RippleStabilitySample>;
  quietMs?: number;
  timeoutMs?: number;
  recorder?: RunRecorder;
  monitor?: RunMonitor;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}): Promise<boolean> {
  const quietMs = opts.quietMs ?? 750;
  const timeoutMs = opts.timeoutMs ?? 15_000;
  const now = opts.now ?? Date.now;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const deadline = now() + timeoutMs;
  let previousRoute: string | null = null;
  let routeStableSince: number | null = null;

  for (;;) {
    const sample = await opts.sample();
    if (sample.fatal) return false;

    const currentTime = now();
    if (previousRoute !== sample.route) {
      previousRoute = sample.route;
      routeStableSince = currentTime;
    }

    if (isRippleStructurallyReady(sample) && routeStableSince !== null && currentTime - routeStableSince >= quietMs) {
      return true;
    }

    if (currentTime >= deadline) {
      if (opts.recorder !== undefined && opts.monitor !== undefined) {
        opts.recorder.event({
          type: 'stability',
          severity: 'error',
          message: 'Ripple shell never reached structurally stable state within timeout',
          data: {
            reason: 'stability-timeout',
            contract: 'ripple-structural',
            signals: ['document-ready', 'app-root', 'route-stable'],
          },
        });
        const issueEvent: RunEvent = opts.recorder.event({
          type: 'issue',
          severity: 'error',
          message: 'stability-timeout: Ripple shell never reached structurally stable state within timeout',
          data: {
            reason: 'stability-timeout',
            contract: 'ripple-structural',
          },
        });
        opts.monitor.recordIssue(issueEvent);
      }
      return false;
    }
    await sleep(POLL_MS);
  }
}
