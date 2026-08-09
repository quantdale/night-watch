// ---------------------------------------------------------------------------
// Nightwatch — console observer.
//
// Every page console message is recorded. 'error'-type messages also raise a
// 'console-error' issue (failOn-configured) unless they are Chromium's own
// "Failed to load resource: ..." noise — those are duplicates of the network
// observer's requestfailed/blocked tracking (e.g. a deliberately blocked
// telemetry request must never look like a page bug).
// ---------------------------------------------------------------------------

import type { Page } from '@playwright/test';
import type { RunRecorder } from '../../core/evidence/runRecorder';
import type { RunMonitor } from '../../state/run';

/** Chromium logs this automatically when any resource load fails. */
const CHROME_RESOURCE_FAILURE_RE = /^Failed to load resource:/i;

export function createConsoleObserver(opts: {
  recorder: RunRecorder;
  monitor: RunMonitor;
}): { install(page: Page): void } {
  const { recorder, monitor } = opts;
  return {
    install(page: Page): void {
      page.on('console', (msg) => {
        try {
          const text = recorder.redaction.redactText(msg.text());
          if (CHROME_RESOURCE_FAILURE_RE.test(text)) return; // network observer's job
          recorder.event({
            type: 'console',
            severity: msg.type() === 'error' ? 'error' : 'info',
            message: `[${msg.type()}] ${text}`,
            data: { type: msg.type(), text },
          });
          if (msg.type() === 'error') {
            const issueEvent = recorder.event({
              type: 'issue',
              severity: 'error',
              message: `console-error: ${text}`,
              data: { reason: 'console-error' },
            });
            monitor.recordIssue(issueEvent);
          }
          // 'warning' and every other type are recorded as info, never issues.
        } catch {
          // observer must never crash the run
        }
      });
    },
  };
}
