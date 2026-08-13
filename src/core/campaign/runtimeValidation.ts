// ---------------------------------------------------------------------------
// Small runtime guards for JSON-loaded campaign authority.
//
// TypeScript interfaces disappear at runtime. These helpers intentionally
// remain boring and explicit so persisted data cannot become trusted merely
// because a caller used a type assertion.
// ---------------------------------------------------------------------------

export type RuntimeRecord = Record<string, unknown>;

export function isRuntimeRecord(value: unknown): value is RuntimeRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function requireRuntimeRecord(value: unknown, code: string): RuntimeRecord {
  if (!isRuntimeRecord(value)) throw new Error(`${code}:OBJECT_REQUIRED`);
  return value;
}

export function requireRuntimeArray(value: unknown, code: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new Error(`${code}:ARRAY_REQUIRED`);
  return value;
}

export function assertExactKeys(value: RuntimeRecord, allowed: readonly string[], code: string, optional: readonly string[] = []): void {
  const accepted = new Set([...allowed, ...optional]);
  for (const key of Object.keys(value)) {
    if (!accepted.has(key)) throw new Error(`${code}:UNKNOWN_FIELD:${key}`);
  }
  for (const key of allowed) {
    if (!(key in value)) throw new Error(`${code}:MISSING_FIELD:${key}`);
  }
}

export function assertString(value: unknown, code: string): asserts value is string {
  if (typeof value !== 'string') throw new Error(`${code}:STRING_REQUIRED`);
}

export function assertBoolean(value: unknown, code: string): asserts value is boolean {
  if (typeof value !== 'boolean') throw new Error(`${code}:BOOLEAN_REQUIRED`);
}

export function assertNonNegativeInteger(value: unknown, code: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    throw new Error(`${code}:NON_NEGATIVE_INTEGER_REQUIRED`);
  }
}

export function assertFiniteNonNegative(value: unknown, code: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`${code}:FINITE_NON_NEGATIVE_REQUIRED`);
  }
}

export function assertUniqueStrings(values: readonly unknown[], code: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    assertString(value, code);
    if (seen.has(value)) throw new Error(`${code}:DUPLICATE:${value}`);
    seen.add(value);
  }
}

export function arraysExactlyEqual(left: readonly unknown[], right: readonly unknown[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function assertIsoTimestamp(value: unknown, code: string): asserts value is string {
  assertString(value, code);
  if (!Number.isFinite(Date.parse(value))) throw new Error(`${code}:TIMESTAMP_INVALID`);
}

export function assertEnum<T extends string>(value: unknown, allowed: readonly T[], code: string): asserts value is T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) throw new Error(`${code}:ENUM_INVALID`);
}

