import { useState, type ReactNode } from 'react';
import type { DataLoadState, ExecutionGraphSnapshot } from '../types';
import { DataErrorState, Icon, LoadingState, StatusPill, formatCategory, layerAssignment, statusAnnotation, statusTone } from '../shared';

/** Execution-graph view: bounded deterministic graph canvas and tables. */

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
          {...statusAnnotation('graph-node', node.state)}
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

const EXECUTION_STATE_FILTERS = ['PENDING', 'RUNNING', 'PASSED', 'WARNING', 'FAILED', 'BLOCKED', 'SKIPPED', 'INCOMPLETE'] as const;

export function ExecutionGraphView({ selectedRunId, state, onRetry }: { readonly selectedRunId: string | null; readonly state: DataLoadState<ExecutionGraphSnapshot>; readonly onRetry: () => void }): ReactNode {
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
