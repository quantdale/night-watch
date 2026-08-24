import { expect, test } from '@playwright/test';
import {
  PHASE22_REQUIRED_PREFLIGHT_CHECKS,
  PHASE22_REPLAY_OUTCOMES,
  buildPhase22CalibrationMetrics,
  calculatePhase22RealConfidence,
  classifyPhase22DifferentialEligibility,
  classifyPhase22Eligibility,
  classifyPhase22SourceFreshness,
  classifyPhase22SyntheticToReal,
  createFrozenPhase22Manifest,
  createPhase22PreflightReceipt,
  createPhase22RealAcceptanceDossier,
  decidePhase22RealMinimization,
  guardPhase22SafeObservation,
  simulatePhase22DevAcceptance,
  type Phase22ManifestTarget,
} from '../../src/core/phase22';
import { assertPhase22NoRawArtifactFields } from '../../src/core/phase22/privacy';

const source = {
  repoId: 'mobingilabs/ripple-api',
  sha: 'a'.repeat(40),
  evidenceDigest: 'ev:sha256:' + 'b'.repeat(24),
} as const;

function target(targetId: string, materialClass: Phase22ManifestTarget['materialClass'], historicalDevEvidence = false): Phase22ManifestTarget {
  return {
    targetId,
    product: 'ripple',
    journeyOrApiAdapter: `adapter:${targetId}`,
    semanticContractId: `${targetId}.real-source-collection`,
    expectationId: `${targetId}.real-source-collection`,
    source,
    projectionIdentity: 'proj:sha256:' + 'c'.repeat(24),
    differentialPairId: null,
    replay: {
      required: true,
      maxAdditionalContexts: 1,
      freshContext: true,
      allowedOutcomes: PHASE22_REPLAY_OUTCOMES,
    },
    observation: {
      allowedObservationClass: 'READ_ONLY_API_AND_BROWSER',
      mutationAllowed: false,
      maxFirstObservations: 1,
      maxReplayObservations: 1,
      dynamicTargetDiscovery: false,
    },
    anticipatedInvariantCount: 4,
    requiredPreflightChecks: PHASE22_REQUIRED_PREFLIGHT_CHECKS,
    materialClass,
    historicalDevEvidence,
    selectionPriority: 10,
  };
}

function eligible(targetId: string, materialClass: Phase22ManifestTarget['materialClass'], historical = false) {
  return {
    target: target(targetId, materialClass, historical),
    eligibility: classifyPhase22Eligibility({
      targetId,
      facts: {
        hasMechanicalRealSourceProof: true,
        sourceFreshness: 'CURRENT_EXACT',
        runtimeBindingAvailable: true,
        runtimeBindingCurrent: true,
        projectionAvailable: true,
        replaySupported: true,
        mutationRequired: false,
        devHostAllowlisted: true,
        authorityAllowed: true,
        targetApprovedReadOnly: true,
      },
    }),
  };
}

test.describe('Phase 22 contained DEV calibration core', () => {
  test('classifies source, runtime, authority and differential states fail closed', () => {
    expect(classifyPhase22Eligibility({ targetId: 'synthetic.target', facts: {
      hasMechanicalRealSourceProof: false,
      sourceFreshness: 'CURRENT_EXACT',
      runtimeBindingAvailable: true,
      runtimeBindingCurrent: true,
      projectionAvailable: true,
      replaySupported: true,
      mutationRequired: false,
      devHostAllowlisted: true,
      authorityAllowed: true,
      targetApprovedReadOnly: true,
    } }).state).toBe('SYNTHETIC_ONLY');
    expect(classifyPhase22Eligibility({ targetId: 'real.target', facts: {
      hasMechanicalRealSourceProof: true,
      sourceFreshness: 'SOURCE_CHANGED_SEMANTICS_UNCHANGED',
      runtimeBindingAvailable: true,
      runtimeBindingCurrent: false,
      projectionAvailable: true,
      replaySupported: true,
      mutationRequired: false,
      devHostAllowlisted: true,
      authorityAllowed: true,
      targetApprovedReadOnly: true,
    } }).state).toBe('REAL_SOURCE_RUNTIME_BINDING_STALE');
    expect(classifyPhase22DifferentialEligibility({
      targetId: 'real.target',
      secondSurfacePresent: false,
      secondSurfaceCurrent: false,
      equivalenceMechanicallyProven: false,
      leftProjectionAvailable: true,
      rightProjectionAvailable: true,
      authorityAllowed: true,
    }).state).toBe('NO_REAL_SECOND_SURFACE');
  });

  test('distinguishes exact, changed-but-rederived, and stale source evidence', () => {
    const bound = source;
    expect(classifyPhase22SourceFreshness({ targetId: 'real.target', evidence: {
      bound,
      observed: bound,
      sourceAvailable: true,
      contractPresent: true,
      derivationSupported: true,
      derivationEvidenceMatches: true,
      semanticsUnchanged: true,
    } }).state).toBe('CURRENT_EXACT');
    expect(classifyPhase22SourceFreshness({ targetId: 'real.target', evidence: {
      bound,
      observed: { ...bound, sha: 'd'.repeat(40) },
      sourceAvailable: true,
      contractPresent: true,
      derivationSupported: true,
      derivationEvidenceMatches: true,
      semanticsUnchanged: true,
    } }).state).toBe('SOURCE_CHANGED_SEMANTICS_UNCHANGED');
    expect(classifyPhase22SourceFreshness({ targetId: 'real.target', evidence: {
      bound,
      observed: { ...bound, sha: 'd'.repeat(40), evidenceDigest: 'ev:sha256:' + 'e'.repeat(24) },
      sourceAvailable: true,
      contractPresent: true,
      derivationSupported: true,
      derivationEvidenceMatches: false,
      semanticsUnchanged: false,
    } }).state).toBe('CONTRACT_CHANGED');
  });

  test('freezes a diverse manifest and dry-runs within the exact bound', () => {
    const candidates = [
      eligible('real.collection', 'COLLECTION', true),
      eligible('real.membership', 'MEMBERSHIP'),
      eligible('real.relation', 'RELATIONAL'),
      eligible('real.differential', 'DIFFERENTIAL'),
      eligible('real.shape', 'SHAPE'),
      eligible('real.protocol', 'PROTOCOL'),
      {
        target: target('blocked.target', 'SHAPE'),
        eligibility: classifyPhase22Eligibility({ targetId: 'blocked.target', facts: {
          hasMechanicalRealSourceProof: true,
          sourceFreshness: 'CURRENT_EXACT',
          runtimeBindingAvailable: true,
          runtimeBindingCurrent: true,
          projectionAvailable: true,
          replaySupported: true,
          mutationRequired: true,
          devHostAllowlisted: true,
          authorityAllowed: true,
          targetApprovedReadOnly: true,
        } }),
      },
    ];
    const manifest = createFrozenPhase22Manifest({ nightwatchSha: 'f'.repeat(40), candidates });
    expect(manifest.targets).toHaveLength(6);
    expect(manifest.targets.map((item) => item.materialClass)).toEqual(['COLLECTION', 'MEMBERSHIP', 'RELATIONAL', 'DIFFERENTIAL', 'SHAPE', 'PROTOCOL']);
    expect(manifest.exclusions.find((item) => item.targetId === 'blocked.target')?.reasonCode).toBe('MUTATION_REQUIRED');
    const dryRun = simulatePhase22DevAcceptance(manifest);
    expect(dryRun.externalContact).toBe(false);
    expect(dryRun.mutationCount).toBe(0);
    expect(dryRun.observationContextCount).toBe(12);
    expect(JSON.stringify(manifest)).not.toContain('CUSTOMER_SENTINEL');
  });

  test('requires every preflight fact and emits a versioned receipt', () => {
    const facts = {
      environmentDev: true,
      productionRejected: true,
      nextRejected: true,
      l0CdpGuardActive: true,
      l1RouteGuardActive: true,
      l2WebsocketGuardActive: true,
      l3WorkerContainmentActive: true,
      l4UnroutedDetectionActive: true,
      l5LoopbackProxyActive: true,
      quicDisabled: true,
      nonProxiedWebrtcDisabled: true,
      traceDisabled: true,
      screenshotsDisabled: true,
      rawResponsePersistenceDisabled: true,
      rawDomPersistenceDisabled: true,
      mutationRegistryActive: true,
      storageStateExternal: true,
      storageStateRegularFile: true,
      storageStateNoSymlink: true,
      storageStateRestrictivePermissions: true,
      authStructurallyValid: true,
      authUnexpired: true,
      authPageReadable: true,
      sourceCurrent: true,
      expectationResolved: true,
      journeyApiAdapterCurrent: true,
      ownerPolicyAllows: true,
      noDatabaseOrInfraPath: true,
      cleanNightwatchGitState: true,
      manifestFrozen: true,
      dryRunPassed: true,
    };
    const receipt = createPhase22PreflightReceipt({
      ...facts,
      targetCount: 1,
      plannedObservationContexts: 2,
      manifestDigest: 'manifest:sha256:' + '1'.repeat(24),
    });
    expect(receipt.passed).toBe(true);
    expect(receipt.checks).toHaveLength(PHASE22_REQUIRED_PREFLIGHT_CHECKS.length);
    expect(createPhase22PreflightReceipt({ ...facts, authPageReadable: false, targetCount: 1, plannedObservationContexts: 2, manifestDigest: 'manifest:sha256:' + '1'.repeat(24) }).passed).toBe(false);
  });

  test('rejects raw observation fields and preserves categorical privacy only', () => {
    expect(guardPhase22SafeObservation({ schemaVersion: 'nightwatch.real-observation-privacy.v1', relationOutcome: 'HOLDS', inspectedItemCount: 3 }).relationOutcome).toBe('HOLDS');
    expect(() => guardPhase22SafeObservation({ schemaVersion: 'nightwatch.real-observation-privacy.v1', rawValue: 'CUSTOMER_SENTINEL' })).toThrow('PHASE22_PRIVACY_REJECTED');
    expect(() => guardPhase22SafeObservation({ schemaVersion: 'nightwatch.real-observation-privacy.v1', membershipOutcome: 'CUSTOMER_SENTINEL' })).toThrow('PHASE22_PRIVACY_REJECTED');
    expect(() => assertPhase22NoRawArtifactFields({ setMembers: ['synthetic-member'] })).toThrow('PHASE22_PRIVACY_REJECTED');
  });

  test('calibrates confidence only from real evidence and records bounded metrics', () => {
    const blocked = calculatePhase22RealConfidence({
      firstRunEvidence: true,
      sourceCurrent: false,
      expectationResolved: false,
      replayOutcome: 'REPRODUCED_EXACT',
      semanticIdentityStable: true,
      repeatStability: 'DETERMINISTIC',
      minimizationProof: 'SEMANTIC_FIXED_POINT',
      oracleAuthoritative: true,
      benignControlPassed: true,
      evidenceComplete: true,
      privacyPassed: true,
      protocolPassed: true,
      preconditionStable: true,
    });
    expect(blocked.confidence).toBe('UNCONFIRMED');
    expect(classifyPhase22SyntheticToReal({ sourceCurrent: true, expectationResolved: true, projectionAvailable: true, contractApplicable: true, contractSatisfied: true, observedBroader: false, observedNarrower: false, semanticMismatch: false, evidenceComplete: true })).toBe('SYNTHETIC_MODEL_CALIBRATED');
    const result = {
      targetId: 'real.collection',
      expectationId: 'real.collection.expectation',
      materialClass: 'COLLECTION' as const,
      collectionEvaluated: true,
      membershipEvaluated: false,
      sourceCurrent: true,
      expectationResolved: true,
      firstOutcome: 'PASS' as const,
      replayOutcome: 'REPRODUCED_EXACT' as const,
      semanticDeterministic: true,
      differentialOutcome: null,
      coverage: 'FULL' as const,
      projectionSucceeded: true,
      privacyPassed: true,
      protocolPassed: true,
      findingCount: 0,
      calibration: 'SYNTHETIC_MODEL_CALIBRATED' as const,
      confidence: 'MEDIUM' as const,
    };
    const metrics = buildPhase22CalibrationMetrics({ targetsConsidered: 1, targetsEligible: 1, targetsAdmitted: 1, results: [result], privacyEvents: 0, safetyEvents: 0 });
    expect(metrics.collectionEvaluations).toBe(1);
    expect(metrics.exactReproductions).toBe(1);
  });

  test('keeps real minimization safe and dossier output sanitized', () => {
    expect(decidePhase22RealMinimization({ originalReadOnlyStepCount: 4, minimizedReadOnlyStepCount: 3, addedRequestCount: 0, mutationCount: 0, requiredPreconditionsPreserved: true }).outcome).toBe('REAL_MINIMIZATION_AUTHORIZED');
    expect(decidePhase22RealMinimization({ originalReadOnlyStepCount: 4, minimizedReadOnlyStepCount: 3, addedRequestCount: 1, mutationCount: 0, requiredPreconditionsPreserved: true }).outcome).toBe('REAL_MINIMIZATION_NOT_AUTHORIZED');
    const manifestTarget = target('real.collection', 'COLLECTION');
    const dossier = createPhase22RealAcceptanceDossier({
      target: manifestTarget,
      source,
      productSurfaceId: 'ripple-common-exchange-read',
      semanticRelation: 'COLLECTION_CONTRACT',
      firstResult: 'PASS',
      replayResult: 'REPRODUCED_EXACT',
      differentialResult: null,
      coverage: 'FULL',
      confidence: 'MEDIUM',
      findingCount: 0,
      privacyReceiptId: 'receipt:sha256:' + '2'.repeat(24),
      limitations: ['NO_PRODUCT_CORRECTNESS_CLAIM', 'BOUNDED_TARGET_SET'],
      recommendedHumanFollowUp: 'OWNER_REVIEW_IF_ANOMALY',
    });
    expect(dossier.mode).toBe('CAMPAIGN_ACCEPTANCE_SUMMARY');
    expect(JSON.stringify(dossier)).not.toContain('CUSTOMER_SENTINEL');
  });
});
