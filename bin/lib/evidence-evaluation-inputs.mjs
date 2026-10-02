// @ts-check
// R5-05 / review-5 task A4.1 — the evidence inputs handed to the release
// certification evaluator, as a module.
//
// `evaluateReleaseCertification` decides each condition from the recorded
// bindings plus four derived inputs: which artifact paths a binding declares,
// which receipt digest it names, whether the subject may certify at all, and how
// to verify a receipt and an artifact at a SHA. They used to be built inline
// inside `bin/project-state-check.mjs`, where `binding?.certifying !== false`
// could be rewritten to an always-true form and `evidenceArtifactExistsAtSha`
// to `() => true` with no test noticing. Here they are one importable function.

import { evidenceArtifactExistsAtSha } from './evidence-artifact.mjs';
import { verifyPersistedReceipt } from './release-evidence.mjs';

/**
 * @typedef {object} BindingFields
 * @property {readonly string[]} [artifactPaths]
 * @property {string | null} [receiptDigest]
 * @property {boolean} [certifying]
 * @typedef {BindingFields | null} BindingLike
 * @typedef {object} EvidenceInputs
 * @property {(sha: string, artifactPath: string) => boolean} resolveEvidenceArtifactAtSha
 * @property {Record<string, string[]>} evidenceArtifactPaths
 * @property {Record<string, string | null>} evidenceReceiptDigests
 * @property {Record<string, boolean>} evidenceCertifying
 * @property {(subject: string, digest: string, evidenceSha: string) => boolean} verifyEvidenceReceipt
 */

/**
 * @param {{ root: string, bySubject: ReadonlyMap<string, BindingLike> }} input
 * @returns {EvidenceInputs}
 */
export function buildEvidenceEvaluationInputs(input) {
  const { root, bySubject } = input;
  /** @type {Record<string, string[]>} */
  const evidenceArtifactPaths = {};
  /** @type {Record<string, string | null>} */
  const evidenceReceiptDigests = {};
  /** @type {Record<string, boolean>} */
  const evidenceCertifying = {};
  for (const [subject, binding] of bySubject) {
    evidenceArtifactPaths[subject] = Array.isArray(binding?.artifactPaths) ? [...binding.artifactPaths] : [];
    // RV-02: a SHA with no receipt is a claim, not an observation.
    evidenceReceiptDigests[subject] = binding?.receiptDigest ?? null;
    // R3-08 / corrections task 8.7: only an explicit `false` is non-certifying.
    evidenceCertifying[subject] = binding?.certifying !== false;
  }
  return {
    // Any git failure (absence, timeout, signal, spawn error) is ABSENT — never a silent pass.
    resolveEvidenceArtifactAtSha: (sha, artifactPath) => evidenceArtifactExistsAtSha(root, sha, artifactPath),
    evidenceArtifactPaths,
    evidenceReceiptDigests,
    evidenceCertifying,
    // R3-05 / corrections task 8.4: a receiptDigest is evidence only when a
    // persisted receipt re-read AT CHECK TIME re-derives it and is bound to the same SHA.
    verifyEvidenceReceipt: (subject, digest, evidenceSha) => verifyPersistedReceipt(root, subject, digest, evidenceSha).verified === true,
  };
}
