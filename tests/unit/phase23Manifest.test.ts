import { test, expect } from '@playwright/test';
import {
  PHASE23_MANIFEST_VERSION,
  createPhase23Manifest,
  simulatePhase23DevAcceptance,
  validatePhase23Manifest,
  type Phase23ManifestTarget,
} from '../../src/core/phase23/manifest';

const HEAD = 'a'.repeat(40);
const GATE_DIGEST = 'sha256:' + 'b'.repeat(64);
const RECEIPT_DIGEST = 'receipt:sha256:' + 'c'.repeat(24);

function target(targetId: string, priority: number): Phase23ManifestTarget {
  return {
    targetId,
    product: 'ripple',
    productSurfaceId: `${targetId}-surface`,
    journeyOrApiAdapter: `${targetId}-adapter`,
    expectationId: `${targetId}-expectation`,
    projectionId: `${targetId}-projection`,
    runtimeAdapterId: `${targetId}-runtime`,
    source: { repoId: 'mobingilabs/ripple-api', sha: 'd'.repeat(40), evidenceDigest: `ev:sha256:${String(priority).padStart(24, '0')}` },
    materialClass: 'COLLECTION',
    anticipatedInvariantCount: priority,
    replay: { firstCount: 1, maxAdditionalContexts: 1, freshContext: true },
    privacy: { rawValuesPersisted: false, rawDomPersisted: false, screenshotsPersisted: false, tracesPersisted: false },
    observation: { mutationAllowed: false, dynamicTargetDiscovery: false },
  };
}

function build(receiptDigest = RECEIPT_DIGEST) {
  return createPhase23Manifest({
    nightwatchSha: HEAD,
    qualityGate: {
      receiptSchemaVersion: 'nightwatch.quality-gate-receipt.v1',
      receiptDigest,
      gateDefinitionDigest: GATE_DIGEST,
      gitHead: HEAD,
      finalResult: 'PASS',
    },
    targets: [target('ripple.common-exchange.read', 1), target('ripple.payer-exchange.read', 2), target('ripple.account-inventory.read', 3)],
    exclusions: [{ targetId: 'ripple.billing-groups.read', reasonCode: 'SYNTHETIC_ONLY' }],
  });
}

test.describe('Phase 23 fresh DEV manifest and no-contact dry run', () => {
  test('creates a new v2 identity with exact head, source, and quality-gate bindings', () => {
    const manifest = build();
    expect(manifest.schemaVersion).toBe(PHASE23_MANIFEST_VERSION);
    expect(manifest.nightwatchSha).toBe(HEAD);
    expect(manifest.qualityGate.gateDefinitionDigest).toBe(GATE_DIGEST);
    expect(manifest.targets).toHaveLength(3);
    expect(() => validatePhase23Manifest(manifest)).not.toThrow();
  });

  test('a changed gate receipt creates a new manifest identity', () => {
    expect(build('receipt:sha256:' + 'f'.repeat(24)).manifestId).not.toBe(build().manifestId);
    expect(build('receipt:sha256:' + 'f'.repeat(24)).deterministicDigest).not.toBe(build().deterministicDigest);
  });

  test('dry run is exactly one FIRST plus one replay per target and never contacts anything', () => {
    const result = simulatePhase23DevAcceptance(build());
    expect(result).toMatchObject({
      schemaVersion: 'nightwatch.dev-semantic-acceptance-dry-run.v2',
      targetCount: 3,
      firstPlanCount: 3,
      replayPlanCount: 3,
      totalContexts: 6,
      externalContactCount: 0,
      mutationCount: 0,
      rawPersistenceCount: 0,
      privacyPassed: true,
      containmentPassed: true,
      result: 'PASS',
    });
  });

  test('the historical Phase 22 schema is not accepted as a Phase 23 manifest', () => {
    expect(() => validatePhase23Manifest({ schemaVersion: 'nightwatch.dev-semantic-acceptance-manifest.v1' } as never)).toThrow(/PHASE23_MANIFEST_INVALID/);
  });

  test('target and context bounds are fail-closed', () => {
    expect(() => createPhase23Manifest({
      nightwatchSha: HEAD,
      qualityGate: build().qualityGate,
      targets: [target('one', 1), target('two', 2), target('three', 3), target('four', 4)],
      exclusions: [],
    })).toThrow(/TARGET_BOUND/);
  });
});
