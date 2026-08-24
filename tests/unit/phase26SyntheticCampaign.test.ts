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
import { phase20Inventory } from '../../corpus/phase20/contracts';
import { buildContractGraph } from '../../src/core/semanticCoverage';
import { buildSourceReviewQueue } from '../../src/core/source/review';
import { createSiblingSourceAccess } from '../../src/core/source/siblingSource';
import { createRealSourceScanConfig } from '../../src/core/source/scan';
import { analyzeSourceSurfacesIntoPhase24, discoverSourceSurfaces } from '../../src/core/source/surfaces';

const SOURCE_SHA = '27bb007ad0c798800b6bd3b29760c966422966e7';

function setup(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-phase26-campaign-'));
  const repo = path.join(root, 'mobingilabs', 'ripple-api');
  fs.mkdirSync(path.join(repo, '.git', 'refs', 'heads'), { recursive: true });
  fs.writeFileSync(path.join(repo, '.git', 'HEAD'), 'ref: refs/heads/main\n');
  fs.writeFileSync(path.join(repo, '.git', 'refs', 'heads', 'main'), `${SOURCE_SHA}\n`);
  fs.mkdirSync(path.join(repo, 'src', 'App', 'Route', 'Config'), { recursive: true });
  fs.mkdirSync(path.join(repo, 'src', 'App', 'Handler'), { recursive: true });
  fs.mkdirSync(path.join(repo, 'src', 'App', 'Schema'), { recursive: true });
  fs.writeFileSync(path.join(repo, 'src', 'App', 'Route', 'Config', 'Routing.yaml'), [
    '"get:/accts":',
    '  client: App\\Handler\\Account',
    '  method: getAccountVendor',
    '  request: src/App/Schema/AccountRequest.json',
    '  response: src/App/Schema/AccountResponse.json',
    '',
  ].join('\n'));
  fs.writeFileSync(path.join(repo, 'src', 'App', 'Handler', 'Account.php'), `<?php
function getAccountVendor($source) {
  return ['id' => 1, 'status' => 'safe'];
}
`);
  fs.writeFileSync(path.join(repo, 'src', 'App', 'Schema', 'AccountRequest.json'), '{"type":"object","properties":{"page":{"type":"integer"}}}\n');
  fs.writeFileSync(path.join(repo, 'src', 'App', 'Schema', 'AccountResponse.json'), '{"type":"array","items":{"type":"object"}}\n');
  return root;
}

function config() {
  return createRealSourceScanConfig({
    runtimeMappingNamespace: 'ripple',
    approvedRepositories: [{
      repoId: 'mobingilabs/ripple-api',
      expectedSourceSha: SOURCE_SHA,
      allowlistedRoots: ['src'],
      allowedExtensions: ['.php', '.json', '.yaml'],
      maxFiles: 64,
      maxFileBytes: 64_000,
      maxTotalBytes: 1_000_000,
    }],
  });
}

test('Phase 26 source proof reaches the existing Phase24 semantic/replay/dossier path offline', () => {
  const root = setup();
  try {
    const access = createSiblingSourceAccess(root);
    const scanConfig = config();
    const discovery = discoverSourceSurfaces({ access, config: scanConfig });
    const surface = discovery.surfaces[0];
    expect(surface?.schemaVersion).toBe('nightwatch.real-source-surface-descriptor.v2');
    expect(surface?.contract.responseProof).toBe('PROVEN');
    expect(surface?.contract.semanticProof).toBe('PROVEN');
    expect(surface?.contract.responseAnalyzerDiagnostics.some((diagnostic) => diagnostic.analyzerId === 'PHP_RETURN_OBJECT_FIELDS' && diagnostic.analyzerVersion === 'nightwatch.real-source-response-analyzers.v2')).toBe(true);
    expect(JSON.stringify(discovery)).not.toContain("'safe'");

    const integration = analyzeSourceSurfacesIntoPhase24({ access, config: scanConfig, discovery, maxCandidates: 1 });
    const candidate = integration.portfolio.candidates.find((entry) => entry.eligibility === 'ELIGIBLE');
    expect(candidate).toBeDefined();
    if (candidate === undefined || candidate.source === null || candidate.contract === null || candidate.replay === null) throw new Error('PHASE26_SYNTHETIC_ELIGIBLE_MISSING');

    const review = buildSourceReviewQueue({ discovery, portfolio: integration.portfolio, selection: integration.selection });
    expect(review.selectedCount).toBe(1);
    expect(review.rows[0]?.explanation).toEqual(expect.arrayContaining(['SEMANTIC_CONTRACT_PROVEN', 'RUNTIME_BOUND_EXACT']));
    expect(review.rows[0]?.proofGapCodes).toEqual([]);
    expect(review.rows[0]?.analyzerIds).toEqual(expect.arrayContaining(['PHP_RETURN_OBJECT_FIELDS', 'PHP_RETURN_ROOT_TYPE']));
    expect(review.rows[0]?.missingProof).toEqual([]);

    const graph = buildContractGraph({
      inventory: phase20Inventory(),
      sourceSurfaces: discovery.surfaces,
      sourceSurfaceBindings: [{ surfaceId: surface!.surfaceId, phase24CandidateId: candidate.candidateId, runtimeBindingId: 'runtime:ripple.account-inventory.read', replayPlanId: 'replay:ripple.account-inventory.read', dossierId: 'dossier:ripple.account-inventory.read', replayInvalidated: false, dossierInvalidated: false }],
    });
    expect(graph.edges.some((edge) => edge.reason === 'PRODUCES_RESPONSE_CONTRACT')).toBe(true);
    expect(graph.edges.some((edge) => edge.reason === 'PROVES_SEMANTIC_CONTRACT')).toBe(true);
    expect(graph.edges.some((edge) => edge.reason === 'QUALIFIES_CANDIDATE')).toBe(true);

    const expectation = createPhase24SemanticExpectation({ expectationId: candidate.semanticExpectationId, candidateId: candidate.candidateId, invariantId: 'invariant.phase26.source-derived', kind: 'TOTALS_CONTRADICTORY', source: candidate.source, contractId: candidate.contract.contractId, preconditions: candidate.semanticPreconditions, provenanceDigest: 'provenance:sha256:' + '1'.repeat(24) });
    expect(evaluatePhase24SemanticExpectation({ expectation, observation: { schemaVersion: 'nightwatch.phase24-safe-semantic-observation.v1', applicable: true, totals: { declaredCount: 1, observedCount: 1, totalConsistent: true } } }).outcome).toBe('PASS');

    const replayPlan = createPhase24ReplayPlan({ candidateId: candidate.candidateId, occurrenceIdentity: 'occurrence.phase26.first', source: candidate.source, semanticContractId: candidate.contract.contractId, expectationId: expectation.expectationId, sanitizedObservationDigest: 'observation:sha256:' + '2'.repeat(24), executionPrerequisites: ['SOURCE_CURRENT', 'READ_ONLY_PROVEN'] });
    validatePhase24ReplayPlan(replayPlan);
    expect(classifyPhase24Replay({ plan: replayPlan, facts: { replayAttempted: true, sourceExact: true, semanticContractStillValid: true, authReady: false, environmentAuthorized: false, prerequisitesStable: true, sameInvariantObserved: true } }).classification).toBe('AUTH_DIVERGENCE');

    const owner = routePhase24OwnerProvenance({ owner: candidate.behaviorOwner, ownerProven: candidate.behaviorOwnerProven });
    const dossier = createPhase24Dossier({ findingKind: 'TOTALS_CONTRADICTORY', invariantId: expectation.invariantId, candidateIds: [candidate.candidateId], sourceContracts: [{ ...candidate.source, contractId: candidate.contract.contractId }], implementationFiles: candidate.relevantFiles, ownership: owner, replayClassification: 'AUTH_DIVERGENCE', minimized: false, changedAssumptionCodes: ['AUTH_NOT_READ'], discardedEvidenceCodes: ['RAW_VALUES_DISCARDED'], additionalConfirmationCode: 'OWNER_REVIEW_REQUIRED', findingCount: 0 });
    validatePhase24Dossier(dossier);

    const manifest = createPhase24Manifest({
      nightwatchSha: '8'.repeat(40), environment: 'DEV', portfolio: integration.portfolio, selectedCandidateIds: integration.selection.selectedCandidateIds, semanticExpectationDigest: 'semantic-plan:sha256:' + '3'.repeat(24), replayPlanDigest: 'replay-batch:sha256:' + '4'.repeat(24), containment: { version: 'containment.v2', loopbackProxyRequired: true, externalContactAllowed: false, mutationAllowed: false, rawPersistenceAllowed: false, localDestinationClass: 'OWNER_LOCAL_ONLY' }, policy: { version: 'owner-policy.v1', digest: 'policy:sha256:' + '5'.repeat(24), operationClass: 'READ_ONLY', ownerScopeStatus: 'FROZEN_BY_OWNER' }, qualityGate: { receiptSchemaVersion: 'nightwatch.quality-gate-receipt.v1', receiptDigest: 'receipt:sha256:' + '6'.repeat(24), gateDefinitionDigest: 'sha256:' + '0'.repeat(64), gitHead: '8'.repeat(40), finalResult: 'PASS' }, operatorAuthorization: 'NOT_READ',
    });
    validatePhase24Manifest(manifest);
    const rehearsal = buildPhase24NoContactRehearsal({ manifest, portfolio: integration.portfolio });
    validatePhase24NoContactRehearsal(rehearsal);
    expect(rehearsal).toMatchObject({ externalContactCount: 0, mutationCount: 0, rawPersistenceCount: 0, result: 'PASS' });
    expect(JSON.stringify({ discovery, integration, review, graph, expectation, replayPlan, dossier, manifest, rehearsal })).not.toContain("'safe'");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
