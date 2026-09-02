// ---------------------------------------------------------------------------
// Nightwatch C-10.5 (A3/A6/A7) — production vocabulary AUTHORITY.
//
// C-10 built the consumption side of the route/key provenance boundary and
// left the minting side unowned. `createProvenRouteVocabulary` and
// `createProvenKeyVocabulary` accepted a caller-chosen provenance class, any
// digest matching `ev:sha256:<24 hex>`, and arbitrary members — so a caller
// could mint `SOURCE_PROVEN_OPENAPI_OPERATION` over a synthetic sentinel
// route without presenting an OpenAPI operation. Reproduced in the campaign
// audit; no non-test producer of either vocabulary existed anywhere.
//
// This module relocates authority. Three properties do the work:
//
//   1. IDENTITY IS AN OUTPUT, NOT AN INPUT. There is no digest parameter. A
//      caller cannot express the forgery, which is stronger than detecting
//      it. Validating a *supplied* digest against a recomputation would only
//      prove internal consistency: a caller supplying both members and digest
//      supplies a self-consistent pair.
//
//   2. THE BRAND IS OBJECT IDENTITY, NOT SHAPE. `MINTED` is a module-private
//      WeakSet. Consumers require membership, so an object that merely
//      matches the capability's shape — in particular one revived from
//      serialized JSON — is refused. A TypeScript brand cannot do this: it is
//      erased at runtime. A WeakSet is pure (no fs, net or process), so it is
//      legal inside this cone, and it holds no strong reference.
//
//   3. EVIDENCE INVARIANTS FAIL CLOSED. An incomplete inventory, a stale or
//      unknown generated-artifact currency where currency is required, a
//      malformed source checkpoint, an unapproved repository, a missing
//      operation identity or an evidence-class mismatch all DENY rather than
//      granting a weaker authority.
//
// Derivation lives OUTSIDE this cone in `src/core/prodProvenance/**`, which
// owns the filesystem work and hands in a plain immutable evidence record.
// This module therefore keeps the Workstream E import profile: `node:crypto`
// is the only node builtin, which `bin/hardening-check.mjs` already permits
// for the structural digest.
//
// This module is part of the PURE cone: no fs, no net, no process.
// ---------------------------------------------------------------------------

import crypto from 'node:crypto';
import { failProduction } from './errors';

export const PROVENANCE_AUTHORITY_VERSION = 'nightwatch.production-vocabulary-authority.v1' as const;

/**
 * Which cone a capability may act in. A fixture-built capability is branded
 * `TEST_ONLY` and is refused by the production authority assertion, so a test
 * seam cannot become production authority (A5/A6).
 */
export const VOCABULARY_AUTHORITY_MARKERS = ['PRODUCTION', 'TEST_ONLY'] as const;
export type VocabularyAuthorityMarker = (typeof VOCABULARY_AUTHORITY_MARKERS)[number];

/** Which kind of vocabulary an evidence record establishes. */
export const VOCABULARY_KINDS = ['ROUTE', 'KEY'] as const;
export type VocabularyKind = (typeof VOCABULARY_KINDS)[number];

/**
 * Inventory completeness of the source population the vocabulary was derived
 * from. Only `COMPLETE` grants authority: a partial enumeration cannot
 * establish that a route or key set is finite and closed.
 */
export const SOURCE_INVENTORY_STATES = ['COMPLETE', 'INCOMPLETE', 'TRUNCATED', 'UNKNOWN'] as const;
export type SourceInventoryState = (typeof SOURCE_INVENTORY_STATES)[number];

/**
 * Currency of a GENERATED source artifact, mirroring
 * `src/core/source/generatedArtifact.ts`. `NOT_APPLICABLE` is for direct
 * source, where there is no generation step to be stale relative to.
 */
export const SOURCE_CURRENCY_STATES = ['CURRENT', 'STALE', 'UNKNOWN', 'NOT_APPLICABLE'] as const;
export type SourceCurrencyState = (typeof SOURCE_CURRENCY_STATES)[number];

/** Direct source needs no currency proof; a generated artifact does. */
export const SOURCE_EVIDENCE_QUALIFIERS = ['DIRECT_SOURCE', 'GENERATED_ARTIFACT'] as const;
export type SourceEvidenceQualifier = (typeof SOURCE_EVIDENCE_QUALIFIERS)[number];

/**
 * The owner-approved source universe, as DATA. This deliberately duplicates
 * `PHASE25_APPROVED_REPOSITORY_IDS` rather than importing it: that module
 * pulls in the change-intelligence map and the scan config, which would give
 * this cone a transitive path toward source loading and break A8. The
 * duplication is not left to vigilance — a test asserts this set equals the
 * approved universe exactly, so drift fails the suite.
 */
export const AUTHORITATIVE_SOURCE_REPOSITORIES: readonly string[] = Object.freeze([
  'alphauslabs/blue-sdk-go',
  'alphauslabs/blueapi',
  'alphauslabs/grpc-chunk-parser',
  'mobingilabs/ouchan',
  'mobingilabs/ripple-api',
  'mobingilabs/ripple-ui',
]);

const APPROVED_REPOSITORY_SET: ReadonlySet<string> = new Set(AUTHORITATIVE_SOURCE_REPOSITORIES);

const SOURCE_SHA_RE = /^[0-9a-f]{40}$/;
const SOURCE_ROOT_RE = /^[A-Za-z0-9._/-]{1,200}$/;
const MEMBER_MAX_LENGTH = 400;
const MAX_MEMBERS = 4096;

/**
 * A validated source-evidence record: the pure-data input the trusted adapter
 * produces and this module turns into authority. It is NOT itself a
 * capability — holding one grants nothing until the mint accepts it.
 */
export interface ValidatedSourceEvidence {
  readonly vocabularyKind: VocabularyKind;
  /** The `SOURCE_PROVEN_*` class being claimed, validated against the kind. */
  readonly evidenceClass: string;
  readonly qualifier: SourceEvidenceQualifier;
  readonly repository: string;
  /** Source path or root within the repository that was read. */
  readonly sourceRoot: string;
  /** 40-hex source snapshot identity. */
  readonly sourceSha: string;
  readonly inventoryState: SourceInventoryState;
  readonly currencyState: SourceCurrencyState;
  /** The canonical vocabulary members established by that evidence. */
  readonly members: readonly string[];
}

/** Evidence classes valid for each vocabulary kind. */
const CLASSES_BY_KIND: Readonly<Record<VocabularyKind, ReadonlySet<string>>> = Object.freeze({
  ROUTE: new Set([
    'SOURCE_PROVEN_OPENAPI_OPERATION',
    'SOURCE_PROVEN_PHP_ROUTE',
    'SOURCE_PROVEN_FIXED_CONTRACT',
  ]),
  KEY: new Set([
    'SOURCE_PROVEN_OPENAPI_DEFINITION',
    'SOURCE_PROVEN_PHP_ROW_KEYS',
    'SOURCE_PROVEN_FIXED_CONTRACT',
  ]),
});

/**
 * The runtime brand. Module-private and never exported in any form: no
 * accessor, no `has` re-export, no debug hook. A capability is trusted iff it
 * is an object this module minted, which no serialization can reproduce.
 */
const MINTED = new WeakSet<object>();

/** Authority marker per minted capability, kept outside the object itself. */
const MARKERS = new WeakMap<object, VocabularyAuthorityMarker>();

/**
 * Length-prefixed canonical encoding. Every component is written as
 * `<byteLength>:<value>` so no combination of member literals can imitate a
 * field boundary — without the prefix, a member containing the separator
 * could shift the parse and let two different evidence records encode
 * identically.
 */
function encodeComponent(value: string): string {
  return `${Buffer.byteLength(value, 'utf8')}:${value}`;
}

/**
 * Canonical binding of provenance identity to the load-bearing authority
 * inputs (A7). Members are SORTED, so set-based semantics canonicalize
 * identically under permutation; the member count is encoded separately so a
 * different population cannot collide with a reordering.
 */
export function encodeSourceEvidenceBinding(evidence: ValidatedSourceEvidence): string {
  const sorted = [...evidence.members].slice().sort();
  return [
    PROVENANCE_AUTHORITY_VERSION,
    evidence.vocabularyKind,
    evidence.evidenceClass,
    evidence.qualifier,
    evidence.repository,
    evidence.sourceRoot,
    evidence.sourceSha,
    evidence.inventoryState,
    evidence.currencyState,
    String(sorted.length),
    ...sorted,
  ]
    .map(encodeComponent)
    .join('|');
}

/**
 * Compute the provenance identity. In the repository's existing
 * `ev:sha256:<24 hex>` evidence-digest shape, so downstream identity fields
 * and receipts are unchanged — but now the value is DERIVED rather than
 * accepted.
 */
export function computeProvenanceDigest(evidence: ValidatedSourceEvidence): string {
  const digest = crypto.createHash('sha256').update(encodeSourceEvidenceBinding(evidence), 'utf8').digest('hex');
  return `ev:sha256:${digest.slice(0, 24)}`;
}

/**
 * Validate the evidence record. Every failure DENIES; none degrades to a
 * weaker authority.
 */
function assertValidEvidence(evidence: ValidatedSourceEvidence): void {
  if (evidence === null || typeof evidence !== 'object') {
    failProduction('PRODUCTION_PRIVACY_VOCABULARY_INVALID', 'NON_PLAIN_OBJECT');
  }
  if (!(VOCABULARY_KINDS as readonly string[]).includes(evidence.vocabularyKind)) {
    failProduction('PRODUCTION_PRIVACY_VOCABULARY_INVALID', 'PROVENANCE_AMBIGUOUS');
  }
  const permitted = CLASSES_BY_KIND[evidence.vocabularyKind];
  if (typeof evidence.evidenceClass !== 'string' || !permitted.has(evidence.evidenceClass)) {
    // A key evidence class cannot mint a route vocabulary, and vice versa.
    failProduction('PRODUCTION_PRIVACY_VOCABULARY_INVALID', 'EVIDENCE_CLASS_MISMATCH');
  }
  if (!(SOURCE_EVIDENCE_QUALIFIERS as readonly string[]).includes(evidence.qualifier)) {
    failProduction('PRODUCTION_PRIVACY_VOCABULARY_INVALID', 'PROVENANCE_AMBIGUOUS');
  }
  if (typeof evidence.repository !== 'string' || !APPROVED_REPOSITORY_SET.has(evidence.repository)) {
    failProduction('PRODUCTION_PRIVACY_VOCABULARY_INVALID', 'EVIDENCE_REPOSITORY_UNAPPROVED');
  }
  if (typeof evidence.sourceRoot !== 'string' || !SOURCE_ROOT_RE.test(evidence.sourceRoot)) {
    failProduction('PRODUCTION_PRIVACY_VOCABULARY_INVALID', 'EVIDENCE_SOURCE_IDENTITY');
  }
  if (typeof evidence.sourceSha !== 'string' || !SOURCE_SHA_RE.test(evidence.sourceSha)) {
    failProduction('PRODUCTION_PRIVACY_VOCABULARY_INVALID', 'EVIDENCE_SOURCE_IDENTITY');
  }
  if (!(SOURCE_INVENTORY_STATES as readonly string[]).includes(evidence.inventoryState)) {
    failProduction('PRODUCTION_PRIVACY_VOCABULARY_INVALID', 'EVIDENCE_INVENTORY_INCOMPLETE');
  }
  // Only a COMPLETE inventory can establish a finite closed vocabulary.
  if (evidence.inventoryState !== 'COMPLETE') {
    failProduction('PRODUCTION_PRIVACY_VOCABULARY_INVALID', 'EVIDENCE_INVENTORY_INCOMPLETE');
  }
  if (!(SOURCE_CURRENCY_STATES as readonly string[]).includes(evidence.currencyState)) {
    failProduction('PRODUCTION_PRIVACY_VOCABULARY_INVALID', 'EVIDENCE_CURRENCY_UNPROVEN');
  }
  // A generated artifact must be provably CURRENT; direct source has no
  // generation step, so `NOT_APPLICABLE` is the only coherent value there.
  if (evidence.qualifier === 'GENERATED_ARTIFACT' && evidence.currencyState !== 'CURRENT') {
    failProduction('PRODUCTION_PRIVACY_VOCABULARY_INVALID', 'EVIDENCE_CURRENCY_UNPROVEN');
  }
  if (evidence.qualifier === 'DIRECT_SOURCE' && evidence.currencyState !== 'NOT_APPLICABLE') {
    failProduction('PRODUCTION_PRIVACY_VOCABULARY_INVALID', 'EVIDENCE_CURRENCY_UNPROVEN');
  }
  if (!Array.isArray(evidence.members) || evidence.members.length === 0) {
    failProduction('PRODUCTION_PRIVACY_VOCABULARY_INVALID', 'VOCABULARY_EMPTY');
  }
  if (evidence.members.length > MAX_MEMBERS) {
    failProduction('PRODUCTION_PRIVACY_VOCABULARY_INVALID', 'VOCABULARY_SIZE');
  }
  for (const member of evidence.members) {
    if (typeof member !== 'string' || member.length === 0 || member.length > MEMBER_MAX_LENGTH) {
      failProduction('PRODUCTION_PRIVACY_VOCABULARY_INVALID', 'EVIDENCE_MEMBER_INVALID');
    }
  }
}

/**
 * The minted provenance identity a vocabulary carries. Contains no member
 * literal, so it is safe in a receipt.
 */
export interface MintedProvenance {
  readonly authorityVersion: typeof PROVENANCE_AUTHORITY_VERSION;
  readonly evidenceClass: string;
  readonly provenanceDigest: string;
  readonly repository: string;
  readonly sourceSha: string;
  readonly qualifier: SourceEvidenceQualifier;
  readonly inventoryState: SourceInventoryState;
  readonly currencyState: SourceCurrencyState;
  readonly memberCount: number;
}

/**
 * Turn validated evidence into a minted provenance identity, and register the
 * carrier object under the runtime brand.
 *
 * `carrier` is the vocabulary object that will hold this provenance; it is
 * registered here so a consumer can require that the object it was handed is
 * one this module produced.
 */
export function mintProvenance(
  evidence: ValidatedSourceEvidence,
  carrier: object,
  marker: VocabularyAuthorityMarker,
): MintedProvenance {
  assertValidEvidence(evidence);
  if (!(VOCABULARY_AUTHORITY_MARKERS as readonly string[]).includes(marker)) {
    failProduction('PRODUCTION_PRIVACY_VOCABULARY_INVALID', 'PROVENANCE_AMBIGUOUS');
  }
  if (carrier === null || typeof carrier !== 'object') {
    failProduction('PRODUCTION_PRIVACY_VOCABULARY_INVALID', 'NON_PLAIN_OBJECT');
  }
  MINTED.add(carrier);
  MARKERS.set(carrier, marker);
  return Object.freeze({
    authorityVersion: PROVENANCE_AUTHORITY_VERSION,
    evidenceClass: evidence.evidenceClass,
    provenanceDigest: computeProvenanceDigest(evidence),
    repository: evidence.repository,
    sourceSha: evidence.sourceSha,
    qualifier: evidence.qualifier,
    inventoryState: evidence.inventoryState,
    currencyState: evidence.currencyState,
    memberCount: evidence.members.length,
  });
}

/** Was this exact object minted by this module? Shape is never sufficient. */
export function isMintedCapability(candidate: unknown): boolean {
  return typeof candidate === 'object' && candidate !== null && MINTED.has(candidate as object);
}

/** The authority marker of a minted capability, or `null` if it was not minted. */
export function capabilityAuthorityMarker(candidate: unknown): VocabularyAuthorityMarker | null {
  if (!isMintedCapability(candidate)) return null;
  return MARKERS.get(candidate as object) ?? null;
}

/**
 * The guard a production authority path must pass. Refuses an unminted object
 * (including a JSON revival that matches the shape perfectly) and refuses a
 * capability built through the TEST-ONLY seam.
 */
export function assertProductionVocabularyAuthority(candidate: unknown): void {
  const marker = capabilityAuthorityMarker(candidate);
  if (marker === null) {
    failProduction('PRODUCTION_PRIVACY_VOCABULARY_INVALID', 'CAPABILITY_NOT_MINTED');
  }
  if (marker !== 'PRODUCTION') {
    failProduction('PRODUCTION_PRIVACY_VOCABULARY_INVALID', 'CAPABILITY_TEST_ONLY');
  }
}
