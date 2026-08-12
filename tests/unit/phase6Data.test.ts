import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  BigQueryReadAdapter,
  DynamoReadAdapter,
  GatedReadToolInvoker,
  DATA_ORACLE_CATALOG_VERSION,
  PHASE6_DATA_ORACLE_CATALOG,
  PHASE6_QUERY_PLANS,
  QueryBudgetManager,
  QueryPlanValidationError,
  SpannerReadAdapter,
  SyntheticReadToolInvoker,
  compareCrossLayer,
  compileValidatedReadPlan,
  createRunLocalSalt,
  createSanitizedDataEvidence,
  dataOracleAffectedByChange,
  evaluateDataOracleLineage,
  normalizeDataResult,
  privacyScanEvidence,
  validateReadOnlyPlan,
  type BigQueryReadPlan,
  type DynamoReadPlan,
  type RawDataResult,
  type SpannerReadPlan,
} from '../../src/data/phase6';
import { PHASE5_API_CATALOG } from '../../src/api/phase5/catalog';

const SHA = '0000000000000000000000000000000000000000';

const policy = {
  rawRowsPersisted: false as const,
  customerIdentifiersPersisted: false as const,
  financialValuesPersisted: false as const,
  projectionPurpose: 'synthetic metadata predicate',
};

const resultPolicy = {
  projection: ['id'],
  limit: 10,
  maxRows: 10,
  maxBytes: 1024,
  expectedCardinality: 'ANY' as const,
};

function source(pathName = 'synthetic/reader.ts') {
  return [{ repoId: 'synthetic/nightwatch', sourceSHA: SHA, path: pathName, symbol: 'read' }];
}

function bqPlan(): BigQueryReadPlan {
  return {
    schemaVersion: 'nightwatch.readonly-query-plan.phase6.v1',
    planId: 'synthetic.bq.scoped',
    datastore: 'BIGQUERY',
    kind: 'BQ_SELECT_SCOPED',
    project: 'mobingi-main',
    datasetFamily: 'MSP_DATASET',
    tableFamily: 'RAW_CUR_MONTHLY',
    fields: ['lineitem_usageaccountid', 'lineitem_usagestartdate'],
    requiresCostEstimate: true,
    sourceProvenance: source(),
    scopeRoles: ['mspId', 'monthCompact', 'payerAccountId'],
    resultPolicy,
    privacyPolicy: policy,
    consistencyClass: 'SNAPSHOT_MONTHLY',
    authority: 'HISTORICAL',
  };
}

function spannerPlan(): SpannerReadPlan {
  return {
    schemaVersion: 'nightwatch.readonly-query-plan.phase6.v1',
    planId: 'synthetic.spanner.scoped',
    datastore: 'SPANNER',
    kind: 'SPANNER_SELECT_SCOPED',
    project: 'mobingi-main',
    instance: 'alphaus-prod',
    database: 'main',
    table: 'awsdaily2',
    fields: ['id', 'usage_date'],
    requiresCostEstimate: false,
    sourceProvenance: source(),
    scopeRoles: ['linkedAccountId', 'dateStart', 'dateEnd'],
    resultPolicy,
    privacyPolicy: policy,
    consistencyClass: 'HISTORICAL_ONLY',
    authority: 'AUTHORITATIVE',
  };
}

test('Phase 6 durable catalogs are versioned, source-bound, and value-free', () => {
  const queryCatalog = JSON.parse(fs.readFileSync(path.resolve('corpus/phase6/query-plan-catalog.json'), 'utf8')) as { plans: Array<{ planId: string; scopeRoles?: string[] }> };
  const oracleCatalog = JSON.parse(fs.readFileSync(path.resolve('corpus/phase6/data-oracle-catalog.json'), 'utf8')) as { schemaVersion: string; oracles: Array<{ oracleId: string }> };
  expect(oracleCatalog.schemaVersion).toBe(DATA_ORACLE_CATALOG_VERSION);
  expect(queryCatalog.plans.map((plan) => plan.planId)).toEqual(PHASE6_QUERY_PLANS.map((plan) => plan.planId));
  expect(oracleCatalog.oracles.map((oracle) => oracle.oracleId)).toEqual(PHASE6_DATA_ORACLE_CATALOG.oracles.map((oracle) => oracle.oracleId));
  expect(JSON.stringify(queryCatalog)).not.toContain('company-');
  expect(JSON.stringify(queryCatalog)).not.toContain('customer-');
});

test('Dynamo source grammars compile only after typed plan and scope validation', () => {
  const plan = validateReadOnlyPlan(PHASE6_QUERY_PLANS[0]);
  const request = compileValidatedReadPlan(plan, { mspId: 'mspSynthetic', month: '2026-08' });
  expect(request.tool).toBe('dynamo-ro');
  expect(request.argv).toContain('RIPPLE');
  expect(request.argv.join(' ')).toContain('payer_exchangerate');
  expect(request.queryFingerprint).toMatch(/^qf:sha256:[a-f0-9]{24}$/);
  expect(() => compileValidatedReadPlan(plan, { mspId: 'msp;DROP', month: '2026-08' })).toThrow(QueryPlanValidationError);
  expect(() => compileValidatedReadPlan(plan, { mspId: 'mspSynthetic', month: '202608' })).toThrow('MONTH_FORMAT_INVALID');

  const exactGet = validateReadOnlyPlan({
    ...PHASE6_QUERY_PLANS[0],
    planId: 'synthetic.companies.get',
    kind: 'DYNAMO_GET',
    table: 'Companies',
    grammar: 'COMPANIES_BY_ID_GET',
    scopeRoles: ['mspId', 'companyId'],
  } as DynamoReadPlan);
  const getRequest = compileValidatedReadPlan(exactGet, { mspId: 'mspSynthetic', companyId: 'companySynthetic' });
  expect(getRequest.argv[0]).toBe('get-item');
  expect(getRequest.argv.join(' ')).toContain('msp_company_id');
});

test('malicious or unsafe plans reject before any adapter invocation', async () => {
  const invoker = new SyntheticReadToolInvoker();
  const safe = validateReadOnlyPlan(PHASE6_QUERY_PLANS[0]);
  const before = invoker.invocationCount();
  const adapter = new DynamoReadAdapter(invoker);
  await expect(adapter.execute(safe, { mspId: 'mspSynthetic', month: '2026-08' })).resolves.toBeTruthy();
  const afterSafe = invoker.invocationCount();
  expect(afterSafe).toBe(before + 1);

  const malicious = { ...PHASE6_QUERY_PLANS[0], scan: true } as unknown;
  expect(() => validateReadOnlyPlan(malicious)).toThrow('FORBIDDEN_QUERY_PRIMITIVE');
  expect(invoker.invocationCount()).toBe(afterSafe);

  const protectedScan = { ...PHASE6_QUERY_PLANS[0], table: 'REPORTS', grammar: 'RIPPLE_J1_PAYER_JPY' } as unknown;
  expect(() => validateReadOnlyPlan(protectedScan)).toThrow('PROTECTED_TABLE_SCAN_BLOCKED');
  const arbitrarySql = { ...bqPlan(), sql: 'DELETE FROM x' } as unknown;
  expect(() => validateReadOnlyPlan(arbitrarySql)).toThrow('FORBIDDEN_QUERY_PRIMITIVE');
  expect(() => validateReadOnlyPlan({ ...bqPlan(), queryText: 'DELETE FROM x' })).toThrow('UNSUPPORTED_PLAN_FIELD:queryText');
  expect(() => validateReadOnlyPlan({ ...spannerPlan(), kind: 'SPANNER_UPDATE' })).toThrow('SPANNER_KIND_INVALID');
});

test('BigQuery and Spanner are generated from explicit scoped fields, never SELECT * or unscoped targets', () => {
  const bq = validateReadOnlyPlan(bqPlan());
  const bqRequest = compileValidatedReadPlan(bq, { mspId: 'mspSynthetic', monthCompact: '202608', payerAccountId: 'payerSynthetic' });
  expect(bqRequest.tool).toBe('bq-ro');
  expect(bqRequest.argv.join(' ')).toContain('SELECT lineitem_usageaccountid, lineitem_usagestartdate');
  expect(bqRequest.argv.join(' ')).not.toContain('SELECT *');
  expect(() => compileValidatedReadPlan(bq, { mspId: 'mspSynthetic', monthCompact: '202608', payerAccountId: 'payer;DROP' })).toThrow('SCOPE_VALUE_UNSAFE');

  const spanner = validateReadOnlyPlan(spannerPlan());
  const spannerRequest = compileValidatedReadPlan(spanner, { linkedAccountId: 'linkedSynthetic', dateStart: '2026-08-01', dateEnd: '2026-08-31' });
  expect(spannerRequest.tool).toBe('spanner-ro');
  expect(spannerRequest.argv.join(' ')).toContain('LIMIT 10');
  expect(() => validateReadOnlyPlan({ ...spannerPlan(), scopeRoles: [] })).toThrow('SPANNER_SCOPE_REQUIRED');
  expect(() => validateReadOnlyPlan({ ...spannerPlan(), fields: ['*'] })).toThrow('SPANNER_FIELDS_INVALID');
  expect(() => compileValidatedReadPlan(spanner, { linkedAccountId: 'linkedSynthetic', dateStart: '2024-01-01', dateEnd: '2025-02-01' })).toThrow('RETENTION_SCOPE_EXCEEDED');
});

test('synthetic adapters, normalization, privacy reduction, and query budget stay bounded', async () => {
  const invoker = new SyntheticReadToolInvoker();
  const plan = validateReadOnlyPlan(PHASE6_QUERY_PLANS[5]);
  const scope = { companyId: 'companySynthetic' };
  const request = compileValidatedReadPlan(plan, scope);
  const sentinel = 'CUSTOMER_SENTINEL_42';
  const raw: RawDataResult = { rows: [{ customer_id: sentinel, company_id: 'companySynthetic', account_id: 'payerSynthetic' }], bytes: 120, durationMs: 2, source: 'SYNTHETIC' };
  invoker.setResponse(request.queryFingerprint, raw);
  const adapter = new DynamoReadAdapter(invoker);
  const result = await adapter.execute(plan, scope);
  const normalized = normalizeDataResult(result, { membershipField: 'customer_id', runLocalSalt: createRunLocalSalt() });
  expect(normalized.cardinality).toBe('ONE');
  expect(normalized.fieldNames).toEqual(['account_id', 'company_id', 'customer_id']);
  expect(JSON.stringify(normalized)).not.toContain(sentinel);

  const budget = new QueryBudgetManager(2, 10, 2048);
  const permit = budget.begin('D3.j3.account-inventory', plan, scope, 'FIRST');
  budget.complete(permit, result.rows.length, result.bytes);
  expect(budget.snapshot()).toMatchObject({ usedQueries: 1, remainingQueries: 1, usedRows: 1 });
  expect(() => budget.begin('D3.j3.account-inventory', plan, scope, 'FIRST')).toThrow('QUERY_DUPLICATE_WITHIN_RUN');
  expect(() => budget.begin('D3.j3.account-inventory', plan, scope, 'FRESH_REPLAY', 17 * 1024 * 1024)).toThrow('QUERY_COST_BUDGET_EXCEEDED');

  const oracle = PHASE6_DATA_ORACLE_CATALOG.oracles.find((item) => item.oracleId === 'D3.j3.account-inventory');
  if (oracle === undefined) throw new Error('D3 oracle missing');
  const evidence = createSanitizedDataEvidence({ evidenceId: 'synthetic.d3.1', oracle, runtimeRunId: 'synthetic.run', queryPlanId: plan.plan.planId, result: normalized, comparisonResult: 'DATA_CORROBORATES_RUNTIME', environmentClass: 'SYNTHETIC', queryTimingClass: 'FAST', safetyResult: 'PASS', evidenceLevel: 'L4' });
  privacyScanEvidence(evidence, [sentinel, 'payerSynthetic', 'companySynthetic']);
  expect(evidence.rawRowsPersisted).toBe(false);
  expect(invoker.invocationCount()).toBe(1);

  const bqInvoker = new SyntheticReadToolInvoker();
  const bqValidated = validateReadOnlyPlan(bqPlan());
  const bqRequest = compileValidatedReadPlan(bqValidated, { mspId: 'mspSynthetic', monthCompact: '202608', payerAccountId: 'payerSynthetic' });
  bqInvoker.setResponse(bqRequest.queryFingerprint, { rows: [{ lineitem_lineitemtype: 'Usage' }], bytes: 40, durationMs: 1 });
  const bqResult = await new BigQueryReadAdapter(bqInvoker).execute(bqValidated, { mspId: 'mspSynthetic', monthCompact: '202608', payerAccountId: 'payerSynthetic' });
  expect(normalizeDataResult(bqResult).cardinality).toBe('ONE');

  const spannerInvoker = new SyntheticReadToolInvoker();
  const spannerValidated = validateReadOnlyPlan(spannerPlan());
  const spannerScope = { linkedAccountId: 'linkedSynthetic', dateStart: '2026-08-01', dateEnd: '2026-08-31' };
  const spannerRequest = compileValidatedReadPlan(spannerValidated, spannerScope);
  spannerInvoker.setResponse(spannerRequest.queryFingerprint, { rows: [{ id: 'linkedSynthetic', usage_date: '2026-08-01' }], bytes: 30, durationMs: 1 });
  const spannerResult = await new SpannerReadAdapter(spannerInvoker).execute(spannerValidated, spannerScope);
  expect(normalizeDataResult(spannerResult).cardinality).toBe('ONE');

  await expect(new (class extends GatedReadToolInvoker {})().invoke(bqRequest)).rejects.toThrow('REAL_DATA_GATE_BLOCKED');
});

test('cross-layer comparator distinguishes matches, contradictions, async lag, and numeric semantics', () => {
  const data = normalizeDataResult({ rows: [{ status: 'READY', value: 10 }], bytes: 20, durationMs: 1, source: 'SYNTHETIC' }, { enumField: 'status', allowedEnumValues: ['READY', 'EMPTY'], numericField: 'value' });
  expect(compareCrossLayer({ mode: 'PRESENCE', runtime: { presence: true }, data, consistencyClass: 'DIRECT_READ', allowedLagMs: 0, elapsedMs: 1, scopeComplete: true }).result).toBe('DATA_CORROBORATES_RUNTIME');
  expect(compareCrossLayer({ mode: 'PRESENCE', runtime: { presence: false }, data, consistencyClass: 'DIRECT_READ', allowedLagMs: 0, elapsedMs: 1, scopeComplete: true }).result).toBe('DATA_PRESENT_RUNTIME_MISSING');
  expect(compareCrossLayer({ mode: 'ENUM', runtime: { enumValues: ['EMPTY'] }, data, consistencyClass: 'DIRECT_READ', allowedLagMs: 0, elapsedMs: 1, scopeComplete: true }).result).toBe('DATA_CONTRADICTS_RUNTIME');
  expect(compareCrossLayer({ mode: 'NUMERIC', runtime: { numeric: { sign: 'POSITIVE', magnitudeClass: 'MEDIUM' } }, data, consistencyClass: 'DIRECT_READ', allowedLagMs: 0, elapsedMs: 1, scopeComplete: true, numericContract: { metric: 'synthetic', currency: 'USD', vendor: 'aws', timeGrain: 'day', aggregationGrain: 'account', scopeGrain: 'payer', rounding: 'source', exchangeRateStage: 'none', feeTaxTreatment: 'source', transform: 'none' } }).result).toBe('DATA_CORROBORATES_RUNTIME');
  expect(compareCrossLayer({ mode: 'PRESENCE', runtime: { presence: true }, data, consistencyClass: 'DERIVED_ASYNC', allowedLagMs: 5000, elapsedMs: 10, scopeComplete: true }).result).toBe('DATA_TIMING_AMBIGUOUS');
  expect(compareCrossLayer({ mode: 'PRESENCE', runtime: { presence: true }, data, consistencyClass: 'DIRECT_READ', allowedLagMs: 0, elapsedMs: 1, scopeComplete: false }).result).toBe('DATA_SCOPE_AMBIGUOUS');
});

test('Phase 3 staleness reaches Phase 6 data oracles without reclassifying API semantics', () => {
  const d1 = PHASE6_DATA_ORACLE_CATALOG.oracles.find((oracle) => oracle.oracleId === 'D1.j1.payer-exchange');
  if (d1 === undefined) throw new Error('D1 oracle missing');
  expect(evaluateDataOracleLineage(d1).staleness).toBe('FRESH');
  expect(dataOracleAffectedByChange(d1, [{ repoId: 'mobingilabs/ripple-api', path: 'src/App/Handler/ExchangeRate.php', status: 'modify' }])).toBe(true);
  expect(dataOracleAffectedByChange(d1, [{ repoId: 'mobingilabs/ripple-ui', path: 'src/pages/Unrelated.vue', status: 'modify' }])).toBe(false);
  expect(PHASE5_API_CATALOG.operations.filter((operation) => operation.semanticClass === 'KNOWN_MUTATION')).toHaveLength(4);
});
