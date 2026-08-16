// ---------------------------------------------------------------------------
// Nightwatch Phase 9 — deterministic semantic finding fingerprints (SPEC §43).
//
// The fingerprint hashes SAFE categorical metadata only: oracle/category,
// expectation id, source contract identity, journey/operation role,
// expected/observed classes, relation id. Entity identity (opaque tokens or
// projection digests) is deliberately excluded — raw values are never hashed
// into the fingerprint, and entity identity is not part of the cross-customer
// fingerprint.
// ---------------------------------------------------------------------------

import crypto from 'node:crypto';
import type { SemanticOracleFinding } from './types';

export function semanticFindingFingerprint(finding: Pick<
  SemanticOracleFinding,
  'oracleId' | 'category' | 'expectationId' | 'expectedClass' | 'observedClass' | 'relationId' | 'sourceProvenance'
>): string {
  const canonical = JSON.stringify({
    oracleId: finding.oracleId,
    category: finding.category,
    expectationId: finding.expectationId,
    expectedClass: finding.expectedClass,
    observedClass: finding.observedClass,
    relationId: finding.relationId ?? null,
    sourceRepoId: finding.sourceProvenance.repoId,
    sourceSha: finding.sourceProvenance.sha,
    derivationVersion: finding.sourceProvenance.derivationVersion,
  });
  return `fp:sha256:${crypto.createHash('sha256').update(canonical, 'utf8').digest('hex').slice(0, 24)}`;
}
