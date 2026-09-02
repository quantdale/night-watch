// ---------------------------------------------------------------------------
// Nightwatch C-02b — proto ↔ generated-OpenAPI corroboration.
//
// C-02a recorded that `openapiv2/apidocs.swagger.json` is a GENERATED_ARTIFACT
// whose generation currency is UNKNOWN, and left `PROTO_SURFACE_CORROBORATIONS`
// deliberately empty because no independent view of the proto surface existed.
// This module is that view.
//
// It exists in the shape it does because of one measurement. The artifact
// carries exactly 147 `Billing`-tagged operations and the proto carries
// exactly 147 RPCs, and `evaluateGenerationCurrency` returns CURRENT when the
// two counts are equal. Populating that seam with a count would promote
// blueapi out of a production-admission denial without comparing a single
// route. Two surfaces can agree on 147 while disagreeing on every path in it:
// the count is a necessary condition wearing a sufficient condition's clothes.
//
// So corroboration here is per operation identity. The count is derived from
// the per-operation result rather than standing in for it, and any operation
// that is not a MATCH keeps currency out of CURRENT no matter what the totals
// say.
//
// Data-in / data-out. No filesystem, process, or network authority.
// ---------------------------------------------------------------------------

import { prefixedDigest24 } from '../identity/canonicalDigest';
import type { ProtoSurfaceCorroboration } from './generatedArtifact';
import type { ProtoFileFacts, ProtoHttpMethod } from './protoDeclarations';

export const PROTO_CORROBORATION_VERSION = 'nightwatch.proto-openapi-corroboration.v1' as const;

export const PROTO_CORROBORATION_OUTCOMES = [
  'MATCH',
  'OPENAPI_ONLY',
  'PROTO_ONLY',
  'METHOD_MISMATCH',
  'PATH_MISMATCH',
  'AMBIGUOUS',
  'UNCORROBORATABLE',
] as const;
export type ProtoCorroborationOutcome = (typeof PROTO_CORROBORATION_OUTCOMES)[number];

export const PROTO_CORROBORATION_STATES = ['CORROBORATED_EXACT', 'DIVERGENT', 'UNCORROBORATABLE'] as const;
export type ProtoCorroborationState = (typeof PROTO_CORROBORATION_STATES)[number];

/** One operation as the generated artifact declares it. */
export interface OpenApiOperationView {
  readonly operationId: string;
  readonly method: string;
  readonly routeTemplate: string;
}

export interface ProtoCorroborationEntry {
  /** `<Service>_<Rpc>` — the join key the generator itself emits. */
  readonly identity: string;
  readonly outcome: ProtoCorroborationOutcome;
  readonly protoMethod: ProtoHttpMethod | null;
  readonly protoRouteTemplate: string | null;
  readonly openApiMethod: string | null;
  readonly openApiRouteTemplate: string | null;
}

/** Reason the corroboration could not certify the artifact. Kept separate
 * from the per-operation outcomes because "we could not look" and "we looked
 * and they disagree" are different facts, and only the second is a defect in
 * the artifact. */
export const PROTO_CORROBORATION_LIMITS = [
  'ARTIFACT_COVERS_UNREADABLE_SERVICES',
  'PROTO_SURFACE_INCOMPLETE',
  'NO_COMPARABLE_OPERATION',
] as const;
export type ProtoCorroborationLimit = (typeof PROTO_CORROBORATION_LIMITS)[number];

export interface ProtoOpenApiCorroboration {
  readonly schemaVersion: typeof PROTO_CORROBORATION_VERSION;
  readonly repoId: string;
  readonly sourceSha: string;
  readonly artifactPath: string;
  readonly protoPath: string;
  readonly state: ProtoCorroborationState;
  readonly entries: readonly ProtoCorroborationEntry[];
  readonly counts: Readonly<Record<ProtoCorroborationOutcome, number>>;
  readonly protoOperationCount: number;
  readonly openApiOperationCount: number;
  /** Artifact operations belonging to a service this campaign cannot read.
   * They are not divergence; they are absence of a witness. */
  readonly outOfScopeOperationCount: number;
  readonly limits: readonly ProtoCorroborationLimit[];
  readonly corroborationDigest: string;
}

function emptyCounts(): Record<ProtoCorroborationOutcome, number> {
  return { MATCH: 0, OPENAPI_ONLY: 0, PROTO_ONLY: 0, METHOD_MISMATCH: 0, PATH_MISMATCH: 0, AMBIGUOUS: 0, UNCORROBORATABLE: 0 };
}

/** Compare two route templates as the generator writes them. Nothing is
 * normalized away: a differing placeholder NAME is a differing route, because
 * the artifact is supposed to be a faithful mirror and a renamed path
 * parameter is exactly the kind of drift this check exists to catch. */
function sameRoute(left: string, right: string): boolean {
  return left === right;
}

/**
 * Corroborate one generated artifact against one proto file.
 *
 * The join key is `<Service>_<Rpc>`, which is the operationId the
 * protoc-gen-openapiv2 generator emits. Matching on that and then comparing
 * method and route independently is what makes a mismatch legible: the
 * operation is identified, and then it is found to disagree.
 */
export function corroborateProtoAgainstOpenApi(input: {
  readonly repoId: string;
  readonly sourceSha: string;
  readonly artifactPath: string;
  readonly protoPath: string;
  readonly protoFacts: ProtoFileFacts;
  readonly openApiOperations: readonly OpenApiOperationView[];
}): ProtoOpenApiCorroboration {
  const counts = emptyCounts();
  const entries: ProtoCorroborationEntry[] = [];

  // Index the artifact by operationId. A duplicated operationId is ambiguous
  // on the artifact side and is never silently resolved to the first.
  const artifactById = new Map<string, OpenApiOperationView[]>();
  for (const operation of input.openApiOperations) {
    const existing = artifactById.get(operation.operationId);
    if (existing === undefined) artifactById.set(operation.operationId, [operation]);
    else existing.push(operation);
  }

  const consumed = new Set<string>();
  const protoRpcs = input.protoFacts.services.flatMap((service) => service.rpcs.map((rpc) => ({ service, rpc })));

  // Scope. The generator names every operation `<Service>_<Rpc>`, so an
  // artifact operation is comparable exactly when its service prefix is one
  // this proto declares. `blueapi/openapiv2/apidocs.swagger.json` mirrors
  // roughly fifteen services and only `Billing` sits in an approved root, so
  // 444 of its 591 operations are simply not visible to this campaign. Calling
  // those a divergence would blame the artifact for a boundary Nightwatch
  // chose; ignoring them would let 147 corroborated operations certify 591.
  const inScopeServices = new Set(input.protoFacts.services.map((service) => service.serviceName));
  const isInScope = (operationId: string): boolean => {
    const separator = operationId.indexOf('_');
    return separator > 0 && inScopeServices.has(operationId.slice(0, separator));
  };
  const outOfScope = input.openApiOperations.filter((operation) => !isInScope(operation.operationId));

  for (const { service, rpc } of protoRpcs) {
    const identity = `${service.serviceName}_${rpc.rpcName}`;
    const candidates = artifactById.get(identity) ?? [];

    // A proto RPC whose own binding is not proven cannot be compared at all.
    // That is UNCORROBORATABLE, which is distinct from disagreeing.
    if (rpc.httpBindingState !== 'PROVEN' || rpc.bindings.length !== 1) {
      consumed.add(identity);
      const outcome: ProtoCorroborationOutcome = rpc.httpBindingState === 'AMBIGUOUS' ? 'AMBIGUOUS' : 'UNCORROBORATABLE';
      counts[outcome] += 1;
      entries.push({ identity, outcome, protoMethod: null, protoRouteTemplate: null, openApiMethod: candidates[0]?.method ?? null, openApiRouteTemplate: candidates[0]?.routeTemplate ?? null });
      continue;
    }

    const binding = rpc.bindings[0];
    if (binding === undefined) continue;

    if (candidates.length === 0) {
      counts.PROTO_ONLY += 1;
      entries.push({ identity, outcome: 'PROTO_ONLY', protoMethod: binding.method, protoRouteTemplate: binding.routeTemplate, openApiMethod: null, openApiRouteTemplate: null });
      continue;
    }
    consumed.add(identity);
    if (candidates.length > 1) {
      counts.AMBIGUOUS += 1;
      entries.push({ identity, outcome: 'AMBIGUOUS', protoMethod: binding.method, protoRouteTemplate: binding.routeTemplate, openApiMethod: null, openApiRouteTemplate: null });
      continue;
    }

    const candidate = candidates[0] as OpenApiOperationView;
    const methodEqual = candidate.method.toUpperCase() === binding.method;
    const routeEqual = sameRoute(candidate.routeTemplate, binding.routeTemplate);
    const outcome: ProtoCorroborationOutcome = methodEqual && routeEqual
      ? 'MATCH'
      : !methodEqual && routeEqual
        ? 'METHOD_MISMATCH'
        : methodEqual && !routeEqual
          ? 'PATH_MISMATCH'
          // Both differ. Reporting one of the two would understate the
          // divergence, so it is recorded as the weaker fact.
          : 'UNCORROBORATABLE';
    counts[outcome] += 1;
    entries.push({ identity, outcome, protoMethod: binding.method, protoRouteTemplate: binding.routeTemplate, openApiMethod: candidate.method.toUpperCase(), openApiRouteTemplate: candidate.routeTemplate });
  }

  for (const operation of input.openApiOperations) {
    if (consumed.has(operation.operationId) || !isInScope(operation.operationId)) continue;
    counts.OPENAPI_ONLY += 1;
    entries.push({ identity: operation.operationId, outcome: 'OPENAPI_ONLY', protoMethod: null, protoRouteTemplate: null, openApiMethod: operation.method.toUpperCase(), openApiRouteTemplate: operation.routeTemplate });
  }

  entries.sort((left, right) => left.identity.localeCompare(right.identity) || left.outcome.localeCompare(right.outcome));

  // The state is decided by the WEAKEST entry, never by the totals. One
  // PATH_MISMATCH among 147 MATCHes is a divergent artifact.
  const everyMatch = entries.length > 0 && entries.every((entry) => entry.outcome === 'MATCH');
  const limits: ProtoCorroborationLimit[] = [];
  if (entries.length === 0) limits.push('NO_COMPARABLE_OPERATION');
  if (input.protoFacts.completeness.state !== 'COMPLETE') limits.push('PROTO_SURFACE_INCOMPLETE');
  // A partially read proto cannot prove the artifact is complete however well
  // the part that WAS read agrees, and neither can a proto that speaks for one
  // of the artifact's fifteen services.
  if (outOfScope.length > 0) limits.push('ARTIFACT_COVERS_UNREADABLE_SERVICES');
  const state: ProtoCorroborationState = limits.length > 0
    ? 'UNCORROBORATABLE'
    : everyMatch ? 'CORROBORATED_EXACT' : 'DIVERGENT';

  const protoOperationCount = protoRpcs.filter(({ rpc }) => rpc.httpBindingState === 'PROVEN' && rpc.bindings.length === 1).length;

  return {
    schemaVersion: PROTO_CORROBORATION_VERSION,
    repoId: input.repoId,
    sourceSha: input.sourceSha,
    artifactPath: input.artifactPath,
    protoPath: input.protoPath,
    state,
    entries,
    counts,
    protoOperationCount,
    openApiOperationCount: input.openApiOperations.length,
    outOfScopeOperationCount: outOfScope.length,
    limits: [...limits].sort(),
    corroborationDigest: prefixedDigest24('protocorroboration', {
      repoId: input.repoId,
      sourceSha: input.sourceSha,
      artifactPath: input.artifactPath,
      protoPath: input.protoPath,
      entries,
      limits: [...limits].sort(),
    }),
  };
}

/**
 * Convert a corroboration into the record the C-02a currency seam consumes.
 *
 * This is the gate that keeps A-4 shut. `evaluateGenerationCurrency` compares
 * counts, so it is only ever handed a record at all when the per-operation
 * comparison came back CORROBORATED_EXACT. A DIVERGENT or UNCORROBORATABLE
 * result yields null, the seam finds no corroborator, and currency stays
 * UNKNOWN — which is the truthful answer, not a fallback.
 *
 * For `alphauslabs/blueapi` today the answer IS null, and that is the campaign
 * working rather than failing: the artifact mirrors services whose protos live
 * in roots C-05 governs, so 147 corroborated operations can never certify 591.
 */
export function toProtoSurfaceCorroboration(corroboration: ProtoOpenApiCorroboration): ProtoSurfaceCorroboration | null {
  if (corroboration.state !== 'CORROBORATED_EXACT') return null;
  return {
    repoId: corroboration.repoId,
    sourceSha: corroboration.sourceSha,
    artifactPath: corroboration.artifactPath,
    protoOperationCount: corroboration.protoOperationCount,
  };
}
