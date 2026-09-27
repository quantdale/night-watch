// ---------------------------------------------------------------------------
// M6 (7.6/C-20/B-12) — the read-only agent-campaign authority.
//
// It reads the OWNER-LOCAL agent-finding store and reports per-campaign rows.
// Read-only by construction: it has no write, no network, no child-process and
// no agent-runtime authority, and it never returns a filesystem path — only
// campaign ids, candidate ids, dossier identities and measured counts.
// ---------------------------------------------------------------------------

import { AgentFindingStore } from '../../core/localInvestigation/agentFindingStore';
import type { AgentFindingRecord } from '../../core/localInvestigation/agentFindingRecord';
import {
  AGENT_CAMPAIGN_REASON_CODES,
  type AgentCampaignReasonCode,
} from '../contracts/agentCampaigns';

export const AGENT_CAMPAIGN_AUTHORITY_VERSION = 'nightwatch.control-center.agent-campaign-authority.v1' as const;

export interface AgentCampaignAuthorityRow {
  readonly campaignId: string;
  readonly admissionState: 'ADMITTED_PERSISTED' | 'PROPOSED_NOT_PERSISTED' | 'NONE' | 'UNKNOWN';
  readonly persistedAdmissions: number;
  readonly candidateIds: readonly string[];
  readonly dossierIds: readonly string[];
}

export interface AgentCampaignAuthoritySnapshot {
  readonly schemaVersion: typeof AGENT_CAMPAIGN_AUTHORITY_VERSION;
  readonly state: 'AVAILABLE' | 'EMPTY' | 'UNAVAILABLE';
  readonly rows: readonly AgentCampaignAuthorityRow[];
  readonly actionableFindings: number;
  readonly reasonCodes: readonly AgentCampaignReasonCode[];
}

export interface AgentCampaignAuthority {
  readonly snapshot: () => AgentCampaignAuthoritySnapshot;
}

function rowsFromRecords(records: readonly AgentFindingRecord[]): readonly AgentCampaignAuthorityRow[] {
  const byCampaign = new Map<string, { candidates: Set<string>; dossiers: Set<string> }>();
  for (const record of records) {
    const entry = byCampaign.get(record.campaignId) ?? { candidates: new Set<string>(), dossiers: new Set<string>() };
    entry.candidates.add(record.candidateId);
    entry.dossiers.add(record.dossierId);
    byCampaign.set(record.campaignId, entry);
  }
  return [...byCampaign.entries()]
    .map(([campaignId, entry]) => ({
      campaignId,
      admissionState: 'ADMITTED_PERSISTED' as const,
      persistedAdmissions: entry.dossiers.size,
      candidateIds: [...entry.candidates].sort((left, right) => left.localeCompare(right)),
      dossierIds: [...entry.dossiers].sort((left, right) => left.localeCompare(right)),
    }))
    .sort((left, right) => left.campaignId.localeCompare(right.campaignId));
}

function createAuthority(root?: string): AgentCampaignAuthority {
  return {
    snapshot: () => {
      let records: readonly AgentFindingRecord[];
      try {
        const store = root === undefined ? new AgentFindingStore() : new AgentFindingStore({ root });
        records = store.list();
      } catch {
        // An unreadable store is an EXPLICITLY empty view with its reason, so
        // a missing owner-local root can never read as "no findings".
        return {
          schemaVersion: AGENT_CAMPAIGN_AUTHORITY_VERSION,
          state: 'UNAVAILABLE',
          rows: [],
          actionableFindings: 0,
          reasonCodes: ['AGENT_FINDINGS_UNAVAILABLE'],
        };
      }
      const rows = rowsFromRecords(records);
      const reasonCodes: AgentCampaignReasonCode[] = [];
      if (rows.length === 0) reasonCodes.push('AGENT_FINDINGS_EMPTY');
      return {
        schemaVersion: AGENT_CAMPAIGN_AUTHORITY_VERSION,
        state: rows.length === 0 ? 'EMPTY' : 'AVAILABLE',
        rows,
        actionableFindings: records.length,
        reasonCodes,
      };
    },
  };
}

/** The production authority: the owner-local agent-finding store. */
export function createAgentCampaignAuthority(): AgentCampaignAuthority {
  return createAuthority();
}

/** Test seam: an injected store root. Never wired to a request or CLI flag. */
export function createAgentCampaignAuthorityForTests(root: string): AgentCampaignAuthority {
  return createAuthority(root);
}

export { AGENT_CAMPAIGN_REASON_CODES };
