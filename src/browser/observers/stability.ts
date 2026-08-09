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
