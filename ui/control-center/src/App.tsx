import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  loadCampaignCoverage,
  loadCampaignSummary,
  loadExecutionGraph,
  loadFindings,
  loadOverviewSources,
  loadReviewer,
  loadRunDetail,
  loadRuns,
  loadSourceGraph,
  loadSourceSurfaces,
  loadTimeline,
  subscribeToControlCenterEvents,
  toApiErrorInfo,
  UNCLASSIFIED_API_ERROR,
} from './api';
import type {
  ApiErrorInfo,
  CampaignCoverageSnapshot,
  CampaignSummarySnapshot,
  DataLoadState,
  ExecutionGraphSnapshot,
  FindingsSnapshot,
  OverviewLoadState,
  OverviewSnapshot,
  OverviewSourceStates,
  ReviewerFindingSnapshot,
  ReviewerSnapshot,
  RunDetailSnapshot,
  RunListSnapshot,
  SourceGraphSnapshot,
  SourceSurfaceSnapshot,
  SourceSurfacesSnapshot,
  TimelineSnapshot,
  ViewId,
} from './types';
import { VIEW_DEFINITIONS } from './types';
import { ControlCenterErrorBoundary, ErrorState, Icon, LoadMoreControl, LoadingState, usePagedCollection } from './shared';
import { OverviewView, OverviewPartialView } from './views/OverviewView';
import { RunsView } from './views/RunsView';
import { ExecutionGraphView } from './views/ExecutionGraphView';
import { SourceView } from './views/SourceView';
import { FindingsView } from './views/FindingsView';
import { ReviewerView } from './views/ReviewerView';
import { CampaignView } from './views/CampaignView';
import { SafetyView } from './views/SafetyView';
import { SystemMapView } from './views/SystemMapView';
import { PlaceholderView } from './views/PlaceholderView';


function readViewFromHash(): ViewId {
  if (typeof window === 'undefined') return 'overview';
  const candidate = window.location.hash.slice(1);
  return VIEW_DEFINITIONS.some((view) => view.id === candidate) ? (candidate as ViewId) : 'overview';
}

/**
 * F-18. The first failure a whole-view error panel can name. An ABORTED
 * source is normal navigation, so it is skipped unless it is the only class
 * of failure available.
 */
function firstFailure(states: readonly DataLoadState<unknown>[]): ApiErrorInfo {
  let aborted: ApiErrorInfo = UNCLASSIFIED_API_ERROR;
  for (const state of states) {
    if (state.kind !== 'error') continue;
    const info = state.error ?? UNCLASSIFIED_API_ERROR;
    if (info.kind !== 'ABORTED') return info;
    aborted = info;
  }
  return aborted;
}

function sourceStates(sources: OverviewSourceStates): readonly DataLoadState<unknown>[] {
  return [sources.health, sources.meta, sources.readiness, sources.safety, sources.source];
}

function overviewSnapshot(sources: OverviewSourceStates): OverviewSnapshot | null {
  if (sources.health.kind !== 'ready' || sources.meta.kind !== 'ready' || sources.readiness.kind !== 'ready' || sources.safety.kind !== 'ready' || sources.source.kind !== 'ready') return null;
  return {
    health: sources.health.data,
    meta: sources.meta.data,
    readiness: sources.readiness.data,
    safety: sources.safety.data,
    source: sources.source.data,
  };
}


function DashboardApp(): ReactNode {
  const [activeView, setActiveView] = useState<ViewId>(() => readViewFromHash());
  const mainRef = useRef<HTMLElement>(null);
  // Set only by user navigation, so an initial load or a background refresh
  // never steals focus from an operator who is reading.
  const announceNavigationRef = useRef(false);
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
    const onHashChange = (): void => {
      announceNavigationRef.current = true;
      setActiveView(readViewFromHash());
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setLoadState({ kind: 'loading' });
    // F-18. The five sources settle independently: a partial failure renders
    // what answered and names what did not, and only total failure is a
    // whole-view error state.
    loadOverviewSources(controller.signal).then((sources) => {
      if (cancelled) return;
      const data = overviewSnapshot(sources);
      if (data !== null) {
        setLoadState({ kind: 'ready', data });
        return;
      }
      const states = sourceStates(sources);
      if (states.every((state) => state.kind === 'error')) setLoadState({ kind: 'error', error: firstFailure(states) });
      else setLoadState({ kind: 'partial', sources });
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
        const info = toApiErrorInfo(error);
        if (info.kind === 'ABORTED') return;
        setSourceGraphState({ kind: 'error', error: info });
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
        const info = toApiErrorInfo(error);
        if (info.kind === 'ABORTED') return;
        setDetailState({ kind: 'error', error: info });
        setTimelineState({ kind: 'error', error: info });
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
        const info = toApiErrorInfo(error);
        if (info.kind === 'ABORTED') return;
        setCampaignSummaryState({ kind: 'error', error: info });
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
        const info = toApiErrorInfo(error);
        if (info.kind === 'ABORTED') return;
        setGraphState({ kind: 'error', error: info });
      }
    });
    return () => { cancelled = true; controller.abort(); };
  }, [activeView, refreshKey, selectedRunId]);

  const navigate = useCallback((view: ViewId): void => {
    announceNavigationRef.current = true;
    window.location.hash = view === 'overview' ? '' : view;
    setActiveView(view);
  }, []);
  const currentView = VIEW_DEFINITIONS.find((view) => view.id === activeView) ?? VIEW_DEFINITIONS[0];

  // A view change names itself in the document title and, when the operator
  // caused it, moves focus to the main content so assistive technology
  // announces where they are rather than leaving them on the nav link.
  useEffect(() => {
    document.title = `Nightwatch Control Center — ${currentView.label}`;
    if (!announceNavigationRef.current) return;
    announceNavigationRef.current = false;
    mainRef.current?.focus({ preventScroll: true });
  }, [currentView]);
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
      // The source view needs the source summary and the declared limits, so
      // a partial overview that lost either is a whole-view error here for
      // now; the failed kind and action are still named by the panel.
      if (loadState.kind === 'partial') return <ErrorState error={firstFailure(sourceStates(loadState.sources))} onRetry={refresh} />;
      if (loadState.kind === 'error') return <ErrorState error={loadState.error} onRetry={refresh} />;
      return <>
        <SourceView summary={loadState.data.source} surfaceState={sourceSurfaceState} graphState={sourceGraphState} selectedSurfaceId={selectedSurfaceId} onSelectSurface={selectSurface} onRetry={retryRunData} limits={loadState.data.meta.limits} />
        <LoadMoreControl label="source surfaces" loaded={sourceSurfaceState.kind === 'ready' ? sourceSurfaceState.data.items.length : 0} paged={surfacesPaged} />
      </>;
    }
    if (loadState.kind === 'loading') return <LoadingState />;
    if (loadState.kind === 'partial') {
      if (activeView === 'overview') return <OverviewPartialView sources={loadState.sources} onRefresh={refresh} />;
      return <ErrorState error={firstFailure(sourceStates(loadState.sources))} onRetry={refresh} />;
    }
    if (loadState.kind === 'error') return <ErrorState error={loadState.error} onRetry={refresh} />;
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
      <main id="main-content" className="main-content" tabIndex={-1} ref={mainRef}>
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

