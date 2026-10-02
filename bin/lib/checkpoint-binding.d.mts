// Types for the checkpoint-binding collector (`bin/lib/checkpoint-binding.mjs`).
import type { ProbeBinding } from './probe-binding.mjs';
export function bindingReceiptVerifier(root: string): (subject: string, digest: string, sha: string) => boolean;
export type GitReader = (args: string[]) => string | null;
export function collectCheckpointBindingFacts(input: { root: string; substantiveSha: string | null; git: GitReader }): {
  headSha: string | null;
  treeClean: boolean | null;
  rangeClass: string;
  binding: ProbeBinding;
  isAncestor: (ancestor: string, descendant: string) => boolean;
};
