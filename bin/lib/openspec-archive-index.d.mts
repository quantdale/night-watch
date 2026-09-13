// Types for the strict archive-index/published-Purpose checker
// (`bin/lib/openspec-archive-index.mjs`).

export interface ArchiveIndexRow {
  readonly line: number;
  readonly change: string;
  readonly status: string;
  readonly classification: string;
  readonly reason: string;
}

export interface ArchiveIndexReport {
  readonly errors: readonly string[];
  readonly rows: readonly ArchiveIndexRow[];
}

export interface PurposeReport {
  readonly errors: readonly string[];
  readonly capabilities: number;
}

export const ARCHIVE_INDEX_SCHEMA: 'nightwatch.openspec-archive-index.v1';
export const ARCHIVE_INDEX_RELATIVE_PATH: 'openspec/changes/archive/ARCHIVE-INDEX.md';
export const ARCHIVE_INDEX_CLASSIFICATIONS: readonly string[];
export const PURPOSE_MIN_CHARS: number;
export const PURPOSE_MAX_CHARS: number;

export function isArchiveIndexChangeId(value: string | null | undefined): boolean;
export function publishedSpecNames(reason: string | null | undefined): string[];
export function parseArchiveIndex(text: string): { rows: ArchiveIndexRow[]; errors: string[] };
export function archivedChangeDirectories(root: string): Map<string, string>;
export function inspectArchiveIndex(root: string): ArchiveIndexReport;
export function inspectPublishedSpecPurposes(root: string): PurposeReport;
