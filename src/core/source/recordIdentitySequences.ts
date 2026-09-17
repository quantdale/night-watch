// ---------------------------------------------------------------------------
// NW-HIST-004 (Wave 2) — the record-identity sequences.
//
// Four deterministic sequences over the synthetic keyed store, each driven ONLY
// by extracted source facts plus the DECLARED model fields. No sequence invents
// a conditional write, an interleaving, or a failure mode the contract did not
// declare. Every reproduction is synthetic: it shows the declared source
// algebra under the declared model, never a production state.
//
//   A  dual physical shapes for one logical identity (create-once lifecycle)
//   B1 cascade completeness on the delete/recreate lifecycle
//   B2 derived-record orphan under the declared best-effort failure semantics
//   C  read-dedup + competing unconditional writes (declared eventual model)
// ---------------------------------------------------------------------------

import type { RecordIdentityContract } from './recordIdentityContract';
import type { RecordIdentityFunctionFacts, RecordKeyShape } from './recordIdentityShapes';
import { createSyntheticStore, syntheticStoreDigest } from './recordIdentityStore';

export const RECORD_IDENTITY_SEQUENCE_IDS = ['A', 'B1', 'B2', 'C'] as const;
export type RecordIdentitySequenceId = (typeof RECORD_IDENTITY_SEQUENCE_IDS)[number];

export type RecordIdentitySequenceOutcome =
  | 'PRESERVED'
  | 'DUPLICATE_IDENTITY_REPRODUCED'
  | 'DERIVED_RECORD_ORPHAN_REPRODUCED'
  | 'MODEL_INSUFFICIENT'
  | 'NOT_APPLICABLE';

export interface RecordIdentitySequenceResult {
  readonly sequenceId: RecordIdentitySequenceId;
  readonly outcome: RecordIdentitySequenceOutcome;
  readonly reasonCodes: readonly string[];
  readonly detail: string;
  readonly stateDigest: string | null;
}

/** A concrete synthetic key string for a shape: literals kept, variables `v`. */
export function concreteKeyForShape(shape: RecordKeyShape): string {
  return shape.atoms.map((atom) => (atom.kind === 'LITERAL' ? atom.text : 'v')).join(shape.delimiter);
}

export function runRecordIdentitySequences(
  contract: RecordIdentityContract,
  functions: readonly RecordIdentityFunctionFacts[],
): readonly RecordIdentitySequenceResult[] {
  const shapes = functions.flatMap((facts) => facts.shapes.map((entry) => entry.shape));
  const distinctShapes = [...new Map(shapes.map((shape) => [concreteKeyForShape(shape), shape])).values()];
  const guardPresent = functions.some((facts) => facts.conditionalGuard === 'PRESENT');
  const totalDeletes = functions.reduce((sum, facts) => sum + facts.operations.deletes, 0);
  const totalWrites = functions.reduce((sum, facts) => sum + facts.operations.creates + facts.operations.updates, 0);
  const results: RecordIdentitySequenceResult[] = [];

  // --- A: dual physical shapes for one logical identity ---------------------
  if (contract.expectedLifecycle === 'CREATE_ONCE_THEN_IDENTITY_STABLE') {
    if (distinctShapes.length >= 2 && contract.consistencyModel === 'EVENTUAL_READ_THEN_UNCONDITIONAL_WRITE') {
      const store = createSyntheticStore();
      store.put(concreteKeyForShape(distinctShapes[0]!), 'record-1');
      store.put(concreteKeyForShape(distinctShapes[1]!), 'record-2');
      results.push({
        sequenceId: 'A',
        outcome: 'DUPLICATE_IDENTITY_REPRODUCED',
        reasonCodes: guardPresent ? ['DUAL_PHYSICAL_SHAPES'] : ['DUAL_PHYSICAL_SHAPES', 'UNCONDITIONAL_WRITE_MODEL'],
        detail: `two distinct physical key shapes (${distinctShapes.length} extracted) for one declared logical identity under the declared eventual model; ${guardPresent ? 'a guard on distinct keys cannot block the competing shape' : 'no conditional guard'}`,
        stateDigest: syntheticStoreDigest(store),
      });
    } else if (distinctShapes.length >= 2 && contract.consistencyModel === 'CONDITIONAL_CREATE') {
      const store = createSyntheticStore();
      store.put('canonical', 'record-1');
      const second = store.put('canonical', 'record-2', { conditionalCreate: true });
      results.push({
        sequenceId: 'A',
        outcome: second ? 'DUPLICATE_IDENTITY_REPRODUCED' : 'PRESERVED',
        reasonCodes: second ? ['DUAL_PHYSICAL_SHAPES', 'UNCONDITIONAL_WRITE_MODEL'] : [],
        detail: second
          ? 'declared conditional-create model accepted a second write to the canonical key'
          : 'declared conditional-create model refuses the second write to the canonical key',
        stateDigest: syntheticStoreDigest(store),
      });
    } else {
      results.push({
        sequenceId: 'A',
        outcome: 'PRESERVED',
        reasonCodes: [],
        detail: distinctShapes.length === 0
          ? 'no key shapes extracted for the declared create-once lifecycle'
          : 'a single physical key shape for the declared logical identity',
        stateDigest: null,
      });
    }
  } else {
    results.push({ sequenceId: 'A', outcome: 'NOT_APPLICABLE', reasonCodes: [], detail: 'lifecycle is not CREATE_ONCE_THEN_IDENTITY_STABLE', stateDigest: null });
  }

  // --- B1: cascade completeness on delete/recreate --------------------------
  if (contract.expectedLifecycle === 'CREATE_UPDATE_DELETE_RECREATE') {
    const derived = contract.derivedRecordCount;
    if (contract.consistencyModel !== 'DELETE_CASCADE_EXPECTED') {
      results.push({ sequenceId: 'B1', outcome: 'NOT_APPLICABLE', reasonCodes: [], detail: 'consistency model is not DELETE_CASCADE_EXPECTED', stateDigest: null });
    } else if (totalDeletes >= 1 + derived && derived > 0) {
      const store = createSyntheticStore();
      store.put('parent', 'parent');
      for (let index = 0; index < derived; index += 1) store.put(`derived-${index}`, 'derived');
      store.delete('parent');
      for (let index = 0; index < derived; index += 1) store.delete(`derived-${index}`);
      results.push({
        sequenceId: 'B1',
        outcome: store.size() === 0 ? 'PRESERVED' : 'DERIVED_RECORD_ORPHAN_REPRODUCED',
        reasonCodes: store.size() === 0 ? [] : ['DERIVED_CLEANUP_INCOMPLETE'],
        detail: `declared ${derived} derived record(s); ${totalDeletes} delete operation(s) extracted; sequential cascade removed ${1 + derived - store.size()} of ${1 + derived}`,
        stateDigest: syntheticStoreDigest(store),
      });
    } else if (totalDeletes < 1 + derived) {
      const store = createSyntheticStore();
      store.put('parent', 'parent');
      for (let index = 0; index < derived; index += 1) store.put(`derived-${index}`, 'derived');
      store.delete('parent');
      for (let index = 0; index < Math.max(0, totalDeletes - 1); index += 1) store.delete(`derived-${index}`);
      results.push({
        sequenceId: 'B1',
        outcome: 'DERIVED_RECORD_ORPHAN_REPRODUCED',
        reasonCodes: ['DERIVED_CLEANUP_INCOMPLETE'],
        detail: `declared ${derived} derived record(s) but only ${totalDeletes} delete operation(s) extracted: ${store.size()} record(s) survive the parent deletion`,
        stateDigest: syntheticStoreDigest(store),
      });
    } else {
      results.push({ sequenceId: 'B1', outcome: 'MODEL_INSUFFICIENT', reasonCodes: ['MISSING_DERIVED_MODEL'], detail: 'no derived records declared for the delete/recreate lifecycle', stateDigest: null });
    }
  } else {
    results.push({ sequenceId: 'B1', outcome: 'NOT_APPLICABLE', reasonCodes: [], detail: 'lifecycle is not CREATE_UPDATE_DELETE_RECREATE', stateDigest: null });
  }

  // --- B2: derived orphan under declared best-effort failure ----------------
  if (contract.expectedLifecycle === 'CREATE_UPDATE_DELETE_RECREATE' && contract.failureSemantics === 'BEST_EFFORT_WARNING') {
    if (totalDeletes >= 1 && contract.derivedRecordCount >= 1) {
      const store = createSyntheticStore();
      store.put('parent', 'parent');
      for (let index = 0; index < contract.derivedRecordCount; index += 1) store.put(`derived-${index}`, 'derived');
      store.delete('parent');
      const firstDerived = store.delete('derived-0', { fail: true });
      const remaining = store.snapshot();
      results.push({
        sequenceId: 'B2',
        outcome: firstDerived ? 'PRESERVED' : 'DERIVED_RECORD_ORPHAN_REPRODUCED',
        reasonCodes: firstDerived ? [] : ['BEST_EFFORT_CLEANUP_FAILURE'],
        detail: firstDerived
          ? 'injected cleanup failure did not reproduce an orphan'
          : `one cleanup delete failed and was tolerated (declared BEST_EFFORT_WARNING): ${remaining.length} record(s) survive the parent deletion`,
        stateDigest: syntheticStoreDigest(store),
      });
    } else {
      results.push({ sequenceId: 'B2', outcome: 'NOT_APPLICABLE', reasonCodes: [], detail: 'no deletes or no derived records declared', stateDigest: null });
    }
  } else {
    results.push({ sequenceId: 'B2', outcome: 'NOT_APPLICABLE', reasonCodes: [], detail: 'failure semantics are not BEST_EFFORT_WARNING', stateDigest: null });
  }

  // --- C: read-dedup + competing unconditional writes ------------------------
  if (contract.consistencyModel === 'EVENTUAL_READ_THEN_UNCONDITIONAL_WRITE') {
    const keys = distinctShapes.length >= 2
      ? [concreteKeyForShape(distinctShapes[0]!), concreteKeyForShape(distinctShapes[1]!)]
      : [concreteKeyForShape(distinctShapes[0] ?? { delimiter: ':', atoms: [] }), concreteKeyForShape(distinctShapes[0] ?? { delimiter: ':', atoms: [] })];
    const store = createSyntheticStore();
    const firstRead = store.get(keys[0]!);
    const secondRead = store.get(keys[1]!);
    const dedupMiss = firstRead === null && secondRead === null;
    const firstWrite = store.put(keys[0]!, 'writer-1');
    const guardedSameKey = guardPresent && keys[0] === keys[1];
    const secondWrite = store.put(keys[1]!, 'writer-2', { conditionalCreate: guardedSameKey });
    const duplicate = dedupMiss && firstWrite && secondWrite && keys[0] !== keys[1];
    results.push({
      sequenceId: 'C',
      outcome: duplicate ? 'DUPLICATE_IDENTITY_REPRODUCED' : 'PRESERVED',
      reasonCodes: duplicate ? ['UNCONDITIONAL_WRITE_MODEL'] : [],
      detail: totalWrites === 0
        ? 'no create/update operations extracted; the declared concurrency model has no write to interleave'
        : duplicate
          ? 'both writers saw a dedup miss and both unconditional writes landed under distinct keys'
          : guardedSameKey
            ? 'the declared guard refuses the second write to the canonical key'
            : 'the declared guard or a single key prevents the competing write',
      stateDigest: syntheticStoreDigest(store),
    });
  } else {
    results.push({ sequenceId: 'C', outcome: 'NOT_APPLICABLE', reasonCodes: [], detail: 'consistency model is not EVENTUAL_READ_THEN_UNCONDITIONAL_WRITE', stateDigest: null });
  }

  return results;
}
