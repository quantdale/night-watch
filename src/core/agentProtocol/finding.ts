// ---------------------------------------------------------------------------
// Autonomous candidate dossier freeze.
// AI severity is a recommendation. Human review is mandatory.
// External filing is prohibited. Pure data.
// ---------------------------------------------------------------------------

import { AUTONOMOUS_FINDING_VERSION } from './versions';

export { AUTONOMOUS_FINDING_VERSION };

export const AUTONOMOUS_SEVERITIES = ['S1', 'S2', 'S3', 'S4'] as const;
export type AutonomousSeverity = (typeof AUTONOMOUS_SEVERITIES)[number];

export interface AutonomousFindingAuthority {
  readonly humanReviewRequired: true;
  readonly externalPublication: 'PROHIBITED';
  readonly autoFile: false;
  readonly autoLeslie: false;
  readonly autoSlack: false;
  readonly organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY';
}

export const AUTONOMOUS_FINDING_AUTHORITY: AutonomousFindingAuthority = Object.freeze({
  humanReviewRequired: true,
  externalPublication: 'PROHIBITED',
  autoFile: false,
  autoLeslie: false,
  autoSlack: false,
  organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY',
});

export interface AutonomousFindingDossier {
  readonly schemaVersion: typeof AUTONOMOUS_FINDING_VERSION;
  readonly title: string;
  readonly description: string;
  readonly recommendedSeverity: AutonomousSeverity;
  readonly severityConfidence: 'HIGH' | 'MEDIUM' | 'LOW';
  readonly severityRationale: string;
  readonly catchStage: string | null;
  readonly source: string | null;
  readonly team: string | 'UNKNOWN';
  readonly reproduction: string;
  readonly expected: string;
  readonly actual: string;
  readonly evidenceRefs: readonly string[];
  readonly screenshotRefs: readonly string[];
  readonly sourceLocations: readonly string[];
  readonly affectedApis: readonly string[];
  readonly environment: 'LOCAL' | 'DEV' | 'NEXT' | 'SYNTHETIC';
  readonly confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  readonly alternativeHypotheses: readonly string[];
  readonly falsePositiveChecks: readonly string[];
  readonly reproductionCount: number;
  readonly relatedHistoricalBugs: readonly string[];
  readonly violatedInvariant: string | null;
  readonly provenance: readonly string[];
  readonly authority: AutonomousFindingAuthority;
}
