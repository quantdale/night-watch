export declare const AUTHENTICATED_WRITER_CENSUS_SCHEMA: string;
export declare const AUTHENTICATED_WRITER_REGISTRY_SCHEMA: string;
export declare const WRITER_CLASSES: readonly string[];

export interface RegistryEntry {
  root: string;
  klass: string;
  capabilities: readonly string[];
}

export declare const AUTHENTICATED_WRITER_REGISTRY: readonly RegistryEntry[];

export interface RunRootWrite {
  identity: string;
  file: string;
  line: number;
  op: string;
  targets: string[];
  firstArgument: string;
}

export interface WriterNode {
  identity: string;
  file: string;
  class: string;
  registryRoot: string;
  capabilities: readonly string[];
  writeCount: number;
  sites: string[];
}

export interface WriterCensusViolation {
  code: 'UNKNOWN_WRITER' | 'STALE_REGISTRY' | 'DUPLICATE_REGISTRY' | 'EMPTY_CENSUS';
  file: string;
  detail: string;
}

export interface AuthenticatedWriterCensus {
  schemaVersion: string;
  registrySchema: string;
  registrySize: number;
  writerCount: number;
  productionWriterCount: number;
  byClass: Record<string, number>;
  digest: string;
  writers: WriterNode[];
  violations: WriterCensusViolation[];
  ok: boolean;
}

export declare function maskSource(source: string): string;
export declare function runRootTargetsFor(args: string, resolvedConstText?: string): string[];
export declare function resolveLocalConst(source: string, name: string): string | null;
export declare function discoverRunRootWrites(file: string, source: string): RunRootWrite[];
export declare function buildAuthenticatedWriterCensus(
  files: Array<{ file: string; source: string }>,
  registry?: readonly RegistryEntry[],
): AuthenticatedWriterCensus;
