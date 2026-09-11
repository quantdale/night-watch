// Type declarations for the shared operator CLI contract module
// (bin/lib/operator-cli.mjs). The module itself is ESM JS; these declarations
// exist so TypeScript tests can import its exported surface directly.

export const OPERATOR_CLI_SCHEMA: 'nightwatch.operator-cli.v1';

export const OPERATOR_CLI_EXIT: {
  readonly SUCCESS: 0;
  readonly FAILURE: 1;
  readonly USAGE: 2;
  readonly REFUSAL: 3;
  readonly EXTERNAL_BLOCK: 4;
};

export const OPERATOR_CLI_GROUPS: readonly string[];

export interface OperatorCliCommand {
  readonly name: string;
  readonly summary: string;
  readonly aliases?: readonly string[];
}

export interface OperatorCliFlag {
  readonly name: string;
  readonly shape: 'boolean' | 'string' | 'integer' | 'path' | 'enum' | 'string-list';
  readonly summary: string;
  readonly values?: readonly string[];
  readonly repeatable?: boolean;
}

export interface OperatorCliPositionals {
  readonly min?: number;
  readonly max?: number;
  readonly names?: readonly string[];
  readonly choices?: readonly string[];
  readonly summary?: string;
}

export interface OperatorCliMetadata {
  readonly schemaVersion: string;
  readonly name: string;
  readonly entry: string;
  readonly purpose: string;
  readonly group: string;
  readonly usage?: string;
  readonly commands?: readonly OperatorCliCommand[];
  readonly commandRequired?: boolean;
  readonly defaultCommand?: string;
  readonly flags?: readonly OperatorCliFlag[];
  readonly positionals?: OperatorCliPositionals;
  readonly trailing?: boolean | { readonly summary?: string };
  readonly json?: boolean;
  readonly authorization?: string;
  readonly artifacts?: readonly string[];
}

export type OperatorCliParseResult =
  | {
      readonly ok: true;
      readonly command: string | null;
      readonly flags: Record<string, unknown>;
      readonly positionals: readonly string[];
      readonly trailing: readonly string[];
      readonly json: boolean;
      readonly raw: readonly string[];
      readonly help?: boolean;
      readonly metadataOnly?: boolean;
      readonly stop?: boolean;
    }
  | { readonly ok: false; readonly code: string; readonly detail: string; readonly stop?: boolean };

export class OperatorCliUsageError extends Error {
  readonly code: string;
}

export class OperatorCliMetadataError extends Error {
  readonly code: 'CLI_METADATA_INVALID';
}

export function validateOperatorMetadata(metadata: unknown): string[];
export function renderOperatorHelp(metadata: OperatorCliMetadata): string;
export function parseOperatorCli(metadata: OperatorCliMetadata, argv: readonly string[]): OperatorCliParseResult;
export function defineOperatorCli(
  metadata: OperatorCliMetadata,
  options?: {
    readonly argv?: readonly string[];
    readonly entryUrl?: string;
    readonly stdout?: { write(chunk: string): unknown };
    readonly stderr?: { write(chunk: string): unknown };
    readonly exit?: (code: number) => void;
  }
): OperatorCliParseResult;
export function emitOperatorJson(document: unknown, stdout?: { write(chunk: string): unknown }): void;
export function refuseOperatorCli(name: string, code: string, detail: string): void;
export function blockOperatorCli(name: string, code: string, detail: string): void;
export function invokedDirectly(entryUrl: string, argvEntry?: string): boolean;
export function scanOperatorOutputForLeaks(text: string): string[];
