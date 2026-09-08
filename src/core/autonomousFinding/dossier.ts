// ---------------------------------------------------------------------------
// Lane G — fail-closed autonomous finding dossier builder.
//
// `buildAutonomousFindingDossier` turns an unvalidated draft into the frozen
// protocol `AutonomousFindingDossier`. Anything unproven is refused with
// `AUTONOMOUS_FINDING_INVALID:<REASON>` — notably findings without evidence,
// without a reproduction, without false-positive work, or without provenance.
//
// Authority is pinned: the returned dossier carries the exact
// `AUTONOMOUS_FINDING_AUTHORITY` reference (human review mandatory,
// external publication PROHIBITED, no automatic filing of any kind).
// The recommended severity stays a recommendation: this module has no path
// that converts it into an organizational verdict or an outbound report.
// Pure: no I/O, no clock, no network.
// ---------------------------------------------------------------------------

import {
  AUTONOMOUS_FINDING_AUTHORITY,
  AUTONOMOUS_SEVERITIES,
  type AutonomousFindingDossier,
  type AutonomousSeverity,
} from '../agentProtocol/finding';
import { closedVocabulary } from '../agentProtocol/closedVocabulary';
import { AUTONOMOUS_FINDING_VERSION } from '../agentProtocol/versions';
import {
  AUTONOMOUS_FINDING_CONFIDENCES,
  AUTONOMOUS_FINDING_ENVIRONMENTS,
  type AutonomousFindingConfidence,
  type AutonomousFindingDraft,
  type AutonomousFindingEnvironment,
} from './types';

// NW-01: object-backed membership accepted every inherited name, so a draft
// could carry `recommendedSeverity: 'constructor'` into a dossier field.
const isSeverity = closedVocabulary(AUTONOMOUS_SEVERITIES);
const isConfidence = closedVocabulary(AUTONOMOUS_FINDING_CONFIDENCES);
const isEnvironment = closedVocabulary(AUTONOMOUS_FINDING_ENVIRONMENTS);

const MAX_TITLE = 300;
const MAX_PROSE = 4000;
const MAX_RATIONALE = 2000;
const MAX_REF = 500;
const MAX_LIST_ITEMS = 128;

function invalid(reason: string): never {
  throw new Error(`AUTONOMOUS_FINDING_INVALID:${reason}`);
}

function prose(value: unknown, field: string, max: number): string {
  if (typeof value !== 'string' || value.trim().length === 0) invalid(`MISSING_${field}`);
  const trimmed = (value as string).trim();
  if (trimmed.length > max) invalid(`OVERSIZE_${field}`);
  return trimmed;
}

function optionalProse(value: unknown, field: string, max: number): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') invalid(`MALFORMED_${field}`);
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > max) invalid(`OVERSIZE_${field}`);
  return trimmed;
}

function refList(value: unknown, field: string, minItems: number): readonly string[] {
  if (!Array.isArray(value)) invalid(`MALFORMED_${field}`);
  const items = value as unknown[];
  if (items.length < minItems) invalid(`MISSING_${field}`);
  if (items.length > MAX_LIST_ITEMS) invalid(`OVERSIZE_${field}`);
  return items.map((item) => {
    if (typeof item !== 'string' || item.trim().length === 0) invalid(`MALFORMED_${field}`);
    const trimmed = (item as string).trim();
    if (trimmed.length > MAX_REF) invalid(`OVERSIZE_${field}`);
    return trimmed;
  });
}

function severity(value: unknown): AutonomousSeverity {
  if (!isSeverity(value)) invalid('UNKNOWN_SEVERITY');
  return value;
}

function confidence(value: unknown, field: string): AutonomousFindingConfidence {
  if (!isConfidence(value)) invalid(`UNKNOWN_${field}`);
  return value;
}

function environment(value: unknown): AutonomousFindingEnvironment {
  if (!isEnvironment(value)) invalid('UNKNOWN_ENVIRONMENT');
  return value;
}

/**
 * Build a validated autonomous finding dossier. Fails closed: any missing or
 * malformed finding-grade field refuses the whole draft. The authority block
 * is the shared frozen constant, never a caller-supplied value.
 */
export function buildAutonomousFindingDossier(draft: AutonomousFindingDraft): AutonomousFindingDossier {
  if (draft === null || typeof draft !== 'object' || Array.isArray(draft)) {
    invalid('MALFORMED_DRAFT');
  }
  const reproductionCount = (draft as { reproductionCount?: unknown }).reproductionCount;
  if (typeof reproductionCount !== 'number' || !Number.isInteger(reproductionCount) || reproductionCount < 1) {
    invalid('MISSING_REPRODUCTION_COUNT');
  }
  const dossier: AutonomousFindingDossier = Object.freeze({
    schemaVersion: AUTONOMOUS_FINDING_VERSION,
    title: prose(draft.title, 'TITLE', MAX_TITLE),
    description: prose(draft.description, 'DESCRIPTION', MAX_PROSE),
    recommendedSeverity: severity(draft.recommendedSeverity),
    severityConfidence: confidence(draft.severityConfidence, 'SEVERITY_CONFIDENCE'),
    severityRationale: prose(draft.severityRationale, 'SEVERITY_RATIONALE', MAX_RATIONALE),
    catchStage: optionalProse(draft.catchStage, 'CATCH_STAGE', MAX_REF),
    source: optionalProse(draft.source, 'SOURCE', MAX_REF),
    team: optionalProse(draft.team, 'TEAM', MAX_REF) ?? 'UNKNOWN',
    reproduction: prose(draft.reproduction, 'REPRODUCTION', MAX_PROSE),
    expected: prose(draft.expected, 'EXPECTED', MAX_PROSE),
    actual: prose(draft.actual, 'ACTUAL', MAX_PROSE),
    evidenceRefs: refList(draft.evidenceRefs, 'EVIDENCE', 1),
    screenshotRefs: refList(draft.screenshotRefs ?? [], 'SCREENSHOT_REFS', 0),
    sourceLocations: refList(draft.sourceLocations ?? [], 'SOURCE_LOCATIONS', 0),
    affectedApis: refList(draft.affectedApis ?? [], 'AFFECTED_APIS', 0),
    environment: environment(draft.environment),
    confidence: confidence(draft.confidence, 'CONFIDENCE'),
    alternativeHypotheses: refList(draft.alternativeHypotheses ?? [], 'ALTERNATIVE_HYPOTHESES', 0),
    falsePositiveChecks: refList(draft.falsePositiveChecks, 'FALSE_POSITIVE_CHECKS', 1),
    reproductionCount,
    relatedHistoricalBugs: refList(draft.relatedHistoricalBugs ?? [], 'RELATED_HISTORICAL_BUGS', 0),
    violatedInvariant: optionalProse(draft.violatedInvariant, 'VIOLATED_INVARIANT', MAX_REF),
    provenance: refList(draft.provenance, 'PROVENANCE', 1),
    authority: AUTONOMOUS_FINDING_AUTHORITY,
  });
  return dossier;
}
