import crypto from 'node:crypto';
import type { AiReviewFailureCode } from './types';

export interface AiReviewErrorMetadata {
  readonly providerClass?: string;
  readonly schemaVersion?: string;
  readonly inputBytes?: number;
  readonly outputBytes?: number;
  readonly responseDigest?: string;
  readonly invocationId?: string;
}

/** Sanitized error: raw prompts, inputs, outputs, and provider messages never enter it. */
export class AiReviewError extends Error {
  readonly code: AiReviewFailureCode;
  readonly metadata: AiReviewErrorMetadata;

  constructor(code: AiReviewFailureCode, metadata: AiReviewErrorMetadata = {}) {
    super(code);
    this.name = 'AiReviewError';
    this.code = code;
    this.metadata = sanitizeMetadata(metadata);
  }
}

function sanitizeMetadata(metadata: AiReviewErrorMetadata): AiReviewErrorMetadata {
  const result: Record<string, unknown> = {};
  const stringFields = ['providerClass', 'schemaVersion', 'invocationId'] as const;
  for (const field of stringFields) {
    const value = metadata[field];
    if (typeof value === 'string' && value.length > 0 && value.length <= 240 && /^[A-Za-z0-9_.:/-]+$/.test(value)) {
      (result as Record<string, unknown>)[field] = value;
    }
  }
  if (typeof metadata.responseDigest === 'string' && /^sha256:[a-f0-9]{64}$/.test(metadata.responseDigest)) result.responseDigest = metadata.responseDigest;
  for (const field of ['inputBytes', 'outputBytes'] as const) {
    const value = metadata[field];
    if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 1024 * 1024) result[field] = value;
  }
  return result as AiReviewErrorMetadata;
}

export function responseDigest(value: string | Uint8Array): string {
  return `sha256:${crypto.createHash('sha256').update(value).digest('hex')}`;
}

export function asAiReviewError(error: unknown, fallback: AiReviewFailureCode, metadata: AiReviewErrorMetadata = {}): AiReviewError {
  if (error instanceof AiReviewError) return error;
  return new AiReviewError(fallback, metadata);
}
