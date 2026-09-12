import { useState, type ReactNode } from 'react';
import type { DataLoadState, OverviewSnapshot, SourceGraphSnapshot, SourceSurfacesSnapshot } from '../types';
import { DataErrorState, DataRow, Icon, LoadingState, MetricCard, StatusPill, formatCategory, layerAssignment, statusAnnotation, statusTone } from '../shared';

/** Source-intelligence view: proof, currentness, capability. */

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
          aria-label={`${node.label ?? node.nodeId}, ${node.kind}, proof ${node.proof}, currentness ${node.currentness}`}
          {...statusAnnotation('graph-node', node.currentness)}
          onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedNodeId(node.nodeId); }}>
          <rect className={`graph-node graph-node-${statusTone(node.currentness)}${dimmed ? ' graph-node-dimmed' : ''}${selectedNodeId === node.nodeId ? ' graph-node-selected' : ''}`} width="144" height="38" rx="7" />
          <text x="12" y="16" className="graph-node-kind">{formatCategory(node.kind)}</text>
          <text x="12" y="30" className="graph-node-state">{formatCategory(node.proof)}</text>
        </g>;
      })}
    </svg>
    <div className="graph-footer">
      <span>{graph.nodes.length} nodes drawn · {visible.length} match</span>
      <span>{graph.edges.length - undrawnEdges} of {graph.edges.length} edges · depth {graph.depth} · surface {graph.surfaceId ?? 'unscoped'} · zoom {zoom.toFixed(2)}x</span>
      {graph.truncated
        ? <StatusPill value="WARNING" label={`Truncated at ${graph.nodeLimit} nodes / ${graph.edgeLimit} edges`} />
        : <StatusPill value="READY" label="Complete within bounds" />}
    </div>
    {graph.truncated ? <div className="callout callout-warning"><strong>This graph is truncated</strong><span>The projection reached its {graph.nodeLimit}-node / {graph.edgeLimit}-edge bound. What is not drawn is not absent from the system; it is absent from this projection.</span></div> : null}
    {undrawnEdges > 0 ? <div className="callout callout-warning"><strong>{undrawnEdges} edge(s) reference a node outside this projection</strong><span>They are counted but cannot be drawn. An edge without both endpoints is not evidence that the relationship is absent.</span></div> : null}
    {selected === null ? null : <div className="callout"><strong>Selected: {selected.label ?? selected.nodeId}</strong><span>{formatCategory(selected.kind)} · proof {formatCategory(selected.proof)} · currentness {formatCategory(selected.currentness)} · capability {formatCategory(selected.capability)}</span></div>}
  </div>;
}

export function SourceView({ summary, surfaceState, graphState, selectedSurfaceId, onSelectSurface, onRetry, limits }: { readonly summary: OverviewSnapshot['source']; readonly surfaceState: DataLoadState<SourceSurfacesSnapshot>; readonly graphState: DataLoadState<SourceGraphSnapshot>; readonly selectedSurfaceId: string | null; readonly onSelectSurface: (surfaceId: string) => void; readonly onRetry: () => void; readonly limits: Readonly<Record<string, number>> }): ReactNode {
  if (surfaceState.kind === 'loading') return <LoadingState />;
  if (surfaceState.kind === 'error') return <DataErrorState title="Source surface inventory unavailable" error={surfaceState.error} onRetry={onRetry} />;
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
  const rollupRows = [
    ...summary.currentness.map((entry) => ({ kind: 'Currentness', key: entry.key, count: entry.count })),
    ...summary.lifecycle.map((entry) => ({ kind: 'Lifecycle', key: entry.key, count: entry.count })),
    ...summary.proof.map((entry) => ({ kind: 'Proof', key: entry.key, count: entry.count })),
    ...summary.capabilities.map((entry) => ({ kind: 'Capability', key: entry.key, count: entry.count })),
  ];
  return <div className="view-stack"><section className="page-intro"><div><p className="eyebrow">PROVENANCE / SOURCE INTELLIGENCE</p><h1>Follow proof, currentness, and capability.</h1><p>Source intelligence exposes bounded descriptors and graph neighborhoods. Raw source, paths, handler symbols, and evidence bodies remain outside the boundary.</p></div><StatusPill value={summary.state} /></section><section className="metric-grid"><MetricCard label="Inventory" value={formatCategory(summary.state)} detail={`${summary.repositoryCount} repositories`} tone={statusTone(summary.state)} /><MetricCard label="Surfaces" value={String(summary.surfaceCount)} detail={`${surfaces.length} rows loaded`} /><MetricCard label="Currentness" value={summary.currentness.length === 0 ? 'Not reported' : formatCategory(summary.currentness[0]?.key ?? 'UNKNOWN')} detail="Rollup from source authority" tone={summary.currentness.length === 0 ? 'warning' : statusTone(summary.currentness[0]?.key ?? 'UNKNOWN')} /><MetricCard label="Capabilities" value={summary.capabilities.length === 0 ? 'Not reported' : formatCategory(summary.capabilities[0]?.key ?? 'UNKNOWN')} detail={summary.capabilities.length === 0 ? 'No capability rollup' : `${summary.capabilities[0]?.count ?? 0} of ${summary.capabilities.reduce((total, entry) => total + entry.count, 0)} surfaces`} tone={summary.capabilities.length === 0 ? 'warning' : statusTone(summary.capabilities[0]?.key ?? 'UNKNOWN')} /><MetricCard label="Graph limits" value={`${limits.maxGraphNodes} / ${limits.maxGraphEdges}`} detail="nodes / edges maximum, declared" tone="ready" /><MetricCard label="Inventory digest" value={summary.inventoryDigest === null ? 'Absent' : 'Recorded'} detail={summary.inventoryDigest === null ? 'This inventory anchors to nothing' : 'Inventory is digest-anchored'} tone={summary.inventoryDigest === null ? 'warning' : 'ready'} /></section><article className="panel"><div className="panel-heading"><div><p className="eyebrow">AUTHORITY ROLLUPS</p><h2>Every rollup the source authority reported</h2></div><span className="table-limit">All entries, not the first</span></div>{rollupRows.length === 0 ? <div className="mini-state">No rollups reported.</div> : <div className="table-scroll"><table><thead><tr><th scope="col">Kind</th><th scope="col">Key</th><th scope="col">Count</th></tr></thead><tbody>{rollupRows.map((entry) => <tr key={`${entry.kind}:${entry.key}`}><td>{entry.kind}</td><td><strong>{formatCategory(entry.key)}</strong></td><td>{entry.count}</td></tr>)}</tbody></table></div>}</article><article className="panel"><div className="panel-heading"><div><p className="eyebrow">POPULATION COMPLETENESS</p><h2>Operation projection</h2></div><StatusPill value={completeness.state} /></div><div className="data-grid"><DataRow label="State" value={formatCategory(completeness.state)} tone={statusTone(completeness.state)} /><DataRow label="Coverage" value={formatCategory(completeness.coverageState)} tone={statusTone(completeness.coverageState)} /><DataRow label="Population" value={populationLabel} tone={completeness.state === 'COMPLETE' ? 'ready' : 'warning'} /><DataRow label="Examined" value={String(completeness.examined)} /><DataRow label="Limit" value={String(completeness.limit)} /><DataRow label="Dropped" value={String(completeness.dropped)} tone={completeness.dropped > 0 ? 'warning' : 'neutral'} /><DataRow label="Truncated" value={completeness.truncated ? 'Yes' : 'No'} tone={completeness.truncated ? 'warning' : 'neutral'} /><DataRow label="Remaining unknown" value={completeness.remainingUnknown ? 'Yes' : 'No'} tone={completeness.remainingUnknown ? 'warning' : 'neutral'} /></div><div className="panel-heading" style={{ marginTop: '16px' }}><div><p className="eyebrow">ENUMERATION</p><h2>File walk</h2></div><StatusPill value={enumeration.state} /></div><div className="data-grid"><DataRow label="Enumeration state" value={formatCategory(enumeration.state)} tone={statusTone(enumeration.state)} /><DataRow label="Files examined" value={String(enumeration.examinedFiles)} /><DataRow label="Total files" value={enumerationTotalLabel} tone={enumeration.remainingUnknown ? 'warning' : 'neutral'} /><DataRow label="Dropped files" value={enumeration.droppedFiles === null ? 'unknown' : String(enumeration.droppedFiles)} tone={enumeration.droppedFiles !== null && enumeration.droppedFiles > 0 ? 'warning' : enumeration.droppedFiles === null ? 'warning' : 'neutral'} /><DataRow label="Walk limit" value={String(enumeration.limit)} /><DataRow label="Remaining unknown" value={enumeration.remainingUnknown ? 'Yes' : 'No'} tone={enumeration.remainingUnknown ? 'warning' : 'neutral'} /></div><div className="panel-heading" style={{ marginTop: '16px' }}><div><p className="eyebrow">CONTENT READ</p><h2>File bodies</h2></div><StatusPill value={contentRead.state} /></div><div className="data-grid"><DataRow label="Content state" value={formatCategory(contentRead.state)} tone={statusTone(contentRead.state)} /><DataRow label="Candidates" value={String(contentRead.candidateFiles)} /><DataRow label="Read" value={String(contentRead.readFiles)} /><DataRow label="Admitted" value={String(contentRead.admittedFiles)} /><DataRow label="Dropped" value={contentDroppedLabel} tone={contentRead.droppedFiles > 0 ? 'warning' : 'neutral'} /><DataRow label="Unreadable" value={String(contentRead.unreadableFiles)} tone={contentRead.unreadableFiles > 0 ? 'warning' : 'neutral'} /></div>{completeness.state !== 'COMPLETE' ? <div className="callout callout-warning"><strong>{completeness.state === 'TRUNCATED' ? 'Population truncated' : 'Population total unknown'}</strong><span>{completeness.state === 'TRUNCATED' ? `Projected ${completeness.projected} of ${completeness.total ?? 'unknown'} with ${completeness.dropped} dropped.` : `Projected ${completeness.projected}, total unknown; dropped ${completeness.dropped}.`} Coverage is reporting only and never grants admission.</span></div> : <div className="callout"><strong>Population complete</strong><span>Projected {completeness.projected} of {completeness.total ?? completeness.projected} with no drops reported. Coverage remains reporting only.</span></div>}</article>{proofChain === null ? <article className="panel"><div className="panel-heading"><div><p className="eyebrow">PROOF-CHAIN CENSUS</p><h2>Not reported</h2></div><StatusPill value="UNKNOWN" /></div><p className="panel-intro">The source authority did not provide a proof-chain census. No eligibility or pass claim is inferred.</p></article> : <article className="panel panel-wide"><div className="panel-heading"><div><p className="eyebrow">PROOF-CHAIN CENSUS</p><h2>Where qualification stops</h2></div><span className="table-limit">{proofChain.censusDigest === null ? 'Digest unavailable' : 'Authority-bound'}</span></div><div className="metric-inline"><div><strong>{proofChain.totalOperations}</strong><span>operations</span></div><div><strong>{proofChain.phase24Eligible}</strong><span>eligible</span></div><div><strong>{proofChain.runtimeBindings}</strong><span>runtime bound</span></div><div><strong>{proofChain.replayRequirementsProven}</strong><span>replay ready</span></div></div><div className="scope-list"><span>Primary blocker</span><strong>{proofChain.primaryBlockingStages[0] === undefined ? 'None reported' : `${formatCategory(proofChain.primaryBlockingStages[0].key)} · ${proofChain.primaryBlockingStages[0].count}`}</strong><span>Runtime gaps</span><strong>{proofChain.runtimeBindingMissing}</strong><span>Dossier-compatible</span><strong>{proofChain.dossierCompatible}</strong><span>Currentness failures</span><strong>{proofChain.currentnessFailureCount}</strong></div><div className="callout"><strong>Advisory diagnostics only</strong><span>These counts project the source census and existing Phase-24 authority. The Control Center adds no selector or promotion authority.</span></div><div className="timeline-heading"><p className="eyebrow">EXCLUSIONS AND STAGE CENSUS</p><span>What Phase 24 excluded, and where each stage stands.</span></div><div className="data-grid"><DataRow label="Phase 24 excluded" value={String(proofChain.phase24Excluded)} tone={proofChain.phase24Excluded > 0 ? 'warning' : 'neutral'} /><DataRow label="Source snapshot" value={proofChain.sourceSnapshotDigest === null ? 'No digest' : 'Digest recorded'} tone={proofChain.sourceSnapshotDigest === null ? 'warning' : 'neutral'} /><DataRow label="Source surfaces" value={proofChain.sourceSurfaceDigest === null ? 'No digest' : 'Digest recorded'} tone={proofChain.sourceSurfaceDigest === null ? 'warning' : 'neutral'} /><DataRow label="Phase 24 portfolio" value={proofChain.phase24PortfolioDigest === null ? 'No digest' : 'Digest recorded'} tone={proofChain.phase24PortfolioDigest === null ? 'warning' : 'neutral'} /></div>{proofChain.stageStatusCounts.length === 0 ? <div className="mini-state">No stage/status census reported.</div> : <div className="table-scroll"><table><thead><tr><th scope="col">Stage</th><th scope="col">Status</th><th scope="col">Count</th></tr></thead><tbody>{proofChain.stageStatusCounts.map((entry) => <tr key={`${entry.stage}:${entry.status}`}><td>{formatCategory(entry.stage)}</td><td><StatusPill value={entry.status} /></td><td>{entry.count}</td></tr>)}</tbody></table></div>}<div className="timeline-heading"><p className="eyebrow">PROOF FAMILIES</p><span>Ranked by the authority, with the gap and fan-out behind each rank. Bug-hunting value is an assessment, never a selection.</span></div>{proofChain.proofFamilies.length === 0 ? <div className="mini-state">No proof families reported. An empty portfolio is not an absence of gaps.</div> : <div className="table-scroll"><table><thead><tr><th scope="col">Rank</th><th scope="col">Family</th><th scope="col">Assessment</th><th scope="col">Gaps</th><th scope="col">Completeness</th><th scope="col">Fan-out</th><th scope="col">Value</th></tr></thead><tbody>{[...proofChain.proofFamilies].sort((left, right) => left.rank - right.rank).map((family) => <tr key={family.family}><td>{family.rank}</td><td><strong>{formatCategory(family.family)}</strong></td><td><StatusPill value={family.assessment} /></td><td><span>{family.gapSurfaceCount} surface(s)</span><small>{family.firstBlockerCount} first blocker(s) · {family.potentiallyUnlockableCount} potentially unlockable</small></td><td><StatusPill value={family.proofCompleteness} /></td><td>{family.dependencyFanOut}</td><td>{formatCategory(family.bugHuntingValue)}</td></tr>)}</tbody></table></div>}</article>}<article className="panel"><div className="panel-heading"><div><p className="eyebrow">SOURCE SURFACES</p><h2>Approved bounded descriptors</h2></div><span className="table-limit">Limit {surfaceState.data.page.limit} · {surfaceState.data.repositoryFilter === null ? 'all repositories' : `repository ${surfaceState.data.repositoryFilter}`}</span></div>{surfaces.length === 0 ? <div className="mini-state mini-state-warning">No source surfaces available. This is an unavailable/empty inventory, not proof of no routes.</div> : <div className="table-scroll"><table><thead><tr><th scope="col">Surface</th><th scope="col">Currentness</th><th scope="col">Proof</th><th scope="col">Read-only</th><th scope="col">Binding</th><th scope="col">Capability</th><th scope="col">Lifecycle</th><th scope="col"><span className="sr-only">Graph</span></th></tr></thead><tbody>{surfaces.map((surface) => <tr key={surface.surfaceId} className={selectedSurfaceId === surface.surfaceId ? 'row-selected' : undefined}><td><strong>{surface.routeTemplate ?? 'Route template withheld'}</strong><small>{surface.repositoryId} · {surface.method} · {surface.language} · {surface.surfaceId}</small><small>{surface.sourceSha === null ? 'No source anchor' : `source ${surface.sourceSha.slice(0, 12)}…`} · {surface.evidenceDigest === null ? 'no evidence digest' : 'evidence digest recorded'}</small>{surface.exclusionReasons.length === 0 ? null : <small className="row-note-warning">Excluded: {surface.exclusionReasons.map(formatCategory).join(', ')}</small>}</td><td><StatusPill value={surface.currentness} /></td><td><StatusPill value={surface.routeProof} /></td><td><StatusPill value={surface.readOnlyClassification} /></td><td><StatusPill value={surface.runtimeBinding} /><small>handler {formatCategory(surface.handlerState)}</small></td><td><small>Projection {formatCategory(surface.projectionCapability)}</small><small>Replay {formatCategory(surface.replayCapability)}</small><small>Differential {formatCategory(surface.differentialCapability)}</small></td><td>{formatCategory(surface.lifecycle)}</td><td><button className="table-action" type="button" onClick={() => onSelectSurface(surface.surfaceId)}>Graph <Icon name="arrow" /></button></td></tr>)}</tbody></table></div>}</article>{selectedSurfaceId === null ? <article className="panel run-detail-empty"><p className="eyebrow">PROGRESSIVE GRAPH</p><h2>Select a surface to inspect its neighborhood</h2><p className="panel-intro">Depth and node/edge limits are enforced by the source graph contract.</p></article> : graphState.kind === 'loading' ? <LoadingState /> : graphState.kind === 'error' ? <DataErrorState title="Source graph unavailable" error={graphState.error} onRetry={onRetry} /> : graphState.kind === 'ready' ? <><SourceGraphCanvas graph={graphState.data} /><article className="panel"><div className="panel-heading"><div><p className="eyebrow">GRAPH TABLE FALLBACK</p><h2>Node inventory</h2></div><span className="table-limit">Bounded list</span></div><div className="table-scroll"><table><thead><tr><th scope="col">Node</th><th scope="col">Proof</th><th scope="col">Currentness</th><th scope="col">Capability</th><th scope="col">Lifecycle</th></tr></thead><tbody>{graphState.data.nodes.map((node) => <tr key={node.nodeId}><td><strong>{node.label ?? node.nodeId}</strong><small>{node.nodeId}</small></td><td><StatusPill value={node.proof} /></td><td><StatusPill value={node.currentness} /></td><td>{formatCategory(node.capability)}</td><td>{node.lifecycle === null ? 'Not reported' : formatCategory(node.lifecycle)}</td></tr>)}</tbody></table></div></article><article className="panel"><div className="panel-heading"><div><p className="eyebrow">EDGE INVENTORY</p><h2>Edges the projection carried</h2></div><span className="table-limit">Bounded list</span></div>{graphState.data.edges.length === 0 ? <div className="mini-state">No edges reported. An empty edge set is not proof of isolation.</div> : <div className="table-scroll"><table><thead><tr><th scope="col">Edge</th><th scope="col">From / To</th><th scope="col">Kind</th><th scope="col">Proof</th></tr></thead><tbody>{graphState.data.edges.map((edge) => <tr key={edge.edgeId}><td><small>{edge.edgeId}</small></td><td><small>{edge.fromNodeId} → {edge.toNodeId}</small></td><td>{formatCategory(edge.kind)}</td><td><StatusPill value={edge.proof} /></td></tr>)}</tbody></table></div>}</article></> : null}</div>;
}

