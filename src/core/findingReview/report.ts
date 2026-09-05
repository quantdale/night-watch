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

/**
 * What the owner-local review store can say about this finding RIGHT NOW.
 *
 * Four states, and they render four different ways. Collapsing any two is the
 * failure this vocabulary exists to prevent: a stale decision printed as a
 * live one turns "somebody looked at a different version of this months ago"
 * into "somebody signed this off", in the one artifact a human copies into a
 * bug tracker.
 *
 * NO_REVIEW — nothing is stored. A human decision is required.
 * CURRENT    — a stored decision still binds to the artifacts described here.
 * STALE      — a stored decision exists and does NOT bind. It is historical
 *              evidence; it is not the decision for this generation.
 * CORRUPT    — bytes exist and did not survive validation. Fail closed: no
 *              decision is named, because none was recovered.
 */
export const FILING_REPORT_REVIEW_STATES = ['NO_REVIEW', 'CURRENT', 'STALE', 'CORRUPT'] as const;
export type FilingReportReviewState = (typeof FILING_REPORT_REVIEW_STATES)[number];

/**
 * The four fields are nullable because three of the four states have no
 * decision to report, and `renderHumanFilingReport` enforces the pairing
 * rather than trusting the caller: a CORRUPT review carrying a decision, or a
 * CURRENT one missing its timestamp, is refused rather than rendered.
 */
export interface FilingReportReview {
  readonly state: FilingReportReviewState;
  readonly decision: string | null;
  readonly resultingState: string | null;
  readonly reviewedAt: string | null;
  readonly rationale: string | null;
}

export interface HumanFilingReportInput {
  readonly title: string;
  readonly candidateId: string;
  readonly confidence: string;
  readonly confidenceBasis: string;
  readonly expectationId: string;
  readonly expectationProvenance: string;
  /** The semantic contract / invariant identity, or null when none is proven. */
  readonly semanticContractId?: string | null;
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

/**
 * The non-equivalence block, stated in full wherever a decision is shown.
 *
 * Four lines, not one, because the four things a reader might mistake this
 * for are four different things. A single "this is only local" line reads as
 * a disclaimer; naming each verdict it is not reads as a boundary.
 */
const NOT_EQUIVALENT_TO: readonly string[] = [
  '- This is a Nightwatch LOCAL review only. It is NOT:',
  '  - a Leslie genuine verdict',
  '  - a Leslie invalid verdict',
  '  - a Pondr approval',
  '  - organizational sign-off of any kind',
];

/** A state that names no decision must carry no decision. Enforced, not assumed. */
function assertReviewFieldsMatchState(review: FilingReportReview): void {
  const populated = [review.decision, review.resultingState, review.reviewedAt].filter(
    (value) => value !== null && value !== undefined
  ).length;
  if (review.state === 'CURRENT' || review.state === 'STALE') {
    if (populated !== 3) fail(`FILING_REPORT_REVIEW_INVALID_FOR_STATE:${review.state}`);
    return;
  }
  // NO_REVIEW and CORRUPT. A corrupt generation that arrived carrying a
  // decision is the silent-choice failure this rule exists to stop.
  if (populated !== 0 || (review.rationale !== null && review.rationale !== undefined)) {
    fail(`FILING_REPORT_REVIEW_INVALID_FOR_STATE:${review.state}`);
  }
}

function renderLocalReview(lines: string[], review: FilingReportReview | null): void {
  if (review === null) {
    section(lines, 'Local review (HUMAN DECISION REQUIRED)', ['- No local review decision recorded.']);
    return;
  }
  if (!FILING_REPORT_REVIEW_STATES.includes(review.state)) fail('FILING_REPORT_INVALID:review.state');
  assertReviewFieldsMatchState(review);
  if (review.state === 'NO_REVIEW') {
    section(lines, 'Local review (HUMAN DECISION REQUIRED)', ['- No local review decision recorded.']);
    return;
  }
  if (review.state === 'CORRUPT') {
    // Fail closed. A stored review exists and did not validate, so the honest
    // answer is that no local review is available — never the nearest
    // readable generation, which is how a corrupt store quietly starts
    // answering questions.
    section(lines, 'Local review (UNAVAILABLE — FAIL CLOSED)', [
      '- A stored local review for this finding did not survive validation.',
      '- No local review decision is available for this generation.',
      '- HUMAN DECISION REQUIRED.',
    ]);
    return;
  }
  const decision = text(review.decision, 'review.decision');
  const resultingState = text(review.resultingState, 'review.resultingState');
  const reviewedAt = text(review.reviewedAt, 'review.reviewedAt');
  const rationale = review.rationale === null || review.rationale === undefined ? null : text(review.rationale, 'review.rationale');
  if (review.state === 'STALE') {
    // The decision is SHOWN, because destroying evidence is not caution, and
    // it is shown under a heading and a label that cannot be read as current.
    section(lines, 'Local review (HISTORICAL — DOES NOT BIND TO THIS GENERATION)', [
      '- A historical local review exists but does not bind to the current artifact.',
      '- HUMAN REVIEW REQUIRED FOR THIS GENERATION.',
      `- Historical decision (NOT current): ${decision} → ${resultingState}`,
      `- Historically reviewed at: ${reviewedAt}`,
      ...(rationale === null ? [] : [`- Historical rationale: ${rationale}`]),
      ...NOT_EQUIVALENT_TO,
    ]);
    return;
  }
  section(lines, 'Local review (FACT: current local decision, not organizational sign-off)', [
    `- Decision: ${decision} → ${resultingState}`,
    `- Reviewed at: ${reviewedAt}`,
    `- Rationale: ${rationale ?? '(none recorded)'}`,
    '- This decision binds to the artifacts described in this report.',
    ...NOT_EQUIVALENT_TO,
  ]);
}

export function renderHumanFilingReport(input: HumanFilingReportInput): string {
  if (input === null || typeof input !== 'object') fail('FILING_REPORT_INVALID');
  const title = text(input.title, 'title');
  const candidateId = text(input.candidateId, 'candidateId');
  const confidence = text(input.confidence, 'confidence');
  const confidenceBasis = text(input.confidenceBasis, 'confidenceBasis');
  const expectationId = text(input.expectationId, 'expectationId');
  const expectationProvenance = text(input.expectationProvenance, 'expectationProvenance');
  const semanticContractId = input.semanticContractId === null || input.semanticContractId === undefined
    ? null
    : text(input.semanticContractId, 'semanticContractId');
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
    `- Semantic contract: ${semanticContractId === null ? 'UNKNOWN — no invariant identity is mechanically established' : `\`${semanticContractId}\``}`,
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
  renderLocalReview(lines, input.review ?? null);
  section(lines, 'Unknowns (UNKNOWN — human judgment required)', unknowns.length === 0 ? ['- none recorded'] : unknowns.map((item) => `- ${item}`));
  section(lines, 'Privacy (FACT)', [
    `- Redactions applied: ${privacyRedactions.length === 0 ? 'none required for this synthetic report' : privacyRedactions.join(', ')}`,
    '- PRIVATE/LOCAL artifact. No automatic external submission exists for this report.',
  ]);
  return lines.join('\n');
}
