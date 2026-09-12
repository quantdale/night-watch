import type { ReactNode } from 'react';
import type { OverviewSnapshot } from '../types';
import { CodeChips, DataRow, Guardrail, StatusPill, formatCategory, formatWireName, statusAnnotation, statusTone } from '../shared';

/** Safety Center view: posture, checks, continuity, declared authority. */

export function SafetyView({ data }: { readonly data: OverviewSnapshot }): ReactNode {
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
          <div className="scope-list"><span>State</span><strong className={`text-${statusTone(safety.continuity.state)}`} {...statusAnnotation('continuity-tone', statusTone(safety.continuity.state))}>{continuityValue}</strong><span>Branch</span><strong>{safety.continuity.branch ?? 'Not reported'}</strong><span>Head anchor</span><strong>{safety.continuity.headSha === null ? 'Not reported' : `${safety.continuity.headSha.slice(0, 7)}…`}</strong><span>Checkpoint receipt</span><strong>{safety.continuity.checkpointDigest === null ? 'Not reported' : 'Available'}</strong></div>
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
          <CodeChips label="Source gaps" codes={source.gapReasons} tone="warning" />
          {source.gapReasons.length === 0 ? <div className="callout"><strong>Inventory has no reported gaps</strong><span>Check currentness and proof rollups before relying on a source view.</span></div> : null}
        </article>
      </section>
    </div>
  );
}


