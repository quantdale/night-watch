// ---------------------------------------------------------------------------
// Frozen agent tool catalog. Hallucinated tool ids fail closed.
// Execution is owned by src/core/agentTools (Lane C), not this module.
// Pure data.
// ---------------------------------------------------------------------------

import type { OwnerAllowedOperation } from '../policy/ownerScope';
import { closedLookup } from './closedVocabulary';

export const AGENT_TOOL_IDS = [
  'INSPECT_SOURCE_SURFACE',
  'QUERY_SYSTEM_MAP',
  'QUERY_BUG_ATLAS',
  'QUERY_SYSTEM_ATLAS',
  'RETRIEVE_SANITIZED_EVIDENCE',
  'REQUEST_ROUTE_CONTRACT_PROOF',
  'REQUEST_BROWSER_OBSERVATION',
  'REQUEST_API_OBSERVATION',
  'COMPARE_OBSERVATIONS',
  'RERUN_SAFE_REPRODUCTION',
  'ASK_DETERMINISTIC_ORACLE',
  'REQUEST_FINDING_PROPOSAL',
  'REQUEST_RELATED_HISTORICAL_BUGS',
] as const;
export type AgentToolId = (typeof AGENT_TOOL_IDS)[number];

export const AGENT_NETWORK_CONTACT_CLASSES = [
  'NONE',
  'READ_ONLY_GIT',
  'CONTAINED_BROWSER',
  'CONTAINED_API',
] as const;
export type AgentNetworkContactClass = (typeof AGENT_NETWORK_CONTACT_CLASSES)[number];

export const AGENT_MUTATION_CAPABILITIES = ['NONE'] as const;
export type AgentMutationCapability = (typeof AGENT_MUTATION_CAPABILITIES)[number];

export const AGENT_TOOL_ENVIRONMENTS = ['LOCAL', 'DEV', 'NEXT'] as const;
export type AgentToolEnvironment = (typeof AGENT_TOOL_ENVIRONMENTS)[number];

export interface AgentToolDescriptor {
  readonly id: AgentToolId;
  readonly authorizationClass: OwnerAllowedOperation;
  readonly environment: AgentToolEnvironment;
  readonly networkContactClass: AgentNetworkContactClass;
  readonly mutationCapability: AgentMutationCapability;
  readonly budgetImpact: 'READ' | 'OBSERVE' | 'REPLAY' | 'TRIAGE';
}

export const AGENT_TOOL_CATALOG: readonly AgentToolDescriptor[] = Object.freeze([
  Object.freeze({
    id: 'INSPECT_SOURCE_SURFACE',
    authorizationClass: 'LOCAL_SOURCE_INTELLIGENCE',
    environment: 'LOCAL',
    networkContactClass: 'NONE',
    mutationCapability: 'NONE',
    budgetImpact: 'READ',
  }),
  Object.freeze({
    id: 'QUERY_SYSTEM_MAP',
    authorizationClass: 'LOCAL_SOURCE_INTELLIGENCE',
    environment: 'LOCAL',
    networkContactClass: 'NONE',
    mutationCapability: 'NONE',
    budgetImpact: 'READ',
  }),
  Object.freeze({
    id: 'QUERY_BUG_ATLAS',
    authorizationClass: 'LOCAL_SOURCE_INTELLIGENCE',
    environment: 'LOCAL',
    networkContactClass: 'READ_ONLY_GIT',
    mutationCapability: 'NONE',
    budgetImpact: 'READ',
  }),
  Object.freeze({
    id: 'QUERY_SYSTEM_ATLAS',
    authorizationClass: 'LOCAL_SOURCE_INTELLIGENCE',
    environment: 'LOCAL',
    networkContactClass: 'NONE',
    mutationCapability: 'NONE',
    budgetImpact: 'READ',
  }),
  Object.freeze({
    id: 'RETRIEVE_SANITIZED_EVIDENCE',
    authorizationClass: 'PRIVATE_EVIDENCE',
    environment: 'LOCAL',
    networkContactClass: 'NONE',
    mutationCapability: 'NONE',
    budgetImpact: 'READ',
  }),
  Object.freeze({
    id: 'REQUEST_ROUTE_CONTRACT_PROOF',
    authorizationClass: 'LOCAL_SOURCE_INTELLIGENCE',
    environment: 'LOCAL',
    networkContactClass: 'NONE',
    mutationCapability: 'NONE',
    budgetImpact: 'READ',
  }),
  Object.freeze({
    id: 'REQUEST_BROWSER_OBSERVATION',
    authorizationClass: 'CONTAINED_DEV_BROWSER',
    environment: 'DEV',
    networkContactClass: 'CONTAINED_BROWSER',
    mutationCapability: 'NONE',
    budgetImpact: 'OBSERVE',
  }),
  Object.freeze({
    id: 'REQUEST_API_OBSERVATION',
    authorizationClass: 'CONTAINED_DEV_API',
    environment: 'DEV',
    networkContactClass: 'CONTAINED_API',
    mutationCapability: 'NONE',
    budgetImpact: 'OBSERVE',
  }),
  Object.freeze({
    id: 'COMPARE_OBSERVATIONS',
    authorizationClass: 'PRIVATE_TRIAGE',
    environment: 'LOCAL',
    networkContactClass: 'NONE',
    mutationCapability: 'NONE',
    budgetImpact: 'TRIAGE',
  }),
  Object.freeze({
    id: 'RERUN_SAFE_REPRODUCTION',
    authorizationClass: 'DETERMINISTIC_REPLAY',
    environment: 'LOCAL',
    networkContactClass: 'NONE',
    mutationCapability: 'NONE',
    budgetImpact: 'REPLAY',
  }),
  Object.freeze({
    id: 'ASK_DETERMINISTIC_ORACLE',
    authorizationClass: 'SYNTHETIC_FIXTURE',
    environment: 'LOCAL',
    networkContactClass: 'NONE',
    mutationCapability: 'NONE',
    budgetImpact: 'TRIAGE',
  }),
  Object.freeze({
    id: 'REQUEST_FINDING_PROPOSAL',
    authorizationClass: 'PRIVATE_TRIAGE',
    environment: 'LOCAL',
    networkContactClass: 'NONE',
    mutationCapability: 'NONE',
    budgetImpact: 'TRIAGE',
  }),
  Object.freeze({
    id: 'REQUEST_RELATED_HISTORICAL_BUGS',
    authorizationClass: 'LOCAL_SOURCE_INTELLIGENCE',
    environment: 'LOCAL',
    networkContactClass: 'READ_ONLY_GIT',
    mutationCapability: 'NONE',
    budgetImpact: 'READ',
  }),
]);
// NW-01: an object-backed catalog made `lookupAgentTool('constructor')`
// return an inherited function while `isAgentToolId` correctly said no, so a
// caller that trusted a non-null descriptor received `Object`. One closed
// lookup now answers both questions from the same table.
const TOOL_BY_ID = closedLookup<AgentToolDescriptor>(AGENT_TOOL_CATALOG.map((tool) => [tool.id, tool] as const));

export function isAgentToolId(value: unknown): value is AgentToolId {
  return TOOL_BY_ID.has(value);
}

export function lookupAgentTool(toolId: string): AgentToolDescriptor | null {
  return TOOL_BY_ID.get(toolId);
}
