import { Component, useCallback, useEffect, useRef, useState, type ErrorInfo, type ReactNode } from 'react';
import { apiErrorLabel } from './api';
import type { DataLoadState, EpistemicClass, ViewId } from './types';

/**
 * Shared Control Center components and derivations.
 *
 * Extracted verbatim from App.tsx by the group 19 decomposition: the rendered
 * DOM of every view is unchanged, and the existing guards were re-pointed at
 * this module (and the per-view modules) rather than relaxing any assertion.
 */

/**
 * NW-10. One paged collection, for every bounded list view.
 *
 * Every list DTO exposes `page.nextCursor`, and every loader used to request
 * only a limit — so records past the first 20 runs, 50
 * findings/reviewer/coverage/surface entries were unreachable from the UI
 * however much data the operator had locally.
 *
 * The accumulated items replace `snapshot.items`, so the existing views
 * render the whole loaded set without changing how they read it, and only a
 * continuation control is added.
 *
 * Deduplication is by stable identity, not by position: the cursor is an
 * offset into a snapshot, so if the underlying list shifts between pages an
 * item can legitimately arrive twice, and rendering it twice would be a
 * visible untruth. A changed generation resets rather than mixes — mixing two
 * snapshots into one table is the failure this guards.
 */
export interface PagedCollection<S> {
  readonly state: DataLoadState<S>;
  readonly loadMore: () => void;
  readonly loadingMore: boolean;
  readonly pageError: boolean;
  readonly atEnd: boolean;
  /**
   * The SERVER's answer about its own bound for the last page. `atEnd` and
   * this are different facts: `atEnd` is whether the client has a cursor to
   * continue from, `truncated` is whether the server cut the page. A bounded
   * list states both rather than inferring one from the other.
   */
  readonly truncated: boolean;
  readonly pagesLoaded: number;
}

export interface PagedSnapshot<T> {
  readonly items: readonly T[];
  readonly page: { readonly nextCursor: string | null; readonly truncated?: boolean };
}

export function usePagedCollection<S extends PagedSnapshot<T>, T>(options: {
  readonly active: boolean;
  readonly refreshKey: number;
  readonly load: (cursor: string | null, signal: AbortSignal) => Promise<S>;
  readonly identity: (item: T) => string;
  /** A snapshot generation, where the DTO carries one. A change resets paging. */
  readonly generation?: (snapshot: S) => string | null;
}): PagedCollection<S> {
  const { active, refreshKey, load, identity, generation } = options;
  const [state, setState] = useState<DataLoadState<S>>({ kind: 'idle' });
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pageError, setPageError] = useState(false);
  const [pagesLoaded, setPagesLoaded] = useState(0);
  const accumulated = useRef<T[]>([]);
  const seen = useRef<Set<string>>(new Set<string>());
  const generationSeen = useRef<string | null>(null);
  const nextCursor = useRef<string | null>(null);

  // A view change or a refresh starts over. Keeping the old pages would show
  // a stale first page above a fresh second one.
  useEffect(() => {
    accumulated.current = [];
    seen.current = new Set<string>();
    generationSeen.current = null;
    nextCursor.current = null;
    setPagesLoaded(0);
    setPageError(false);
    setCursor(null);
  }, [active, refreshKey]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    // NW-11. Cleanup must ABORT the request, not merely ignore its result:
    // suppressing the state update left the transport running, so a rapid
    // navigation kept every superseded fetch alive.
    const controller = new AbortController();
    if (cursor === null) setState({ kind: 'loading' });
    else setLoadingMore(true);
    load(cursor, controller.signal)
      .then((snapshot) => {
        if (cancelled) return;
        const observed = generation === undefined ? null : generation(snapshot);
        if (cursor !== null && generationSeen.current !== null && observed !== generationSeen.current) {
          // The snapshot moved under us. Positional cursors are only
          // meaningful within one snapshot, so start the list over rather
          // than splicing two of them together.
          accumulated.current = [];
          seen.current = new Set<string>();
        }
        generationSeen.current = observed;
        for (const item of snapshot.items) {
          const id = identity(item);
          if (seen.current.has(id)) continue;
          seen.current.add(id);
          accumulated.current.push(item);
        }
        nextCursor.current = snapshot.page.nextCursor;
        setPagesLoaded((value) => value + 1);
        setPageError(false);
        setState({ kind: 'ready', data: { ...snapshot, items: [...accumulated.current] } });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        void apiErrorLabel(error);
        // A failed CONTINUATION keeps what was already loaded and reports the
        // failure; only a failed FIRST page is a view-level error.
        if (cursor === null) setState({ kind: 'error' });
        else setPageError(true);
      })
      .finally(() => {
        if (!cancelled) setLoadingMore(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [active, refreshKey, cursor, load, identity, generation]);

  const loadMore = useCallback((): void => {
    const candidate = nextCursor.current;
    if (candidate === null) return;
    setCursor(candidate);
  }, []);

  return {
    state,
    loadMore,
    loadingMore,
    pageError,
    // Read the declared field; never infer it from the cursor.
    truncated: state.kind === 'ready' && state.data.page.truncated === true,
    atEnd: state.kind === 'ready' && state.data.page.nextCursor === null,
    pagesLoaded,
  };
}

/**
 * The continuation control. It states which of the three situations the list
 * is in — more to load, everything loaded, or a failed continuation — rather
 * than leaving an operator to infer it from a button that does nothing.
 */
export function LoadMoreControl({
  label,
  loaded,
  paged,
}: {
  readonly label: string;
  readonly loaded: number;
  readonly paged: PagedCollection<PagedSnapshot<unknown>>;
}): ReactNode {
  if (paged.state.kind !== 'ready') return null;
  return (
    <div className="load-more">
      <small>{loaded} {label} loaded</small>
      {paged.atEnd ? (
        <small>All loaded.</small>
      ) : (
        <button type="button" className="table-action" disabled={paged.loadingMore} onClick={paged.loadMore}>
          {paged.loadingMore ? 'Loading…' : `Load more ${label}`}
        </button>
      )}
      {paged.truncated ? (
        <small className="row-note-warning" role="status">
          The server reported more {label} than this page returned; the page is truncated at its bound.
        </small>
      ) : null}
      {paged.pageError ? (
        <small className="review-outcome-warn" role="status">
          The next page could not be loaded. Everything above is still what the server returned.
        </small>
      ) : null}
    </div>
  );
}

interface ErrorBoundaryProps {
  readonly children: ReactNode;
}

interface ErrorBoundaryState {
  readonly hasError: boolean;
}

export class ControlCenterErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(_error: Error, _info: ErrorInfo): void {
    // Deliberately do not persist or display raw component errors.
  }

  private reset = (): void => {
    this.setState({ hasError: false });
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <main className="crash-screen" aria-labelledby="crash-title">
          <div className="crash-mark" aria-hidden="true">!</div>
          <p className="eyebrow">LOCAL UI SAFETY FALLBACK</p>
          <h1 id="crash-title">This view could not be rendered.</h1>
          <p className="muted-copy">The error was contained. No runtime details are shown in the interface.</p>
          <button className="button button-primary" type="button" onClick={this.reset}>Return to the dashboard</button>
        </main>
      );
    }
    return this.props.children;
  }
}


export function formatCategory(value: string): string {
  return value.replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\S/g, (letter: string) => letter.toUpperCase());
}

/**
 * Wire field names are camelCase. The display form separates the words so a
 * declared limit reads as `Max Graph Nodes`, not `Maxgraphnodes`.
 */
export function formatWireName(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (letter: string) => letter.toUpperCase());
}

export type StatusTone = 'ready' | 'warning' | 'blocked' | 'neutral';

export function statusTone(value: string): StatusTone {
  if (value === 'READY' || value === 'HEALTHY' || value === 'UP' || value === 'CURRENT' || value === 'PASS' || value === 'COMPLETE' || value === 'PROVEN') return 'ready';
  if (value === 'WARNING' || value === 'UNKNOWN' || value === 'UNMEASURED' || value === 'TRUNCATED' || value === 'NOT_REPORTED' || value === 'NOT_APPLICABLE' || value === 'ORACLE_ONLY' || value === 'INCOMPLETE' || value === 'STALE' || value === 'UNAVAILABLE' || value === 'SOURCE_STALE' || value === 'SOURCE_UNAVAILABLE' || value === 'HIGH' || value === 'MEDIUM') return 'warning';
  if (value.startsWith('BLOCKED') || value === 'FAILED' || value === 'FAIL' || value === 'SAFETY_FAILURE' || value === 'CRITICAL') return 'blocked';
  return 'neutral';
}

/**
 * The status-annotation protocol read by the accessibility lane.
 *
 * A status is not the tone class; it is the value the component decided to
 * render. The tone is only how that value looks. The accessibility sweep needs
 * both, so every tone carrier states its family and its value in the DOM and
 * the sweep pairs values within a family to prove they differ beyond colour.
 * `tests/browser/helpers/accessibility.ts` consumes these attributes and
 * `accessibilityCertification.browser.ts` asserts every tone carrier is
 * annotated, so a new status cannot quietly escape the check.
 */
export function statusAnnotation(family: string, value: string): Record<string, string> {
  return { 'data-status-family': family, 'data-status-value': value };
}

export function StatusPill({ value, label = formatCategory(value) }: { readonly value: string; readonly label?: string }): ReactNode {
  return <span className={`status-pill status-${statusTone(value)}`} {...statusAnnotation('status-pill', value)}><span className="status-dot" aria-hidden="true" />{label}</span>;
}

export function Icon({ name }: { readonly name: ViewId | 'refresh' | 'arrow' }): ReactNode {
  const paths: Record<string, string> = {
    overview: 'M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-16v5h6V4h-6Z',
    safety: 'M12 3 20 6v5c0 5.2-3.4 8.8-8 10-4.6-1.2-8-4.8-8-10V6l8-3Zm-1.1 11.7 5-5-1.4-1.4-3.6 3.6-1.8-1.8-1.4 1.4 3.2 3.2Z',
    runs: 'M6 3h12v3H6V3Zm-2 5h16v13H4V8Zm4 3v2h8v-2H8Zm0 4v2h5v-2H8Z',
    'execution-graph': 'M5 5h4v4H5V5Zm10 10h4v4h-4v-4ZM5 15h4v4H5v-4Zm2-6v6m2-8h6v8m0 0H9',
    campaigns: 'M4 5h16v4H4V5Zm0 7h10v4H4v-4Zm14 0h2v4h-2v-4Z',
    'source-intelligence': 'M5 4h14v16H5V4Zm3 4h8M8 12h8M8 16h5',
    findings: 'M5 4h14v16H5V4Zm3 4h8M8 12h8M8 16h5',
    'system-map': 'M12 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6ZM5 15a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm14 0a3 3 0 1 1 0 6 3 3 0 0 1 0-6ZM12 9v3m0 0-6 3m6-3 6 3',
    refresh: 'M20 11a8 8 0 0 0-14.9-4L3 9m0 0V4m0 5h5M4 13a8 8 0 0 0 14.9 4L21 15m0 0v5m0-5h-5',
    arrow: 'M5 12h13m-5-5 5 5-5 5',
  };
  return <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}

export function MetricCard({ label, value, detail, tone = 'neutral' }: { readonly label: string; readonly value: string; readonly detail: string; readonly tone?: StatusTone }): ReactNode {
  return (
    <article className="metric-card" {...statusAnnotation('metric-card-tone', tone)}>
      <div className="metric-label">{label}</div>
      <div className={`metric-value text-${tone}`}>{value}</div>
      <div className="metric-detail">{detail}</div>
    </article>
  );
}

export function DataRow({ label, value, tone }: { readonly label: string; readonly value: string; readonly tone?: StatusTone }): ReactNode {
  return <div className="data-row" {...(tone ? statusAnnotation('data-row-tone', tone) : {})}><span>{label}</span><strong className={tone ? `text-${tone}` : undefined}>{value}</strong></div>;
}

export function LoadingState(): ReactNode {
  return <div className="state-panel" role="status" aria-live="polite"><span className="loader" aria-hidden="true" /><div><strong>Loading local snapshots</strong><p>Reading bounded Control Center contracts from the loopback service.</p></div></div>;
}

export function ErrorState({ onRetry }: { readonly onRetry: () => void }): ReactNode {
  return (
    <div className="state-panel state-panel-error" role="alert">
      <div className="state-icon" aria-hidden="true">!</div>
      <div><strong>Snapshot unavailable</strong><p>The overview could not be refreshed. No raw service error is displayed.</p><button className="button button-secondary" type="button" onClick={onRetry}>Try again</button></div>
    </div>
  );
}

/**
 * The readiness contract in full.
 *
 * The Overview summarised readiness in seven rows and dropped the rest of the
 * contract on the floor: which targets are stale or unavailable, which
 * campaign keys drifted, whether the analyzer version the run pinned is the
 * one it observed, which verification dimensions were deferred versus never
 * measured at all, the detail code on each unresolved blocker, and how the
 * external CI result is CLASSIFIED rather than merely named. Each of those is
 * a reason a "READY" badge might not mean what a reader assumes, so each is
 * shown here rather than summarised away.
 */

export const EPISTEMIC_COPY: Record<EpistemicClass, { readonly label: string; readonly tone: StatusTone; readonly meaning: string }> = {
  FACT: { label: 'FACT', tone: 'ready', meaning: 'Mechanically derived from recorded evidence.' },
  RECOMMENDATION: { label: 'RECOMMENDATION', tone: 'warning', meaning: 'Advisory. A human makes the call.' },
  UNKNOWN: { label: 'UNKNOWN', tone: 'neutral', meaning: 'Not determined. This is not a weak yes.' },
};

export function EpistemicBadge({ epistemicClass }: { readonly epistemicClass: EpistemicClass }): ReactNode {
  const copy = EPISTEMIC_COPY[epistemicClass];
  return <span className={`status-pill status-${copy.tone}`} title={copy.meaning} {...statusAnnotation('status-pill', epistemicClass)}><span className="status-dot" aria-hidden="true" />{copy.label}</span>;
}


export interface LayoutGraph {
  readonly nodes: readonly { readonly nodeId: string }[];
  readonly edges: readonly { readonly fromNodeId: string; readonly toNodeId: string }[];
}

export function layerAssignment(graph: LayoutGraph): Map<string, number> {
  const known = new Set(graph.nodes.map((node) => node.nodeId));
  const indegree = new Map<string, number>();
  const outgoing = new Map<string, string[]>();
  for (const node of graph.nodes) indegree.set(node.nodeId, 0);
  for (const edge of graph.edges) {
    if (!known.has(edge.fromNodeId) || !known.has(edge.toNodeId)) continue;
    outgoing.set(edge.fromNodeId, [...(outgoing.get(edge.fromNodeId) ?? []), edge.toNodeId]);
    indegree.set(edge.toNodeId, (indegree.get(edge.toNodeId) ?? 0) + 1);
  }
  const layer = new Map<string, number>();
  for (const node of graph.nodes) layer.set(node.nodeId, 0);
  const ready = graph.nodes.filter((node) => (indegree.get(node.nodeId) ?? 0) === 0).map((node) => node.nodeId).sort();
  const remaining = new Map(indegree);
  let guard = 0;
  while (ready.length > 0 && guard <= graph.nodes.length) {
    ready.sort();
    const current = ready.shift() as string;
    guard += 1;
    for (const target of [...(outgoing.get(current) ?? [])].sort()) {
      const candidate = Math.min((layer.get(current) ?? 0) + 1, 63);
      if (candidate > (layer.get(target) ?? 0)) layer.set(target, candidate);
      const left = (remaining.get(target) ?? 0) - 1;
      remaining.set(target, left);
      if (left === 0) ready.push(target);
    }
  }
  return layer;
}


export function formatTimestamp(value: string | null): string {
  if (value === null) return 'Not recorded';
  return value.slice(0, 16).replace('T', ' ');
}


export function DataErrorState({ title, onRetry }: { readonly title: string; readonly onRetry: () => void }): ReactNode {
  return <div className="state-panel state-panel-error" role="alert"><div className="state-icon" aria-hidden="true">!</div><div><strong>{title}</strong><p>No raw service error is displayed. Retry performs another bounded GET snapshot.</p><button className="button button-secondary" type="button" onClick={onRetry}>Try again</button></div></div>;
}


export function CodeChips({ label, codes, tone }: { readonly label: string; readonly codes: readonly string[]; readonly tone: StatusTone }): ReactNode {
  return <div className="code-chip-row"><span className="code-chip-label">{label}</span>{codes.length === 0
    ? <span className="code-chip code-chip-empty" {...statusAnnotation('code-chip', 'empty')}>None reported</span>
    : codes.map((code) => <span key={code} className={`code-chip code-chip-${tone}`} {...statusAnnotation('code-chip', tone)}>{code}</span>)}</div>;
}

export function Guardrail({ label, value }: { readonly label: string; readonly value: string }): ReactNode {
  const tone = value === 'NONE' || value === 'DISABLED' || value === 'READ_ONLY' || value === 'LOOPBACK_ONLY_EXTERNAL_EGRESS_DISABLED' ? 'ready' : 'neutral';
  return <div className="guardrail-row"><span className="guardrail-check" aria-hidden="true">✓</span><span>{label}</span><strong className={`text-${tone}`} {...statusAnnotation('guardrail-tone', tone)}>{formatCategory(value)}</strong></div>;
}
