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

/**
 * Phase-16CH DEF-02 repair: unknown-field diagnostics previously echoed the
 * attacker-controlled key VERBATIM, so a hostile document could smuggle
 * secret-shaped material (e.g. "Authorization: Bearer …" as a JSON key) into
 * error output. Echo a key only when it is provably a safe bounded token;
 * anything else is replaced by an opaque marker. Field VALUES were never
 * echoed and still are not.
 */
const SAFE_FIELD_NAME_RE = /^[A-Za-z0-9_.:-]{1,64}$/;

function safeFieldNameForDiagnostic(key: string): string {
  return SAFE_FIELD_NAME_RE.test(key) ? key : '[UNSAFE_FIELD_NAME]';
}

export function assertExactKeys(value: RuntimeRecord, allowed: readonly string[], code: string, optional: readonly string[] = []): void {
  const accepted = new Set([...allowed, ...optional]);
  for (const key of Object.keys(value)) {
    if (!accepted.has(key)) throw new Error(`${code}:UNKNOWN_FIELD:${safeFieldNameForDiagnostic(key)}`);
  }
  for (const key of allowed) {
    // Required authority must be present on the document itself. Using `in`
    // would allow a hostile prototype to satisfy a required field without
    // serializing that field into the document being validated.
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      throw new Error(`${code}:MISSING_FIELD:${safeFieldNameForDiagnostic(key)}`);
    }
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

/** Non-negative integer bounded above (inclusive); Phase 15P A09 ordinal/attempt bounds. */
export function assertIntegerAtMost(value: unknown, maxValue: number, code: string): asserts value is number {
  assertNonNegativeInteger(value, code);
  if (value > maxValue) throw new Error(`${code}:EXCEEDS_BOUND:${maxValue}`);
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
    if (seen.has(value)) throw new Error(`${code}:DUPLICATE:${safeErrorDetail(value)}`);
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

// ---------------------------------------------------------------------------
// Bounded error-detail echo (Phase 15P A13 privacy hardening).
//
// Durable validator errors carry codes plus BOUNDED CATEGORICAL detail only.
// `safeErrorDetail` projects a rejected input value onto that surface: short
// categorical text passes through verbatim (stable messages for legitimate
// operator debugging), while anything over the length bound or bearing
// secret/sentinel-shaped content is replaced by a fixed marker so raw
// payloads can never enter error messages, validation results, or receipts.
// ---------------------------------------------------------------------------

export const REDACTED_ERROR_DETAIL = '<redacted-detail>' as const;

const ERROR_DETAIL_MAX_LENGTH = 160;
/** Categorical detail charset (same family as the readiness blocker detail). */
const ERROR_DETAIL_SAFE_RE = /^[A-Za-z0-9_.:/@()+, -]*$/;
/** Secret/sentinel shapes that must never be echoed even when charset-clean. */
const ERROR_DETAIL_FORBIDDEN_RE =
  /(?:SENTINEL|bearer[ :=]|eyJ[A-Za-z0-9_-]{8,}\.|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|password|secret|cookie|credential|api[-_]?key|authorization|https?:\/\/|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|(?:customer|account|tenant|user|email)[-_ :/][A-Z0-9][A-Z0-9._:-]{2,})/i;

/** True when `text` bears sentinel/secret-shaped content (fail-closed signal). */
export function containsForbiddenErrorDetail(text: string): boolean {
  return ERROR_DETAIL_FORBIDDEN_RE.test(text);
}

/** Bounded categorical projection of a rejected input value for error text. */
export function safeErrorDetail(value: unknown): string {
  const text = typeof value === 'string' ? value : String(value);
  return text.length <= ERROR_DETAIL_MAX_LENGTH &&
    ERROR_DETAIL_SAFE_RE.test(text) &&
    !containsForbiddenErrorDetail(text)
    ? text
    : REDACTED_ERROR_DETAIL;
}
