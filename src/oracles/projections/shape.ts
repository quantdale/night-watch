// ---------------------------------------------------------------------------
// Nightwatch Phase 9 — deterministic shape equality (SPEC §39).
//
// Shape equality compares structure only: paths, types, presence classes,
// field-name sets, safe cardinality counts, array item type, array
// truncation state, and string content class. Identity tokens and numeric
// refs are correlation labels, not shape — they never participate.
//
// Arrays compare as multisets of item shapes (order is not semantic unless
// a contract says otherwise), so benign reordering does not produce false
// shape drift. Truncated arrays carry their truncation state so a bounded
// projection never silently looks identical to a full one.
// ---------------------------------------------------------------------------

import type { ProjectionNode } from './types';

function shapeKey(node: ProjectionNode): string {
  switch (node.type) {
    case 'NULL':
    case 'BOOLEAN':
    case 'NUMBER':
      return node.type;
    case 'STRING':
      return `STRING:${node.stringClass ?? 'NONEMPTY'}`;
    case 'OBJECT': {
      const fields = [...(node.fields ?? [])]
        .map((field) => `${JSON.stringify(field.name)}:${shapeKey(field.node)}`)
        .sort()
        .join(',');
      return `OBJECT[${node.fieldCount ?? 0}]{${fields}}`;
    }
    case 'ARRAY': {
      const items = [...(node.items ?? [])].map(shapeKey).sort().join(',');
      return `ARRAY<${node.itemType ?? 'MIXED'}>[${node.itemCount ?? 0}]{${items}}${node.arrayTruncated === true ? ':truncated' : ''}`;
    }
  }
}

/** Structural equality per the canonical shape semantics above. */
export function shapeEquals(left: ProjectionNode, right: ProjectionNode): boolean {
  return shapeKey(left) === shapeKey(right);
}

/**
 * TRANSITION-STATE equality (SPEC §38): shape equality PLUS opaque identity
 * tokens and numeric refs. Used ONLY by SHAPE_CHANGED invariants — a state
 * transition is observable when the same raw value maps to the same token
 * inside one shared ProjectionContext, so `stage: "a"` -> `stage: "b"` is a
 * real transition while `"a"` -> `"a"` is unchanged. Tokens/refs are opaque
 * correlation labels, never customer values.
 */
export function semanticStateEquals(left: ProjectionNode, right: ProjectionNode): boolean {
  if (left.type !== right.type) return false;
  switch (left.type) {
    case 'NULL':
    case 'BOOLEAN':
      return true;
    case 'NUMBER':
      return left.numericRef === right.numericRef;
    case 'STRING':
      if ((left.stringClass ?? 'NONEMPTY') !== (right.stringClass ?? 'NONEMPTY')) return false;
      // Both nodes carry tokens from the same context; equality means the
      // raw value is identical across the two projections.
      return left.identityToken === right.identityToken;
    case 'OBJECT': {
      const leftFields = left.fields ?? [];
      const rightFields = right.fields ?? [];
      if (leftFields.length !== rightFields.length) return false;
      for (let i = 0; i < leftFields.length; i++) {
        const leftField = leftFields[i]!;
        const rightField = rightFields[i]!;
        if (leftField.name !== rightField.name) return false;
        if (!semanticStateEquals(leftField.node, rightField.node)) return false;
      }
      return true;
    }
    case 'ARRAY': {
      if (left.itemCount !== right.itemCount) return false;
      if ((left.arrayTruncated ?? false) !== (right.arrayTruncated ?? false)) return false;
      const leftItems = left.items ?? [];
      const rightItems = right.items ?? [];
      if (leftItems.length !== rightItems.length) return false;
      // Order is not semantic for state equality: compare as multisets of
      // state keys (deterministic: sorted).
      const leftKeys = leftItems.map(semanticStateKey).sort();
      const rightKeys = rightItems.map(semanticStateKey).sort();
      for (let i = 0; i < leftKeys.length; i++) {
        if (leftKeys[i] !== rightKeys[i]) return false;
      }
      return true;
    }
  }
}

function semanticStateKey(node: ProjectionNode): string {
  if (node.type === 'OBJECT') {
    return `OBJECT{${(node.fields ?? []).map((field) => `${JSON.stringify(field.name)}:${semanticStateKey(field.node)}`).join(',')}}`;
  }
  if (node.type === 'ARRAY') {
    const keys = (node.items ?? []).map(semanticStateKey).sort().join(',');
    return `ARRAY[${node.itemCount ?? 0}]{${keys}}${node.arrayTruncated === true ? ':truncated' : ''}`;
  }
  if (node.type === 'STRING') return `STRING:${node.identityToken ?? '?'}`;
  if (node.type === 'NUMBER') return `NUMBER:${node.numericRef ?? '?'}`;
  return node.type;
}

// Phase 15P A15 convergence: retired dead shapeKeyOf shim (zero callers; shapeKey is the single owner).
