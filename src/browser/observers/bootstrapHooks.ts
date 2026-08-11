// ---------------------------------------------------------------------------
// Nightwatch — sanitized bootstrap/runtime hooks.
//
// These hooks are opt-in for the authenticated Phase 2A observer. They emit
// fixed category values through a Playwright binding; no exception text,
// locations, URLs, DOM, storage, or resource contents cross the page boundary.
// ---------------------------------------------------------------------------

import type { BrowserContext } from '@playwright/test';
import type { RunRecorder } from '../../core/evidence/runRecorder';
import {
  type RippleRootRenderBranch,
} from '../../products/ripple/readiness';

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
  'post-mount-structure',
  'source-reload-signal',
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
  | 'resource-error'
  | 'replacement'
  | 'reload-trigger'
  | 'marker-present';

export type BootstrapReplacementNodeType = 'element' | 'comment' | 'text' | 'none' | 'unknown';

const SAFE_REPLACEMENT_TAGS = [
  'DIV',
  'SPAN',
  'P',
  'SECTION',
  'MAIN',
  'ASIDE',
  'HEADER',
  'FOOTER',
  'NAV',
  'UL',
  'LI',
] as const;

type SafeReplacementTag = (typeof SAFE_REPLACEMENT_TAGS)[number];

export interface BootstrapDiagnosticPayload {
  category: BootstrapDiagnosticCategory;
  phase?: BootstrapDiagnosticPhase;
  /** Bounded monotonic timing from the current document. */
  elapsedMs?: number;
  /** Page-side sanitized pathname; never a query string or fragment. */
  path?: string;
  resourceKind?: 'script' | 'stylesheet';
  vueInitialPatchObserved?: boolean;
  replacementNodeType?: BootstrapReplacementNodeType;
  replacementTag?: SafeReplacementTag;
  matchesLoadingWrapper?: boolean;
  matchesAuthLayout?: boolean;
  matchesDefaultLayout?: boolean;
  matchesQLayout?: boolean;
  rootBranch?: RippleRootRenderBranch;
  sourceReloadOwner?: 'Ripple';
  sourceReloadPath?: 'public/index.html';
  sourceReloadTrigger?: 'script-or-link-error';
  sourceReloadMarkerPresent?: boolean;
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
  'replacement',
  'reload-trigger',
  'marker-present',
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
  if (candidate.vueInitialPatchObserved === true) output.vueInitialPatchObserved = true;
  const replacementNodeTypes: readonly BootstrapReplacementNodeType[] = [
    'element',
    'comment',
    'text',
    'none',
    'unknown',
  ];
  if (typeof candidate.replacementNodeType === 'string' && replacementNodeTypes.includes(candidate.replacementNodeType as BootstrapReplacementNodeType)) {
    output.replacementNodeType = candidate.replacementNodeType as BootstrapReplacementNodeType;
  }
  if (typeof candidate.replacementTag === 'string' && SAFE_REPLACEMENT_TAGS.includes(candidate.replacementTag as SafeReplacementTag)) {
    output.replacementTag = candidate.replacementTag as SafeReplacementTag;
  }
  for (const key of ['matchesLoadingWrapper', 'matchesAuthLayout', 'matchesDefaultLayout', 'matchesQLayout'] as const) {
    if (candidate[key] === true) output[key] = true;
  }
  const rootBranches: readonly RippleRootRenderBranch[] = [
    'loading-wrapper',
    'auth-layout',
    'default-layout',
    'q-layout',
    'comment-vnode',
    'text-node',
    'none',
    'unknown-element',
    'unknown',
  ];
  if (typeof candidate.rootBranch === 'string' && rootBranches.includes(candidate.rootBranch as RippleRootRenderBranch)) {
    output.rootBranch = candidate.rootBranch as RippleRootRenderBranch;
  }
  if (candidate.sourceReloadOwner === 'Ripple') output.sourceReloadOwner = 'Ripple';
  if (candidate.sourceReloadPath === 'public/index.html') output.sourceReloadPath = 'public/index.html';
  if (candidate.sourceReloadTrigger === 'script-or-link-error') output.sourceReloadTrigger = 'script-or-link-error';
  if (candidate.sourceReloadMarkerPresent === true) output.sourceReloadMarkerPresent = true;
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
  const safeReplacementTags = [
    'DIV',
    'SPAN',
    'P',
    'SECTION',
    'MAIN',
    'ASIDE',
    'HEADER',
    'FOOTER',
    'NAV',
    'UL',
    'LI',
  ];
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

  const classifyReplacementNode = (node: any): {
    replacementNodeType: BootstrapReplacementNodeType;
    replacementTag?: SafeReplacementTag;
    matchesLoadingWrapper?: boolean;
    matchesAuthLayout?: boolean;
    matchesDefaultLayout?: boolean;
    matchesQLayout?: boolean;
    rootBranch: RippleRootRenderBranch;
  } => {
    if (node === null || node === undefined) {
      return { replacementNodeType: 'none', rootBranch: 'none' };
    }
    if (node.nodeType === 8) {
      return { replacementNodeType: 'comment', rootBranch: 'comment-vnode' };
    }
    if (node.nodeType === 3) {
      return { replacementNodeType: 'text', rootBranch: 'text-node' };
    }
    if (node.nodeType !== 1) {
      return { replacementNodeType: 'unknown', rootBranch: 'unknown' };
    }
    const element = node as {
      tagName?: unknown;
      matches?: (selector: string) => boolean;
    };
    const matches = (selector: string): boolean => {
      try {
        return element.matches?.(selector) === true;
      } catch {
        return false;
      }
    };
    const matchesLoadingWrapper = matches('.loading-div');
    const matchesAuthLayout = matches('.__AuthLayout');
    const matchesDefaultLayout = matches('.q-layout-container.layout');
    const matchesQLayout = matches('.q-layout-container');
    const rawTag = typeof element.tagName === 'string' ? element.tagName.toUpperCase() : '';
    const replacementTag = safeReplacementTags.includes(rawTag)
      ? rawTag as SafeReplacementTag
      : undefined;
    let rootBranch: RippleRootRenderBranch = 'unknown-element';
    if (matchesDefaultLayout) rootBranch = 'default-layout';
    else if (matchesLoadingWrapper) rootBranch = 'loading-wrapper';
    else if (matchesAuthLayout) rootBranch = 'auth-layout';
    else if (matchesQLayout) rootBranch = 'q-layout';
    return {
      replacementNodeType: 'element',
      ...(replacementTag === undefined ? {} : { replacementTag }),
      matchesLoadingWrapper,
      matchesAuthLayout,
      matchesDefaultLayout,
      matchesQLayout,
      rootBranch,
    };
  };

  const replacementCandidate = (records: any[], parent: any, nextSibling: any, mountNode: any): any => {
    // Preferred path: find the mutation record that REMOVED the mount target;
    // the node Vue inserted in its place is that record's added node. This
    // avoids mis-picking an unrelated widget/injection from the same observed
    // batch (the root cause of POST_MOUNT_ROOT_UNKNOWN in the d840 run).
    if (mountNode !== null && mountNode !== undefined) {
      for (const record of records) {
        const removed = record?.removedNodes;
        if (removed === undefined) continue;
        let removedMount = false;
        for (let index = 0; index < removed.length; index += 1) {
          if (removed[index] === mountNode || removed[index]?.isSameNode?.(mountNode) === true) {
            removedMount = true;
            break;
          }
        }
        if (!removedMount) continue;
        const added = record?.addedNodes;
        if (added === undefined) continue;
        for (let index = 0; index < added.length; index += 1) {
          const node = added[index];
          if (node !== null && node !== undefined) return node;
        }
      }
    }
    // Fallback for records that add a node without removing the mount target
    // in the same observation batch (e.g. an in-place replacement recorded as a
    // single added-only mutation, or the observer missing the removal record).
    for (const record of records) {
      const addedNodes = record?.addedNodes;
      if (addedNodes === undefined) continue;
      for (let index = 0; index < addedNodes.length; index += 1) {
        const node = addedNodes[index];
        if (node !== null && node !== undefined) return node;
      }
    }
    // Deterministic positional fallback: the node that precedes the mount
    // target's former next sibling is the replacement.
    if (parent !== null && parent !== undefined && nextSibling !== null && nextSibling !== undefined) {
      try {
        const children = parent.childNodes;
        for (let index = 0; index < children.length; index += 1) {
          if (children[index] === nextSibling && index > 0) return children[index - 1];
        }
      } catch {
        // Fall through to an explicit unknown classification.
      }
    }
    return undefined;
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
      MutationObserver?: new (callback: (records?: any[]) => void) => { observe: (target: unknown, options: Record<string, boolean>) => void };
    };
    const document = pageWindow.document;
    let mountSeen = false;
    let mountRemoved = false;
    let mountNode: any = null;
    let shellSeen = false;
    let mountParent: any = null;
    let mountNextSibling: any = null;
    let replacementSeen = false;
    let domContentLoaded = false;
    let documentComplete = false;
    const reloadMarkerPresent = (): boolean => {
      try {
        const storage = (pageGlobal as unknown as {
          sessionStorage?: { getItem?: (key: string) => unknown };
        }).sessionStorage;
        return storage?.getItem?.('__ripple_reload__') !== null &&
          storage?.getItem?.('__ripple_reload__') !== undefined;
      } catch {
        return false;
      }
    };
    const emitReplacement = (candidate: any, canDetermineReplacement: boolean): void => {
      if (replacementSeen) return;
      replacementSeen = true;
      const replacement = candidate === undefined && !canDetermineReplacement
        ? { replacementNodeType: 'unknown' as const, rootBranch: 'unknown' as const }
        : classifyReplacementNode(candidate);
      emit({
        category: 'post-mount-structure',
        phase: 'replacement',
        elapsedMs: elapsedMs(),
        path: safePath(),
        vueInitialPatchObserved: true,
        ...replacement,
      });
    };
    const checkStructuralLifecycle = (records: any[] = [], canDetermineReplacement = false): void => {
      try {
        const mount = document?.querySelector?.('#app') as any;
        const mountPresent = mount !== null && mount !== undefined;
        if (mountPresent && !mountSeen) {
          mountSeen = true;
          mountNode = mount;
          try {
            mountParent = mount.parentNode ?? null;
            mountNextSibling = mount.nextSibling ?? null;
          } catch {
            mountParent = null;
            mountNextSibling = null;
          }
          emit({ category: 'bootstrap-target', phase: 'seen', elapsedMs: elapsedMs(), path: safePath() });
        }
        if (!mountPresent && mountSeen && !mountRemoved) {
          mountRemoved = true;
          emit({ category: 'bootstrap-target', phase: 'removed', elapsedMs: elapsedMs(), path: safePath() });
          emitReplacement(replacementCandidate(records, mountParent, mountNextSibling, mountNode), canDetermineReplacement);
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
        if (!reloadMarkerPresent()) {
          emit({
            category: 'source-reload-signal',
            phase: 'reload-trigger',
            resourceKind: tagName === 'SCRIPT' ? 'script' : 'stylesheet',
            path: safePath(),
            sourceReloadOwner: 'Ripple',
            sourceReloadPath: 'public/index.html',
            sourceReloadTrigger: 'script-or-link-error',
          });
        }
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
        const observer = new Observer((records?: any[]) => checkStructuralLifecycle(records ?? [], true));
        observer.observe(target, { childList: true, subtree: true });
      }
    } catch {
      // MutationObserver is optional; the lifecycle events remain useful.
    }

    if (reloadMarkerPresent()) {
      emit({
        category: 'source-reload-signal',
        phase: 'marker-present',
        sourceReloadOwner: 'Ripple',
        sourceReloadPath: 'public/index.html',
        sourceReloadMarkerPresent: true,
        path: safePath(),
      });
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
