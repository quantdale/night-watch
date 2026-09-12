import type { ReactNode } from 'react';
import type { DataLoadState, RunDetailSnapshot, RunListSnapshot, TimelineSnapshot } from '../types';
import { CodeChips, DataErrorState, DataRow, Icon, LoadingState, StatusPill, formatCategory, formatTimestamp, statusTone } from '../shared';

/** Runs view: list, detail, timeline, provenance. */

function RunStatusSummary({ items }: { readonly items: readonly { readonly status: string }[] }): ReactNode {
  const statuses = ['PASSED', 'ORACLE_ONLY', 'SAFETY_FAILURE', 'FAILED', 'BLOCKED', 'INCOMPLETE', 'RUNNING'] as const;
  return <div className="run-status-summary" aria-label="Run status summary">{statuses.map((status) => { const count = items.filter((item) => item.status === status).length; return <div key={status} className="run-status-item"><StatusPill value={status} /><strong>{count}</strong></div>; })}</div>;
}


function TimelinePanel({ runId, state, onRetry }: { readonly runId: string | null; readonly state: DataLoadState<TimelineSnapshot>; readonly onRetry: () => void }): ReactNode {
  if (state.kind === 'loading') return <div className="mini-state" role="status">Loading timeline…</div>;
  if (state.kind === 'error') return <DataErrorState title="Timeline unavailable" error={state.error} onRetry={onRetry} />;
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


function RunDetailPanel({ runId, detailState, timelineState, onRetry }: { readonly runId: string | null; readonly detailState: DataLoadState<RunDetailSnapshot>; readonly timelineState: DataLoadState<TimelineSnapshot>; readonly onRetry: () => void }): ReactNode {
  if (runId === null) return <article className="panel run-detail-empty"><p className="eyebrow">RUN DETAIL</p><h2>Select a run to inspect</h2><p className="panel-intro">Run detail, timeline, and graph requests resolve only against a selected safe run identifier.</p></article>;
  if (detailState.kind === 'loading') return <article className="panel"><LoadingState /></article>;
  if (detailState.kind === 'error') return <article className="panel"><DataErrorState title="Run detail unavailable" error={detailState.error} onRetry={onRetry} /></article>;
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
    <TimelinePanel runId={runId} state={timelineState} onRetry={onRetry} />
  </article>;
}

export function RunsView({ state, selectedRunId, detailState, timelineState, onSelectRun, onRetry }: { readonly state: DataLoadState<RunListSnapshot>; readonly selectedRunId: string | null; readonly detailState: DataLoadState<RunDetailSnapshot>; readonly timelineState: DataLoadState<TimelineSnapshot>; readonly onSelectRun: (runId: string) => void; readonly onRetry: () => void }): ReactNode {
  if (state.kind === 'loading') return <LoadingState />;
  if (state.kind === 'error') return <DataErrorState title="Run list unavailable" error={state.error} onRetry={onRetry} />;
  if (state.kind !== 'ready') return null;
  const items = state.data.items;
  return <div className="view-stack"><section className="page-intro"><div><p className="eyebrow">EVIDENCE / RUNS</p><h1>Inspect what happened, in order.</h1><p>Run records are read-only projections. Statuses distinguish pass, oracle-only, safety failure, blocked, incomplete, and unavailable evidence.</p></div><StatusPill value={items.length === 0 ? 'UNAVAILABLE' : 'READY'} label={items.length === 0 ? 'No runs reported' : `${items.length} run(s)`} /></section><RunStatusSummary items={items} />{items.length === 0 ? <article className="panel empty-table"><div className="empty-mark"><Icon name="runs" /></div><h2>No local runs recorded</h2><p>The local run store returned an empty bounded page. This is not a pass claim.</p></article> : <article className="panel"><div className="panel-heading"><div><p className="eyebrow">RUN INDEX</p><h2>Recent local records</h2></div><span className="table-limit">Limit {state.data.page.limit}</span></div><div className="table-scroll"><table><thead><tr><th scope="col">Scenario</th><th scope="col">Status</th><th scope="col">Environment</th><th scope="col">Started</th><th scope="col">Signals</th><th scope="col"><span className="sr-only">Open</span></th></tr></thead><tbody>{items.map((run) => <tr key={run.runId} className={selectedRunId === run.runId ? 'row-selected' : undefined}><td><strong>{run.scenario ?? 'Unnamed scenario'}</strong><small>{run.runId} · {run.browser ?? 'browser not reported'}</small><small>{run.product ?? 'product not reported'}{run.nightwatchSha === null ? '' : ` · ${run.nightwatchSha.slice(0, 12)}…`}</small></td><td><StatusPill value={run.status} /></td><td>{formatCategory(run.environment)}</td><td><span>{formatTimestamp(run.startedAt)}</span><small>ended {formatTimestamp(run.endedAt)}</small></td><td><span>{run.eventCount} events</span><small>{run.oracleFindingCount} findings · {run.hardFailureCount} hard failure(s) · {run.durationMs === null ? 'duration not recorded' : `${run.durationMs} ms`}</small></td><td><button className="table-action" type="button" onClick={() => onSelectRun(run.runId)}>Inspect <Icon name="arrow" /></button></td></tr>)}</tbody></table></div></article>}<RunDetailPanel runId={selectedRunId} detailState={detailState} timelineState={timelineState} onRetry={onRetry} /></div>;
}
