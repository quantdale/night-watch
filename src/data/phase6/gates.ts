import type { QueryBudgetManager } from './budget';

export type DataEnvironmentStatus = 'RUNTIME_DATA_ENV_CONFIRMED' | 'RUNTIME_DATA_ENV_SOURCE_DERIVED' | 'RUNTIME_DATA_ENV_UNRESOLVED';
export type DataAuthStatus = 'AVAILABLE' | 'AUTH_REQUIRED' | 'NOT_PROBED';

export interface DataEnvironmentMap {
  readonly runtimeHostClass: 'DEV_API' | 'LOCAL_FIXTURE' | 'UNKNOWN';
  readonly runtimeHost: string;
  readonly datastoreEnvironment: 'SAME_DEV_DATA_PLANE' | 'PRODUCTION_DATA_PLANE' | 'UNKNOWN';
  readonly status: DataEnvironmentStatus;
  readonly designatedScopeApproved: boolean;
  readonly sourceProvenance: readonly string[];
}

export interface DataExecutionGateInput {
  readonly environment: DataEnvironmentMap;
  readonly authStatus: DataAuthStatus;
  readonly scopeAvailable: boolean;
  readonly privacyPass: boolean;
  readonly budget: QueryBudgetManager;
}

export function assertRealDataReadAllowed(input: DataExecutionGateInput): void {
  if (input.environment.status !== 'RUNTIME_DATA_ENV_CONFIRMED') throw new Error('PHASE_6_RUNTIME_DATA_ENVIRONMENT_UNRESOLVED');
  if (!input.environment.designatedScopeApproved || !input.scopeAvailable) throw new Error('REAL_DATA_SCOPE_APPROVAL_UNRESOLVED');
  if (input.authStatus !== 'AVAILABLE') throw new Error('DATA_TOOL_AUTH_REQUIRED');
  if (!input.privacyPass) throw new Error('DATA_EVIDENCE_PRIVACY_BLOCKER');
  if (input.budget.snapshot().remainingQueries < 1) throw new Error('QUERY_BUDGET_EXCEEDED');
}

export function assertNoApplicationAuthReuse(authClass: string): void {
  if (authClass === 'DEV_BROWSER_PASSWORD' || authClass === 'STORAGE_STATE' || authClass === 'API_TOKEN') {
    throw new Error('APPLICATION_AUTH_IS_NOT_DATASTORE_AUTH');
  }
}
