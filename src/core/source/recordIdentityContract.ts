// ---------------------------------------------------------------------------
// NW-HIST-004 (Wave 2) — strict, bounded validation of the owner-declared
// record-identity contract registry (`nightwatch.record-identity-contracts.v1`).
//
// The declaration is the only authority: this lane never discovers write paths.
// Every failure is `DECLARATION_INVALID` and stops the lane before any source
// read. All consistency/lifecycle/failure semantics are DECLARED, never
// inferred from names.
//
// Purity: data-only validation (universe lookup + bounded string checks); no fs,
// child process, network, clock, or randomness authority.
// ---------------------------------------------------------------------------

import { approvedRootsFor } from './universe';

export const RECORD_IDENTITY_CONTRACTS_SCHEMA = 'nightwatch.record-identity-contracts.v1' as const;
export const RECORD_IDENTITY_REPORT_SCHEMA = 'nightwatch.record-identity-report.v1' as const;
export const RECORD_IDENTITY_EXTRACTION_IDENTITY = 'nightwatch.record-identity-extraction.v1' as const;

export const RECORD_IDENTITY_CONSISTENCY_MODELS = [
  'SEQUENTIAL',
  'EVENTUAL_READ_THEN_UNCONDITIONAL_WRITE',
  'CONDITIONAL_CREATE',
  'DELETE_CASCADE_EXPECTED',
] as const;
export type RecordIdentityConsistencyModel = (typeof RECORD_IDENTITY_CONSISTENCY_MODELS)[number];

export const RECORD_IDENTITY_LIFECYCLES = [
  'CREATE_ONCE_THEN_IDENTITY_STABLE',
  'CREATE_UPDATE_DELETE_RECREATE',
] as const;
export type RecordIdentityLifecycle = (typeof RECORD_IDENTITY_LIFECYCLES)[number];

export const RECORD_IDENTITY_FAILURE_SEMANTICS = ['NONE', 'BEST_EFFORT_WARNING', 'HARD_FAIL'] as const;
export type RecordIdentityFailureSemantics = (typeof RECORD_IDENTITY_FAILURE_SEMANTICS)[number];

export const RECORD_IDENTITY_VERDICTS = [
  'IDENTITY_CONTRACT_PRESERVED',
  'DUPLICATE_IDENTITY_REPRODUCED',
  'DERIVED_RECORD_ORPHAN_REPRODUCED',
  'EXTRACTION_AMBIGUOUS',
  'SOURCE_STALE',
  'SOURCE_UNAVAILABLE',
  'DECLARATION_INVALID',
  'MODEL_INSUFFICIENT',
] as const;
export type RecordIdentityVerdict = (typeof RECORD_IDENTITY_VERDICTS)[number];

export const RECORD_IDENTITY_REASON_CODES = [
  'DUAL_PHYSICAL_SHAPES',
  'UNCONDITIONAL_WRITE_MODEL',
  'DERIVED_CLEANUP_INCOMPLETE',
  'BEST_EFFORT_CLEANUP_FAILURE',
  'FUNCTION_NOT_FOUND',
  'UNSUPPORTED_CONSTRUCTION',
  'MISSING_DERIVED_MODEL',
] as const;
export type RecordIdentityReasonCode = (typeof RECORD_IDENTITY_REASON_CODES)[number];

export const MAX_RECORD_IDENTITY_CONTRACTS = 8;
export const MAX_RECORD_IDENTITY_PATHS = 8;
export const MAX_RECORD_IDENTITY_FUNCTIONS = 16;
export const MAX_RECORD_IDENTITY_SEGMENTS = 8;
export const MAX_RECORD_IDENTITY_DERIVED = 8;

const CONTRACT_ID_RE = /^[a-z][a-z0-9-]{0,63}$/;
const FUNCTION_RE = /^[A-Za-z_][A-Za-z0-9_]{0,127}$/;
const SHA_RE = /^[0-9a-f]{40}$/;
const RELATIVE_PATH_RE = /^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_.-]+)*$/;
const SEGMENT_RE = /^[a-z][a-z0-9_]{0,63}$/;
const SHAPE_DIGEST_RE = /^rks:sha256:[0-9a-f]{24}$/;

export interface RecordIdentityContract {
  readonly contractId: string;
  readonly repoId: string;
  readonly sha: string;
  readonly roots: readonly string[];
  readonly paths: readonly string[];
  readonly functions: readonly string[];
  readonly logicalIdentitySegments: readonly string[];
  readonly consistencyModel: RecordIdentityConsistencyModel;
  readonly expectedLifecycle: RecordIdentityLifecycle;
  readonly failureSemantics: RecordIdentityFailureSemantics;
  readonly derivedRecordCount: number;
  readonly exclusions: readonly string[];
}

export interface RecordIdentityContractConfig {
  readonly schemaVersion: typeof RECORD_IDENTITY_CONTRACTS_SCHEMA;
  readonly contracts: readonly RecordIdentityContract[];
}

export type RecordIdentityContractValidation =
  | { readonly ok: true; readonly config: RecordIdentityContractConfig }
  | { readonly ok: false; readonly failure: 'DECLARATION_INVALID'; readonly detail: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function isStringArray(value: unknown, max: number): value is readonly string[] {
  return Array.isArray(value)
    && value.length <= max
    && value.every((entry) => typeof entry === 'string')
    && new Set(value).size === value.length;
}

function validateContract(value: unknown): value is RecordIdentityContract {
  if (!isRecord(value) || !hasExactKeys(value, [
    'contractId', 'repoId', 'sha', 'roots', 'paths', 'functions',
    'logicalIdentitySegments', 'consistencyModel', 'expectedLifecycle',
    'failureSemantics', 'derivedRecordCount', 'exclusions',
  ])) return false;
  if (typeof value.contractId !== 'string' || !CONTRACT_ID_RE.test(value.contractId)) return false;
  if (typeof value.repoId !== 'string' || typeof value.sha !== 'string' || !SHA_RE.test(value.sha)) return false;
  const approvedRoots = approvedRootsFor(value.repoId);
  if (approvedRoots === null) return false;
  const roots = value.roots;
  if (!isStringArray(roots, 8) || roots.length === 0) return false;
  if (!roots.every((root) => typeof root === 'string' && approvedRoots.includes(root))) return false;
  if (!isStringArray(value.paths, MAX_RECORD_IDENTITY_PATHS) || value.paths.length === 0) return false;
  if (!value.paths.every((relativePath) => (
    typeof relativePath === 'string'
    && relativePath.length <= 240
    && RELATIVE_PATH_RE.test(relativePath)
    && relativePath.split('/').every((segment) => segment !== '.' && segment !== '..')
    && roots.some((root) => relativePath === root || relativePath.startsWith(`${root}/`))
  ))) return false;
  if (!isStringArray(value.functions, MAX_RECORD_IDENTITY_FUNCTIONS) || value.functions.length === 0) return false;
  if (!value.functions.every((symbol) => typeof symbol === 'string' && FUNCTION_RE.test(symbol))) return false;
  if (!isStringArray(value.logicalIdentitySegments, MAX_RECORD_IDENTITY_SEGMENTS)) return false;
  if (value.logicalIdentitySegments.length < 1) return false;
  if (!value.logicalIdentitySegments.every((segment) => typeof segment === 'string' && SEGMENT_RE.test(segment))) return false;
  if (typeof value.consistencyModel !== 'string' || !RECORD_IDENTITY_CONSISTENCY_MODELS.includes(value.consistencyModel as RecordIdentityConsistencyModel)) return false;
  if (typeof value.expectedLifecycle !== 'string' || !RECORD_IDENTITY_LIFECYCLES.includes(value.expectedLifecycle as RecordIdentityLifecycle)) return false;
  if (typeof value.failureSemantics !== 'string' || !RECORD_IDENTITY_FAILURE_SEMANTICS.includes(value.failureSemantics as RecordIdentityFailureSemantics)) return false;
  if (typeof value.derivedRecordCount !== 'number' || !Number.isInteger(value.derivedRecordCount) || value.derivedRecordCount < 0 || value.derivedRecordCount > MAX_RECORD_IDENTITY_DERIVED) return false;
  if (!isStringArray(value.exclusions, 8)) return false;
  if (!value.exclusions.every((exclusion) => typeof exclusion === 'string' && SHAPE_DIGEST_RE.test(exclusion))) return false;
  return true;
}

function normalize(config: RecordIdentityContractConfig): RecordIdentityContractConfig {
  return {
    schemaVersion: config.schemaVersion,
    contracts: config.contracts
      .map((contract) => ({
        ...contract,
        roots: [...contract.roots].sort(),
        paths: [...contract.paths].sort(),
        functions: [...contract.functions].sort(),
        logicalIdentitySegments: [...contract.logicalIdentitySegments].sort(),
        exclusions: [...contract.exclusions].sort(),
      }))
      .sort((left, right) => (left.contractId < right.contractId ? -1 : left.contractId > right.contractId ? 1 : 0)),
  };
}

/** Strict validation of the declared registry. Any doubt is DECLARATION_INVALID. */
export function validateRecordIdentityContractConfig(input: unknown): RecordIdentityContractValidation {
  if (!isRecord(input) || !hasExactKeys(input, ['schemaVersion', 'contracts'])) {
    return { ok: false, failure: 'DECLARATION_INVALID', detail: 'CONFIG_SHAPE' };
  }
  if (input.schemaVersion !== RECORD_IDENTITY_CONTRACTS_SCHEMA) {
    return { ok: false, failure: 'DECLARATION_INVALID', detail: 'SCHEMA_VERSION' };
  }
  if (!Array.isArray(input.contracts) || input.contracts.length > MAX_RECORD_IDENTITY_CONTRACTS) {
    return { ok: false, failure: 'DECLARATION_INVALID', detail: 'CONTRACT_COUNT' };
  }
  for (const contract of input.contracts) {
    if (!validateContract(contract)) return { ok: false, failure: 'DECLARATION_INVALID', detail: 'CONTRACT_SHAPE' };
  }
  const ids = input.contracts.map((contract) => (contract as RecordIdentityContract).contractId);
  if (new Set(ids).size !== ids.length) return { ok: false, failure: 'DECLARATION_INVALID', detail: 'DUPLICATE_CONTRACT_ID' };
  return { ok: true, config: normalize({ schemaVersion: RECORD_IDENTITY_CONTRACTS_SCHEMA, contracts: input.contracts as RecordIdentityContract[] }) };
}
