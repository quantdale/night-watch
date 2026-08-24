import crypto from 'node:crypto';

/** Stable JSON for the closed Phase 22 DTOs.  Undefined object properties are
 * omitted, arrays preserve order, and object keys are sorted. */
export function phase22Canonicalize(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('PHASE22_DIGEST_NON_FINITE_NUMBER');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(phase22Canonicalize).join(',')}]`;
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).filter((key) => record[key] !== undefined).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${phase22Canonicalize(record[key])}`).join(',')}}`;
  }
  throw new Error('PHASE22_DIGEST_UNSUPPORTED_VALUE');
}

export function phase22Digest(value: unknown, prefix: string): string {
  const hex = crypto.createHash('sha256').update(phase22Canonicalize(value), 'utf8').digest('hex').slice(0, 24);
  return `${prefix}${hex}`;
}

export function phase22ReceiptId(value: unknown): string {
  return phase22Digest(value, 'receipt:sha256:');
}

export function phase22ManifestId(value: unknown): string {
  return phase22Digest(value, 'manifest:sha256:');
}

export function phase22DossierId(value: unknown): string {
  return phase22Digest(value, 'dossier:sha256:');
}
