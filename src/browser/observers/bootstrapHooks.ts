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
  'document-lifecycle',
  'bootstrap-target',
  'rendered-shell',
] as const;

export type BootstrapDiagnosticCategory = (typeof BOOTSTRAP_DIAGNOSTIC_CATEGORIES)[number];

export type BootstrapDiagnosticPhase =
  | 'domcontentloaded'
  | 'complete'
  | 'seen'
  | 'removed'
  | 'pushState'
  | 'replaceState'
  | 'popstate'
  | 'hashchange'
  | 'go'
  | 'resource-error';

export interface BootstrapDiagnosticPayload {
  category: BootstrapDiagnosticCategory;
  phase?: BootstrapDiagnosticPhase;
  /** Bounded monotonic timing from the current document. */
  elapsedMs?: number;
  /** Page-side sanitized pathname; never a query string or fragment. */
  path?: string;
  resourceKind?: 'script' | 'stylesheet';
}

function isBootstrapDiagnosticCategory(value: unknown): value is BootstrapDiagnosticCategory {
  return typeof value === 'string' &&
    (BOOTSTRAP_DIAGNOSTIC_CATEGORIES as readonly string[]).includes(value);
}

const BOOTSTRAP_DIAGNOSTIC_PHASES: readonly string[] = [
  'domcontentloaded',
  'complete',
  'seen',
  'removed',
  'pushState',
  'replaceState',
  'popstate',
  'hashchange',
  'go',
  'resource-error',
];

function isBootstrapDiagnosticPhase(value: unknown): value is BootstrapDiagnosticPhase {
  return typeof value === 'string' && BOOTSTRAP_DIAGNOSTIC_PHASES.includes(value);
}

function sanitizePathname(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const raw = value.split(/[?#]/, 1)[0] ?? '/';
  if (!raw.startsWith('/')) return null;
  const safeRouteSegments = new Set([
    'ripple',
    'dashboard',
    'login',
    'saml',
    'change-password',
    'error',
    'error500',
    'error-access-deny',
  ]);
  const segments = raw.split('/').slice(0, 12).map((segment) => {
    if (segment === '') return '';
    return safeRouteSegments.has(segment) ? segment : '<ID>';
  });
  const sanitized = segments.join('/');
  return sanitized === '' ? '/' : sanitized;
}

function sanitizeBootstrapDiagnostic(value: unknown): BootstrapDiagnosticPayload | null {
  if (typeof value === 'string') {
    return isBootstrapDiagnosticCategory(value) ? { category: value } : null;
  }
  if (value === null || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;
  const category = candidate.category;
  if (!isBootstrapDiagnosticCategory(category)) return null;
  const output: BootstrapDiagnosticPayload = { category };
  if (isBootstrapDiagnosticPhase(candidate.phase)) output.phase = candidate.phase;
  if (typeof candidate.elapsedMs === 'number' && Number.isFinite(candidate.elapsedMs)) {
    output.elapsedMs = Math.max(0, Math.min(120_000, Math.round(candidate.elapsedMs)));
  }
  const path = sanitizePathname(candidate.path);
  if (path !== null) output.path = path;
  if (candidate.resourceKind === 'script' || candidate.resourceKind === 'stylesheet') {
    output.resourceKind = candidate.resourceKind;
  }
  return output;
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
  const safeRouteSegments = new Set([
    'ripple',
    'dashboard',
    'login',
    'saml',
    'change-password',
    'error',
    'error500',
    'error-access-deny',
  ]);
  const safePath = (): string => {
    try {
      const location = pageGlobal.location as { pathname?: unknown } | undefined;
      const raw = typeof location?.pathname === 'string' ? location.pathname : '/';
      const pathname = raw.split(/[?#]/, 1)[0] ?? '/';
      const segments = pathname.split('/').slice(0, 12).map((segment) => {
        if (segment === '') return '';
        return safeRouteSegments.has(segment) ? segment : '<ID>';
      });
      const sanitized = segments.join('/');
      return sanitized === '' ? '/' : sanitized;
    } catch {
      return '/';
    }
  };
  const elapsedMs = (): number => {
    try {
      const performance = pageGlobal.performance as { now?: () => number } | undefined;
      if (typeof performance?.now === 'function') {
        return Math.max(0, Math.min(120_000, Math.round(performance.now())));
      }
    } catch {
      // Use the bounded zero fallback below.
    }
    return 0;
  };
  const emit = (payload: BootstrapDiagnosticPayload): void => {
    try {
      const binding = pageGlobal[bindingName];
      if (typeof binding !== 'function') return;
      const result = (binding as (value: BootstrapDiagnosticPayload) => unknown)(payload);
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
        go?: (...args: any[]) => unknown;
      };
      document?: {
        readyState?: string;
        querySelector?: (selector: string) => unknown;
        addEventListener?: (type: string, listener: (event?: any) => void, options?: boolean) => void;
        documentElement?: unknown;
      };
      MutationObserver?: new (callback: () => void) => { observe: (target: unknown, options: Record<string, boolean>) => void };
    };
    const document = pageWindow.document;
    let mountSeen = false;
    let mountRemoved = false;
    let shellSeen = false;
    let domContentLoaded = false;
    let documentComplete = false;
    const checkStructuralLifecycle = (): void => {
      try {
        const mountPresent = document?.querySelector?.('#app') !== null &&
          document?.querySelector?.('#app') !== undefined;
        if (mountPresent && !mountSeen) {
          mountSeen = true;
          emit({ category: 'bootstrap-target', phase: 'seen', elapsedMs: elapsedMs(), path: safePath() });
        }
        if (!mountPresent && mountSeen && !mountRemoved) {
          mountRemoved = true;
          emit({ category: 'bootstrap-target', phase: 'removed', elapsedMs: elapsedMs(), path: safePath() });
        }
        const shellPresent = document?.querySelector?.('.q-layout-container.layout') !== null &&
          document?.querySelector?.('.q-layout-container.layout') !== undefined;
        if (shellPresent && !shellSeen) {
          shellSeen = true;
          emit({ category: 'rendered-shell', phase: 'seen', elapsedMs: elapsedMs(), path: safePath() });
        }
      } catch {
        // Structural diagnostics must never affect the application.
      }
    };

    pageWindow.addEventListener?.('unhandledrejection', () => emit({ category: 'unhandled-rejection' }));
    pageWindow.addEventListener?.('securitypolicyviolation', () => emit({ category: 'csp-violation' }));
    pageWindow.addEventListener?.('error', (event: any) => {
      const target = event?.target as { tagName?: unknown } | null | undefined;
      const tagName = typeof target?.tagName === 'string' ? target.tagName.toUpperCase() : '';
      if (tagName === 'SCRIPT' || tagName === 'LINK') {
        emit({
          category: 'resource-error-event',
          phase: 'resource-error',
          resourceKind: tagName === 'SCRIPT' ? 'script' : 'stylesheet',
          path: safePath(),
        });
      } else emit({ category: 'runtime-error-event' });
    }, true);

    pageWindow.addEventListener?.('DOMContentLoaded', () => {
      if (domContentLoaded) return;
      domContentLoaded = true;
      emit({ category: 'document-lifecycle', phase: 'domcontentloaded', elapsedMs: elapsedMs(), path: safePath() });
      checkStructuralLifecycle();
    });
    pageWindow.addEventListener?.('readystatechange', () => {
      if (document?.readyState === 'complete' && !documentComplete) {
        documentComplete = true;
        emit({ category: 'document-lifecycle', phase: 'complete', elapsedMs: elapsedMs(), path: safePath() });
      }
      checkStructuralLifecycle();
    });
    pageWindow.addEventListener?.('load', () => {
      if (!documentComplete) {
        documentComplete = true;
        emit({ category: 'document-lifecycle', phase: 'complete', elapsedMs: elapsedMs(), path: safePath() });
      }
      checkStructuralLifecycle();
    });

    checkStructuralLifecycle();
    try {
      const Observer = pageWindow.MutationObserver;
      const target = document?.documentElement ?? document;
      if (typeof Observer === 'function' && target !== undefined && target !== null) {
        const observer = new Observer(checkStructuralLifecycle);
        observer.observe(target, { childList: true, subtree: true });
      }
    } catch {
      // MutationObserver is optional; the lifecycle events remain useful.
    }

    const history = pageWindow.history;
    if (history !== undefined) {
      for (const method of ['pushState', 'replaceState'] as const) {
        const original = history[method];
        if (typeof original !== 'function') continue;
        try {
          history[method] = function (this: unknown, ...args: any[]): unknown {
            const result = original.apply(this, args);
            emit({ category: 'route-transition', phase: method, path: safePath(), elapsedMs: elapsedMs() });
            return result;
          };
        } catch {
          // A locked-down history implementation simply has no hook.
        }
      }
      if (typeof history.go === 'function') {
        const originalGo = history.go;
        try {
          history.go = function (this: unknown, ...args: any[]): unknown {
            const result = originalGo.apply(this, args);
            emit({ category: 'route-transition', phase: 'go', path: safePath(), elapsedMs: elapsedMs() });
            return result;
          };
        } catch {
          // A locked-down history implementation simply has no hook.
        }
      }
    }
    pageWindow.addEventListener?.('popstate', () => emit({ category: 'route-transition', phase: 'popstate', path: safePath(), elapsedMs: elapsedMs() }));
    pageWindow.addEventListener?.('hashchange', () => emit({ category: 'route-transition', phase: 'hashchange', path: safePath(), elapsedMs: elapsedMs() }));
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
    (_source: unknown, value: unknown) => {
      const payload = sanitizeBootstrapDiagnostic(value);
      if (payload === null) return;
      recorder.event({
        type: 'bootstrap',
        severity: 'info',
        message: 'sanitized bootstrap diagnostic event',
        data: { ...payload },
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
