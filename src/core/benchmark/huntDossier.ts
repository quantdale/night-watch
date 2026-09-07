// ---------------------------------------------------------------------------
// Visible-only hunt dossier. Built from a reproduced discriminator observation.
// Never copies hidden ground truth. No I/O, no filing, no Slack/Leslie.
// ---------------------------------------------------------------------------

import { buildAutonomousFindingDossier } from '../autonomousFinding';
import type { AutonomousFindingDossier } from '../autonomousFinding';
import { stringifyMinedReplayVerdict } from './containedTestReplay';
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

/**
 * Dossier for a mined case whose hidden contained replay reproduced
 * (pre-fix test failure, post-fix pass). Carries the case id and the
 * fixed-template neutral replay observation only — never the test path,
 * test source, fix diff, commit message, or assertion text.
 */
export function tryBuildMinedReplayDossier(input: {
  readonly caseId: string;
  readonly admitted: boolean;
  readonly reproductionCount: number;
}): AutonomousFindingDossier | null {
  if (!input.admitted || input.reproductionCount < 1) {
    return null;
  }
  return buildAutonomousFindingDossier({
    title: `Contained test replay reproduced ${input.caseId}`,
    description:
      'RERUN_SAFE_REPRODUCTION executed the hidden contained test replay: the fix-added test fails on the pre-fix tree and passes on the post-fix tree.',
    recommendedSeverity: 'S3',
    severityConfidence: 'MEDIUM',
    severityRationale: 'Contained offline replay of one historical test package; divergence is confined to the pre-fix tree.',
    catchStage: 'LOCAL_SYNTHETIC',
    source: input.caseId,
    team: 'UNKNOWN',
    reproduction: 'RERUN_SAFE_REPRODUCTION on the hidden mined-case replay descriptor.',
    expected: 'fix-added test passes on the post-fix tree',
    actual: stringifyMinedReplayVerdict('REPRODUCED'),
    evidenceRefs: [`bench:${input.caseId}:repro:1`],
    environment: 'LOCAL',
    confidence: 'MEDIUM',
    falsePositiveChecks: [
      'post-fix tree passes the same test package',
      'replay stderr head retained harness-side for audit, never reasoner-visible',
    ],
    reproductionCount: input.reproductionCount,
    provenance: [`benchmark:${input.caseId}`],
  });
}
