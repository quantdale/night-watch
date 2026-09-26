// Type declarations for the sanitized failure-location helper
// (bin/lib/sanitized-failure-locations.mjs). The module itself is ESM JS;
// these declarations exist so TypeScript tests can import its surface.

export const FAILURE_LOCATION_CLASSES: readonly ('TIMEOUT' | 'EXPECT_EQUAL' | 'EXPECT_MATCH' | 'EXPECT_THROW' | 'UNCLASSIFIED')[];

export type FailureLocationClass = (typeof FAILURE_LOCATION_CLASSES)[number];

export function classifyAssertionBlock(block: string): FailureLocationClass;

export function extractSanitizedFailedLocations(output: string, limit?: number): string[];
