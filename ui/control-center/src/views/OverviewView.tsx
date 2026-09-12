import type { ReactNode } from 'react';
import type { ApiErrorInfo, DataLoadState, OverviewSnapshot, OverviewSourceStates, ReadinessSnapshot } from '../types';
import { UNCLASSIFIED_API_ERROR } from '../api';
import { CodeChips, DataErrorState, DataRow, EpistemicBadge, Guardrail, Icon, MetricCard, StatusPill, formatCategory, formatTimestamp, statusTone } from '../shared';

/** Overview view: the local posture snapshot and every readiness detail. */

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

    <div className="timeline-heading"><p className="eyebrow">AUTHENTICATED CAPABILITY</p><span>An artefact that is present and expired is not an absent artefact: one needs a re-capture, the other has never been captured.</span></div>
    <div className="data-grid">
      <DataRow label="Aggregate" value={formatCategory(readiness.authCapability.aggregateState)} tone={readiness.authCapability.aggregateState === 'VALID' ? 'ready' : readiness.authCapability.aggregateState === 'ATTENTION' ? 'warning' : 'neutral'} />
      <DataRow label="Present and expired" value={readiness.authCapability.presentAndExpiredEnvironments.length === 0 ? 'None' : readiness.authCapability.presentAndExpiredEnvironments.map(formatCategory).join(', ')} tone={readiness.authCapability.presentAndExpiredEnvironments.length === 0 ? 'neutral' : 'warning'} />
    </div>
    {readiness.authCapability.entries.length === 0
      ? <div className="mini-state">No environment was evaluated. That is unknown, not valid.</div>
      : <div className="table-scroll"><table><thead><tr><th scope="col">Environment</th><th scope="col">Present</th><th scope="col">State</th><th scope="col">Epistemic</th><th scope="col">Remaining validity</th><th scope="col">Capture instant</th><th scope="col">Declared valid until</th><th scope="col">Refusal</th><th scope="col">Blocked lanes</th></tr></thead><tbody>{readiness.authCapability.entries.map((entry) => <tr key={entry.environment}><td><strong>{entry.environment}</strong></td><td>{entry.present ? 'Present' : 'Absent'}</td><td><StatusPill value={entry.state} /></td><td><EpistemicBadge epistemicClass={entry.epistemicClass} /></td><td>{formatCategory(entry.remainingValidityBand)}</td><td>{entry.captureInstant === null ? 'Not recorded' : formatTimestamp(entry.captureInstant)}</td><td>{entry.declaredValidUntil === null ? 'Not recorded' : formatTimestamp(entry.declaredValidUntil)}</td><td>{entry.refusalCode === null ? 'No refusal' : formatCategory(entry.refusalCode)}</td><td>{entry.blockedLanes.length === 0 ? 'None' : entry.blockedLanes.map(formatCategory).join(', ')}</td></tr>)}</tbody></table></div>}

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

export function OverviewView({ data, onRefresh }: { readonly data: OverviewSnapshot; readonly onRefresh: () => void }): ReactNode {
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

const OVERVIEW_SOURCE_LABELS: Record<keyof OverviewSourceStates, string> = {
  health: 'Health',
  meta: 'Service meta',
  readiness: 'Readiness',
  safety: 'Safety',
  source: 'Source summary',
};

/**
 * F-18. A partial Overview renders the sources that answered and discloses
 * every source that did not, by name and kind. It exists so a failed
 * readiness request cannot discard a working safety or source snapshot; the
 * whole-view error state is only for the case where nothing answered.
 */
export function OverviewPartialView({ sources, onRefresh }: { readonly sources: OverviewSourceStates; readonly onRefresh: () => void }): ReactNode {
  const entries: ReadonlyArray<readonly [keyof OverviewSourceStates, DataLoadState<unknown>]> = [
    ['health', sources.health],
    ['meta', sources.meta],
    ['readiness', sources.readiness],
    ['safety', sources.safety],
    ['source', sources.source],
  ];
  const failures: Array<readonly [keyof OverviewSourceStates, ApiErrorInfo]> = [];
  for (const [name, state] of entries) {
    // ABORTED is normal navigation and is never rendered as a failure.
    if (state.kind !== 'error') continue;
    const info = state.error ?? UNCLASSIFIED_API_ERROR;
    if (info.kind !== 'ABORTED') failures.push([name, info]);
  }
  return (
    <div className="view-stack">
      <section className="page-intro">
        <div>
          <p className="eyebrow">LOCAL INTELLIGENCE / OVERVIEW</p>
          <h1>Partial snapshot. What answered is shown.</h1>
          <p>One or more bounded local snapshots failed. The sections below render only what the service returned, and each failed source is named with its failure class and operator action.</p>
        </div>
      </section>
      {failures.map(([name, error]) => <DataErrorState key={name} title={`${OVERVIEW_SOURCE_LABELS[name]} unavailable`} error={error} onRetry={onRefresh} />)}
      <section className="content-grid">
        {sources.health.kind === 'ready' ? <article className="panel"><div className="panel-heading"><div><p className="eyebrow">HEALTH SNAPSHOT</p><h2>Local service health</h2></div><StatusPill value={sources.health.data.status} /></div><div className="data-grid"><DataRow label="Status" value={formatCategory(sources.health.data.status)} tone={statusTone(sources.health.data.status)} /><DataRow label="Scope" value={formatCategory(sources.health.data.scope)} /><DataRow label="Read only" value={sources.health.data.readOnly ? 'Yes' : 'No'} /><DataRow label="Product readiness" value={formatCategory(sources.health.data.productReadiness)} tone={statusTone(sources.health.data.productReadiness)} /></div></article> : null}
        {sources.meta.kind === 'ready' ? <article className="panel"><div className="panel-heading"><div><p className="eyebrow">SERVICE SNAPSHOT</p><h2>What the service declares</h2></div><StatusPill value={sources.meta.data.readOnly ? 'READY' : 'BLOCKED'} label="Read only" /></div><div className="data-grid"><DataRow label="API version" value={sources.meta.data.apiVersion} /><DataRow label="Service" value={formatCategory(sources.meta.data.service)} /><DataRow label="Scope" value={formatCategory(sources.meta.data.scope)} /><DataRow label="Local review decision" value={formatCategory(sources.meta.data.localReviewDecision ?? 'DISABLED')} tone={sources.meta.data.localReviewDecision === 'ENABLED' ? 'ready' : 'neutral'} /></div></article> : null}
        {sources.readiness.kind === 'ready' ? <article className="panel"><div className="panel-heading"><div><p className="eyebrow">READINESS SNAPSHOT</p><h2>Local synthetic readiness</h2></div><StatusPill value={sources.readiness.data.applies ? sources.readiness.data.state : 'NOT_APPLICABLE'} /></div><div className="data-grid"><DataRow label="State" value={formatCategory(sources.readiness.data.state)} tone={statusTone(sources.readiness.data.state)} /><DataRow label="Category" value={formatCategory(sources.readiness.data.category)} /><DataRow label="Unresolved blockers" value={String(sources.readiness.data.unresolvedBlockers.length)} tone={sources.readiness.data.unresolvedBlockers.length > 0 ? 'warning' : 'neutral'} /></div></article> : null}
        {sources.safety.kind === 'ready' ? <article className="panel"><div className="panel-heading"><div><p className="eyebrow">SAFETY SNAPSHOT</p><h2>Local safety posture</h2></div><StatusPill value={sources.safety.data.state} /></div><div className="data-grid"><DataRow label="State" value={formatCategory(sources.safety.data.state)} tone={statusTone(sources.safety.data.state)} /><DataRow label="Auth mode" value={formatCategory(sources.safety.data.authMode)} /><DataRow label="Network posture" value={formatCategory(sources.safety.data.networkPosture)} /><DataRow label="Checks" value={String(sources.safety.data.checks.length)} /></div></article> : null}
        {sources.source.kind === 'ready' ? <article className="panel"><div className="panel-heading"><div><p className="eyebrow">SOURCE SNAPSHOT</p><h2>Source inventory</h2></div><StatusPill value={sources.source.data.state} /></div><div className="data-grid"><DataRow label="State" value={formatCategory(sources.source.data.state)} tone={statusTone(sources.source.data.state)} /><DataRow label="Repositories" value={String(sources.source.data.repositoryCount)} /><DataRow label="Surfaces" value={String(sources.source.data.surfaceCount)} /><DataRow label="Inventory digest" value={sources.source.data.inventoryDigest === null ? 'Absent' : 'Recorded'} tone={sources.source.data.inventoryDigest === null ? 'warning' : 'neutral'} /></div></article> : null}
        {sources.readiness.kind === 'ready' ? <ReadinessDetailPanel readiness={sources.readiness.data} /> : null}
      </section>
    </div>
  );
}
