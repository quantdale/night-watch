// Type declarations for the derived operator command listing module
// (bin/lib/operator-command-listing.mjs).

import type { OperatorCliMetadata } from './operator-cli.d.mts';

export interface OperatorCommandEntry {
  readonly bin: string;
  readonly declared: boolean;
  readonly metadata: OperatorCliMetadata | null;
  readonly error: string | null;
}

export function discoverOperatorBins(root: string): string[];
export function sourceDeclaresOperatorMetadata(source: string): boolean;
export function extractDeclaredOperatorMetadata(source: string): unknown;
export function collectOperatorCommandMetadata(input: {
  readonly root: string;
  readonly bins: readonly string[];
  readonly run?: (absolute: string) => {
    readonly status: number | null;
    readonly stdout?: string | null;
    readonly stderr?: string | null;
    readonly error?: Error;
  };
}): OperatorCommandEntry[];
export function renderOperatorCommandListing(entries: readonly OperatorCommandEntry[]): string;
export function operatorCommandListing(
  root: string,
  options?: {
    readonly bins?: readonly string[];
    readonly run?: (absolute: string) => {
      readonly status: number | null;
      readonly stdout?: string | null;
      readonly stderr?: string | null;
      readonly error?: Error;
    };
  }
): { readonly bins: string[]; readonly entries: OperatorCommandEntry[]; readonly text: string };
