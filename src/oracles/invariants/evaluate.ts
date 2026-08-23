// ---------------------------------------------------------------------------
// Nightwatch Phase 9 — deterministic invariant evaluation (SPEC §21, §22,
// §35, §36, §37, §38, §39).
//
// Consumes ONLY safe projections + declarative contracts + the ephemeral
// ProjectionContext. Never touches raw bodies.
//
// Semantic rules:
// - ENVELOPE_CLASS: an object carrying the contract's error field is an
//   ERROR_ENVELOPE; the success field makes it a SUCCESS_ENVELOPE; both or
//   neither is UNKNOWN_ENVELOPE. Only a source-established success-required
//   contract can flag ERROR_ENVELOPE (SPEC §36).
// - IDENTITY_PRESENT_IN_COLLECTION: list projection first, detail second;
//   truncated collections are NOT_APPLICABLE (cannot prove membership).
// - NUMERIC_SUM_RELATION: truncated collections are NOT_APPLICABLE (a partial
//   sum must never produce a false mismatch).
// - COUNT_RELATION: exact itemCount is safe even for truncated arrays.
// - SHAPE_CHANGED: only explicit expectedTransition CHANGE + observed equal
//   projection can yield a stale-state violation (SPEC §38).
// ---------------------------------------------------------------------------

import type { ProjectionContext } from '../projections/identity';
import type { ProjectionNode, SemanticProjection } from '../projections/types';
import { SEMANTIC_PROJECTION_VERSION } from '../projections/types'; // Phase 15P A15: single owner
import { evaluateNumericRelation } from '../projections/numeric';
import { semanticStateEquals } from '../projections/shape';
import type {
  CollectionItemContract,
  InvariantDefinition,
  SafePath,
} from '../expectations/types';
import { resolvePath, resolvePathWithAmbiguity } from './paths';
import type { InvariantEvaluation } from './types';

function present(node: ProjectionNode | undefined): boolean {
  return node !== undefined;
}

function arrayNode(node: ProjectionNode | undefined): ProjectionNode | undefined {
  return node !== undefined && node.type === 'ARRAY' ? node : undefined;
}

/** Envelope classification from a projection root using the contract's
 *  success/error field vocabulary (SPEC §36). */
// Phase 15P A15 convergence: de-exported (module-private, zero external callers).
function classifyEnvelope(
  root: ProjectionNode,
  successField: SafePath,
  errorField: SafePath,
): 'SUCCESS_ENVELOPE' | 'ERROR_ENVELOPE' | 'UNKNOWN_ENVELOPE' {
  const hasSuccess = present(resolvePath(root, successField));
  const hasError = present(resolvePath(root, errorField));
  if (hasSuccess && !hasError) return 'SUCCESS_ENVELOPE';
  if (hasError && !hasSuccess) return 'ERROR_ENVELOPE';
  return 'UNKNOWN_ENVELOPE';
}

function itemShapeTokens(
  item: ProjectionNode,
  identityPath: SafePath,
): string | undefined {
  const identityNode = resolvePath(item, identityPath);
  if (identityNode === undefined || identityNode.type !== 'STRING' || identityNode.identityToken === undefined) {
    return undefined;
  }
  return identityNode.identityToken;
}

function numberValue(node: ProjectionNode | undefined, ctx: ProjectionContext): number | undefined {
  if (node === undefined || node.type !== 'NUMBER' || node.numericRef === undefined) return undefined;
  return ctx.numericValue(node.numericRef);
}

function collectionIdentityTokens(node: ProjectionNode | undefined, identityPath: readonly string[]): readonly string[] | undefined {
  if (node === undefined || node.type !== 'ARRAY' || node.items === undefined || node.items.length === 0) return undefined;
  const tokens: string[] = [];
  for (const item of node.items) {
    const token = itemShapeTokens(item, identityPath);
    if (token === undefined) return undefined;
    tokens.push(token);
  }
  return tokens;
}

function equalityVerdict(equal: boolean, expected: 'EQUAL' | 'NOT_EQUAL'): 'PASS' | 'VIOLATED' {
  return (expected === 'EQUAL' ? equal : !equal) ? 'PASS' : 'VIOLATED';
}

export function evaluateInvariant(
  invariant: InvariantDefinition,
  projections: readonly SemanticProjection[],
  ctx: ProjectionContext,
): InvariantEvaluation {
  switch (invariant.kind) {
    case 'FIELD_PRESENT': {
      const root = projections[0]?.root;
      if (root === undefined) return { invariantKind: invariant.kind, verdict: 'NOT_APPLICABLE' };
      const resolved = resolvePathWithAmbiguity(root, invariant.path);
      // An empty/uninspected array along the path is structurally ambiguous
      // (no item exists to inspect) — never an anomaly (SPEC §31).
      if (resolved.na) return { invariantKind: invariant.kind, verdict: 'NOT_APPLICABLE' };
      const isPresent = present(resolved.node);
      return { invariantKind: invariant.kind, verdict: isPresent === invariant.expected ? 'PASS' : 'VIOLATED' };
    }
    case 'FIELD_ABSENT': {
      const root = projections[0]?.root;
      if (root === undefined) return { invariantKind: invariant.kind, verdict: 'NOT_APPLICABLE' };
      const resolved = resolvePathWithAmbiguity(root, invariant.path);
      if (resolved.na) return { invariantKind: invariant.kind, verdict: 'NOT_APPLICABLE' };
      const isPresent = present(resolved.node);
      return { invariantKind: invariant.kind, verdict: isPresent ? 'VIOLATED' : 'PASS' };
    }
    case 'TYPE_MATCH': {
      const root = projections[0]?.root;
      if (root === undefined) return { invariantKind: invariant.kind, verdict: 'NOT_APPLICABLE' };
      const resolved = resolvePathWithAmbiguity(root, invariant.path);
      if (resolved.na) return { invariantKind: invariant.kind, verdict: 'NOT_APPLICABLE' };
      const node = resolved.node;
      if (node === undefined) return { invariantKind: invariant.kind, verdict: 'NOT_APPLICABLE' };
      return { invariantKind: invariant.kind, verdict: node.type === invariant.expectedType ? 'PASS' : 'VIOLATED' };
    }
    case 'TYPE_IN_SET': {
      // Phase 10A: source-established polymorphic JSON type contract.
      // A missing path — or an ambiguity caused by an empty/uninspected
      // parent array — is NOT_APPLICABLE, never an anomaly.
      const root = projections[0]?.root;
      if (root === undefined) return { invariantKind: invariant.kind, verdict: 'NOT_APPLICABLE' };
      const resolved = resolvePathWithAmbiguity(root, invariant.path);
      if (resolved.na) return { invariantKind: invariant.kind, verdict: 'NOT_APPLICABLE' };
      const node = resolved.node;
      if (node === undefined) return { invariantKind: invariant.kind, verdict: 'NOT_APPLICABLE' };
      return { invariantKind: invariant.kind, verdict: invariant.allowedTypes.includes(node.type) ? 'PASS' : 'VIOLATED' };
    }
    case 'CARDINALITY_MATCH': {
      const root = projections[0]?.root;
      if (root === undefined) return { invariantKind: invariant.kind, verdict: 'NOT_APPLICABLE' };
      const node = arrayNode(resolvePath(root, invariant.path));
      if (node === undefined || node.itemCount === undefined) {
        // Absent collection is ambiguous, never an anomaly (SPEC §31).
        return { invariantKind: invariant.kind, verdict: 'NOT_APPLICABLE' };
      }
      const count = node.itemCount;
      let pass = true;
      if (invariant.min !== undefined && count < invariant.min) pass = false;
      if (invariant.max !== undefined && count > invariant.max) pass = false;
      if (invariant.exact !== undefined && count !== invariant.exact) pass = false;
      return { invariantKind: invariant.kind, verdict: pass ? 'PASS' : 'VIOLATED' };
    }
    case 'ENVELOPE_CLASS': {
      const root = projections[0]?.root;
      if (root === undefined) return { invariantKind: invariant.kind, verdict: 'NOT_APPLICABLE' };
      const observed = classifyEnvelope(root, invariant.successField, invariant.errorField);
      if (invariant.expected === 'UNKNOWN_ENVELOPE') {
        // Ambiguous expectation vocabulary: never an anomaly.
        return { invariantKind: invariant.kind, verdict: 'NOT_APPLICABLE' };
      }
      if (observed === 'UNKNOWN_ENVELOPE') {
        // Both/neither envelope field: ambiguous observation, never an anomaly.
        return { invariantKind: invariant.kind, verdict: 'NOT_APPLICABLE' };
      }
      return { invariantKind: invariant.kind, verdict: observed === invariant.expected ? 'PASS' : 'VIOLATED' };
    }
    case 'IDENTITY_EQUAL': {
      const root = projections[0]?.root;
      if (root === undefined) return { invariantKind: invariant.kind, verdict: 'NOT_APPLICABLE' };
      const left = resolvePath(root, invariant.leftPath);
      const right = resolvePath(root, invariant.rightPath);
      if (left === undefined || right === undefined || left.type !== 'STRING' || right.type !== 'STRING' || left.identityToken === undefined || right.identityToken === undefined) {
        return { invariantKind: invariant.kind, verdict: 'NOT_APPLICABLE' };
      }
      return { invariantKind: invariant.kind, verdict: left.identityToken === right.identityToken ? 'PASS' : 'VIOLATED' };
    }
    case 'IDENTITY_PRESENT_IN_COLLECTION': {
      const list = projections[0]?.root;
      const detail = projections[1]?.root;
      if (list === undefined || detail === undefined) return { invariantKind: invariant.kind, verdict: 'NOT_APPLICABLE' };
      const collection = arrayNode(resolvePath(list, invariant.collectionPath));
      if (collection === undefined || collection.items === undefined) return { invariantKind: invariant.kind, verdict: 'NOT_APPLICABLE' };
      if (collection.arrayTruncated === true || collection.items.length === 0) {
        // Membership beyond the inspected window — or in an empty collection —
        // cannot be established from the observed surface; a mismatch here
        // could be a false positive (SPEC §31: ambiguity is never an anomaly).
        return { invariantKind: invariant.kind, verdict: 'NOT_APPLICABLE' };
      }
      const detailIdentity = itemShapeTokens(detail, invariant.detailIdentityPath);
      if (detailIdentity === undefined) return { invariantKind: invariant.kind, verdict: 'NOT_APPLICABLE' };
      const memberTokens = new Set<string>();
      for (const item of collection.items) {
        const token = itemShapeTokens(item, invariant.itemIdentityPath);
        if (token === undefined) return { invariantKind: invariant.kind, verdict: 'NOT_APPLICABLE' };
        memberTokens.add(token);
      }
      return { invariantKind: invariant.kind, verdict: memberTokens.has(detailIdentity) ? 'PASS' : 'VIOLATED' };
    }
    case 'NUMERIC_SUM_RELATION': {
      const root = projections[0]?.root;
      if (root === undefined) return { invariantKind: invariant.kind, verdict: 'NOT_APPLICABLE' };
      const collection = arrayNode(resolvePath(root, invariant.collectionPath));
      if (collection === undefined || collection.items === undefined) return { invariantKind: invariant.kind, verdict: 'NOT_APPLICABLE' };
      if (collection.arrayTruncated === true) {
        // A partial sum must never produce a false mismatch.
        return { invariantKind: invariant.kind, verdict: 'NOT_APPLICABLE' };
      }
      const scalar = numberValue(resolvePath(root, invariant.scalarPath), ctx);
      if (scalar === undefined) return { invariantKind: invariant.kind, verdict: 'NOT_APPLICABLE' };
      const amounts: number[] = [];
      for (const item of collection.items) {
        const amount = numberValue(resolvePath(item, invariant.numericFieldPath), ctx);
        if (amount === undefined) return { invariantKind: invariant.kind, verdict: 'NOT_APPLICABLE' };
        amounts.push(amount);
      }
      const fact = evaluateNumericRelation({
        relationId: invariant.relationId,
        operation: 'SUM_EQUALS',
        operands: [...amounts, scalar],
      });
      return {
        invariantKind: invariant.kind,
        relationId: invariant.relationId,
        verdict: fact.result === 'MATCH' ? 'PASS' : fact.result === 'MISMATCH' ? 'VIOLATED' : fact.result === 'INVALID_INPUT' ? 'INVALID_INPUT' : 'NOT_APPLICABLE',
      };
    }
    case 'COUNT_RELATION': {
      const root = projections[0]?.root;
      if (root === undefined) return { invariantKind: invariant.kind, verdict: 'NOT_APPLICABLE' };
      const collection = arrayNode(resolvePath(root, invariant.collectionPath));
      if (collection === undefined || collection.itemCount === undefined) return { invariantKind: invariant.kind, verdict: 'NOT_APPLICABLE' };
      const count = collection.itemCount;
      let bound: number;
      if (invariant.expectedCount !== undefined) {
        bound = invariant.expectedCount;
      } else if (invariant.scalarPath !== undefined) {
        const scalarNode = numberValue(resolvePath(root, invariant.scalarPath), ctx);
        if (scalarNode === undefined) return { invariantKind: invariant.kind, verdict: 'NOT_APPLICABLE' };
        bound = scalarNode;
      } else {
        return { invariantKind: invariant.kind, verdict: 'NOT_APPLICABLE' };
      }
      const fact = evaluateNumericRelation({
        relationId: invariant.relationId,
        operation: invariant.operation,
        operands: [count, bound],
      });
      return {
        invariantKind: invariant.kind,
        relationId: invariant.relationId,
        verdict: fact.result === 'MATCH' ? 'PASS' : fact.result === 'MISMATCH' ? 'VIOLATED' : 'INVALID_INPUT',
      };
    }
    case 'SHAPE_CHANGED': {
      const before = projections[0]?.root;
      const after = projections[1]?.root;
      if (before === undefined || after === undefined) return { invariantKind: invariant.kind, verdict: 'NOT_APPLICABLE' };
      if (invariant.expectedTransition === 'UNKNOWN') return { invariantKind: invariant.kind, verdict: 'NOT_APPLICABLE' };
      const left = invariant.statePath === undefined ? before : resolvePath(before, invariant.statePath);
      const right = invariant.statePath === undefined ? after : resolvePath(after, invariant.statePath);
      if (left === undefined || right === undefined) return { invariantKind: invariant.kind, verdict: 'NOT_APPLICABLE' };
      // Transition-state equality: structure + opaque identity tokens/numeric
      // refs through the shared context (SPEC §38, §39).
      const equal = semanticStateEquals(left, right);
      if (invariant.expectedTransition === 'CHANGE') {
        return { invariantKind: invariant.kind, verdict: equal ? 'VIOLATED' : 'PASS' };
      }
      return { invariantKind: invariant.kind, verdict: equal ? 'PASS' : 'VIOLATED' };
    }
    case 'IDENTITY_UNIQUENESS': {
      const root = projections[0]?.root;
      if (root === undefined) return { invariantKind: invariant.kind, verdict: 'NOT_APPLICABLE', relationId: invariant.relationId };
      const tokens = collectionIdentityTokens(resolvePath(root, invariant.collectionPath), invariant.itemIdentityPath);
      if (tokens === undefined) return { invariantKind: invariant.kind, verdict: 'NOT_APPLICABLE', relationId: invariant.relationId };
      return {
        invariantKind: invariant.kind,
        relationId: invariant.relationId,
        verdict: new Set(tokens).size === tokens.length ? 'PASS' : 'VIOLATED',
      };
    }
    case 'PAGINATION_WINDOW': {
      const leftRoot = projections[0]?.root;
      const rightRoot = projections[1]?.root;
      if (leftRoot === undefined || rightRoot === undefined) return { invariantKind: invariant.kind, verdict: 'NOT_APPLICABLE', relationId: invariant.relationId };
      const leftTokens = collectionIdentityTokens(resolvePath(leftRoot, invariant.leftCollectionPath), invariant.itemIdentityPath);
      const rightTokens = collectionIdentityTokens(resolvePath(rightRoot, invariant.rightCollectionPath), invariant.itemIdentityPath);
      if (leftTokens === undefined || rightTokens === undefined) return { invariantKind: invariant.kind, verdict: 'NOT_APPLICABLE', relationId: invariant.relationId };
      const left = new Set(leftTokens);
      const duplicate = rightTokens.some((token) => left.has(token));
      return { invariantKind: invariant.kind, relationId: invariant.relationId, verdict: duplicate ? 'VIOLATED' : 'PASS' };
    }
    case 'EMPTY_STATE_CONSISTENCY': {
      const root = projections[0]?.root;
      if (root === undefined) return { invariantKind: invariant.kind, verdict: 'NOT_APPLICABLE', relationId: invariant.relationId };
      const collection = resolvePath(root, invariant.collectionPath);
      const count = numberValue(resolvePath(root, invariant.countPath), ctx);
      const marker = resolvePath(root, invariant.emptyMarkerPath);
      if (collection === undefined || collection.type !== 'ARRAY' || collection.itemCount === undefined || count === undefined || marker === undefined || marker.type !== 'BOOLEAN' || marker.booleanClass === undefined) {
        return { invariantKind: invariant.kind, verdict: 'NOT_APPLICABLE', relationId: invariant.relationId };
      }
      if (!Number.isInteger(count) || count < 0) return { invariantKind: invariant.kind, verdict: 'INVALID_INPUT', relationId: invariant.relationId };
      const expectedEmpty = count === 0;
      const observedEmpty = marker.booleanClass === 'TRUE';
      const collectionEmpty = collection.itemCount === 0;
      const consistent = count === collection.itemCount && expectedEmpty === observedEmpty && expectedEmpty === collectionEmpty;
      return { invariantKind: invariant.kind, relationId: invariant.relationId, verdict: consistent ? 'PASS' : 'VIOLATED' };
    }
    case 'STATE_RELATION': {
      const before = projections[0]?.root;
      const after = projections[1]?.root;
      if (before === undefined || after === undefined) return { invariantKind: invariant.kind, verdict: 'NOT_APPLICABLE', relationId: invariant.relationId };
      const left = resolvePath(before, invariant.beforePath);
      const right = resolvePath(after, invariant.afterPath);
      if (left === undefined || right === undefined) return { invariantKind: invariant.kind, verdict: 'NOT_APPLICABLE', relationId: invariant.relationId };
      return { invariantKind: invariant.kind, relationId: invariant.relationId, verdict: equalityVerdict(semanticStateEquals(left, right), invariant.expected) };
    }
    case 'SURFACE_EQUIVALENCE': {
      const leftRoot = projections[0]?.root;
      const rightRoot = projections[1]?.root;
      if (leftRoot === undefined || rightRoot === undefined) return { invariantKind: invariant.kind, verdict: 'NOT_APPLICABLE', relationId: invariant.relationId };
      const left = resolvePath(leftRoot, invariant.leftPath);
      const right = resolvePath(rightRoot, invariant.rightPath);
      if (left === undefined || right === undefined) return { invariantKind: invariant.kind, verdict: 'NOT_APPLICABLE', relationId: invariant.relationId };
      return { invariantKind: invariant.kind, relationId: invariant.relationId, verdict: equalityVerdict(semanticStateEquals(left, right), invariant.expected) };
    }
    case 'COLLECTION_ITEM_CONTRACT': {
      const root = projections[0]?.root;
      if (root === undefined) {
        return { invariantKind: invariant.kind, verdict: 'NOT_APPLICABLE', coverageState: 'EMPTY_NOT_APPLICABLE' };
      }

      const collectionNode = resolvePath(root, invariant.collectionPath);
      if (collectionNode === undefined || collectionNode.type !== 'ARRAY') {
        return { invariantKind: invariant.kind, verdict: 'NOT_APPLICABLE', coverageState: 'EMPTY_NOT_APPLICABLE' };
      }

      // Empty collection: not applicable
      if (collectionNode.itemCount === 0 || collectionNode.items === undefined || collectionNode.items.length === 0) {
        return { invariantKind: invariant.kind, verdict: 'NOT_APPLICABLE', coverageState: 'EMPTY_NOT_APPLICABLE' };
      }

      const items = collectionNode.items;
      const inspectedCount = items.length;
      const isTruncated = collectionNode.arrayTruncated === true;

      let violatingCount = 0;
      let firstViolationOrdinal: number | undefined;

      for (let i = 0; i < items.length; i++) {
        const item = items[i]!;
        // Evaluate the item invariant with the item as root
        const itemProjection: SemanticProjection = { schemaVersion: SEMANTIC_PROJECTION_VERSION, root: item };
        const itemInvariantDef = buildItemInvariant(invariant, invariant.itemRelativePath);
        const itemResult = evaluateInvariant(itemInvariantDef, [itemProjection], ctx);

        if (itemResult.verdict === 'VIOLATED') {
          violatingCount++;
          if (firstViolationOrdinal === undefined) firstViolationOrdinal = i;
        }
      }

      if (violatingCount > 0) {
        return {
          invariantKind: invariant.kind,
          verdict: 'VIOLATED',
          coverageState: 'VIOLATION',
          inspectedItemCount: inspectedCount,
          violatingItemCount: violatingCount,
          firstViolationOrdinal,
        };
      }

      if (isTruncated) {
        return {
          invariantKind: invariant.kind,
          verdict: 'PASS',
          coverageState: 'PARTIAL_COVERAGE_NO_VIOLATION',
          inspectedItemCount: inspectedCount,
          violatingItemCount: 0,
        };
      }

      return {
        invariantKind: invariant.kind,
        verdict: 'PASS',
        coverageState: 'FULLY_EVALUATED_PASS',
        inspectedItemCount: inspectedCount,
        violatingItemCount: 0,
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Phase 11: item invariant builder for COLLECTION_ITEM_CONTRACT.
// Converts a collection-level contract into a single-item InvariantDefinition
// that can be recursively evaluated against each projected item.
// ---------------------------------------------------------------------------

function buildItemInvariant(contract: CollectionItemContract, relativePath: SafePath): InvariantDefinition {
  switch (contract.itemInvariantKind) {
    case 'FIELD_PRESENT':
      return { kind: 'FIELD_PRESENT', path: relativePath, expected: contract.itemExpected };
    case 'FIELD_ABSENT':
      return { kind: 'FIELD_ABSENT', path: relativePath };
    case 'TYPE_MATCH':
      return { kind: 'TYPE_MATCH', path: relativePath, expectedType: contract.itemExpectedType };
    case 'TYPE_IN_SET':
      return { kind: 'TYPE_IN_SET', path: relativePath, allowedTypes: contract.itemAllowedTypes };
  }
}
