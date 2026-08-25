import { Component, useCallback, useEffect, useState, type ErrorInfo, type ReactNode } from 'react';
import { apiErrorLabel, loadOverview } from './api';
import type { OverviewLoadState, OverviewSnapshot, ViewId } from './types';
import { VIEW_DEFINITIONS } from './types';

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

type StatusTone = 'ready' | 'warning' | 'blocked' | 'neutral';

function statusTone(value: string): StatusTone {
  if (value === 'READY' || value === 'HEALTHY' || value === 'UP' || value === 'CURRENT' || value === 'PASS') return 'ready';
  if (value === 'WARNING' || value === 'UNKNOWN' || value === 'NOT_REPORTED' || value === 'NOT_APPLICABLE') return 'warning';
  if (value.startsWith('BLOCKED') || value === 'FAILED' || value === 'FAIL') return 'blocked';
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
          <div className="hero-actions"><StatusPill value={data.health.scope} label="Loopback only" /><StatusPill value={data.meta.readOnly ? 'READY' : 'BLOCKED'} label={data.meta.readOnly ? 'Read only' : 'Unavailable'} /><button className="button button-quiet" type="button" onClick={onRefresh}><Icon name="refresh" />Refresh</button></div>
        </div>
        <div className="hero-orbit" aria-hidden="true"><div className="orbit-ring orbit-ring-outer" /><div className="orbit-ring orbit-ring-inner" /><div className="orbit-core"><span>NW</span><small>LOCAL</small></div></div>
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
          <div className="panel-heading"><div><p className="eyebrow">OWNER SCOPE</p><h2>Frozen boundaries</h2></div><span className="scope-lock" aria-label="Owner scope locked">LOCKED</span></div>
          <p className="panel-intro">Infrastructure and data-layer operations remain outside this campaign’s authority.</p>
          <div className="scope-list"><span>Product contact</span><strong>Disabled</strong><span>Database / infrastructure</span><strong>Out of scope</strong><span>Findings storage</span><strong>Owner local only</strong></div>
        </article>
      </section>
    </div>
  );
}

function Guardrail({ label, value }: { readonly label: string; readonly value: string }): ReactNode {
  const tone = value === 'NONE' || value === 'DISABLED' || value === 'READ_ONLY' || value === 'LOOPBACK_ONLY_EXTERNAL_EGRESS_DISABLED' ? 'ready' : 'neutral';
  return <div className="guardrail-row"><span className="guardrail-check" aria-hidden="true">✓</span><span>{label}</span><strong className={`text-${tone}`}>{formatCategory(value)}</strong></div>;
}

function PlaceholderView({ view }: { readonly view: (typeof VIEW_DEFINITIONS)[number] }): ReactNode {
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

  useEffect(() => {
    const onHashChange = (): void => setActiveView(readViewFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadState({ kind: 'loading' });
    loadOverview().then((data) => {
      if (!cancelled) setLoadState({ kind: 'ready', data });
    }).catch((error: unknown) => {
      if (!cancelled) {
        void apiErrorLabel(error);
        setLoadState({ kind: 'error' });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const navigate = useCallback((view: ViewId): void => {
    window.location.hash = view === 'overview' ? '' : view;
    setActiveView(view);
  }, []);
  const refresh = useCallback((): void => setRefreshKey((value) => value + 1), []);
  const currentView = VIEW_DEFINITIONS.find((view) => view.id === activeView) ?? VIEW_DEFINITIONS[0];

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
          {activeView === 'overview' ? (loadState.kind === 'loading' ? <LoadingState /> : loadState.kind === 'error' ? <ErrorState onRetry={refresh} /> : <OverviewView data={loadState.data} onRefresh={refresh} />) : <PlaceholderView view={currentView} />}
        </div>
        <footer className="page-footer"><span>Nightwatch local Control Center</span><span>Read-only · Loopback · No external network</span></footer>
      </main>
    </div>
  );
}

export function App(): ReactNode {
  return <ControlCenterErrorBoundary><DashboardApp /></ControlCenterErrorBoundary>;
}
