// ---------------------------------------------------------------------------
// NW-PROJ-003 (Wave 2, STATIC PRECURSOR ONLY) — silent zero-output structure.
//
// One question, answered statically and bounded: under the owner-declared input
// contract, does a declared handler's skip path `return` BEFORE the declared
// output-producing operations while consulting only a SUBSET of the declared
// required input roles?
//
// This is NOT a runtime claim. The report always carries
// `runtimeFailureClaim: NONE`; a precursor means the source structure matches a
// historically dangerous shape, never that a handler fails today. No product
// code executes; no data store is touched.
//
// Consultation is checked over the tokens preceding the skip return: any
// occurrence of a declared role's guard tokens counts (a deliberate
// over-approximation, so a complete guard is never accused).
// ---------------------------------------------------------------------------

import { prefixedDigest24 } from '../identity/canonicalDigest';
import type { RealSourceCurrentness, RealSourceReader } from '../../oracles/expectations/recipes/types';
import { findFunctionBody, tokenizePhp, type PhpToken } from '../../oracles/expectations/extract/php';
import { approvedRootsFor } from './universe';

export const SILENT_ZERO_OUTPUT_CONTRACTS_SCHEMA = 'nightwatch.silent-zero-output-contracts.v1' as const;
export const SILENT_ZERO_OUTPUT_REPORT_SCHEMA = 'nightwatch.silent-zero-output-report.v1' as const;

export const MAX_SILENT_ZERO_HANDLERS = 8;
export const MAX_SILENT_ZERO_ROLES = 8;
export const MAX_SILENT_ZERO_TOKENS = 16;
export const MAX_SILENT_ZERO_SOURCE_CHARS = 400_000;

export const SILENT_ZERO_OUTPUT_VERDICTS = [
  'STATIC_ZERO_OUTPUT_PRECURSOR',
  'NO_PRECURSOR',
  'OUTPUT_ROLE_NOT_IDENTIFIED',
  'EXTRACTION_AMBIGUOUS',
  'SOURCE_STALE',
  'SOURCE_UNAVAILABLE',
  'DECLARATION_INVALID',
] as const;
export type SilentZeroOutputVerdict = (typeof SILENT_ZERO_OUTPUT_VERDICTS)[number];

export const SILENT_ZERO_OUTPUT_REASON_CODES = [
  'GUARD_MISSING_REQUIRED_ROLE',
  'GUARD_CONSULTS_ALL_REQUIRED_ROLES',
  'NO_DATA_CONDITIONAL_GUARD',
  'OUTPUT_TOKEN_NOT_FOUND',
  'SKIP_RETURN_NOT_FOUND',
  'FUNCTION_NOT_FOUND',
  'PARSE_LIMIT',
] as const;
export type SilentZeroOutputReasonCode = (typeof SILENT_ZERO_OUTPUT_REASON_CODES)[number];

const ID_RE = /^[a-z][a-z0-9-]{0,63}$/;
const ROLE_ID_RE = /^[a-z][a-z0-9_]{0,63}$/;
const TOKEN_RE = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/;
const FUNCTION_RE = /^[A-Za-z_][A-Za-z0-9_]{0,127}$/;
const SHA_RE = /^[0-9a-f]{40}$/;
const RELATIVE_PATH_RE = /^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_.-]+)*$/;

export interface SilentZeroInputRole {
  readonly role: string;
  readonly guardTokens: readonly string[];
}

export interface SilentZeroHandler {
  readonly handlerId: string;
  readonly repoId: string;
  readonly sha: string;
  readonly roots: readonly string[];
  readonly paths: readonly string[];
  readonly functions: readonly string[];
  readonly requiredInputRoles: readonly SilentZeroInputRole[];
  readonly outputTokens: readonly string[];
  readonly legitimateSkipConditions: readonly string[];
}

export interface SilentZeroContractsConfig {
  readonly schemaVersion: typeof SILENT_ZERO_OUTPUT_CONTRACTS_SCHEMA;
  readonly handlers: readonly SilentZeroHandler[];
}

export type SilentZeroValidation =
  | { readonly ok: true; readonly config: SilentZeroContractsConfig }
  | { readonly ok: false; readonly failure: 'DECLARATION_INVALID'; readonly detail: string };

export interface SilentZeroHandlerReport {
  readonly handlerId: string;
  readonly repoId: string;
  readonly declaredSha: string;
  readonly snapshotSha: string | null;
  readonly path: string;
  readonly function: string;
  readonly verdict: SilentZeroOutputVerdict;
  readonly reasonCodes: readonly SilentZeroOutputReasonCode[];
  readonly missingRoles: readonly string[];
  readonly declaredLegitimateSkipConditions: readonly string[];
}

export interface SilentZeroReport {
  readonly schemaVersion: typeof SILENT_ZERO_OUTPUT_REPORT_SCHEMA;
  readonly runtimeFailureClaim: 'NONE';
  readonly handlers: readonly SilentZeroHandlerReport[];
  readonly reportDigest: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function isStringArray(value: unknown, max: number, pattern?: RegExp): value is readonly string[] {
  return Array.isArray(value)
    && value.length <= max
    && value.every((entry) => typeof entry === 'string' && (pattern === undefined || pattern.test(entry)))
    && new Set(value).size === value.length;
}

function validateRole(value: unknown): value is SilentZeroInputRole {
  if (!isRecord(value) || !hasExactKeys(value, ['role', 'guardTokens'])) return false;
  if (typeof value.role !== 'string' || !ROLE_ID_RE.test(value.role)) return false;
  return isStringArray(value.guardTokens, MAX_SILENT_ZERO_TOKENS, TOKEN_RE) && value.guardTokens.length > 0;
}

function validateHandler(value: unknown): value is SilentZeroHandler {
  if (!isRecord(value) || !hasExactKeys(value, [
    'handlerId', 'repoId', 'sha', 'roots', 'paths', 'functions',
    'requiredInputRoles', 'outputTokens', 'legitimateSkipConditions',
  ])) return false;
  if (typeof value.handlerId !== 'string' || !ID_RE.test(value.handlerId)) return false;
  if (typeof value.repoId !== 'string' || typeof value.sha !== 'string' || !SHA_RE.test(value.sha)) return false;
  const approvedRoots = approvedRootsFor(value.repoId);
  if (approvedRoots === null) return false;
  const roots = value.roots;
  if (!isStringArray(roots, 8) || roots.length === 0) return false;
  if (!roots.every((root) => typeof root === 'string' && approvedRoots.includes(root))) return false;
  if (!isStringArray(value.paths, 8) || value.paths.length === 0) return false;
  if (!value.paths.every((relativePath) => (
    typeof relativePath === 'string'
    && relativePath.length <= 240
    && RELATIVE_PATH_RE.test(relativePath)
    && relativePath.split('/').every((segment) => segment !== '.' && segment !== '..')
    && roots.some((root) => relativePath === root || relativePath.startsWith(`${root}/`))
  ))) return false;
  if (!isStringArray(value.functions, 8, FUNCTION_RE) || value.functions.length === 0) return false;
  if (!Array.isArray(value.requiredInputRoles) || value.requiredInputRoles.length === 0 || value.requiredInputRoles.length > MAX_SILENT_ZERO_ROLES) return false;
  if (!value.requiredInputRoles.every(validateRole)) return false;
  if (!isStringArray(value.outputTokens, MAX_SILENT_ZERO_TOKENS, TOKEN_RE) || value.outputTokens.length === 0) return false;
  if (!isStringArray(value.legitimateSkipConditions, 8, ROLE_ID_RE)) return false;
  return true;
}

/** Strict validation of the declared silent-zero-output contracts. */
export function validateSilentZeroContracts(input: unknown): SilentZeroValidation {
  if (!isRecord(input) || !hasExactKeys(input, ['schemaVersion', 'handlers'])) {
    return { ok: false, failure: 'DECLARATION_INVALID', detail: 'CONFIG_SHAPE' };
  }
  if (input.schemaVersion !== SILENT_ZERO_OUTPUT_CONTRACTS_SCHEMA) return { ok: false, failure: 'DECLARATION_INVALID', detail: 'SCHEMA_VERSION' };
  if (!Array.isArray(input.handlers) || input.handlers.length === 0 || input.handlers.length > MAX_SILENT_ZERO_HANDLERS) {
    return { ok: false, failure: 'DECLARATION_INVALID', detail: 'HANDLER_COUNT' };
  }
  if (!input.handlers.every(validateHandler)) return { ok: false, failure: 'DECLARATION_INVALID', detail: 'HANDLER_SHAPE' };
  const handlers = [...(input.handlers as SilentZeroHandler[])]
    .map((handler) => ({
      ...handler,
      roots: [...handler.roots].sort(),
      paths: [...handler.paths].sort(),
      functions: [...handler.functions].sort(),
      requiredInputRoles: [...handler.requiredInputRoles].sort((left, right) => (left.role < right.role ? -1 : left.role > right.role ? 1 : 0)),
      outputTokens: [...handler.outputTokens].sort(),
      legitimateSkipConditions: [...handler.legitimateSkipConditions].sort(),
    }))
    .sort((left, right) => (left.handlerId < right.handlerId ? -1 : left.handlerId > right.handlerId ? 1 : 0));
  return { ok: true, config: { schemaVersion: SILENT_ZERO_OUTPUT_CONTRACTS_SCHEMA, handlers } };
}

function tokenMatches(token: PhpToken, value: string): boolean {
  return (token.t === 'WORD' || token.t === 'STRING') && token.v === value;
}

interface SkipAnalysis {
  readonly verdict: SilentZeroOutputVerdict;
  readonly reasonCodes: readonly SilentZeroOutputReasonCode[];
  readonly missingRoles: readonly string[];
}

/** Bounded static analysis of one declared handler function. */
export function analyzeSilentZeroOutput(
  source: string,
  handler: SilentZeroHandler,
): SkipAnalysis {
  if (source.length > MAX_SILENT_ZERO_SOURCE_CHARS) {
    return { verdict: 'EXTRACTION_AMBIGUOUS', reasonCodes: ['PARSE_LIMIT'], missingRoles: [] };
  }
  const tokens = tokenizePhp(source);
  let body: { start: number; end: number } | null = null;
  for (const symbol of handler.functions) {
    body = findFunctionBody(tokens, symbol);
    if (body !== null) break;
  }
  if (body === null) {
    return { verdict: 'EXTRACTION_AMBIGUOUS', reasonCodes: ['FUNCTION_NOT_FOUND'], missingRoles: [] };
  }
  const inside = tokens.slice(body.start, body.end + 1);
  const outputPositions: number[] = [];
  for (let index = 0; index < inside.length; index += 1) {
    const token = inside[index]!;
    if (handler.outputTokens.some((output) => tokenMatches(token, output))) outputPositions.push(index);
  }
  if (outputPositions.length === 0) {
    return { verdict: 'OUTPUT_ROLE_NOT_IDENTIFIED', reasonCodes: ['OUTPUT_TOKEN_NOT_FOUND'], missingRoles: [] };
  }
  const firstOutput = outputPositions[0]!;
  const skipReturns: number[] = [];
  for (let index = 0; index < inside.length - 1; index += 1) {
    const token = inside[index]!;
    if (token.t !== 'WORD' || token.v !== 'return') continue;
    const next = inside[index + 1]!;
    if (next.t === 'PUNCT' && next.v === ';') skipReturns.push(index);
  }
  const candidates = skipReturns.filter((index) => index < firstOutput);
  if (candidates.length === 0) {
    return { verdict: 'NO_PRECURSOR', reasonCodes: ['SKIP_RETURN_NOT_FOUND'], missingRoles: [] };
  }
  let anyConditional = false;
  for (const candidate of candidates) {
    const consulted = handler.requiredInputRoles.filter((role) => (
      inside.slice(0, candidate).some((token) => role.guardTokens.some((guardToken) => tokenMatches(token, guardToken)))
    ));
    const missing = handler.requiredInputRoles.filter((role) => !consulted.includes(role)).map((role) => role.role);
    if (consulted.length > 0 && missing.length > 0) {
      return { verdict: 'STATIC_ZERO_OUTPUT_PRECURSOR', reasonCodes: ['GUARD_MISSING_REQUIRED_ROLE'], missingRoles: missing };
    }
    if (consulted.length > 0) anyConditional = true;
  }
  return {
    verdict: 'NO_PRECURSOR',
    reasonCodes: anyConditional ? ['GUARD_CONSULTS_ALL_REQUIRED_ROLES'] : ['NO_DATA_CONDITIONAL_GUARD'],
    missingRoles: [],
  };
}

/** Sanitized static-precursor report over the declared handlers. */
export function runSilentZeroOutput(input: {
  readonly config: unknown;
  readonly reader: RealSourceReader;
  readonly currentness: RealSourceCurrentness;
}): SilentZeroReport {
  const validation = validateSilentZeroContracts(input.config);
  const handlers: readonly SilentZeroHandlerReport[] = validation.ok
    ? validation.config.handlers.map((handler) => {
        const base = {
          handlerId: handler.handlerId,
          repoId: handler.repoId,
          declaredSha: handler.sha,
          path: handler.paths[0] ?? '',
          function: handler.functions[0] ?? '',
          declaredLegitimateSkipConditions: handler.legitimateSkipConditions,
        };
        const snapshot = input.currentness.currentSnapshot(handler.repoId);
        if (snapshot === null || !/^[0-9a-f]{40}$/.test(snapshot.sha)) {
          return { ...base, snapshotSha: null, verdict: 'SOURCE_UNAVAILABLE' as const, reasonCodes: [], missingRoles: [] };
        }
        if (snapshot.sha !== handler.sha) {
          return { ...base, snapshotSha: snapshot.sha, verdict: 'SOURCE_STALE' as const, reasonCodes: [], missingRoles: [] };
        }
        const source = input.reader.readFile(handler.repoId, handler.paths[0] ?? '');
        if (source === null) {
          return { ...base, snapshotSha: snapshot.sha, verdict: 'SOURCE_UNAVAILABLE' as const, reasonCodes: [], missingRoles: [] };
        }
        const analysis = analyzeSilentZeroOutput(source, handler);
        return { ...base, snapshotSha: snapshot.sha, ...analysis };
      })
    : [{
        handlerId: '',
        repoId: '',
        declaredSha: '',
        snapshotSha: null,
        path: '',
        function: '',
        verdict: 'DECLARATION_INVALID' as const,
        reasonCodes: [],
        missingRoles: [],
        declaredLegitimateSkipConditions: [],
      }];
  const report = {
    schemaVersion: SILENT_ZERO_OUTPUT_REPORT_SCHEMA,
    runtimeFailureClaim: 'NONE' as const,
    handlers,
  };
  return { ...report, reportDigest: prefixedDigest24('szo', report) };
}
