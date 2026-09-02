// Types for the bounded quality-gate receipt diagnostics and R-11's durable
// receipt persistence. The persistence surface is deliberately narrow: resolve
// a confined destination, write canonical bytes atomically, read them back
// fail-closed. Nothing here can emit anything but the receipt bytes the gate
// already allowlisted.

export interface GateReceiptCounts {
  readonly total: number | null;
  readonly passed: number | null;
  readonly skipped: number | null;
  readonly didNotRun: number | null;
  readonly failed: number | null;
}

export interface GateReceiptSafeDetails {
  readonly failedLocations: readonly string[];
  readonly deepContainmentLane?: string;
}

export function parseCounts(output: string): GateReceiptCounts;
export function parseSafeDetails(output: string): GateReceiptSafeDetails | null;

export const GATE_RECEIPT_PATH_ENV: 'NIGHTWATCH_GATE_RECEIPT_PATH';
export const GATE_RECEIPT_DEFAULT_DIRECTORY: string;

export function gateReceiptPermittedRoots(environment?: Record<string, string | undefined>): readonly string[];

export interface GateReceiptTargetOptions {
  readonly environment?: Record<string, string | undefined>;
  readonly repositoryRoot: string;
  readonly mode: string;
  readonly gitHead: string | null;
}

/** Either a confined destination, or a categorical refusal. Never both. */
export interface GateReceiptTarget {
  readonly file?: string;
  readonly origin?: 'DEFAULT' | 'EXPLICIT';
  readonly error?: string;
}

export function resolveGateReceiptTarget(options: GateReceiptTargetOptions): GateReceiptTarget;

export interface GateReceiptWriteResult {
  readonly status: 'WRITTEN' | 'FAILED';
  readonly file?: string;
  readonly code?: string;
}

export function persistGateReceipt(file: string, canonicalBytes: string): GateReceiptWriteResult;

export interface GateReceiptReadExpectation {
  readonly gitHead?: string;
  readonly environmentClass?: string;
}

export interface GateReceiptReadResult {
  readonly status: 'READ' | 'FAILED';
  readonly receipt?: Record<string, unknown>;
  readonly bytes?: string;
  readonly code?: string;
}

export function readPersistedGateReceipt(file: string, expected?: GateReceiptReadExpectation): GateReceiptReadResult;
