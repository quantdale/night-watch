// ---------------------------------------------------------------------------
// Nightwatch — authenticated capability lifecycle (F-21).
//
// A human-led capture writes a Playwright storage-state artefact; this module
// gives that artefact a lifecycle instead of an implicit forever:
//
//   - a bounded, NON-SECRET sidecar record beside the artefact (capture
//     instant, environment, origin, earliest observed cookie expiry, declared
//     validity window, artefact digest) written through the redaction layer
//     and never containing a cookie value, token, header or storage value;
//   - a fail-closed pre-flight that resolves VALID / EXPIRED /
//     WRONG_ENVIRONMENT / UNKNOWN_AGE / MISSING / UNREADABLE and refuses every
//     non-VALID state before a browser context, subprocess, socket or file is
//     created;
//   - a one-time adoption path for an artefact captured before records existed.
//
// Expiry evaluation deliberately reuses the ONE cookie applicability
// evaluator in `src/browser/fixtures/storageState.ts`; this module never
// re-implements domain/path/expiry arithmetic.
// ---------------------------------------------------------------------------

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  inspectStorageStateCookieApplicability,
  inspectStorageStateCookieExpiries,
  validateStorageStateFile,
} from '../browser/fixtures/storageState';
import { RedactionLayer } from '../core/safety/redaction';

export const AUTH_CAPABILITY_RECORD_SCHEMA = 'nightwatch.auth-capability-record.v1' as const;
export const AUTH_CAPABILITY_PREFLIGHT_SCHEMA = 'nightwatch.auth-capability-preflight.v1' as const;
export const AUTH_CAPABILITY_REPORT_SCHEMA = 'nightwatch.auth-capability-report.v1' as const;
export const AUTH_CAPABILITY_LIFETIME_SCHEMA = 'nightwatch.auth-capture-lifetime-measurement.v1' as const;

/** Sidecar name: `<artefact>.auth-lifecycle.json`. */
export const AUTH_CAPABILITY_RECORD_SUFFIX = '.auth-lifecycle.json' as const;

/**
 * Declared validity window applied when an operator does not state one. This
 * is a TRUST BOUND, not a claim about the underlying session: the artefact is
 * never treated as valid beyond it even when every cookie outlives it.
 */
export const DEFAULT_AUTH_VALIDITY_WINDOW_MS = 12 * 60 * 60 * 1000;
export const MIN_AUTH_VALIDITY_WINDOW_MS = 60 * 60 * 1000;
export const MAX_AUTH_VALIDITY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export type AuthCapabilityEnvironment = 'dev' | 'next' | 'local';

export type AuthCapabilityState =
  | 'VALID'
  | 'EXPIRED'
  | 'WRONG_ENVIRONMENT'
  | 'UNKNOWN_AGE'
  | 'MISSING'
  | 'UNREADABLE';

export type AuthCapabilityEpistemicClass = 'FACT' | 'UNKNOWN';

export const AUTH_CAPABILITY_REFUSAL_CODES = Object.freeze({
  MISSING: 'AUTH_CAPABILITY_MISSING',
  UNREADABLE: 'AUTH_CAPABILITY_UNREADABLE',
  UNKNOWN_AGE: 'AUTH_CAPABILITY_UNKNOWN_AGE',
  EXPIRED: 'AUTH_CAPABILITY_EXPIRED',
  WRONG_ENVIRONMENT: 'AUTH_CAPABILITY_WRONG_ENVIRONMENT',
});

export const AUTH_CAPABILITY_BUDGET_WARNING_CODE = 'AUTH_CAPABILITY_VALIDITY_SHORTER_THAN_CAMPAIGN_BUDGET';

/** The single named remedy every refusal carries. */
export function authCapabilityRemedy(environment: string, artefactPath: string): string {
  return `re-capture for this environment: npm run auth:capture -- --env=${environment} --output=${artefactPath}`;
}

/**
 * Lanes that cannot run without a currently-valid artefact for the named
 * environment. Kept as data so the refusal and the report agree.
 */
export const AUTHENTICATED_LANE_DEPENDENCIES: Readonly<Record<string, readonly string[]>> = Object.freeze({
  dev: Object.freeze([
    'journey:phase2b',
    'journey:phase2c',
    'explore:phase4',
    'api:phase5',
    'campaign:real',
    'phase9b:real',
    'phase10b:real',
    'observe:authenticated',
    'C12_PASSIVE_OBSERVATION',
    'MANUAL_OWNER_12_CHECKS',
    'LIVE_APP_SMOKE_6_CHECKS',
  ]),
  next: Object.freeze(['auth:capture']),
  local: Object.freeze([]),
});

export interface AuthCapabilityRecord {
  readonly schemaVersion: typeof AUTH_CAPABILITY_RECORD_SCHEMA;
  /** ISO instant the capture completed. */
  readonly captureInstant: string;
  readonly environment: AuthCapabilityEnvironment;
  /** Scheme + host + optional port, no path/query/fragment. */
  readonly origin: string;
  /** Earliest absolute cookie expiry observed at capture; null when all session. */
  readonly earliestCookieExpiry: number | null;
  /** Declared trust window in milliseconds. */
  readonly validityWindowMs: number;
  /** `sha256:<24>` over the artefact bytes at capture time. */
  readonly artefactDigest: string;
}

export interface AuthCapabilityPreflightResult {
  readonly schemaVersion: typeof AUTH_CAPABILITY_PREFLIGHT_SCHEMA;
  readonly state: AuthCapabilityState;
  readonly epistemicClass: AuthCapabilityEpistemicClass;
  readonly artefactPath: string;
  readonly environment: string;
  readonly present: boolean;
  readonly refusalCode: string | null;
  readonly refusalDetail: string | null;
  readonly remedy: string;
  readonly captureInstant: string | null;
  readonly recordEnvironment: string | null;
  readonly recordOrigin: string | null;
  readonly declaredValidUntil: string | null;
  readonly earliestApplicableExpiry: number | null;
  readonly remainingValidityMs: number | null;
  readonly checkedAt: string;
  readonly budgetWarning: {
    readonly code: typeof AUTH_CAPABILITY_BUDGET_WARNING_CODE;
    readonly remainingValidityMs: number;
    readonly requiredValidityMs: number;
  } | null;
}

export interface AuthCapabilityPreflightInput {
  readonly artefactPath: string;
  readonly environment: AuthCapabilityEnvironment;
  readonly targetOrigin?: string | null;
  readonly now?: Date;
  /** A campaign's declared runtime budget; a shorter remaining validity warns. */
  readonly requiredValidityMs?: number | null;
}

export class AuthCapabilityRefusalError extends Error {
  readonly code: string;
  readonly state: AuthCapabilityState;
  readonly remedy: string;
  readonly detail: string | null;

  constructor(result: AuthCapabilityPreflightResult) {
    const detail = result.refusalDetail === null ? '' : ` (${result.refusalDetail})`;
    super(`${result.refusalCode ?? 'AUTH_CAPABILITY_REFUSED'}${detail}: ${result.remedy}`);
    this.name = 'AuthCapabilityRefusalError';
    this.code = result.refusalCode ?? 'AUTH_CAPABILITY_REFUSED';
    this.state = result.state;
    this.remedy = result.remedy;
    this.detail = result.refusalDetail;
  }
}

function environmentIsSupported(value: string): value is AuthCapabilityEnvironment {
  return value === 'dev' || value === 'next' || value === 'local';
}

function assertSupportedEnvironment(value: string): AuthCapabilityEnvironment {
  if (!environmentIsSupported(value)) throw new Error(`AUTH_CAPABILITY_ENVIRONMENT_INVALID:${value}`);
  return value;
}

function normaliseOrigin(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('AUTH_CAPABILITY_ORIGIN_INVALID');
  }
  if ((url.protocol !== 'https:' && url.protocol !== 'http:') || url.username !== '' || url.password !== '') {
    throw new Error('AUTH_CAPABILITY_ORIGIN_INVALID');
  }
  return url.origin;
}

function assertValidityWindow(validityWindowMs: number): void {
  if (
    !Number.isInteger(validityWindowMs) ||
    validityWindowMs < MIN_AUTH_VALIDITY_WINDOW_MS ||
    validityWindowMs > MAX_AUTH_VALIDITY_WINDOW_MS
  ) {
    throw new Error(`AUTH_CAPABILITY_VALIDITY_WINDOW_INVALID:${validityWindowMs}`);
  }
}

function parseIsoInstant(value: string, code: string): number {
  const millis = Date.parse(value);
  if (!Number.isFinite(millis)) throw new Error(`${code}:${value}`);
  return millis;
}

export function authLifecycleRecordPath(artefactPath: string): string {
  return `${path.resolve(artefactPath)}${AUTH_CAPABILITY_RECORD_SUFFIX}`;
}

function artefactDigest(artefactPath: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(artefactPath));
  return `sha256:${hash.digest('hex').slice(0, 24)}`;
}

const RECORD_KEYS: readonly (keyof AuthCapabilityRecord)[] = Object.freeze([
  'schemaVersion',
  'captureInstant',
  'environment',
  'origin',
  'earliestCookieExpiry',
  'validityWindowMs',
  'artefactDigest',
]);

/** Strict, fail-closed record reader. Unknown keys or types are unreadable. */
export function parseAuthCapabilityRecord(raw: unknown): AuthCapabilityRecord {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('AUTH_CAPABILITY_RECORD_SHAPE');
  const record = raw as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  if (keys.length !== RECORD_KEYS.length || keys.some((key, index) => key !== [...RECORD_KEYS].sort()[index])) {
    throw new Error('AUTH_CAPABILITY_RECORD_SHAPE');
  }
  if (record.schemaVersion !== AUTH_CAPABILITY_RECORD_SCHEMA) throw new Error('AUTH_CAPABILITY_RECORD_SCHEMA_UNSUPPORTED');
  if (typeof record.captureInstant !== 'string' || !Number.isFinite(Date.parse(record.captureInstant))) {
    throw new Error('AUTH_CAPABILITY_RECORD_CAPTURE_INSTANT');
  }
  if (typeof record.environment !== 'string' || !environmentIsSupported(record.environment)) {
    throw new Error('AUTH_CAPABILITY_RECORD_ENVIRONMENT');
  }
  if (typeof record.origin !== 'string') throw new Error('AUTH_CAPABILITY_RECORD_ORIGIN');
  // Throws on a malformed origin; the normalised value must round-trip.
  if (normaliseOrigin(record.origin) !== record.origin) throw new Error('AUTH_CAPABILITY_RECORD_ORIGIN');
  if (record.earliestCookieExpiry !== null && (typeof record.earliestCookieExpiry !== 'number' || !Number.isFinite(record.earliestCookieExpiry))) {
    throw new Error('AUTH_CAPABILITY_RECORD_EARLIEST_EXPIRY');
  }
  if (typeof record.validityWindowMs !== 'number') throw new Error('AUTH_CAPABILITY_RECORD_VALIDITY_WINDOW');
  assertValidityWindow(record.validityWindowMs);
  if (typeof record.artefactDigest !== 'string' || !/^sha256:[0-9a-f]{24}$/.test(record.artefactDigest)) {
    throw new Error('AUTH_CAPABILITY_RECORD_DIGEST');
  }
  return Object.freeze({
    schemaVersion: AUTH_CAPABILITY_RECORD_SCHEMA,
    captureInstant: record.captureInstant,
    environment: record.environment,
    origin: record.origin,
    earliestCookieExpiry: record.earliestCookieExpiry,
    validityWindowMs: record.validityWindowMs,
    artefactDigest: record.artefactDigest,
  });
}

/**
 * Serialize and verify a record against the existing redaction layer. A record
 * whose bytes the redactor would change is refused: the sidecar must contain
 * nothing the safety model considers secret.
 */
function serializeRedactedRecord(record: AuthCapabilityRecord): string {
  const serialized = `${JSON.stringify(record, null, 2)}\n`;
  const redacted = new RedactionLayer().redactText(serialized);
  if (redacted !== serialized) throw new Error('AUTH_LIFECYCLE_RECORD_REDACTION_REFUSED');
  return serialized;
}

function writeFileAtomically(file: string, content: string): void {
  const directory = path.dirname(file);
  const temporary = path.join(directory, `.${path.basename(file)}.tmp-${process.pid}-${crypto.randomBytes(6).toString('hex')}`);
  const descriptor = fs.openSync(temporary, 'wx', 0o600);
  try {
    fs.writeFileSync(descriptor, content);
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
  try {
    fs.chmodSync(temporary, 0o600);
    fs.renameSync(temporary, file);
  } catch (error) {
    try {
      fs.unlinkSync(temporary);
    } catch {
      // The temporary is best-effort cleanup; the failure below is the report.
    }
    throw error;
  }
  const directoryDescriptor = fs.openSync(directory, 'r');
  try {
    fs.fsyncSync(directoryDescriptor);
  } finally {
    fs.closeSync(directoryDescriptor);
  }
}

export interface BuildAuthCapabilityRecordInput {
  readonly artefactPath: string;
  readonly environment: AuthCapabilityEnvironment;
  readonly origin: string;
  readonly validityWindowMs?: number;
  readonly captureInstant?: string;
  readonly now?: Date;
}

/** Build the record from the artefact's own on-disk state. Never a secret. */
export function buildAuthCapabilityRecord(input: BuildAuthCapabilityRecordInput): AuthCapabilityRecord {
  const artefactPath = validateStorageStateFile(input.artefactPath);
  const environment = assertSupportedEnvironment(input.environment);
  const origin = normaliseOrigin(input.origin);
  const validityWindowMs = input.validityWindowMs ?? DEFAULT_AUTH_VALIDITY_WINDOW_MS;
  assertValidityWindow(validityWindowMs);
  const now = input.now ?? new Date();
  const captureInstant = input.captureInstant ?? now.toISOString();
  const captureMillis = parseIsoInstant(captureInstant, 'AUTH_CAPABILITY_CAPTURE_INSTANT_INVALID');
  if (captureMillis > now.getTime() + 5 * 60 * 1000) throw new Error('AUTH_CAPABILITY_CAPTURE_INSTANT_IN_FUTURE');
  const expiries = inspectStorageStateCookieExpiries(artefactPath);
  return Object.freeze({
    schemaVersion: AUTH_CAPABILITY_RECORD_SCHEMA,
    captureInstant,
    environment,
    origin,
    earliestCookieExpiry: expiries.earliestExpiryEpochSeconds,
    validityWindowMs,
    artefactDigest: artefactDigest(artefactPath),
  });
}

export interface WriteAuthCaptureRecordResult {
  readonly record: AuthCapabilityRecord;
  readonly recordPath: string;
}

/** Build and atomically write the sidecar beside a freshly captured artefact. */
export function writeAuthCaptureRecord(input: BuildAuthCapabilityRecordInput): WriteAuthCaptureRecordResult {
  const record = buildAuthCapabilityRecord(input);
  const recordPath = authLifecycleRecordPath(input.artefactPath);
  writeFileAtomically(recordPath, serializeRedactedRecord(record));
  return { record, recordPath };
}

export interface AdoptAuthCaptureRecordInput extends BuildAuthCapabilityRecordInput {
  /** Adoption is one-time; an explicit flag is required to replace a record. */
  readonly replaceExisting?: boolean;
}

export interface AdoptAuthCaptureRecordResult extends WriteAuthCaptureRecordResult {
  readonly replacedExisting: boolean;
}

/**
 * One-time adoption: an existing artefact gains a record from the operator's
 * declared capture instant and validity window, without a re-capture. The
 * artefact's own bytes are the digest source; the declared instant is taken
 * as stated (never inferred from file mtime).
 */
export function adoptAuthCaptureRecord(input: AdoptAuthCaptureRecordInput): AdoptAuthCaptureRecordResult {
  if (input.captureInstant === undefined) throw new Error('AUTH_CAPABILITY_ADOPTION_CAPTURE_INSTANT_REQUIRED');
  const recordPath = authLifecycleRecordPath(input.artefactPath);
  let replacedExisting = false;
  if (fs.existsSync(recordPath)) {
    if (!input.replaceExisting) throw new Error('AUTH_LIFECYCLE_RECORD_ALREADY_PRESENT');
    replacedExisting = true;
  }
  const written = writeAuthCaptureRecord(input);
  return { ...written, replacedExisting };
}

function refusal(
  input: AuthCapabilityPreflightInput,
  state: Exclude<AuthCapabilityState, 'VALID'>,
  detail: string | null,
  checkedAt: string,
  extras: Partial<AuthCapabilityPreflightResult> = {},
): AuthCapabilityPreflightResult {
  const epistemicClass: AuthCapabilityEpistemicClass =
    state === 'UNKNOWN_AGE' || state === 'UNREADABLE' ? 'UNKNOWN' : 'FACT';
  return Object.freeze({
    schemaVersion: AUTH_CAPABILITY_PREFLIGHT_SCHEMA,
    state,
    epistemicClass,
    artefactPath: input.artefactPath,
    environment: input.environment,
    present: state !== 'MISSING',
    refusalCode:
      state === 'MISSING'
        ? AUTH_CAPABILITY_REFUSAL_CODES.MISSING
        : state === 'UNREADABLE'
          ? AUTH_CAPABILITY_REFUSAL_CODES.UNREADABLE
          : state === 'UNKNOWN_AGE'
            ? AUTH_CAPABILITY_REFUSAL_CODES.UNKNOWN_AGE
            : state === 'EXPIRED'
              ? AUTH_CAPABILITY_REFUSAL_CODES.EXPIRED
              : AUTH_CAPABILITY_REFUSAL_CODES.WRONG_ENVIRONMENT,
    refusalDetail: detail,
    remedy: authCapabilityRemedy(input.environment, input.artefactPath),
    captureInstant: null,
    recordEnvironment: null,
    recordOrigin: null,
    declaredValidUntil: null,
    earliestApplicableExpiry: null,
    remainingValidityMs: null,
    checkedAt,
    budgetWarning: null,
    ...extras,
  });
}

/**
 * Resolve an artefact to exactly one lifecycle state. Pure metadata I/O: it
 * stats and reads the artefact/record and cookie expiry fields, opens no
 * browser, contacts no host, and never reads a cookie value.
 */
export function evaluateAuthCapabilityPreflight(input: AuthCapabilityPreflightInput): AuthCapabilityPreflightResult {
  const environment = assertSupportedEnvironment(input.environment);
  const now = input.now ?? new Date();
  const nowMs = now.getTime();
  const checkedAt = now.toISOString();
  const artefactPath = path.resolve(input.artefactPath);

  if (!fs.existsSync(artefactPath)) {
    return refusal(input, 'MISSING', 'artefact file is absent', checkedAt);
  }

  const recordPath = authLifecycleRecordPath(artefactPath);
  let record: AuthCapabilityRecord;
  if (!fs.existsSync(recordPath)) {
    return refusal(input, 'UNKNOWN_AGE', 'no lifecycle record accompanies the artefact', checkedAt);
  }
  try {
    record = parseAuthCapabilityRecord(JSON.parse(fs.readFileSync(recordPath, 'utf8')));
  } catch {
    return refusal(input, 'UNREADABLE', 'the lifecycle record is malformed or unreadable', checkedAt);
  }

  let artefact;
  try {
    validateStorageStateFile(artefactPath);
    artefact = inspectStorageStateCookieApplicability(artefactPath, {
      appOrigin: record.origin,
      appPath: '/',
    }, Math.floor(nowMs / 1000));
  } catch {
    return refusal(input, 'UNREADABLE', 'the artefact is unreadable or not a storage state', checkedAt);
  }

  if (artefactDigest(artefactPath) !== record.artefactDigest) {
    return refusal(input, 'UNKNOWN_AGE', 'the artefact has changed since its lifecycle record was written', checkedAt, {
      recordEnvironment: record.environment,
      recordOrigin: record.origin,
      captureInstant: record.captureInstant,
    });
  }

  const targetOrigin = input.targetOrigin === undefined || input.targetOrigin === null ? null : normaliseOrigin(input.targetOrigin);
  if (record.environment !== environment || (targetOrigin !== null && record.origin !== targetOrigin)) {
    return refusal(
      input,
      'WRONG_ENVIRONMENT',
      targetOrigin === null
        ? `captured for ${record.environment}, required for ${environment}`
        : `captured for ${record.environment} at ${record.origin}, required for ${environment} at ${targetOrigin}`,
      checkedAt,
      {
        recordEnvironment: record.environment,
        recordOrigin: record.origin,
        captureInstant: record.captureInstant,
      },
    );
  }

  const captureMillis = Date.parse(record.captureInstant);
  const windowEndMs = captureMillis + record.validityWindowMs;
  const declaredValidUntil = new Date(windowEndMs).toISOString();
  const cookieExpiryMs = artefact.earliestApplicableExpiryEpochSeconds === null
    ? (record.earliestCookieExpiry === null ? null : record.earliestCookieExpiry * 1000)
    : artefact.earliestApplicableExpiryEpochSeconds * 1000;
  const trustEndMs = cookieExpiryMs === null ? windowEndMs : Math.min(windowEndMs, cookieExpiryMs);
  const remainingValidityMs = trustEndMs - nowMs;

  if (windowEndMs <= nowMs || artefact.applicableExpired || (cookieExpiryMs !== null && cookieExpiryMs <= nowMs)) {
    return refusal(input, 'EXPIRED', 'the declared validity window or an applicable cookie has elapsed', checkedAt, {
      recordEnvironment: record.environment,
      recordOrigin: record.origin,
      captureInstant: record.captureInstant,
      declaredValidUntil,
      earliestApplicableExpiry: artefact.earliestApplicableExpiryEpochSeconds,
      remainingValidityMs: Math.max(0, remainingValidityMs),
    });
  }

  const requiredValidityMs = input.requiredValidityMs ?? null;
  const budgetWarning =
    requiredValidityMs !== null && remainingValidityMs < requiredValidityMs
      ? {
          code: AUTH_CAPABILITY_BUDGET_WARNING_CODE as typeof AUTH_CAPABILITY_BUDGET_WARNING_CODE,
          remainingValidityMs,
          requiredValidityMs,
        }
      : null;

  return Object.freeze({
    schemaVersion: AUTH_CAPABILITY_PREFLIGHT_SCHEMA,
    state: 'VALID',
    epistemicClass: 'FACT',
    artefactPath,
    environment,
    present: true,
    refusalCode: null,
    refusalDetail: null,
    remedy: authCapabilityRemedy(environment, artefactPath),
    captureInstant: record.captureInstant,
    recordEnvironment: record.environment,
    recordOrigin: record.origin,
    declaredValidUntil,
    earliestApplicableExpiry: artefact.earliestApplicableExpiryEpochSeconds,
    remainingValidityMs,
    checkedAt,
    budgetWarning,
  });
}

/** Throw the distinct refusal for any non-VALID state; return the result when VALID. */
export function assertAuthCapabilityPreflight(input: AuthCapabilityPreflightInput): AuthCapabilityPreflightResult {
  const result = evaluateAuthCapabilityPreflight(input);
  if (result.state !== 'VALID') throw new AuthCapabilityRefusalError(result);
  return result;
}

/**
 * Launcher-facing gate: the configured environment origin is the required
 * origin, so a dev artefact supplied to a next lane refuses by name. Every
 * authenticated bin calls this before it spawns any child.
 */
export interface LaneAuthCapabilityInput {
  readonly artefactPath: string;
  readonly environment: string;
  readonly configuredUiBaseUrl: string;
  readonly requiredValidityMs?: number | null;
}

export function requireValidAuthCapability(input: LaneAuthCapabilityInput): AuthCapabilityPreflightResult {
  const environment = assertSupportedEnvironment(input.environment);
  const result = evaluateAuthCapabilityPreflight({
    artefactPath: input.artefactPath,
    environment,
    targetOrigin: new URL(input.configuredUiBaseUrl).origin,
    requiredValidityMs: input.requiredValidityMs ?? null,
  });
  if (result.state !== 'VALID') throw new AuthCapabilityRefusalError(result);
  return result;
}

// --- report surface (status:local / observe:preflight / c12:preflight) ------

export interface AuthCapabilityReportEntry {
  readonly environment: string;
  readonly artefactPath: string;
  readonly source: 'NIGHTWATCH_STORAGE_STATE' | 'DEFAULT_PATH';
  readonly present: boolean;
  readonly state: AuthCapabilityState;
  readonly epistemicClass: AuthCapabilityEpistemicClass;
  readonly captureInstant: string | null;
  readonly remainingValidityMs: number | null;
  readonly refusalCode: string | null;
  readonly remedy: string;
  readonly blockedLanes: readonly string[];
}

export interface AuthCaptureLifetimeObservation {
  readonly captureInstant: string;
  readonly earliestCookieExpiry: number;
  readonly observedLifetimeMs: number;
}

export interface AuthCaptureLifetimeMeasurement {
  readonly schemaVersion: typeof AUTH_CAPABILITY_LIFETIME_SCHEMA;
  readonly measuredAt: string;
  readonly observations: readonly AuthCaptureLifetimeObservation[];
  readonly count: number;
  readonly minMs: number | null;
  readonly medianMs: number | null;
  readonly maxMs: number | null;
}

/**
 * Observed capture lifetimes: `earliestCookieExpiry - captureInstant`, from
 * real records only. No assumption about how long a capture "should" last
 * enters this measurement.
 */
export function measureAuthCaptureLifetimes(
  records: readonly { readonly captureInstant: string; readonly earliestCookieExpiry: number | null }[],
  measuredAt: Date = new Date(),
): AuthCaptureLifetimeMeasurement {
  const observations: AuthCaptureLifetimeObservation[] = [];
  for (const record of records) {
    if (record.earliestCookieExpiry === null) continue;
    const captureMillis = Date.parse(record.captureInstant);
    if (!Number.isFinite(captureMillis)) continue;
    const observedLifetimeMs = record.earliestCookieExpiry * 1000 - captureMillis;
    if (observedLifetimeMs <= 0) continue;
    observations.push({ captureInstant: record.captureInstant, earliestCookieExpiry: record.earliestCookieExpiry, observedLifetimeMs });
  }
  observations.sort((left, right) => left.observedLifetimeMs - right.observedLifetimeMs);
  const values = observations.map((entry) => entry.observedLifetimeMs);
  const medianMs =
    values.length === 0
      ? null
      : values.length % 2 === 1
        ? (values[(values.length - 1) / 2] as number)
        : Math.round(((values[values.length / 2 - 1] as number) + (values[values.length / 2] as number)) / 2);
  return Object.freeze({
    schemaVersion: AUTH_CAPABILITY_LIFETIME_SCHEMA,
    measuredAt: measuredAt.toISOString(),
    observations: Object.freeze(observations),
    count: observations.length,
    minMs: values.length === 0 ? null : (values[0] as number),
    medianMs,
    maxMs: values.length === 0 ? null : (values[values.length - 1] as number),
  });
}

export interface AuthCapabilityReportInput {
  readonly homeDirectory: string;
  readonly environmentVariable?: string | null;
  readonly selectedEnvironment?: string | null;
  readonly configuredOrigin?: string | null;
  readonly now?: Date;
}

function defaultArtefactPath(homeDirectory: string, environment: string): string {
  return path.join(homeDirectory, '.nightwatch', 'auth', `ripple-${environment}-state.json`);
}

/** Read every known artefact's lifecycle metadata; opens no browser, no host. */
export function collectAuthCapabilityReport(input: AuthCapabilityReportInput): {
  readonly schemaVersion: typeof AUTH_CAPABILITY_REPORT_SCHEMA;
  readonly checkedAt: string;
  readonly network: 'none';
  readonly browser: 'none';
  readonly entries: readonly AuthCapabilityReportEntry[];
  readonly observedCaptureLifetimes: AuthCaptureLifetimeMeasurement;
} {
  const now = input.now ?? new Date();
  const configuredVariable = (input.environmentVariable ?? '').trim();
  const selectedEnvironment = (input.selectedEnvironment ?? '').trim().toLowerCase();
  const entries: AuthCapabilityReportEntry[] = [];
  const candidateEnvironments = ['dev', 'next'] as const;

  for (const environment of candidateEnvironments) {
    const artefactPath =
      configuredVariable !== '' && selectedEnvironment === environment
        ? path.resolve(configuredVariable)
        : defaultArtefactPath(input.homeDirectory, environment);
    const source: AuthCapabilityReportEntry['source'] =
      configuredVariable !== '' && selectedEnvironment === environment ? 'NIGHTWATCH_STORAGE_STATE' : 'DEFAULT_PATH';
    const result = evaluateAuthCapabilityPreflight({
      artefactPath,
      environment,
      // The configured origin belongs to the selected environment only; for
      // any other environment the origin is unknown and is not compared.
      targetOrigin:
        input.configuredOrigin !== undefined && input.configuredOrigin !== null && selectedEnvironment === environment
          ? input.configuredOrigin
          : null,
      now,
    });
    entries.push({
      environment,
      artefactPath,
      source,
      present: result.present,
      state: result.state,
      epistemicClass: result.epistemicClass,
      captureInstant: result.captureInstant,
      remainingValidityMs: result.remainingValidityMs,
      refusalCode: result.refusalCode,
      remedy: result.remedy,
      blockedLanes: result.state === 'VALID' ? [] : AUTHENTICATED_LANE_DEPENDENCIES[environment] ?? [],
    });
  }

  if (configuredVariable !== '' && selectedEnvironment !== '' && selectedEnvironment !== 'dev' && selectedEnvironment !== 'next') {
    const artefactPath = path.resolve(configuredVariable);
    const result = evaluateAuthCapabilityPreflight({
      artefactPath,
      environment: 'local',
      targetOrigin: null,
      now,
    });
    entries.push({
      environment: selectedEnvironment,
      artefactPath,
      source: 'NIGHTWATCH_STORAGE_STATE',
      present: result.present,
      state: result.state,
      epistemicClass: result.epistemicClass,
      captureInstant: result.captureInstant,
      remainingValidityMs: result.remainingValidityMs,
      refusalCode: result.refusalCode,
      remedy: result.remedy,
      blockedLanes: [],
    });
  }

  const records: AuthCapabilityRecord[] = [];
  for (const entry of entries) {
    const recordPath = authLifecycleRecordPath(entry.artefactPath);
    try {
      records.push(parseAuthCapabilityRecord(JSON.parse(fs.readFileSync(recordPath, 'utf8'))));
    } catch {
      // No readable record is exactly the UNKNOWN_AGE state already reported.
    }
  }

  return Object.freeze({
    schemaVersion: AUTH_CAPABILITY_REPORT_SCHEMA,
    checkedAt: now.toISOString(),
    network: 'none' as const,
    browser: 'none' as const,
    entries: Object.freeze(entries),
    observedCaptureLifetimes: measureAuthCaptureLifetimes(records, now),
  });
}
