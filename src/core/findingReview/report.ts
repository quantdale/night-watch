// ---------------------------------------------------------------------------
// Human-copyable filing report: a local, private export suitable for MANUAL
// human filing (Leslie/Pondr entry by a human, never automatic submission).
//
// The report separates what Nightwatch proved from what it recommends and
// what remains unknown. Every recommendation carries its basis and
// provenance; ambiguous impact renders as UNKNOWN, never as an inferred
// severity; team renders as UNKNOWN unless proven with evidence. Labels are
// textual (FACT / RECOMMENDATION / UNKNOWN / HUMAN DECISION REQUIRED), never
// color-only.
//
// Pure module: no I/O, no network. All free text is sentinel-screened and
// length-bounded before it can reach the report.
// ---------------------------------------------------------------------------

const TEXT_MAX = 2000;
const LIST_MAX = 40;
const ITEM_MAX = 500;

const SENTINEL_RE =
  /(?:CUSTOMER_SENTINEL|ACCOUNT_SENTINEL|EMAIL_SENTINEL|COST_SENTINEL|TOKEN_SENTINEL|Bearer\s+|eyJ[A-Za-z0-9_-]{8,}\.|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/i;

function fail(code: string): never {
  throw new Error(code);
}

function text(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > TEXT_MAX || SENTINEL_RE.test(value)) {
    fail(`FILING_REPORT_INVALID:${field}`);
  }
  return value;
}

function list(value: unknown, field: string): readonly string[] {
  if (!Array.isArray(value) || value.length > LIST_MAX) fail(`FILING_REPORT_INVALID:${field}`);
  for (const [index, item] of value.entries()) {
    if (typeof item !== 'string' || item.length === 0 || item.length > ITEM_MAX || SENTINEL_RE.test(item)) {
      fail(`FILING_REPORT_INVALID:${field}[${index}]`);
    }
  }
  return value as readonly string[];
}

export interface FilingReportClassification {
  readonly severity: string;
  readonly severityBasis: string;
  readonly catchStage: string;
  readonly catchStageBasis: string;
  readonly source: string;
  readonly sourceBasis: string;
  /** Team name when proven with evidence; exactly 'UNKNOWN' otherwise. */
  readonly team: string;
  readonly teamEvidence: string | null;
}

export interface FilingReportReview {
  readonly decision: string;
  readonly resultingState: string;
  readonly reviewedAt: string;
  readonly rationale: string;
}

export interface HumanFilingReportInput {
  readonly title: string;
  readonly candidateId: string;
  readonly confidence: string;
  readonly confidenceBasis: string;
  readonly expectationId: string;
  readonly expectationProvenance: string;
  readonly classification: FilingReportClassification;
  readonly reproduction: readonly string[];
  readonly expectedBehavior: string;
  readonly actualBehavior: string;
  readonly evidence: readonly string[];
  readonly relatedFindings: readonly string[];
  readonly recurrence: string;
  readonly defectClass: string | null;
  readonly review: FilingReportReview | null;
  readonly unknowns: readonly string[];
  readonly privacyRedactions: readonly string[];
}

function section(lines: string[], heading: string, body: readonly string[]): void {
  lines.push(`## ${heading}`, '');
  for (const line of body) lines.push(line);
  lines.push('');
}

export function renderHumanFilingReport(input: HumanFilingReportInput): string {
  if (input === null || typeof input !== 'object') fail('FILING_REPORT_INVALID');
  const title = text(input.title, 'title');
  const candidateId = text(input.candidateId, 'candidateId');
  const confidence = text(input.confidence, 'confidence');
  const confidenceBasis = text(input.confidenceBasis, 'confidenceBasis');
  const expectationId = text(input.expectationId, 'expectationId');
  const expectationProvenance = text(input.expectationProvenance, 'expectationProvenance');
  const classification = input.classification;
  if (classification === null || typeof classification !== 'object') fail('FILING_REPORT_INVALID:classification');
  const severity = text(classification.severity, 'classification.severity');
  const severityBasis = text(classification.severityBasis, 'classification.severityBasis');
  const catchStage = text(classification.catchStage, 'classification.catchStage');
  const catchStageBasis = text(classification.catchStageBasis, 'classification.catchStageBasis');
  const source = text(classification.source, 'classification.source');
  const sourceBasis = text(classification.sourceBasis, 'classification.sourceBasis');
  const team = text(classification.team, 'classification.team');
  if (team !== 'UNKNOWN' && (classification.teamEvidence === null || classification.teamEvidence === undefined)) {
    fail('FILING_REPORT_TEAM_WITHOUT_EVIDENCE');
  }
  const teamEvidence = classification.teamEvidence === null ? null : text(classification.teamEvidence, 'classification.teamEvidence');
  const reproduction = list(input.reproduction, 'reproduction');
  const expectedBehavior = text(input.expectedBehavior, 'expectedBehavior');
  const actualBehavior = text(input.actualBehavior, 'actualBehavior');
  const evidence = list(input.evidence, 'evidence');
  const relatedFindings = list(input.relatedFindings, 'relatedFindings');
  const recurrence = text(input.recurrence, 'recurrence');
  const defectClass = input.defectClass === null ? null : text(input.defectClass, 'defectClass');
  const unknowns = list(input.unknowns, 'unknowns');
  const privacyRedactions = list(input.privacyRedactions, 'privacyRedactions');

  const lines: string[] = [`# ${title}`, '', `Candidate: \`${candidateId}\``, ''];
  section(lines, 'Observed impact (FACT)', [
    `- Confidence: ${confidence} — basis: ${confidenceBasis}`,
    `- Expectation violated: \`${expectationId}\` (provenance: ${expectationProvenance})`,
    `- Actual behavior: ${actualBehavior}`,
  ]);
  section(lines, 'Expected behavior (FACT: expectation claim)', [`- ${expectedBehavior}`]);
  section(lines, 'Suggested Alphaus classification (RECOMMENDATION — human decides)', [
    `- Severity: ${severity} — basis: ${severityBasis}`,
    `- Catch stage: ${catchStage} — basis: ${catchStageBasis}`,
    `- Source: ${source} — basis: ${sourceBasis}`,
    `- Team: ${team}${teamEvidence === null ? ' (no team evidence; left UNKNOWN)' : ` — evidence: ${teamEvidence}`}`,
  ]);
  section(lines, 'Reproduction (FACT)', reproduction.map((step, index) => `${index + 1}. ${step}`));
  section(lines, 'Sanitized evidence (FACT)', evidence.map((item) => `- ${item}`));
  section(lines, 'Related findings (ADVISORY)', relatedFindings.length === 0 ? ['- none'] : relatedFindings.map((item) => `- ${item}`));
  section(lines, 'Recurrence (MECHANICAL DERIVATION)', [`- ${recurrence}`]);
  section(lines, 'Defect class (ADVISORY)', [defectClass === null ? '- none identified' : `- ${defectClass}`]);
  if (input.review === null) {
    section(lines, 'Local review (HUMAN DECISION REQUIRED)', ['- No local review decision recorded.']);
  } else {
    const review = input.review;
    section(lines, 'Local review (FACT: local decision, not organizational sign-off)', [
      `- Decision: ${text(review.decision, 'review.decision')} → ${text(review.resultingState, 'review.resultingState')}`,
      `- Reviewed at: ${text(review.reviewedAt, 'review.reviewedAt')}`,
      `- Rationale: ${text(review.rationale, 'review.rationale')}`,
      '- This local review is NOT a Leslie genuine/invalid verdict or Pondr approval.',
    ]);
  }
  section(lines, 'Unknowns (UNKNOWN — human judgment required)', unknowns.length === 0 ? ['- none recorded'] : unknowns.map((item) => `- ${item}`));
  section(lines, 'Privacy (FACT)', [
    `- Redactions applied: ${privacyRedactions.length === 0 ? 'none required for this synthetic report' : privacyRedactions.join(', ')}`,
    '- PRIVATE/LOCAL artifact. No automatic external submission exists for this report.',
  ]);
  return lines.join('\n');
}
