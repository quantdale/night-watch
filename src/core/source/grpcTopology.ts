// ---------------------------------------------------------------------------
// Nightwatch C-03 — Go/gRPC service topology binding.
//
// Joins an observed ouchan registration to a proto service through the
// generated SDK descriptor, in three mechanical links:
//
//   registration  qualifier -> import path        (the file's own imports)
//   descriptor    import path + symbol -> full name (generated ServiceName)
//   proto         full name -> service            (C-02b's reader)
//
// Nothing here matches on similar words. A binding is `SOURCE_FACT` only when
// all three links resolve uniquely.
//
// The completeness discipline is as load-bearing as the join. ouchan's
// enumeration is TRUNCATED and cannot be otherwise under the contract ceiling,
// so this module reports POSITIVE facts and never a repository-complete claim,
// and it never turns "not observed" into "does not exist".
//
// Data-in / data-out over an already-scanned inventory.
// ---------------------------------------------------------------------------

import { prefixedDigest24 } from '../identity/canonicalDigest';
import type { SourceCompletenessState } from './completeness';
import { isTopologyEligibleGoPath, readGoRegistrations } from './goRegistration';
import { buildProtoServiceIndex, type ProtoServiceIndex } from './protoServiceIndex';
import type { RealSourceSnapshotInventory } from './scanTypes';
import type { SiblingSourceAccess } from './siblingSource';

export const GRPC_TOPOLOGY_VERSION = 'nightwatch.grpc-service-topology.v1' as const;

export const TOPOLOGY_JOIN_STATES = ['PROVEN', 'AMBIGUOUS', 'MISSING', 'MULTIPLE', 'UNSUPPORTED', 'STALE'] as const;
export type TopologyJoinState = (typeof TOPOLOGY_JOIN_STATES)[number];

export const TOPOLOGY_BLOCKERS = [
  'QUALIFIER_UNRESOLVED',
  'QUALIFIER_AMBIGUOUS',
  'SDK_DESCRIPTOR_UNOBSERVED',
  'SDK_DESCRIPTOR_AMBIGUOUS',
  'PROTO_SERVICE_UNOBSERVED',
  'PROTO_SERVICE_AMBIGUOUS',
  'PROTO_SNAPSHOT_MISMATCH',
  'MULTIPLE_REGISTRATIONS',
] as const;
export type TopologyBlocker = (typeof TOPOLOGY_BLOCKERS)[number];

/** Why a service that ought to be here is not. `TRUNCATED_ENUMERATION` is not
 * a defect in Alphaus; it is Nightwatch admitting it did not look. */
export const TOPOLOGY_ABSENCE_REASONS = ['TRUNCATED_ENUMERATION', 'NO_OBSERVED_REGISTRATION'] as const;
export type TopologyAbsenceReason = (typeof TOPOLOGY_ABSENCE_REASONS)[number];

export interface GrpcTopologyBinding {
  /** The daemon directory, purely for reporting. It is never a join key:
   * `services/blued` registers six services. */
  readonly serviceDirectory: string;
  readonly repoId: string;
  readonly sourceSha: string;
  readonly relativePath: string;
  readonly registrationSymbol: string;
  readonly importPath: string | null;
  /** `<package>.<Service>` when proven. */
  readonly protoServiceIdentity: string | null;
  readonly protoRepoId: string | null;
  readonly protoRelativePath: string | null;
  readonly state: TopologyJoinState;
  readonly blocker: TopologyBlocker | null;
  /** Only a PROVEN join is a SOURCE_FACT. Everything else is evidence about
   * why not, and must never be read as a weaker kind of fact. */
  readonly evidenceClass: 'SOURCE_FACT' | 'NOT_A_FACT';
  readonly embeddingCorroborated: boolean;
  readonly evidenceDigest: string;
}

export interface GrpcTopologyCompleteness {
  /** Positive facts are valid regardless of this. */
  readonly enumerationState: SourceCompletenessState;
  /** True only if every registration in the repository was observed. For
   * `mobingilabs/ouchan` this is permanently false under the current contract
   * ceiling, and saying so is the point. */
  readonly repositoryCompleteProof: boolean;
  readonly absenceReason: TopologyAbsenceReason;
  readonly observedGoFiles: number;
  readonly excludedTestFiles: number;
}

export interface GrpcTopology {
  readonly schemaVersion: typeof GRPC_TOPOLOGY_VERSION;
  readonly bindings: readonly GrpcTopologyBinding[];
  readonly index: ProtoServiceIndex;
  readonly completeness: GrpcTopologyCompleteness;
  readonly counters: {
    readonly registrationsObserved: number;
    readonly proven: number;
    readonly ambiguous: number;
    readonly missing: number;
    readonly multiple: number;
    readonly unsupported: number;
    readonly stale: number;
    readonly distinctProtoServicesBound: number;
    readonly distinctServiceDirectoriesBound: number;
  };
  readonly topologyDigest: string;
}

function serviceDirectoryOf(relativePath: string): string {
  const segments = relativePath.split('/');
  return segments.length >= 2 ? `${segments[0]}/${segments[1]}` : relativePath;
}

/**
 * Build the service-level topology for one repository's registrations.
 *
 * `registrationRepoId` is explicit rather than inferred, so a caller can never
 * accidentally scan the wrong repository, and tests take a synthetic value.
 */
export function buildGrpcTopology(input: {
  readonly access: SiblingSourceAccess;
  readonly inventory: RealSourceSnapshotInventory;
  readonly registrationRepoId: string;
  readonly index?: ProtoServiceIndex;
}): GrpcTopology {
  const index = input.index ?? buildProtoServiceIndex({ access: input.access, inventory: input.inventory });

  const goFiles = input.inventory.files
    .filter((file) => file.status === 'ELIGIBLE' && file.repoId === input.registrationRepoId && file.language === 'GO' && file.sourceSha !== null)
    .slice()
    .sort((left, right) => left.relativePath.localeCompare(right.relativePath));

  const excludedTestFiles = goFiles.filter((file) => !isTopologyEligibleGoPath(file.relativePath)).length;
  const eligible = goFiles.filter((file) => isTopologyEligibleGoPath(file.relativePath));

  // Descriptors and services, indexed for exact lookup. A key that resolves to
  // more than one entry is ambiguous and is never narrowed by preference.
  const descriptorsByKey = new Map<string, typeof index.descriptors>();
  for (const descriptor of index.descriptors) {
    const key = `${descriptor.importPath}|${descriptor.registrationSymbol}`;
    descriptorsByKey.set(key, [...(descriptorsByKey.get(key) ?? []), descriptor]);
  }
  const servicesByIdentity = new Map<string, typeof index.services>();
  for (const service of index.services) {
    servicesByIdentity.set(service.canonicalIdentity, [...(servicesByIdentity.get(service.canonicalIdentity) ?? []), service]);
  }

  interface Draft {
    readonly file: (typeof eligible)[number];
    readonly registrationSymbol: string;
    readonly importPath: string | null;
    readonly qualifierState: 'PROVEN' | 'QUALIFIER_UNRESOLVED' | 'QUALIFIER_AMBIGUOUS';
    readonly embeddingCorroborated: boolean;
  }

  // Corroboration is scoped to the Go PACKAGE directory, not the file. Real
  // daemons put the registration in `main.go` and embed
  // `Unimplemented<Service>Server` in `service.go` beside it, so a same-file
  // rule would report zero corroboration across the entire repository while
  // the evidence sits one file away in the same package.
  const embeddingsByDirectory = new Map<string, Set<string>>();
  const registrationsByFile = new Map<string, ReturnType<typeof readGoRegistrations>>();
  for (const file of eligible) {
    const text = input.access.reader.readFile(file.repoId, file.relativePath);
    if (text === null) continue;
    const facts = readGoRegistrations(text);
    if (facts.embeddings.length > 0) {
      const directory = file.relativePath.slice(0, file.relativePath.lastIndexOf('/'));
      const bucket = embeddingsByDirectory.get(directory) ?? new Set<string>();
      // An embedding whose own qualifier did not resolve corroborates
      // nothing: it would otherwise match, by empty string, any registration
      // whose qualifier also failed to resolve.
      for (const embedding of facts.embeddings) if (embedding.importPath !== null) bucket.add(`${embedding.importPath}|${embedding.serviceToken}`);
      embeddingsByDirectory.set(directory, bucket);
    }
    if (facts.registrations.length > 0) registrationsByFile.set(file.relativePath, facts);
  }

  const drafts: Draft[] = [];
  for (const file of eligible) {
    const facts = registrationsByFile.get(file.relativePath);
    if (facts === undefined) continue;
    const directory = file.relativePath.slice(0, file.relativePath.lastIndexOf('/'));
    const embedded = embeddingsByDirectory.get(directory) ?? new Set<string>();
    for (const registration of facts.registrations) {
      const serviceToken = registration.registrationSymbol.slice('Register'.length, -'Server'.length);
      drafts.push({
        file,
        registrationSymbol: registration.registrationSymbol,
        importPath: registration.importPath,
        qualifierState: registration.state,
        // Corroboration requires the SAME import path as well as the same
        // token, so an unrelated package's `UnimplementedBillingServer` does
        // not corroborate this registration.
        embeddingCorroborated: registration.importPath !== null && embedded.has(`${registration.importPath}|${serviceToken}`),
      });
    }
  }

  // A proto service registered from more than one observed production file is
  // MULTIPLE, not a contest to be won by the first one seen.
  const identityCounts = new Map<string, number>();
  for (const draft of drafts) {
    if (draft.importPath === null) continue;
    const descriptor = (descriptorsByKey.get(`${draft.importPath}|${draft.registrationSymbol}`) ?? [])[0];
    if (descriptor?.protoFullName == null) continue;
    identityCounts.set(descriptor.protoFullName, (identityCounts.get(descriptor.protoFullName) ?? 0) + 1);
  }

  const bindings: GrpcTopologyBinding[] = drafts.map((draft) => {
    const base = {
      serviceDirectory: serviceDirectoryOf(draft.file.relativePath),
      repoId: draft.file.repoId,
      sourceSha: draft.file.sourceSha as string,
      relativePath: draft.file.relativePath,
      registrationSymbol: draft.registrationSymbol,
      importPath: draft.importPath,
      embeddingCorroborated: draft.embeddingCorroborated,
    };
    const fail = (state: TopologyJoinState, blocker: TopologyBlocker): GrpcTopologyBinding => ({
      ...base,
      protoServiceIdentity: null,
      protoRepoId: null,
      protoRelativePath: null,
      state,
      blocker,
      evidenceClass: 'NOT_A_FACT',
      evidenceDigest: prefixedDigest24('grpctopology', { ...base, state, blocker }),
    });

    if (draft.qualifierState === 'QUALIFIER_AMBIGUOUS') return fail('AMBIGUOUS', 'QUALIFIER_AMBIGUOUS');
    if (draft.importPath === null) return fail('AMBIGUOUS', 'QUALIFIER_UNRESOLVED');

    const descriptors = descriptorsByKey.get(`${draft.importPath}|${draft.registrationSymbol}`) ?? [];
    // No descriptor observed: the SDK for this service is not in the approved
    // universe. UNSUPPORTED, never MISSING — Nightwatch cannot see it, which
    // is not a claim that it does not exist.
    if (descriptors.length === 0) return fail('UNSUPPORTED', 'SDK_DESCRIPTOR_UNOBSERVED');
    if (descriptors.length > 1) return fail('AMBIGUOUS', 'SDK_DESCRIPTOR_AMBIGUOUS');
    const descriptor = descriptors[0] as (typeof index.descriptors)[number];
    if (descriptor.state !== 'PROVEN' || descriptor.protoFullName === null) return fail('AMBIGUOUS', 'SDK_DESCRIPTOR_AMBIGUOUS');

    const services = servicesByIdentity.get(descriptor.protoFullName) ?? [];
    if (services.length === 0) return fail('UNSUPPORTED', 'PROTO_SERVICE_UNOBSERVED');
    if (services.length > 1) return fail('AMBIGUOUS', 'PROTO_SERVICE_AMBIGUOUS');
    const service = services[0] as (typeof index.services)[number];
    if (service.sourceSha !== descriptor.sourceSha && descriptor.repoId === service.repoId) return fail('STALE', 'PROTO_SNAPSHOT_MISMATCH');
    if ((identityCounts.get(descriptor.protoFullName) ?? 0) > 1) return fail('MULTIPLE', 'MULTIPLE_REGISTRATIONS');

    const proven = {
      ...base,
      protoServiceIdentity: service.canonicalIdentity,
      protoRepoId: service.repoId,
      protoRelativePath: service.relativePath,
      state: 'PROVEN' as const,
      blocker: null,
      evidenceClass: 'SOURCE_FACT' as const,
    };
    return { ...proven, evidenceDigest: prefixedDigest24('grpctopology', proven) };
  });

  bindings.sort((left, right) => left.relativePath.localeCompare(right.relativePath) || left.registrationSymbol.localeCompare(right.registrationSymbol));

  const repositoryCompleteness = input.inventory.completeness.repositories.find((entry) => entry.repoId === input.registrationRepoId);
  const enumerationState = repositoryCompleteness?.enumeration.state ?? 'UNKNOWN';
  const provenBindings = bindings.filter((binding) => binding.state === 'PROVEN');

  const counters = {
    registrationsObserved: bindings.length,
    proven: provenBindings.length,
    ambiguous: bindings.filter((binding) => binding.state === 'AMBIGUOUS').length,
    missing: bindings.filter((binding) => binding.state === 'MISSING').length,
    multiple: bindings.filter((binding) => binding.state === 'MULTIPLE').length,
    unsupported: bindings.filter((binding) => binding.state === 'UNSUPPORTED').length,
    stale: bindings.filter((binding) => binding.state === 'STALE').length,
    distinctProtoServicesBound: new Set(provenBindings.map((binding) => binding.protoServiceIdentity)).size,
    distinctServiceDirectoriesBound: new Set(provenBindings.map((binding) => binding.serviceDirectory)).size,
  };

  return {
    schemaVersion: GRPC_TOPOLOGY_VERSION,
    bindings,
    index,
    completeness: {
      enumerationState,
      repositoryCompleteProof: enumerationState === 'COMPLETE',
      absenceReason: enumerationState === 'COMPLETE' ? 'NO_OBSERVED_REGISTRATION' : 'TRUNCATED_ENUMERATION',
      observedGoFiles: eligible.length,
      excludedTestFiles,
    },
    counters,
    topologyDigest: prefixedDigest24('grpctopologyset', { bindings: bindings.map((binding) => binding.evidenceDigest), index: index.indexDigest }),
  };
}
