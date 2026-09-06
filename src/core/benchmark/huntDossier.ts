// ---------------------------------------------------------------------------
// Visible-only hunt dossier. Built from a reproduced discriminator observation.
// Never copies hidden ground truth. No I/O, no filing, no Slack/Leslie.
// ---------------------------------------------------------------------------

import { buildAutonomousFindingDossier } from '../autonomousFinding';
import type { AutonomousFindingDossier } from '../autonomousFinding';
import { stringifyVisibleRepro, type VisibleReproObservation } from './visibleRepro';

export function tryBuildVisibleHuntDossier(input: {
  readonly caseId: string;
  readonly admitted: boolean;
  readonly reproductionCount: number;
  readonly observation: VisibleReproObservation | null;
}): AutonomousFindingDossier | null {
  if (!input.admitted || input.reproductionCount < 1 || input.observation?.mismatch !== true) {
    return null;
  }
  return buildAutonomousFindingDossier({
    title: `Visible discriminator mismatch on ${input.caseId}`,
    description: 'RERUN_SAFE_REPRODUCTION observed a mismatch on the visible pre-fix discriminator.',
    recommendedSeverity: 'S3',
    severityConfidence: 'MEDIUM',
    severityRationale: 'Mismatch is confined to a LOCAL synthetic fixture observation.',
    catchStage: 'LOCAL_SYNTHETIC',
    source: input.caseId,
    team: 'UNKNOWN',
    reproduction: 'RERUN_SAFE_REPRODUCTION on the visible discriminator.',
    expected: 'discriminator mismatch=false',
    actual: stringifyVisibleRepro(input.observation),
    evidenceRefs: [`bench:${input.caseId}:repro:1`],
    environment: 'SYNTHETIC',
    confidence: 'MEDIUM',
    falsePositiveChecks: ['HEALTH_OK discriminator reports mismatch=false'],
    reproductionCount: input.reproductionCount,
    provenance: [`benchmark:${input.caseId}`],
  });
}
