// ---------------------------------------------------------------------------
// M6 (7.6/C-20/B-12) — the agent-campaign view projection.
//
// One place turns the authority snapshot into the public DTO, field by field,
// through the shared sanitizers. Paths are not merely omitted here: the DTO
// has no field a path could occupy.
// ---------------------------------------------------------------------------

import { asSafeControlCenterId } from '../contracts/common';
import {
  CONTROL_CENTER_AGENT_CAMPAIGNS_SCHEMA_VERSION,
  type ControlCenterAgentCampaignRowDto,
  type ControlCenterAgentCampaignsDto,
} from '../contracts/agentCampaigns';
import type { AgentCampaignAuthoritySnapshot } from '../authorities/agentCampaignAuthority';

const MAX_ROWS = 512;
const MAX_IDS_PER_ROW = 64;
const DOSSIER_ID_RE = /^afr:sha256:[0-9a-f]{24}$/;

export function projectAgentCampaigns(snapshot: AgentCampaignAuthoritySnapshot): ControlCenterAgentCampaignsDto {
  const rows: ControlCenterAgentCampaignRowDto[] = [];
  for (const row of snapshot.rows.slice(0, MAX_ROWS)) {
    const campaignId = asSafeControlCenterId(row.campaignId);
    if (campaignId === null) continue;
    const candidateIds = row.candidateIds
      .map((value) => asSafeControlCenterId(value))
      .filter((value): value is NonNullable<typeof value> => value !== null)
      .slice(0, MAX_IDS_PER_ROW);
    const dossierIds = row.dossierIds.filter((value) => DOSSIER_ID_RE.test(value)).slice(0, MAX_IDS_PER_ROW);
    rows.push({
      campaignId,
      admissionState: row.admissionState,
      persistedAdmissions: Math.max(0, Math.min(1_000_000, Math.trunc(row.persistedAdmissions))),
      candidateIds,
      dossierIds,
    });
  }
  return {
    schemaVersion: CONTROL_CENTER_AGENT_CAMPAIGNS_SCHEMA_VERSION,
    state: snapshot.state,
    rows,
    actionableFindings: Math.max(0, Math.min(1_000_000, Math.trunc(snapshot.actionableFindings))),
    reasonCodes: [...snapshot.reasonCodes],
  };
}
