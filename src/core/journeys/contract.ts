// ---------------------------------------------------------------------------
// Nightwatch — frozen journey-contract identity.
//
// A replay compares observations made under one immutable contract. The
// digest is metadata-only: it contains the reviewed definition, never page
// data, request bodies, customer values, or authentication state.
// ---------------------------------------------------------------------------

import { createHash } from 'node:crypto';
import type { JourneyDefinition } from './types';

export const JOURNEY_CONTRACT_VERSION = 'nightwatch.journey.phase2c.v1';
export const ORACLE_VERSION = 'nightwatch.oracle.phase2c.v1';
export const EVIDENCE_SCHEMA_VERSION = 'nightwatch.evidence.phase2c.v1';
/** Synthetic-fixture journey-contract schema tag consumed by Phase 12/13
 *  fingerprint plumbing; a distinct schema identity from JOURNEY_CONTRACT_VERSION.
 *  Phase 15P A15 convergence: single owner of this version string. */
export const SYNTHETIC_JOURNEY_CONTRACT_VERSION = 'nightwatch.journey-contract.v1';

function canonical(value: unknown, seen: WeakSet<object>): string {
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') return Number.isFinite(value) ? JSON.stringify(value) : 'null';
  if (typeof value === 'undefined') return 'null';
  if (typeof value !== 'object') return JSON.stringify(String(value));
  if (seen.has(value)) throw new TypeError('journey contract cannot contain a cycle');
  seen.add(value);
  let result: string;
  if (Array.isArray(value)) {
    result = `[${value.map((item) => canonical(item, seen)).join(',')}]`;
  } else {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item, seen)}`);
    result = `{${entries.join(',')}}`;
  }
  seen.delete(value);
  return result;
}

/** Stable, key-ordered serialization used for contract identity only. */
// Phase 15P A15 convergence: de-exported (module-private, zero external callers).
function canonicalJourneyContract(definition: JourneyDefinition): string {
  return canonical(definition, new WeakSet<object>());
}

export function journeyContractDigest(definition: JourneyDefinition): string {
  return `sha256:${createHash('sha256').update(canonicalJourneyContract(definition), 'utf8').digest('hex')}`;
}

function deepFreeze<T>(value: T, seen: WeakSet<object>): T {
  if (value === null || typeof value !== 'object') return value;
  const objectValue = value as object;
  if (seen.has(objectValue)) return value;
  seen.add(objectValue);
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child, seen);
  return Object.freeze(value);
}

/** Freeze the supplied source-backed definition in place and return it. */
// Phase 15P A15 convergence: de-exported (module-private, zero external callers).
function freezeJourneyDefinition<T extends JourneyDefinition>(definition: T): Readonly<T> {
  return deepFreeze(definition, new WeakSet<object>()) as Readonly<T>;
}

export interface FrozenJourneyContract<T extends JourneyDefinition = JourneyDefinition> {
  readonly definition: Readonly<T>;
  readonly version: string;
  readonly digest: string;
}

export function freezeJourneyContract<T extends JourneyDefinition>(definition: T): FrozenJourneyContract<T> {
  const frozen = freezeJourneyDefinition(definition);
  return {
    definition: frozen,
    version: definition.contractVersion ?? JOURNEY_CONTRACT_VERSION,
    digest: journeyContractDigest(definition),
  };
}

export function assertJourneyContractUnchanged(
  contract: FrozenJourneyContract,
  definition: JourneyDefinition = contract.definition,
): void {
  if (journeyContractDigest(definition) !== contract.digest) {
    throw new Error(`journey contract changed during replay matrix: ${definition.journeyId}`);
  }
}
