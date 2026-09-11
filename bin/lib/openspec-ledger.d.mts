// Types for the shared OpenSpec ledger parser (`bin/lib/openspec-ledger.mjs`).
// One parser feeds the completion-ledger agreement check and the open-work
// report; this declaration exists so TypeScript tests can import it.

export type LedgerTaskStatus = string;

export interface LedgerOpenEntry {
  readonly line: number;
  readonly text: string;
}

export interface ParsedLedgerTasks {
  readonly open: readonly LedgerOpenEntry[];
  readonly done: number;
  readonly declaredNotInScope: number;
}

export type OpenWorkBlockerClass = 'NONE' | 'INTERNAL' | 'EXTERNAL';

export interface OpenWorkInputEntry {
  readonly changeId: string;
  readonly taskStatus: string;
  readonly openCount: number;
  readonly declaredNotInScope: number;
  readonly doneCount: number;
  readonly blocker: string | null;
  readonly blockerClass: OpenWorkBlockerClass;
}

export const LEDGER_TERMINAL_STATUSES: readonly string[];
export const LEDGER_MISSING_TASK_STATUS: string;
export const OPEN_WORK_MODEL_VERSION: string;

export interface LedgerAgreementDiagnostics {
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly info: readonly string[];
}

export function parseLedgerTasks(tasksText: string): ParsedLedgerTasks;
export function parseBlockersSection(stateText: string): string | null;
export function classifyBlocker(blockerText: string | null | undefined): OpenWorkBlockerClass;
export function listActiveChangeIds(root: string): readonly string[];
export function listArchivedChangeIds(root: string): readonly string[];
export function collectOpenWorkInput(root: string): readonly OpenWorkInputEntry[];
export function inspectLedgerAgreement(root: string): LedgerAgreementDiagnostics;
