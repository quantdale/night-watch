// ---------------------------------------------------------------------------
// Lane G — autonomous finding dossier inputs.
//
// Draft vocabulary for `buildAutonomousFindingDossier` (see dossier.ts).
// Pure data: no filesystem, network, subprocess, or AI authority; no filing surface.
// This cone never imports the alphausHandoff cone: the AH-1 hardening
// boundary admits only the handoff cone itself and tests/** as importers.
// The handoff projection (see projection.ts) is structural and its
// compatibility is proven by type-level assertions in tests/**.
// ---------------------------------------------------------------------------

import type {
  AutonomousFindingDossier,
  AutonomousSeverity,
} from '../agentProtocol/finding';

export type { AutonomousFindingDossier, AutonomousSeverity };
export { AUTONOMOUS_FINDING_AUTHORITY, AUTONOMOUS_SEVERITIES } from '../agentProtocol/finding';
export { AUTONOMOUS_FINDING_VERSION } from '../agentProtocol/versions';

/** Environments an autonomous local run may attest. */
export const AUTONOMOUS_FINDING_ENVIRONMENTS = ['LOCAL', 'DEV', 'NEXT', 'SYNTHETIC'] as const;
export type AutonomousFindingEnvironment = (typeof AUTONOMOUS_FINDING_ENVIRONMENTS)[number];

/** Confidence levels for severity and overall assessments. */
export const AUTONOMOUS_FINDING_CONFIDENCES = ['HIGH', 'MEDIUM', 'LOW'] as const;
export type AutonomousFindingConfidence = (typeof AUTONOMOUS_FINDING_CONFIDENCES)[number];

/**
 * Unvalidated draft for one autonomous finding. Every finding-grade claim
 * must arrive with evidence behind it; the builder fails closed otherwise.
 */
export interface AutonomousFindingDraft {
  readonly title: string;
  readonly description: string;
  /** AI recommendation only. Never an organizational verdict. */
  readonly recommendedSeverity: AutonomousSeverity;
  readonly severityConfidence: AutonomousFindingConfidence;
  /** Why this severity is suggested; must say what was observed, not conclude. */
  readonly severityRationale: string;
  readonly catchStage?: string | null;
  readonly source?: string | null;
  /** Owning team when proven, else 'UNKNOWN'. Never guessed. */
  readonly team?: string | null;
  readonly reproduction: string;
  readonly expected: string;
  readonly actual: string;
  /** At least one entry is required: findings without evidence are refused. */
  readonly evidenceRefs: readonly string[];
  readonly screenshotRefs?: readonly string[];
  readonly sourceLocations?: readonly string[];
  readonly affectedApis?: readonly string[];
  readonly environment: AutonomousFindingEnvironment;
  readonly confidence: AutonomousFindingConfidence;
  readonly alternativeHypotheses?: readonly string[];
  /** At least one performed check is required (the work must be shown). */
  readonly falsePositiveChecks: readonly string[];
  /** At least one successful reproduction is required. */
  readonly reproductionCount: number;
  readonly relatedHistoricalBugs?: readonly string[];
  readonly violatedInvariant?: string | null;
  /** At least one provenance entry is required (where this was observed). */
  readonly provenance: readonly string[];
}
