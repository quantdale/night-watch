// Types for the release-evidence evaluation inputs (`bin/lib/evidence-evaluation-inputs.mjs`).
export interface BindingLike { artifactPaths?: readonly string[]; receiptDigest?: string | null; certifying?: boolean }
export function buildEvidenceEvaluationInputs(input: { root: string; bySubject: ReadonlyMap<string, BindingLike | null> }): {
  resolveEvidenceArtifactAtSha: (sha: string, artifactPath: string) => boolean;
  evidenceArtifactPaths: Record<string, string[]>;
  evidenceReceiptDigests: Record<string, string | null>;
  evidenceCertifying: Record<string, boolean>;
  verifyEvidenceReceipt: (subject: string, digest: string, evidenceSha: string) => boolean;
};
