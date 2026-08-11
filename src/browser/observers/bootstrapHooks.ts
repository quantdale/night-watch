// ---------------------------------------------------------------------------
// Nightwatch — sanitized bootstrap/runtime hooks.
//
// These hooks are opt-in for the authenticated Phase 2A observer. They emit
// fixed category values through a Playwright binding; no exception text,
// locations, URLs, DOM, storage, or resource contents cross the page boundary.
// ---------------------------------------------------------------------------

import type { BrowserContext } from '@playwright/test';
import type { RunRecorder } from '../../core/evidence/runRecorder';

export const BOOTSTRAP_DIAGNOSTIC_BINDING = '__nightwatchBootstrapDiagnostic';

export const BOOTSTRAP_DIAGNOSTIC_CATEGORIES = [
  'unhandled-rejection',
  'csp-violation',
  'resource-error-event',
  'runtime-error-event',
  'route-transition',
] as const;

export type BootstrapDiagnosticCategory = (typeof BOOTSTRAP_DIAGNOSTIC_CATEGORIES)[number];

function isBootstrapDiagnosticCategory(value: unknown): value is BootstrapDiagnosticCategory {
  return typeof value === 'string' &&
    (BOOTSTRAP_DIAGNOSTIC_CATEGORIES as readonly string[]).includes(value);
}

/**
 * Runs before application scripts. Only fixed diagnostic categories are sent
 * to the local binding. The history wrappers preserve the original return
 * values and arguments; they report that a route transition was attempted,
 * never the destination path.
 */
export function bootstrapDiagnosticInitScript(): void {
  const bindingName = '__nightwatchBootstrapDiagnostic';
  const pageGlobal = globalThis as unknown as Record<string, unknown>;
  const emit = (category: BootstrapDiagnosticCategory): void => {
    try {
      const binding = pageGlobal[bindingName];
      if (typeof binding !== 'function') return;
      const result = (binding as (value: BootstrapDiagnosticCategory) => unknown)(category);
      if (result !== null && typeof result === 'object' &&
        typeof (result as { catch?: unknown }).catch === 'function') {
        void (result as { catch: (callback: () => void) => unknown }).catch(() => undefined);
      }
    } catch {
      // Diagnostics must never alter application behavior or fail the run.
    }
  };

  try {
    const pageWindow = pageGlobal as unknown as {
      addEventListener?: (type: string, listener: (event: any) => void, options?: boolean) => void;
      history?: {
        pushState?: (...args: any[]) => unknown;
        replaceState?: (...args: any[]) => unknown;
      };
    };
    pageWindow.addEventListener?.('unhandledrejection', () => emit('unhandled-rejection'));
    pageWindow.addEventListener?.('securitypolicyviolation', () => emit('csp-violation'));
    pageWindow.addEventListener?.('error', (event: any) => {
      const target = event?.target as { tagName?: unknown } | null | undefined;
      const tagName = typeof target?.tagName === 'string' ? target.tagName.toUpperCase() : '';
      if (tagName === 'SCRIPT' || tagName === 'LINK') emit('resource-error-event');
      else emit('runtime-error-event');
    }, true);

    const history = pageWindow.history;
    if (history !== undefined) {
      for (const method of ['pushState', 'replaceState'] as const) {
        const original = history[method];
        if (typeof original !== 'function') continue;
        try {
          history[method] = function (this: unknown, ...args: any[]): unknown {
            const result = original.apply(this, args);
            emit('route-transition');
            return result;
          };
        } catch {
          // A locked-down history implementation simply has no hook.
        }
      }
    }
    pageWindow.addEventListener?.('popstate', () => emit('route-transition'));
    pageWindow.addEventListener?.('hashchange', () => emit('route-transition'));
  } catch {
    // Unsupported page environments remain observable through Node events.
  }
}

/** Install the binding and init script before the next navigation. */
export async function installBootstrapDiagnosticHooks(
  context: BrowserContext,
  recorder: RunRecorder,
): Promise<void> {
  await context.exposeBinding(
    BOOTSTRAP_DIAGNOSTIC_BINDING,
    (_source: unknown, category: unknown) => {
      if (!isBootstrapDiagnosticCategory(category)) return;
      recorder.event({
        type: 'bootstrap',
        severity: 'info',
        message: 'sanitized bootstrap diagnostic event',
        data: { category },
      });
    },
  );
  await context.addInitScript(bootstrapDiagnosticInitScript);
  recorder.event({
    type: 'bootstrap',
    severity: 'info',
    message: 'sanitized bootstrap diagnostics installed',
    data: { category: 'observer-installed' },
  });
}
