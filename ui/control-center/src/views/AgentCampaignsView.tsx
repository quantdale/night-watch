import type { ReactNode } from 'react';
import type { AgentCampaignsSnapshot } from '../types';
import { DataRow, StatusPill, formatCategory, formatWireName } from '../shared';

/**
 * M6 (7.11): the read-only autonomous-hunt view.
 *
 * Rows are read from the durable owner-local agent-finding store. The view
 * shows identities and counts — campaign, candidates, content-addressed
 * dossier ids — and never a filesystem path, a dossier body, or an evidence
 * value: the server contract has no field for one.
 */
export function AgentCampaignsView({ state }: { readonly state: { readonly kind: string; readonly data?: AgentCampaignsSnapshot } }): ReactNode {
  if (state.kind !== 'ready' || state.data === undefined) {
    return (
      <div className="view-stack">
        <section className="hero-card">
          <div className="hero-copy">
            <p className="eyebrow">AUTONOMOUS HUNT / AGENT CAMPAIGNS</p>
            <h1>Reading the owner-local agent-finding store.</h1>
            <p className="hero-description">The snapshot has not arrived yet. An unreadable store is reported as unavailable, never as an empty result.</p>
          </div>
        </section>
      </div>
    );
  }
  const data = state.data;
  return (
    <div className="view-stack">
      <section className="hero-card">
        <div className="hero-copy">
          <p className="eyebrow">AUTONOMOUS HUNT / AGENT CAMPAIGNS</p>
          <h1>Measured admissions, or an explicit absence.</h1>
          <p className="hero-description">Every row is read from the durable owner-local agent-finding store. Identities and counts only — no path, no dossier body, no evidence value crosses this surface.</p>
          <div className="hero-actions">
            <StatusPill value={data.state} />
            <StatusPill value={`${data.actionableFindings} records`} label="Persisted" />
            <StatusPill value={`${data.rows.length} campaigns`} label="Rows" />
          </div>
          {/* The store's own reason codes are shown verbatim, so an empty or
              unavailable store is never silently presented as a clean one. */}
          <div className="data-grid">
            <DataRow label="Reason codes" value={data.reasonCodes.length === 0 ? 'none' : data.reasonCodes.join(', ')} tone={data.reasonCodes.length === 0 ? 'ready' : 'warning'} />
          </div>
        </div>
      </section>

      {data.rows.length === 0 ? (
        <section className="content-grid">
          <article className="panel panel-wide">
            <div className="panel-heading"><div><p className="eyebrow">ADMISSIONS</p><h2>No persisted admission</h2></div><StatusPill value={data.state} /></div>
            <p className="panel-intro">
              {data.reasonCodes.includes('AGENT_FINDINGS_UNAVAILABLE')
                ? 'The owner-local store is unavailable; this is not a zero-finding result.'
                : 'The owner-local store holds no mechanically admitted finding yet.'}
            </p>
          </article>
        </section>
      ) : (
        <section className="content-grid">
          {data.rows.map((row) => (
            <article className="panel" key={row.campaignId}>
              <div className="panel-heading">
                <div><p className="eyebrow">CAMPAIGN</p><h2>{row.campaignId}</h2></div>
                <StatusPill value={row.admissionState} />
              </div>
              <div className="data-grid">
                <DataRow label="Admission state" value={formatCategory(row.admissionState)} tone={row.admissionState === 'ADMITTED_PERSISTED' ? 'ready' : 'warning'} />
                <DataRow label="Persisted admissions" value={String(row.persistedAdmissions)} tone="ready" />
                <DataRow label="Candidates" value={String(row.candidateIds.length)} tone="ready" />
                <DataRow label="Dossier identities" value={String(row.dossierIds.length)} tone="ready" />
              </div>
              {row.candidateIds.length > 0 ? (
                <p className="panel-intro">Candidates: {row.candidateIds.map((id) => formatWireName(id)).join(', ')}</p>
              ) : null}
              {row.dossierIds.length > 0 ? (
                <p className="panel-intro">Dossiers: {row.dossierIds.join(', ')}</p>
              ) : null}
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
