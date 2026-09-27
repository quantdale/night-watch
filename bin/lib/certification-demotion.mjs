// @ts-check

/**
 * X-04 — post-certification demotion classification (design D4).
 *
 * After an advance is claimed at S, HEAD's relation to S is classified rather
 * than re-certified:
 *
 *   EXACT                  HEAD is the certified checkpoint;
 *   DESCENDANT_DOCUMENTARY HEAD descends from S through approved/documentary
 *                          paths only: certified at S, reported as-is;
 *   DESCENDANT_SUBSTANTIVE HEAD descends from S with substantive changes:
 *                          CERTIFIED_AT_ANCESTOR attention. The advance is not
 *                          re-claimed at HEAD and PROJECT_TRUTH still passes;
 *   NOT_DESCENDANT,        the relation is not a descendant chain at all
 *   UNKNOWN_CHECKPOINT,    (divergent, behind, or unresolvable), which keeps
 *   UNKNOWN_HEAD,          the ordinary refusal semantics.
 *   UNVERIFIABLE
 *
 * The judgement is PURE: the caller supplies the Git facts (whether S is an
 * ancestor of HEAD, the changed files, and which of them the closed checkpoint
 * role classifier rejects). This keeps every relation negative-probable with
 * data alone, and keeps "documentary" impossible to fork from the A-10
 * baseline invariant, which uses the same path classifier.
 */

export const CERTIFICATION_DEMOTION_RELATIONS = Object.freeze([
  'NOT_CLAIMED',
  'EXACT',
  'DESCENDANT_DOCUMENTARY',
  'DESCENDANT_SUBSTANTIVE',
  'NOT_DESCENDANT',
  'UNKNOWN_CHECKPOINT',
  'UNKNOWN_HEAD',
  'UNVERIFIABLE',
]);

const SHA_RE = /^[0-9a-f]{40}$/i;

/**
 * @param {{
 *   advanceClaimed: boolean,
 *   certifiedCheckpointSha: string | null,
 *   liveHeadSha: string | null,
 *   isAncestor?: boolean | null,
 *   changedFiles?: readonly string[] | null,
 *   substantivePaths?: readonly string[] | null,
 * }} input
 * @returns {{ relation: string, attention: readonly string[], detail: string }}
 */
export function classifyCertificationDemotion(input) {
  if (input.advanceClaimed !== true) {
    return { relation: 'NOT_CLAIMED', attention: [], detail: 'no advance is claimed; the verdict remains the operationally accepted status' };
  }
  const checkpoint = input.certifiedCheckpointSha;
  if (typeof checkpoint !== 'string' || !SHA_RE.test(checkpoint)) {
    return { relation: 'UNKNOWN_CHECKPOINT', attention: [], detail: 'the claimed advance names no resolvable checkpoint' };
  }
  const head = input.liveHeadSha;
  if (typeof head !== 'string' || !SHA_RE.test(head)) {
    return { relation: 'UNKNOWN_HEAD', attention: [], detail: 'HEAD is not resolvable' };
  }
  const short = checkpoint.slice(0, 8);
  if (head === checkpoint) {
    return { relation: 'EXACT', attention: [], detail: `HEAD is the certified checkpoint ${short}` };
  }
  if (input.isAncestor !== true) {
    return { relation: 'NOT_DESCENDANT', attention: [], detail: `HEAD does not descend from certified checkpoint ${short}` };
  }
  const changedFiles = input.changedFiles;
  if (!Array.isArray(changedFiles)) {
    return { relation: 'UNVERIFIABLE', attention: [], detail: 'the certified range could not be classified' };
  }
  const substantive = Array.isArray(input.substantivePaths) ? input.substantivePaths : [];
  if (substantive.length === 0) {
    return {
      relation: 'DESCENDANT_DOCUMENTARY',
      attention: [],
      detail: `HEAD descends from ${short} through ${changedFiles.length} documentary path(s); certified at S`,
    };
  }
  return {
    relation: 'DESCENDANT_SUBSTANTIVE',
    attention: ['CERTIFIED_AT_ANCESTOR'],
    detail: `HEAD descends from ${short} with substantive changes (${substantive.slice(0, 3).join(', ')}${substantive.length > 3 ? ', ...' : ''}); the advance is not re-claimed at HEAD`,
  };
}
