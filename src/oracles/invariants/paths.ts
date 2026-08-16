// ---------------------------------------------------------------------------
// Nightwatch Phase 9 — projection path resolution over safe projections.
//
// Phase 9A.1 extension: an EMPTY path resolves to the root node; a bounded
// numeric segment addresses an ARRAY item index (deterministic; undefined
// beyond the inspected window) or an OBJECT field of the same name. Object
// segments behave exactly as before.
// ---------------------------------------------------------------------------

import type { ProjectionNode } from '../projections/types';
import type { SafePath } from '../expectations/types';

export function resolvePath(root: ProjectionNode, path: SafePath): ProjectionNode | undefined {
  let node: ProjectionNode = root;
  for (const segment of path) {
    if (node.type === 'ARRAY' && node.items !== undefined && /^[0-9]+$/.test(segment)) {
      const index = Number(segment);
      if (!Number.isInteger(index) || index < 0 || index >= node.items.length) return undefined;
      node = node.items[index]!;
      continue;
    }
    if (node.type !== 'OBJECT' || node.fields === undefined) return undefined;
    const field = node.fields.find((candidate) => candidate.name === segment);
    if (field === undefined) return undefined;
    node = field.node;
  }
  return node;
}

/**
 * Phase 9A.1: resolve a path with explicit empty-array/uninspected ambiguity.
 *
 * Returns `{ node, na }` where `na: true` means the path crossed an ARRAY
 * node that was EMPTY (no items to inspect) or an index beyond the inspected
 * window — a structurally ambiguous position that must NEVER be reported as
 * a violation (SPEC §31: ambiguity is never an anomaly). `na: true` implies
 * `node: undefined`.
 */
export function resolvePathWithAmbiguity(
  root: ProjectionNode,
  path: SafePath,
): { node: ProjectionNode | undefined; na: boolean } {
  let node: ProjectionNode = root;
  for (const segment of path) {
    if (node.type === 'ARRAY' && node.items !== undefined && /^[0-9]+$/.test(segment)) {
      if (node.itemCount === 0) return { node: undefined, na: true };
      const index = Number(segment);
      if (!Number.isInteger(index) || index < 0 || index >= node.items.length) {
        // Beyond the inspected window: cannot decide -> ambiguous.
        return { node: undefined, na: true };
      }
      node = node.items[index]!;
      continue;
    }
    if (node.type !== 'OBJECT' || node.fields === undefined) return { node: undefined, na: false };
    const field = node.fields.find((candidate) => candidate.name === segment);
    if (field === undefined) return { node: undefined, na: false };
    node = field.node;
  }
  return { node, na: false };
}

/** Resolve a path relative to an array ITEM node. */
export function resolveRelativePath(item: ProjectionNode, path: SafePath): ProjectionNode | undefined {
  return resolvePath(item, path);
}
