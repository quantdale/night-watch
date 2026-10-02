// R5-02 / review-5 task A2.1 (bin/lib/name-listing-scan.mjs).
export const RENAME_AWARE_LISTINGS: Readonly<Record<string, string>>;
export const RENAME_SCAN_SELF_TEST: ReadonlyArray<{ readonly name: string; readonly code: string; readonly expect: number }>;
export function scanRenameBlindListings(
  sourceText: string,
  fileName: string,
  options?: { renameAware?: boolean },
): { violations: Array<{ line: number; detail: string }>; listings: number; renameAwareListings: number };
