export declare const CHILD_PROCESS_CENSUS_SCHEMA: string;
export declare const CHILD_PROCESS_PROFILE_SCHEMA: string;
export declare const EXECUTION_PROFILES: readonly string[];
export declare const INVOCATION_VOCABULARY: readonly string[];

export interface CensusNode {
  identity: string;
  file: string;
  line: number;
  callee: string;
  profile: string | null;
  hasTimeout: boolean;
  hasMaxBuffer: boolean;
  hasExplicitEnv: boolean;
  hasShellTrue: boolean;
  hasInheritStdio: boolean;
  spreadsProcessEnv: boolean;
  usesNpx: boolean;
}

export interface ChildProcessCensus {
  schemaVersion: string;
  importFileCount: number;
  invocationCount: number;
  unclassifiedCount: number;
  byProfile: Record<string, number>;
  digest: string;
  importFiles: string[];
  invocations: CensusNode[];
  unclassified: CensusNode[];
}

export declare function parseChildProcessImports(source: string): {
  importsChildProcess: boolean;
  bindings: Set<string>;
  namespaces: Set<string>;
};
export declare function classifyInvocation(input: {
  file: string;
  callee: string;
  argsText: string;
  optionsText: string;
}): string | null;
export declare function buildChildProcessCensus(
  files: Array<{ file: string; source: string }>,
): ChildProcessCensus;
export declare function maskSourceForDebug(source: string): string;
