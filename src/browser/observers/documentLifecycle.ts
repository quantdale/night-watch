// ---------------------------------------------------------------------------
// Nightwatch — pre-navigation main-document lifecycle observer.
//
// This observer is deliberately metadata-only. It attaches a raw CDP session
// before the caller's first navigation and records only main-frame document
// request/response/navigation metadata: sanitized origin/path, ordinal,
// status/content type, redirect presence, fixed initiator categories, and
// frame classification. It never reads headers, locations, bodies, or stack
// text beyond an optional sanitized source path supplied by CDP.
// ---------------------------------------------------------------------------

import type { CDPSession, Page } from '@playwright/test';
import type { RunRecorder } from '../../core/evidence/runRecorder';

export type DocumentInitiatorCategory =
  | 'parser'
  | 'script'
  | 'meta-refresh'
  | 'form'
  | 'history'
  | 'anchor'
  | 'reload'
  | 'client-redirect'
  | 'browser'
  | 'other'
  | 'unknown';

export interface DocumentLifecycleObserver {
  /** Number of observed HTTP(S) main-document navigations. */
  mainDocumentNavigationCount(): number;
  close(): Promise<void>;
}

interface CdpFrameTreeResponse {
  frameTree?: { frame?: { id?: string; parentId?: string } };
}

interface CdpInitiator {
  type?: string;
  stack?: {
    callFrames?: Array<{ url?: string }>;
  };
}

interface CdpRequestWillBeSent {
  requestId?: string;
  documentURL?: string;
  frameId?: string;
  type?: string;
  request?: { url?: string; method?: string };
  initiator?: CdpInitiator;
  redirectResponse?: { status?: number };
}

interface CdpResponseReceived {
  requestId?: string;
  frameId?: string;
  type?: string;
  response?: { url?: string; status?: number; mimeType?: string };
}

interface CdpLoadingFailed {
  requestId?: string;
  frameId?: string;
  type?: string;
  errorText?: string;
}

interface CdpFrameRequestedNavigation {
  frameId?: string;
  url?: string;
  reason?: string;
}

interface CdpFrameNavigated {
  frame?: { id?: string; parentId?: string; url?: string };
}

interface CdpLifecycleEvent {
  frameId?: string;
  name?: string;
}

function boundedStatus(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : null;
}

function safeLocation(recorder: RunRecorder, rawUrl: unknown): { origin: string; path: string } | null {
  if (typeof rawUrl !== 'string' || rawUrl === '') return null;
  try {
    // Authenticated URL redaction always removes query and fragment and
    // replaces opaque path identifiers. It is also safe for local tests.
    const sanitized = recorder.redaction.redactAuthenticatedUrl(rawUrl);
    const url = new URL(sanitized);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return { origin: url.origin, path: url.pathname || '/' };
  } catch {
    return null;
  }
}

function mapNavigationReason(reason: unknown): DocumentInitiatorCategory {
  switch (reason) {
    case 'scriptInitiated':
      return 'script';
    case 'metaTagRefresh':
    case 'httpHeaderRefresh':
      return 'meta-refresh';
    case 'formSubmissionGet':
    case 'formSubmissionPost':
      return 'form';
    case 'backForward':
      return 'history';
    case 'anchorClick':
    case 'linkClick':
      return 'anchor';
    case 'reload':
      return 'reload';
    case 'initialFrameNavigation':
      return 'browser';
    default:
      return 'unknown';
  }
}

function mapNetworkInitiator(initiator: CdpInitiator | undefined): DocumentInitiatorCategory {
  switch (initiator?.type) {
    case 'parser':
      return 'parser';
    case 'script':
      return 'script';
    case 'preflight':
      return 'client-redirect';
    case 'other':
      return 'other';
    default:
      return 'unknown';
  }
}

function sourcePath(recorder: RunRecorder, initiator: CdpInitiator | undefined): string | null {
  const raw = initiator?.stack?.callFrames?.find((frame) => typeof frame.url === 'string' && frame.url !== '')?.url;
  return safeLocation(recorder, raw)?.path ?? null;
}

function emitDocumentEvent(
  recorder: RunRecorder,
  data: Record<string, unknown>,
): void {
  recorder.event({
    type: 'bootstrap',
    severity: 'info',
    message: 'sanitized main-document lifecycle event',
    data: { category: 'document-lifecycle', ...data },
  });
}

/** Install CDP listeners before the first real/document fixture navigation. */
export async function installDocumentLifecycleObserver(
  page: Page,
  recorder: RunRecorder,
): Promise<DocumentLifecycleObserver> {
  const cdp: CDPSession = await page.context().newCDPSession(page);
  let closed = false;
  let mainFrameId: string | null = null;
  let ordinal = 0;
  let mainDocumentNavigationCount = 0;
  let previousDocumentLocation: { origin: string; path: string } | null = null;
  const pendingNavigationReasons: DocumentInitiatorCategory[] = [];

  try {
    const frameTree = await cdp.send('Page.getFrameTree') as CdpFrameTreeResponse;
    mainFrameId = frameTree.frameTree?.frame?.id ?? null;
  } catch {
    // The first Network event may still carry enough frame metadata. The
    // observer records an explicit unknown frame classification if it does not.
  }

  const isMainFrame = (frameId: string | undefined, parentId?: string): boolean => {
    if (frameId === undefined) return false;
    if (mainFrameId !== null) return frameId === mainFrameId;
    return parentId === undefined;
  };

  cdp.on('Page.frameRequestedNavigation', (raw: unknown) => {
    const event = raw as CdpFrameRequestedNavigation;
    if (!isMainFrame(event.frameId)) return;
    const reason = mapNavigationReason(event.reason);
    pendingNavigationReasons.push(reason);
    const location = safeLocation(recorder, event.url);
    emitDocumentEvent(recorder, {
      phase: 'navigation-requested',
      documentOrdinal: ordinal + 1,
      origin: location?.origin ?? null,
      path: location?.path ?? null,
      navigationInitiatorCategory: reason,
      frameIdClassification: 'main-frame',
    });
  });

  cdp.on('Network.requestWillBeSent', (raw: unknown) => {
    const event = raw as CdpRequestWillBeSent;
    if (event.type?.toLowerCase() !== 'document' || !isMainFrame(event.frameId)) return;
    ordinal += 1;
    mainDocumentNavigationCount += 1;
    const location = safeLocation(recorder, event.request?.url);
    const redirectStatus = boundedStatus(event.redirectResponse?.status);
    const navigationInitiatorCategory =
      pendingNavigationReasons.shift() ?? mapNetworkInitiator(event.initiator);
    if (redirectStatus !== null && ordinal > 1) {
      emitDocumentEvent(recorder, {
        phase: 'response',
        documentOrdinal: ordinal - 1,
        origin: previousDocumentLocation?.origin ?? null,
        path: previousDocumentLocation?.path ?? null,
        status: redirectStatus,
        contentType: null,
        frameIdClassification: 'main-frame',
      });
    }
    emitDocumentEvent(recorder, {
      phase: 'request',
      documentOrdinal: ordinal,
      origin: location?.origin ?? null,
      path: location?.path ?? null,
      method: event.request?.method === 'GET' ? 'GET' : 'OTHER',
      redirectChainPresent: event.redirectResponse !== undefined,
      redirectStatus,
      navigationInitiatorCategory,
      navigationInitiatorSourcePath: sourcePath(recorder, event.initiator),
      frameIdClassification: 'main-frame',
      replacesMainDocument: ordinal > 1,
      documentUrlPresent: typeof event.documentURL === 'string' && event.documentURL !== '',
    });
    previousDocumentLocation = location;
  });

  cdp.on('Network.responseReceived', (raw: unknown) => {
    const event = raw as CdpResponseReceived;
    if (event.type?.toLowerCase() !== 'document' || !isMainFrame(event.frameId)) return;
    const location = safeLocation(recorder, event.response?.url);
    emitDocumentEvent(recorder, {
      phase: 'response',
      documentOrdinal: ordinal,
      origin: location?.origin ?? null,
      path: location?.path ?? null,
      status: boundedStatus(event.response?.status),
      contentType: typeof event.response?.mimeType === 'string' ? event.response.mimeType : null,
      frameIdClassification: 'main-frame',
    });
  });

  cdp.on('Network.loadingFailed', (raw: unknown) => {
    const event = raw as CdpLoadingFailed;
    if (event.type?.toLowerCase() !== 'document' || !isMainFrame(event.frameId)) return;
    emitDocumentEvent(recorder, {
      phase: 'failure',
      documentOrdinal: ordinal,
      failureCategory: event.errorText === 'net::ERR_ABORTED' ? 'client-or-policy-abort' : 'document-load-failure',
      frameIdClassification: 'main-frame',
    });
  });

  cdp.on('Page.frameNavigated', (raw: unknown) => {
    const event = raw as CdpFrameNavigated;
    if (!isMainFrame(event.frame?.id, event.frame?.parentId)) return;
    const location = safeLocation(recorder, event.frame?.url);
    if (location === null) return;
    emitDocumentEvent(recorder, {
      phase: 'replaced',
      documentOrdinal: ordinal,
      origin: location.origin,
      path: location.path,
      frameIdClassification: 'main-frame',
      replacesMainDocument: ordinal > 1,
    });
  });

  cdp.on('Page.lifecycleEvent', (raw: unknown) => {
    const event = raw as CdpLifecycleEvent;
    if (!isMainFrame(event.frameId)) return;
    if (event.name !== 'DOMContentLoaded' && event.name !== 'load') return;
    emitDocumentEvent(recorder, {
      phase: event.name === 'DOMContentLoaded' ? 'domcontentloaded' : 'complete',
      documentOrdinal: ordinal,
      frameIdClassification: 'main-frame',
      source: 'cdp',
    });
  });

  try {
    await cdp.send('Page.enable');
    await cdp.send('Page.setLifecycleEventsEnabled', { enabled: true });
    await cdp.send('Network.enable');
  } catch {
    recorder.event({
      type: 'bootstrap',
      severity: 'warn',
      message: 'main-document lifecycle observer could not enable all CDP domains',
      data: { category: 'observer-installation-anomaly', observer: 'document-lifecycle' },
    });
  }

  return {
    mainDocumentNavigationCount: () => mainDocumentNavigationCount,
    close: async () => {
      if (closed) return;
      closed = true;
      try {
        await cdp.detach();
      } catch {
        // Context close is the authoritative cleanup path.
      }
    },
  };
}
