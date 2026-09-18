import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildPhase24NoContactRehearsal,
  classifyPhase24Replay,
  createPhase24Dossier,
  createPhase24Manifest,
  createPhase24ReplayPlan,
  createPhase24SemanticExpectation,
  evaluatePhase24SemanticExpectation,
  routePhase24OwnerProvenance,
  validatePhase24Dossier,
  validatePhase24Manifest,
  validatePhase24NoContactRehearsal,
  validatePhase24ReplayPlan,
} from '../../src/core/phase24';
import { createSiblingSourceAccess } from '../../src/core/source/siblingSource';
import { createRealSourceScanConfig } from '../../src/core/source/scan';
import { analyzeSourceSurfacesIntoPhase24, discoverSourceSurfaces } from '../../src/core/source/surfaces';
import { PIPELINE_DEFAULT_CONFIG_LINES, installReadOnlyPipeline } from '../helpers/phpPipelineFixture';
import { PHASE5_SOURCE_SHAS } from '../../src/api/phase5/catalog';

/**
 * The fixture repository stands in for source AT THE CURRENTLY ADMITTED
 * snapshot, so its SHA comes from the one current-source authority. As a
 * literal it was a second authority: when the admitted snapshot moved, the
 * runtime binding reported SOURCE_VERSION_MISMATCH for drift that did not
 * exist, and every derived candidate became ineligible.
 */
const SOURCE_SHA = PHASE5_SOURCE_SHAS.rippleApi;

function setup(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-phase25-campaign-'));
  const repo = path.join(root, 'mobingilabs', 'ripple-api');
  const git = path.join(repo, '.git');
  fs.mkdirSync(path.join(git, 'refs', 'heads'), { recursive: true });
  fs.writeFileSync(path.join(git, 'HEAD'), 'ref: refs/heads/main\n');
  fs.writeFileSync(path.join(git, 'refs', 'heads', 'main'), `${SOURCE_SHA}\n`);
  fs.mkdirSync(path.join(repo, 'src', 'App', 'Route', 'Config'), { recursive: true });
  fs.mkdirSync(path.join(repo, 'src', 'App', 'Handler'), { recursive: true });
  fs.mkdirSync(path.join(repo, 'src', 'App', 'Schema'), { recursive: true });
  installReadOnlyPipeline(repo);
  fs.writeFileSync(path.join(repo, 'src', 'App', 'Route', 'Config', 'Routing.yaml'), [
    ...PIPELINE_DEFAULT_CONFIG_LINES,
    '"get:/accts":',
    '  client: App\\Handler\\Account',
    '  method: getAccountVendor',
    '  request: src/App/Schema/AccountRequest.json',
    '  response: src/App/Schema/AccountResponse.json',
    '"post:/accts":',
    '  client: App\\Handler\\Account',
    '  method: updateAccount',
    '',
  ].join('\n'));
  fs.writeFileSync(path.join(repo, 'src', 'App', 'Handler', 'Account.php'), `<?php
function getAccountVendor($source) {
  $res[] = ['id' => 1, 'status' => 'safe'];
  return $res;
}
`);
  fs.writeFileSync(path.join(repo, 'src', 'App', 'Schema', 'AccountRequest.json'), '{"type":"object","properties":{"page":{"type":"integer"}}}\n');
  fs.writeFileSync(path.join(repo, 'src', 'App', 'Schema', 'AccountResponse.json'), '{"type":"array","items":{"type":"object"}}\n');
  return root;
}

function config() {
  return createRealSourceScanConfig({
    runtimeMappingNamespace: 'ripple',
    approvedRepositories: [{ repoId: 'mobingilabs/ripple-api', expectedSourceSha: SOURCE_SHA, allowlistedRoots: ['src'], allowedExtensions: ['.php', '.json', '.yaml'], maxFiles: 64, maxFileBytes: 64_000, maxTotalBytes: 1_000_000 }],
  });
}

test('Phase 25 synthetic source-to-portfolio path reaches semantic, replay, dossier, and no-contact rehearsal safely', () => {
  const root = setup();
  try {
    const access = createSiblingSourceAccess(root);
    const scanConfig = config();
    const discovery = discoverSourceSurfaces({ access, config: scanConfig });
    const integration = analyzeSourceSurfacesIntoPhase24({ access, config: scanConfig, discovery, maxCandidates: 1 });
    const candidate = integration.portfolio.candidates.find((entry) => entry.eligibility === 'ELIGIBLE');
    expect(candidate).toBeDefined();
    if (candidate === undefined || candidate.source === null || candidate.contract === null || candidate.replay === null) throw new Error('PHASE25_SYNTHETIC_ELIGIBLE_MISSING');

    const expectation = createPhase24SemanticExpectation({
      expectationId: candidate.semanticExpectationId,
      candidateId: candidate.candidateId,
      invariantId: 'invariant.phase25.source-derived',
      kind: 'TOTALS_CONTRADICTORY',
      source: candidate.source,
      contractId: candidate.contract.contractId,
      preconditions: candidate.semanticPreconditions,
      provenanceDigest: 'provenance:sha256:' + 'a'.repeat(24),
    });
    const evaluation = evaluatePhase24SemanticExpectation({ expectation, observation: { schemaVersion: 'nightwatch.phase24-safe-semantic-observation.v1', applicable: true, totals: { declaredCount: 1, observedCount: 1, totalConsistent: true } } });
    expect(evaluation.outcome).toBe('PASS');

    const replayPlan = createPhase24ReplayPlan({ candidateId: candidate.candidateId, candidateDecisionDigest: candidate.deterministicDigest, occurrenceIdentity: 'occurrence.phase25.first', source: candidate.source, semanticContractId: candidate.contract.contractId, expectationId: expectation.expectationId, sanitizedObservationDigest: 'observation:sha256:' + 'b'.repeat(24), executionPrerequisites: ['SOURCE_CURRENT', 'READ_ONLY_PROVEN'] });
    validatePhase24ReplayPlan(replayPlan);
    expect(classifyPhase24Replay({ plan: replayPlan, facts: { replayAttempted: true, sourceExact: true, semanticContractStillValid: true, authReady: false, environmentAuthorized: false, prerequisitesStable: true, sameInvariantObserved: true } }).classification).toBe('AUTH_DIVERGENCE');

    const owner = routePhase24OwnerProvenance({ owner: candidate.behaviorOwner, ownerProven: candidate.behaviorOwnerProven });
    const dossier = createPhase24Dossier({ findingKind: 'TOTALS_CONTRADICTORY', invariantId: expectation.invariantId, candidateIds: [candidate.candidateId], candidateDecisionBindings: [{ candidateId: candidate.candidateId, decisionDigest: candidate.deterministicDigest }], sourceContracts: [{ ...candidate.source, contractId: candidate.contract.contractId }], implementationFiles: candidate.relevantFiles, ownership: owner, replayClassification: 'AUTH_DIVERGENCE', minimized: false, changedAssumptionCodes: ['AUTH_NOT_READ'], discardedEvidenceCodes: ['RAW_VALUES_DISCARDED'], additionalConfirmationCode: 'OWNER_REVIEW_REQUIRED', findingCount: 0 });
    validatePhase24Dossier(dossier);

    const manifest = createPhase24Manifest({
      nightwatchSha: '9'.repeat(40),
      environment: 'DEV',
      portfolio: integration.portfolio,
      selectedCandidateIds: integration.selection.selectedCandidateIds,
      semanticExpectationDigest: 'semantic-plan:sha256:' + 'c'.repeat(24),
      replayPlanDigest: 'replay-batch:sha256:' + 'd'.repeat(24),
      containment: { version: 'containment.v2', loopbackProxyRequired: true, externalContactAllowed: false, mutationAllowed: false, rawPersistenceAllowed: false, localDestinationClass: 'OWNER_LOCAL_ONLY' },
      policy: { version: 'owner-policy.v1', digest: 'policy:sha256:' + 'e'.repeat(24), operationClass: 'READ_ONLY', ownerScopeStatus: 'FROZEN_BY_OWNER' },
      qualityGate: { receiptSchemaVersion: 'nightwatch.quality-gate-receipt.v1', receiptDigest: 'receipt:sha256:' + 'f'.repeat(24), gateDefinitionDigest: 'sha256:' + '0'.repeat(64), gitHead: '9'.repeat(40), finalResult: 'PASS' },
      operatorAuthorization: 'NOT_READ',
    });
    validatePhase24Manifest(manifest);
    const rehearsal = buildPhase24NoContactRehearsal({ manifest, portfolio: integration.portfolio });
    validatePhase24NoContactRehearsal(rehearsal);
    expect(rehearsal).toMatchObject({ externalContactCount: 0, mutationCount: 0, rawPersistenceCount: 0, result: 'PASS' });
    const persisted = JSON.stringify({ discovery, integration, expectation, evaluation, replayPlan, dossier, manifest, rehearsal });
    expect(persisted).not.toContain('$res[]');
    expect(persisted).not.toContain("'safe'");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
