import { Component, useCallback, useEffect, useRef, useState, type ErrorInfo, type KeyboardEvent, type ReactNode } from 'react';
import { apiErrorLabel, loadCampaignCoverage, loadCampaignSummary, loadExecutionGraph, loadFindings, loadOverview, loadReviewer, loadRunDetail, loadRuns, loadSourceGraph, loadSourceSurfaces, loadSystemMapLevel, loadSystemMapQuery, loadTimeline, subscribeToControlCenterEvents, readBackReviewDecision,
  submitReviewDecision, REVIEW_DECISIONS, type ReviewDecision } from './api';
import type { CampaignCoverageSnapshot, CampaignSummarySnapshot, DataLoadState, EpistemicClass, ExecutionGraphSnapshot, FindingsSnapshot, OverviewLoadState, OverviewSnapshot, ReadinessSnapshot, ReviewerElement, ReviewerFindingSnapshot, ReviewerSnapshot, RunDetailSnapshot, RunListSnapshot, SourceGraphSnapshot, SourceSurfaceSnapshot, SourceSurfacesSnapshot, SystemMapBound, SystemMapLevelSegment, SystemMapNodeView, SystemMapQuerySegment, SystemMapSnapshot, TimelineSnapshot, ViewId } from './types';
import { SYSTEM_MAP_QUERY_SEGMENTS, VIEW_DEFINITIONS } from './types';

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
interface PagedCollection<S> {
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

interface PagedSnapshot<T> {
  readonly items: readonly T[];
  readonly page: { readonly nextCursor: string | null; readonly truncated?: boolean };
}

function usePagedCollection<S extends PagedSnapshot<T>, T>(options: {
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
function LoadMoreControl({
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

function readViewFromHash(): ViewId {
  if (typeof window === 'undefined') return 'overview';
  const candidate = window.location.hash.slice(1);
  return VIEW_DEFINITIONS.some((view) => view.id === candidate) ? (candidate as ViewId) : 'overview';
}

function formatCategory(value: string): string {
  return value.replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\S/g, (letter: string) => letter.toUpperCase());
}

/**
 * Wire field names are camelCase. The display form separates the words so a
 * declared limit reads as `Max Graph Nodes`, not `Maxgraphnodes`.
 */
function formatWireName(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (letter: string) => letter.toUpperCase());
}

type StatusTone = 'ready' | 'warning' | 'blocked' | 'neutral';

function statusTone(value: string): StatusTone {
  if (value === 'READY' || value === 'HEALTHY' || value === 'UP' || value === 'CURRENT' || value === 'PASS' || value === 'COMPLETE' || value === 'PROVEN') return 'ready';
  if (value === 'WARNING' || value === 'UNKNOWN' || value === 'UNMEASURED' || value === 'TRUNCATED' || value === 'NOT_REPORTED' || value === 'NOT_APPLICABLE' || value === 'ORACLE_ONLY' || value === 'INCOMPLETE' || value === 'STALE' || value === 'UNAVAILABLE' || value === 'SOURCE_STALE' || value === 'SOURCE_UNAVAILABLE' || value === 'HIGH' || value === 'MEDIUM') return 'warning';
  if (value.startsWith('BLOCKED') || value === 'FAILED' || value === 'FAIL' || value === 'SAFETY_FAILURE' || value === 'CRITICAL') return 'blocked';
  return 'neutral';
}

function StatusPill({ value, label = formatCategory(value) }: { readonly value: string; readonly label?: string }): ReactNode {
  return <span className={`status-pill status-${statusTone(value)}`}><span className="status-dot" aria-hidden="true" />{label}</span>;
}

function Icon({ name }: { readonly name: ViewId | 'refresh' | 'arrow' }): ReactNode {
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

function MetricCard({ label, value, detail, tone = 'neutral' }: { readonly label: string; readonly value: string; readonly detail: string; readonly tone?: StatusTone }): ReactNode {
  return (
    <article className="metric-card">
      <div className="metric-label">{label}</div>
      <div className={`metric-value text-${tone}`}>{value}</div>
      <div className="metric-detail">{detail}</div>
    </article>
  );
}

function DataRow({ label, value, tone }: { readonly label: string; readonly value: string; readonly tone?: StatusTone }): ReactNode {
  return <div className="data-row"><span>{label}</span><strong className={tone ? `text-${tone}` : undefined}>{value}</strong></div>;
}

function LoadingState(): ReactNode {
  return <div className="state-panel" role="status" aria-live="polite"><span className="loader" aria-hidden="true" /><div><strong>Loading local snapshots</strong><p>Reading bounded Control Center contracts from the loopback service.</p></div></div>;
}

function ErrorState({ onRetry }: { readonly onRetry: () => void }): ReactNode {
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
function ReadinessDetailPanel({ readiness }: { readonly readiness: ReadinessSnapshot }): ReactNode {
  const currentness = Object.entries(readiness.sourceContracts.currentnessCounts);
  const analyzer = readiness.analyzer;
  const verification = readiness.verification;
  const versionLabel = analyzer.versionConsistent === null ? 'Not determined' : analyzer.versionConsistent ? 'Consistent' : 'Inconsistent';
  return <article className="panel panel-full">
    <div className="panel-heading"><div><p className="eyebrow">READINESS DETAIL</p><h2>Everything the readiness contract states</h2></div><StatusPill value={readiness.applies ? readiness.state : 'NOT_APPLICABLE'} label={readiness.applies ? formatCategory(readiness.state) : 'Does not apply'} /></div>
    <p className="panel-intro">A readiness state is only as strong as what it was measured over. These are the measurements behind it, including the ones that came back unmeasured.</p>

    <div className="timeline-heading"><p className="eyebrow">SOURCE CONTRACT TARGETS</p><span>Approved targets and how many still have an active family.</span></div>
    <div className="data-grid">
      <DataRow label="Approved targets" value={String(readiness.sourceContracts.approvedTargets)} />
      <DataRow label="With active family" value={String(readiness.sourceContracts.targetsWithActiveFamily)} tone={readiness.sourceContracts.targetsWithActiveFamily < readiness.sourceContracts.approvedTargets ? 'warning' : 'neutral'} />
      {currentness.map(([key, count]) => <DataRow key={key} label={formatCategory(key)} value={String(count)} tone={statusTone(key.toUpperCase())} />)}
    </div>
    <CodeChips label="Stale targets" codes={readiness.sourceContracts.staleTargets} tone="warning" />
    <CodeChips label="Unavailable" codes={readiness.sourceContracts.unavailableTargets} tone="warning" />

    <div className="timeline-heading"><p className="eyebrow">CAMPAIGN KEYS</p><span>Compared against the recorded campaign, and where the two disagree.</span></div>
    <CodeChips label="Compared" codes={readiness.campaign.comparedKeys} tone="neutral" />
    <CodeChips label="Drifted" codes={readiness.campaign.driftKeys} tone="blocked" />
    {readiness.campaign.unmeasured ? <div className="callout callout-warning"><strong>Campaign comparison is unmeasured</strong><span>No drift was found because none was looked for. That is not agreement.</span></div> : null}

    <div className="timeline-heading"><p className="eyebrow">ANALYZER</p><span>The version this readiness was pinned to, against the one actually observed.</span></div>
    <div className="data-grid">
      <DataRow label="Availability" value={formatCategory(analyzer.availability)} tone={statusTone(analyzer.availability)} />
      <DataRow label="Pinned version" value={analyzer.pinnedVersion} />
      <DataRow label="Observed version" value={analyzer.observedVersion ?? 'Not observed'} tone={analyzer.observedVersion === null ? 'warning' : 'neutral'} />
      <DataRow label="Version agreement" value={versionLabel} tone={analyzer.versionConsistent === true ? 'ready' : 'warning'} />
      <DataRow label="Analyzer blocked" value={analyzer.blocked ? 'Yes' : 'No'} tone={analyzer.blocked ? 'blocked' : 'neutral'} />
    </div>

    <div className="timeline-heading"><p className="eyebrow">VERIFICATION DIMENSIONS</p><span>Deferred is a decision. Not measured is a hole. They are listed separately.</span></div>
    <CodeChips label="Deferred" codes={verification.deferredDimensions} tone="warning" />
    <CodeChips label="Not measured" codes={verification.notMeasuredDimensions} tone="blocked" />
    {verification.allDeferredToHardening ? <div className="callout callout-warning"><strong>Every dimension is deferred to hardening</strong><span>Nothing in this set was verified here. The readiness state above rests on the deferral, not on a measurement.</span></div> : null}

    <div className="timeline-heading"><p className="eyebrow">UNRESOLVED BLOCKERS</p><span>Named with their kind and detail code, not counted.</span></div>
    {readiness.unresolvedBlockers.length === 0
      ? <div className="mini-state">No unresolved blockers reported. Absence of blockers is not a proof of pass.</div>
      : <div className="table-scroll"><table><thead><tr><th scope="col">Code</th><th scope="col">Kind</th><th scope="col">Detail</th></tr></thead><tbody>{readiness.unresolvedBlockers.map((blocker) => <tr key={`${blocker.code}:${blocker.kind}`}><td><strong>{formatCategory(blocker.code)}</strong><small>{blocker.code}</small></td><td>{formatCategory(blocker.kind)}</td><td>{blocker.detailCode === null ? 'No detail code' : formatCategory(blocker.detailCode)}</td></tr>)}</tbody></table></div>}

    <div className="timeline-heading"><p className="eyebrow">EXTERNAL CI AND OWNER SCOPE</p><span>How the external result is classified, and how wide the freeze reaches.</span></div>
    <div className="data-grid">
      <DataRow label="External CI" value={formatCategory(readiness.externalCi)} tone={statusTone(readiness.externalCi)} />
      <DataRow label="CI classification" value={formatCategory(readiness.externalCiClassification)} tone={statusTone(readiness.externalCiClassification)} />
      <DataRow label="Frozen operations" value={String(readiness.ownerScope.frozenOperationCount)} />
      <DataRow label="Owner scope status" value={formatCategory(readiness.ownerScope.status)} tone="warning" />
      <DataRow label="Owner scope reason" value={formatCategory(readiness.ownerScope.reason)} tone="warning" />
      <DataRow label="Matches frozen markers" value={readiness.ownerScope.matchesFrozenMarkers ? 'Yes' : 'No'} tone={readiness.ownerScope.matchesFrozenMarkers ? 'ready' : 'warning'} />
    </div>
    {readiness.ownerScope.matchesFrozenMarkers ? null : <div className="callout callout-warning"><strong>The frozen markers do not match</strong><span>The owner scope recorded in this snapshot disagrees with the markers it was checked against. Treat the scope boundary as unconfirmed.</span></div>}
  </article>;
}

function OverviewView({ data, onRefresh }: { readonly data: OverviewSnapshot; readonly onRefresh: () => void }): ReactNode {
  const readinessTone = statusTone(data.readiness.state);
  const safetyTone = statusTone(data.safety.state);
  const checksLabel = data.safety.checks.length === 0 ? 'No checks reported' : `${data.safety.checks.length} checks reported`;
  return (
    <div className="view-stack">
      <section className="hero-card" aria-labelledby="overview-title">
        <div className="hero-copy">
          <p className="eyebrow">LOCAL INTELLIGENCE / OVERVIEW</p>
          <h1 id="overview-title">Know the posture before the next run.</h1>
          <p className="hero-description">A quiet, read-only window into Nightwatch readiness, safety, and campaign evidence. Every value below comes from a bounded local snapshot.</p>
          <div className="hero-actions"><StatusPill value={data.health.scope} label="Loopback only" /><StatusPill value={data.health.readOnly && data.meta.readOnly ? 'READY' : 'BLOCKED'} label={data.health.readOnly && data.meta.readOnly ? 'Read only' : 'Unavailable'} /><button className="button button-quiet" type="button" onClick={onRefresh}><Icon name="refresh" />Refresh</button></div>
        </div>
        <div className="hero-orbit" aria-hidden="true"><div className="orbit-ring" /><div className="orbit-ring orbit-ring-inner" /><div className="orbit-core"><span>NW</span><small>LOCAL</small></div></div>
      </section>

      <section className="metric-grid" aria-label="Overview metrics">
        <MetricCard label="Readiness" value={formatCategory(data.readiness.state)} detail={formatCategory(data.readiness.category)} tone={readinessTone} />
        <MetricCard label="Safety posture" value={formatCategory(data.safety.state)} detail={checksLabel} tone={safetyTone} />
        <MetricCard label="Contract families" value={String(data.readiness.sourceContracts.activeFamilies)} detail={`${data.readiness.sourceContracts.totalFamilies} total / ${data.readiness.sourceContracts.archivedFamilies} archived`} tone="neutral" />
        <MetricCard label="External contact" value="Disabled" detail="Product, network, and publication" tone="ready" />
      </section>

      <section className="content-grid">
        <article className="panel panel-wide">
          <div className="panel-heading"><div><p className="eyebrow">READINESS SIGNAL</p><h2>Local synthetic readiness</h2></div><StatusPill value={data.readiness.state} /></div>
          <p className="panel-intro">The readiness claim is intentionally scoped to local synthetic contracts. It does not imply DEV, NEXT, or production validation.</p>
          <div className="data-grid">
            <DataRow label="Scope" value={formatCategory(data.readiness.scope)} />
            <DataRow label="Ready claim" value={formatCategory(data.readiness.readyClaim)} />
            <DataRow label="Checkpoint" value={formatCategory(data.readiness.checkpointCompatibility)} />
            <DataRow label="Analyzer" value={formatCategory(data.readiness.analyzer.availability)} />
            <DataRow label="External CI" value={formatCategory(data.readiness.externalCi)} tone={statusTone(data.readiness.externalCi)} />
            <DataRow label="Campaign" value={formatCategory(data.readiness.campaign.category)} tone={data.readiness.campaign.unmeasured ? 'warning' : 'neutral'} />
            <DataRow label="Source inventory" value={formatCategory(data.source.state)} tone={statusTone(data.source.state)} />
          </div>
          {data.readiness.unresolvedBlockers.length > 0 ? <div className="callout callout-warning"><strong>{data.readiness.unresolvedBlockers.length} unresolved blocker(s)</strong><span>Inspect the readiness contract before treating any view as ready.</span></div> : <div className="callout"><strong>No unresolved blockers reported</strong><span>Absence of blockers is not a proof of product pass.</span></div>}
        </article>

        <article className="panel">
          <div className="panel-heading"><div><p className="eyebrow">SAFETY CENTER</p><h2>Guardrails</h2></div><StatusPill value={data.safety.state} /></div>
          <div className="guardrail-list">
            <Guardrail label="Control Center" value={data.safety.operationPolicy.controlCenter} />
            <Guardrail label="Execution" value={data.safety.operationPolicy.execution} />
            <Guardrail label="Mutation" value={data.safety.operationPolicy.mutation} />
            <Guardrail label="Raw evidence" value={data.safety.rawEvidenceExposure} />
            <Guardrail label="External egress" value={data.safety.networkPosture} />
          </div>
          <div className="panel-footer"><span>Continuity</span><StatusPill value={data.safety.continuity.state} /></div>
        </article>

        <article className="panel">
          <div className="panel-heading"><div><p className="eyebrow">OWNER SCOPE</p><h2>Frozen boundaries</h2></div><span className="scope-lock">LOCKED</span></div>
          <p className="panel-intro">Infrastructure and data-layer operations remain outside this campaign’s authority.</p>
          <div className="scope-list"><span>Product contact</span><strong>Disabled</strong><span>Database / infrastructure</span><strong>Out of scope</strong><span>Findings storage</span><strong>Owner local only</strong></div>
        </article>

        <ReadinessDetailPanel readiness={data.readiness} />
      </section>
    </div>
  );
}

/** Every execution state the contract defines, as filter options. The list is
 *  explicit so a state the server can send always has a way to be selected. */
const EXECUTION_STATE_FILTERS = ['PENDING', 'RUNNING', 'PASSED', 'WARNING', 'FAILED', 'BLOCKED', 'SKIPPED', 'INCOMPLETE'] as const;

function formatTimestamp(value: string | null): string {
  if (value === null) return 'Not recorded';
  return value.slice(0, 16).replace('T', ' ');
}

function RunStatusSummary({ items }: { readonly items: readonly { readonly status: string }[] }): ReactNode {
  const statuses = ['PASSED', 'ORACLE_ONLY', 'SAFETY_FAILURE', 'FAILED', 'BLOCKED', 'INCOMPLETE', 'RUNNING'] as const;
  return <div className="run-status-summary" aria-label="Run status summary">{statuses.map((status) => { const count = items.filter((item) => item.status === status).length; return <div key={status} className="run-status-item"><StatusPill value={status} /><strong>{count}</strong></div>; })}</div>;
}

function DataErrorState({ title, onRetry }: { readonly title: string; readonly onRetry: () => void }): ReactNode {
  return <div className="state-panel state-panel-error" role="alert"><div className="state-icon" aria-hidden="true">!</div><div><strong>{title}</strong><p>No raw service error is displayed. Retry performs another bounded GET snapshot.</p><button className="button button-secondary" type="button" onClick={onRetry}>Try again</button></div></div>;
}

function TimelinePanel({ runId, state }: { readonly runId: string | null; readonly state: DataLoadState<TimelineSnapshot> }): ReactNode {
  if (state.kind === 'loading') return <div className="mini-state" role="status">Loading timeline…</div>;
  if (state.kind === 'error') return <div className="mini-state mini-state-warning">Timeline unavailable</div>;
  if (state.kind !== 'ready' || state.data.events.length === 0) return <div className="mini-state">No timeline events reported. Empty does not imply pass.</div>;
  return <>
    {runId !== null && state.data.runId !== runId ? <div className="callout callout-warning"><strong>Timeline identity mismatch</strong><span>The timeline payload names {state.data.runId} while the selected run is {runId}. Identity is surfaced, never assumed.</span></div> : null}
    <ol className="timeline-list">{state.data.events.map((event) => <li key={event.seq} className="timeline-item"><span className="timeline-seq">{event.seq}</span><div><div className="timeline-meta"><StatusPill value={event.severity} label={event.severity} /><span>{formatTimestamp(event.timestamp)}</span><span>{formatCategory(event.eventType)}</span></div><strong>{formatCategory(event.messageCode)}</strong><small>{event.dataCodes.length === 0 ? 'No additional data codes' : `data codes: ${event.dataCodes.join(', ')}`}</small></div></li>)}</ol>
    {/* The timeline request is a single bounded page. `truncated` says the run
        has more events than this page holds, and an untold cut reads exactly
        like a short run — so it is stated. */}
    {state.data.truncated
      ? <div className="callout callout-warning"><strong>This timeline is truncated</strong><span>{state.data.events.length} event(s) shown from a bounded page{state.data.nextAfterSeq === null ? '' : `; the run continues after sequence ${state.data.nextAfterSeq}`}. The events not listed are absent from this page, not from the run.</span></div>
      : <div className="mini-state">{state.data.events.length} event(s); the run reported no further events after this page.</div>}
  </>;
}

function CodeChips({ label, codes, tone }: { readonly label: string; readonly codes: readonly string[]; readonly tone: StatusTone }): ReactNode {
  return <div className="code-chip-row"><span className="code-chip-label">{label}</span>{codes.length === 0
    ? <span className="code-chip code-chip-empty">None reported</span>
    : codes.map((code) => <span key={code} className={`code-chip code-chip-${tone}`}>{code}</span>)}</div>;
}

function RunDetailPanel({ runId, detailState, timelineState, onRetry }: { readonly runId: string | null; readonly detailState: DataLoadState<RunDetailSnapshot>; readonly timelineState: DataLoadState<TimelineSnapshot>; readonly onRetry: () => void }): ReactNode {
  if (runId === null) return <article className="panel run-detail-empty"><p className="eyebrow">RUN DETAIL</p><h2>Select a run to inspect</h2><p className="panel-intro">Run detail, timeline, and graph requests resolve only against a selected safe run identifier.</p></article>;
  if (detailState.kind === 'loading') return <article className="panel"><LoadingState /></article>;
  if (detailState.kind === 'error') return <article className="panel"><DataErrorState title="Run detail unavailable" onRetry={onRetry} /></article>;
  if (detailState.kind !== 'ready') return null;
  const detail = detailState.data;
  return <article className="panel run-detail-panel">
    <div className="panel-heading"><div><p className="eyebrow">RUN DETAIL / {detail.run.runId}</p><h2>{detail.run.scenario ?? 'Unnamed scenario'}</h2></div><StatusPill value={detail.run.status} /></div>
    <div className="data-grid"><DataRow label="Environment" value={formatCategory(detail.run.environment)} /><DataRow label="Product" value={detail.run.product ?? 'Not reported'} /><DataRow label="Started" value={formatTimestamp(detail.run.startedAt)} /><DataRow label="Ended" value={formatTimestamp(detail.run.endedAt)} /><DataRow label="Duration" value={detail.run.durationMs === null ? 'Not recorded' : `${detail.run.durationMs} ms`} /><DataRow label="Browser" value={detail.run.browser ?? 'Not reported'} /><DataRow label="Hard failures" value={String(detail.run.hardFailureCount)} tone={detail.run.hardFailureCount > 0 ? 'blocked' : 'neutral'} /><DataRow label="Events" value={String(detail.run.eventCount)} /><DataRow label="Findings" value={String(detail.run.oracleFindingCount)} tone={detail.run.oracleFindingCount > 0 ? 'warning' : 'neutral'} /><DataRow label="Screenshots" value={String(detail.screenshotCount)} /><DataRow label="Nightwatch SHA" value={detail.run.nightwatchSha === null ? 'Not reported' : `${detail.run.nightwatchSha.slice(0, 12)}…`} /></div>

    {/* The run-detail contract carries repository provenance, per-type and
        per-severity event censuses, hard-failure codes and note codes. Every
        one of them was fetched and then dropped before render, which made the
        panel quieter than the evidence it was reading. */}
    <div className="timeline-heading"><p className="eyebrow">CODES</p><span>Bounded categories from the run record. No message body is ever shown.</span></div>
    <CodeChips label="Hard failures" codes={detail.hardFailureCodes} tone="blocked" />
    <CodeChips label="Notes" codes={detail.noteCodes} tone="warning" />

    <div className="timeline-heading"><p className="eyebrow">EVENT CENSUS</p><span>Counts only; the timeline below carries the order.</span></div>
    {detail.countsByEventType.length === 0 && detail.countsBySeverity.length === 0
      ? <div className="mini-state">No event census reported. Empty does not imply pass.</div>
      : <div className="census-columns">
          <div><h3 className="census-heading">By event type</h3>{detail.countsByEventType.length === 0 ? <div className="mini-state">Not reported</div> : <div className="data-grid">{detail.countsByEventType.map((entry) => <DataRow key={entry.eventType} label={formatCategory(entry.eventType)} value={String(entry.count)} />)}</div>}</div>
          <div><h3 className="census-heading">By severity</h3>{detail.countsBySeverity.length === 0 ? <div className="mini-state">Not reported</div> : <div className="data-grid">{detail.countsBySeverity.map((entry) => <DataRow key={entry.severity} label={formatCategory(entry.severity)} value={String(entry.count)} tone={statusTone(entry.severity.toUpperCase())} />)}</div>}</div>
        </div>}

    <div className="timeline-heading"><p className="eyebrow">REPOSITORY PROVENANCE</p><span>What the run was measured against. A dirty tree bounds every claim made from it.</span></div>
    {detail.repositories.length === 0
      ? <div className="mini-state mini-state-warning">No repository provenance recorded. Without it, this run anchors to no revision.</div>
      : <div className="table-scroll"><table><thead><tr><th scope="col">Repository</th><th scope="col">Branch</th><th scope="col">Head</th><th scope="col">State</th><th scope="col">Working tree</th></tr></thead><tbody>{detail.repositories.map((repository) => <tr key={repository.repositoryId}><td><strong>{repository.repositoryId}</strong></td><td>{repository.branch ?? 'Not reported'}</td><td>{repository.headSha === null ? 'Not reported' : `${repository.headSha.slice(0, 12)}…`}</td><td><StatusPill value={repository.state} /></td><td>{repository.dirty ? <StatusPill value="WARNING" label={`Dirty · ${repository.dirtyFileCount} file(s)`} /> : <StatusPill value="READY" label="Clean" />}</td></tr>)}</tbody></table></div>}

    <div className="timeline-heading"><p className="eyebrow">ORDERED TIMELINE</p><span>Sequence is authoritative; message bodies are never shown.</span></div>
    <TimelinePanel runId={runId} state={timelineState} />
  </article>;
}

function RunsView({ state, selectedRunId, detailState, timelineState, onSelectRun, onRetry }: { readonly state: DataLoadState<RunListSnapshot>; readonly selectedRunId: string | null; readonly detailState: DataLoadState<RunDetailSnapshot>; readonly timelineState: DataLoadState<TimelineSnapshot>; readonly onSelectRun: (runId: string) => void; readonly onRetry: () => void }): ReactNode {
  if (state.kind === 'loading') return <LoadingState />;
  if (state.kind === 'error') return <DataErrorState title="Run list unavailable" onRetry={onRetry} />;
  if (state.kind !== 'ready') return null;
  const items = state.data.items;
  return <div className="view-stack"><section className="page-intro"><div><p className="eyebrow">EVIDENCE / RUNS</p><h1>Inspect what happened, in order.</h1><p>Run records are read-only projections. Statuses distinguish pass, oracle-only, safety failure, blocked, incomplete, and unavailable evidence.</p></div><StatusPill value={items.length === 0 ? 'UNAVAILABLE' : 'READY'} label={items.length === 0 ? 'No runs reported' : `${items.length} run(s)`} /></section><RunStatusSummary items={items} />{items.length === 0 ? <article className="panel empty-table"><div className="empty-mark"><Icon name="runs" /></div><h2>No local runs recorded</h2><p>The local run store returned an empty bounded page. This is not a pass claim.</p></article> : <article className="panel"><div className="panel-heading"><div><p className="eyebrow">RUN INDEX</p><h2>Recent local records</h2></div><span className="table-limit">Limit {state.data.page.limit}</span></div><div className="table-scroll"><table><thead><tr><th scope="col">Scenario</th><th scope="col">Status</th><th scope="col">Environment</th><th scope="col">Started</th><th scope="col">Signals</th><th scope="col"><span className="sr-only">Open</span></th></tr></thead><tbody>{items.map((run) => <tr key={run.runId} className={selectedRunId === run.runId ? 'row-selected' : undefined}><td><strong>{run.scenario ?? 'Unnamed scenario'}</strong><small>{run.runId} · {run.browser ?? 'browser not reported'}</small><small>{run.product ?? 'product not reported'}{run.nightwatchSha === null ? '' : ` · ${run.nightwatchSha.slice(0, 12)}…`}</small></td><td><StatusPill value={run.status} /></td><td>{formatCategory(run.environment)}</td><td><span>{formatTimestamp(run.startedAt)}</span><small>ended {formatTimestamp(run.endedAt)}</small></td><td><span>{run.eventCount} events</span><small>{run.oracleFindingCount} findings · {run.hardFailureCount} hard failure(s) · {run.durationMs === null ? 'duration not recorded' : `${run.durationMs} ms`}</small></td><td><button className="table-action" type="button" onClick={() => onSelectRun(run.runId)}>Inspect <Icon name="arrow" /></button></td></tr>)}</tbody></table></div></article>}<RunDetailPanel runId={selectedRunId} detailState={detailState} timelineState={timelineState} onRetry={onRetry} /></div>;
}

/**
 * The execution graph canvas.
 *
 * This carries the same correction C-15b made to the source graph. The
 * previous canvas drew `nodes.slice(0, 24)` and `edges.slice(0, 48)` on a
 * fixed three-column grid while the execution-graph contract permits 250
 * nodes and 500 edges by default and 1,000 / 2,000 at the maximum, and its
 * footer read `{graph.edges.length} edges` and `Complete` — so a projection
 * the client had cut by an order of magnitude claimed, in the UI, to be whole.
 * `truncated` answers whether the SERVER reached its bound; it never spoke for
 * a slice the client applied afterwards.
 *
 * What this draws instead: every node and every edge the server sent, on the
 * same deterministic layered layout the source graph uses, with pan, zoom,
 * search, an execution-state filter, selection, and disclosure of both server
 * truncation and any edge whose endpoint is outside the projection. Layer and
 * within-layer order come from the node identifier, so the same snapshot
 * always draws the same picture.
 */
function GraphCanvas({ graph }: { readonly graph: ExecutionGraphSnapshot }): ReactNode {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState<string>('ALL');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Search is local UI data: bounded, lower-cased, and used only for substring
  // matching. No regular expression is built from operator input.
  const needle = search.slice(0, 120).toLowerCase();
  const matches = (node: ExecutionGraphSnapshot['nodes'][number]): boolean => {
    if (stateFilter !== 'ALL' && node.state !== stateFilter) return false;
    if (needle.length === 0) return true;
    return `${node.label ?? ''} ${node.nodeId} ${node.kind}`.toLowerCase().includes(needle);
  };

  const layers = layerAssignment(graph);
  const ordered = [...graph.nodes].sort((left, right) => left.nodeId.localeCompare(right.nodeId));
  const byLayer = new Map<number, string[]>();
  for (const node of ordered) {
    const index = layers.get(node.nodeId) ?? 0;
    byLayer.set(index, [...(byLayer.get(index) ?? []), node.nodeId]);
  }
  const position = new Map<string, { x: number; y: number }>();
  let widest = 0;
  for (const [layerIndex, members] of [...byLayer.entries()].sort((left, right) => left[0] - right[0])) {
    members.forEach((nodeId, order) => {
      position.set(nodeId, { x: layerIndex * 264, y: order * 64 });
      widest = Math.max(widest, order * 64);
    });
  }
  const contentWidth = Math.max(820, ([...byLayer.keys()].length) * 264 + 168);
  const contentHeight = Math.max(190, widest + 64);
  const visible = graph.nodes.filter(matches);
  const visibleIds = new Set(visible.map((node) => node.nodeId));
  const selected = graph.nodes.find((node) => node.nodeId === selectedNodeId) ?? null;
  // An edge whose endpoint is not in this projection cannot be drawn. That is
  // a statement about the projection, not about the run, so it is counted and
  // reported rather than dropped in silence.
  const undrawnEdges = graph.edges.filter((edge) => !position.has(edge.fromNodeId) || !position.has(edge.toNodeId)).length;

  const viewBox = `${-pan.x} ${-pan.y} ${Math.round(contentWidth / zoom)} ${Math.round(contentHeight / zoom)}`;
  const step = 80;

  return <div className="graph-frame">
    <div className="graph-controls">
      <label className="graph-search">
        <span className="sr-only">Search execution graph nodes</span>
        <input type="search" value={search} maxLength={120} placeholder="Search nodes" onChange={(event) => setSearch(event.target.value)} />
      </label>
      <label className="graph-filter">
        <span className="sr-only">Filter by execution state</span>
        <select value={stateFilter} onChange={(event) => setStateFilter(event.target.value)}>
          <option value="ALL">All execution states</option>
          {EXECUTION_STATE_FILTERS.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      <div className="graph-zoom" role="group" aria-label="Zoom and pan">
        <button type="button" onClick={() => setZoom((value) => Math.min(4, Number((value * 1.25).toFixed(3))))} aria-label="Zoom in">+</button>
        <button type="button" onClick={() => setZoom((value) => Math.max(0.25, Number((value / 1.25).toFixed(3))))} aria-label="Zoom out">-</button>
        <button type="button" onClick={() => setPan((value) => ({ ...value, x: value.x + step }))} aria-label="Pan left">&larr;</button>
        <button type="button" onClick={() => setPan((value) => ({ ...value, x: value.x - step }))} aria-label="Pan right">&rarr;</button>
        <button type="button" onClick={() => setPan((value) => ({ ...value, y: value.y + step }))} aria-label="Pan up">&uarr;</button>
        <button type="button" onClick={() => setPan((value) => ({ ...value, y: value.y - step }))} aria-label="Pan down">&darr;</button>
        <button type="button" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>Reset</button>
      </div>
    </div>
    <svg className="execution-graph" viewBox={viewBox} role="img" aria-label={`Execution graph for run ${graph.runId}`}>
      <defs><marker id="graph-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0 6 3 0 6Z" fill="currentColor" /></marker></defs>
      {graph.edges.map((edge) => {
        const from = position.get(edge.fromNodeId);
        const to = position.get(edge.toNodeId);
        if (from === undefined || to === undefined) return null;
        const dimmed = !visibleIds.has(edge.fromNodeId) || !visibleIds.has(edge.toNodeId);
        return <line key={edge.edgeId} x1={from.x + 144} y1={from.y + 18} x2={to.x} y2={to.y + 18} className={dimmed ? 'graph-edge graph-edge-dimmed' : 'graph-edge'} markerEnd="url(#graph-arrow)" />;
      })}
      {ordered.map((node) => {
        const at = position.get(node.nodeId) ?? { x: 0, y: 0 };
        const dimmed = !visibleIds.has(node.nodeId);
        return <g key={node.nodeId} transform={`translate(${at.x} ${at.y})`} role="button" tabIndex={0}
          aria-label={`${node.label ?? node.nodeId}, ${node.kind}, ${node.state}`}
          onClick={() => setSelectedNodeId(node.nodeId)}
          onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedNodeId(node.nodeId); }}>
          <rect className={`graph-node graph-node-${statusTone(node.state)}${dimmed ? ' graph-node-dimmed' : ''}${selectedNodeId === node.nodeId ? ' graph-node-selected' : ''}`} width="144" height="38" rx="7" />
          <text x="12" y="16" className="graph-node-kind">{formatCategory(node.kind)}</text>
          <text x="12" y="30" className="graph-node-state">{formatCategory(node.state)}</text>
        </g>;
      })}
    </svg>
    <div className="graph-footer">
      <span>{graph.nodes.length} nodes drawn · {visible.length} match</span>
      <span>{graph.edges.length - undrawnEdges} of {graph.edges.length} edges drawn · zoom {zoom.toFixed(2)}x</span>
      {graph.truncated
        ? <StatusPill value="WARNING" label={`Truncated at ${graph.nodeLimit} nodes / ${graph.edgeLimit} edges`} />
        : <StatusPill value="READY" label="Complete within bounds" />}
    </div>
    {graph.truncated ? <div className="callout callout-warning"><strong>This graph is truncated</strong><span>The projection reached its {graph.nodeLimit}-node / {graph.edgeLimit}-edge bound. What is not drawn is not absent from the run; it is absent from this projection.</span></div> : null}
    {undrawnEdges > 0 ? <div className="callout callout-warning"><strong>{undrawnEdges} edge(s) reference a node outside this projection</strong><span>They are counted but cannot be drawn. An edge without both endpoints is not evidence that the relationship is absent.</span></div> : null}
    {selected === null ? null : <div className="callout"><strong>Selected: {selected.label ?? selected.nodeId}</strong><span>{formatCategory(selected.kind)} · state {formatCategory(selected.state)} · event sequence {selected.eventSeq === null ? 'not linked' : String(selected.eventSeq)} · reason {selected.reasonCode === null ? 'not reported' : formatCategory(selected.reasonCode)}</span></div>}
  </div>;
}

function ExecutionGraphView({ selectedRunId, state, onRetry }: { readonly selectedRunId: string | null; readonly state: DataLoadState<ExecutionGraphSnapshot>; readonly onRetry: () => void }): ReactNode {
  if (selectedRunId === null) return <div className="empty-view"><div className="empty-mark"><Icon name="execution-graph" /></div><p className="eyebrow">TOPOLOGY / EXECUTION GRAPH</p><h1>Select a run first.</h1><p>Open a run from the Runs view to inspect its bounded deterministic execution graph.</p><div className="empty-status"><StatusPill value="NOT_APPLICABLE" label="No run selected" /></div></div>;
  if (state.kind === 'loading') return <LoadingState />;
  if (state.kind === 'error') return <DataErrorState title="Execution graph unavailable" onRetry={onRetry} />;
  if (state.kind !== 'ready') return null;
  return <div className="view-stack"><section className="page-intro"><div><p className="eyebrow">TOPOLOGY / EXECUTION GRAPH</p><h1>Trace the bounded run shape.</h1><p>Graph edges are projections of ordered evidence. They do not add execution authority or infer missing events.</p></div><StatusPill value="READY" label={`Run ${selectedRunId}`} /></section><GraphCanvas graph={state.data} /><article className="panel"><div className="panel-heading"><div><p className="eyebrow">GRAPH TABLE FALLBACK</p><h2>Node inventory</h2></div><span className="table-limit">Bounded list</span></div><div className="table-scroll"><table><thead><tr><th scope="col">Node</th><th scope="col">Kind</th><th scope="col">State</th><th scope="col">Reason</th><th scope="col">Event sequence</th></tr></thead><tbody>{state.data.nodes.map((node) => <tr key={node.nodeId}><td><strong>{node.label ?? node.nodeId}</strong><small>{node.nodeId}</small></td><td>{formatCategory(node.kind)}</td><td><StatusPill value={node.state} /></td><td>{node.reasonCode === null ? 'Not reported' : formatCategory(node.reasonCode)}</td><td>{node.eventSeq === null ? 'Not linked' : String(node.eventSeq)}</td></tr>)}</tbody></table></div></article>{/* Edges carry a proof the node inventory does not; the source graph
            renders proof per node, and this canvas must not be the one place a
            received edge field reaches no surface. */}<article className="panel"><div className="panel-heading"><div><p className="eyebrow">EDGE INVENTORY</p><h2>Edges and their proof</h2></div><span className="table-limit">Bounded list</span></div>{state.data.edges.length === 0 ? <div className="mini-state">No edges reported. An empty edge set is not proof of isolation.</div> : <div className="table-scroll"><table><thead><tr><th scope="col">Edge</th><th scope="col">From / To</th><th scope="col">Kind</th><th scope="col">Proof</th><th scope="col">Event sequence</th></tr></thead><tbody>{state.data.edges.map((edge) => <tr key={edge.edgeId}><td><small>{edge.edgeId}</small></td><td><small>{edge.fromNodeId} → {edge.toNodeId}</small></td><td>{formatCategory(edge.kind)}</td><td><StatusPill value={edge.proof} /></td><td>{edge.eventSeq === null ? 'Not linked' : String(edge.eventSeq)}</td></tr>)}</tbody></table></div>}</article></div>;
}

/**
 * C-15b - the source graph view.
 *
 * Replaces a fixed three-column grid that drew `nodes.slice(0, 24)` and
 * `edges.slice(0, 48)` while the contract permitted 1,000 and 2,000. The
 * ceiling was never a rendering limit; it was two slice calls.
 *
 * What this draws instead: every node the server sent, on a deterministic
 * layered layout, with pan, zoom, search, an evidence filter, selection, and a
 * truncation banner that states what is missing rather than implying nothing
 * is. Layer and within-layer order come from the node identifier, so the same
 * snapshot always draws the same picture.
 */
/**
 * The minimal shape the layered layout needs. Both graph contracts satisfy it,
 * so one deterministic layout serves both canvases and they cannot drift.
 */
interface LayoutGraph {
  readonly nodes: readonly { readonly nodeId: string }[];
  readonly edges: readonly { readonly fromNodeId: string; readonly toNodeId: string }[];
}

function layerAssignment(graph: LayoutGraph): Map<string, number> {
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

function SourceGraphCanvas({ graph }: { readonly graph: SourceGraphSnapshot }): ReactNode {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [search, setSearch] = useState('');
  const [proofFilter, setProofFilter] = useState<string>('ALL');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Search is local UI data: bounded, lower-cased, and used only for substring
  // matching. No regular expression is built from operator input.
  const needle = search.slice(0, 120).toLowerCase();
  const matches = (node: SourceGraphSnapshot['nodes'][number]): boolean => {
    if (proofFilter !== 'ALL' && node.proof !== proofFilter) return false;
    if (needle.length === 0) return true;
    return `${node.label ?? ''} ${node.nodeId} ${node.kind}`.toLowerCase().includes(needle);
  };

  const layers = layerAssignment(graph);
  const ordered = [...graph.nodes].sort((left, right) => left.nodeId.localeCompare(right.nodeId));
  const byLayer = new Map<number, string[]>();
  for (const node of ordered) {
    const index = layers.get(node.nodeId) ?? 0;
    byLayer.set(index, [...(byLayer.get(index) ?? []), node.nodeId]);
  }
  const position = new Map<string, { x: number; y: number }>();
  let widest = 0;
  for (const [layerIndex, members] of [...byLayer.entries()].sort((left, right) => left[0] - right[0])) {
    members.forEach((nodeId, order) => {
      position.set(nodeId, { x: layerIndex * 264, y: order * 64 });
      widest = Math.max(widest, order * 64);
    });
  }
  const contentWidth = Math.max(820, ([...byLayer.keys()].length) * 264 + 168);
  const contentHeight = Math.max(190, widest + 64);
  const visible = graph.nodes.filter(matches);
  const visibleIds = new Set(visible.map((node) => node.nodeId));
  const selected = graph.nodes.find((node) => node.nodeId === selectedNodeId) ?? null;
  // Parity with the execution graph: an edge whose endpoint is outside this
  // projection cannot be drawn, and the footer must not report it as drawn.
  const undrawnEdges = graph.edges.filter((edge) => !position.has(edge.fromNodeId) || !position.has(edge.toNodeId)).length;

  const viewBox = `${-pan.x} ${-pan.y} ${Math.round(contentWidth / zoom)} ${Math.round(contentHeight / zoom)}`;
  const step = 80;

  return <div className="graph-frame">
    <div className="graph-controls">
      <label className="graph-search">
        <span className="sr-only">Search graph nodes</span>
        <input type="search" value={search} maxLength={120} placeholder="Search nodes" onChange={(event) => setSearch(event.target.value)} />
      </label>
      <label className="graph-filter">
        <span className="sr-only">Filter by proof</span>
        <select value={proofFilter} onChange={(event) => setProofFilter(event.target.value)}>
          <option value="ALL">All proof states</option>
          <option value="PROVEN">PROVEN</option>
          <option value="AMBIGUOUS">AMBIGUOUS</option>
          <option value="UNSUPPORTED">UNSUPPORTED</option>
        </select>
      </label>
      <div className="graph-zoom" role="group" aria-label="Zoom and pan">
        <button type="button" onClick={() => setZoom((value) => Math.min(4, Number((value * 1.25).toFixed(3))))} aria-label="Zoom in">+</button>
        <button type="button" onClick={() => setZoom((value) => Math.max(0.25, Number((value / 1.25).toFixed(3))))} aria-label="Zoom out">-</button>
        <button type="button" onClick={() => setPan((value) => ({ ...value, x: value.x + step }))} aria-label="Pan left">&larr;</button>
        <button type="button" onClick={() => setPan((value) => ({ ...value, x: value.x - step }))} aria-label="Pan right">&rarr;</button>
        <button type="button" onClick={() => setPan((value) => ({ ...value, y: value.y + step }))} aria-label="Pan up">&uarr;</button>
        <button type="button" onClick={() => setPan((value) => ({ ...value, y: value.y - step }))} aria-label="Pan down">&darr;</button>
        <button type="button" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>Reset</button>
      </div>
    </div>
    <svg className="execution-graph" viewBox={viewBox} role="img" aria-label="Bounded source intelligence graph">
      <defs><marker id="source-graph-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0 6 3 0 6Z" fill="currentColor" /></marker></defs>
      {graph.edges.map((edge) => {
        const from = position.get(edge.fromNodeId);
        const to = position.get(edge.toNodeId);
        if (from === undefined || to === undefined) return null;
        const dimmed = !visibleIds.has(edge.fromNodeId) || !visibleIds.has(edge.toNodeId);
        return <line key={edge.edgeId} x1={from.x + 144} y1={from.y + 18} x2={to.x} y2={to.y + 18} className={dimmed ? 'graph-edge graph-edge-dimmed' : 'graph-edge'} markerEnd="url(#source-graph-arrow)" />;
      })}
      {ordered.map((node) => {
        const at = position.get(node.nodeId) ?? { x: 0, y: 0 };
        const dimmed = !visibleIds.has(node.nodeId);
        return <g key={node.nodeId} transform={`translate(${at.x} ${at.y})`} onClick={() => setSelectedNodeId(node.nodeId)} role="button" tabIndex={0}
          onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedNodeId(node.nodeId); }}>
          <rect className={`graph-node graph-node-${statusTone(node.currentness)}${dimmed ? ' graph-node-dimmed' : ''}${selectedNodeId === node.nodeId ? ' graph-node-selected' : ''}`} width="144" height="38" rx="7" />
          <text x="12" y="16" className="graph-node-kind">{formatCategory(node.kind)}</text>
          <text x="12" y="30" className="graph-node-state">{formatCategory(node.proof)}</text>
        </g>;
      })}
    </svg>
    <div className="graph-footer">
      <span>{graph.nodes.length} nodes drawn · {visible.length} match</span>
      <span>{graph.edges.length - undrawnEdges} of {graph.edges.length} edges · depth {graph.depth} · zoom {zoom.toFixed(2)}x</span>
      {graph.truncated
        ? <StatusPill value="WARNING" label={`Truncated at ${graph.nodeLimit} nodes / ${graph.edgeLimit} edges`} />
        : <StatusPill value="READY" label="Complete within bounds" />}
    </div>
    {graph.truncated ? <div className="callout callout-warning"><strong>This graph is truncated</strong><span>The projection reached its {graph.nodeLimit}-node / {graph.edgeLimit}-edge bound. What is not drawn is not absent from the system; it is absent from this projection.</span></div> : null}
    {undrawnEdges > 0 ? <div className="callout callout-warning"><strong>{undrawnEdges} edge(s) reference a node outside this projection</strong><span>They are counted but cannot be drawn. An edge without both endpoints is not evidence that the relationship is absent.</span></div> : null}
    {selected === null ? null : <div className="callout"><strong>Selected: {selected.label ?? selected.nodeId}</strong><span>{formatCategory(selected.kind)} · proof {formatCategory(selected.proof)} · currentness {formatCategory(selected.currentness)} · capability {formatCategory(selected.capability)}</span></div>}
  </div>;
}

function SourceView({ summary, surfaceState, graphState, selectedSurfaceId, onSelectSurface, onRetry, limits }: { readonly summary: OverviewSnapshot['source']; readonly surfaceState: DataLoadState<SourceSurfacesSnapshot>; readonly graphState: DataLoadState<SourceGraphSnapshot>; readonly selectedSurfaceId: string | null; readonly onSelectSurface: (surfaceId: string) => void; readonly onRetry: () => void; readonly limits: Readonly<Record<string, number>> }): ReactNode {
  if (surfaceState.kind === 'loading') return <LoadingState />;
  if (surfaceState.kind === 'error') return <DataErrorState title="Source surface inventory unavailable" onRetry={onRetry} />;
  if (surfaceState.kind !== 'ready') return null;
  const surfaces = surfaceState.data.items;
  const proofChain = summary.proofChain;
  // `completeness` is a required field of the v3 source-summary contract; an
  // absent measurement arrives as an explicit UNKNOWN/UNMEASURED projection
  // from the adapter, never as a missing field to be defaulted here.
  const completeness = summary.completeness;
  const populationLabel = completeness.total === null ? `${completeness.projected}, total unknown` : `${completeness.projected} of ${completeness.total}`;
  const enumeration = completeness.enumeration;
  const contentRead = completeness.contentRead;
  const enumerationTotalLabel = enumeration.totalFiles === null ? 'total unknown' : String(enumeration.totalFiles);
  const contentDroppedLabel = String(contentRead.droppedFiles);
  return <div className="view-stack"><section className="page-intro"><div><p className="eyebrow">PROVENANCE / SOURCE INTELLIGENCE</p><h1>Follow proof, currentness, and capability.</h1><p>Source intelligence exposes bounded descriptors and graph neighborhoods. Raw source, paths, handler symbols, and evidence bodies remain outside the boundary.</p></div><StatusPill value={summary.state} /></section><section className="metric-grid"><MetricCard label="Inventory" value={formatCategory(summary.state)} detail={`${summary.repositoryCount} repositories`} tone={statusTone(summary.state)} /><MetricCard label="Surfaces" value={String(summary.surfaceCount)} detail={`${surfaces.length} rows loaded`} /><MetricCard label="Currentness" value={summary.currentness.length === 0 ? 'Not reported' : formatCategory(summary.currentness[0]?.key ?? 'UNKNOWN')} detail="Rollup from source authority" tone={summary.currentness.length === 0 ? 'warning' : statusTone(summary.currentness[0]?.key ?? 'UNKNOWN')} /><MetricCard label="Capabilities" value={summary.capabilities.length === 0 ? 'Not reported' : formatCategory(summary.capabilities[0]?.key ?? 'UNKNOWN')} detail={summary.capabilities.length === 0 ? 'No capability rollup' : `${summary.capabilities[0]?.count ?? 0} of ${summary.capabilities.reduce((total, entry) => total + entry.count, 0)} surfaces`} tone={summary.capabilities.length === 0 ? 'warning' : statusTone(summary.capabilities[0]?.key ?? 'UNKNOWN')} /><MetricCard label="Graph limits" value={`${limits.maxGraphNodes} / ${limits.maxGraphEdges}`} detail="nodes / edges maximum, declared" tone="ready" /><MetricCard label="Inventory digest" value={summary.inventoryDigest === null ? 'Absent' : 'Recorded'} detail={summary.inventoryDigest === null ? 'This inventory anchors to nothing' : 'Inventory is digest-anchored'} tone={summary.inventoryDigest === null ? 'warning' : 'ready'} /></section><article className="panel"><div className="panel-heading"><div><p className="eyebrow">POPULATION COMPLETENESS</p><h2>Operation projection</h2></div><StatusPill value={completeness.state} /></div><div className="data-grid"><DataRow label="State" value={formatCategory(completeness.state)} tone={statusTone(completeness.state)} /><DataRow label="Coverage" value={formatCategory(completeness.coverageState)} tone={statusTone(completeness.coverageState)} /><DataRow label="Population" value={populationLabel} tone={completeness.state === 'COMPLETE' ? 'ready' : 'warning'} /><DataRow label="Examined" value={String(completeness.examined)} /><DataRow label="Limit" value={String(completeness.limit)} /><DataRow label="Dropped" value={String(completeness.dropped)} tone={completeness.dropped > 0 ? 'warning' : 'neutral'} /><DataRow label="Truncated" value={completeness.truncated ? 'Yes' : 'No'} tone={completeness.truncated ? 'warning' : 'neutral'} /><DataRow label="Remaining unknown" value={completeness.remainingUnknown ? 'Yes' : 'No'} tone={completeness.remainingUnknown ? 'warning' : 'neutral'} /></div><div className="panel-heading" style={{ marginTop: '16px' }}><div><p className="eyebrow">ENUMERATION</p><h2>File walk</h2></div><StatusPill value={enumeration.state} /></div><div className="data-grid"><DataRow label="Enumeration state" value={formatCategory(enumeration.state)} tone={statusTone(enumeration.state)} /><DataRow label="Files examined" value={String(enumeration.examinedFiles)} /><DataRow label="Total files" value={enumerationTotalLabel} tone={enumeration.remainingUnknown ? 'warning' : 'neutral'} /><DataRow label="Dropped files" value={enumeration.droppedFiles === null ? 'unknown' : String(enumeration.droppedFiles)} tone={enumeration.droppedFiles !== null && enumeration.droppedFiles > 0 ? 'warning' : enumeration.droppedFiles === null ? 'warning' : 'neutral'} /><DataRow label="Walk limit" value={String(enumeration.limit)} /><DataRow label="Remaining unknown" value={enumeration.remainingUnknown ? 'Yes' : 'No'} tone={enumeration.remainingUnknown ? 'warning' : 'neutral'} /></div><div className="panel-heading" style={{ marginTop: '16px' }}><div><p className="eyebrow">CONTENT READ</p><h2>File bodies</h2></div><StatusPill value={contentRead.state} /></div><div className="data-grid"><DataRow label="Content state" value={formatCategory(contentRead.state)} tone={statusTone(contentRead.state)} /><DataRow label="Candidates" value={String(contentRead.candidateFiles)} /><DataRow label="Read" value={String(contentRead.readFiles)} /><DataRow label="Admitted" value={String(contentRead.admittedFiles)} /><DataRow label="Dropped" value={contentDroppedLabel} tone={contentRead.droppedFiles > 0 ? 'warning' : 'neutral'} /><DataRow label="Unreadable" value={String(contentRead.unreadableFiles)} tone={contentRead.unreadableFiles > 0 ? 'warning' : 'neutral'} /></div>{completeness.state !== 'COMPLETE' ? <div className="callout callout-warning"><strong>{completeness.state === 'TRUNCATED' ? 'Population truncated' : 'Population total unknown'}</strong><span>{completeness.state === 'TRUNCATED' ? `Projected ${completeness.projected} of ${completeness.total ?? 'unknown'} with ${completeness.dropped} dropped.` : `Projected ${completeness.projected}, total unknown; dropped ${completeness.dropped}.`} Coverage is reporting only and never grants admission.</span></div> : <div className="callout"><strong>Population complete</strong><span>Projected {completeness.projected} of {completeness.total ?? completeness.projected} with no drops reported. Coverage remains reporting only.</span></div>}</article>{proofChain === null ? <article className="panel"><div className="panel-heading"><div><p className="eyebrow">PROOF-CHAIN CENSUS</p><h2>Not reported</h2></div><StatusPill value="UNKNOWN" /></div><p className="panel-intro">The source authority did not provide a proof-chain census. No eligibility or pass claim is inferred.</p></article> : <article className="panel panel-wide"><div className="panel-heading"><div><p className="eyebrow">PROOF-CHAIN CENSUS</p><h2>Where qualification stops</h2></div><span className="table-limit">{proofChain.censusDigest === null ? 'Digest unavailable' : 'Authority-bound'}</span></div><div className="metric-inline"><div><strong>{proofChain.totalOperations}</strong><span>operations</span></div><div><strong>{proofChain.phase24Eligible}</strong><span>eligible</span></div><div><strong>{proofChain.runtimeBindings}</strong><span>runtime bound</span></div><div><strong>{proofChain.replayRequirementsProven}</strong><span>replay ready</span></div></div><div className="scope-list"><span>Primary blocker</span><strong>{proofChain.primaryBlockingStages[0] === undefined ? 'None reported' : `${formatCategory(proofChain.primaryBlockingStages[0].key)} · ${proofChain.primaryBlockingStages[0].count}`}</strong><span>Runtime gaps</span><strong>{proofChain.runtimeBindingMissing}</strong><span>Dossier-compatible</span><strong>{proofChain.dossierCompatible}</strong><span>Currentness failures</span><strong>{proofChain.currentnessFailureCount}</strong></div><div className="callout"><strong>Advisory diagnostics only</strong><span>These counts project the source census and existing Phase-24 authority. The Control Center adds no selector or promotion authority.</span></div><div className="timeline-heading"><p className="eyebrow">EXCLUSIONS AND STAGE CENSUS</p><span>What Phase 24 excluded, and where each stage stands.</span></div><div className="data-grid"><DataRow label="Phase 24 excluded" value={String(proofChain.phase24Excluded)} tone={proofChain.phase24Excluded > 0 ? 'warning' : 'neutral'} /><DataRow label="Source snapshot" value={proofChain.sourceSnapshotDigest === null ? 'No digest' : 'Digest recorded'} tone={proofChain.sourceSnapshotDigest === null ? 'warning' : 'neutral'} /><DataRow label="Source surfaces" value={proofChain.sourceSurfaceDigest === null ? 'No digest' : 'Digest recorded'} tone={proofChain.sourceSurfaceDigest === null ? 'warning' : 'neutral'} /><DataRow label="Phase 24 portfolio" value={proofChain.phase24PortfolioDigest === null ? 'No digest' : 'Digest recorded'} tone={proofChain.phase24PortfolioDigest === null ? 'warning' : 'neutral'} /></div>{proofChain.stageStatusCounts.length === 0 ? <div className="mini-state">No stage/status census reported.</div> : <div className="table-scroll"><table><thead><tr><th scope="col">Stage</th><th scope="col">Status</th><th scope="col">Count</th></tr></thead><tbody>{proofChain.stageStatusCounts.map((entry) => <tr key={`${entry.stage}:${entry.status}`}><td>{formatCategory(entry.stage)}</td><td><StatusPill value={entry.status} /></td><td>{entry.count}</td></tr>)}</tbody></table></div>}<div className="timeline-heading"><p className="eyebrow">PROOF FAMILIES</p><span>Ranked by the authority, with the gap and fan-out behind each rank. Bug-hunting value is an assessment, never a selection.</span></div>{proofChain.proofFamilies.length === 0 ? <div className="mini-state">No proof families reported. An empty portfolio is not an absence of gaps.</div> : <div className="table-scroll"><table><thead><tr><th scope="col">Rank</th><th scope="col">Family</th><th scope="col">Assessment</th><th scope="col">Gaps</th><th scope="col">Completeness</th><th scope="col">Fan-out</th><th scope="col">Value</th></tr></thead><tbody>{[...proofChain.proofFamilies].sort((left, right) => left.rank - right.rank).map((family) => <tr key={family.family}><td>{family.rank}</td><td><strong>{formatCategory(family.family)}</strong></td><td><StatusPill value={family.assessment} /></td><td><span>{family.gapSurfaceCount} surface(s)</span><small>{family.firstBlockerCount} first blocker(s) · {family.potentiallyUnlockableCount} potentially unlockable</small></td><td><StatusPill value={family.proofCompleteness} /></td><td>{family.dependencyFanOut}</td><td>{formatCategory(family.bugHuntingValue)}</td></tr>)}</tbody></table></div>}</article>}<article className="panel"><div className="panel-heading"><div><p className="eyebrow">SOURCE SURFACES</p><h2>Approved bounded descriptors</h2></div><span className="table-limit">Limit {surfaceState.data.page.limit} · {surfaceState.data.repositoryFilter === null ? 'all repositories' : `repository ${surfaceState.data.repositoryFilter}`}</span></div>{surfaces.length === 0 ? <div className="mini-state mini-state-warning">No source surfaces available. This is an unavailable/empty inventory, not proof of no routes.</div> : <div className="table-scroll"><table><thead><tr><th scope="col">Surface</th><th scope="col">Currentness</th><th scope="col">Proof</th><th scope="col">Read-only</th><th scope="col">Binding</th><th scope="col">Capability</th><th scope="col">Lifecycle</th><th scope="col"><span className="sr-only">Graph</span></th></tr></thead><tbody>{surfaces.map((surface) => <tr key={surface.surfaceId} className={selectedSurfaceId === surface.surfaceId ? 'row-selected' : undefined}><td><strong>{surface.routeTemplate ?? 'Route template withheld'}</strong><small>{surface.repositoryId} · {surface.method} · {surface.language} · {surface.surfaceId}</small><small>{surface.sourceSha === null ? 'No source anchor' : `source ${surface.sourceSha.slice(0, 12)}…`} · {surface.evidenceDigest === null ? 'no evidence digest' : 'evidence digest recorded'}</small>{surface.exclusionReasons.length === 0 ? null : <small className="row-note-warning">Excluded: {surface.exclusionReasons.map(formatCategory).join(', ')}</small>}</td><td><StatusPill value={surface.currentness} /></td><td><StatusPill value={surface.routeProof} /></td><td><StatusPill value={surface.readOnlyClassification} /></td><td><StatusPill value={surface.runtimeBinding} /><small>handler {formatCategory(surface.handlerState)}</small></td><td><small>Projection {formatCategory(surface.projectionCapability)}</small><small>Replay {formatCategory(surface.replayCapability)}</small><small>Differential {formatCategory(surface.differentialCapability)}</small></td><td>{formatCategory(surface.lifecycle)}</td><td><button className="table-action" type="button" onClick={() => onSelectSurface(surface.surfaceId)}>Graph <Icon name="arrow" /></button></td></tr>)}</tbody></table></div>}</article>{selectedSurfaceId === null ? <article className="panel run-detail-empty"><p className="eyebrow">PROGRESSIVE GRAPH</p><h2>Select a surface to inspect its neighborhood</h2><p className="panel-intro">Depth and node/edge limits are enforced by the source graph contract.</p></article> : graphState.kind === 'loading' ? <LoadingState /> : graphState.kind === 'error' ? <DataErrorState title="Source graph unavailable" onRetry={onRetry} /> : graphState.kind === 'ready' ? <><SourceGraphCanvas graph={graphState.data} /><article className="panel"><div className="panel-heading"><div><p className="eyebrow">GRAPH TABLE FALLBACK</p><h2>Node inventory</h2></div><span className="table-limit">Bounded list</span></div><div className="table-scroll"><table><thead><tr><th scope="col">Node</th><th scope="col">Proof</th><th scope="col">Currentness</th><th scope="col">Capability</th></tr></thead><tbody>{graphState.data.nodes.map((node) => <tr key={node.nodeId}><td>{node.label ?? node.nodeId}</td><td><StatusPill value={node.proof} /></td><td><StatusPill value={node.currentness} /></td><td>{formatCategory(node.capability)}</td></tr>)}</tbody></table></div></article></> : null}</div>;
}

function FindingsView({ state, onRetry }: { readonly state: DataLoadState<FindingsSnapshot>; readonly onRetry: () => void }): ReactNode {
  if (state.kind === 'loading') return <LoadingState />;
  if (state.kind === 'error') return <DataErrorState title="Findings unavailable" onRetry={onRetry} />;
  if (state.kind !== 'ready') return null;
  const findings = state.data.items;
  const readyCount = findings.filter((finding) => finding.dossierStatus === 'READY').length;
  const staleCount = findings.filter((finding) => finding.sourceCurrentness !== 'CURRENT').length;
  return <div className="view-stack"><section className="page-intro"><div><p className="eyebrow">TRIAGE / FINDINGS</p><h1>Keep the signal, lose the raw evidence.</h1><p>Findings are owner-local metadata projections. This view never opens a dossier, shows evidence bodies, or exposes source paths, credentials, traces, or customer values.</p></div><StatusPill value={state.data.state} /></section><section className="metric-grid"><MetricCard label="Findings" value={String(findings.length)} detail={state.data.state === 'AVAILABLE' ? 'Sanitized rows loaded' : 'No finding claim'} tone={findings.length > 0 ? 'warning' : 'neutral'} /><MetricCard label="Dossier readiness" value={String(readyCount)} detail={`${findings.length - readyCount} not ready`} tone={readyCount > 0 ? 'ready' : 'warning'} /><MetricCard label="Source freshness" value={String(staleCount)} detail="Stale or unavailable" tone={staleCount > 0 ? 'warning' : 'ready'} /><MetricCard label="Boundary" value="Metadata only" detail="Owner-local storage" tone="ready" /></section><article className="panel"><div className="panel-heading"><div><p className="eyebrow">SANITIZED FINDINGS</p><h2>Finding index</h2></div><span className="table-limit">Limit {state.data.page.limit}</span></div>{findings.length === 0 ? <div className="mini-state mini-state-warning">{state.data.state === 'UNAVAILABLE' ? 'Owner-local findings are unavailable. No finding or pass claim is made.' : state.data.state === 'UNKNOWN' ? 'Finding state is unknown. No finding or pass claim is made.' : 'No sanitized findings recorded. Empty findings is not proof of no defects.'}</div> : <div className="table-scroll"><table><thead><tr><th scope="col">Signal</th><th scope="col">Severity / confidence</th><th scope="col">Evidence posture</th><th scope="col">Source</th><th scope="col">Dossier</th><th scope="col">Observed</th></tr></thead><tbody>{findings.map((finding) => <tr key={finding.findingId}><td><strong>{finding.title ?? 'Untitled finding'}</strong><small>{finding.findingId}</small><small>{finding.product ?? 'Product withheld'} · {finding.surface ?? 'Surface withheld'}</small><small>{formatCategory(finding.categoryCode)} · {finding.clusterId === null ? 'unclustered' : `cluster ${finding.clusterId}`}</small></td><td><StatusPill value={finding.severity} /><small>{formatCategory(finding.confidence)} confidence</small></td><td><strong>{formatCategory(finding.evidenceLevel)}</strong><small>{formatCategory(finding.reproduction)} · {finding.reproductionCount} observation(s)</small><small>{finding.minimized ? 'Minimized' : 'Not minimized'}</small></td><td><StatusPill value={finding.sourceCurrentness} /><small>{finding.fingerprint === null ? 'Fingerprint unavailable' : 'Fingerprint recorded'}</small></td><td><StatusPill value={finding.dossierStatus} /><small>{finding.provenanceDigest === null ? 'Provenance unavailable' : 'Provenance recorded'}</small></td><td><small>First {formatTimestamp(finding.firstObservedAt)}</small><small>Last {formatTimestamp(finding.lastObservedAt)}</small></td></tr>)}</tbody></table></div>}</article><div className="callout callout-warning"><strong>Privacy boundary</strong><span>Only sanitized metadata is displayed. Raw evidence, source text, paths, bodies, credentials, authenticated traces, and customer values remain unavailable to this UI.</span></div></div>;
}

// ---------------------------------------------------------------------------
// RS-1 reviewer view.
//
// The server sends `epistemicClass` on every element and this view renders it
// verbatim, as TEXT and not as colour alone: a reviewer reading in monochrome,
// or with a screen reader, must be able to tell a proven fact from a
// suggestion. The UI computes no class of its own — there is deliberately no
// code path here that turns UNKNOWN into a soft yes, and a value-free UNKNOWN
// shows the reason it is unknown rather than an inviting blank.
// ---------------------------------------------------------------------------

const EPISTEMIC_COPY: Record<EpistemicClass, { readonly label: string; readonly tone: StatusTone; readonly meaning: string }> = {
  FACT: { label: 'FACT', tone: 'ready', meaning: 'Mechanically derived from recorded evidence.' },
  RECOMMENDATION: { label: 'RECOMMENDATION', tone: 'warning', meaning: 'Advisory. A human makes the call.' },
  UNKNOWN: { label: 'UNKNOWN', tone: 'neutral', meaning: 'Not determined. This is not a weak yes.' },
};

function EpistemicBadge({ epistemicClass }: { readonly epistemicClass: EpistemicClass }): ReactNode {
  const copy = EPISTEMIC_COPY[epistemicClass];
  return <span className={`status-pill status-${copy.tone}`} title={copy.meaning}><span className="status-dot" aria-hidden="true" />{copy.label}</span>;
}

function ReviewerElementCell<T>({ element, render }: {
  readonly element: ReviewerElement<T>;
  readonly render: (value: T) => ReactNode;
}): ReactNode {
  return (
    <td>
      <EpistemicBadge epistemicClass={element.epistemicClass} />
      {element.value === null
        ? <small>Not determined{element.basis.length === 0 ? '' : ` · ${element.basis.map(formatCategory).join(', ')}`}</small>
        : <>{render(element.value)}{element.basis.length === 0 ? null : <small>Basis: {element.basis.map(formatCategory).join(', ')}</small>}</>}
    </td>
  );
}

/**
 * The owner-local decision control for one finding.
 *
 * Deliberately narrow. It offers the five canonical decisions and no free-form
 * state, it disappears once a decision is terminal, and it never claims the
 * decision means more than it does. Bypassing it changes nothing: the server
 * refuses a second decision on the same binding regardless of what the UI
 * shows.
 */
function ReviewDecisionCell({
  item,
  capability,
  onDecided,
}: {
  readonly item: ReviewerFindingSnapshot;
  /** NW-09. The SERVER's answer about the write route. */
  readonly capability: 'ENABLED' | 'DISABLED' | 'UNKNOWN';
  readonly onDecided: () => void;
}): ReactNode {
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [rationale, setRationale] = useState('');

  const value = item.localReview.value;
  const decided = value !== null && value.decision !== null && value.bindingCurrentness === 'CURRENT';

  // NW-09. Gate on the capability the SERVER reports, not on the per-finding
  // review identity. The identity answers whether a review STORE exists; it
  // says nothing about whether this server serves the write route, so the UI
  // used to offer controls whose POST the server would refuse as not found.
  // Unknown fails closed: an unloaded overview is not permission.
  if (capability !== 'ENABLED') {
    return (
      <td>
        <small>{capability === 'UNKNOWN' ? 'Review capability not yet known' : 'Read-only server'}</small>
        <small>
          {capability === 'UNKNOWN'
            ? 'Waiting for the server capability report.'
            : 'Start with --enable-local-review to record owner-local decisions.'}
        </small>
      </td>
    );
  }

  // No store configured: there is nothing to decide against, and saying so is
  // better than showing controls that cannot work.
  if (item.reviewIdentity === null) {
    return (
      <td>
        <small>No owner-local review store</small>
      </td>
    );
  }

  if (decided) {
    return (
      <td>
        <strong>Decided</strong>
        <small>{formatCategory(value.decision ?? '')}</small>
        <small>{value.reviewedAt === null ? 'No timestamp recorded' : value.reviewedAt}</small>
        <small>Terminal. A second decision is refused by the server.</small>
      </td>
    );
  }

  const submit = async (decision: ReviewDecision): Promise<void> => {
    setPending(true);
    setOutcome(null);
    const identity = item.reviewIdentity as string;
    try {
      const response = await submitReviewDecision({
        findingId: item.findingId,
        reviewIdentity: identity,
        decision,
        ...(rationale.trim() === '' ? {} : { rationale: rationale.trim() }),
      });
      setOutcome(response.result);
      if (response.result === 'ACCEPTED') {
        setRationale('');
        onDecided();
      }
    } catch {
      // NW-09. The request failed without a readable answer, so whether the
      // decision was recorded is UNKNOWN. Never retry: the store refuses a
      // second decision on the same binding, so a retry would either
      // duplicate the request or return ALREADY_DECIDED without telling the
      // operator which attempt recorded it. Ask the server what it now holds
      // for this exact review identity instead.
      const readback = await readBackReviewDecision({ findingId: item.findingId, reviewIdentity: identity });
      if (readback.state === 'RECORDED') {
        setOutcome('RECORDED_CONFIRMED_BY_READBACK');
        setRationale('');
        onDecided();
      } else if (readback.state === 'NOT_RECORDED') {
        setOutcome('NOT_RECORDED_SAFE_TO_RETRY');
      } else {
        setOutcome('OUTCOME_UNKNOWN_READ_BACK_FAILED');
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <td>
      <label className="visually-hidden" htmlFor={`rationale-${item.findingId}`}>
        Rationale for {item.findingId}
      </label>
      <textarea
        id={`rationale-${item.findingId}`}
        className="review-rationale"
        value={rationale}
        maxLength={2000}
        rows={2}
        placeholder="Rationale (optional, no customer values)"
        disabled={pending}
        onChange={(event) => setRationale(event.target.value)}
      />
      <div className="review-actions">
        {REVIEW_DECISIONS.map((decision) => (
          <button
            key={decision}
            type="button"
            className="review-action"
            disabled={pending}
            onClick={() => {
              void submit(decision);
            }}
          >
            {formatCategory(decision)}
          </button>
        ))}
      </div>
      {outcome === null ? null : (
        <small
          className={
            outcome === 'ACCEPTED' || outcome === 'RECORDED_CONFIRMED_BY_READBACK'
              ? 'review-outcome-ok'
              : 'review-outcome-warn'
          }
        >
          {outcome === 'ACCEPTED'
            ? 'Recorded locally. This is not Leslie or Pondr sign-off.'
            : outcome === 'RECORDED_CONFIRMED_BY_READBACK'
              ? 'The response was lost, but a read-back confirms this decision is recorded. Not organizational sign-off.'
              : outcome === 'NOT_RECORDED_SAFE_TO_RETRY'
                ? 'The request failed and a read-back shows nothing was recorded. You can decide again.'
                : outcome === 'OUTCOME_UNKNOWN_READ_BACK_FAILED'
                  ? 'The request failed and the read-back could not reach the server. Whether it was recorded is unknown; refresh before deciding again.'
                  : `Refused: ${formatCategory(outcome)}`}
        </small>
      )}
      <small>Owner-local only. Never organizational sign-off.</small>
    </td>
  );
}

function ReviewerView({ state, capability, onRetry }: { readonly state: DataLoadState<ReviewerSnapshot>; readonly capability: 'ENABLED' | 'DISABLED' | 'UNKNOWN'; readonly onRetry: () => void }): ReactNode {
  if (state.kind === 'loading' || state.kind === 'idle') return <LoadingState />;
  if (state.kind === 'error') return <DataErrorState title="Reviewer intelligence unavailable" onRetry={onRetry} />;
  const items = state.data.items;
  const factCount = items.filter((item) => item.confidence.epistemicClass === 'FACT').length;
  const duplicateCount = items.filter((item) => item.probableDuplicates.length > 0).length;
  const unknownCount = items.filter((item) => item.relationship.epistemicClass === 'UNKNOWN').length;
  return (
    <div className="view-stack">
      <section className="page-intro">
        <div>
          <p className="eyebrow">REVIEW / INTELLIGENCE</p>
          <h1>Separate what was proved from what is suggested.</h1>
          <p>Every value below is labelled FACT, RECOMMENDATION, or UNKNOWN by the service that produced it. A duplicate suggestion is never a verdict, and a local review decision is never Alphaus organizational sign-off.</p>
        </div>
        <StatusPill value={state.data.state} />
      </section>
      <section className="metric-grid">
        <MetricCard label="Findings reviewed" value={String(items.length)} detail={state.data.state === 'AVAILABLE' ? 'Projected from the finding cones' : 'No reviewer claim'} />
        <MetricCard label="Confidence established" value={String(factCount)} detail={`${items.length - factCount} not determined`} tone={factCount > 0 ? 'ready' : 'warning'} />
        <MetricCard label="Duplicate suggestions" value={String(duplicateCount)} detail="Advisory only" tone={duplicateCount > 0 ? 'warning' : 'neutral'} />
        <MetricCard label="Relationship unknown" value={String(unknownCount)} detail="Missing comparison inputs" tone={unknownCount > 0 ? 'warning' : 'ready'} />
      </section>
      <article className="panel">
        <div className="panel-heading">
          <div><p className="eyebrow">REVIEWER INDEX</p><h2>Finding intelligence</h2></div>
          <span className="table-limit">Limit {state.data.page.limit}</span>
        </div>
        {items.length === 0
          ? <div className="mini-state mini-state-warning">{state.data.state === 'UNAVAILABLE' ? 'Owner-local findings are unavailable, so no reviewer intelligence is projected. This is not a claim that no defects exist.' : 'No findings to review. Empty is not proof of no defects.'}</div>
          : <div className="table-scroll"><table>
              <thead><tr>
                <th scope="col">Finding</th>
                <th scope="col">Relationship</th>
                <th scope="col">Probable duplicates</th>
                <th scope="col">Recurrence</th>
                <th scope="col">Defect class</th>
                <th scope="col">Expectation provenance</th>
                <th scope="col">Confidence</th>
                <th scope="col">Local review</th>
                <th scope="col">Decision</th>
              </tr></thead>
              <tbody>{items.map((item) => (
                <tr key={item.findingId}>
                  <td>
                    <strong>{item.findingId}</strong>
                    {item.unknowns.length === 0 ? null : <small>Unknown: {item.unknowns.map(formatCategory).join(', ')}</small>}
                  </td>
                  <ReviewerElementCell element={item.relationship} render={(value) => <>
                    <strong>{formatCategory(value.relationship)}</strong>
                    <small>{formatCategory(value.confidence)}</small>
                    <small>{value.possibleOriginalId === null ? 'No earlier finding pointed to' : `Possibly original: ${value.possibleOriginalId}`}</small>
                    {/* Evidence AGAINST the proposed relationship. Dropping it
                        left a suggestion looking better supported than it is. */}
                    <small className={value.counterevidence.length === 0 ? undefined : 'row-note-warning'}>{value.counterevidence.length === 0 ? 'No counterevidence recorded' : `Counterevidence: ${value.counterevidence.map(formatCategory).join(', ')}`}</small>
                    <small>Final verdict: human organizational</small>
                  </>} />
                  <td>
                    {item.probableDuplicates.length === 0
                      ? <small>None suggested</small>
                      : <>
                          <EpistemicBadge epistemicClass="RECOMMENDATION" />
                          {item.probableDuplicates.map((duplicate) => (
                            <small key={duplicate.findingId}>{duplicate.findingId} · {formatCategory(duplicate.relationship)} · {formatCategory(duplicate.confidence)}{duplicate.basis.length === 0 ? ' · no basis stated' : ` · basis ${duplicate.basis.map(formatCategory).join(', ')}`}</small>
                          ))}
                          <small>Advisory. Not a duplicate verdict.</small>
                        </>}
                  </td>
                  <ReviewerElementCell element={item.recurrence} render={(value) => <>
                    <strong>{formatCategory(value.recurrence)}</strong>
                    <small>{value.priorFindingId === null ? 'No prior finding matched' : `Prior: ${value.priorFindingId}`}</small>
                  </>} />
                  <ReviewerElementCell element={item.defectClass} render={(value) => <>
                    <strong>{value.classId}</strong>
                    <small>Shared invariant: {formatCategory(value.sharedInvariant)}</small>
                    <small>{value.memberFindingIds.length} member(s) · {formatCategory(value.confidence)}</small>
                    <small>{value.counterexampleCount} counterexample(s) · {value.unknownCount} unknown(s)</small>
                  </>} />
                  <ReviewerElementCell element={item.expectationProvenance} render={(value) => <strong>{formatCategory(value)}</strong>} />
                  <ReviewerElementCell element={item.confidence} render={(value) => <strong>{formatCategory(value)}</strong>} />
                  <ReviewerElementCell element={item.localReview} render={(value) => <>
                    <strong>{formatCategory(value.state)}</strong>
                    <small>{value.decision === null ? 'No decision recorded' : formatCategory(value.decision)}</small>
                    <small>Binding {formatCategory(value.bindingCurrentness)} · {value.transitionCount} transition(s)</small>
                    {value.notEquivalentTo.length === 0 ? null : <small className="row-note-warning">Not equivalent to: {value.notEquivalentTo.map(formatCategory).join(', ')}</small>}
                    <small>Local review only. Not Leslie or Pondr sign-off.</small>
                  </>} />
                  <ReviewDecisionCell item={item} capability={capability} onDecided={onRetry} />
                </tr>
              ))}</tbody>
            </table></div>}
      </article>
      <article className="panel">
        <div className="panel-heading"><div><p className="eyebrow">SUGGESTED ALPHAUS CLASSIFICATION</p><h2>Recommendations, not decisions</h2></div><StatusPill value="WARNING" label="Human decides" /></div>
        <p className="panel-intro">Nightwatch proposes a classification and states the basis for each part. It files nothing, and a team is left UNKNOWN unless attribution carries evidence.</p>
        {items.length === 0 ? <div className="mini-state">No recommendations to show.</div> : <div className="table-scroll"><table>
          <thead><tr><th scope="col">Finding</th><th scope="col">Severity</th><th scope="col">Catch stage</th><th scope="col">Source</th><th scope="col">Team</th></tr></thead>
          <tbody>{items.map((item) => (
            <tr key={item.findingId}>
              <td><strong>{item.findingId}</strong></td>
              <ReviewerElementCell element={item.alphausRecommendation.severity} render={(value) => <strong>{formatCategory(value)}</strong>} />
              <ReviewerElementCell element={item.alphausRecommendation.catchStage} render={(value) => <strong>{formatCategory(value)}</strong>} />
              <ReviewerElementCell element={item.alphausRecommendation.source} render={(value) => <strong>{formatCategory(value)}</strong>} />
              <ReviewerElementCell element={item.alphausRecommendation.team} render={(value) => <strong>{value}</strong>} />
            </tr>
          ))}</tbody>
        </table></div>}
      </article>
      <div className="callout callout-warning">
        <strong>Authority boundary</strong>
        <span>Final verdict authority is {formatCategory(state.data.finalVerdictAuthority)}. Local review carries {formatCategory(state.data.organizationalAuthority)} and is never equivalent to a Leslie genuine/invalid verdict or a Pondr approval. This view files nothing and decides nothing.</span>
      </div>
    </div>
  );
}

function CampaignView({ summaryState, coverageState, onRetry }: { readonly summaryState: DataLoadState<CampaignSummarySnapshot>; readonly coverageState: DataLoadState<CampaignCoverageSnapshot>; readonly onRetry: () => void }): ReactNode {
  if (summaryState.kind === 'loading' || coverageState.kind === 'loading') return <LoadingState />;
  if (summaryState.kind === 'error' || coverageState.kind === 'error') return <DataErrorState title="Campaign intelligence unavailable" onRetry={onRetry} />;
  if (summaryState.kind !== 'ready' || coverageState.kind !== 'ready') return null;
  const summary = summaryState.data;
  const coverage = coverageState.data;
  const counts = summary.counts;
  return <div className="view-stack"><section className="page-intro"><div><p className="eyebrow">CAMPAIGNS / INTELLIGENCE</p><h1>See the shape of coverage.</h1><p>Campaign values are projections of the existing plan and coverage models. The Control Center adds no selector, score, or promotion authority.</p></div><StatusPill value={summary.planState} /></section><section className="metric-grid campaign-metrics"><MetricCard label="Plan state" value={formatCategory(summary.planState)} detail={formatCategory(summary.sourceCurrentness)} tone={statusTone(summary.planState)} /><MetricCard label="Candidates" value={String(counts.candidates)} detail={`${counts.selected} selected / ${counts.excluded} excluded`} /><MetricCard label="Covered contracts" value={String(counts.coveredContracts)} detail={`${coverage.fullyCoveredContractCount} fully covered rows`} tone={counts.coveredContracts > 0 ? 'ready' : 'warning'} /><MetricCard label="Findings" value={String(counts.findings)} detail={`${counts.oracleOnly} oracle-only`} tone={counts.findings > 0 ? 'warning' : 'neutral'} /></section><section className="content-grid"><article className="panel panel-wide"><div className="panel-heading"><div><p className="eyebrow">COVERAGE MATRIX</p><h2>Contract-stage coverage</h2></div><span className="table-limit">Limit {coverage.page.limit}</span></div>{coverage.items.length === 0 ? <div className="mini-state mini-state-warning">No coverage rows reported. Empty coverage does not prove pass.</div> : <div className="table-scroll"><table><thead><tr><th scope="col">Member / contract</th><th scope="col">Source</th><th scope="col">Stages</th><th scope="col">Result</th></tr></thead><tbody>{coverage.items.map((row) => <tr key={row.memberId}><td><strong>{row.product ?? 'Unlabelled product'}</strong><small>{row.surface ?? 'Unlabelled surface'} · {row.contractId}</small><small>{row.memberId}</small>{row.gapReasons.length === 0 ? null : <small className="row-note-warning">Gaps: {row.gapReasons.map(formatCategory).join(', ')}</small>}</td><td><StatusPill value={row.sourceCurrentness} /></td><td><div className="stage-list">{row.stages.map((stage) => <span key={stage.stageCode} className={`stage-chip stage-${statusTone(stage.state)}`}>{formatCategory(stage.stageCode)} · {formatCategory(stage.state)}{stage.reasonCodes.length === 0 ? null : <small>{stage.reasonCodes.map(formatCategory).join(', ')}</small>}</span>)}</div></td><td><StatusPill value={row.fullyCovered ? 'READY' : 'WARNING'} label={row.fullyCovered ? 'Fully covered' : 'Gap present'} /></td></tr>)}</tbody></table></div>}</article><article className="panel"><div className="panel-heading"><div><p className="eyebrow">GAPS / BLOCKERS</p><h2>What remains unresolved</h2></div><StatusPill value={summary.blockerCodes.length === 0 ? 'READY' : 'WARNING'} label={`${summary.blockerCodes.length} blocker(s)`} /></div><div className="scope-list"><span>Replay gaps</span><strong className={counts.replayGaps > 0 ? 'text-warning' : undefined}>{counts.replayGaps}</strong><span>Minimization gaps</span><strong className={counts.minimizationGaps > 0 ? 'text-warning' : undefined}>{counts.minimizationGaps}</strong><span>Stale source gaps</span><strong className={counts.staleSourceGaps > 0 ? 'text-warning' : undefined}>{counts.staleSourceGaps}</strong><span>Semantic authority gaps</span><strong className={counts.semanticAuthorityGaps > 0 ? 'text-warning' : undefined}>{counts.semanticAuthorityGaps}</strong><span>Execution only</span><strong className={counts.executionOnly > 0 ? 'text-warning' : undefined}>{counts.executionOnly}</strong></div><CodeChips label="Blockers" codes={summary.blockerCodes} tone="blocked" /><CodeChips label="Reasons" codes={summary.reasonCodes} tone="warning" /></article><article className="panel"><div className="panel-heading"><div><p className="eyebrow">OWNER AUTHORITY</p><h2>Promotion remains separate</h2></div><span className="scope-lock">FROZEN</span></div><p className="panel-intro">Campaign availability is not promotion authority. This view cannot select, execute, approve, or promote a candidate.</p><div className="scope-list"><span>Plan digest</span><strong>{summary.planDigest === null ? 'Not available' : 'Available'}</strong><span>Coverage digest</span><strong>{summary.coverageDigest === null ? 'Not available' : 'Available'}</strong><span>Owner scope</span><strong>{formatCategory(summary.ownerScopeStatus)}</strong><span>Owner scope reason</span><strong>{formatCategory(summary.ownerScopeReason)}</strong></div></article></section></div>;
}

function SafetyView({ data }: { readonly data: OverviewSnapshot }): ReactNode {
  const safety = data.safety;
  const source = data.source;
  const meta = data.meta;
  const health = data.health;
  const featureEntries = Object.entries(meta.features).sort((left, right) => left[0].localeCompare(right[0]));
  const limitEntries = Object.entries(meta.limits).sort((left, right) => left[0].localeCompare(right[0]));
  const continuityValue = safety.continuity.state === 'CURRENT' ? 'Current' : formatCategory(safety.continuity.state);
  return (
    <div className="view-stack">
      <section className="hero-card safety-hero" aria-labelledby="safety-title">
        <div className="hero-copy">
          <p className="eyebrow">GUARDRAILS / SAFETY CENTER</p>
          <h1 id="safety-title">Safety is a posture, not a green badge.</h1>
          <p className="hero-description">Control Center safety is evaluated independently from readiness and oracle results. Unknown checks stay visible as unknown.</p>
          <div className="hero-actions"><StatusPill value={safety.state} /><StatusPill value={safety.scope} label="Loopback only" /><StatusPill value={safety.readOnly ? 'READY' : 'BLOCKED'} label="Read only" /></div>
        </div>
        <div className="safety-seal" aria-hidden="true"><span>SAFE</span><small>POSTURE</small></div>
      </section>

      <section className="content-grid">
        <article className="panel panel-wide">
          <div className="panel-heading"><div><p className="eyebrow">OPERATION POLICY</p><h2>What this surface can do</h2></div><StatusPill value="READY" label="Constrained" /></div>
          <p className="panel-intro">The policy is fixed by the local owner scope. No control in this view can execute, mutate, contact a product, or publish a finding.</p>
          <div className="data-grid">
            <DataRow label="Control Center" value={formatCategory(safety.operationPolicy.controlCenter)} tone="ready" />
            <DataRow label="Execution authority" value={formatCategory(safety.operationPolicy.execution)} tone="ready" />
            <DataRow label="Mutation authority" value={formatCategory(safety.operationPolicy.mutation)} tone="ready" />
            <DataRow label="Product contact" value={formatCategory(safety.operationPolicy.productContact)} tone="ready" />
            <DataRow label="Database" value={formatCategory(safety.operationPolicy.database)} tone="warning" />
            <DataRow label="Infrastructure" value={formatCategory(safety.operationPolicy.infrastructure)} tone="warning" />
            <DataRow label="Publication" value={formatCategory(safety.operationPolicy.publication)} tone="ready" />
            <DataRow label="Raw evidence" value={formatCategory(safety.rawEvidenceExposure)} tone="ready" />
            <DataRow label="Owner scope status" value={formatCategory(safety.ownerScope.status)} tone="warning" />
          </div>
          <div className="callout callout-warning"><strong>Owner scope is frozen</strong><span>{formatCategory(safety.ownerScope.reason)}. Unknown safety checks never become PASS by absence.</span></div>
        </article>

        {/* The individual safety checks. The hero above promises that
            "Unknown checks stay visible as unknown", and until now nothing
            rendered them: the checks were fetched, counted in one Overview
            metric, and never listed. A count cannot say WHICH check is
            unknown, so it cannot keep that promise. */}
        <article className="panel panel-full">
          <div className="panel-heading"><div><p className="eyebrow">SAFETY CHECKS</p><h2>Every check, by name</h2></div><StatusPill value={safety.checks.length === 0 ? 'UNKNOWN' : safety.state} label={safety.checks.length === 0 ? 'None reported' : `${safety.checks.length} check(s)`} /></div>
          {safety.checks.length === 0
            ? <div className="mini-state mini-state-warning">No safety checks reported. An empty check set is an absence of evidence, never a pass.</div>
            : <div className="table-scroll"><table><thead><tr><th scope="col">Check</th><th scope="col">State</th><th scope="col">Reason</th></tr></thead><tbody>{safety.checks.map((check) => <tr key={check.checkCode}><td><strong>{formatCategory(check.checkCode)}</strong><small>{check.checkCode}</small></td><td><StatusPill value={check.state} /></td><td>{formatCategory(check.reasonCode)}</td></tr>)}</tbody></table></div>}
          <div className="timeline-heading"><p className="eyebrow">BLOCKED OPERATION CLASSES</p><span>What this surface refuses outright, named rather than implied by the policy grid.</span></div>
          <CodeChips label="Refused" codes={safety.blockedOperationClasses} tone="blocked" />
          <div className="data-grid"><DataRow label="Auth mode" value={formatCategory(safety.authMode)} tone="ready" /><DataRow label="Network posture" value={formatCategory(safety.networkPosture)} tone="ready" /></div>
        </article>

        <article className="panel">
          <div className="panel-heading"><div><p className="eyebrow">CONTINUITY</p><h2>Checkpoint posture</h2></div><StatusPill value={safety.continuity.state} /></div>
          <div className="scope-list"><span>State</span><strong className={`text-${statusTone(safety.continuity.state)}`}>{continuityValue}</strong><span>Branch</span><strong>{safety.continuity.branch ?? 'Not reported'}</strong><span>Head anchor</span><strong>{safety.continuity.headSha === null ? 'Not reported' : `${safety.continuity.headSha.slice(0, 7)}…`}</strong><span>Checkpoint receipt</span><strong>{safety.continuity.checkpointDigest === null ? 'Not reported' : 'Available'}</strong></div>
          <p className="small-note">Continuity is evidence about local state, not permission to expand campaign scope.</p>
        </article>

        {/* Service identity and the feature set this build actually serves.
            `meta` was fetched for one boolean (the review-write capability)
            and otherwise discarded, so the authorization class the server
            declares, the findings-storage class, and the feature flags that
            decide which routes exist were never visible anywhere. */}
        <article className="panel panel-full">
          <div className="panel-heading"><div><p className="eyebrow">SERVICE AUTHORITY</p><h2>What this build declares about itself</h2></div><StatusPill value={meta.readOnly ? 'READY' : 'BLOCKED'} label={`API ${meta.apiVersion}`} /></div>
          <div className="data-grid">
            <DataRow label="Authorization class" value={formatCategory(meta.authorizationClass)} tone="ready" />
            <DataRow label="Service" value={formatCategory(meta.service)} tone="neutral" />
            <DataRow label="Service scope" value={formatCategory(meta.scope)} tone="ready" />
            <DataRow label="Product contact (declared)" value={formatCategory(meta.productContact)} tone="ready" />
            <DataRow label="External network" value={formatCategory(meta.externalNetwork)} tone="ready" />
            <DataRow label="Findings storage" value={formatCategory(meta.findingsStorage)} tone="ready" />
            <DataRow label="Owner scope" value={formatCategory(meta.ownerScopeStatus)} tone="warning" />
            <DataRow label="Owner scope reason" value={formatCategory(meta.ownerScopeReason)} tone="warning" />
            <DataRow label="Local review decision" value={formatCategory(meta.localReviewDecision ?? 'DISABLED')} tone={meta.localReviewDecision === 'ENABLED' ? 'ready' : 'neutral'} />
            <DataRow label="Product readiness" value={formatCategory(health.productReadiness)} tone={statusTone(health.productReadiness)} />
            <DataRow label="Service status" value={formatCategory(health.status)} tone={statusTone(health.status)} />
            <DataRow label="Execution authority (declared)" value={formatCategory(meta.executionAuthority)} tone="ready" />
            <DataRow label="Mutation authority (declared)" value={formatCategory(meta.mutationAuthority)} tone="ready" />
          </div>
          <div className="timeline-heading"><p className="eyebrow">DECLARED LIMITS</p><span>The bounds this build enforces, quoted from its own declaration.</span></div>
          {limitEntries.length === 0
            ? <div className="mini-state mini-state-warning">No declared limits reported. The absence is not a default.</div>
            : <div className="data-grid">{limitEntries.map(([name, value]) => <DataRow key={name} label={formatWireName(name)} value={String(value)} />)}</div>}
          <div className="timeline-heading"><p className="eyebrow">FEATURES</p><span>A route that is off is not a route that passed.</span></div>
          {featureEntries.length === 0
            ? <div className="mini-state">No feature flags reported by this build.</div>
            : <div className="data-grid">{featureEntries.map(([name, enabled]) => <DataRow key={name} label={formatCategory(name)} value={enabled ? 'Enabled' : 'Disabled'} tone={enabled ? 'ready' : 'neutral'} />)}</div>}
        </article>

        <article className="panel">
          <div className="panel-heading"><div><p className="eyebrow">SOURCE SUMMARY</p><h2>Inventory currentness</h2></div><StatusPill value={source.state} /></div>
          <div className="metric-inline"><div><strong>{source.repositoryCount}</strong><span>repositories</span></div><div><strong>{source.surfaceCount}</strong><span>surfaces</span></div></div>
          {source.gapReasons.length > 0 ? <div className="callout callout-warning"><strong>Source inventory unavailable</strong><span>{source.gapReasons.length} bounded gap reason(s) are reported. No source proof is inferred.</span></div> : <div className="callout"><strong>Inventory has no reported gaps</strong><span>Check currentness and proof rollups before relying on a source view.</span></div>}
        </article>
      </section>
    </div>
  );
}

function Guardrail({ label, value }: { readonly label: string; readonly value: string }): ReactNode {
  const tone = value === 'NONE' || value === 'DISABLED' || value === 'READ_ONLY' || value === 'LOOPBACK_ONLY_EXTERNAL_EGRESS_DISABLED' ? 'ready' : 'neutral';
  return <div className="guardrail-row"><span className="guardrail-check" aria-hidden="true">✓</span><span>{label}</span><strong className={`text-${tone}`}>{formatCategory(value)}</strong></div>;
}

const LEVEL_ORDER = ['l1', 'l2', 'l3', 'l4'] as const;
const LEVEL_LABEL: Record<SystemMapLevelSegment, string> = { l1: 'Company', l2: 'Product', l3: 'Service', l4: 'Operation' };
/**
 * Three of the eight queries are questions ABOUT something: "why is this
 * unproven", "which handler does this control reach", "what touches this
 * service". Without a subject they have no answer, so the UI must not offer
 * them unselected — firing them anyway would put a 404 in front of the
 * operator where the honest response is "pick a node first".
 *
 * R-13 DEF-R13-5: presence is not enough — the KIND must fit, or the same
 * 404 trap opens one step later (an operation subject for a service
 * question). The trail focus counts as a subject only when its kind fits:
 * an L3 trail is a service context, an L2 trail is not a subject of
 * anything the queries can answer.
 */
const SUBJECT_KIND_BY_QUERY: Record<string, string> = {
  'why-unproven': 'HTTP_OPERATION',
  'ui-control-to-handler': 'FRONTEND_CONSUMER',
  'surfaces-touching-service': 'SERVICE',
};

const SUBJECT_NOUN_BY_QUERY: Record<string, string> = {
  'why-unproven': 'an operation',
  'ui-control-to-handler': 'a UI control',
  'surfaces-touching-service': 'a service',
};

const QUERY_LABEL: Record<SystemMapQuerySegment, string> = {
  'why-unproven': 'Why unproven?',
  'ui-control-to-handler': 'UI control → handler',
  'surfaces-touching-service': 'Surfaces touching service',
  'observed-production-paths': 'Observed production paths',
  'mutation-capable-routes': 'Mutation-capable routes',
  'untested-read-only-routes': 'Untested read-only routes',
  'coverage-gaps': 'Coverage gaps',
  'findings-attached-to-topology': 'Findings attached to topology',
};

/**
 * Render a ProjectionBound without inventing certainty. A null total is shown as
 * "unknown", never as a number, and a truncation whose remainder is unknown says
 * so instead of implying the operator has seen everything worth seeing.
 */
function BoundNote({ label, bound }: { readonly label: string; readonly bound: SystemMapBound }): ReactNode {
  const total = bound.total === null ? 'unknown' : String(bound.total);
  const dropped = bound.dropped === null ? 'unknown' : String(bound.dropped);
  return (
    <span className="bound-note" data-testid={`bound-${label.toLowerCase()}`}>
      <strong>{label}</strong> {bound.projected} shown / {total} total · limit {bound.limit}
      {bound.truncated ? <em className="bound-truncated"> · truncated, {dropped} not shown{bound.remainingUnknown ? ' (remainder unknown)' : ''}</em> : null}
    </span>
  );
}

function SystemMapView({ refreshKey }: { readonly refreshKey: number }): ReactNode {
  const [trail, setTrail] = useState<readonly { readonly level: SystemMapLevelSegment; readonly focusId: string | null; readonly label: string }[]>([{ level: 'l1', focusId: null, label: 'Company' }]);
  const [query, setQuery] = useState<SystemMapQuerySegment | null>(null);
  const [queryFocusId, setQueryFocusId] = useState<string | null>(null);
  const [state, setState] = useState<DataLoadState<SystemMapSnapshot>>({ kind: 'idle' });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [evidenceFilter, setEvidenceFilter] = useState('ALL');
  const [view, setView] = useState({ scale: 1, tx: 0, ty: 0 });
  const [drag, setDrag] = useState<{ readonly x: number; readonly y: number } | null>(null);

  const current = trail[trail.length - 1];

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setState({ kind: 'loading' });
    const request = query === null
      ? loadSystemMapLevel(current.level, current.focusId, controller.signal)
      : loadSystemMapQuery(query, queryFocusId, controller.signal);
    request.then((data) => { if (!cancelled) setState({ kind: 'ready', data }); }).catch((error: unknown) => {
      if (!cancelled) { void apiErrorLabel(error); setState({ kind: 'error' }); }
    });
    return () => { cancelled = true; controller.abort(); };
  }, [current.level, current.focusId, query, queryFocusId, refreshKey]);

  const goBack = useCallback((): void => {
    setSelectedNodeId(null);
    if (query !== null) { setQuery(null); return; }
    setTrail((entries) => (entries.length > 1 ? entries.slice(0, -1) : entries));
  }, [query]);

  // R-13 DEF-R13-5: only one node kind per level resolves to the next
  // disclosure (PRODUCT at L1, SERVICE at L2, HTTP_OPERATION at L3 — the
  // operation node's kind string, not OPERATION). Drilling any other kind
  // would request a focus the transport refuses, stranding the operator on
  // an error view with no breadcrumb. The same predicate gates the
  // detail-panel button below, so the two stay in lockstep.
  const drillTargetKind = current.level === 'l1' ? 'PRODUCT' : current.level === 'l2' ? 'SERVICE' : current.level === 'l3' ? 'HTTP_OPERATION' : null;
  const drillInto = useCallback((node: SystemMapNodeView): void => {
    setSelectedNodeId(node.nodeId);
    if (query !== null || drillTargetKind === null || node.kind !== drillTargetKind) return;
    const index = LEVEL_ORDER.indexOf(current.level);
    if (index < 0 || index >= LEVEL_ORDER.length - 1) return;
    const next = LEVEL_ORDER[index + 1];
    setTrail((entries) => [...entries, { level: next, focusId: node.nodeId, label: node.label }]);
    setView({ scale: 1, tx: 0, ty: 0 });
  }, [current.level, drillTargetKind, query]);

  const nodes = state.kind === 'ready' ? state.data.nodes : [];
  const term = search.trim().toLowerCase();
  const visible = nodes.filter((node) => {
    if (evidenceFilter !== 'ALL' && node.evidenceStatus !== evidenceFilter) return false;
    if (term === '') return true;
    return node.label.toLowerCase().includes(term) || node.nodeId.toLowerCase().includes(term);
  });
  const visibleIds = new Set(visible.map((node) => node.nodeId));
  const edges = state.kind === 'ready' ? state.data.edges.filter((edge) => visibleIds.has(edge.fromNodeId) && visibleIds.has(edge.toNodeId)) : [];
  const evidenceOptions = ['ALL', ...Array.from(new Set(nodes.map((node) => node.evidenceStatus))).sort()];

  const onKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape' || event.key === 'Backspace') { event.preventDefault(); goBack(); return; }
    if (event.key === '+' || event.key === '=') { event.preventDefault(); setView((v) => ({ ...v, scale: Math.min(4, v.scale * 1.2) })); return; }
    if (event.key === '-') { event.preventDefault(); setView((v) => ({ ...v, scale: Math.max(0.25, v.scale / 1.2) })); return; }
    if (event.key === '0') { event.preventDefault(); setView({ scale: 1, tx: 0, ty: 0 }); return; }
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      if (visible.length === 0) return;
      event.preventDefault();
      const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
      const at = visible.findIndex((node) => node.nodeId === selectedNodeId);
      const next = at < 0 ? (step === 1 ? 0 : visible.length - 1) : (at + step + visible.length) % visible.length;
      setSelectedNodeId(visible[next].nodeId);
      return;
    }
    if (event.key === 'Enter') {
      const node = visible.find((entry) => entry.nodeId === selectedNodeId);
      if (node !== undefined) { event.preventDefault(); drillInto(node); }
    }
  }, [drillInto, goBack, selectedNodeId, visible]);

  if (state.kind === 'loading' || state.kind === 'idle') return <LoadingState />;
  if (state.kind === 'error') return <ErrorState onRetry={() => setState({ kind: 'idle' })} />;

  const map = state.data;
  const selected = visible.find((node) => node.nodeId === selectedNodeId) ?? null;
  const xs = visible.map((node) => node.x);
  const ys = visible.map((node) => node.y);
  const minX = xs.length > 0 ? Math.min(...xs) - 60 : 0;
  const minY = ys.length > 0 ? Math.min(...ys) - 40 : 0;
  const width = xs.length > 0 ? Math.max(...xs) - minX + 60 : 100;
  const height = ys.length > 0 ? Math.max(...ys) - minY + 40 : 100;

  return (
    <section className="panel system-map-panel" aria-label="System map">
      <nav className="system-map-breadcrumb" aria-label="Disclosure level">
        {trail.map((entry, index) => (
          <span key={`${entry.level}:${entry.focusId ?? 'root'}`}>
            {index > 0 ? <span aria-hidden="true"> / </span> : null}
            <button type="button" className="crumb" disabled={index === trail.length - 1 && query === null}
              onClick={() => { setQuery(null); setSelectedNodeId(null); setTrail((entries) => entries.slice(0, index + 1)); }}>
              {LEVEL_LABEL[entry.level]}{entry.focusId === null ? '' : `: ${entry.label}`}
            </button>
          </span>
        ))}
        {query !== null ? <span> / <strong>{QUERY_LABEL[query]}</strong></span> : null}
      </nav>

      <div className="system-map-queries" role="group" aria-label="Operator queries">
        {SYSTEM_MAP_QUERY_SEGMENTS.map((segment) => {
          const requiredKind = SUBJECT_KIND_BY_QUERY[segment] ?? null;
          const selectedKind = selectedNodeId === null ? null : nodes.find((node) => node.nodeId === selectedNodeId)?.kind ?? null;
          const trailKind = current.level === 'l2' ? 'PRODUCT' : current.level === 'l3' ? 'SERVICE' : current.level === 'l4' ? 'HTTP_OPERATION' : null;
          const subjectKind = selectedKind ?? trailKind;
          const subject = selectedNodeId ?? current.focusId;
          const blocked = requiredKind !== null && subjectKind !== requiredKind;
          const noun = SUBJECT_NOUN_BY_QUERY[segment];
          return (
            <button key={segment} type="button" className={`chip ${query === segment ? 'chip-active' : ''}`}
              aria-pressed={query === segment} disabled={blocked}
              title={requiredKind === null ? undefined : subjectKind === null ? 'Select a node first — this query needs a subject.' : blocked && noun !== undefined ? `Select ${noun} first — this query answers about ${noun}s.` : undefined}
              onClick={() => {
                setQueryFocusId(requiredKind !== null ? subject : null);
                setSelectedNodeId(null);
                setQuery((active) => (active === segment ? null : segment));
              }}>
              {QUERY_LABEL[segment]}
            </button>
          );
        })}
      </div>

      <div className="system-map-controls">
        <label className="field"><span>Search</span>
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="node label or id" aria-label="Search nodes" />
        </label>
        <label className="field"><span>Evidence</span>
          <select value={evidenceFilter} onChange={(event) => setEvidenceFilter(event.target.value)} aria-label="Filter by evidence status">
            {evidenceOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <button type="button" className="chip" onClick={goBack} disabled={trail.length === 1 && query === null}>Back</button>
        <span className="hint">Drag to pan · wheel to zoom · +/-/0 · arrows select · Enter drills · Esc back</span>
      </div>

      {map.measurement === 'UNMEASURED' ? (
        <p className="banner banner-warn" data-testid="measurement-banner">
          UNMEASURED — this result was never measured. An empty list here is an absence of measurement, not a clean result.
        </p>
      ) : null}

      <p className="system-map-bounds">
        <BoundNote label="Nodes" bound={map.nodeBound} />
        <BoundNote label="Edges" bound={map.edgeBound} />
        <span className="bound-note">showing {visible.length} after filter</span>
      </p>

      <div className="system-map-canvas" tabIndex={0} role="application" aria-label={`${LEVEL_LABEL[current.level]} level graph`} onKeyDown={onKeyDown}
        onPointerDown={(event) => setDrag({ x: event.clientX - view.tx, y: event.clientY - view.ty })}
        onPointerMove={(event) => { if (drag !== null) setView((v) => ({ ...v, tx: event.clientX - drag.x, ty: event.clientY - drag.y })); }}
        onPointerUp={() => setDrag(null)} onPointerLeave={() => setDrag(null)}
        onWheel={(event) => setView((v) => ({ ...v, scale: Math.min(4, Math.max(0.25, v.scale * (event.deltaY < 0 ? 1.1 : 1 / 1.1))) }))}>
        {visible.length === 0 ? <p className="empty-state">No nodes at this level match the current filter.</p> : (
          <svg viewBox={`${minX} ${minY} ${width} ${height}`} role="img" aria-label="System map graph" style={{ transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})` }}>
            {edges.map((edge) => {
              const from = visible.find((node) => node.nodeId === edge.fromNodeId);
              const to = visible.find((node) => node.nodeId === edge.toNodeId);
              if (from === undefined || to === undefined) return null;
              return <line key={edge.edgeId} x1={from.x} y1={from.y} x2={to.x} y2={to.y} className={`map-edge edge-${edge.evidenceStatus.toLowerCase()}`} />;
            })}
            {visible.map((node) => (
              <g key={node.nodeId} className={`map-node node-${node.evidenceStatus.toLowerCase()} ${selectedNodeId === node.nodeId ? 'node-selected' : ''}`}
                transform={`translate(${node.x}, ${node.y})`} role="button" tabIndex={-1}
                aria-label={`${node.label}, ${node.evidenceStatus}, ${node.factCategory}`}
                onClick={() => setSelectedNodeId(node.nodeId)} onDoubleClick={() => drillInto(node)}>
                {/* A 7px dot is too small to hit, and the group's centre can
                    land on the label, which takes no pointer events. This
                    transparent disc is the actual target. */}
                <circle className="map-node-hit" r={16} />
                <circle r={7} />
                <text x={11} y={4}>{node.label}</text>
              </g>
            ))}
          </svg>
        )}
      </div>

      {selected !== null ? (
        <div className="system-map-detail" aria-live="polite">
          <h3>{selected.label}</h3>
          <dl>
            <div><dt>Node</dt><dd>{selected.nodeId}</dd></div>
            <div><dt>Kind</dt><dd>{selected.kind}</dd></div>
            <div><dt>Fact category</dt><dd>{selected.factCategory}</dd></div>
            <div><dt>Evidence</dt><dd>{selected.evidenceStatus}</dd></div>
            <div><dt>Coverage</dt><dd>{selected.coverageState}</dd></div>
          </dl>
          {drillTargetKind !== null && selected.kind === drillTargetKind && query === null ? <button type="button" className="chip" onClick={() => drillInto(selected)}>Drill into {LEVEL_LABEL[LEVEL_ORDER[LEVEL_ORDER.indexOf(current.level) + 1]]}</button> : null}
        </div>
      ) : null}

      {map.blockingChain !== undefined && map.blockingChain.length > 0 ? (
        <ol className="blocking-chain" aria-label="Blocking chain">
          {map.blockingChain.map((stage) => <li key={stage.stage}><strong>{stage.stage}</strong>{stage.reason === null ? '' : ` — ${stage.reason}`}</li>)}
        </ol>
      ) : null}

      <footer className="system-map-provenance">
        <span>layout {map.layout.engineId} {map.layout.engineVersion}</span>
        <span>projection {map.layout.projectionVersion}</span>
        <span>graph {map.layout.graphDigest}</span>
        <span>layout digest {map.layout.layoutDigest}</span>
        <span data-testid="map-authority">execution {map.executionAuthority} · mutation {map.mutationAuthority}</span>
      </footer>
    </section>
  );
}

export function PlaceholderView({ view }: { readonly view: (typeof VIEW_DEFINITIONS)[number] }): ReactNode {
  return (
    <div className="empty-view">
      <div className="empty-mark"><Icon name={view.id} /></div>
      <p className="eyebrow">{view.eyebrow}</p>
      <h1>{view.label}</h1>
      <p>{view.description}</p>
      <div className="empty-status"><StatusPill value="NOT_REPORTED" label="Snapshot not connected" /><span>This read-only surface will show only bounded, sanitized local data.</span></div>
    </div>
  );
}

function DashboardApp(): ReactNode {
  const [activeView, setActiveView] = useState<ViewId>(() => readViewFromHash());
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadState, setLoadState] = useState<OverviewLoadState>({ kind: 'loading' });
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  // NW-10. Paged, so the operator can reach past the first page of each list.
  const runsPaged = usePagedCollection<RunListSnapshot, RunListSnapshot['items'][number]>({
    active: activeView === 'runs',
    refreshKey,
    load: useCallback((cursor: string | null, signal: AbortSignal) => loadRuns(20, cursor, signal), []),
    identity: useCallback((item: RunListSnapshot['items'][number]) => item.runId, []),
  });
  const runState = runsPaged.state;
  const [detailState, setDetailState] = useState<DataLoadState<RunDetailSnapshot>>({ kind: 'idle' });
  const [timelineState, setTimelineState] = useState<DataLoadState<TimelineSnapshot>>({ kind: 'idle' });
  const [graphState, setGraphState] = useState<DataLoadState<ExecutionGraphSnapshot>>({ kind: 'idle' });
  const [campaignSummaryState, setCampaignSummaryState] = useState<DataLoadState<CampaignSummarySnapshot>>({ kind: 'idle' });
  const coveragePaged = usePagedCollection<CampaignCoverageSnapshot, CampaignCoverageSnapshot['items'][number]>({
    active: activeView === 'campaigns',
    refreshKey,
    load: useCallback((cursor: string | null, signal: AbortSignal) => loadCampaignCoverage(50, cursor, signal), []),
    identity: useCallback((item: CampaignCoverageSnapshot['items'][number]) => item.memberId, []),
  });
  const campaignCoverageState = coveragePaged.state;
  const [selectedSurfaceId, setSelectedSurfaceId] = useState<string | null>(null);
  const surfacesPaged = usePagedCollection<SourceSurfacesSnapshot, SourceSurfaceSnapshot>({
    active: activeView === 'source-intelligence',
    refreshKey,
    load: useCallback((cursor: string | null, signal: AbortSignal) => loadSourceSurfaces(50, cursor, signal), []),
    identity: useCallback((item: SourceSurfaceSnapshot) => item.surfaceId, []),
  });
  const sourceSurfaceState = surfacesPaged.state;
  const [sourceGraphState, setSourceGraphState] = useState<DataLoadState<SourceGraphSnapshot>>({ kind: 'idle' });
  const findingsPaged = usePagedCollection<FindingsSnapshot, FindingsSnapshot['items'][number]>({
    active: activeView === 'findings',
    refreshKey,
    load: useCallback((cursor: string | null, signal: AbortSignal) => loadFindings(50, cursor, signal), []),
    identity: useCallback((item: FindingsSnapshot['items'][number]) => item.findingId, []),
  });
  const findingsState = findingsPaged.state;
  const reviewerPaged = usePagedCollection<ReviewerSnapshot, ReviewerFindingSnapshot>({
    active: activeView === 'reviewer',
    refreshKey,
    load: useCallback((cursor: string | null, signal: AbortSignal) => loadReviewer(50, cursor, signal), []),
    identity: useCallback((item: ReviewerFindingSnapshot) => item.findingId, []),
  });
  const reviewerState = reviewerPaged.state;
  const refresh = useCallback((): void => setRefreshKey((value) => value + 1), []);

  useEffect(() => {
    const onHashChange = (): void => setActiveView(readViewFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setLoadState({ kind: 'loading' });
    loadOverview(controller.signal).then((data) => {
      if (!cancelled) setLoadState({ kind: 'ready', data });
    }).catch((error: unknown) => {
      if (!cancelled) {
        void apiErrorLabel(error);
        setLoadState({ kind: 'error' });
      }
    });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [refreshKey]);

  useEffect(() => subscribeToControlCenterEvents(() => setRefreshKey((value) => value + 1)), []);

  useEffect(() => {
    if (activeView !== 'source-intelligence' || selectedSurfaceId === null) return;
    let cancelled = false;
    const controller = new AbortController();
    setSourceGraphState({ kind: 'loading' });
    loadSourceGraph(selectedSurfaceId, 2, controller.signal).then((data) => {
      if (!cancelled) setSourceGraphState({ kind: 'ready', data });
    }).catch((error: unknown) => {
      if (!cancelled) {
        void apiErrorLabel(error);
        setSourceGraphState({ kind: 'error' });
      }
    });
    return () => { cancelled = true; controller.abort(); };
  }, [activeView, refreshKey, selectedSurfaceId]);

  useEffect(() => {
    if (activeView !== 'runs' || selectedRunId === null) return;
    let cancelled = false;
    const controller = new AbortController();
    setDetailState({ kind: 'loading' });
    setTimelineState({ kind: 'loading' });
    Promise.all([
      loadRunDetail(selectedRunId, controller.signal),
      loadTimeline(selectedRunId, 0, controller.signal),
    ]).then(([detail, timeline]) => {
      if (!cancelled) {
        setDetailState({ kind: 'ready', data: detail });
        setTimelineState({ kind: 'ready', data: timeline });
      }
    }).catch((error: unknown) => {
      if (!cancelled) {
        void apiErrorLabel(error);
        setDetailState({ kind: 'error' });
        setTimelineState({ kind: 'error' });
      }
    });
    return () => { cancelled = true; controller.abort(); };
  }, [activeView, refreshKey, selectedRunId]);

  useEffect(() => {
    if (activeView !== 'campaigns') return;
    let cancelled = false;
    const controller = new AbortController();
    setCampaignSummaryState({ kind: 'loading' });
    loadCampaignSummary(controller.signal).then((summary) => {
      if (!cancelled) setCampaignSummaryState({ kind: 'ready', data: summary });
    }).catch((error: unknown) => {
      if (!cancelled) {
        void apiErrorLabel(error);
        setCampaignSummaryState({ kind: 'error' });
      }
    });
    return () => { cancelled = true; controller.abort(); };
  }, [activeView, refreshKey]);

  useEffect(() => {
    if (activeView !== 'execution-graph' || selectedRunId === null) return;
    let cancelled = false;
    const controller = new AbortController();
    setGraphState({ kind: 'loading' });
    loadExecutionGraph(selectedRunId, controller.signal).then((data) => {
      if (!cancelled) setGraphState({ kind: 'ready', data });
    }).catch((error: unknown) => {
      if (!cancelled) {
        void apiErrorLabel(error);
        setGraphState({ kind: 'error' });
      }
    });
    return () => { cancelled = true; controller.abort(); };
  }, [activeView, refreshKey, selectedRunId]);

  const navigate = useCallback((view: ViewId): void => {
    window.location.hash = view === 'overview' ? '' : view;
    setActiveView(view);
  }, []);
  const currentView = VIEW_DEFINITIONS.find((view) => view.id === activeView) ?? VIEW_DEFINITIONS[0];
  const retryRunData = useCallback((): void => setRefreshKey((value) => value + 1), []);
  const selectRun = useCallback((runId: string): void => setSelectedRunId(runId), []);
  const selectSurface = useCallback((surfaceId: string): void => setSelectedSurfaceId(surfaceId), []);

  const renderDataView = (): ReactNode => {
    // NW-10. The continuation control is rendered at the view boundary, so
    // each bounded list gains a way past its first page without the dense
    // view components changing how they read `items`.
    if (activeView === 'runs') return <>
      <RunsView state={runState} selectedRunId={selectedRunId} detailState={detailState} timelineState={timelineState} onSelectRun={selectRun} onRetry={retryRunData} />
      <LoadMoreControl label="runs" loaded={runState.kind === 'ready' ? runState.data.items.length : 0} paged={runsPaged} />
    </>;
    if (activeView === 'execution-graph') return <ExecutionGraphView selectedRunId={selectedRunId} state={graphState} onRetry={retryRunData} />;
    if (activeView === 'campaigns') return <>
      <CampaignView summaryState={campaignSummaryState} coverageState={campaignCoverageState} onRetry={retryRunData} />
      <LoadMoreControl label="coverage rows" loaded={campaignCoverageState.kind === 'ready' ? campaignCoverageState.data.items.length : 0} paged={coveragePaged} />
    </>;
    if (activeView === 'findings') return <>
      <FindingsView state={findingsState} onRetry={retryRunData} />
      <LoadMoreControl label="findings" loaded={findingsState.kind === 'ready' ? findingsState.data.items.length : 0} paged={findingsPaged} />
    </>;
    if (activeView === 'reviewer') {
      // Fails closed while the overview is still loading or errored, and when
      // an older server omits the field entirely.
      const capability = loadState.kind === 'ready' ? loadState.data.meta.localReviewDecision ?? 'DISABLED' : 'UNKNOWN';
      return <>
        <ReviewerView state={reviewerState} capability={capability} onRetry={retryRunData} />
        <LoadMoreControl label="reviewer findings" loaded={reviewerState.kind === 'ready' ? reviewerState.data.items.length : 0} paged={reviewerPaged} />
      </>;
    }
    if (activeView === 'system-map') return <SystemMapView refreshKey={refreshKey} />;
    if (activeView === 'source-intelligence') {
      if (loadState.kind === 'loading') return <LoadingState />;
      if (loadState.kind === 'error') return <ErrorState onRetry={refresh} />;
      return <>
        <SourceView summary={loadState.data.source} surfaceState={sourceSurfaceState} graphState={sourceGraphState} selectedSurfaceId={selectedSurfaceId} onSelectSurface={selectSurface} onRetry={retryRunData} limits={loadState.data.meta.limits} />
        <LoadMoreControl label="source surfaces" loaded={sourceSurfaceState.kind === 'ready' ? sourceSurfaceState.data.items.length : 0} paged={surfacesPaged} />
      </>;
    }
    if (loadState.kind === 'loading') return <LoadingState />;
    if (loadState.kind === 'error') return <ErrorState onRetry={refresh} />;
    if (activeView === 'overview') return <OverviewView data={loadState.data} onRefresh={refresh} />;
    if (activeView === 'safety') return <SafetyView data={loadState.data} />;
    return <PlaceholderView view={currentView} />;
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <aside className="sidebar" aria-label="Control Center navigation">
        <div className="brand"><div className="brand-mark" aria-hidden="true"><span>NW</span></div><div><strong>nightwatch</strong><span>control center</span></div></div>
        <div className="sidebar-rule" />
        <nav className="primary-nav" aria-label="Primary">
          <p className="nav-label">Workspace</p>
          {VIEW_DEFINITIONS.map((view) => <a key={view.id} className={`nav-item ${activeView === view.id ? 'nav-item-active' : ''}`} href={view.id === 'overview' ? '#' : `#${view.id}`} aria-current={activeView === view.id ? 'page' : undefined} onClick={() => navigate(view.id)}><Icon name={view.id} /><span>{view.label}</span>{activeView === view.id ? <span className="nav-active-bar" aria-hidden="true" /> : null}</a>)}
        </nav>
        <div className="sidebar-footer"><div className="posture-indicator"><span className="pulse-dot" aria-hidden="true" /><div><strong>Local only</strong><span>External egress disabled</span></div></div><span className="version-tag">API v1</span></div>
      </aside>
      <main id="main-content" className="main-content">
        <header className="topbar"><div><p className="topbar-kicker">{currentView.eyebrow}</p><p className="topbar-context">Nightwatch / <strong>{currentView.label}</strong></p></div><div className="topbar-actions"><span className="read-only-tag"><span aria-hidden="true">◉</span> Read-only session</span><button className="icon-button" type="button" onClick={refresh} aria-label="Refresh local snapshots" title="Refresh local snapshots"><Icon name="refresh" /></button></div></header>
        <div className="content-wrap">
          {renderDataView()}
        </div>
        <footer className="page-footer"><span>Nightwatch local Control Center</span><span>Read-only · Loopback · No external network</span></footer>
      </main>
    </div>
  );
}

export function App(): ReactNode {
  return <ControlCenterErrorBoundary><DashboardApp /></ControlCenterErrorBoundary>;
}
