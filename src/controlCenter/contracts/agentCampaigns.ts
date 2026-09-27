// ---------------------------------------------------------------------------
// M6 (7.6/C-20/B-12) — the read-only agent-campaign view contract.
//
// The autonomous hunt's owner-local state was visible only through the agent
// CLI. This surface exposes it to the Control Center as MEASURED rows read
// from the durable agent-finding store. It carries identities and counts only:
// no filesystem path, no store root, no dossier prose, and no evidence body
// ever crosses this boundary.
// ---------------------------------------------------------------------------

import { CONTROL_CENTER_CONTRACT_NAMESPACE } from './common';
import type { SafeControlCenterId } from './common';

export const CONTROL_CENTER_AGENT_CAMPAIGNS_SCHEMA_VERSION =
  `${CONTROL_CENTER_CONTRACT_NAMESPACE}.agent-campaigns.v1` as const;

/** The closed admission-state vocabulary of one campaign row. */
export const AGENT_CAMPAIGN_ADMISSION_STATES = [
  'ADMITTED_PERSISTED',
  'PROPOSED_NOT_PERSISTED',
  'NONE',
  'UNKNOWN',
] as const;
export type AgentCampaignAdmissionState = (typeof AGENT_CAMPAIGN_ADMISSION_STATES)[number];

/** The closed reason vocabulary of this view. */
export const AGENT_CAMPAIGN_REASON_CODES = [
  'AGENT_FINDINGS_EMPTY',
  /** The owner-local store could not be read; the view is explicitly empty. */
  'AGENT_FINDINGS_UNAVAILABLE',
  /** A stored record was refused by its own validator and was not projected. */
  'AGENT_FINDINGS_RECORD_REFUSED',
] as const;
export type AgentCampaignReasonCode = (typeof AGENT_CAMPAIGN_REASON_CODES)[number];

export interface ControlCenterAgentCampaignRowDto {
  readonly campaignId: SafeControlCenterId;
  readonly admissionState: AgentCampaignAdmissionState;
  /** Durable records this campaign holds. Measured, never a constant. */
  readonly persistedAdmissions: number;
  readonly candidateIds: readonly SafeControlCenterId[];
  /** Content-addressed dossier identities (`afr:sha256:<24>`), never paths. */
  readonly dossierIds: readonly string[];
}

export interface ControlCenterAgentCampaignsDto {
  readonly schemaVersion: typeof CONTROL_CENTER_AGENT_CAMPAIGNS_SCHEMA_VERSION;
  readonly state: 'AVAILABLE' | 'EMPTY' | 'UNAVAILABLE';
  readonly rows: readonly ControlCenterAgentCampaignRowDto[];
  /** Total durable records across every campaign. */
  readonly actionableFindings: number;
  readonly reasonCodes: readonly AgentCampaignReasonCode[];
}
