// @ts-check
// R5-05 / review-5 task A4.1 — the checkpoint-binding collector, as a module.
//
// Whether a release probe's working-tree measurement describes the certified
// checkpoint S depends on four facts read from Git: HEAD, the cleanliness of the
// tree, the classification of the range S..HEAD, and the production receipt
// verifier that lets a binding commit stay documentary. Those facts used to be
// derived inline in `bin/project-state-check.mjs`, a CLI whose `main()` runs at
// import, so they could be mutated (`headSha = S`, `porcelain = ''`,
// `rangeClass = 'DOCUMENTARY_DESCENDANT'`, a range callback returning `[]`)
// without any test noticing. Here they are one importable function that a test
// can drive against a real synthetic Git repository.

import { classifyCheckpointRange } from './checkpoint-range.mjs';
import { checkpointRoleViolations } from './checkpoint-role.mjs';
import { resolveProbeBinding } from './probe-binding.mjs';
import { productionBindingReceiptVerifier } from './release-evidence.mjs';

/**
 * R4-01 / review-4 task 1.1 — the production receipt verifier handed to EVERY
 * checkpoint/range classification (project-state-check and agent-state share
 * this one wrapper). The `() => true` shortcut survives only in test fixtures.
 * @param {string} root
 * @returns {(subject: string, digest: string, sha: string) => boolean}
 */
export function bindingReceiptVerifier(root) {
  return productionBindingReceiptVerifier(root);
}

/**
 * @typedef {(args: string[]) => string | null} GitReader a read-only git invocation; null on failure
 * @typedef {(ancestor: string, descendant: string) => boolean} IsAncestor
 * @typedef {{ headSha: string | null, treeClean: boolean | null, rangeClass: string, binding: import('./probe-binding.mjs').ProbeBinding, isAncestor: IsAncestor }} BindingFacts
 */

/**
 * Read the binding facts once. Every unknown or unprovable fact fails closed:
 * an unreadable HEAD or status is `null`, an unclassifiable range is not
 * documentary, and nothing here ever upgrades a probe.
 * @param {{ root: string, substantiveSha: string | null, git: GitReader }} input
 * @returns {BindingFacts}
 */
export function collectCheckpointBindingFacts(input) {
  const { root, substantiveSha, git } = input;
  /** @param {string} ancestor @param {string} descendant */
  const isAncestor = (ancestor, descendant) => git(['merge-base', '--is-ancestor', ancestor, descendant]) !== null;
  const headOutput = git(['rev-parse', 'HEAD']);
  const porcelainOutput = git(['status', '--porcelain']);
  const headSha = headOutput === null ? null : headOutput.trim();
  const treeClean = porcelainOutput === null ? null : porcelainOutput.trim() === '';
  const rangeClass = classifyCheckpointRange({
    certifiedCheckpointSha: substantiveSha,
    headSha,
    isAncestor,
    changedFiles: (from, to) => {
      const output = git(['diff', '--name-only', '--no-renames', `${from}..${to}`]);
      return output === null ? null : output.split('\n').map((line) => line.trim()).filter((line) => line !== '');
    },
    checkpointRoleViolations: (files) => {
      try {
        return checkpointRoleViolations(root, files, { kind: 'range', from: String(substantiveSha), to: headSha ?? String(substantiveSha), verifyBindingReceipt: bindingReceiptVerifier(root) });
      } catch {
        return null;
      }
    },
  });
  const binding = resolveProbeBinding({
    certifiedCheckpointSha: substantiveSha,
    headSha,
    treeClean,
    documentaryDescendant: rangeClass === 'DOCUMENTARY_DESCENDANT',
  });
  return { headSha, treeClean, rangeClass, binding, isAncestor };
}
