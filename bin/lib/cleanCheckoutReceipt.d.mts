export declare const CLEAN_RECEIPT_SCHEMA: 'nightwatch.clean-checkout-receipt.v1';
export declare const SIBLING_MANIFEST_METHOD: 'nightwatch.sibling-manifest.v2';

export interface SiblingIdentityManifest {
  ok: boolean;
  digest: string;
  entryCount: number;
  worktrees: number;
  files: number;
  truncated: boolean;
}

export interface CleanMeasure {
  ok: boolean;
  clean: boolean;
}

export interface EarlyReceiptVersions {
  source: 'AMBIENT' | 'TOOLCHAIN';
  nodeMajor: number | null;
  nodeVersion: string | null;
  npmVersion: string | null;
}

// A `type` (not `interface`) so the receipt is assignable to the
// `Record<string, unknown>` that `emit()` annotates — interfaces get no
// implicit index signature.
export type CleanEarlyReceipt = {
  schemaVersion: 'nightwatch.clean-checkout-receipt.v1';
  sourceHead: string | null;
  nodeMajor: number | null;
  nodeVersion: string | null;
  npmVersion: string | null;
  versionsSource: 'AMBIENT' | 'TOOLCHAIN';
  siblingMode: string;
  realSiblingRootClass: string;
  installResult: string;
  gateResult: string;
  finalResult: string;
}

export interface AmbientToolchainVersions {
  source: 'AMBIENT';
  nodeMajor: number;
  nodeVersion: string;
  npmVersion: string | null;
}

export interface CleanCheckoutVerdictInput {
  realSiblingMeasurement: 'MEASURED' | 'UNRESOLVED';
  siblingIdentityUnchanged: boolean;
  checkoutStillClean: boolean;
  sourceRootStillClean: boolean;
  gateResult: string;
}

export interface CleanEarlyReceiptInput {
  sourceHead: string | null;
  siblingMode: string;
  realSiblingRootClass: string;
  versions: EarlyReceiptVersions;
  installResult: string;
  gateResult: string;
  finalResult: string;
}

export function gitReadOnly(args: readonly string[], cwd: string): import('node:child_process').SpawnSyncReturns<string>;
export function measureClean(cwd: string): CleanMeasure;
export function siblingIdentityManifest(siblingRoot: string): SiblingIdentityManifest;
export function ambientToolchainVersions(cwd: string): AmbientToolchainVersions;
export function cleanEarlyReceipt(input: CleanEarlyReceiptInput): CleanEarlyReceipt;
export function resolveCleanCheckoutVerdict(input: CleanCheckoutVerdictInput): string;
