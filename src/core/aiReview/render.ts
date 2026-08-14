import type { AiBugDraft, AiBugReviewInput } from './types';
import { assertCurrentBugDraft } from './review';

/** Private text rendering keeps deterministic facts and model prose visibly separate. */
export function renderBugDraft(draft: AiBugDraft, input: AiBugReviewInput): string {
  assertCurrentBugDraft(draft, input);
  const facts = input.facts;
  return [
    'AI-GENERATED — UNVERIFIED — HUMAN REVIEW REQUIRED',
    '',
    'DETERMINISTIC FACTS',
    `candidateId: ${facts.candidateId}`,
    `evidenceLevel: ${facts.evidenceLevel}`,
    `oracleFingerprint: ${facts.oracleFingerprint}`,
    `technicalSeverity: ${facts.technicalSeverity}`,
    `triagePriority: ${facts.triagePriority}`,
    `browserApiStatus: ${facts.browserApiStatus}`,
    `sourceRelevance: ${facts.sourceRelevance}`,
    'deploymentStatus: DEPLOYMENT_STATUS_UNRESOLVED',
    `evidenceRefs: ${draft.evidenceRefs.join(', ') || 'none'}`,
    `sourceRefs: ${draft.sourceRefs.join(', ') || 'none'}`,
    '',
    'AI-GENERATED SUMMARY',
    draft.summaryDraft,
    '',
    'OBSERVED BEHAVIOR DRAFT',
    draft.observedBehaviorDraft,
    '',
    'EXPECTED BEHAVIOR DRAFT',
    draft.expectedBehaviorDraft,
    '',
    'REPRODUCTION DRAFT',
    draft.reproductionDraft,
    '',
    'IMPACT DRAFT',
    draft.impactDraft,
    '',
    'UNVERIFIED HYPOTHESES',
    ...draft.hypotheses.map((hypothesis, index) => `${index + 1}. ${hypothesis.label}: ${hypothesis.text} (discriminator: ${hypothesis.whatWouldDiscriminate})`),
    '',
    'UNRESOLVED QUESTIONS',
    ...draft.uncertainties.map((uncertainty) => `- ${uncertainty}`),
    '',
    `HUMAN REVIEW STATUS: ${draft.status}`,
    'External publication: PROHIBITED',
  ].join('\n');
}
