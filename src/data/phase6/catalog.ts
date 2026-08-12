import { PHASE5_API_CATALOG, PHASE5_SOURCE_SHAS } from '../../api/phase5/catalog';
import type {
  DataOracleCatalog,
  DataOracleSpec,
  DynamoReadPlan,
  QueryPlanPrivacyPolicy,
  QueryPlanResultPolicy,
  ReadOnlyQueryPlan,
  SourceProvenance,
} from './types';
import {
  CROSS_LAYER_LINEAGE_VERSION,
  DATA_ORACLE_CATALOG_VERSION,
  READ_ONLY_QUERY_PLAN_VERSION,
  type CrossLayerLineage,
  type CrossLayerLineageEdge,
} from './types';

const privacyPolicy: QueryPlanPrivacyPolicy = {
  rawRowsPersisted: false,
  customerIdentifiersPersisted: false,
  financialValuesPersisted: false,
  projectionPurpose: 'metadata-only predicate evaluation',
};

const oneOrMany: QueryPlanResultPolicy = {
  projection: ['id', 'sort_key'],
  limit: 100,
  maxRows: 100,
  maxBytes: 512 * 1024,
  expectedCardinality: 'ANY',
};

function provenance(repoId: string, sourceSHA: string, path: string, symbol: string): SourceProvenance {
  return { repoId, sourceSHA, path, symbol };
}

function dynamoPlan(args: {
  readonly planId: string;
  readonly grammar: DynamoReadPlan['grammar'];
  readonly kind: DynamoReadPlan['kind'];
  readonly table: DynamoReadPlan['table'];
  readonly index?: DynamoReadPlan['index'];
  readonly scopeRoles: DynamoReadPlan['scopeRoles'];
  readonly sourceProvenance: readonly SourceProvenance[];
  readonly projection: readonly string[];
}): DynamoReadPlan {
  return {
    schemaVersion: READ_ONLY_QUERY_PLAN_VERSION,
    planId: args.planId,
    datastore: 'DYNAMODB',
    kind: args.kind,
    table: args.table,
    grammar: args.grammar,
    ...(args.index === undefined ? {} : { index: args.index }),
    sourceProvenance: args.sourceProvenance,
    scopeRoles: args.scopeRoles,
    resultPolicy: { ...oneOrMany, projection: args.projection },
    privacyPolicy,
    consistencyClass: 'DIRECT_READ',
    authority: 'AUTHORITATIVE',
  };
}

const rippleApi = (path: string, symbol: string): SourceProvenance => provenance('mobingilabs/ripple-api', PHASE5_SOURCE_SHAS.rippleApi, path, symbol);
const ouchan = (path: string, symbol: string): SourceProvenance => provenance('mobingilabs/ouchan', PHASE5_SOURCE_SHAS.ouchan, path, symbol);

export const PHASE6_QUERY_PLANS: readonly ReadOnlyQueryPlan[] = Object.freeze([
  dynamoPlan({
    planId: 'phase6.d1.j1.payer-jpy',
    grammar: 'RIPPLE_J1_PAYER_JPY',
    kind: 'DYNAMO_QUERY_PREFIX',
    table: 'RIPPLE',
    scopeRoles: ['mspId', 'month'],
    projection: ['id', 'sort_key'],
    sourceProvenance: [rippleApi('src/App/Handler/ExchangeRate.php', 'getAccountExchangeForMonth')],
  }),
  dynamoPlan({
    planId: 'phase6.d1.j1.payer-non-jpy',
    grammar: 'RIPPLE_J1_PAYER_NON_JPY',
    kind: 'DYNAMO_QUERY_PREFIX',
    table: 'RIPPLE',
    scopeRoles: ['mspId', 'month', 'vendor'],
    projection: ['id', 'sort_key'],
    sourceProvenance: [rippleApi('src/App/Handler/ExchangeRate.php', 'getAccountExchangeForMonth')],
  }),
  dynamoPlan({
    planId: 'phase6.d2.j2.common-aws-jpy',
    grammar: 'RIPPLE_J2_COMMON_AWS_JPY',
    kind: 'DYNAMO_QUERY_PREFIX',
    table: 'RIPPLE',
    scopeRoles: ['mspId', 'month'],
    projection: ['id', 'sort_key'],
    sourceProvenance: [rippleApi('src/App/Handler/ExchangeRate.php', 'getCommonExchangeRate')],
  }),
  dynamoPlan({
    planId: 'phase6.d2.j2.common-non-jpy',
    grammar: 'RIPPLE_J2_COMMON_NON_AWS_JPY',
    kind: 'DYNAMO_QUERY_PREFIX',
    table: 'RIPPLE',
    scopeRoles: ['mspId', 'month', 'vendor'],
    projection: ['id', 'sort_key'],
    sourceProvenance: [rippleApi('src/App/Handler/ExchangeRate.php', 'getCommonExchangeRate')],
  }),
  dynamoPlan({
    planId: 'phase6.d3.j3.companies-msp',
    grammar: 'COMPANIES_MSP_INDEX',
    kind: 'DYNAMO_QUERY_GSI',
    table: 'Companies',
    index: 'msp_id-index',
    scopeRoles: ['mspId'],
    projection: ['company_id', 'billinggroup_id'],
    sourceProvenance: [ouchan('pkg/billing/billing.go', 'GetCompaniesFromMspId')],
  }),
  dynamoPlan({
    planId: 'phase6.d3.j3.accounts-by-company',
    grammar: 'WAVE_CUSTOMER_COMPANY_INDEX',
    kind: 'DYNAMO_QUERY_GSI',
    table: 'WAVE_CB_CUSTOMER',
    index: 'company_id-index',
    scopeRoles: ['companyId'],
    projection: ['customer_id', 'company_id', 'account_id'],
    sourceProvenance: [ouchan('services/costd/vendors/aws/accts/accts.go', 'GetCustomersFromCompanyId')],
  }),
  dynamoPlan({
    planId: 'phase6.p5.billing-group-exchange.metadata',
    grammar: 'RIPPLE_J3_BILLING_GROUP_RATE',
    kind: 'DYNAMO_QUERY_PREFIX',
    table: 'RIPPLE',
    scopeRoles: ['mspId', 'month'],
    projection: ['id', 'sort_key'],
    sourceProvenance: [rippleApi('src/App/Handler/ExchangeRate.php', 'getExchangeRateForBillingGroup')],
  }),
]);

function oracle(args: Omit<DataOracleSpec, 'schemaVersion' | 'privacyPolicy'>): DataOracleSpec {
  return { ...args, schemaVersion: DATA_ORACLE_CATALOG_VERSION, privacyPolicy };
}

export const PHASE6_DATA_ORACLE_CATALOG: DataOracleCatalog = Object.freeze({
  schemaVersion: DATA_ORACLE_CATALOG_VERSION,
  queryPlanVersion: READ_ONLY_QUERY_PLAN_VERSION,
  oracles: Object.freeze([
    oracle({
      oracleId: 'D1.j1.payer-exchange',
      customerBehavior: 'J1 payer exchange response has source-proven stored-rate rows for the selected month.',
      journeyIds: ['ripple-payer-exchange-read'],
      apiOperationIds: ['ripple.payer-exchange.read'],
      sourceLineage: [rippleApi('src/App/Handler/ExchangeRate.php', 'getAccountExchangeForMonth')],
      queryPlanIds: ['phase6.d1.j1.payer-jpy', 'phase6.d1.j1.payer-non-jpy'],
      authority: 'AUTHORITATIVE',
      datastore: 'DYNAMODB',
      consistencyClass: 'DIRECT_READ',
      allowedLagMs: 0,
      comparisonMode: 'SCHEMA_SHAPE',
      realExecutionEligibility: 'ENVIRONMENT_BLOCKED',
      replayPolicy: 'FIRST_PLUS_FRESH_REPLAY',
      notes: ['Partial oracle: response user scope and API transformation are not reproduced by a raw row query.'],
    }),
    oracle({
      oracleId: 'D2.j2.common-exchange',
      customerBehavior: 'J2 common exchange response exposes source-proven common-rate rows for the selected vendor/month.',
      journeyIds: ['ripple-common-exchange-read'],
      apiOperationIds: ['ripple.common-exchange.read'],
      sourceLineage: [rippleApi('src/App/Handler/ExchangeRate.php', 'getCommonExchangeRate')],
      queryPlanIds: ['phase6.d2.j2.common-aws-jpy', 'phase6.d2.j2.common-non-jpy'],
      authority: 'AUTHORITATIVE',
      datastore: 'DYNAMODB',
      consistencyClass: 'DIRECT_READ',
      allowedLagMs: 0,
      comparisonMode: 'SCHEMA_SHAPE',
      realExecutionEligibility: 'ENVIRONMENT_BLOCKED',
      replayPolicy: 'FIRST_PLUS_FRESH_REPLAY',
      notes: ['J2 uses a distinct key family and a user-defined 13-month response window; never reuse J1 keys.'],
    }),
    oracle({
      oracleId: 'D3.j3.account-inventory',
      customerBehavior: 'J3 billing-group membership is derivable from authoritative Companies and account registry metadata.',
      journeyIds: ['ripple-account-inventory'],
      apiOperationIds: ['ripple.billing-groups.read', 'ripple.account-inventory.read'],
      sourceLineage: [
        ouchan('pkg/billing/billing.go', 'GetCompaniesFromMspId'),
        ouchan('services/costd/vendors/aws/accts/accts.go', 'GetCustomersFromCompanyId'),
      ],
      queryPlanIds: ['phase6.d3.j3.companies-msp', 'phase6.d3.j3.accounts-by-company'],
      authority: 'AUTHORITATIVE',
      datastore: 'DYNAMODB',
      consistencyClass: 'DERIVED_SYNCHRONOUS',
      allowedLagMs: 0,
      comparisonMode: 'MEMBERSHIP',
      realExecutionEligibility: 'ENVIRONMENT_BLOCKED',
      replayPolicy: 'FIRST_PLUS_FRESH_REPLAY',
      notes: ['Modern billing-group response groups the MSP account inventory by company_id in memory; cache-backed legacy values are not treated as equivalent.'],
    }),
    oracle({
      oracleId: 'P5.billing-group-exchange.metadata',
      customerBehavior: 'Phase 5 billing-group exchange read has source-proven metadata rows for a bounded month.',
      journeyIds: [],
      apiOperationIds: ['ripple.billing-group-exchange.read'],
      sourceLineage: [rippleApi('src/App/Handler/ExchangeRate.php', 'getExchangeRateForBillingGroup')],
      queryPlanIds: ['phase6.p5.billing-group-exchange.metadata'],
      authority: 'AUTHORITATIVE',
      datastore: 'DYNAMODB',
      consistencyClass: 'DIRECT_READ',
      allowedLagMs: 0,
      comparisonMode: 'SCHEMA_SHAPE',
      realExecutionEligibility: 'SPEC_BLOCKED',
      replayPolicy: 'LOCAL_ONLY',
      notes: ['Strong source candidate, intentionally outside the frozen D1-D3 real query budget.'],
    }),
  ]),
});

export const PHASE6_CROSS_LAYER_LINEAGE: CrossLayerLineage = Object.freeze({
  schemaVersion: CROSS_LAYER_LINEAGE_VERSION,
  edges: Object.freeze([
    {
      edgeId: 'j1-journey-api', edgeType: 'JOURNEY_USES_API', from: 'ripple-payer-exchange-read', to: 'ripple.payer-exchange.read',
      sourceProvenance: [provenance('mobingilabs/ripple-ui', PHASE5_SOURCE_SHAS.rippleUi, 'src/vuex/api/exchangeRatePayer_v2.js', 'fetch')],
    },
    {
      edgeId: 'j1-api-ripple', edgeType: 'API_READS_DATASTORE', from: 'ripple.payer-exchange.read', to: 'DYNAMODB:RIPPLE',
      sourceProvenance: [rippleApi('src/App/Handler/ExchangeRate.php', 'getAccountExchangeForMonth')],
    },
    {
      edgeId: 'd1-api-oracle', edgeType: 'ORACLE_VALIDATES_API', from: 'D1.j1.payer-exchange', to: 'ripple.payer-exchange.read',
      sourceProvenance: [rippleApi('src/App/Handler/ExchangeRate.php', 'getAccountExchangeForMonth')],
    },
    {
      edgeId: 'j2-journey-api', edgeType: 'JOURNEY_USES_API', from: 'ripple-common-exchange-read', to: 'ripple.common-exchange.read',
      sourceProvenance: [provenance('mobingilabs/ripple-ui', PHASE5_SOURCE_SHAS.rippleUi, 'src/vuex/api/exchangeRateGlobal.js', 'fetch')],
    },
    {
      edgeId: 'j2-api-ripple', edgeType: 'API_READS_DATASTORE', from: 'ripple.common-exchange.read', to: 'DYNAMODB:RIPPLE',
      sourceProvenance: [rippleApi('src/App/Handler/ExchangeRate.php', 'getCommonExchangeRate')],
    },
    {
      edgeId: 'd2-api-oracle', edgeType: 'ORACLE_VALIDATES_API', from: 'D2.j2.common-exchange', to: 'ripple.common-exchange.read',
      sourceProvenance: [rippleApi('src/App/Handler/ExchangeRate.php', 'getCommonExchangeRate')],
    },
    {
      edgeId: 'j3-journey-api', edgeType: 'JOURNEY_USES_API', from: 'ripple-account-inventory', to: 'ripple.billing-groups.read',
      sourceProvenance: [provenance('mobingilabs/ripple-ui', PHASE5_SOURCE_SHAS.rippleUi, 'src/vuex/api/billingGroups.js', 'fetch')],
    },
    {
      edgeId: 'j3-api-companies', edgeType: 'API_READS_DATASTORE', from: 'ripple.billing-groups.read', to: 'DYNAMODB:Companies',
      sourceProvenance: [ouchan('pkg/billing/billing.go', 'GetCompaniesFromMspId')],
    },
    {
      edgeId: 'j3-api-accounts', edgeType: 'API_READS_DATASTORE', from: 'ripple.billing-groups.read', to: 'DYNAMODB:WAVE_CB_CUSTOMER',
      sourceProvenance: [ouchan('services/costd/vendors/aws/accts/accts.go', 'GetCustomersFromCompanyId')],
    },
    {
      edgeId: 'j3-data-derivation', edgeType: 'DATASTORE_DERIVES_FROM', from: 'DYNAMODB:WAVE_CB_CUSTOMER', to: 'ripple.billing-groups.read:company_id grouping',
      sourceProvenance: [ouchan('services/billingd/services/billingsvc/billingsvc.go', 'ListBillingGroups')],
    },
    {
      edgeId: 'd3-api-oracle', edgeType: 'ORACLE_VALIDATES_API', from: 'D3.j3.account-inventory', to: 'ripple.billing-groups.read',
      sourceProvenance: [ouchan('services/billingd/services/billingsvc/billingsvc.go', 'ListBillingGroups')],
    },
  ] as readonly CrossLayerLineageEdge[]),
});

export function phase6CatalogCounts(): Record<string, number> {
  const classes = PHASE5_API_CATALOG.operations.reduce<Record<string, number>>((counts, operation) => {
    counts[operation.semanticClass] = (counts[operation.semanticClass] ?? 0) + 1;
    return counts;
  }, {});
  return {
    queryPlans: PHASE6_QUERY_PLANS.length,
    dataOracles: PHASE6_DATA_ORACLE_CATALOG.oracles.length,
    lineageEdges: PHASE6_CROSS_LAYER_LINEAGE.edges.length,
    phase5KnownReads: classes.KNOWN_READ ?? 0,
    phase5KnownMutations: classes.KNOWN_MUTATION ?? 0,
    phase5Unknown: classes.UNKNOWN ?? 0,
  };
}
