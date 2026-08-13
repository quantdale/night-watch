// ---------------------------------------------------------------------------
// Nightwatch owner scope policy.
//
// This is executable policy, not a documentation reminder. The owner has
// frozen all infrastructure, deployment, cloud, datastore, team-coordination,
// and external-publication work. Callers must pass through this gate before an
// executor/connector/process can be reached. Unknown operation classes also
// fail closed.
// ---------------------------------------------------------------------------

export const OWNER_SCOPE_POLICY_VERSION = 'nightwatch.owner-scope-policy.v1' as const;
export const OWNER_SCOPE_STATUS = 'FROZEN_BY_OWNER' as const;
export const OWNER_SCOPE_REASON = 'INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE' as const;
export const OWNER_POLICY_BLOCKED = 'OWNER_POLICY_BLOCKED' as const;

export type OwnerAllowedOperation =
  | 'LOCAL_SOURCE_INTELLIGENCE'
  | 'READ_ONLY_GIT_SNAPSHOT'
  | 'CONTAINED_DEV_BROWSER'
  | 'CONTAINED_DEV_API'
  | 'DETERMINISTIC_REPLAY'
  | 'SYNTHETIC_FIXTURE'
  | 'PRIVATE_EVIDENCE'
  | 'PRIVATE_TRIAGE';

export type OwnerBlockedOperation =
  | 'GCP_INFRASTRUCTURE_ARCHAEOLOGY'
  | 'GKE_METADATA_INVESTIGATION'
  | 'KUBERNETES'
  | 'KUBECTL'
  | 'CLOUD_ASSET'
  | 'CLOUD_BUILD_DEPLOYMENT_ARCHAEOLOGY'
  | 'CLOUD_LOGGING_INFRASTRUCTURE_ARCHAEOLOGY'
  | 'ARTIFACT_REGISTRY_DEPLOYMENT_INVESTIGATION'
  | 'SERVICE_ACCOUNT_INVESTIGATION'
  | 'DEPLOYMENT_CONFIGURATION'
  | 'AWS_INFRASTRUCTURE_ARCHAEOLOGY'
  | 'AWS_STS_INFRA_DISCOVERY'
  | 'AWS_IAM_INFRA_DISCOVERY'
  | 'AWS_RUNTIME_ROLE_INVESTIGATION'
  | 'AWS_ACCOUNT_DISCOVERY'
  | 'DYNAMODB_DATA_ORACLE'
  | 'BIGQUERY_DATA_ORACLE'
  | 'SPANNER_DATA_ORACLE'
  | 'PRODUCTION_SQL'
  | 'DATASTORE_METADATA_DISCOVERY'
  | 'EXTERNAL_TEAM_REQUEST'
  | 'EXTERNAL_PUBLICATION';

export type OwnerScopedOperation = OwnerAllowedOperation | OwnerBlockedOperation | (string & {});

export interface OwnerPolicyDecision {
  readonly allowed: boolean;
  readonly code: typeof OWNER_POLICY_BLOCKED | 'OWNER_POLICY_ALLOWED';
  readonly operation: string;
  readonly policyVersion: typeof OWNER_SCOPE_POLICY_VERSION;
  readonly status: typeof OWNER_SCOPE_STATUS;
  readonly reason: string;
}

const ALLOWED_OPERATIONS = new Set<string>([
  'LOCAL_SOURCE_INTELLIGENCE',
  'READ_ONLY_GIT_SNAPSHOT',
  'CONTAINED_DEV_BROWSER',
  'CONTAINED_DEV_API',
  'DETERMINISTIC_REPLAY',
  'SYNTHETIC_FIXTURE',
  'PRIVATE_EVIDENCE',
  'PRIVATE_TRIAGE',
]);

export const FROZEN_OWNER_OPERATIONS: readonly OwnerBlockedOperation[] = [
  'GCP_INFRASTRUCTURE_ARCHAEOLOGY',
  'GKE_METADATA_INVESTIGATION',
  'KUBERNETES',
  'KUBECTL',
  'CLOUD_ASSET',
  'CLOUD_BUILD_DEPLOYMENT_ARCHAEOLOGY',
  'CLOUD_LOGGING_INFRASTRUCTURE_ARCHAEOLOGY',
  'ARTIFACT_REGISTRY_DEPLOYMENT_INVESTIGATION',
  'SERVICE_ACCOUNT_INVESTIGATION',
  'DEPLOYMENT_CONFIGURATION',
  'AWS_INFRASTRUCTURE_ARCHAEOLOGY',
  'AWS_STS_INFRA_DISCOVERY',
  'AWS_IAM_INFRA_DISCOVERY',
  'AWS_RUNTIME_ROLE_INVESTIGATION',
  'AWS_ACCOUNT_DISCOVERY',
  'DYNAMODB_DATA_ORACLE',
  'BIGQUERY_DATA_ORACLE',
  'SPANNER_DATA_ORACLE',
  'PRODUCTION_SQL',
  'DATASTORE_METADATA_DISCOVERY',
  'EXTERNAL_TEAM_REQUEST',
  'EXTERNAL_PUBLICATION',
];

function canonicalOperation(operation: string): string {
  return operation.trim().toUpperCase().replace(/[\s-]+/g, '_');
}

export function decideOwnerScope(operation: string): OwnerPolicyDecision {
  const normalized = canonicalOperation(operation);
  const allowed = ALLOWED_OPERATIONS.has(normalized);
  return {
    allowed,
    code: allowed ? 'OWNER_POLICY_ALLOWED' : OWNER_POLICY_BLOCKED,
    operation: normalized || 'UNKNOWN_OPERATION',
    policyVersion: OWNER_SCOPE_POLICY_VERSION,
    status: OWNER_SCOPE_STATUS,
    reason: allowed ? 'owner-approved local/application scope' : OWNER_SCOPE_REASON,
  };
}

export class OwnerPolicyBlockedError extends Error {
  readonly code = OWNER_POLICY_BLOCKED;
  readonly operation: string;
  readonly policyVersion = OWNER_SCOPE_POLICY_VERSION;
  readonly status = OWNER_SCOPE_STATUS;

  constructor(operation: string) {
    const decision = decideOwnerScope(operation);
    super(`${OWNER_POLICY_BLOCKED}: ${decision.operation}`);
    this.name = 'OwnerPolicyBlockedError';
    this.operation = decision.operation;
  }
}

/** Fail closed before the supplied executor can run. */
export function assertOwnerPolicyAllows(operation: OwnerScopedOperation): void {
  const decision = decideOwnerScope(operation);
  if (!decision.allowed) throw new OwnerPolicyBlockedError(decision.operation);
}

/** Guarded execution helper for future command/connector integrations. */
export function executeOwnerScoped<T>(operation: OwnerScopedOperation, executor: () => T): T {
  assertOwnerPolicyAllows(operation);
  return executor();
}

export function isOwnerPolicyBlocked(operation: string): boolean {
  return !decideOwnerScope(operation).allowed;
}

