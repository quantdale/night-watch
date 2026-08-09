// ---------------------------------------------------------------------------
// Nightwatch — page observer.
//
// Uncaught page errors ('pageerror') and page crashes are recorded; each also
// raises a 'pageerror' issue (failOn-configured).
// ---------------------------------------------------------------------------

import type { Page } from '@playwright/test';
import type { RunRecorder } from '../../core/evidence/runRecorder';
import type { RunMonitor } from '../../state/run';

export function createPageObserver(opts: {
  recorder: RunRecorder;
  monitor: RunMonitor;
}): { install(page: Page): void } {
  const { recorder, monitor } = opts;
  return {
    install(page: Page): void {
      page.on('pageerror', (err) => {
        try {
          const message = recorder.redaction.redactText(
            String(err instanceof Error && err.message ? err.message : err)
          );
          recorder.event({
            type: 'pageerror',
            severity: 'error',
            message: `page error: ${message}`,
            data: { message },
          });
          const issueEvent = recorder.event({
            type: 'issue',
            severity: 'error',
            message: `pageerror: ${message}`,
            data: { reason: 'pageerror' },
          });
          monitor.recordIssue(issueEvent);
        } catch {
          // observer must never crash the run
        }
      });
      page.on('crash', () => {
        try {
          recorder.event({ type: 'pageerror', severity: 'fatal', message: 'page crashed' });
          const issueEvent = recorder.event({
            type: 'issue',
            severity: 'error',
            message: 'pageerror: page crashed',
            data: { reason: 'pageerror' },
          });
          monitor.recordIssue(issueEvent);
        } catch {
          // observer must never crash the run
        }
      });
    },
  };
}
