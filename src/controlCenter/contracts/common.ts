// ---------------------------------------------------------------------------
// Nightwatch Control Center — shared public-contract primitives.
//
// These helpers are deliberately framework-neutral. They are the only common
// input boundary used by the loopback server and the adapters: public IDs are
// identifiers, never filesystem paths; public text is a bounded, screened
// label; and public errors are categorical. Keep this module free of fs,
// network, child-process, persistence, and domain-service authority.
// ---------------------------------------------------------------------------

export const CONTROL_CENTER_API_VERSION = 'v1' as const;
export const CONTROL_CENTER_CONTRACT_NAMESPACE = 'nightwatch.control-center' as const;
export const CONTROL_CENTER_SCOPE = 'LOCAL_LOOPBACK_ONLY' as const;
export const CONTROL_CENTER_AUTHORIZATION_CLASS = 'CONTROL_CENTER_LOCAL_READ_ONLY_UI_ONLY' as const;

export const CONTROL_CENTER_LIMITS = Object.freeze({
  safeIdLength: 96,
  safeLabelLength: 160,
  safeRouteTemplateLength: 240,
  cursorLength: 128,
  defaultPageLimit: 50,
  maxPageLimit: 100,
  defaultTimelineLimit: 100,
  maxTimelineLimit: 250,
  defaultGraphDepth: 1,
  maxGraphDepth: 6,
  defaultGraphNodes: 250,
  maxGraphNodes: 1000,
  defaultGraphEdges: 500,
  maxGraphEdges: 2000,
  maxErrorCodeLength: 64,
  maxSequence: 2_147_483_647,
} as const);

export type SafeControlCenterId = string & { readonly __nightwatchControlCenterSafeId: unique symbol };
export type SafeControlCenterCursor = string & { readonly __nightwatchControlCenterSafeCursor: unique symbol };
export type SafeControlCenterLabel = string & { readonly __nightwatchControlCenterSafeLabel: unique symbol };
export type SafeControlCenterRouteTemplate = string & { readonly __nightwatchControlCenterSafeRoute: unique symbol };
export type SafeControlCenterSha = string & { readonly __nightwatchControlCenterSafeSha: unique symbol };
export type SafeControlCenterDigest = string & { readonly __nightwatchControlCenterSafeDigest: unique symbol };
export type SafeControlCenterTimestamp = string & { readonly __nightwatchControlCenterSafeTimestamp: unique symbol };
export type SafeControlCenterCode = string & { readonly __nightwatchControlCenterSafeCode: unique symbol };

const SAFE_ID_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9._:-]{0,95})$/;
const SAFE_CURSOR_PATTERN = /^[A-Za-z0-9._~-]{1,128}$/;
const SAFE_CODE_PATTERN = /^[A-Z][A-Z0-9_]{0,63}$/;
const SAFE_SHA_PATTERN = /^[0-9a-f]{40}$/;
const SAFE_DIGEST_PATTERN = /^[a-z][a-z0-9.-]{0,31}:(?:sha256:)?[0-9a-f]{24,64}$/;
const SAFE_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const SAFE_LABEL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 ._:/@+(){}\[\]-]{0,159}$/;
const SAFE_ROUTE_PATTERN = /^\/[A-Za-z0-9._:/{}-]{0,239}$/;
const SENSITIVE_LABEL_PATTERN = /(?:authorization|bearer|cookie|credential|password|secret|token|customer|cost|body|trace)/i;

function stringValue(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

/** Return a safe identifier or null. Separators and path-shaped input fail closed. */
export function asSafeControlCenterId(value: unknown): SafeControlCenterId | null {
  const text = stringValue(value);
  return text !== null && SAFE_ID_PATTERN.test(text) ? (text as SafeControlCenterId) : null;
}

/** Return a safe opaque cursor or null. Cursors cannot contain path/query separators. */
export function asSafeControlCenterCursor(value: unknown): SafeControlCenterCursor | null {
  const text = stringValue(value);
  return text !== null && SAFE_CURSOR_PATTERN.test(text) ? (text as SafeControlCenterCursor) : null;
}

/**
 * Screen a source-controlled display label. Unsupported characters and
 * security/privacy-shaped vocabulary are omitted rather than echoed.
 */
export function asSafeControlCenterLabel(value: unknown): SafeControlCenterLabel | null {
  const text = stringValue(value);
  if (text === null || text.length > CONTROL_CENTER_LIMITS.safeLabelLength) return null;
  if (!SAFE_LABEL_PATTERN.test(text) || SENSITIVE_LABEL_PATTERN.test(text)) return null;
  return text as SafeControlCenterLabel;
}

/** Route templates are display metadata, not caller-supplied filesystem paths. */
export function asSafeControlCenterRouteTemplate(value: unknown): SafeControlCenterRouteTemplate | null {
  const text = stringValue(value);
  if (text === null || text.length > CONTROL_CENTER_LIMITS.safeRouteTemplateLength) return null;
  if (!SAFE_ROUTE_PATTERN.test(text) || text.includes('..') || text.includes('//')) return null;
  return text as SafeControlCenterRouteTemplate;
}

export function asSafeControlCenterSha(value: unknown): SafeControlCenterSha | null {
  const text = stringValue(value);
  return text !== null && SAFE_SHA_PATTERN.test(text) ? (text as SafeControlCenterSha) : null;
}

export function asSafeControlCenterDigest(value: unknown): SafeControlCenterDigest | null {
  const text = stringValue(value);
  return text !== null && SAFE_DIGEST_PATTERN.test(text) ? (text as SafeControlCenterDigest) : null;
}

export function asSafeControlCenterTimestamp(value: unknown): SafeControlCenterTimestamp | null {
  const text = stringValue(value);
  if (text === null || !SAFE_TIMESTAMP_PATTERN.test(text)) return null;
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? (text as SafeControlCenterTimestamp) : null;
}

/** Categorical codes are safe only when they use the fixed uppercase vocabulary shape. */
export function asSafeControlCenterCode(value: unknown): SafeControlCenterCode | null {
  const text = stringValue(value);
  return text !== null && SAFE_CODE_PATTERN.test(text) ? (text as SafeControlCenterCode) : null;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function boundedInteger(value: unknown, minimum: number, maximum: number): number | null {
  if (typeof value === 'string' && value.trim() === '') return null;
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
}

export function boundedPageLimit(value: unknown, fallback = CONTROL_CENTER_LIMITS.defaultPageLimit): number | null {
  if (value === undefined || value === null) return fallback;
  return boundedInteger(value, 1, CONTROL_CENTER_LIMITS.maxPageLimit);
}

export function boundedTimelineLimit(value: unknown, fallback = CONTROL_CENTER_LIMITS.defaultTimelineLimit): number | null {
  if (value === undefined || value === null) return fallback;
  return boundedInteger(value, 1, CONTROL_CENTER_LIMITS.maxTimelineLimit);
}

export function boundedGraphDepth(value: unknown, fallback = CONTROL_CENTER_LIMITS.defaultGraphDepth): number | null {
  if (value === undefined || value === null) return fallback;
  return boundedInteger(value, 0, CONTROL_CENTER_LIMITS.maxGraphDepth);
}

export function boundedSequence(value: unknown): number | null {
  return boundedInteger(value, 0, CONTROL_CENTER_LIMITS.maxSequence);
}

export type ControlCenterErrorCode =
  | 'CONTROL_CENTER_BAD_REQUEST'
  | 'CONTROL_CENTER_NOT_FOUND'
  | 'CONTROL_CENTER_METHOD_NOT_ALLOWED'
  | 'CONTROL_CENTER_ORIGIN_REJECTED'
  | 'CONTROL_CENTER_HOST_REJECTED'
  | 'CONTROL_CENTER_PATH_REJECTED'
  | 'CONTROL_CENTER_SOURCE_UNAVAILABLE'
  | 'CONTROL_CENTER_PAYLOAD_TOO_LARGE'
  | 'CONTROL_CENTER_UI_NOT_BUILT'
  | 'CONTROL_CENTER_INTERNAL_FAILURE';

export const CONTROL_CENTER_ERROR_SCHEMA_VERSION = 'nightwatch.control-center.error.v1' as const;

export interface ControlCenterErrorDto {
  readonly schemaVersion: typeof CONTROL_CENTER_ERROR_SCHEMA_VERSION;
  readonly code: ControlCenterErrorCode;
  readonly retryable: boolean;
}

const ERROR_RETRYABLE: Readonly<Record<ControlCenterErrorCode, boolean>> = Object.freeze({
  CONTROL_CENTER_BAD_REQUEST: false,
  CONTROL_CENTER_NOT_FOUND: false,
  CONTROL_CENTER_METHOD_NOT_ALLOWED: false,
  CONTROL_CENTER_ORIGIN_REJECTED: false,
  CONTROL_CENTER_HOST_REJECTED: false,
  CONTROL_CENTER_PATH_REJECTED: false,
  CONTROL_CENTER_SOURCE_UNAVAILABLE: true,
  CONTROL_CENTER_PAYLOAD_TOO_LARGE: false,
  CONTROL_CENTER_UI_NOT_BUILT: false,
  CONTROL_CENTER_INTERNAL_FAILURE: true,
});

export function controlCenterError(code: ControlCenterErrorCode): ControlCenterErrorDto {
  return {
    schemaVersion: CONTROL_CENTER_ERROR_SCHEMA_VERSION,
    code,
    retryable: ERROR_RETRYABLE[code],
  };
}

/** Internal contract failure whose message is never intended for HTTP output. */
export class ControlCenterContractError extends Error {
  readonly code: ControlCenterErrorCode;

  constructor(code: ControlCenterErrorCode) {
    super(code);
    this.name = 'ControlCenterContractError';
    this.code = code;
  }
}

export interface ControlCenterPageInfo {
  readonly limit: number;
  readonly nextCursor: SafeControlCenterCursor | null;
  readonly truncated: boolean;
}

export interface ControlCenterCollection<T> {
  readonly items: readonly T[];
  readonly page: ControlCenterPageInfo;
}

export type ControlCenterHealthState = 'HEALTHY' | 'WARNING' | 'FAILED' | 'UNKNOWN';
export type ControlCenterReadinessState = 'READY' | 'BLOCKED' | 'UNKNOWN' | 'NOT_APPLICABLE';
export type ControlCenterProofState = 'PROVEN' | 'PARTIAL' | 'AMBIGUOUS' | 'MISSING' | 'STALE' | 'UNSUPPORTED';
export type ControlCenterExecutionState = 'PENDING' | 'RUNNING' | 'PASSED' | 'WARNING' | 'FAILED' | 'BLOCKED' | 'SKIPPED' | 'INCOMPLETE';

export function readinessStateForCategory(category: string): ControlCenterReadinessState {
  if (category === 'READY_LOCAL_SYNTHETIC') return 'READY';
  if (category === 'NOT_APPLICABLE') return 'NOT_APPLICABLE';
  if (category.startsWith('BLOCKED_')) return 'BLOCKED';
  return 'UNKNOWN';
}
