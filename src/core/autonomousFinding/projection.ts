// ---------------------------------------------------------------------------
// Lane G — structural projection of an autonomous dossier onto the existing
// human-review handoff shape.
//
// This module does NOT import the handoff cone: the AH-1 hardening boundary
// admits only that cone itself and tests/** as importers. The shapes below
// are deliberate literal duplicates of the handoff authority and
// recommendation types, and compatibility is proven by type-level assertions
// in tests/unit/autonomousFinding.test.ts (a permitted importer of both).
//
// Projection discipline (advisory only, never a verdict):
// - Authority literals are exact and unweakable: review mandatory, external
//   publication PROHIBITED, no automatic filing, no automatic approval.
// - Every organizational classification stays UNKNOWN with its basis and
//   provenance attached. In particular the AI severity recommendation
//   (S1–S4) is cited in the severity basis but NEVER mapped onto the
//   organizational severity vocabulary — that mapping belongs to the human
//   reviewer alone.
// - Proven facts (title, reproduction, expected, actual, evidence) pass
//   through verbatim so review starts from what was actually observed.
// Pure: no I/O, no clock, no network, no outbound report path.
// ---------------------------------------------------------------------------

import type { AutonomousFindingDossier } from '../agentProtocol/finding';

export const AUTONOMOUS_HANDOFF_PROJECTION_VERSION =
  'nightwatch.autonomous-finding-handoff-projection.v1' as const;

/** Literal duplicate of the handoff authority block (see module header). */
export interface AutonomousHandoffAuthority {
  readonly humanReviewRequired: true;
  readonly executable: false;
  readonly externalPublication: 'PROHIBITED';
  readonly autoFile: false;
  readonly autoApprove: false;
}

/** Literal duplicate of the handoff recommendation shape (UNKNOWN only). */
export interface AutonomousHandoffRecommendation {
  readonly value: 'UNKNOWN';
  readonly basis: string;
  readonly provenance: string;
}

/** Proven facts carried verbatim from the dossier for human review. */
export interface AutonomousHandoffFacts {
  readonly title: string;
  readonly description: string;
  readonly reproduction: string;
  readonly expected: string;
  readonly actual: string;
  readonly evidenceRefs: readonly string[];
  readonly screenshotRefs: readonly string[];
  readonly sourceLocations: readonly string[];
  readonly affectedApis: readonly string[];
  readonly confidence: AutonomousFindingDossier['confidence'];
  readonly environment: AutonomousFindingDossier['environment'];
  readonly reproductionCount: number;
  readonly relatedHistoricalBugs: readonly string[];
  readonly violatedInvariant: string | null;
}

/** Review-ready projection: facts plus UNKNOWN classifications plus authority. */
export interface AutonomousHandoffProjection {
  readonly schemaVersion: typeof AUTONOMOUS_HANDOFF_PROJECTION_VERSION;
  readonly facts: AutonomousHandoffFacts;
  readonly severityRecommendation: AutonomousHandoffRecommendation;
  readonly catchStageRecommendation: AutonomousHandoffRecommendation;
  readonly sourceRecommendation: AutonomousHandoffRecommendation;
  readonly teamRecommendation: AutonomousHandoffRecommendation;
  readonly authority: AutonomousHandoffAuthority;
}

function recommendation(basis: string, provenance: readonly string[]): AutonomousHandoffRecommendation {
  return Object.freeze({
    value: 'UNKNOWN' as const,
    basis,
    provenance: provenance.length > 0 ? provenance.join('; ') : 'dossier',
  });
}

/**
 * Project a validated dossier onto the human-review handoff shape.
 * Classifications are always UNKNOWN: this function can neither file nor
 * approve nor publish, and it performs no severity-vocabulary mapping.
 */
export function projectAutonomousDossierToHandoff(
  dossier: AutonomousFindingDossier,
): AutonomousHandoffProjection {
  const provenance = dossier.provenance.length > 0 ? dossier.provenance : ['dossier'];
  return Object.freeze({
    schemaVersion: AUTONOMOUS_HANDOFF_PROJECTION_VERSION,
    facts: Object.freeze({
      title: dossier.title,
      description: dossier.description,
      reproduction: dossier.reproduction,
      expected: dossier.expected,
      actual: dossier.actual,
      evidenceRefs: dossier.evidenceRefs,
      screenshotRefs: dossier.screenshotRefs,
      sourceLocations: dossier.sourceLocations,
      affectedApis: dossier.affectedApis,
      confidence: dossier.confidence,
      environment: dossier.environment,
      reproductionCount: dossier.reproductionCount,
      relatedHistoricalBugs: dossier.relatedHistoricalBugs,
      violatedInvariant: dossier.violatedInvariant,
    }),
    severityRecommendation: recommendation(
      `AI severity recommendation ${dossier.recommendedSeverity} (${dossier.severityConfidence}) `
        + 'is advisory only and is not mapped onto organizational severity vocabulary; '
        + `rationale held in dossier: ${dossier.severityRationale}`,
      provenance,
    ),
    catchStageRecommendation: recommendation(
      dossier.catchStage === null
        ? 'No proven catch-stage value; dossier carries no observation-stage evidence.'
        : `Dossier catch-stage note '${dossier.catchStage}' is unproven organizational vocabulary; held for human review.`,
      provenance,
    ),
    sourceRecommendation: recommendation(
      dossier.source === null
        ? 'No proven source value; dossier carries no reporter evidence.'
        : `Dossier source note '${dossier.source}' is unproven organizational vocabulary; held for human review.`,
      provenance,
    ),
    teamRecommendation: recommendation(
      dossier.team === 'UNKNOWN'
        ? 'No team evidence: Nightwatch has no team-attribution source.'
        : `Dossier team note '${dossier.team}' is unproven organizational vocabulary; held for human review.`,
      provenance,
    ),
    authority: Object.freeze({
      humanReviewRequired: true as const,
      executable: false as const,
      externalPublication: 'PROHIBITED' as const,
      autoFile: false as const,
      autoApprove: false as const,
    }),
  });
}
