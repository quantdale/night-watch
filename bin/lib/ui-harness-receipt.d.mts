export declare const UI_HARNESS_RECEIPT_SCHEMA: 'nightwatch.ui-harness-receipt.v1';
export declare const UI_HARNESS_RECEIPT_PATH: string;
export declare const UI_HARNESS_FILE: string;
export declare const UI_HARNESS_SUITE: string;
export declare const UI_HARNESS_TYPES_PATH: string;
export declare const UI_HARNESS_REQUIRED_TESTS: readonly { readonly suite: string; readonly titlePrefix: string }[];
export declare function extractApiErrorKinds(typesSource: string): string[] | null;
export declare function buildUiHarnessReceipt(input: {
  readonly files: ReadonlyArray<unknown>;
  readonly headSha: string | null;
  readonly treeClean: boolean | null;
  readonly typesSource: string | null;
  readonly executedAt: string;
}): Record<string, unknown> | null;
export declare function evaluateUiHarnessReceipt(
  raw: unknown,
  context: { readonly certifiedCheckpointSha: string | null; readonly expectedKinds: readonly string[] | null },
): {
  readonly ok: boolean;
  readonly errors: string[];
  readonly relation: 'BOUND' | 'BOUND_TO_OTHER' | 'INVALID';
  readonly summary: {
    readonly sha: string;
    readonly harnessTests: number;
    readonly totalTests: number;
    readonly kinds: number;
  } | null;
};
