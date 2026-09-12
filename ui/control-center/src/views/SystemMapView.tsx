import { useCallback, useEffect, useState, type KeyboardEvent, type ReactNode } from 'react';
import { apiErrorLabel, loadSystemMapLevel, loadSystemMapQuery } from '../api';
import type { DataLoadState, SystemMapBound, SystemMapLevelSegment, SystemMapNodeView, SystemMapQuerySegment, SystemMapSnapshot } from '../types';
import { SYSTEM_MAP_QUERY_SEGMENTS } from '../types';
import { ErrorState, LoadingState, StatusPill, formatCategory } from '../shared';
import { evidenceTreatmentFor } from '../systemMapEvidence';

/** System map view: bounded progressive disclosure over the frozen transport. */

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

export function SystemMapView({ refreshKey }: { readonly refreshKey: number }): ReactNode {
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
      <h1 className="sr-only">System map</h1>
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
              return <line key={edge.edgeId} x1={from.x} y1={from.y} x2={to.x} y2={to.y} className="map-edge" />;
            })}
            {visible.map((node) => {
              const treatment = evidenceTreatmentFor(node.evidenceStatus);
              return (
                <g key={node.nodeId} className={`map-node${treatment === null ? '' : ` ${treatment.className}`}${selectedNodeId === node.nodeId ? ' node-selected' : ''}`}
                  data-evidence-status={node.evidenceStatus}
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
              );
            })}
          </svg>
        )}
      </div>

      <p className="small-note">Node stroke width and dash pattern encode the evidence status; the map table below names every status by value.</p>

      {selected !== null ? (
        <div className="system-map-detail" aria-live="polite">
          <h2>{selected.label}</h2>
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

      <div className="timeline-heading"><p className="eyebrow">MAP TABLE FALLBACK</p><span>Every node the level returned, with the metadata the graph encodes.</span></div>
      <div className="table-scroll"><table><thead><tr><th scope="col">Node</th><th scope="col">Kind</th><th scope="col">Fact</th><th scope="col">Evidence</th><th scope="col">Coverage</th><th scope="col">Layer</th></tr></thead><tbody>{map.nodes.map((node) => <tr key={node.nodeId}><td><strong>{node.label}</strong><small>{node.nodeId}</small></td><td>{formatCategory(node.kind)}</td><td>{formatCategory(node.factCategory)}</td><td><StatusPill value={node.evidenceStatus} /></td><td>{formatCategory(node.coverageState)}</td><td>{node.layer}</td></tr>)}</tbody></table></div>
      <div className="timeline-heading"><p className="eyebrow">EDGE INVENTORY</p><span>Edges the level carried, with their evidence state.</span></div>
      {map.edges.length === 0 ? <div className="mini-state">No edges at this level.</div> : <div className="table-scroll"><table><thead><tr><th scope="col">Edge</th><th scope="col">From / To</th><th scope="col">Kind</th><th scope="col">Fact</th><th scope="col">Evidence</th></tr></thead><tbody>{map.edges.map((edge) => <tr key={edge.edgeId}><td><small>{edge.edgeId}</small></td><td><small>{edge.fromNodeId} → {edge.toNodeId}</small></td><td>{formatCategory(edge.kind)}</td><td>{formatCategory(edge.factCategory)}</td><td><StatusPill value={edge.evidenceStatus} /></td></tr>)}</tbody></table></div>}
      <footer className="system-map-provenance">
        <span>layout {map.layout.engineId} {map.layout.engineVersion}</span>
        <span>projection {map.layout.projectionVersion}</span>
        <span>graph {map.layout.graphDigest}</span>
        <span>layout digest {map.layout.layoutDigest}</span>
        <span data-testid="map-authority">execution {map.executionAuthority} · mutation {map.mutationAuthority}</span>
        <span>level {map.level}</span>
        <span>query {map.query ?? 'none'}</span>
        <span>focus {map.focusId ?? 'root'}</span>
        <span>measurement {map.measurement ?? 'not reported'}</span>
      </footer>
    </section>
  );
}

