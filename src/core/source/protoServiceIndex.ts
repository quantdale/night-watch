// ---------------------------------------------------------------------------
// Nightwatch C-03 — proto service index and generated-SDK descriptors.
//
// Two halves of the join key, built independently:
//
//   1. proto services, from C-02b's reader — canonical identity
//      `<package>.<Service>`;
//   2. generated SDK descriptors, from `*_grpc.pb.go` — the registration
//      symbol `Register<Service>Server` paired with the `ServiceName` string
//      constant the generator emitted.
//
// The second half is what makes C-03 a fact rather than a naming argument.
// ouchan does not import blueapi; it imports `blue-sdk-go`, whose `go_package`
// differs. The generated file states the proto's full name itself, so the
// bridge is generated data rather than an inference from similar words.
//
// Data-in / data-out over an already-scanned inventory. No filesystem
// authority of its own; the sibling-source boundary performs every read.
// ---------------------------------------------------------------------------

import { prefixedDigest24 } from '../identity/canonicalDigest';
import { tokenizeStaticSource } from './lexical';
import { readProtoDeclarations } from './protoDeclarations';
import type { RealSourceSnapshotInventory } from './scanTypes';
import type { SiblingSourceAccess } from './siblingSource';

export const PROTO_SERVICE_INDEX_VERSION = 'nightwatch.proto-service-index.v1' as const;

export const SDK_DESCRIPTOR_STATES = ['PROVEN', 'AMBIGUOUS', 'UNPAIRED'] as const;
export type SdkDescriptorState = (typeof SDK_DESCRIPTOR_STATES)[number];

export interface ProtoServiceFact {
  readonly repoId: string;
  readonly sourceSha: string;
  readonly relativePath: string;
  readonly package: string;
  readonly serviceName: string;
  /** `<package>.<Service>` — the identity the generated SDK also states. */
  readonly canonicalIdentity: string;
  readonly rpcCount: number;
  /** RPC names, for the §28 positive-only method observation. */
  readonly rpcNames: readonly string[];
  readonly serverStreamingCount: number;
  readonly clientStreamingCount: number;
  readonly bidirectionalCount: number;
  readonly evidenceDigest: string;
}

export interface SdkServiceDescriptor {
  readonly repoId: string;
  readonly sourceSha: string;
  readonly relativePath: string;
  /** The Go import path a consumer would write to reach this symbol. */
  readonly importPath: string;
  readonly registrationSymbol: string;
  readonly serviceToken: string;
  /** The proto full name the generator wrote into the file. */
  readonly protoFullName: string | null;
  readonly state: SdkDescriptorState;
  readonly evidenceDigest: string;
}

export interface ProtoServiceIndex {
  readonly schemaVersion: typeof PROTO_SERVICE_INDEX_VERSION;
  readonly services: readonly ProtoServiceFact[];
  readonly descriptors: readonly SdkServiceDescriptor[];
  readonly indexDigest: string;
}

const SDK_MODULE_PREFIX = 'github.com/alphauslabs/blue-sdk-go';
const GRPC_GENERATED_SUFFIX = '_grpc.pb.go';
const SERVICE_NAME_RE = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)*\.[A-Za-z][A-Za-z0-9_]*$/;
const REGISTER_RE = /^Register([A-Z][A-Za-z0-9_]*)Server$/;

/** The import path a Go consumer writes for a generated SDK file. It is the
 * module prefix plus the file's directory, which is exactly what appears in
 * ouchan's import block. */
function sdkImportPath(relativePath: string): string | null {
  const directory = relativePath.slice(0, relativePath.lastIndexOf('/'));
  if (directory.length === 0 || directory.includes('..')) return null;
  return `${SDK_MODULE_PREFIX}/${directory}`;
}

/** Read one generated `*_grpc.pb.go` for its registration symbols and the
 * `ServiceName` constants beside them.
 *
 * Pairing is by the final dot-segment of the proto full name against the
 * registration symbol's service token, WITHIN one generated file. Colocation
 * is what makes that sound: both strings were emitted by one generator run
 * from one proto. Two descriptors in one file sharing a token are AMBIGUOUS
 * rather than resolved by position. */
function readSdkDescriptors(input: {
  readonly repoId: string;
  readonly sourceSha: string;
  readonly relativePath: string;
  readonly sourceText: string;
}): readonly SdkServiceDescriptor[] {
  const tokens = tokenizeStaticSource(input.sourceText, 'GO');
  if (tokens === null) return [];
  const importPath = sdkImportPath(input.relativePath);
  if (importPath === null) return [];

  const symbols: string[] = [];
  const fullNames: string[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === undefined) continue;
    if (token.kind === 'IDENTIFIER') {
      const match = token.value.match(REGISTER_RE);
      const previous = tokens[index - 1];
      // A declaration, not a call: `func Register…Server(`.
      if (match !== null && previous !== undefined && previous.kind === 'IDENTIFIER' && previous.value === 'func') symbols.push(token.value);
      if (token.value === 'ServiceName') {
        const colon = tokens[index + 1];
        const value = tokens[index + 2];
        if (colon !== undefined && colon.kind === 'PUNCT' && colon.value === ':' && value !== undefined && value.kind === 'STRING' && SERVICE_NAME_RE.test(value.value)) {
          fullNames.push(value.value);
        }
      }
    }
  }

  const descriptors: SdkServiceDescriptor[] = [];
  for (const registrationSymbol of [...new Set(symbols)].sort()) {
    const serviceToken = (registrationSymbol.match(REGISTER_RE) as RegExpMatchArray)[1] as string;
    const candidates = fullNames.filter((name) => name.slice(name.lastIndexOf('.') + 1) === serviceToken);
    const unique = [...new Set(candidates)];
    const state: SdkDescriptorState = unique.length === 1 ? 'PROVEN' : unique.length === 0 ? 'UNPAIRED' : 'AMBIGUOUS';
    const protoFullName = state === 'PROVEN' ? unique[0] as string : null;
    descriptors.push({
      repoId: input.repoId,
      sourceSha: input.sourceSha,
      relativePath: input.relativePath,
      importPath,
      registrationSymbol,
      serviceToken,
      protoFullName,
      state,
      evidenceDigest: prefixedDigest24('sdkdescriptor', { repoId: input.repoId, sourceSha: input.sourceSha, relativePath: input.relativePath, registrationSymbol, protoFullName, state }),
    });
  }
  return descriptors;
}

/** Build the index over an already-scanned inventory. */
export function buildProtoServiceIndex(input: {
  readonly access: SiblingSourceAccess;
  readonly inventory: RealSourceSnapshotInventory;
}): ProtoServiceIndex {
  const services: ProtoServiceFact[] = [];
  const descriptors: SdkServiceDescriptor[] = [];

  const eligible = input.inventory.files
    .filter((file) => file.status === 'ELIGIBLE' && file.sourceSha !== null)
    .slice()
    .sort((left, right) => left.repoId.localeCompare(right.repoId) || left.relativePath.localeCompare(right.relativePath));

  for (const file of eligible) {
    const sourceSha = file.sourceSha as string;
    if (file.language === 'PROTOBUF') {
      const text = input.access.reader.readFile(file.repoId, file.relativePath);
      if (text === null) continue;
      const facts = readProtoDeclarations(text);
      if (facts.package === null) continue;
      for (const service of facts.services) {
        services.push({
          repoId: file.repoId,
          sourceSha,
          relativePath: file.relativePath,
          package: facts.package,
          serviceName: service.serviceName,
          canonicalIdentity: service.canonicalIdentity,
          rpcCount: service.rpcs.length,
          rpcNames: service.rpcs.map((rpc) => rpc.rpcName),
          serverStreamingCount: service.rpcs.filter((rpc) => rpc.streamingClass === 'SERVER_STREAMING').length,
          clientStreamingCount: service.rpcs.filter((rpc) => rpc.streamingClass === 'CLIENT_STREAMING').length,
          bidirectionalCount: service.rpcs.filter((rpc) => rpc.streamingClass === 'BIDIRECTIONAL').length,
          evidenceDigest: prefixedDigest24('protoservice', { repoId: file.repoId, sourceSha, relativePath: file.relativePath, canonicalIdentity: service.canonicalIdentity, rpcs: service.rpcs.map((rpc) => rpc.rpcName) }),
        });
      }
      continue;
    }
    if (file.language === 'GO' && file.relativePath.endsWith(GRPC_GENERATED_SUFFIX)) {
      const text = input.access.reader.readFile(file.repoId, file.relativePath);
      if (text === null) continue;
      for (const descriptor of readSdkDescriptors({ repoId: file.repoId, sourceSha, relativePath: file.relativePath, sourceText: text })) descriptors.push(descriptor);
    }
  }

  services.sort((left, right) => left.canonicalIdentity.localeCompare(right.canonicalIdentity) || left.repoId.localeCompare(right.repoId));
  descriptors.sort((left, right) => left.importPath.localeCompare(right.importPath) || left.registrationSymbol.localeCompare(right.registrationSymbol));

  return {
    schemaVersion: PROTO_SERVICE_INDEX_VERSION,
    services,
    descriptors,
    indexDigest: prefixedDigest24('protoserviceindex', {
      services: services.map((service) => service.evidenceDigest),
      descriptors: descriptors.map((descriptor) => descriptor.evidenceDigest),
    }),
  };
}
