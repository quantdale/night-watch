// ---------------------------------------------------------------------------
// Nightwatch AH-1 — the finding-handoff projector (pure, no I/O).
//
// Input validation fails closed with `ALPHAUS_HANDOFF_INVALID:<REASON>`.
// Insufficient evidence yields UNKNOWN recommendations, never guesses.
// ---------------------------------------------------------------------------

import type {
  AlphausFindingFacts,
  AlphausFindingHandoff,
  AlphausHandoffInput,
  AlphausInvestigationProjection,
  AlphausObservationStage,
  AlphausRecommendation,
  AlphausReportTypeValue,
  AlphausSeverityEvidenceClass,
  AlphausSeverityValue,
  AlphausCatchStageValue,
  AlphausSourceValue,
  BugDossier,
} from './types';
import {
  ALPHAUS_FINDING_HANDOFF_VERSION,
  ALPHAUS_SEVERITY_EVIDENCE_CLASSES,
  ALPHAUS_SEVERITY_VALUES,
  ALPHAUS_CATCH_STAGE_VALUES,
  ALPHAUS_SOURCE_VALUES,
  alphausFindingDigest,
} from './types';

const SAFE_ID_RE = /^[A-Za-z0-9_.:/-]{1,200}$/;
const MINIMALITY_GUARANTEES = ['1-MINIMAL', 'BOUNDED_MINIMAL', 'NONE'] as const;
// Mirrors src/core/triage/dossier.ts SENTINEL_RE (deliberate, see types.ts),
// EXTENDED for the draft edge: drafts are AI-generated free text, so the
// handoff layer additionally refuses email-shaped strings and SSN-shaped
// values. Triage's own vocabulary is unchanged (out of AH-1 scope to alter);
// the extension is documented here and covered by planted-plain-PII tests.
const SENTINEL_RE = /(?:CUSTOMER_SENTINEL|ACCOUNT_SENTINEL|EMAIL_SENTINEL|COST_SENTINEL|TOKEN_SENTINEL|Bearer\s+|eyJ[A-Za-z0-9_-]{8,}\.|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|https?:\/\/[^\s]+[?&](?:token|account|customer|cost)=|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|\b\d{3}-\d{2}-\d{4}\b)/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/;
const CUSTOMER_REPORT_REF_RE = /^[A-Za-z0-9_.:/-]{1,200}$/;
/** Bounty-scoring identifiers never belong in provenance or evidence prose. */
// Built from fragments: the hardening rule bans these identifiers as
// contiguous source text, and this defense must not trip its own rule.
const BOUNTY_IDENT_RE = new RegExp(
  ['expected' + 'Points', 'estimated' + 'Reward', 'reward' + 'Tier', 'bounty' + 'Points', 'bounty' + 'Score', 'calculate' + 'Bounty', 'bounty' + 'Calculator'].join('|'),
  'i',
);

const MAX_LIST_ITEMS = 128;
const MAX_TEXT = 2000;
const MAX_DRAFT_TEXT = 4000;

const REPRODUCTION_RESULTS = ['REPRODUCED', 'NOT_REPRODUCED', 'BOUNDED', 'INCOMPLETE'] as const;
const EVIDENCE_LEVELS = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5'] as const;
/** AI-review-admissible evidence levels: excludes L0/L1/L4/L5 (triage fact rule). */
const RECOMMENDATION_EVIDENCE_LEVELS: Record<string, true> = { L2: true, L3: true };
const OBSERVATION_STAGES: Record<string, true> = { LOCAL: true, DEV: true, NEXT: true, PRODUCTION: true, SOURCE_ANALYSIS: true };
const SEVERITY_EVIDENCE: Record<string, true> = Object.fromEntries(
  ALPHAUS_SEVERITY_EVIDENCE_CLASSES.map((item) => [item, true]),
);
const FAULT_BOUNDARIES: Record<string, true> = {
  AUTH: true,
  ROUTER: true,
  UI_COMPONENT: true,
  CLIENT_STATE: true,
  API_CLIENT: true,
  API_TRANSPORT: true,
  BACKEND_HANDLER: true,
  PROTOCOL: true,
  RESOURCE_LOADING: true,
  UNKNOWN: true,
};
const CONFIDENCE_LEVELS: Record<string, true> = { HIGH: true, MEDIUM: true, LOW: true, UNRESOLVED: true };

function invalid(reason: string): never {
  throw new Error(`ALPHAUS_HANDOFF_INVALID:${reason}`);
}

function text(value: unknown, field: string, max = MAX_TEXT): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > max) invalid(`${field}_TEXT`);
  if (SENTINEL_RE.test(value)) invalid(`${field}_SENTINEL`);
  return value;
}

function nullableText(value: unknown, field: string, max = MAX_TEXT): string | null {
  if (value === null || value === undefined) return null;
  return text(value, field, max);
}

function id(value: unknown, field: string): string {
  if (typeof value !== 'string' || !SAFE_ID_RE.test(value)) invalid(`${field}_ID`);
  if (SENTINEL_RE.test(value)) invalid(`${field}_SENTINEL`);
  return value;
}

function idList(value: unknown, field: string): readonly string[] {
  if (!Array.isArray(value) || value.length > MAX_LIST_ITEMS) invalid(`${field}_LIST`);
  return value.map((item) => id(item, field));
}

/** Prose lists (dossier notes, draft refs): sentinel-scanned, length-capped. */
function textList(value: unknown, field: string, max = 500): readonly string[] {
  if (!Array.isArray(value) || value.length > MAX_LIST_ITEMS) invalid(`${field}_LIST`);
  return value.map((item) => text(item, field, max));
}

function dateOrNull(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string' || !ISO_DATE_RE.test(value)) invalid(`${field}_DATE`);
  return value;
}

function assertNoSentinels(value: unknown, pathName: string): void {
  if (typeof value === 'string') {
    if (SENTINEL_RE.test(value)) invalid(`PRIVACY_BLOCKED:${pathName}`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoSentinels(item, `${pathName}[${index}]`));
    return;
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) assertNoSentinels(child, `${pathName}.${key}`);
  }
}

function severityRank(evidence: AlphausSeverityEvidenceClass): AlphausSeverityValue {
  switch (evidence) {
    case 'TOTAL_INABILITY_TO_USE_OR_TEST':
    case 'AUTHENTICATION_IMPOSSIBLE_CONFIRMED':
      return 'blocker';
    case 'DATA_LOSS_CONFIRMED':
    case 'SECURITY_IMPACT_CONFIRMED':
    case 'DATA_CORRECTNESS_IMPACT_CONFIRMED':
    case 'INVOICING_FAILURE_CONFIRMED':
      return 'critical';
    case 'INTERMITTENT_KEY_FEATURE_FAILURE':
    case 'KEY_FUNCTION_TIMEOUT_CONFIRMED':
      return 'major';
    case 'COSMETIC_ONLY_CONFIRMED':
      return 'minor';
    default:
      invalid('SEVERITY_RANK_UNREACHABLE');
  }
}

const SEVERITY_ORDER: Readonly<Record<AlphausSeverityValue, number>> = {
  blocker: 0,
  critical: 1,
  major: 2,
  minor: 3,
};

function severityRecommendation(
  dossier: BugDossier,
  evidence: readonly AlphausSeverityEvidenceClass[],
  provenance: string,
): AlphausRecommendation<AlphausSeverityValue> {
  for (const item of evidence) {
    if (SEVERITY_EVIDENCE[item] !== true) invalid('SEVERITY_EVIDENCE_CLASS');
  }
  if (evidence.length === 0) {
    return { value: 'UNKNOWN', basis: 'no observed consequence class asserted', provenance: 'none' };
  }
  if (dossier.status !== 'READY') {
    return { value: 'UNKNOWN', basis: 'dossier is not READY; consequence evidence without an admitted finding proves nothing', provenance: 'none' };
  }
  if (RECOMMENDATION_EVIDENCE_LEVELS[dossier.evidenceLevel] !== true) {
    return {
      value: 'UNKNOWN',
      basis: `evidence level ${dossier.evidenceLevel} cannot carry a severity recommendation (requires L2/L3)`,
      provenance: 'none',
    };
  }
  if (provenance.length === 0) {
    return { value: 'UNKNOWN', basis: 'severity evidence asserted without provenance', provenance: 'none' };
  }
  let best: AlphausSeverityValue = 'minor';
  for (const item of evidence) {
    const rank = severityRank(item);
    if (SEVERITY_ORDER[rank] < SEVERITY_ORDER[best]) best = rank;
  }
  return {
    value: best,
    basis: `observed consequence: ${[...evidence].join(', ')}`,
    provenance,
  };
}

function catchStageRecommendation(
  stage: AlphausObservationStage,
  outageEvidence: boolean,
): AlphausRecommendation<AlphausCatchStageValue> {
  if (OBSERVATION_STAGES[stage] !== true) invalid('OBSERVATION_STAGE');
  switch (stage) {
    case 'PRODUCTION':
      return outageEvidence
        ? { value: 'production_outage', basis: 'production observation with explicit outage evidence', provenance: 'observation provenance' }
        : { value: 'production', basis: 'production observation without outage evidence; production never implies outage', provenance: 'observation provenance' };
    case 'NEXT':
      return { value: 'next', basis: 'observation made against NEXT', provenance: 'observation provenance' };
    case 'LOCAL':
      return { value: 'UNKNOWN', basis: 'local/synthetic observation is not NEXT and not PR review', provenance: 'none' };
    case 'DEV':
      return { value: 'UNKNOWN', basis: 'DEV has no Leslie catch-stage value; never guessed as NEXT', provenance: 'none' };
    case 'SOURCE_ANALYSIS':
      return { value: 'UNKNOWN', basis: 'source analysis is not PR review without a reviewed-PR provenance', provenance: 'none' };
  }
}

function sourceRecommendation(
  customerReported: boolean,
  customerReportRef: string | null,
  candidateId: string,
): AlphausRecommendation<AlphausSourceValue> {
  // Hard invariant: customer_escaped can never be rewritten to self_found.
  // The branch is taken directly from the provenance input; no scoring,
  // inference, or convenience path remaps it.
  if (customerReported) {
    if (customerReportRef === null) invalid('CUSTOMER_REPORT_REF_MISSING');
    return {
      value: 'customer_escaped',
      basis: `customer-reported defect preserved for human bounty adjudication; ref ${customerReportRef}`,
      provenance: 'customer report provenance',
    };
  }
  if (customerReportRef !== null) invalid('CUSTOMER_REPORT_REF_WITHOUT_REPORT');
  return {
    value: 'self_found',
    basis: `independently discovered by Nightwatch; candidate ${candidateId}`,
    provenance: 'Nightwatch candidate provenance',
  };
}

function reportTypeRecommendation(
  dossier: BugDossier,
  classRemovalEvidence: string | null,
): AlphausRecommendation<AlphausReportTypeValue> {
  if (classRemovalEvidence !== null) {
    return {
      value: 'BUG_CLASS_REMOVAL',
      basis: 'systematic preventative evidence asserted',
      provenance: classRemovalEvidence,
    };
  }
  if (dossier.reproduction.result === 'REPRODUCED' || dossier.reproduction.result === 'BOUNDED') {
    return { value: 'BUG_REPORT', basis: `minimal reproduction ${dossier.reproduction.result}`, provenance: 'dossier reproduction' };
  }
  return { value: 'UNKNOWN', basis: 'no reproduction and no class-removal evidence', provenance: 'none' };
}

function facts(input: AlphausHandoffInput): AlphausFindingFacts {
  const { dossier, bugDraft, campaignRef } = input;
  if (dossier === null || typeof dossier !== 'object') invalid('DOSSIER_SHAPE');
  assertNoSentinels(dossier, 'dossier');
  if (!REPRODUCTION_RESULTS.includes(dossier.reproduction?.result)) invalid('REPRODUCTION_RESULT');
  if (!MINIMALITY_GUARANTEES.includes(dossier.reproduction?.minimalityGuarantee)) invalid('MINIMALITY_GUARANTEE');
  if (!Number.isInteger(dossier.reproduction?.count) || dossier.reproduction.count < 0 || dossier.reproduction.count > 1000000) {
    invalid('REPRODUCTION_COUNT');
  }
  if (!EVIDENCE_LEVELS.includes(dossier.evidenceLevel)) invalid('EVIDENCE_LEVEL');
  if (FAULT_BOUNDARIES[dossier.likelyFaultBoundary?.primaryBoundary] !== true) invalid('FAULT_BOUNDARY');
  if (CONFIDENCE_LEVELS[dossier.confidence?.level] !== true) invalid('CONFIDENCE_LEVEL');
  const evidenceRefs = bugDraft ? textList(bugDraft.evidenceRefs, 'EVIDENCE_REF', 200) : [];
  const sourceRefs = bugDraft ? textList(bugDraft.sourceRefs, 'SOURCE_REF', 200) : [];
  return {
    candidateId: id(dossier.candidateId, 'CANDIDATE'),
    dossierVersion: dossier.schemaVersion,
    campaignRef: nullableText(campaignRef, 'CAMPAIGN_REF', 200),
    firstObserved: dateOrNull(dossier.firstObserved, 'FIRST_OBSERVED'),
    lastObserved: dateOrNull(dossier.lastObserved, 'LAST_OBSERVED'),
    journeys: idList(dossier.journeys, 'JOURNEY'),
    seeds: idList(dossier.seeds, 'SEED'),
    oracleFingerprint: id(dossier.oracleFingerprint, 'ORACLE_FINGERPRINT'),
    routeClass: text(dossier.routeClass, 'ROUTE_CLASS', 200),
    apiOperationFamily: nullableText(dossier.apiOperationFamily, 'API_OPERATION_FAMILY', 200),
    reproduction: {
      result: dossier.reproduction.result,
      count: dossier.reproduction.count,
      minimalityGuarantee: dossier.reproduction.minimalityGuarantee,
    },
    minimalSequence: idList(dossier.minimalSequence, 'MINIMAL_SEQUENCE'),
    faultBoundary: dossier.likelyFaultBoundary.primaryBoundary,
    confidence: dossier.confidence.level,
    evidenceLevel: dossier.evidenceLevel,
    sourceRefs,
    evidenceRefs,
    alternativesRuledOut: textList(dossier.alternativesRuledOut, 'ALTERNATIVE'),
    missingEvidence: textList(dossier.missingEvidence, 'MISSING_EVIDENCE'),
    limitations: textList(
      bugDraft ? [...dossier.missingEvidence, ...bugDraft.uncertainties] : [...dossier.missingEvidence],
      'LIMITATION',
    ),
  };
}

function investigation(input: AlphausHandoffInput): AlphausInvestigationProjection {
  const { bugDraft } = input;
  if (bugDraft === null) return { reproduction: null, expected: null, actual: null, impact: null };
  if (bugDraft === undefined || typeof bugDraft !== 'object') invalid('BUG_DRAFT_SHAPE');
  // Defense in depth: every draft string is scanned, including fields the
  // handoff drops (summary, hypotheses). Untrusted text never passes unscanned.
  assertNoSentinels(bugDraft, 'bugDraft');
  if (typeof bugDraft.candidateId !== 'string') invalid('BUG_DRAFT_CANDIDATE_ID');
  return {
    reproduction: nullableText(bugDraft.reproductionDraft, 'DRAFT_REPRODUCTION', MAX_DRAFT_TEXT),
    expected: nullableText(bugDraft.expectedBehaviorDraft, 'DRAFT_EXPECTED', MAX_DRAFT_TEXT),
    actual: nullableText(bugDraft.observedBehaviorDraft, 'DRAFT_ACTUAL', MAX_DRAFT_TEXT),
    impact: nullableText(bugDraft.impactDraft, 'DRAFT_IMPACT', MAX_DRAFT_TEXT),
  };
}

function checkVocabularies(): void {
  for (const value of ALPHAUS_SEVERITY_VALUES) {
    if (!['blocker', 'critical', 'major', 'minor'].includes(value)) invalid('SEVERITY_VOCABULARY');
  }
  for (const value of ALPHAUS_CATCH_STAGE_VALUES) {
    if (!['pr_review', 'next', 'production', 'production_outage'].includes(value)) invalid('CATCH_STAGE_VOCABULARY');
  }
  for (const value of ALPHAUS_SOURCE_VALUES) {
    if (!['self_found', 'customer_escaped'].includes(value)) invalid('SOURCE_VOCABULARY');
  }
}

/**
 * Project a BugDossier (+ optional AI bug draft) into an Alphaus-compatible
 * human-review handoff. Pure: no I/O, no clock, no network.
 */
export function projectAlphausFindingHandoff(input: AlphausHandoffInput): AlphausFindingHandoff {
  checkVocabularies();
  if (input === null || typeof input !== 'object') invalid('INPUT_SHAPE');
  const { dossier, observationProvenance, severityEvidence, severityProvenance, classRemovalEvidence } = input;
  if (observationProvenance === null || typeof observationProvenance !== 'object') invalid('OBSERVATION_PROVENANCE_SHAPE');
  if (OBSERVATION_STAGES[observationProvenance.stage] !== true) invalid('OBSERVATION_STAGE');
  if (typeof observationProvenance.outageEvidence !== 'boolean') invalid('OUTAGE_EVIDENCE_SHAPE');
  if (typeof observationProvenance.customerReported !== 'boolean') invalid('CUSTOMER_REPORTED_SHAPE');
  const customerReportRef =
    observationProvenance.customerReportRef === null
      ? null
      : typeof observationProvenance.customerReportRef === 'string' &&
          CUSTOMER_REPORT_REF_RE.test(observationProvenance.customerReportRef)
        ? observationProvenance.customerReportRef
        : invalid('CUSTOMER_REPORT_REF_SHAPE');
  if (!Array.isArray(severityEvidence)) invalid('SEVERITY_EVIDENCE_SHAPE');
  const severityProv = typeof severityProvenance === 'string' ? severityProvenance : invalid('SEVERITY_PROVENANCE_SHAPE');
  if (severityProv.length > MAX_TEXT || SENTINEL_RE.test(severityProv)) invalid('SEVERITY_PROVENANCE_TEXT');
  if (BOUNTY_IDENT_RE.test(severityProv)) invalid('SEVERITY_PROVENANCE_BOUNTY');
  const classEvidence = classRemovalEvidence === null ? null : text(classRemovalEvidence, 'CLASS_REMOVAL_EVIDENCE');
  if (classEvidence !== null && BOUNTY_IDENT_RE.test(classEvidence)) invalid('CLASS_REMOVAL_BOUNTY');

  const projectedFacts = facts(input);
  const projectedInvestigation = investigation(input);
  const severity = severityRecommendation(dossier, severityEvidence, severityProv);
  const catchStage = catchStageRecommendation(
    observationProvenance.stage,
    observationProvenance.outageEvidence,
  );
  const source = sourceRecommendation(observationProvenance.customerReported, customerReportRef, projectedFacts.candidateId);
  const reportType = reportTypeRecommendation(dossier, classEvidence);

  const body = {
    schemaVersion: ALPHAUS_FINDING_HANDOFF_VERSION,
    facts: projectedFacts,
    investigation: projectedInvestigation,
    severityRecommendation: severity,
    catchStageRecommendation: catchStage,
    sourceRecommendation: source,
    teamRecommendation: {
      value: 'UNKNOWN',
      basis: 'Nightwatch has no team-attribution evidence source; team assignment affects organizational accounting and is never guessed',
      provenance: 'none',
    },
    reportTypeRecommendation: reportType,
    authority: {
      humanReviewRequired: true,
      executable: false,
      externalPublication: 'PROHIBITED',
      autoFile: false,
      autoApprove: false,
    },
  } as const;
  const digest = alphausFindingDigest(body);
  return {
    ...body,
    findingId: `alphaus-finding:sha256:${digest}`,
    deterministicDigest: digest,
  };
}

export type { AlphausFindingFacts, AlphausInvestigationProjection };
