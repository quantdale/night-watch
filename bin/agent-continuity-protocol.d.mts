// Type declarations for the pure agent-continuity protocol module
// (bin/agent-continuity-protocol.mjs). The module itself is ESM JS; these
// declarations exist so TypeScript tests can import its pure helpers.
export const PROTOCOL_V2: 'nightwatch.agent-continuity.v2';
export const PROTOCOL_LEGACY: 'LEGACY_CONTINUITY_V1';
export const TASK_STATUSES: ReadonlySet<string>;
export const PROJECT_VERDICT_EFFECTS: ReadonlySet<'PRESERVE' | 'REEVALUATE' | 'SUPERSEDE'>;
export function normalizeProjectVerdictEffect(value: string | undefined | null): 'PRESERVE' | 'REEVALUATE' | 'SUPERSEDE' | null;

export function isCanonicalKey(key: string): boolean;
export function parseKeyValuesWithLocations(text: string): {
  records: Array<{ key: string; value: string; line: number }>;
  byKey: Map<string, Array<{ key: string; value: string; line: number }>>;
};
export function findDuplicateFields(parsed: {
  byKey: Map<string, Array<{ key: string; value: string; line: number }>>;
}): Array<{ key: string; lines: number[]; values: string[] }>;
export function fieldValue(
  parsed: { byKey: Map<string, Array<{ key: string; value: string; line: number }>> },
  key: string
): string | undefined;
export function fieldRecordsInLineRange(
  parsed: { byKey: Map<string, Array<{ key: string; value: string; line: number }>> },
  key: string,
  minExclusive?: number,
  maxInclusive?: number
): Array<{ key: string; value: string; line: number }>;
export function fieldValueInLineRange(
  parsed: { byKey: Map<string, Array<{ key: string; value: string; line: number }>> },
  key: string,
  minExclusive?: number,
  maxInclusive?: number
): string | undefined;
export function allFieldValues(
  parsed: { byKey: Map<string, Array<{ key: string; value: string; line: number }>> },
  key: string
): string[];

export function parseMarkdownSections(text: string): {
  sections: Map<string, { start: number; end: number; lines: Array<{ lineNumber: number; text: string }> }>;
  fencedLines: Set<number>;
};
export function sectionBodyLines(section: { lines: Array<{ lineNumber: number; text: string }> } | undefined): Array<{ lineNumber: number; text: string }>;
export function sectionBodyText(section: { lines: Array<{ lineNumber: number; text: string }> } | undefined): string;

export function normalizeText(value: string): string;
export function normalizeTaskStatus(value: string): 'NONE' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETE' | null;
export function phaseToken(phase: string): string;
export function derivePhaseStatusKey(phase: string): string | null;
export function isTerminalMilestoneText(value: string): boolean;
export function isTerminalWorkInProgressText(value: string): boolean;
export function isTerminalNextActionText(value: string): boolean;
export function isTerminalResumeRecipeText(value: string): boolean;
export function claimsTaskCompletion(snapshotText: string): boolean;
export function isCompleteSnapshotText(snapshotText: string): boolean;
export function hasClosurePlaceholder(value: string): boolean;

export function parseReportFields(text: string): Array<{ key: string; value: string; line: number; kind: 'kv' | 'numbered' | 'bold' }>;
export function findDuplicateReportFields(fields: Array<{ key: string; value: string; line: number }>): Array<{ key: string; lines: number[]; values: string[] }>;
export function parsePlanMilestoneLines(milestoneLines: Array<{ lineNumber: number; text: string }>): Array<{ lineNumber: number; text: string; status: string | null; unchecked: boolean }>;
export function findNonterminalPlanMilestones(milestoneLines: Array<{ lineNumber: number; text: string }>): Array<{ lineNumber: number; text: string; status: string | null; unchecked: boolean }>;
export function reportAnchorRole(key: string): 'validated' | 'substantive' | 'documentation' | 'starting' | null;
export function cleanShaValue(value: string): string;

export function validateTaskV2(
  task: {
    dir: string;
    stateText: string;
    statePath: string;
    planText: string | null;
    planPath: string;
    reportText: string | null;
    reportPath: string;
    activeText?: string | null;
    activePath?: string | null;
  },
  opts?: { bindActive?: boolean }
): { errors: Array<{ code: string; path: string | null; line: number | null; detail: string }>; warnings: Array<{ code: string; path: string | null; line: number | null; detail: string }> };

export function inspectLegacyTask(
  task: { reportText: string | null; stateNextAction: string; statePath?: string },
  status: string | undefined
): Array<{ code: string; path: string | null; line: number | null; detail: string }>;
