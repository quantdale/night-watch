import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AgentCampaignsView } from './AgentCampaignsView';
import type { AgentCampaignsSnapshot } from '../types';

function snapshot(overrides: Partial<AgentCampaignsSnapshot> = {}): AgentCampaignsSnapshot {
  return {
    schemaVersion: 'nightwatch.control-center.agent-campaigns.v1',
    state: 'AVAILABLE',
    rows: [
      {
        campaignId: 'camp-alpha',
        admissionState: 'ADMITTED_PERSISTED',
        persistedAdmissions: 1,
        candidateIds: ['candidate-alpha'],
        dossierIds: ['afr:sha256:aaaaaaaaaaaaaaaaaaaaaaaa'],
      },
    ],
    actionableFindings: 1,
    reasonCodes: [],
    ...overrides,
  };
}

describe('AgentCampaignsView', () => {
  it('renders measured rows with identities and counts, never a path', () => {
    render(<AgentCampaignsView state={{ kind: 'ready', data: snapshot() }} />);
    expect(screen.getByText('camp-alpha')).toBeTruthy();
    // The status pill renders its label beside the measured value.
    expect(screen.getByText('Persisted')).toBeTruthy();
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/afr:sha256:aaaaaaaaaaaaaaaaaaaaaaaa/)).toBeTruthy();
    // The contract has no path field, so nothing path-shaped can be rendered.
    expect(document.body.textContent ?? '').not.toContain('/home/');
    expect(document.body.textContent ?? '').not.toContain('.nightwatch');
  });

  it('reports an unavailable store as unavailable, not as zero findings', () => {
    render(
      <AgentCampaignsView
        state={{
          kind: 'ready',
          data: snapshot({ state: 'UNAVAILABLE', rows: [], actionableFindings: 0, reasonCodes: ['AGENT_FINDINGS_UNAVAILABLE'] }),
        }}
      />,
    );
    expect(screen.getByText(/unavailable; this is not a zero-finding result/)).toBeTruthy();
  });

  it('renders an explicit empty state for an empty store', () => {
    render(<AgentCampaignsView state={{ kind: 'ready', data: snapshot({ state: 'EMPTY', rows: [], actionableFindings: 0, reasonCodes: ['AGENT_FINDINGS_EMPTY'] }) }} />);
    expect(screen.getByText(/holds no mechanically admitted finding yet/)).toBeTruthy();
  });

  it('shows a loading-safe state when the snapshot is not ready', () => {
    render(<AgentCampaignsView state={{ kind: 'loading' }} />);
    expect(screen.getByText(/Reading the owner-local agent-finding store/)).toBeTruthy();
  });
});
