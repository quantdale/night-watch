// Types for F-02 validation lane state (`bin/lib/validation-lane-state.mjs`).

export type LaneStateClass = 'PROVEN' | 'BLOCKED_EXTERNAL' | 'UNAVAILABLE_CAPABILITY';

export interface LaneStateEntry {
  readonly laneId: string;
  readonly classes: readonly string[];
  readonly class: LaneStateClass;
  readonly command?: string;
  readonly evidence: string;
  readonly evidenceSha: string;
  readonly unblockCondition?: string | null;
  readonly revisitDate?: string | null;
}

export interface LaneStateReportEntry {
  readonly laneId: string;
  readonly classes: readonly string[];
  readonly class: LaneStateClass;
  readonly reportedClass: string;
  readonly command: string | null;
  readonly evidence: string | null;
  readonly evidenceSha: string | null;
  readonly unblockCondition: string | null;
  readonly revisitDate: string | null;
  readonly staleEvidence: boolean;
}

export interface LaneStateDiagnostic {
  readonly code: string;
  readonly detail: string;
}

export const LANE_STATE_SCHEMA: string;
export const LANE_STATE_CLASSES: readonly string[];
export const LANE_STATE_FILE: { readonly config: string; readonly name: string };

export function laneStatePath(root: string): string;
export function loadLaneState(root: string): {
  readonly ok: boolean;
  readonly errors: readonly LaneStateDiagnostic[];
  readonly lanes: readonly LaneStateEntry[];
};
export function validateLaneState(
  lanes: readonly LaneStateEntry[],
  declaredClasses: readonly string[],
): readonly LaneStateDiagnostic[];
export function reportLaneState(
  lanes: readonly LaneStateEntry[],
  lastSubstantiveSha: string | null,
  isAncestor: (left: string, right: string) => boolean,
): readonly LaneStateReportEntry[];
export function collectRevisitDue(
  lanes: readonly LaneStateEntry[],
  todayIso: string,
): readonly { readonly laneId: string; readonly revisitDate: string }[];
