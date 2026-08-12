import {
  API_CATALOG_VERSION,
  SCENARIO_GENERATOR_VERSION,
  type ApiCatalog,
  type ApiOperation,
  type GeneratedScenario,
  type RestrictedOopsDocument,
} from './types';
import { assertGeneratedScenarioSafe, canonicalScenarioHash } from './restrictedProfile';

function requireEligible(operation: ApiOperation): void {
  if (operation.semanticClass !== 'KNOWN_READ') throw new Error(`GENERATION_BLOCKED: ${operation.operationId} is ${operation.semanticClass}`);
  if (operation.generationStatus !== 'GENERATION_ELIGIBLE') throw new Error(`GENERATION_BLOCKED: ${operation.operationId} status ${operation.generationStatus}`);
  if (operation.requiredHostClass !== 'DEV_API' && operation.requiredHostClass !== 'LOCAL_LOOPBACK') throw new Error(`GENERATION_BLOCKED: ${operation.operationId} host class`);
  if (operation.requestSchema === undefined || operation.responseShapePolicy === undefined || operation.oracleProfile === undefined) {
    throw new Error(`GENERATION_BLOCKED: ${operation.operationId} lacks request/oracle proof`);
  }
  if (operation.httpMethod !== 'GET' || operation.requestSchema.bodyPolicy !== 'EMPTY') {
    throw new Error(`GENERATION_BLOCKED: ${operation.operationId} request is not empty GET`);
  }
}

export function scenarioIdentity(operation: ApiOperation, catalogVersion = API_CATALOG_VERSION): string {
  requireEligible(operation);
  return `nw-s5-${canonicalScenarioHash({
    operationId: operation.operationId,
    catalogVersion,
    generatorVersion: SCENARIO_GENERATOR_VERSION,
    hydrationProfile: operation.requestSchema?.hydrationProfile,
    oracleProfile: operation.oracleProfile,
  }).slice(0, 24)}`;
}

export function generateRestrictedScenario(operation: ApiOperation, catalog: ApiCatalog): GeneratedScenario {
  requireEligible(operation);
  if (catalog.schemaVersion !== API_CATALOG_VERSION) throw new Error('GENERATION_BLOCKED: catalog version mismatch');
  const scenarioId = scenarioIdentity(operation, catalog.schemaVersion);
  const document: RestrictedOopsDocument = {
    maintainers: ['nightwatch'],
    tags: {
      profile: 'nightwatch.oops-profile.phase5.v1',
      operation_id: operation.operationId,
      scenario_id: scenarioId,
      generator: SCENARIO_GENERATOR_VERSION,
    },
    run: [{
      http: {
        method: 'GET',
        url: `http://127.0.0.1:0/v1/operations/${operation.operationId}`,
        headers: {
          Accept: 'application/json',
          'X-Nightwatch-Operation-Id': operation.operationId,
        },
        query_params: {},
        asserts: { status_code: 200 },
      },
    }],
  };
  const logicalYaml = `${JSON.stringify(document, null, 2)}\n`;
  assertGeneratedScenarioSafe(logicalYaml, operation.operationId);
  return {
    scenarioId,
    operationId: operation.operationId,
    catalogVersion: catalog.schemaVersion,
    generatorVersion: SCENARIO_GENERATOR_VERSION,
    hydrationProfile: operation.requestSchema?.hydrationProfile ?? 'none',
    oracleProfile: operation.oracleProfile ?? 'none',
    logicalYaml,
    logicalDocument: document,
    generatedAtRuntime: false,
  };
}

export function materializeRelayPort(logicalYaml: string, port: number, operationId: string): string {
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('invalid loopback relay port');
  const parsed = assertGeneratedScenarioSafe(logicalYaml, operationId);
  const materialized = JSON.parse(JSON.stringify(parsed)) as RestrictedOopsDocument;
  materialized.run[0].http.url = materialized.run[0].http.url.replace(':0/', `:${port}/`);
  assertGeneratedScenarioSafe(JSON.stringify(materialized), operationId);
  return `${JSON.stringify(materialized, null, 2)}\n`;
}
