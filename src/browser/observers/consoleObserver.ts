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
import type { ExpectedContainmentEffect } from './containmentEffect';

/** Chromium logs this automatically when any resource load fails. */
const CHROME_RESOURCE_FAILURE_RE = /^Failed to load resource:/i;

function safeConsoleLocation(recorder: RunRecorder, rawUrl: string | undefined): Record<string, unknown> {
  if (typeof rawUrl !== 'string' || rawUrl === '') return {};
  try {
    const location = new URL(recorder.redactUrl(rawUrl));
    return {
      sourceOrigin: location.origin,
      sourcePath: location.pathname || '/',
    };
  } catch {
    return {};
  }
}

export function createConsoleObserver(opts: {
  recorder: RunRecorder;
  monitor: RunMonitor;
  classifyExpectedContainmentEffect?: (text: string, locationUrl: string | undefined) => ExpectedContainmentEffect | null;
}): { install(page: Page): void } {
  const { recorder, monitor } = opts;
  return {
    install(page: Page): void {
      page.on('console', (msg) => {
        try {
          const expectedContainment = msg.type() === 'error'
            ? opts.classifyExpectedContainmentEffect?.(msg.text(), msg.location().url)
            : null;
          if (expectedContainment !== null && expectedContainment !== undefined) {
            monitor.recordContainment(expectedContainment.classification);
            recorder.event({
              type: 'console',
              severity: 'warn',
              message: expectedContainment.reason,
              data: {
                type: msg.type(),
                category: expectedContainment.reason,
                classification: expectedContainment.classification,
                hostClass: expectedContainment.hostClass,
                host: expectedContainment.host,
              },
            });
            recorder.event({
              type: 'oracle',
              severity: 'info',
              message: expectedContainment.reason,
              data: {
                reason: 'expected-containment-effect',
                classification: expectedContainment.classification,
                hostClass: expectedContainment.hostClass,
                host: expectedContainment.host,
              },
            });
            return;
          }
          const text = recorder.isAuthenticated
            ? '[SUPPRESSED_AUTHENTICATED_CONSOLE_TEXT]'
            : recorder.redaction.redactText(msg.text());
          if (CHROME_RESOURCE_FAILURE_RE.test(text)) return; // network observer's job
          recorder.event({
            type: 'console',
            severity: msg.type() === 'error' ? 'error' : 'info',
            message: recorder.isAuthenticated ? `console-${msg.type()}` : `[${msg.type()}] ${text}`,
            data: recorder.isAuthenticated
              ? { type: msg.type(), category: `console-${msg.type()}`, ...safeConsoleLocation(recorder, msg.location().url) }
              : { type: msg.type(), text, ...safeConsoleLocation(recorder, msg.location().url) },
          });
          if (msg.type() === 'error') {
            const issueEvent = recorder.event({
              type: 'issue',
              severity: 'error',
              message: 'console-error',
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
