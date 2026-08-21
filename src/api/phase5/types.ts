// ---------------------------------------------------------------------------
// Nightwatch Phase 5 — source-generated API corpus contracts.
//
// These types are intentionally narrower than an OpenAPI description. The
// catalog is a semantic admission list, not a request fuzzer. Runtime values
// such as tenant scope and authentication stay in memory and never become
// part of a durable operation or scenario record.
// ---------------------------------------------------------------------------

export const API_CATALOG_VERSION = 'nightwatch.api-catalog.phase5.v1' as const;
export const OOPS_PROFILE_VERSION = 'nightwatch.oops-profile.phase5.v1' as const;
export const OOPS_ADAPTER_VERSION = 'nightwatch.oops-adapter.phase5.v1' as const;
export const SCENARIO_GENERATOR_VERSION = 'nightwatch.scenario-generator.phase5.v1' as const;

export type SemanticClass = 'KNOWN_READ' | 'KNOWN_MUTATION' | 'UNKNOWN';
type GenerationStatus =
  | 'GENERATION_ELIGIBLE'
  | 'GENERATION_BLOCKED'
  | 'SEMANTIC_REVIEW_REQUIRED'
  | 'SOURCE_STALE'
  | 'AUTH_BLOCKED'
  | 'SAFETY_BLOCKED';
export type JourneyLink = 'ripple-payer-exchange-read' | 'ripple-common-exchange-read' | 'ripple-account-inventory';
type StreamingType = 'SINGLE_JSON' | 'JSON_CHUNKED' | 'NDJSON' | 'EMPTY_OR_204' | 'UNKNOWN';
type AuthClass = 'RELAY_EPHEMERAL_DEV_SESSION' | 'NONE_LOCAL_FIXTURE' | 'UNAVAILABLE';
export type HostClass = 'DEV_API' | 'LOCAL_LOOPBACK' | 'PRODUCTION_DENIED' | 'UNKNOWN_HOST';
type ReplayPolicy = 'FIRST_PLUS_FRESH_REPLAY' | 'LOCAL_ONLY' | 'NEVER';

interface RequestSchema {
  method: 'GET';
  pathTemplate: string;
  queryTemplate?: Readonly<Record<string, string>>;
  bodyPolicy: 'EMPTY';
  hydrationProfile: string;
  runtimePlaceholders: readonly string[];
}

interface ResponseShapePolicy {
  oracleId: string;
  expectedContentType: 'application/json' | 'application/x-ndjson' | 'empty';
  shape: 'JSON_OBJECT_OR_ARRAY' | 'JSON_CHUNKS' | 'NDJSON_LINES' | 'EMPTY';
  persistBody: false;
  maxBytes: number;
}

export interface ApiOperation {
  operationId: string;
  product: 'ripple';
  service: string;
  sourceRepo: string;
  sourceSHA: string;
  frontendCallsites: readonly string[];
  protoService?: string;
  protoRPC?: string;
  httpMethod: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  pathTemplate: string;
  semanticPurpose: string;
  semanticClass: SemanticClass;
  authClass: AuthClass;
  requestSchema?: RequestSchema;
  safeHydrationStrategy?: string;
  responseShapePolicy?: ResponseShapePolicy;
  streamingType: StreamingType;
  expectedContentType?: 'application/json' | 'application/x-ndjson' | 'empty';
  requiredHostClass: HostClass;
  oracleProfile?: string;
  replayPolicy: ReplayPolicy;
  sourceProvenance: readonly string[];
  journeyLinks: readonly JourneyLink[];
  generationStatus: GenerationStatus;
  notes?: readonly string[];
}

export interface ApiCatalog {
  schemaVersion: typeof API_CATALOG_VERSION;
  generatedBy: typeof SCENARIO_GENERATOR_VERSION;
  operations: readonly ApiOperation[];
}

export interface GeneratedScenario {
  scenarioId: string;
  operationId: string;
  catalogVersion: typeof API_CATALOG_VERSION;
  generatorVersion: typeof SCENARIO_GENERATOR_VERSION;
  hydrationProfile: string;
  oracleProfile: string;
  logicalYaml: string;
  logicalDocument: RestrictedOopsDocument;
  generatedAtRuntime: false;
}

export interface RestrictedOopsDocument {
  maintainers: readonly ['nightwatch'];
  tags: Readonly<Record<string, string>>;
  run: readonly [{ http: RestrictedOopsHttp }];
}

export interface RestrictedOopsHttp {
  method: 'GET';
  url: string;
  headers: Readonly<Record<string, string>>;
  query_params: Readonly<Record<string, string>>;
  asserts: { status_code: 200 };
}

export type OracleResult =
  | 'ORACLE_PASS'
  | 'STATUS_CLASS_MISMATCH'
  | 'CONTENT_TYPE_MISMATCH'
  | 'EMPTY_BODY_UNEXPECTED'
  | 'JSON_PARSE_FAILURE'
  | 'NDJSON_PARSE_FAILURE'
  | 'STREAM_INCOMPLETE'
  | 'BODY_LIMIT_EXCEEDED'
  | 'REDIRECT_BLOCKED'
  | 'NETWORK_FAILURE';

export interface ApiOracleObservation {
  oracleId: string;
  result: OracleResult;
  statusClass: string;
  contentTypeClass: string;
  parseCategory: string;
  streamCategory: string;
  bodyPersisted: false;
}

export interface ApiFingerprintInput {
  operationId: string;
  service: string;
  oracleId: string;
  statusClass: string;
  contentTypeClass: string;
  parseCategory: string;
  streamCategory: string;
  errorCategory: string;
  catalogVersion: typeof API_CATALOG_VERSION;
}
