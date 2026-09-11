export const CLI_IMPLEMENTATION_CONTRACT_SCHEMA: string;

export interface ContractSourceFile {
  readonly file: string;
  readonly source: string;
}

export interface LoaderBinding {
  readonly path: string;
  readonly symbols: readonly string[] | null;
  readonly unsupported: string | null;
}

export interface LoaderCallSite {
  readonly file: string;
  readonly line: number;
  readonly callee: string;
  readonly kind: 'SINGLE' | 'LIST';
  readonly expression: string;
  readonly bindings: readonly LoaderBinding[];
}

export interface ContractFinding {
  readonly code: string;
  readonly detail: string;
}

export interface ContractAccess {
  readonly readSource: (relativePath: string) => string | null;
  readonly fileExists: (relativePath: string) => boolean;
}

export interface ContractStats {
  readonly binFiles: number;
  readonly callSites: number;
  readonly listCallSites: number;
  readonly distinctPaths: number;
  readonly symbolChecks: number;
  readonly literalPaths: number;
}

export interface ContractJudgement {
  readonly ok: boolean;
  readonly callSites: readonly LoaderCallSite[];
  readonly findings: readonly ContractFinding[];
  readonly stats: ContractStats;
}

export interface ExecutingTestCoverage {
  readonly bins: readonly string[];
  readonly covered: readonly { readonly bin: string; readonly tests: readonly string[] }[];
  readonly uncovered: readonly string[];
}

export function extractLoaderCallSites(
  files: readonly ContractSourceFile[],
): { readonly callSites: readonly LoaderCallSite[]; readonly findings: readonly ContractFinding[] };

export function resolveRelativeModule(
  fromPath: string,
  specifier: string,
  fileExists: (relativePath: string) => boolean,
): string | null;

export function collectExportedNames(
  modulePath: string,
  access: ContractAccess,
): { readonly names: Set<string>; readonly opaque: boolean; readonly unresolved: readonly string[] };

export function scanTypeScriptPathLiterals(
  files: readonly ContractSourceFile[],
): readonly { readonly literal: string; readonly files: readonly string[] }[];

export function renderLoaderTypeMap(paths: readonly string[]): string;

export function verifyCliImplementationContract(input: {
  readonly files: readonly ContractSourceFile[];
  readonly access: ContractAccess;
  readonly readLoaderTypeMap?: (() => string | null) | undefined;
}): ContractJudgement;

export function findBinsWithoutExecutingTest(input: {
  readonly bins: readonly string[];
  readonly tests: readonly ContractSourceFile[];
}): ExecutingTestCoverage;
