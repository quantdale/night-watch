// ---------------------------------------------------------------------------
// Nightwatch C-07 — derived endpoint semantics and the DEV target funnel.
//
// The registry was intentionally empty under a rule its own header states:
// "HTTP method is not a read/write contract." C-07 derives it, and the derived
// result is zero KNOWN_READ entries — because zero operations carry an effect
// proof.
//
// The single most important assertion in this file is that 485
// `READ_ONLY_METHOD_ONLY` operations become UNKNOWN and not KNOWN_READ.
// Promoting them would produce a registry that looks productive while
// asserting a read contract from an HTTP verb, and would put 485 operations on
// a DEV work queue on the strength of the word "GET".
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  DERIVED_SEMANTIC_CLASSIFICATIONS,
  SEMANTIC_EVIDENCE_BASES,
  TARGET_REJECTION_REASONS,
  deriveEndpointSemanticRegistry,
  deriveSemantics,
  generateDevTargets,
  orderableTargets,
  type OperationSemanticInput,
} from '../../src/core/source/derivedEndpointSemantics';
import { rankByExpectedInformationGain, type EigTarget } from '../../src/core/source/expectedInformationGain';
import { classifyLiveSourceTestState } from '../helpers/liveSourceTestAuthority';

const root = path.resolve(__dirname, '..', '..');
const APPROVED_LIVE_STATE = classifyLiveSourceTestState();

const operation = (id: string, overrides: Partial<OperationSemanticInput> = {}): OperationSemanticInput => ({
  operationId: id, repository: 'mobingilabs/ripple-api', method: 'GET', routeTemplate: `/${id}`,
  readOnlyClassification: 'READ_ONLY_METHOD_ONLY', routeProof: 'PROVEN',
  runtimeBinding: 'SOURCE_ONLY', sourceSha: 'a'.repeat(40), evidenceDigest: `ev:${id}`,
  ...overrides,
});

test.describe('C-07 — the registry is derived, and every entry names its evidence', () => {
  test('an effect proof yields KNOWN_READ', () => {
    const entry = deriveSemantics(operation('a', { readOnlyClassification: 'READ_ONLY_PROVEN' }));
    expect(entry.classification).toBe('KNOWN_READ');
    expect(entry.evidenceBasis).toBe('EFFECT_CLOSURE_PROOF');
  });

  test('METHOD-ONLY evidence yields UNKNOWN, never KNOWN_READ', () => {
    // The assertion this campaign turns on. 485 real operations sit here.
    const entry = deriveSemantics(operation('a', { readOnlyClassification: 'READ_ONLY_METHOD_ONLY' }));
    expect(entry.classification).toBe('UNKNOWN');
    expect(entry.classification).not.toBe('KNOWN_READ');
    expect(entry.evidenceBasis).toBe('METHOD_ONLY_NO_EFFECT_PROOF');
  });

  test('a GET verb alone cannot produce KNOWN_READ for any repository or route', () => {
    for (const method of ['GET', 'HEAD', 'get']) {
      for (const repository of ['mobingilabs/ripple-api', 'alphauslabs/blueapi', 'mobingilabs/wave-api']) {
        const entry = deriveSemantics(operation('a', { method, repository, readOnlyClassification: 'READ_ONLY_METHOD_ONLY' }));
        expect(entry.classification).toBe('UNKNOWN');
      }
    }
  });

  test('a refuted closure yields MUTATION_CAPABLE', () => {
    const entry = deriveSemantics(operation('a', { readOnlyClassification: 'PROVEN_MUTATION_CAPABLE' }));
    expect(entry.classification).toBe('MUTATION_CAPABLE');
    expect(entry.evidenceBasis).toBe('EFFECT_CLOSURE_REFUTATION');
  });

  test('CONDITIONAL mutation is still MUTATION_CAPABLE', () => {
    // A flag that currently disables a write is not proof the write cannot
    // happen.
    const entry = deriveSemantics(operation('a', { readOnlyClassification: 'CONDITIONAL_MUTATION' }));
    expect(entry.classification).toBe('MUTATION_CAPABLE');
    expect(entry.evidenceBasis).toBe('CONDITIONAL_MUTATION_EVIDENCE');
  });

  test('an unproven route identity taints the classification', () => {
    // We do not know WHICH operation the evidence is about.
    for (const routeProof of ['AMBIGUOUS', 'UNSUPPORTED']) {
      const entry = deriveSemantics(operation('a', { routeProof, readOnlyClassification: 'READ_ONLY_PROVEN' }));
      expect(entry.classification).toBe('AMBIGUOUS');
      expect(entry.evidenceBasis).toBe('ROUTE_IDENTITY_UNPROVEN');
    }
  });

  test('an unrecognised classification fails closed to AMBIGUOUS', () => {
    const entry = deriveSemantics(operation('a', { readOnlyClassification: 'SOMETHING_NEW' as never }));
    expect(entry.classification).toBe('AMBIGUOUS');
    expect(entry.evidenceBasis).toBe('CONFLICTING_EVIDENCE');
  });

  test('every entry carries provenance, and totality holds', () => {
    const registry = deriveEndpointSemanticRegistry([operation('a'), operation('b'), operation('c')]);
    expect(registry.totalityHolds).toBe(true);
    expect(registry.entryCount).toBe(3);
    for (const entry of registry.entries) {
      expect(SEMANTIC_EVIDENCE_BASES).toContain(entry.evidenceBasis);
      expect(entry.sourceSha).toMatch(/^[0-9a-f]{40}$/);
      expect(entry.evidenceDigest.length).toBeGreaterThan(0);
    }
  });

  test('no hand-authored rule is admitted: the legacy registry stays empty', () => {
    const legacy = fs.readFileSync(path.join(root, 'src/core/safety/endpointSemantics.ts'), 'utf8');
    expect(legacy).toMatch(/RIPPLE_ENDPOINT_SEMANTIC_REGISTRY: readonly EndpointSemanticRule\[\] = \[\]/);
  });

  test('the vocabulary keeps UNKNOWN, AMBIGUOUS and UNSUPPORTED distinct', () => {
    expect([...DERIVED_SEMANTIC_CLASSIFICATIONS]).toEqual(['KNOWN_READ', 'MUTATION_CAPABLE', 'UNKNOWN', 'AMBIGUOUS', 'UNSUPPORTED']);
  });
});

test.describe('C-07 — the funnel, and generation is not execution', () => {
  const registryOf = (operations: readonly OperationSemanticInput[]) => deriveEndpointSemanticRegistry(operations);

  test('a KNOWN_READ operation is still rejected without a runtime binding', () => {
    const registry = registryOf([operation('a', { readOnlyClassification: 'READ_ONLY_PROVEN' })]);
    const funnel = generateDevTargets({ registry, admittedOperationIds: new Set(['a']) });
    expect(funnel.eligibleCount).toBe(0);
    expect(funnel.byRejectionReason.RUNTIME_BINDING_ABSENT).toBe(1);
  });

  test('a KNOWN_READ, runtime-bound operation is still rejected if the chain excludes it', () => {
    // The final word belongs to the existing admission chain, never here.
    const registry = registryOf([operation('a', { readOnlyClassification: 'READ_ONLY_PROVEN' })]);
    const funnel = generateDevTargets({
      registry, admittedOperationIds: new Set(), runtimeBoundOperationIds: new Set(['a']),
    });
    expect(funnel.eligibleCount).toBe(0);
    expect(funnel.byRejectionReason.ADMISSION_CHAIN_EXCLUDED).toBe(1);
  });

  test('an operation admitted by the chain, proven read and runtime bound, is eligible', () => {
    // Non-vacuity: the funnel CAN admit, so its zero is a measurement.
    const registry = registryOf([operation('a', { readOnlyClassification: 'READ_ONLY_PROVEN' })]);
    const funnel = generateDevTargets({
      registry, admittedOperationIds: new Set(['a']), runtimeBoundOperationIds: new Set(['a']),
    });
    expect(funnel.eligibleCount).toBe(1);
    expect(funnel.eligible[0]!.admittedByExistingChain).toBe(true);
    expect(funnel.eligible[0]!.rejectionReason).toBeNull();
  });

  test('stale source is rejected first, before any semantic verdict', () => {
    const registry = registryOf([operation('a', { readOnlyClassification: 'READ_ONLY_PROVEN' })]);
    const funnel = generateDevTargets({
      registry, admittedOperationIds: new Set(['a']),
      runtimeBoundOperationIds: new Set(['a']), staleOperationIds: new Set(['a']),
    });
    expect(funnel.eligibleCount).toBe(0);
    expect(funnel.byRejectionReason.SOURCE_STALE).toBe(1);
    expect(funnel.staleCount).toBe(1);
  });

  test('a mutation-capable operation is never eligible, whatever the chain says', () => {
    const registry = registryOf([operation('a', { readOnlyClassification: 'PROVEN_MUTATION_CAPABLE' })]);
    const funnel = generateDevTargets({
      registry, admittedOperationIds: new Set(['a']), runtimeBoundOperationIds: new Set(['a']),
    });
    expect(funnel.eligibleCount).toBe(0);
    expect(funnel.byRejectionReason.MUTATION_CAPABLE).toBe(1);
  });

  test('rejection reasons sum to the rejected count, so nothing is unattributed', () => {
    const registry = registryOf([
      operation('a', { readOnlyClassification: 'PROVEN_MUTATION_CAPABLE' }),
      operation('b', { readOnlyClassification: 'READ_ONLY_METHOD_ONLY' }),
      operation('c', { routeProof: 'AMBIGUOUS' }),
      operation('d', { readOnlyClassification: 'CONDITIONAL_MUTATION' }),
    ]);
    const funnel = generateDevTargets({ registry, admittedOperationIds: new Set() });
    const summed = Object.values(funnel.byRejectionReason).reduce((a, b) => a + b, 0);
    expect(summed).toBe(funnel.rejectedCount);
    expect(funnel.eligibleCount + funnel.rejectedCount).toBe(funnel.consideredCount);
  });

  test('generation grants no request authority', () => {
    const registry = registryOf([operation('a', { readOnlyClassification: 'READ_ONLY_PROVEN' })]);
    const funnel = generateDevTargets({
      registry, admittedOperationIds: new Set(['a']), runtimeBoundOperationIds: new Set(['a']),
    });
    expect(funnel.grantsRequestAuthority).toBe(false);
    expect(registry.grantsRequestAuthority).toBe(false);
  });

  test('every rejection reason is in the declared vocabulary', () => {
    const registry = registryOf([operation('a'), operation('b', { readOnlyClassification: 'PROVEN_MUTATION_CAPABLE' })]);
    const funnel = generateDevTargets({ registry, admittedOperationIds: new Set() });
    for (const target of funnel.rejected) expect(TARGET_REJECTION_REASONS).toContain(target.rejectionReason!);
  });

  test('the module cannot reach the filesystem, a process or the network', () => {
    const source = fs.readFileSync(path.join(root, 'src/core/source/derivedEndpointSemantics.ts'), 'utf8');
    for (const forbidden of ["from 'node:fs'", "from 'node:child_process'", "from 'node:https'", 'fetch(']) {
      expect(source).not.toContain(forbidden);
    }
  });
});

test.describe('C-07 — EIG orders admissible targets and cannot promote one', () => {
  test('only the eligible set is orderable', () => {
    const registry = deriveEndpointSemanticRegistry([
      operation('good', { readOnlyClassification: 'READ_ONLY_PROVEN' }),
      operation('bad', { readOnlyClassification: 'PROVEN_MUTATION_CAPABLE' }),
    ]);
    const funnel = generateDevTargets({
      registry, admittedOperationIds: new Set(['good', 'bad']),
      runtimeBoundOperationIds: new Set(['good', 'bad']),
    });
    const orderable = orderableTargets(funnel);
    expect(orderable.map((t) => t.operationId)).toEqual(['good']);
    // The mutation-capable one has no path to a rank, however it would score.
    expect(orderable.some((t) => t.operationId === 'bad')).toBe(false);
  });

  test('an inadmissible target with a perfect score never appears in a ranking', () => {
    // §67: EIG may choose ordering and may not override safety. A ranked list
    // is read as a work queue, so an inadmissible entry must not be in it.
    const registry = deriveEndpointSemanticRegistry([operation('bad', { readOnlyClassification: 'PROVEN_MUTATION_CAPABLE' })]);
    const funnel = generateDevTargets({ registry, admittedOperationIds: new Set(['bad']), runtimeBoundOperationIds: new Set(['bad']) });
    const perfect: EigTarget[] = orderableTargets(funnel).map((target) => ({
      targetId: target.targetId, evidenceDigest: 'ev',
      factors: {
        novelty: 'NEVER_OBSERVED', contractDepth: 'TYPE_OR_COLLECTION',
        changeRecency: 'CHANGED_IN_CURRENT_DIFF', blastRadius: 'MANY_CONSUMERS',
        cost: 'LOW', duplicateRisk: 'NO_PRIOR_FINDING',
      },
    }));
    const ranking = rankByExpectedInformationGain(perfect);
    expect(ranking.rankedCount).toBe(0);
    expect(ranking.grantsAuthority).toBe(false);
  });

  test('an empty eligible set produces an empty ranking, not an error', () => {
    const registry = deriveEndpointSemanticRegistry([operation('a')]);
    const funnel = generateDevTargets({ registry, admittedOperationIds: new Set() });
    expect(rankByExpectedInformationGain(orderableTargets(funnel).map((t) => ({
      targetId: t.targetId, evidenceDigest: 'ev',
      factors: { novelty: 'UNKNOWN', contractDepth: 'UNKNOWN', changeRecency: 'UNKNOWN', blastRadius: 'UNKNOWN', cost: 'UNKNOWN', duplicateRisk: 'UNKNOWN' },
    }))).rankedCount).toBe(0);
  });
});

test.describe('C-07 — the real population, measured', () => {
  test('the derived registry over real operations has ZERO KNOWN_READ entries', () => {
    if (APPROVED_LIVE_STATE.kind !== 'CURRENT') {
      expect(['STALE', 'UNAVAILABLE']).toContain(APPROVED_LIVE_STATE.kind);
      expect(APPROVED_LIVE_STATE.repositories.length).toBeGreaterThan(0);
      return;
    }
    // Rebuilt here rather than imported so the assertion is about the real
    // source, not about a cached number.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createSiblingSourceAccess } = require('../../src/core/source/siblingSource');
    const { createApprovedRealSourceScanConfig } = require('../../src/core/source/approvedScan');
    const { ownerApprovedRepositoryIds } = require('../../src/core/source/universe');
    const { discoverSourceSurfaces } = require('../../src/core/source/surfaces');
    const access = createSiblingSourceAccess(APPROVED_LIVE_STATE.root, { admittedRepositoryIds: ownerApprovedRepositoryIds() });
    const discovery = discoverSourceSurfaces({ access, config: createApprovedRealSourceScanConfig() });
    const registry = deriveEndpointSemanticRegistry(discovery.operations.map((o: Record<string, string>) => ({
      operationId: o.operationId, repository: o.repository, method: o.method, routeTemplate: o.routeTemplate,
      readOnlyClassification: o.readOnlyClassification, routeProof: o.routeProof,
      runtimeBinding: o.runtimeBinding, sourceSha: o.sourceSha, evidenceDigest: o.evidenceDigest,
    })));
    expect(registry.totalityHolds).toBe(true);
    expect(registry.operationCount).toBeGreaterThanOrEqual(1851);
    // The campaign's headline finding.
    expect(registry.byClassification.KNOWN_READ).toBe(0);
    expect(registry.byEvidenceBasis.EFFECT_CLOSURE_PROOF).toBe(0);
    // And the funnel therefore admits nothing.
    const funnel = generateDevTargets({ registry, admittedOperationIds: new Set() });
    expect(funnel.eligibleCount).toBe(0);
    expect(funnel.eligibleCount + funnel.rejectedCount).toBe(funnel.consideredCount);
  });
});
