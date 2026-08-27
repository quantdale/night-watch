// Type declarations for the pure planner -> executor handoff protocol.
export const HANDOFF_PROTOCOL_VERSION: 'nightwatch.planner-executor-handoff.v1';
export const HANDOFF_RECEIPT_SCHEMA: 'nightwatch.planner-handoff-receipt.v1';
export const HANDOFF_STATUSES: ReadonlySet<string>;
export const HANDOFF_REQUIRED_FIELDS: readonly string[];

export interface HandoffDiagnostic {
  readonly code: string;
  readonly line: number | null;
  readonly field: string | null;
}

export interface ParsedHandoffHeader {
  readonly ok: boolean;
  readonly fields: Readonly<Record<string, string>>;
  readonly records: readonly { key: string; value: string; line: number }[];
  readonly errors: readonly HandoffDiagnostic[];
}

export function isSafeCampaignId(value: unknown): boolean;
export function isGitSha(value: unknown): boolean;
export function parseHandoffHeader(text: string): ParsedHandoffHeader;
export function validateHandoffHeader(parsedOrText: string | ParsedHandoffHeader): {
  readonly ok: boolean;
  readonly fields: Readonly<Record<string, string>>;
  readonly errors: readonly HandoffDiagnostic[];
};
export function validateHandoffState(parsedOrText: string | ParsedHandoffHeader, context?: {
  readonly activeTaskId?: string;
  readonly activeTaskStatus?: string;
  readonly continuityOk?: boolean;
}): {
  readonly ok: boolean;
  readonly fields: Readonly<Record<string, string>>;
  readonly errors: readonly HandoffDiagnostic[];
};
export function uniqueErrorCodes(errors: readonly HandoffDiagnostic[]): string[];
