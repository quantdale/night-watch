// ---------------------------------------------------------------------------
// NW-HIST-005 (Wave 1, Phase 1a) — strict, bounded validation of the
// owner-declared cache-key contract registry (`nightwatch.cache-key-contracts.v1`).
//
// The declaration is the ONLY pair authority: the lane never discovers pairs.
// Every failure is `DECLARATION_INVALID` and stops the lane before any source
// read. Unknown/unsupported shapes are refused, never coerced.
//
// Purity: data-only validation (universe lookup + bounded string checks); no fs,
// child process, network, clock, or randomness authority.
// ---------------------------------------------------------------------------

import { approvedRootsFor } from './universe';
import { CACHE_KEY_LITERAL_MAX_LENGTH, isSafeKeyLiteral, MAX_CACHE_KEY_FUNCTIONS } from './cacheKeyShapes';

export const CACHE_KEY_CONTRACTS_SCHEMA = 'nightwatch.cache-key-contracts.v1' as const;

export const MAX_CACHE_KEY_CONTRACTS = 8;
export const MAX_CACHE_KEY_PATHS_PER_SIDE = 8;
export const MAX_CACHE_KEY_EXCLUSIONS = 8;
export const MAX_CACHE_KEY_ENV_PAIRS = 8;

const CONTRACT_ID_RE = /^[a-z][a-z0-9-]{0,63}$/;
const FUNCTION_RE = /^[A-Za-z_][A-Za-z0-9_]{0,127}$/;
const SHA_RE = /^[0-9a-f]{40}$/;
const SHAPE_DIGEST_RE = /^cks:sha256:[0-9a-f]{24}$/;
const DELIMITER_RE = /^[:|/._-]{1,4}$/;
const RELATIVE_PATH_RE = /^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_.-]+)*$/;

export interface CacheKeyContractSide {
  readonly repoId: string;
  readonly sha: string;
  readonly roots: readonly string[];
  readonly paths: readonly string[];
  readonly functions: readonly string[];
}

export interface CacheKeyContractEnvMap {
  readonly producerEnvToken: string | null;
  readonly pairs: readonly { readonly producer: string; readonly consumer: string }[];
}

export interface CacheKeyContractDeclaration {
  readonly contractId: string;
  readonly namespace: string;
  readonly delimiter: string;
  readonly envMap: CacheKeyContractEnvMap;
  readonly producer: CacheKeyContractSide;
  readonly consumer: CacheKeyContractSide;
  readonly exclusions: readonly string[];
}

export interface CacheKeyContractConfig {
  readonly schemaVersion: typeof CACHE_KEY_CONTRACTS_SCHEMA;
  readonly contracts: readonly CacheKeyContractDeclaration[];
}

export type CacheKeyContractValidation =
  | { readonly ok: true; readonly config: CacheKeyContractConfig }
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

function validateSide(value: unknown, side: 'producer' | 'consumer'): value is CacheKeyContractSide {
  if (!isRecord(value) || !hasExactKeys(value, ['repoId', 'sha', 'roots', 'paths', 'functions'])) return false;
  if (typeof value.repoId !== 'string' || typeof value.sha !== 'string' || !SHA_RE.test(value.sha)) return false;
  const approvedRoots = approvedRootsFor(value.repoId);
  if (approvedRoots === null) return false;
  const roots = value.roots;
  const paths = value.paths;
  const functions = value.functions;
  if (!isStringArray(roots, 8) || roots.length === 0) return false;
  if (!roots.every((root) => approvedRoots.includes(root))) return false;
  if (!isStringArray(paths, MAX_CACHE_KEY_PATHS_PER_SIDE) || paths.length === 0) return false;
  if (!paths.every((relativePath) => (
    relativePath.length <= 240
    && RELATIVE_PATH_RE.test(relativePath)
    && relativePath.split('/').every((segment) => segment !== '.' && segment !== '..')
    && roots.some((root) => relativePath === root || relativePath.startsWith(`${root}/`))
  ))) return false;
  if (!isStringArray(functions, MAX_CACHE_KEY_FUNCTIONS) || functions.length === 0) return false;
  if (!functions.every((symbol) => FUNCTION_RE.test(symbol))) return false;
  void side;
  return true;
}

function validateEnvMap(value: unknown): value is CacheKeyContractEnvMap {
  if (!isRecord(value) || !hasExactKeys(value, ['producerEnvToken', 'pairs'])) return false;
  if (value.producerEnvToken !== null && !(typeof value.producerEnvToken === 'string' && FUNCTION_RE.test(value.producerEnvToken))) return false;
  if (!Array.isArray(value.pairs) || value.pairs.length === 0 || value.pairs.length > MAX_CACHE_KEY_ENV_PAIRS) return false;
  return value.pairs.every((pair) => (
    isRecord(pair)
    && hasExactKeys(pair, ['producer', 'consumer'])
    && typeof pair.producer === 'string'
    && typeof pair.consumer === 'string'
    && isSafeKeyLiteral(pair.producer)
    && isSafeKeyLiteral(pair.consumer)
  ));
}

function validateContract(value: unknown): value is CacheKeyContractDeclaration {
  if (!isRecord(value) || !hasExactKeys(value, ['contractId', 'namespace', 'delimiter', 'envMap', 'producer', 'consumer', 'exclusions'])) return false;
  if (typeof value.contractId !== 'string' || !CONTRACT_ID_RE.test(value.contractId)) return false;
  if (typeof value.namespace !== 'string' || !isSafeKeyLiteral(value.namespace) || value.namespace.length > CACHE_KEY_LITERAL_MAX_LENGTH) return false;
  if (typeof value.delimiter !== 'string' || !DELIMITER_RE.test(value.delimiter)) return false;
  if (!validateEnvMap(value.envMap)) return false;
  if (!validateSide(value.producer, 'producer') || !validateSide(value.consumer, 'consumer')) return false;
  if (!isStringArray(value.exclusions, MAX_CACHE_KEY_EXCLUSIONS)) return false;
  if (!value.exclusions.every((exclusion) => typeof exclusion === 'string' && SHAPE_DIGEST_RE.test(exclusion))) return false;
  return true;
}

function normalize(config: CacheKeyContractConfig): CacheKeyContractConfig {
  return {
    schemaVersion: config.schemaVersion,
    contracts: config.contracts
      .map((contract) => ({
        ...contract,
        producer: { ...contract.producer, roots: [...contract.producer.roots].sort(), paths: [...contract.producer.paths].sort(), functions: [...contract.producer.functions].sort() },
        consumer: { ...contract.consumer, roots: [...contract.consumer.roots].sort(), paths: [...contract.consumer.paths].sort(), functions: [...contract.consumer.functions].sort() },
        exclusions: [...contract.exclusions].sort(),
      }))
      .sort((left, right) => (left.contractId < right.contractId ? -1 : left.contractId > right.contractId ? 1 : 0)),
  };
}

/** Strict validation of the declared registry. Any doubt is DECLARATION_INVALID. */
export function validateCacheKeyContractConfig(input: unknown): CacheKeyContractValidation {
  if (!isRecord(input) || !hasExactKeys(input, ['schemaVersion', 'contracts'])) {
    return { ok: false, failure: 'DECLARATION_INVALID', detail: 'CONFIG_SHAPE' };
  }
  if (input.schemaVersion !== CACHE_KEY_CONTRACTS_SCHEMA) {
    return { ok: false, failure: 'DECLARATION_INVALID', detail: 'SCHEMA_VERSION' };
  }
  if (!Array.isArray(input.contracts) || input.contracts.length > MAX_CACHE_KEY_CONTRACTS) {
    return { ok: false, failure: 'DECLARATION_INVALID', detail: 'CONTRACT_COUNT' };
  }
  for (const contract of input.contracts) {
    if (!validateContract(contract)) return { ok: false, failure: 'DECLARATION_INVALID', detail: 'CONTRACT_SHAPE' };
  }
  const ids = input.contracts.map((contract) => (contract as CacheKeyContractDeclaration).contractId);
  if (new Set(ids).size !== ids.length) return { ok: false, failure: 'DECLARATION_INVALID', detail: 'DUPLICATE_CONTRACT_ID' };
  return { ok: true, config: normalize({ schemaVersion: CACHE_KEY_CONTRACTS_SCHEMA, contracts: input.contracts as CacheKeyContractDeclaration[] }) };
}
