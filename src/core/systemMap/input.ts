import type { SystemMapInput } from './projections';

export interface SourceOperationForSystemMap {
  readonly operationId?: unknown;
  readonly repository?: unknown;
  readonly sourceSha?: unknown;
  readonly method?: unknown;
  readonly routeTemplate?: unknown;
  readonly readOnlyClassification?: unknown;
  readonly routeProof?: unknown;
  readonly protoServiceIdentity?: unknown;
  readonly blockingStage?: unknown;
  readonly blockingReason?: unknown;
}

export interface SourceDiscoveryForSystemMap {
  readonly operations?: readonly SourceOperationForSystemMap[];
  readonly operationCompleteness?: { readonly totalOperations?: number | null };
}

/** Build the source-fact System Map input without strengthening absent joins. */
export function systemMapInputFromDiscovery(
  discovery: SourceDiscoveryForSystemMap | null | undefined,
): SystemMapInput {
  const operations = discovery?.operations ?? [];
  const asString = (value: unknown, fallback = ''): string =>
    typeof value === 'string' ? value : fallback;
  const asNullableString = (value: unknown): string | null =>
    typeof value === 'string' && value.length > 0 ? value : null;
  return Object.freeze({
    operations: Object.freeze(operations.map((operation) => Object.freeze({
      operationId: asString(operation.operationId),
      repoId: asString(operation.repository),
      sourceSha: asString(operation.sourceSha),
      method: asString(operation.method),
      routeTemplate: asString(operation.routeTemplate),
      factCategory: 'SOURCE_FACT' as const,
      readOnlyClassification: asString(operation.readOnlyClassification, 'UNSUPPORTED'),
      routeProof: asString(operation.routeProof, 'UNSUPPORTED'),
      protoServiceIdentity: asNullableString(operation.protoServiceIdentity),
      blockingStage: asNullableString(operation.blockingStage),
      blockingReason: asNullableString(operation.blockingReason),
    }))),
    serviceBindings: Object.freeze([]),
    consumerEdges: Object.freeze([]),
    findings: Object.freeze([]),
    operationPopulationTotal: discovery?.operationCompleteness?.totalOperations ?? null,
    productOfRepository: Object.freeze({}),
  });
}
