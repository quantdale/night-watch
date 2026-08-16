// ---------------------------------------------------------------------------
// Nightwatch Phase 9 — projection path resolution over safe projections.
// ---------------------------------------------------------------------------

import type { ProjectionNode } from '../projections/types';
import type { SafePath } from '../expectations/types';

export function resolvePath(root: ProjectionNode, path: SafePath): ProjectionNode | undefined {
  let node: ProjectionNode = root;
  for (const segment of path) {
    if (node.type !== 'OBJECT' || node.fields === undefined) return undefined;
    const field = node.fields.find((candidate) => candidate.name === segment);
    if (field === undefined) return undefined;
    node = field.node;
  }
  return node;
}

/** Resolve a path relative to an array ITEM node. */
export function resolveRelativePath(item: ProjectionNode, path: SafePath): ProjectionNode | undefined {
  return resolvePath(item, path);
}
