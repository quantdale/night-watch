// Types for the certification evidence receipt (`bin/lib/certification-evidence.mjs`).
export const CERTIFICATION_RECEIPT_SCHEMA: 'nightwatch.certification-evidence-receipt.v1';
export const CERTIFICATION_RECEIPT_DIGEST_PREFIX: 'receipt:sha256:';
export const CERTIFICATION_EVIDENCE_DIRECTORY: 'evidence/certification';
export function certificationReceiptDigest(body: Record<string, unknown>): string;
export function buildCertificationReceipt(input: {
  subject: string;
  sourceHead: string;
  observedAtHead: string;
  sourceRootCleanAtEmit: boolean;
  checkId: string;
  checkState: string;
  producer: string;
  environmentClass?: string;
  commandDigest?: string;
  counts?: Record<string, number>;
  ciRunId?: string;
  ciConclusion?: string;
}): Record<string, unknown>;
export function validateCertificationReceipt(value: unknown): string[];
export function certificationReceiptPath(sha: string, subject: string): string;
