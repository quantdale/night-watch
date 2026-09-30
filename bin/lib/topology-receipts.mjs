// @ts-check

/**
 * R3-09 / corrections task 8.8 — the topology-certification consumer.
 *
 * A topology receipt proves the runner's fail-closed envelope; only a
 * COMPLETE PROVEN envelope is CERTIFYING. `PROVEN_DEGRADED` (for example a
 * runner without Bubblewrap, or one that never exercised Chrome) is recorded
 * evidence, never certification. This pure judgement names the receipt bound
 * to a given checkpoint and whether it may certify, so the release condition
 * and the CI path consume one answer.
 */

const SHA_RE = /^[0-9a-f]{40}$/i;

/**
 * @param {ReadonlyArray<unknown>} receipts parsed topology receipts
 * @param {string | null} checkpointSha
 * @returns {{ checked: boolean, certifying: boolean, detail: string }}
 */
export function topologyCertificationForCheckpoint(receipts, checkpointSha) {
  if (typeof checkpointSha !== 'string' || !SHA_RE.test(checkpointSha)) {
    return { checked: false, certifying: false, detail: 'checkpoint unresolved' };
  }
  /** @type {Record<string, unknown>[]} */
  const matching = [];
  for (const entry of receipts) {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) continue;
    const record = /** @type {Record<string, unknown>} */ (entry);
    if (typeof record.gitHead === 'string' && record.gitHead.toLowerCase() === checkpointSha.toLowerCase()) matching.push(record);
  }
  if (matching.length === 0) {
    return { checked: false, certifying: false, detail: `no topology receipt for ${checkpointSha.slice(0, 8)}` };
  }
  matching.sort((left, right) => String(right.generatedAt ?? '').localeCompare(String(left.generatedAt ?? '')));
  const receipt = matching[0];
  const claim = receipt.ciClaim;
  const certifying = claim !== null && typeof claim === 'object' && !Array.isArray(claim)
    && (/** @type {Record<string, unknown>} */ (claim)).certifying === true;
  const topologyClass = typeof receipt.runnerTopologyClass === 'string' ? receipt.runnerTopologyClass : 'UNKNOWN';
  return {
    checked: true,
    certifying,
    detail: `${topologyClass}${certifying ? '' : ' (non-certifying)'} at ${checkpointSha.slice(0, 8)}`,
  };
}
