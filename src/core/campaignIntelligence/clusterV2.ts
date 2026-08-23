// Phase 19 — composite finding identity and duplicate suppression. Human
// messages are intentionally absent from the key.

import { CAMPAIGN_CLUSTER_V2_VERSION, safeCampaignDigest } from "./types";

export interface FindingClusterInput {
  readonly findingId: string;
  readonly semanticContractId: string | null;
  readonly invariantId: string | null;
  readonly behaviorClass: string;
  readonly normalizedFailureLocation: string;
  readonly sourceImpactIdentity: string | null;
  readonly replayFingerprint: string | null;
  readonly minimizedStructureDigest: string | null;
  readonly protocolClass: string | null;
  readonly sourceCurrentness: string;
}

export interface FindingClusterIdentity {
  readonly schemaVersion: typeof CAMPAIGN_CLUSTER_V2_VERSION;
  readonly clusterId: string;
  readonly semanticKey: string | null;
  readonly protocolKey: string | null;
  readonly sourceImpactIdentity: string | null;
  readonly sourceCurrentness: string;
  readonly deterministicDigest: string;
}

export interface FindingClusterGroup {
  readonly identity: FindingClusterIdentity;
  readonly findingIds: readonly string[];
  readonly representativeFindingId: string;
  readonly duplicateCount: number;
}

const SAFE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,199}$/;

function invalid(reason: string): never {
  throw new Error(`CAMPAIGN_CLUSTER_V2_INVALID:${reason}`);
}

function safeNullable(value: string | null, field: string): void {
  if (value !== null && !SAFE_ID_RE.test(value)) invalid(`${field}_ID`);
  if (value !== null && /(?:CUSTOMER_SENTINEL|ACCOUNT_SENTINEL|EMAIL_SENTINEL|COST_SENTINEL|TOKEN_SENTINEL|Bearer\s+|eyJ[A-Za-z0-9_-]{8,}\.|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i.test(value)) invalid(`${field}_PRIVACY`);
}

function validateInput(input: FindingClusterInput): void {
  for (const [field, value] of Object.entries(input)) {
    if (field === "sourceCurrentness") continue;
    if (value === null) continue;
    if (typeof value !== "string" || !SAFE_ID_RE.test(value)) invalid(`${field}_ID`);
    safeNullable(value, field);
  }
  if (!/^[A-Z_]{1,80}$/.test(input.sourceCurrentness)) invalid("CURRENTNESS");
}

/** Create a cluster identity without using message text or source currentness. */
export function findingClusterIdentity(input: FindingClusterInput): FindingClusterIdentity {
  validateInput(input);
  const semanticKey = input.semanticContractId !== null && input.invariantId !== null
    ? safeCampaignDigest({ semanticContractId: input.semanticContractId, invariantId: input.invariantId, behaviorClass: input.behaviorClass }, "semantic-key")
    : null;
  const protocolKey = semanticKey === null
    ? safeCampaignDigest({ protocolClass: input.protocolClass, normalizedFailureLocation: input.normalizedFailureLocation, replayFingerprint: input.replayFingerprint }, "protocol-key")
    : null;
  const key = {
    semanticKey,
    protocolKey,
    sourceImpactIdentity: input.sourceImpactIdentity,
  };
  const clusterId = safeCampaignDigest(key, "cluster");
  const core = {
    schemaVersion: CAMPAIGN_CLUSTER_V2_VERSION,
    clusterId,
    semanticKey,
    protocolKey,
    sourceImpactIdentity: input.sourceImpactIdentity,
    sourceCurrentness: input.sourceCurrentness,
  };
  return { ...core, deterministicDigest: safeCampaignDigest(core, "cluster-evidence") };
}

/** Group findings by the composite identity; source-currentness never changes the key. */
export function clusterFindings(inputs: readonly FindingClusterInput[]): readonly FindingClusterGroup[] {
  if (!Array.isArray(inputs) || inputs.length > 4096) invalid("FINDING_COUNT");
  const seen = new Set<string>();
  const groups = new Map<string, { identity: FindingClusterIdentity; findingIds: string[] }>();
  for (const input of inputs) {
    if (seen.has(input.findingId)) invalid("DUPLICATE_FINDING_ID");
    seen.add(input.findingId);
    const identity = findingClusterIdentity(input);
    const group = groups.get(identity.clusterId) ?? { identity, findingIds: [] };
    group.findingIds.push(input.findingId);
    groups.set(identity.clusterId, group);
  }
  return [...groups.values()]
    .map((group) => {
      const findingIds = [...group.findingIds].sort();
      return { identity: group.identity, findingIds, representativeFindingId: findingIds[0]!, duplicateCount: Math.max(0, findingIds.length - 1) };
    })
    .sort((left, right) => left.identity.clusterId.localeCompare(right.identity.clusterId));
}
