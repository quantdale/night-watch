import { sha256Hex, stableJsonSorted } from '../identity/canonicalDigest';

export type UnknownRecord = Record<string, unknown>;

export const SAFE_ID_RE = /^[A-Za-z0-9_.:/@-]{1,200}$/;
export const SHA256_RE = /^sha256:[a-f0-9]{64}$/;

export function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function exactKeys(value: UnknownRecord, expected: readonly string[], code: string): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) throw new Error(code);
}

export function stableJson(value: unknown): string {
  return stableJsonSorted(value);
}

export function digest(value: unknown): string {
  return `sha256:${sha256Hex(stableJsonSorted(value))}`;
}

export function assertBoundedString(value: unknown, field: string, max: number, code = 'AI_OUTPUT_SCHEMA_INVALID'): asserts value is string {
  if (typeof value !== 'string' || value.length < 1 || value.length > max) throw new Error(`${code}:${field}`);
}

export function assertOptionalString(value: unknown, field: string, max: number, code = 'AI_OUTPUT_SCHEMA_INVALID'): asserts value is string | null {
  if (value !== null) assertBoundedString(value, field, max, code);
}

export function assertSafeId(value: unknown, field: string, max = 200, code = 'AI_OUTPUT_SCHEMA_INVALID'): asserts value is string {
  assertBoundedString(value, field, max, code);
  if (!SAFE_ID_RE.test(value)) throw new Error(`${code}:${field}`);
}

export function assertUniqueStrings(value: unknown, field: string, maxItems: number, maxLength: number, code = 'AI_OUTPUT_SCHEMA_INVALID'): asserts value is readonly string[] {
  if (!Array.isArray(value) || value.length > maxItems) throw new Error(`${code}:${field}`);
  const seen = new Set<string>();
  for (const item of value) {
    assertSafeId(item, `${field}[]`, maxLength, code);
    if (seen.has(item)) throw new Error(`${code}:${field}:DUPLICATE`);
    seen.add(item);
  }
}

export function assertStringList(value: unknown, field: string, maxItems: number, maxLength: number, code = 'AI_OUTPUT_SCHEMA_INVALID'): asserts value is readonly string[] {
  if (!Array.isArray(value) || value.length > maxItems) throw new Error(`${code}:${field}`);
  for (const item of value) assertBoundedString(item, `${field}[]`, maxLength, code);
}

export function assertEnum<T extends string>(value: unknown, allowed: readonly T[], field: string, code = 'AI_OUTPUT_SCHEMA_INVALID'): asserts value is T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) throw new Error(`${code}:${field}`);
}

export function assertNonNegativeInteger(value: unknown, field: string, max: number, code = 'AI_OUTPUT_SCHEMA_INVALID'): asserts value is number {
  if (!Number.isInteger(value) || (value as number) < 0 || (value as number) > max) throw new Error(`${code}:${field}`);
}

export function parseJsonObject(value: string | Uint8Array, maxBytes: number): UnknownRecord {
  const bytes = typeof value === 'string' ? Buffer.byteLength(value, 'utf8') : value.byteLength;
  if (bytes > maxBytes) throw new Error('AI_PROVIDER_OUTPUT_TOO_LARGE');
  const text = typeof value === 'string' ? value : Buffer.from(value).toString('utf8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error('AI_PROVIDER_MALFORMED_OUTPUT');
  }
  if (!isRecord(parsed)) throw new Error('AI_OUTPUT_SCHEMA_INVALID');
  return parsed;
}
