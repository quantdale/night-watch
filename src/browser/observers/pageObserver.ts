// ---------------------------------------------------------------------------
// Nightwatch — page observer.
//
// Uncaught page errors ('pageerror') and page crashes are recorded; each also
// raises a 'pageerror' issue (failOn-configured).
// ---------------------------------------------------------------------------

import type { Page } from '@playwright/test';
import type { RunRecorder } from '../../core/evidence/runRecorder';
import type { RunMonitor } from '../../state/run';

function safeErrorLocation(error: unknown, recorder: RunRecorder): Record<string, unknown> {
  const stack = error instanceof Error ? error.stack : undefined;
  if (typeof stack !== 'string') return {};
  const match = /(https?:\/\/[^\s)]+):(\d+):(\d+)/i.exec(stack);
  if (match === null || match[1] === undefined || match[2] === undefined || match[3] === undefined) return {};
  const safeUrl = recorder.redactUrl(match[1]);
  try {
    const location = new URL(safeUrl);
    return {
      sourceOrigin: location.origin,
      sourcePath: location.pathname || '/',
      sourceLine: Number(match[2]),
      sourceColumn: Number(match[3]),
    };
  } catch {
    return {};
  }
}

export function createPageObserver(opts: {
  recorder: RunRecorder;
  monitor: RunMonitor;
}): { install(page: Page): void } {
  const { recorder, monitor } = opts;
  return {
    install(page: Page): void {
      page.on('pageerror', (err) => {
        try {
          const message = recorder.isAuthenticated
            ? '[SUPPRESSED_AUTHENTICATED_PAGE_ERROR]'
            : recorder.redaction.redactText(String(err instanceof Error && err.message ? err.message : err));
          recorder.event({
            type: 'pageerror',
            severity: 'error',
            message: recorder.isAuthenticated ? 'pageerror' : `page error: ${message}`,
            data: recorder.isAuthenticated
              ? { category: 'uncaught-page-exception', ...safeErrorLocation(err, recorder) }
              : { message, ...safeErrorLocation(err, recorder) },
          });
          const issueEvent = recorder.event({
            type: 'issue',
            severity: 'error',
            message: 'pageerror',
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
