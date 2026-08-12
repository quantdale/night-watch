import {
  DATA_EVIDENCE_VERSION,
  READ_ONLY_QUERY_PLAN_VERSION,
  type BigQueryReadPlan,
  type DynamoKeyGrammar,
  type DynamoReadPlan,
  type DynamoTable,
  type ReadOnlyQueryPlan,
  type RuntimeDataScope,
  type ScopeRole,
  type SpannerReadPlan,
  type ValidatedReadPlan,
} from './types';

export class QueryPlanValidationError extends Error {
  readonly code: string;

  constructor(code: string, message = code) {
    super(message);
    this.name = 'QueryPlanValidationError';
    this.code = code;
  }
}

const PROTECTED_DYNAMO_TABLES = new Set<DynamoTable>([
  'REPORTS',
  'TAGS',
  'RIPPLE_FEES',
  'RIPPLE_INVOICES',
  'UNBLENDED_EXPORT',
]);

const SAFE_DYNAMO_TABLES = new Set<DynamoTable>([
  'RIPPLE',
  'Companies',
  'WAVE_CB_CUSTOMER',
  'RIPPLE_CUSTOMER',
]);

const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const PLAN_ID_RE = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)+$/;
const SHA_RE = /^[a-f0-9]{40}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const COMPACT_MONTH_RE = /^\d{4}(0[1-9]|1[0-2])$/;

const FORBIDDEN_STRUCTURAL_KEYS = new Set([
  'sql',
  'query',
  'command',
  'shell',
  'script',
  'exec',
  'scan',
  'write',
  'mutation',
  'ddl',
  'selectAll',
  'select_all',
  'arbitraryUrl',
]);

const DYNAMO_RULES: Readonly<Record<DynamoKeyGrammar, {
  readonly table: DynamoTable;
  readonly kind: DynamoReadPlan['kind'];
  readonly index?: DynamoReadPlan['index'];
  readonly scopeRoles: readonly ScopeRole[];
}>> = {
  RIPPLE_J1_PAYER_JPY: { table: 'RIPPLE', kind: 'DYNAMO_QUERY_PREFIX', scopeRoles: ['mspId', 'month'] },
  RIPPLE_J1_PAYER_NON_JPY: { table: 'RIPPLE', kind: 'DYNAMO_QUERY_PREFIX', scopeRoles: ['mspId', 'month', 'vendor'] },
  RIPPLE_J2_COMMON_AWS_JPY: { table: 'RIPPLE', kind: 'DYNAMO_QUERY_PREFIX', scopeRoles: ['mspId', 'month'] },
  RIPPLE_J2_COMMON_NON_AWS_JPY: { table: 'RIPPLE', kind: 'DYNAMO_QUERY_PREFIX', scopeRoles: ['mspId', 'month', 'vendor'] },
  RIPPLE_J3_BILLING_GROUP_RATE: { table: 'RIPPLE', kind: 'DYNAMO_QUERY_PREFIX', scopeRoles: ['mspId', 'month'] },
  COMPANIES_MSP_INDEX: { table: 'Companies', kind: 'DYNAMO_QUERY_GSI', index: 'msp_id-index', scopeRoles: ['mspId'] },
  WAVE_CUSTOMER_MSP_INDEX: { table: 'WAVE_CB_CUSTOMER', kind: 'DYNAMO_QUERY_GSI', index: 'msp_id-index', scopeRoles: ['mspId'] },
  WAVE_CUSTOMER_COMPANY_INDEX: { table: 'WAVE_CB_CUSTOMER', kind: 'DYNAMO_QUERY_GSI', index: 'company_id-index', scopeRoles: ['companyId'] },
  COMPANIES_BY_ID_GET: { table: 'Companies', kind: 'DYNAMO_GET', scopeRoles: ['mspId', 'companyId'] },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function inspectForbiddenShape(value: unknown): void {
  if (Array.isArray(value)) {
    for (const item of value) inspectForbiddenShape(item);
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_STRUCTURAL_KEYS.has(key)) throw new QueryPlanValidationError('FORBIDDEN_QUERY_PRIMITIVE');
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      throw new QueryPlanValidationError('FORBIDDEN_OBJECT_KEY');
    }
    inspectForbiddenShape(child);
  }
}

function requireRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new QueryPlanValidationError('PLAN_NOT_OBJECT');
  return value;
}

function requireString(value: unknown, code: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new QueryPlanValidationError(code);
  return value;
}

function requirePlanId(value: unknown): string {
  const id = requireString(value, 'PLAN_ID_INVALID');
  if (!PLAN_ID_RE.test(id)) throw new QueryPlanValidationError('PLAN_ID_INVALID');
  return id;
}

function requireSourceProvenance(value: unknown): void {
  if (!Array.isArray(value) || value.length === 0) throw new QueryPlanValidationError('SOURCE_PROVENANCE_MISSING');
  for (const item of value) {
    const record = requireRecord(item);
    const repoId = requireString(record['repoId'], 'SOURCE_REPO_MISSING');
    const sourceSHA = requireString(record['sourceSHA'], 'SOURCE_SHA_MISSING');
    const path = requireString(record['path'], 'SOURCE_PATH_MISSING');
    const symbol = requireString(record['symbol'], 'SOURCE_SYMBOL_MISSING');
    if (!repoId.includes('/') || (!SHA_RE.test(sourceSHA) && sourceSHA !== 'synthetic')) {
      throw new QueryPlanValidationError('SOURCE_PROVENANCE_INVALID');
    }
    if (path.startsWith('/') || path.includes('..') || symbol.includes('\n')) {
      throw new QueryPlanValidationError('SOURCE_PROVENANCE_INVALID');
    }
  }
}

function requireRoles(value: unknown): ScopeRole[] {
  if (!Array.isArray(value) || value.some((role) => typeof role !== 'string')) {
    throw new QueryPlanValidationError('SCOPE_ROLES_INVALID');
  }
  const roles = [...new Set(value as ScopeRole[])];
  if (roles.length !== value.length || roles.some((role) => !isScopeRole(role))) {
    throw new QueryPlanValidationError('SCOPE_ROLES_INVALID');
  }
  return roles;
}

function isScopeRole(value: string): value is ScopeRole {
  return ['mspId', 'mspDatasetSuffix', 'companyId', 'billingGroupId', 'payerAccountId', 'awsAccountId', 'linkedAccountId', 'vendor', 'month', 'monthCompact', 'dateStart', 'dateEnd'].includes(value);
}

function sameRoles(actual: readonly ScopeRole[], expected: readonly ScopeRole[]): boolean {
  return [...actual].sort().join('|') === [...expected].sort().join('|');
}

function requireResultPolicy(value: unknown): void {
  const policy = requireRecord(value);
  const projection = policy['projection'];
  if (!Array.isArray(projection) || projection.length === 0 || projection.length > 16 || projection.some((field) => typeof field !== 'string' || field === '*' || !/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(field))) {
    throw new QueryPlanValidationError('PROJECTION_INVALID');
  }
  const limit = typeof policy['limit'] === 'number' ? policy['limit'] : -1;
  const maxRows = typeof policy['maxRows'] === 'number' ? policy['maxRows'] : -1;
  const maxBytes = typeof policy['maxBytes'] === 'number' ? policy['maxBytes'] : -1;
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000 || !Number.isInteger(maxRows) || maxRows < 1 || maxRows > 1000 || limit > maxRows) {
    throw new QueryPlanValidationError('RESULT_LIMIT_INVALID');
  }
  if (!Number.isInteger(maxBytes) || maxBytes < 1 || maxBytes > 4 * 1024 * 1024) {
    throw new QueryPlanValidationError('RESULT_SIZE_INVALID');
  }
  if (policy['expectedCardinality'] !== 'ZERO' && policy['expectedCardinality'] !== 'ONE' && policy['expectedCardinality'] !== 'MANY' && policy['expectedCardinality'] !== 'ANY') {
    throw new QueryPlanValidationError('EXPECTED_CARDINALITY_INVALID');
  }
}

function requirePrivacyPolicy(value: unknown): void {
  const policy = requireRecord(value);
  if (policy['rawRowsPersisted'] !== false || policy['customerIdentifiersPersisted'] !== false || policy['financialValuesPersisted'] !== false) {
    throw new QueryPlanValidationError('PRIVACY_POLICY_UNSAFE');
  }
  requireString(policy['projectionPurpose'], 'PRIVACY_PURPOSE_MISSING');
}

function requireExactKeys(record: Record<string, unknown>, allowed: readonly string[]): void {
  const allowedSet = new Set(allowed);
  const unknown = Object.keys(record).find((key) => !allowedSet.has(key));
  if (unknown !== undefined) throw new QueryPlanValidationError(`UNSUPPORTED_PLAN_FIELD:${unknown}`);
}

function validateCommon(plan: Record<string, unknown>): void {
  if (plan['schemaVersion'] !== READ_ONLY_QUERY_PLAN_VERSION) throw new QueryPlanValidationError('PLAN_VERSION_UNSUPPORTED');
  requirePlanId(plan['planId']);
  requireSourceProvenance(plan['sourceProvenance']);
  requireRoles(plan['scopeRoles']);
  requireResultPolicy(plan['resultPolicy']);
  requirePrivacyPolicy(plan['privacyPolicy']);
  if (!['DIRECT_READ', 'DERIVED_SYNCHRONOUS', 'DERIVED_ASYNC', 'EVENTUALLY_CONSISTENT', 'SNAPSHOT_MONTHLY', 'HISTORICAL_ONLY', 'UNKNOWN_CONSISTENCY'].includes(String(plan['consistencyClass']))) {
    throw new QueryPlanValidationError('CONSISTENCY_CLASS_INVALID');
  }
  if (!['AUTHORITATIVE', 'DERIVED', 'CACHE', 'EXPORT', 'HISTORICAL', 'UNKNOWN'].includes(String(plan['authority']))) {
    throw new QueryPlanValidationError('AUTHORITY_INVALID');
  }
}

function validateDynamo(plan: Record<string, unknown>): DynamoReadPlan {
  requireExactKeys(plan, ['schemaVersion', 'planId', 'datastore', 'kind', 'table', 'grammar', 'index', 'sourceProvenance', 'scopeRoles', 'resultPolicy', 'privacyPolicy', 'consistencyClass', 'authority']);
  if (plan['datastore'] !== 'DYNAMODB') throw new QueryPlanValidationError('DATASTORE_KIND_MISMATCH');
  const table = plan['table'];
  if (typeof table !== 'string' || !SAFE_DYNAMO_TABLES.has(table as DynamoTable)) {
    if (PROTECTED_DYNAMO_TABLES.has(table as DynamoTable)) throw new QueryPlanValidationError('PROTECTED_TABLE_SCAN_BLOCKED');
    throw new QueryPlanValidationError('DYNAMO_TABLE_NOT_ALLOWLISTED');
  }
  const grammar = plan['grammar'];
  if (typeof grammar !== 'string' || !(grammar in DYNAMO_RULES)) throw new QueryPlanValidationError('DYNAMO_KEY_GRAMMAR_UNKNOWN');
  const rule = DYNAMO_RULES[grammar as DynamoKeyGrammar];
  if (rule.table !== table || rule.kind !== plan['kind'] || rule.index !== plan['index']) {
    throw new QueryPlanValidationError('DYNAMO_GRAMMAR_MISMATCH');
  }
  const roles = requireRoles(plan['scopeRoles']);
  if (!sameRoles(roles, rule.scopeRoles)) throw new QueryPlanValidationError('DYNAMO_SCOPE_ROLES_MISMATCH');
  if (plan['kind'] !== 'DYNAMO_GET' && plan['kind'] !== 'DYNAMO_QUERY_PREFIX' && plan['kind'] !== 'DYNAMO_QUERY_GSI') {
    throw new QueryPlanValidationError('DYNAMO_ACCESS_UNSUPPORTED');
  }
  if (plan['kind'] === 'DYNAMO_QUERY_GSI' && typeof plan['index'] !== 'string') throw new QueryPlanValidationError('DYNAMO_INDEX_MISSING');
  return plan as unknown as DynamoReadPlan;
}

function validateBigQuery(plan: Record<string, unknown>): BigQueryReadPlan {
  requireExactKeys(plan, ['schemaVersion', 'planId', 'datastore', 'kind', 'project', 'datasetFamily', 'tableFamily', 'fields', 'requiresCostEstimate', 'sourceProvenance', 'scopeRoles', 'resultPolicy', 'privacyPolicy', 'consistencyClass', 'authority']);
  if (plan['datastore'] !== 'BIGQUERY' || plan['kind'] !== 'BQ_SELECT_SCOPED') throw new QueryPlanValidationError('BQ_KIND_INVALID');
  if (plan['project'] !== 'mobingi-main' || plan['datasetFamily'] !== 'MSP_DATASET' || plan['tableFamily'] !== 'RAW_CUR_MONTHLY') {
    throw new QueryPlanValidationError('BQ_TARGET_NOT_ALLOWLISTED');
  }
  const fields = plan['fields'];
  if (!Array.isArray(fields) || fields.length === 0 || fields.some((field) => typeof field !== 'string' || field === '*')) throw new QueryPlanValidationError('BQ_FIELDS_INVALID');
  const allowed = new Set(['lineitem_usageaccountid', 'lineitem_unblendedcost', 'lineitem_currencycode', 'lineitem_lineitemtype', 'lineitem_usagestartdate']);
  if (fields.some((field) => !allowed.has(field))) throw new QueryPlanValidationError('BQ_FIELD_NOT_ALLOWLISTED');
  if (plan['requiresCostEstimate'] !== true) throw new QueryPlanValidationError('BQ_COST_GATE_MISSING');
  if (!sameRoles(requireRoles(plan['scopeRoles']), ['mspDatasetSuffix', 'monthCompact', 'payerAccountId'])) throw new QueryPlanValidationError('BQ_SCOPE_REQUIRED');
  return plan as unknown as BigQueryReadPlan;
}

function validateSpanner(plan: Record<string, unknown>): SpannerReadPlan {
  requireExactKeys(plan, ['schemaVersion', 'planId', 'datastore', 'kind', 'project', 'instance', 'database', 'table', 'fields', 'requiresCostEstimate', 'sourceProvenance', 'scopeRoles', 'resultPolicy', 'privacyPolicy', 'consistencyClass', 'authority']);
  if (plan['datastore'] !== 'SPANNER' || plan['kind'] !== 'SPANNER_SELECT_SCOPED') throw new QueryPlanValidationError('SPANNER_KIND_INVALID');
  if (plan['project'] !== 'mobingi-main' || plan['instance'] !== 'alphaus-prod' || plan['database'] !== 'main') throw new QueryPlanValidationError('SPANNER_TARGET_NOT_ALLOWLISTED');
  if (!['awsdaily2', 'customers', 'companies'].includes(String(plan['table']))) throw new QueryPlanValidationError('SPANNER_TABLE_NOT_ALLOWLISTED');
  const fields = plan['fields'];
  if (!Array.isArray(fields) || fields.length === 0 || fields.some((field) => typeof field !== 'string' || field === '*')) throw new QueryPlanValidationError('SPANNER_FIELDS_INVALID');
  const allowed = new Set(['id', 'companyId', 'mspId', 'payerId', 'date', 'vendor']);
  if (fields.some((field) => !allowed.has(field))) throw new QueryPlanValidationError('SPANNER_FIELD_NOT_ALLOWLISTED');
  if (plan['requiresCostEstimate'] !== false) throw new QueryPlanValidationError('SPANNER_COST_FLAG_INVALID');
  const roles = requireRoles(plan['scopeRoles']);
  const expected: ScopeRole[] = plan['table'] === 'awsdaily2' ? ['linkedAccountId', 'dateStart', 'dateEnd'] : ['mspId'];
  if (!sameRoles(roles, expected)) throw new QueryPlanValidationError('SPANNER_SCOPE_REQUIRED');
  return plan as unknown as SpannerReadPlan;
}

export function validateReadOnlyPlan(input: unknown): ValidatedReadPlan {
  inspectForbiddenShape(input);
  const plan = requireRecord(input);
  validateCommon(plan);
  let validated: ReadOnlyQueryPlan;
  if (plan['datastore'] === 'DYNAMODB') validated = validateDynamo(plan);
  else if (plan['datastore'] === 'BIGQUERY') validated = validateBigQuery(plan);
  else if (plan['datastore'] === 'SPANNER') validated = validateSpanner(plan);
  else throw new QueryPlanValidationError('DATASTORE_UNSUPPORTED');
  return Object.freeze({ __validatedReadPlan: true as const, plan: validated });
}

function scopeValue(scope: RuntimeDataScope, role: ScopeRole): string | undefined {
  return scope[role];
}

function validateScopeValue(role: ScopeRole, value: string): void {
  if (role === 'month' && !MONTH_RE.test(value)) throw new QueryPlanValidationError('MONTH_FORMAT_INVALID');
  if (role === 'monthCompact' && !COMPACT_MONTH_RE.test(value)) throw new QueryPlanValidationError('MONTH_COMPACT_FORMAT_INVALID');
  if (role === 'vendor' && !['aws', 'azure', 'gcp'].includes(value)) throw new QueryPlanValidationError('VENDOR_NOT_ALLOWLISTED');
  if (role === 'dateStart' || role === 'dateEnd') {
    if (!DATE_RE.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) throw new QueryPlanValidationError('DATE_FORMAT_INVALID');
    return;
  }
  if (role !== 'month' && role !== 'monthCompact' && role !== 'vendor' && !ID_RE.test(value)) throw new QueryPlanValidationError('SCOPE_VALUE_UNSAFE');
}

export function validateRuntimeScope(plan: ValidatedReadPlan, scope: RuntimeDataScope): RuntimeDataScope {
  for (const role of plan.plan.scopeRoles) {
    const value = scopeValue(scope, role);
    if (value === undefined || value === '') throw new QueryPlanValidationError(`SCOPE_VALUE_MISSING:${role}`);
    validateScopeValue(role, value);
  }
  if (scope.dateStart !== undefined && scope.dateEnd !== undefined) {
    const start = Date.parse(`${scope.dateStart}T00:00:00Z`);
    const end = Date.parse(`${scope.dateEnd}T00:00:00Z`);
    if (start > end) throw new QueryPlanValidationError('DATE_RANGE_INVALID');
    if (plan.plan.datastore === 'SPANNER' && plan.plan.table === 'awsdaily2' && end - start > 384 * 24 * 60 * 60 * 1000) {
      throw new QueryPlanValidationError('RETENTION_SCOPE_EXCEEDED');
    }
  }
  return scope;
}

export function requiredDynamoRoles(grammar: DynamoKeyGrammar): readonly ScopeRole[] {
  return DYNAMO_RULES[grammar].scopeRoles;
}

export function isProtectedDynamoTable(table: string): boolean {
  return PROTECTED_DYNAMO_TABLES.has(table as DynamoTable);
}

export function queryPlanSchemaSummary(): Record<string, string> {
  return {
    schemaVersion: READ_ONLY_QUERY_PLAN_VERSION,
    evidenceVersion: DATA_EVIDENCE_VERSION,
    dynamo: 'exact allow-listed table + source-derived key grammar + bounded projection/limit',
    bigquery: 'mobingi-main + msp dataset + raw CUR month/payer + explicit fields + cost gate',
    spanner: 'mobingi-main/alphaus-prod/main + allow-listed table/fields + high-cardinality scope',
  };
}
