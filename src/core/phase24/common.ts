import crypto from 'node:crypto';

export const SAFE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/;
export const SAFE_CODE_RE = /^[A-Z][A-Z0-9_:-]{0,119}$/;
export const SAFE_PATH_RE = /^[A-Za-z0-9._/-]{1,240}$/;
export const SHA_RE = /^[0-9a-f]{40}$/;
export const EVIDENCE_RE = /^ev:sha256:[0-9a-f]{24}$/;
export const DIGEST_RE = /^[a-z][a-z0-9-]{0,48}:sha256:[0-9a-f]{24}$/;
export const FULL_DIGEST_RE = /^sha256:[0-9a-f]{64}$/;

/** Canonical JSON used by every Phase 24 identity. Arrays are caller-sorted. */
export function canonical(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('PHASE24_NON_FINITE_NUMBER');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`).join(',')}}`;
  }
  throw new Error('PHASE24_UNSUPPORTED_VALUE');
}

export function digest(prefix: string, value: unknown): string {
  return `${prefix}sha256:${crypto.createHash('sha256').update(canonical(value), 'utf8').digest('hex').slice(0, 24)}`;
}

export function invalid(reason: string): never {
  throw new Error(`PHASE24_INVALID:${reason}`);
}

export function assertId(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !SAFE_ID_RE.test(value)) invalid(`${label}_ID`);
}

export function assertCode(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !SAFE_CODE_RE.test(value)) invalid(`${label}_CODE`);
}

export function assertPath(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || value.includes('..') || value.startsWith('/') || !SAFE_PATH_RE.test(value)) invalid(`${label}_PATH`);
}

export function assertSafeBoundedToken(value: unknown, label: string, maxLength = 160): asserts value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > maxLength || !/^[A-Za-z0-9][A-Za-z0-9._:/{}?=&-]*$/.test(value)) invalid(`${label}_TOKEN`);
}

export function assertSourceIdentity(source: unknown, label: string): void {
  if (source === null || typeof source !== 'object' || Array.isArray(source)) invalid(`${label}_SOURCE`);
  const value = source as Record<string, unknown>;
  assertId(value.repoId, `${label}_REPO`);
  if (typeof value.sha !== 'string' || !SHA_RE.test(value.sha)) invalid(`${label}_SHA`);
  if (typeof value.evidenceDigest !== 'string' || !EVIDENCE_RE.test(value.evidenceDigest)) invalid(`${label}_EVIDENCE`);
}

const RAW_SENTINEL_RE = /CUSTOMER_SENTINEL|SECRET_SENTINEL|BEARER\s+|PRIVATE_KEY|RAW_(?:VALUE|BODY|DOM)|(?:^|[_-])(COOKIE|PASSWORD|TOKEN)(?:$|[_-])/i;
const RAW_FIELD_RE = /(?:^|_)(?:raw|body|dom|cookie|password|secret|screenshot|trace)(?:_|$)/i;
const SAFE_CATEGORY_CODE_RE = /^[A-Z][A-Z0-9_:-]{0,119}_(?:DISCARDED|BLOCKED|REJECTED|ALLOWED|MISSING|READY|CURRENT|DRIFT|UNAVAILABLE|NOT_APPLICABLE)$/;

/** Reject raw-ish fields and sentinel values at every artifact boundary. */
export function assertNoRawArtifactFields(value: unknown, path = 'artifact'): void {
  if (Array.isArray(value)) {
    if (value.length > 128) invalid(`${path}_ARRAY_BOUND`);
    value.forEach((item, index) => assertNoRawArtifactFields(item, `${path}[${index}]`));
    return;
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (RAW_FIELD_RE.test(key)) invalid(`RAW_FIELD:${path}.${key}`);
      assertNoRawArtifactFields(item, `${path}.${key}`);
    }
    return;
  }
  if (typeof value === 'string' && RAW_SENTINEL_RE.test(value) && !SAFE_CATEGORY_CODE_RE.test(value)) invalid(`RAW_SENTINEL:${path}`);
}

export function sortedUnique<T extends string>(values: readonly T[]): readonly T[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

export function assertBoundedBoolean(value: unknown, label: string): asserts value is boolean {
  if (typeof value !== 'boolean') invalid(`${label}_BOOLEAN`);
}

export function assertBoundedInteger(value: unknown, label: string, min: number, max: number): asserts value is number {
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) invalid(`${label}_BOUND`);
}
