// ---------------------------------------------------------------------------
// Nightwatch Phase 6 — typed data-evidence contracts.
//
// These contracts deliberately describe a small admission language, not a
// database client. Durable plans contain table/key families and parameter
// roles only. Runtime scope values are accepted by adapters in memory after
// validation and are never part of a catalog or evidence record.
// ---------------------------------------------------------------------------

export const DATA_EVIDENCE_VERSION = 'nightwatch.data-evidence.phase6.v1' as const;
export const READ_ONLY_QUERY_PLAN_VERSION = 'nightwatch.readonly-query-plan.phase6.v1' as const;
export const DATA_ORACLE_CATALOG_VERSION = 'nightwatch.data-oracle-catalog.phase6.v1' as const;
export const CROSS_LAYER_LINEAGE_VERSION = 'nightwatch.cross-layer-lineage.phase6.v1' as const;
export const QUERY_VALIDATOR_VERSION = 'nightwatch.query-validator.phase6.v1' as const;
export const DATA_ADAPTER_VERSION = 'nightwatch.data-adapter.phase6.v1' as const;
export const DATA_NORMALIZER_VERSION = 'nightwatch.data-normalizer.phase6.v1' as const;
export const DATA_COMPARATOR_VERSION = 'nightwatch.cross-layer-comparator.phase6.v1' as const;

export type DatastoreType = 'DYNAMODB' | 'BIGQUERY' | 'SPANNER';
export type QueryPlanKind =
  | 'DYNAMO_GET'
  | 'DYNAMO_QUERY_PREFIX'
  | 'DYNAMO_QUERY_GSI'
  | 'BQ_SELECT_SCOPED'
  | 'SPANNER_SELECT_SCOPED';

export type ScopeRole =
  | 'mspId'
  | 'companyId'
  | 'billingGroupId'
  | 'payerAccountId'
  | 'awsAccountId'
  | 'linkedAccountId'
  | 'vendor'
  | 'month'
  | 'monthCompact'
  | 'dateStart'
  | 'dateEnd';

export interface RuntimeDataScope {
  readonly mspId?: string;
  readonly companyId?: string;
  readonly billingGroupId?: string;
  readonly payerAccountId?: string;
  readonly awsAccountId?: string;
  readonly linkedAccountId?: string;
  readonly vendor?: 'aws' | 'azure' | 'gcp';
  readonly month?: string;
  readonly monthCompact?: string;
  readonly dateStart?: string;
  readonly dateEnd?: string;
}

export type DynamoTable =
  | 'RIPPLE'
  | 'Companies'
  | 'WAVE_CB_CUSTOMER'
  | 'RIPPLE_CUSTOMER'
  | 'REPORTS'
  | 'TAGS'
  | 'RIPPLE_FEES'
  | 'RIPPLE_INVOICES'
  | 'UNBLENDED_EXPORT';

export type DynamoIndex =
  | 'msp_id-index'
  | 'company_id-index'
  | 'billinggroup_id-index'
  | 'company_id-gsi'
  | 'account_id-index';

/** Key grammars are source-derived identifiers, never free-form prefixes. */
export type DynamoKeyGrammar =
  | 'RIPPLE_J1_PAYER_JPY'
  | 'RIPPLE_J1_PAYER_NON_JPY'
  | 'RIPPLE_J2_COMMON_AWS_JPY'
  | 'RIPPLE_J2_COMMON_NON_AWS_JPY'
  | 'RIPPLE_J3_BILLING_GROUP_RATE'
  | 'COMPANIES_MSP_INDEX'
  | 'WAVE_CUSTOMER_MSP_INDEX'
  | 'WAVE_CUSTOMER_COMPANY_INDEX'
  | 'COMPANIES_BY_ID_GET';

export type BqTableFamily = 'RAW_CUR_MONTHLY';
export type BqField =
  | 'lineitem_usageaccountid'
  | 'lineitem_unblendedcost'
  | 'lineitem_currencycode'
  | 'lineitem_lineitemtype'
  | 'lineitem_usagestartdate';

export type SpannerTable = 'awsdaily2' | 'customers' | 'companies';
export type SpannerField = 'id' | 'company_id' | 'msp_id' | 'account_id' | 'usage_date' | 'vendor';

export type ConsistencyClass =
  | 'DIRECT_READ'
  | 'DERIVED_SYNCHRONOUS'
  | 'DERIVED_ASYNC'
  | 'EVENTUALLY_CONSISTENT'
  | 'SNAPSHOT_MONTHLY'
  | 'HISTORICAL_ONLY'
  | 'UNKNOWN_CONSISTENCY';

export type OracleAuthority = 'AUTHORITATIVE' | 'DERIVED' | 'CACHE' | 'EXPORT' | 'HISTORICAL' | 'UNKNOWN';
export type OracleEligibility =
  | 'REAL_EXECUTION_ELIGIBLE'
  | 'LOCAL_ONLY'
  | 'SEMANTIC_REVIEW_REQUIRED'
  | 'SOURCE_STALE'
  | 'ENVIRONMENT_BLOCKED'
  | 'AUTH_BLOCKED'
  | 'QUERY_COST_BLOCKED'
  | 'SPEC_BLOCKED';

export type ComparisonMode = 'PRESENCE' | 'CARDINALITY' | 'ENUM' | 'SCHEMA_SHAPE' | 'MEMBERSHIP' | 'NUMERIC';
export type DataCardinality = 'ZERO' | 'ONE' | 'MANY';
export type DataComparisonResult =
  | 'DATA_CORROBORATES_RUNTIME'
  | 'DATA_CONTRADICTS_RUNTIME'
  | 'DATA_NOT_PRESENT'
  | 'DATA_PRESENT_RUNTIME_MISSING'
  | 'RUNTIME_PRESENT_DATA_MISSING'
  | 'DATA_TIMING_AMBIGUOUS'
  | 'DATA_SCOPE_AMBIGUOUS'
  | 'DATA_CHANGED_DURING_CHECK'
  | 'DATA_ORACLE_NOT_APPLICABLE'
  | 'DATA_QUERY_BLOCKED'
  | 'DATA_QUERY_AUTH_REQUIRED'
  | 'DATA_QUERY_COST_BLOCKED';

export type EvidenceLevel = 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5';

export interface SourceProvenance {
  readonly repoId: string;
  readonly sourceSHA: string;
  readonly path: string;
  readonly symbol: string;
}

export interface QueryPlanPrivacyPolicy {
  readonly rawRowsPersisted: false;
  readonly customerIdentifiersPersisted: false;
  readonly financialValuesPersisted: false;
  readonly projectionPurpose: string;
}

export interface QueryPlanResultPolicy {
  readonly projection: readonly string[];
  readonly limit: number;
  readonly maxRows: number;
  readonly maxBytes: number;
  readonly expectedCardinality: DataCardinality | 'ANY';
}

export interface QueryPlanBase {
  readonly schemaVersion: typeof READ_ONLY_QUERY_PLAN_VERSION;
  readonly planId: string;
  readonly datastore: DatastoreType;
  readonly sourceProvenance: readonly SourceProvenance[];
  readonly scopeRoles: readonly ScopeRole[];
  readonly resultPolicy: QueryPlanResultPolicy;
  readonly privacyPolicy: QueryPlanPrivacyPolicy;
  readonly consistencyClass: ConsistencyClass;
  readonly authority: OracleAuthority;
}

export interface DynamoReadPlan extends QueryPlanBase {
  readonly datastore: 'DYNAMODB';
  readonly kind: 'DYNAMO_GET' | 'DYNAMO_QUERY_PREFIX' | 'DYNAMO_QUERY_GSI';
  readonly table: DynamoTable;
  readonly grammar: DynamoKeyGrammar;
  readonly index?: DynamoIndex;
}

export interface BigQueryReadPlan extends QueryPlanBase {
  readonly datastore: 'BIGQUERY';
  readonly kind: 'BQ_SELECT_SCOPED';
  readonly project: 'mobingi-main';
  readonly datasetFamily: 'MSP_DATASET';
  readonly tableFamily: BqTableFamily;
  readonly fields: readonly BqField[];
  readonly requiresCostEstimate: true;
}

export interface SpannerReadPlan extends QueryPlanBase {
  readonly datastore: 'SPANNER';
  readonly kind: 'SPANNER_SELECT_SCOPED';
  readonly project: 'mobingi-main';
  readonly instance: 'alphaus-prod';
  readonly database: 'main';
  readonly table: SpannerTable;
  readonly fields: readonly SpannerField[];
  readonly requiresCostEstimate: false;
}

export type ReadOnlyQueryPlan = DynamoReadPlan | BigQueryReadPlan | SpannerReadPlan;

/** A nominal boundary: adapters accept this, not an unvalidated plan. */
export interface ValidatedReadPlan {
  readonly __validatedReadPlan: true;
  readonly plan: ReadOnlyQueryPlan;
}

export interface CompiledToolRequest {
  readonly adapterVersion: typeof DATA_ADAPTER_VERSION;
  readonly datastore: DatastoreType;
  readonly tool: 'dynamo-ro' | 'bq-ro' | 'spanner-ro';
  readonly argv: readonly string[];
  readonly parameterRoles: readonly ScopeRole[];
  readonly queryFingerprint: string;
}

export interface RawDataResult {
  /** Rows are process-local and must not escape the normalization boundary. */
  readonly rows: readonly unknown[];
  readonly bytes: number;
  readonly durationMs: number;
  readonly source: 'SYNTHETIC' | 'APPROVED_TOOL';
}

export interface NormalizedDataResult {
  readonly normalizerVersion: typeof DATA_NORMALIZER_VERSION;
  readonly cardinality: DataCardinality;
  readonly presence: boolean;
  readonly fieldNames: readonly string[];
  readonly enumValues: readonly string[];
  readonly shapeFingerprint: string;
  readonly membershipFingerprint?: string;
  readonly numeric?: {
    readonly sign: 'NEGATIVE' | 'ZERO' | 'POSITIVE' | 'UNKNOWN';
    readonly magnitudeClass: 'NONE' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'UNKNOWN';
  };
}

export interface NumericSemanticContract {
  readonly metric: string;
  readonly currency: string;
  readonly vendor: string;
  readonly timeGrain: string;
  readonly aggregationGrain: string;
  readonly scopeGrain: string;
  readonly rounding: string;
  readonly exchangeRateStage: string;
  readonly feeTaxTreatment: string;
  readonly transform: string;
}

export interface RuntimePredicate {
  readonly presence?: boolean;
  readonly cardinality?: DataCardinality;
  readonly enumValues?: readonly string[];
  readonly fieldNames?: readonly string[];
  readonly membershipFingerprint?: string;
  readonly numeric?: NormalizedDataResult['numeric'];
}

export interface DataOracleSpec {
  readonly schemaVersion: typeof DATA_ORACLE_CATALOG_VERSION;
  readonly oracleId: string;
  readonly customerBehavior: string;
  readonly journeyIds: readonly string[];
  readonly apiOperationIds: readonly string[];
  readonly sourceLineage: readonly SourceProvenance[];
  readonly queryPlanIds: readonly string[];
  readonly authority: OracleAuthority;
  readonly datastore: DatastoreType;
  readonly consistencyClass: ConsistencyClass;
  readonly allowedLagMs: number;
  readonly comparisonMode: ComparisonMode;
  readonly numericContract?: NumericSemanticContract;
  readonly realExecutionEligibility: OracleEligibility;
  readonly replayPolicy: 'FIRST_PLUS_FRESH_REPLAY' | 'LOCAL_ONLY' | 'NEVER';
  readonly privacyPolicy: QueryPlanPrivacyPolicy;
  readonly notes: readonly string[];
}

export interface DataOracleCatalog {
  readonly schemaVersion: typeof DATA_ORACLE_CATALOG_VERSION;
  readonly queryPlanVersion: typeof READ_ONLY_QUERY_PLAN_VERSION;
  readonly oracles: readonly DataOracleSpec[];
}

export type LineageEdgeType =
  | 'JOURNEY_USES_API'
  | 'API_READS_DATASTORE'
  | 'DATASTORE_DERIVES_FROM'
  | 'ORACLE_VALIDATES_API'
  | 'ORACLE_VALIDATES_JOURNEY';

export interface CrossLayerLineageEdge {
  readonly edgeId: string;
  readonly edgeType: LineageEdgeType;
  readonly from: string;
  readonly to: string;
  readonly sourceProvenance: readonly SourceProvenance[];
}

export interface CrossLayerLineage {
  readonly schemaVersion: typeof CROSS_LAYER_LINEAGE_VERSION;
  readonly edges: readonly CrossLayerLineageEdge[];
}

export interface SanitizedDataEvidence {
  readonly evidenceSchemaVersion: typeof DATA_EVIDENCE_VERSION;
  readonly evidenceId: string;
  readonly oracleId: string;
  readonly runtimeRunId: string;
  readonly apiOperationId?: string;
  readonly journeyId?: string;
  readonly datastore: DatastoreType;
  readonly queryPlanId: string;
  readonly queryPlanVersion: typeof READ_ONLY_QUERY_PLAN_VERSION;
  readonly sourceProvenance: readonly SourceProvenance[];
  readonly environmentClass: 'SYNTHETIC' | 'DEV' | 'PRODUCTION' | 'UNKNOWN';
  readonly resultCardinality: DataCardinality;
  readonly derivedPredicates: Readonly<Record<string, boolean | string>>;
  readonly comparisonResult: DataComparisonResult;
  readonly consistencyClass: ConsistencyClass;
  readonly queryTimingClass: 'FAST' | 'BOUNDED' | 'TIMEOUT' | 'UNKNOWN';
  readonly safetyResult: 'PASS' | 'BLOCKED' | 'FAIL';
  readonly privacyResult: 'PASS' | 'FAIL';
  readonly evidenceLevel: EvidenceLevel;
  readonly rawRowsPersisted: false;
}

export interface QueryBudgetSnapshot {
  readonly maxQueries: number;
  readonly usedQueries: number;
  readonly remainingQueries: number;
  readonly maxRows: number;
  readonly usedRows: number;
  readonly maxBytes: number;
  readonly usedBytes: number;
}
