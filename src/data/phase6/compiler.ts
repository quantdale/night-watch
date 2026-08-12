import crypto from 'node:crypto';
import type {
  BigQueryReadPlan,
  CompiledToolRequest,
  DynamoReadPlan,
  ReadOnlyQueryPlan,
  RuntimeDataScope,
  ScopeRole,
  SpannerReadPlan,
  ValidatedReadPlan,
} from './types';
import { QueryPlanValidationError, validateRuntimeScope } from './validators';

function roleValue(scope: RuntimeDataScope, role: ScopeRole): string {
  const value = scope[role];
  if (value === undefined) throw new QueryPlanValidationError(`SCOPE_VALUE_MISSING:${role}`);
  return value;
}

function fingerprint(plan: ReadOnlyQueryPlan, scope: RuntimeDataScope): string {
  const values = plan.scopeRoles.map((role) => [role, roleValue(scope, role)] as const);
  return `qf:sha256:${crypto.createHash('sha256').update(JSON.stringify({ planId: plan.planId, values }), 'utf8').digest('hex').slice(0, 24)}`;
}

function dynamoKey(plan: DynamoReadPlan, scope: RuntimeDataScope): { partition: string; prefix?: string } {
  const month = scope.month;
  const vendor = scope.vendor;
  switch (plan.grammar) {
    case 'RIPPLE_J1_PAYER_JPY':
      if (month === undefined) throw new QueryPlanValidationError('SCOPE_VALUE_MISSING:month');
      return { partition: roleValue(scope, 'mspId'), prefix: `type|payer_exchangerate|month|${month}|vendor|` };
    case 'RIPPLE_J1_PAYER_NON_JPY':
      if (month === undefined || vendor === undefined) throw new QueryPlanValidationError('SCOPE_VALUE_MISSING:j1-non-jpy');
      return { partition: `${roleValue(scope, 'mspId')}|payer_exchange_rate`, prefix: `vendor|${vendor}|month|${month}|` };
    case 'RIPPLE_J2_COMMON_AWS_JPY':
      if (month === undefined) throw new QueryPlanValidationError('SCOPE_VALUE_MISSING:month');
      return { partition: roleValue(scope, 'mspId'), prefix: `type|setting_exchangerate|month|${month}|` };
    case 'RIPPLE_J2_COMMON_NON_AWS_JPY':
      if (month === undefined || vendor === undefined) throw new QueryPlanValidationError('SCOPE_VALUE_MISSING:j2-non-jpy');
      return { partition: roleValue(scope, 'mspId'), prefix: `type|exchangerate|vendor|${vendor}|month|${month}|` };
    case 'RIPPLE_J3_BILLING_GROUP_RATE':
      if (month === undefined) throw new QueryPlanValidationError('SCOPE_VALUE_MISSING:month');
      return { partition: roleValue(scope, 'mspId'), prefix: `type|billinggroup_exchange_rate|month|${month}|company_id|` };
    case 'COMPANIES_MSP_INDEX':
    case 'WAVE_CUSTOMER_MSP_INDEX':
      return { partition: roleValue(scope, 'mspId') };
    case 'WAVE_CUSTOMER_COMPANY_INDEX':
      return { partition: roleValue(scope, 'companyId') };
    case 'COMPANIES_BY_ID_GET':
      return { partition: `${roleValue(scope, 'mspId')}_${roleValue(scope, 'companyId')}` };
  }
}

function compileDynamo(plan: DynamoReadPlan, scope: RuntimeDataScope): CompiledToolRequest {
  const key = dynamoKey(plan, scope);
  if (plan.kind === 'DYNAMO_GET') {
    const argv = [
      'get-item',
      '--table-name', plan.table,
      '--key', JSON.stringify({ msp_company_id: { S: key.partition } }),
      '--projection-expression', plan.resultPolicy.projection.join(','),
    ];
    return {
      adapterVersion: 'nightwatch.data-adapter.phase6.v1',
      datastore: 'DYNAMODB',
      tool: 'dynamo-ro',
      argv,
      parameterRoles: plan.scopeRoles,
      queryFingerprint: fingerprint(plan, scope),
    };
  }
  const names: Record<string, string> = { '#pk': plan.grammar === 'COMPANIES_MSP_INDEX' || plan.grammar === 'WAVE_CUSTOMER_MSP_INDEX' || plan.grammar === 'WAVE_CUSTOMER_COMPANY_INDEX' ? 'msp_id' : 'id' };
  const values: Record<string, { S: string }> = { ':pk': { S: key.partition } };
  let expression = '#pk = :pk';
  if (key.prefix !== undefined) {
    names['#sk'] = 'sort_key';
    values[':prefix'] = { S: key.prefix };
    expression += ' AND begins_with(#sk, :prefix)';
  }
  if (plan.kind === 'DYNAMO_QUERY_GSI' && plan.index === 'company_id-index') names['#pk'] = 'company_id';
  const argv = [
    'query',
    '--table-name', plan.table,
    '--key-condition-expression', expression,
    '--expression-attribute-names', JSON.stringify(names),
    '--expression-attribute-values', JSON.stringify(values),
    '--projection-expression', plan.resultPolicy.projection.join(','),
    '--limit', String(plan.resultPolicy.limit),
  ];
  if (plan.index !== undefined) argv.push('--index-name', plan.index);
  return {
    adapterVersion: 'nightwatch.data-adapter.phase6.v1',
    datastore: 'DYNAMODB',
    tool: 'dynamo-ro',
    argv,
    parameterRoles: plan.scopeRoles,
    queryFingerprint: fingerprint(plan, scope),
  };
}

function compileBigQuery(plan: BigQueryReadPlan, scope: RuntimeDataScope): CompiledToolRequest {
  const fields = plan.fields.join(', ');
  const dataset = `msp_${roleValue(scope, 'mspId')}`;
  const table = `${roleValue(scope, 'monthCompact')}_${roleValue(scope, 'payerAccountId')}`;
  const compact = roleValue(scope, 'monthCompact');
  const year = Number(compact.slice(0, 4));
  const month = Number(compact.slice(4, 6));
  const firstDay = `${compact.slice(0, 4)}-${compact.slice(4, 6)}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  const sql = `SELECT ${fields} FROM \`mobingi-main.${dataset}.${table}\` WHERE lineitem_usageaccountid = @payer_account_id AND lineitem_usagestartdate >= @date_start AND lineitem_usagestartdate <= @date_end LIMIT ${plan.resultPolicy.limit}`;
  const argv = [
    'query', '--nouse_legacy_sql', '--format=json',
    '--parameter', `payer_account_id::${roleValue(scope, 'payerAccountId')}`,
    '--parameter', `date_start::${firstDay}`,
    '--parameter', `date_end::${lastDay}`,
    sql,
  ];
  return {
    adapterVersion: 'nightwatch.data-adapter.phase6.v1',
    datastore: 'BIGQUERY',
    tool: 'bq-ro',
    argv,
    parameterRoles: plan.scopeRoles,
    queryFingerprint: fingerprint(plan, scope),
  };
}

function compileSpanner(plan: SpannerReadPlan, scope: RuntimeDataScope): CompiledToolRequest {
  const sql = plan.table === 'awsdaily2'
    ? `SELECT ${plan.fields.join(', ')} FROM awsdaily2 WHERE id = @linked_account_id AND usage_date >= @date_start AND usage_date <= @date_end LIMIT ${plan.resultPolicy.limit}`
    : `SELECT ${plan.fields.join(', ')} FROM ${plan.table} WHERE msp_id = @msp_id LIMIT ${plan.resultPolicy.limit}`;
  const parameters = plan.table === 'awsdaily2'
    ? ([['linked_account_id', 'linkedAccountId'], ['date_start', 'dateStart'], ['date_end', 'dateEnd']] as const).map(([name, role]) => `--parameter=${name}::${roleValue(scope, role)}`)
    : [`--parameter=msp_id::${roleValue(scope, 'mspId')}`];
  const argv = ['--database=main', '--project=mobingi-main', '--instance=alphaus-prod', '--sql', sql, ...parameters];
  return {
    adapterVersion: 'nightwatch.data-adapter.phase6.v1',
    datastore: 'SPANNER',
    tool: 'spanner-ro',
    argv,
    parameterRoles: plan.scopeRoles,
    queryFingerprint: fingerprint(plan, scope),
  };
}

export function compileValidatedReadPlan(validated: ValidatedReadPlan, scope: RuntimeDataScope): CompiledToolRequest {
  validateRuntimeScope(validated, scope);
  switch (validated.plan.datastore) {
    case 'DYNAMODB': return compileDynamo(validated.plan, scope);
    case 'BIGQUERY': return compileBigQuery(validated.plan, scope);
    case 'SPANNER': return compileSpanner(validated.plan, scope);
  }
}
