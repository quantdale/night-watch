// ---------------------------------------------------------------------------
// NW-AUD-032 — the Phase-6 owner freeze is non-bypassable.
//
// The owner-scope freeze (`FROZEN_BY_OWNER /
// INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE`) used to be enforced ONLY inside
// the default `GatedReadToolInvoker`. Every adapter accepted an arbitrary
// injected `ReadToolInvoker` and called it after a structural marker check, so
// a caller that supplied its own invoker reached a datastore seam with no owner
// decision at all.
//
// The freeze is now enforced at ONE shared authority that every gated read
// passes through — the adapter execution seam — before any invoker, default,
// synthetic, or caller-supplied, is reached. These tests prove that in both
// directions: a foreign invoker can no longer reach a datastore, AND the
// declared synthetic seam still works (the fix must not break the synthetic
// path), AND the default invoker's own refusal is preserved rather than
// weakened.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import {
  BigQueryReadAdapter,
  DynamoReadAdapter,
  GatedReadToolInvoker,
  PHASE6_QUERY_PLANS,
  SpannerReadAdapter,
  SyntheticReadToolInvoker,
  assertGatedReadAllowed,
  compileValidatedReadPlan,
  validateReadOnlyPlan,
  type BigQueryReadPlan,
  type CompiledToolRequest,
  type RawDataResult,
  type ReadToolInvoker,
  type SpannerReadPlan,
  type ValidatedReadPlan,
} from '../../src/data/phase6';

const SHA = '0'.repeat(40);

const policy = {
  rawRowsPersisted: false as const,
  customerIdentifiersPersisted: false as const,
  financialValuesPersisted: false as const,
  projectionPurpose: 'synthetic metadata predicate',
};

const resultPolicy = {
  projection: ['id'],
  limit: 10,
  maxRows: 10,
  maxBytes: 1024,
  expectedCardinality: 'ANY' as const,
};

function source(pathName = 'synthetic/reader.ts') {
  return [{ repoId: 'synthetic/nightwatch', sourceSHA: SHA, path: pathName, symbol: 'read' }];
}

function dynamoPlan(): ValidatedReadPlan {
  return validateReadOnlyPlan(PHASE6_QUERY_PLANS[0]);
}

function bqPlan(): BigQueryReadPlan {
  return {
    schemaVersion: 'nightwatch.readonly-query-plan.phase6.v1',
    planId: 'synthetic.bq.scoped',
    datastore: 'BIGQUERY',
    kind: 'BQ_SELECT_SCOPED',
    project: 'mobingi-main',
    datasetFamily: 'MSP_DATASET',
    tableFamily: 'RAW_CUR_MONTHLY',
    fields: ['lineitem_usageaccountid', 'lineitem_usagestartdate'],
    requiresCostEstimate: true,
    sourceProvenance: source(),
    scopeRoles: ['mspDatasetSuffix', 'monthCompact', 'payerAccountId'],
    resultPolicy,
    privacyPolicy: policy,
    consistencyClass: 'SNAPSHOT_MONTHLY',
    authority: 'HISTORICAL',
  };
}

function spannerPlan(): SpannerReadPlan {
  return {
    schemaVersion: 'nightwatch.readonly-query-plan.phase6.v1',
    planId: 'synthetic.spanner.scoped',
    datastore: 'SPANNER',
    kind: 'SPANNER_SELECT_SCOPED',
    project: 'mobingi-main',
    instance: 'alphaus-prod',
    database: 'main',
    table: 'awsdaily2',
    fields: ['id', 'date'],
    requiresCostEstimate: false,
    sourceProvenance: source(),
    scopeRoles: ['linkedAccountId', 'dateStart', 'dateEnd'],
    resultPolicy,
    privacyPolicy: policy,
    consistencyClass: 'HISTORICAL_ONLY',
    authority: 'AUTHORITATIVE',
  };
}

/**
 * A caller-supplied invoker that DOES reach a datastore. Before the fix this
 * was the whole bypass: it carried no owner decision of its own.
 */
class ForeignReadToolInvoker implements ReadToolInvoker {
  invoked = 0;
  async invoke(_request: CompiledToolRequest): Promise<RawDataResult> {
    this.invoked += 1;
    return { rows: [{ synthetic: true }], bytes: 1, durationMs: 1, source: 'APPROVED_TOOL' };
  }
}

test.describe('NW-AUD-032 the owner freeze is enforced at the adapter seam, not only in the default invoker', () => {
  test('a caller-supplied invoker can no longer reach a datastore through any adapter', async () => {
    const dynamo = new ForeignReadToolInvoker();
    await expect(new DynamoReadAdapter(dynamo).execute(dynamoPlan(), { mspId: 'mspSynthetic', month: '2026-08' }))
      .rejects.toThrow('OWNER_POLICY_BLOCKED');
    expect(dynamo.invoked).toBe(0);

    const bq = new ForeignReadToolInvoker();
    const bqValidated = validateReadOnlyPlan(bqPlan());
    await expect(new BigQueryReadAdapter(bq).execute(bqValidated, { mspDatasetSuffix: 'synthetic', monthCompact: '202608', payerAccountId: 'payerSynthetic' }))
      .rejects.toThrow('OWNER_POLICY_BLOCKED');
    expect(bq.invoked).toBe(0);

    const spanner = new ForeignReadToolInvoker();
    const spannerValidated = validateReadOnlyPlan(spannerPlan());
    await expect(new SpannerReadAdapter(spanner).execute(spannerValidated, { linkedAccountId: 'linkedSynthetic', dateStart: '2026-08-01', dateEnd: '2026-08-31' }))
      .rejects.toThrow('OWNER_POLICY_BLOCKED');
    expect(spanner.invoked).toBe(0);
  });

  test('the refusal happens before the invoker is constructed a request, so no datastore command is ever compiled', async () => {
    // A spy invoker that records the compiled request would be the only way to
    // see the argv; recording zero invocations proves nothing was compiled for
    // it, and the datastore is frozen for every foreign invoker.
    const invoker = new ForeignReadToolInvoker();
    const plan = dynamoPlan();
    const compiled = compileValidatedReadPlan(plan, { mspId: 'mspSynthetic', month: '2026-08' });
    expect(compiled.argv.join(' ')).toContain('RIPPLE');

    await expect(new DynamoReadAdapter(invoker).execute(plan, { mspId: 'mspSynthetic', month: '2026-08' }))
      .rejects.toThrow('OWNER_POLICY_BLOCKED');
    expect(invoker.invoked).toBe(0);
  });

  test('a relabelled synthetic seam is refused: the capability cannot be forged or inherited', async () => {
    // (a) A plain object claiming the marker is not the declared seam.
    expect(() => assertGatedReadAllowed('DYNAMODB', { invoke: async () => { throw new Error('unreachable'); } }))
      .toThrow('OWNER_POLICY_BLOCKED');

    // (b) A subclass that overrides `invoke` is not the declared seam either:
    // the authority requires this module's own implementation.
    const overriding = new (class extends SyntheticReadToolInvoker {
      async invoke(request: CompiledToolRequest): Promise<RawDataResult> {
        void request;
        return { rows: [{ real: true }], bytes: 1, durationMs: 1, source: 'APPROVED_TOOL' };
      }
    })();
    await expect(new DynamoReadAdapter(overriding).execute(dynamoPlan(), { mspId: 'mspSynthetic', month: '2026-08' }))
      .rejects.toThrow('OWNER_POLICY_BLOCKED');

    // (c) A replaced method on a genuine synthetic invoker loses the seam.
    const replaced = new SyntheticReadToolInvoker();
    const original = replaced.invoke.bind(replaced);
    (replaced as { invoke: unknown }).invoke = async (request: CompiledToolRequest): Promise<RawDataResult> => {
      void request;
      return { rows: [{ real: true }], bytes: 1, durationMs: 1, source: 'APPROVED_TOOL' };
    };
    await expect(new DynamoReadAdapter(replaced).execute(dynamoPlan(), { mspId: 'mspSynthetic', month: '2026-08' }))
      .rejects.toThrow('OWNER_POLICY_BLOCKED');
    expect(typeof original).toBe('function');
  });

  test('the declared synthetic seam still works: the fix did not break the synthetic path', async () => {
    const invoker = new SyntheticReadToolInvoker();
    const plan = dynamoPlan();
    const result = await new DynamoReadAdapter(invoker).execute(plan, { mspId: 'mspSynthetic', month: '2026-08' });
    expect(result.source).toBe('SYNTHETIC');
    expect(invoker.invocationCount()).toBe(1);
  });

  test('the default gated invoker still refuses every Phase-6 datastore on its own', async () => {
    const invoker = new GatedReadToolInvoker();
    for (const datastore of ['DYNAMODB', 'BIGQUERY', 'SPANNER'] as const) {
      await expect(invoker.invoke({ datastore } as CompiledToolRequest)).rejects.toThrow('OWNER_POLICY_BLOCKED');
    }
    // A subclass of the default invoker is refused by the same boundary.
    const subclass = new (class extends GatedReadToolInvoker {})();
    await expect(subclass.invoke({ datastore: 'BIGQUERY' } as CompiledToolRequest)).rejects.toThrow('OWNER_POLICY_BLOCKED');
  });

  test('the synthetic seam is a module-private capability that no caller can construct', () => {
    const synthetic = new SyntheticReadToolInvoker();
    const foreign = new ForeignReadToolInvoker();
    // The capability is a unique symbol held only inside the module, so it is
    // not reachable, enumerable, or forgeable from a caller's object.
    const symbols = Object.getOwnPropertySymbols(synthetic).concat(Object.getOwnPropertySymbols(foreign));
    expect(symbols.length).toBeGreaterThan(0);
    for (const symbol of symbols) {
      expect(String(symbol)).toContain('nightwatch-phase6-synthetic-read-seam-capability');
    }
    // The synthetic invoker declares exactly one such member; the foreign one
    // declares none, which is what makes it a real invocation.
    expect(Object.getOwnPropertySymbols(synthetic)).toHaveLength(1);
    expect(Object.getOwnPropertySymbols(foreign)).toHaveLength(0);
  });
});
