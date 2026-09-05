// ---------------------------------------------------------------------------
// Permanent synthetic reviewer corpus.
//
// Deterministic and seeded — never Math.random — so a classification count is
// reproducible and a failure can be re-run exactly. Shared between the
// identity-propagation measurement and the scale lanes so both measure the
// SAME population: two generators would let an improvement in one be measured
// against a corpus that never appeared in the other.
//
// The corpus is deliberately built from named families rather than uniform
// noise, because the question is not "do more findings get classified" but
// "are the new classifications mechanically justified". Families B, C and D
// exist to make over-collapse visible: they SHOULD share an identity and
// SHOULD NOT become duplicates.
// ---------------------------------------------------------------------------

import type { FindingsDossierMetadata } from '../../src/controlCenter/authorities/findingsAuthority';

/** Deterministic mixer; never Math.random, so a failure is reproducible. */
export function mix(seed: number): number {
  let value = seed >>> 0;
  value = Math.imul(value ^ (value >>> 16), 2246822507) >>> 0;
  value = Math.imul(value ^ (value >>> 13), 3266489909) >>> 0;
  return (value ^ (value >>> 16)) >>> 0;
}

/** The families the corpus is built from, in generation order. */
export const CORPUS_FAMILIES = [
  /** Same expectation AND same fingerprint: genuinely the same finding. */
  'SAME_EXPECTATION_SAME_FINGERPRINT',
  /** Same expectation, DIFFERENT fingerprint and failure: related, not duplicate. */
  'SAME_EXPECTATION_DIFFERENT_FAILURE',
  /** Same semantic contract, unrelated operation and route. */
  'SAME_CONTRACT_UNRELATED_OPERATION',
  /** Same fingerprint, DIFFERENT expectation: the identity is counterevidence. */
  'SAME_FINGERPRINT_DIFFERENT_EXPECTATION',
  /** Same route, different contract. */
  'SAME_ROUTE_DIFFERENT_CONTRACT',
  /** No identity at all — the v1-dossier case. UNKNOWN must stay UNKNOWN. */
  'NO_IDENTITY',
] as const;

export type CorpusFamily = (typeof CORPUS_FAMILIES)[number];

export interface CorpusFinding extends FindingsDossierMetadata {
  readonly family: CorpusFamily;
}

function fingerprint(slot: number): string {
  return `fp:sha256:${slot.toString(16).padStart(6, '0').repeat(4)}`;
}

/**
 * Build a deterministic corpus of `size` findings.
 *
 * `newestFirstIds` reverses identifier order against chronological order so
 * the first page is the NEWEST findings — the ones with the most history
 * behind them, and the page a reviewer actually opens.
 */
export function reviewerCorpus(size: number, options: { readonly newestFirstIds?: boolean } = {}): readonly CorpusFinding[] {
  const newestFirstIds = options.newestFirstIds !== false;
  return Array.from({ length: size }, (_, index) => {
    const family = CORPUS_FAMILIES[index % CORPUS_FAMILIES.length] as CorpusFamily;
    const group = Math.floor(index / CORPUS_FAMILIES.length);
    const noise = mix(index * 2654435761);
    // Consecutive groups share a key, so consecutive members of one family
    // genuinely share the identity that family is named for. Keying on the
    // group alone would give every member a different id and the families
    // would silently test nothing.
    const shared = Math.floor(group / 4);

    let expectationId: string | null = null;
    let semanticContractId: string | null = null;
    let oracleFingerprint = fingerprint(index % 4096);
    let routeClass = `route/${index % 16}`;

    switch (family) {
      case 'SAME_EXPECTATION_SAME_FINGERPRINT':
        expectationId = `exp.family-a.${shared}`;
        semanticContractId = `inv:family-a.${shared}`;
        oracleFingerprint = fingerprint(shared);
        break;
      case 'SAME_EXPECTATION_DIFFERENT_FAILURE':
        // One expectation, many distinct failures. Sharing the expectation is
        // real evidence; calling these the same finding would be wrong.
        expectationId = `exp.family-b.${shared}`;
        semanticContractId = `inv:family-b.${shared}`;
        oracleFingerprint = fingerprint(2048 + index);
        break;
      case 'SAME_CONTRACT_UNRELATED_OPERATION':
        expectationId = `exp.family-c.${index}`;
        semanticContractId = `inv:family-c.${shared}`;
        oracleFingerprint = fingerprint(3000 + index);
        routeClass = `route/unrelated-${index % 32}`;
        break;
      case 'SAME_FINGERPRINT_DIFFERENT_EXPECTATION':
        // A shared fingerprint that the identity contradicts.
        expectationId = `exp.family-d.${index}`;
        semanticContractId = `inv:family-d.${index}`;
        oracleFingerprint = fingerprint(100 + shared);
        break;
      case 'SAME_ROUTE_DIFFERENT_CONTRACT':
        expectationId = `exp.family-e.${index}`;
        semanticContractId = `inv:family-e.${index}`;
        routeClass = 'route/shared-surface';
        oracleFingerprint = fingerprint(3500 + index);
        break;
      case 'NO_IDENTITY':
      default:
        // Some of these also carry an unusable fingerprint, so the corpus
        // keeps a genuine UNKNOWN population rather than only easy cases.
        oracleFingerprint = noise % 4 === 0 ? 'not-a-fingerprint' : fingerprint(3800 + index);
        break;
    }

    return {
      schemaVersion: 'nightwatch.bug-dossier.private.v2',
      status: 'READY',
      candidateId: `corpus-finding-${String(newestFirstIds ? size - 1 - index : index).padStart(6, '0')}`,
      title: null,
      firstObserved: new Date(Date.UTC(2026, 0, 1) + index * 60_000).toISOString(),
      lastObserved: new Date(Date.UTC(2026, 0, 1) + index * 60_000).toISOString(),
      routeClass,
      oracleFingerprint,
      evidenceLevel: 'L2',
      reproduction: { result: 'REPRODUCED', count: 1, minimalityGuarantee: 'BOUNDED_MINIMAL' },
      technicalSeverity: 'HIGH',
      triagePriority: 'P2',
      confidence: { level: 'HIGH' },
      sourceCurrentness: 'CURRENT',
      semanticFinding: family !== 'NO_IDENTITY',
      expectationId,
      semanticContractId,
      // Stands in for the digest of the whole dossier file. It varies with
      // the row, so a corpus finding behaves like a real one for binding and
      // staleness purposes.
      contentDigest: `cc-dossier-content:sha256:${(noise >>> 0).toString(16).padStart(6, '0').repeat(4)}`,
      family,
    } as unknown as CorpusFinding;
  });
}

/**
 * The same corpus with both identities removed — the pre-propagation state.
 * Everything else is byte-identical, so a difference in classification is
 * attributable to the identities and to nothing else.
 */
export function withoutIdentities(corpus: readonly CorpusFinding[]): readonly CorpusFinding[] {
  return corpus.map((finding) => ({ ...finding, expectationId: null, semanticContractId: null }));
}
