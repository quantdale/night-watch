// ---------------------------------------------------------------------------
// Nightwatch C-10.5 (A5) — trusted derivation of production key vocabularies.
//
// Outside the C-10 privacy cone by design (A8). A key literal is DATA: in
// this domain objects are routinely keyed by AWS account id, MSP id,
// billing-group id or company name. So a key vocabulary must originate in
// genuine finite source evidence, and `SOURCE_PROVEN_FIXED_CONTRACT` in
// particular must not remain self-assertable.
// ---------------------------------------------------------------------------

import {
  deriveProvenKeyVocabulary,
  type ProvenKeyVocabulary,
} from '../prodPrivacy/keyVocabulary';
import type { ValidatedSourceEvidence } from '../prodPrivacy/vocabularyAuthority';
import type { GenerationCurrency } from '../source/generatedArtifact';

export const KEY_DERIVATION_DENIAL_CODES = [
  'NO_DEFINITION_KEYS',
  'DEFINITION_NOT_RESOLVED',
  'INVENTORY_NOT_COMPLETE',
  'GENERATION_NOT_CURRENT',
  'CONTRACT_IDENTITY_MISSING',
  'PHP_ROW_KEYS_UNAVAILABLE',
] as const;
export type KeyDerivationDenialCode = (typeof KEY_DERIVATION_DENIAL_CODES)[number];

export class KeyDerivationDenied extends Error {
  readonly denialCode: KeyDerivationDenialCode;
  constructor(denialCode: KeyDerivationDenialCode) {
    super(`KEY_VOCABULARY_DERIVATION_DENIED:${denialCode}`);
    this.name = 'KeyDerivationDenied';
    this.denialCode = denialCode;
  }
}

function deny(code: KeyDerivationDenialCode): never {
  throw new KeyDerivationDenied(code);
}

/**
 * Derive a key vocabulary from a C-02a OpenAPI `definitions` response
 * contract. The definition must have RESOLVED — an unresolvable or unsafe
 * `$ref` denies, because an unresolved schema cannot bound a key set.
 */
export function deriveOpenApiKeyVocabulary(input: {
  readonly definitionKeys: readonly string[];
  readonly bindingState: 'RESOLVED' | 'REF_MALFORMED' | 'DEFINITION_MISSING' | 'DEFINITION_UNSAFE';
  readonly repository: string;
  readonly sourceRoot: string;
  readonly sourceSha: string;
  readonly inventoryComplete: boolean;
  readonly generationCurrency: GenerationCurrency | null;
}): ProvenKeyVocabulary {
  if (input.bindingState !== 'RESOLVED') deny('DEFINITION_NOT_RESOLVED');
  if (input.definitionKeys.length === 0) deny('NO_DEFINITION_KEYS');
  if (!input.inventoryComplete) deny('INVENTORY_NOT_COMPLETE');
  if (input.generationCurrency === null || input.generationCurrency.state !== 'CURRENT') {
    deny('GENERATION_NOT_CURRENT');
  }
  const evidence: ValidatedSourceEvidence = Object.freeze({
    vocabularyKind: 'KEY' as const,
    evidenceClass: 'SOURCE_PROVEN_OPENAPI_DEFINITION',
    qualifier: 'GENERATED_ARTIFACT' as const,
    repository: input.repository,
    sourceRoot: input.sourceRoot,
    sourceSha: input.sourceSha,
    inventoryState: 'COMPLETE' as const,
    currencyState: 'CURRENT' as const,
    members: Object.freeze([...input.definitionKeys]) as readonly string[],
  });
  return deriveProvenKeyVocabulary(evidence, 'PRODUCTION');
}

/**
 * Derive a key vocabulary from a mechanically derived PHP row-key contract.
 * Fails closed when the resolver produced no keys — an empty row-key contract
 * is an unresolved contract, not an empty one.
 */
export function derivePhpRowKeyVocabulary(input: {
  readonly rowKeys: readonly string[];
  readonly repository: string;
  readonly sourceRoot: string;
  readonly sourceSha: string;
  readonly inventoryComplete: boolean;
}): ProvenKeyVocabulary {
  if (input.rowKeys.length === 0) deny('PHP_ROW_KEYS_UNAVAILABLE');
  if (!input.inventoryComplete) deny('INVENTORY_NOT_COMPLETE');
  const evidence: ValidatedSourceEvidence = Object.freeze({
    vocabularyKind: 'KEY' as const,
    evidenceClass: 'SOURCE_PROVEN_PHP_ROW_KEYS',
    qualifier: 'DIRECT_SOURCE' as const,
    repository: input.repository,
    sourceRoot: input.sourceRoot,
    sourceSha: input.sourceSha,
    inventoryState: 'COMPLETE' as const,
    currencyState: 'NOT_APPLICABLE' as const,
    members: Object.freeze([...input.rowKeys]) as readonly string[],
  });
  return deriveProvenKeyVocabulary(evidence, 'PRODUCTION');
}

/**
 * Derive a key vocabulary for a REPOSITORY-OWNED fixed contract.
 *
 * A5 is explicit that a fixed contract must still obtain authority through a
 * trusted adapter tied to the ACTUAL COMMITTED contract identity — not
 * through a public constructor any code may call. So the caller must present
 * the contract's own committed source identity (repository, path, snapshot
 * SHA), and that identity is bound into the computed provenance digest. A
 * caller cannot obtain `SOURCE_PROVEN_FIXED_CONTRACT` over an arbitrary key
 * list without naming a real committed contract, and naming a different
 * contract yields a different provenance identity.
 */
export function deriveFixedContractKeyVocabulary(input: {
  readonly contractKeys: readonly string[];
  readonly repository: string;
  /** Path of the committed contract file within the repository. */
  readonly contractPath: string;
  /** Snapshot identity of the commit the contract was read at. */
  readonly sourceSha: string;
}): ProvenKeyVocabulary {
  if (input.contractKeys.length === 0) deny('NO_DEFINITION_KEYS');
  if (
    typeof input.contractPath !== 'string' ||
    input.contractPath.length === 0 ||
    typeof input.sourceSha !== 'string' ||
    input.sourceSha.length === 0
  ) {
    deny('CONTRACT_IDENTITY_MISSING');
  }
  const evidence: ValidatedSourceEvidence = Object.freeze({
    vocabularyKind: 'KEY' as const,
    evidenceClass: 'SOURCE_PROVEN_FIXED_CONTRACT',
    qualifier: 'DIRECT_SOURCE' as const,
    repository: input.repository,
    sourceRoot: input.contractPath,
    sourceSha: input.sourceSha,
    inventoryState: 'COMPLETE' as const,
    currencyState: 'NOT_APPLICABLE' as const,
    members: Object.freeze([...input.contractKeys]) as readonly string[],
  });
  return deriveProvenKeyVocabulary(evidence, 'PRODUCTION');
}
