// ---------------------------------------------------------------------------
// C-06 test support — read-only proofs for descriptor fixtures.
//
// Fixtures build their proof through the real `buildReadOnlyProof`, so a
// fixture can never claim a proof state the lattice would not produce.
// ---------------------------------------------------------------------------

import { buildReadOnlyProof, type ReadOnlyProof } from '../../src/core/source/readOnlyProof';
import { EFFECT_KINDS } from '../../src/core/source/effectVocabulary';
import type { PhpEffectClosureProof } from '../../src/core/source/phpEffectClosure';
import type { PhpResolvedRoutePipeline } from '../../src/core/source/phpPipeline';

export const resolvedEmptyPipeline: PhpResolvedRoutePipeline = {
  state: 'RESOLVED',
  rejectionCode: null,
  middleware: [],
  flags: [['header', false]],
  evidenceDigest: `ev:sha256:${'a'.repeat(24)}`,
};

export function pureReadClosure(): PhpEffectClosureProof {
  return {
    schemaVersion: 'nightwatch.php-effect-closure.v1',
    state: 'PURE_READ_PROVEN',
    rejectionCode: null,
    entrypoints: [{ relativePath: 'src/App/Handler/SENTINEL.php', symbol: 'read', role: 'HANDLER' }],
    effectCounts: EFFECT_KINDS.map((kind) => ({ kind, count: kind === 'PURE_READ' ? 1 : 0 })),
    disqualifyingKinds: [],
    distinctCallees: 1,
    classifiedCallees: 1,
    unclassifiedCallees: 0,
    visitedDeclarations: 1,
    maxDepthReached: 0,
    filesRead: 1,
    callsites: 1,
    vocabularyDigest: `ev:sha256:${'b'.repeat(24)}`,
    evidenceDigest: `ev:sha256:${'c'.repeat(24)}`,
  };
}

/** A proof whose state is `READ_ONLY_PROVEN`, produced by the real lattice. */
export function provenReadOnlyProof(): ReadOnlyProof {
  return buildReadOnlyProof({
    method: 'GET',
    routeProof: 'PROVEN',
    joinState: 'PROVEN',
    inventoryCompleteness: 'COMPLETE',
    pipeline: resolvedEmptyPipeline,
    closure: pureReadClosure(),
  });
}
