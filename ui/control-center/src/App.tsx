import { Component, useCallback, useEffect, useState, type ErrorInfo, type ReactNode } from 'react';
import { apiErrorLabel, loadExecutionGraph, loadOverview, loadRunDetail, loadRuns, loadTimeline, subscribeToControlCenterEvents } from './api';
import type { DataLoadState, ExecutionGraphSnapshot, OverviewLoadState, OverviewSnapshot, RunDetailSnapshot, RunListSnapshot, TimelineSnapshot, ViewId } from './types';
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
  if (value === 'WARNING' || value === 'UNKNOWN' || value === 'NOT_REPORTED' || value === 'NOT_APPLICABLE' || value === 'ORACLE_ONLY' || value === 'INCOMPLETE' || value === 'STALE' || value === 'UNAVAILABLE') return 'warning';
  if (value.startsWith('BLOCKED') || value === 'FAILED' || value === 'FAIL' || value === 'SAFETY_FAILURE') return 'blocked';
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
          <div className="panel-heading"><div><p className="eyebrow">OWNER SCOPE</p><h2>Frozen boundaries</h2></div><span className="scope-lock" aria-label="Owner scope locked">LOCKED</span></div>
          <p className="panel-intro">Infrastructure and data-layer operations remain outside this campaign’s authority.</p>
          <div className="scope-list"><span>Product contact</span><strong>Disabled</strong><span>Database / infrastructure</span><strong>Out of scope</strong><span>Findings storage</span><strong>Owner local only</strong></div>
        </article>
      </section>
    </div>
  );
}

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

function TimelinePanel({ state }: { readonly state: DataLoadState<TimelineSnapshot> }): ReactNode {
  if (state.kind === 'loading') return <div className="mini-state" role="status">Loading timeline…</div>;
  if (state.kind === 'error') return <div className="mini-state mini-state-warning">Timeline unavailable</div>;
  if (state.kind !== 'ready' || state.data.events.length === 0) return <div className="mini-state">No timeline events reported. Empty does not imply pass.</div>;
  return <ol className="timeline-list">{state.data.events.map((event) => <li key={event.seq} className="timeline-item"><span className="timeline-seq">{event.seq}</span><div><div className="timeline-meta"><StatusPill value={event.severity} label={event.severity} /><span>{formatTimestamp(event.timestamp)}</span><span>{formatCategory(event.eventType)}</span></div><strong>{formatCategory(event.messageCode)}</strong><small>{event.dataCodes.length === 0 ? 'No additional data codes' : `${event.dataCodes.length} bounded data code(s)`}</small></div></li>)}</ol>;
}

function RunDetailPanel({ runId, detailState, timelineState, onRetry }: { readonly runId: string | null; readonly detailState: DataLoadState<RunDetailSnapshot>; readonly timelineState: DataLoadState<TimelineSnapshot>; readonly onRetry: () => void }): ReactNode {
  if (runId === null) return <article className="panel run-detail-empty"><p className="eyebrow">RUN DETAIL</p><h2>Select a run to inspect</h2><p className="panel-intro">Run detail, timeline, and graph requests resolve only against a selected safe run identifier.</p></article>;
  if (detailState.kind === 'loading') return <article className="panel"><LoadingState /></article>;
  if (detailState.kind === 'error') return <article className="panel"><DataErrorState title="Run detail unavailable" onRetry={onRetry} /></article>;
  if (detailState.kind !== 'ready') return null;
  const detail = detailState.data;
  return <article className="panel run-detail-panel"><div className="panel-heading"><div><p className="eyebrow">RUN DETAIL / {runId}</p><h2>{detail.run.scenario ?? 'Unnamed scenario'}</h2></div><StatusPill value={detail.run.status} /></div><div className="data-grid"><DataRow label="Environment" value={formatCategory(detail.run.environment)} /><DataRow label="Product" value={detail.run.product ?? 'Not reported'} /><DataRow label="Started" value={formatTimestamp(detail.run.startedAt)} /><DataRow label="Duration" value={detail.run.durationMs === null ? 'Not recorded' : `${detail.run.durationMs} ms`} /><DataRow label="Events" value={String(detail.run.eventCount)} /><DataRow label="Findings" value={String(detail.run.oracleFindingCount)} tone={detail.run.oracleFindingCount > 0 ? 'warning' : 'neutral'} /></div><div className="timeline-heading"><p className="eyebrow">ORDERED TIMELINE</p><span>Sequence is authoritative; message bodies are never shown.</span></div><TimelinePanel state={timelineState} /></article>;
}

function RunsView({ state, selectedRunId, detailState, timelineState, onSelectRun, onRetry }: { readonly state: DataLoadState<RunListSnapshot>; readonly selectedRunId: string | null; readonly detailState: DataLoadState<RunDetailSnapshot>; readonly timelineState: DataLoadState<TimelineSnapshot>; readonly onSelectRun: (runId: string) => void; readonly onRetry: () => void }): ReactNode {
  if (state.kind === 'loading') return <LoadingState />;
  if (state.kind === 'error') return <DataErrorState title="Run list unavailable" onRetry={onRetry} />;
  if (state.kind !== 'ready') return null;
  const items = state.data.items;
  return <div className="view-stack"><section className="page-intro"><div><p className="eyebrow">EVIDENCE / RUNS</p><h1>Inspect what happened, in order.</h1><p>Run records are read-only projections. Statuses distinguish pass, oracle-only, safety failure, blocked, incomplete, and unavailable evidence.</p></div><StatusPill value={items.length === 0 ? 'UNAVAILABLE' : 'READY'} label={items.length === 0 ? 'No runs reported' : `${items.length} run(s)`} /></section><RunStatusSummary items={items} />{items.length === 0 ? <article className="panel empty-table"><div className="empty-mark"><Icon name="runs" /></div><h2>No local runs recorded</h2><p>The local run store returned an empty bounded page. This is not a pass claim.</p></article> : <article className="panel"><div className="panel-heading"><div><p className="eyebrow">RUN INDEX</p><h2>Recent local records</h2></div><span className="table-limit">Limit {state.data.page.limit}</span></div><div className="table-scroll"><table><thead><tr><th scope="col">Scenario</th><th scope="col">Status</th><th scope="col">Environment</th><th scope="col">Started</th><th scope="col">Signals</th><th scope="col"><span className="sr-only">Open</span></th></tr></thead><tbody>{items.map((run) => <tr key={run.runId} className={selectedRunId === run.runId ? 'row-selected' : undefined}><td><strong>{run.scenario ?? 'Unnamed scenario'}</strong><small>{run.runId}</small></td><td><StatusPill value={run.status} /></td><td>{formatCategory(run.environment)}</td><td>{formatTimestamp(run.startedAt)}</td><td><span>{run.eventCount} events</span><small>{run.oracleFindingCount} findings</small></td><td><button className="table-action" type="button" onClick={() => onSelectRun(run.runId)}>Inspect <Icon name="arrow" /></button></td></tr>)}</tbody></table></div></article>}<RunDetailPanel runId={selectedRunId} detailState={detailState} timelineState={timelineState} onRetry={onRetry} /></div>;
}

function GraphCanvas({ graph }: { readonly graph: ExecutionGraphSnapshot }): ReactNode {
  const nodes = graph.nodes.slice(0, 24);
  const nodePositions = new Map(nodes.map((node, index) => [node.nodeId, { x: 120 + (index % 3) * 230, y: 58 + Math.floor(index / 3) * 84 }]));
  const height = Math.max(190, Math.ceil(nodes.length / 3) * 84 + 24);
  return <div className="graph-frame"><svg className="execution-graph" viewBox={`0 0 820 ${height}`} role="img" aria-label={`Execution graph for run ${graph.runId}`}><defs><marker id="graph-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0 6 3 0 6Z" fill="currentColor" /></marker></defs>{graph.edges.slice(0, 48).map((edge) => { const from = nodePositions.get(edge.fromNodeId); const to = nodePositions.get(edge.toNodeId); if (from === undefined || to === undefined) return null; return <line key={edge.edgeId} x1={from.x + 72} y1={from.y + 18} x2={to.x - 72} y2={to.y + 18} className="graph-edge" markerEnd="url(#graph-arrow)" />; })}{nodes.map((node) => <g key={node.nodeId} transform={`translate(${nodePositions.get(node.nodeId)?.x ?? 0} ${nodePositions.get(node.nodeId)?.y ?? 0})`}><rect className={`graph-node graph-node-${statusTone(node.state)}`} width="144" height="38" rx="7" /><text x="12" y="16" className="graph-node-kind">{formatCategory(node.kind)}</text><text x="12" y="30" className="graph-node-state">{formatCategory(node.state)}</text></g>)}</svg><div className="graph-footer"><span>{nodes.length} of {graph.nodes.length} nodes shown</span><span>{graph.edges.length} edges · limit {graph.edgeLimit}</span>{graph.truncated ? <StatusPill value="WARNING" label="Truncated" /> : <StatusPill value="READY" label="Complete" />}</div></div>;
}

function ExecutionGraphView({ selectedRunId, state, onRetry }: { readonly selectedRunId: string | null; readonly state: DataLoadState<ExecutionGraphSnapshot>; readonly onRetry: () => void }): ReactNode {
  if (selectedRunId === null) return <div className="empty-view"><div className="empty-mark"><Icon name="execution-graph" /></div><p className="eyebrow">TOPOLOGY / EXECUTION GRAPH</p><h1>Select a run first.</h1><p>Open a run from the Runs view to inspect its bounded deterministic execution graph.</p><div className="empty-status"><StatusPill value="NOT_APPLICABLE" label="No run selected" /></div></div>;
  if (state.kind === 'loading') return <LoadingState />;
  if (state.kind === 'error') return <DataErrorState title="Execution graph unavailable" onRetry={onRetry} />;
  if (state.kind !== 'ready') return null;
  return <div className="view-stack"><section className="page-intro"><div><p className="eyebrow">TOPOLOGY / EXECUTION GRAPH</p><h1>Trace the bounded run shape.</h1><p>Graph edges are projections of ordered evidence. They do not add execution authority or infer missing events.</p></div><StatusPill value="READY" label={`Run ${selectedRunId}`} /></section><GraphCanvas graph={state.data} /><article className="panel"><div className="panel-heading"><div><p className="eyebrow">GRAPH TABLE FALLBACK</p><h2>Node inventory</h2></div><span className="table-limit">Bounded list</span></div><div className="table-scroll"><table><thead><tr><th scope="col">Node</th><th scope="col">Kind</th><th scope="col">State</th><th scope="col">Event sequence</th></tr></thead><tbody>{state.data.nodes.map((node) => <tr key={node.nodeId}><td>{node.label ?? node.nodeId}</td><td>{formatCategory(node.kind)}</td><td><StatusPill value={node.state} /></td><td>{node.eventSeq === null ? 'Not linked' : String(node.eventSeq)}</td></tr>)}</tbody></table></div></article></div>;
}

function SafetyView({ data }: { readonly data: OverviewSnapshot }): ReactNode {
  const safety = data.safety;
  const source = data.source;
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

      <section className="content-grid safety-grid">
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
          </div>
          <div className="callout callout-warning"><strong>Owner scope is frozen</strong><span>{formatCategory(safety.ownerScope.reason)}. Unknown safety checks never become PASS by absence.</span></div>
        </article>

        <article className="panel">
          <div className="panel-heading"><div><p className="eyebrow">CONTINUITY</p><h2>Checkpoint posture</h2></div><StatusPill value={safety.continuity.state} /></div>
          <div className="scope-list"><span>State</span><strong className={`text-${statusTone(safety.continuity.state)}`}>{continuityValue}</strong><span>Branch</span><strong>{safety.continuity.branch ?? 'Not reported'}</strong><span>Head anchor</span><strong>{safety.continuity.headSha === null ? 'Not reported' : `${safety.continuity.headSha.slice(0, 7)}…`}</strong><span>Checkpoint receipt</span><strong>{safety.continuity.checkpointDigest === null ? 'Not reported' : 'Available'}</strong></div>
          <p className="small-note">Continuity is evidence about local state, not permission to expand campaign scope.</p>
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
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [runState, setRunState] = useState<DataLoadState<RunListSnapshot>>({ kind: 'idle' });
  const [detailState, setDetailState] = useState<DataLoadState<RunDetailSnapshot>>({ kind: 'idle' });
  const [timelineState, setTimelineState] = useState<DataLoadState<TimelineSnapshot>>({ kind: 'idle' });
  const [graphState, setGraphState] = useState<DataLoadState<ExecutionGraphSnapshot>>({ kind: 'idle' });
  const refresh = useCallback((): void => setRefreshKey((value) => value + 1), []);

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

  useEffect(() => subscribeToControlCenterEvents(() => setRefreshKey((value) => value + 1)), []);

  useEffect(() => {
    if (activeView !== 'runs') return;
    let cancelled = false;
    setRunState({ kind: 'loading' });
    loadRuns().then((data) => {
      if (!cancelled) setRunState({ kind: 'ready', data });
    }).catch((error: unknown) => {
      if (!cancelled) {
        void apiErrorLabel(error);
        setRunState({ kind: 'error' });
      }
    });
    return () => { cancelled = true; };
  }, [activeView, refreshKey]);

  useEffect(() => {
    if (activeView !== 'runs' || selectedRunId === null) return;
    let cancelled = false;
    setDetailState({ kind: 'loading' });
    setTimelineState({ kind: 'loading' });
    Promise.all([loadRunDetail(selectedRunId), loadTimeline(selectedRunId)]).then(([detail, timeline]) => {
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
    return () => { cancelled = true; };
  }, [activeView, refreshKey, selectedRunId]);

  useEffect(() => {
    if (activeView !== 'execution-graph' || selectedRunId === null) return;
    let cancelled = false;
    setGraphState({ kind: 'loading' });
    loadExecutionGraph(selectedRunId).then((data) => {
      if (!cancelled) setGraphState({ kind: 'ready', data });
    }).catch((error: unknown) => {
      if (!cancelled) {
        void apiErrorLabel(error);
        setGraphState({ kind: 'error' });
      }
    });
    return () => { cancelled = true; };
  }, [activeView, refreshKey, selectedRunId]);

  const navigate = useCallback((view: ViewId): void => {
    window.location.hash = view === 'overview' ? '' : view;
    setActiveView(view);
  }, []);
  const currentView = VIEW_DEFINITIONS.find((view) => view.id === activeView) ?? VIEW_DEFINITIONS[0];
  const retryRunData = useCallback((): void => setRefreshKey((value) => value + 1), []);
  const selectRun = useCallback((runId: string): void => setSelectedRunId(runId), []);

  const renderDataView = (): ReactNode => {
    if (activeView === 'runs') return <RunsView state={runState} selectedRunId={selectedRunId} detailState={detailState} timelineState={timelineState} onSelectRun={selectRun} onRetry={retryRunData} />;
    if (activeView === 'execution-graph') return <ExecutionGraphView selectedRunId={selectedRunId} state={graphState} onRetry={retryRunData} />;
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
