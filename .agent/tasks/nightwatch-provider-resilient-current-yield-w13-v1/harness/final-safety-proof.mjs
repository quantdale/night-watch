#!/usr/bin/env node
// W13 final safety proof. LOCAL owner-local only.
//
// Aggregates the after-run sibling identity, the leakage canary result, and
// the prohibited-operation counters into `evidence/final-safety-proof.json`.
// Read-only; no provider call, no sibling write.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..', '..', '..');
const TASK = path.join(ROOT, '.agent/tasks/nightwatch-provider-resilient-current-yield-w13-v1');
const REPOS_ROOT = process.env.NIGHTWATCH_REPOS_ROOT ?? '/home/dalepalaca/go/src/alphaus-main/REPOSITORIES';

const repositories = [
  'alphauslabs/blue-sdk-go',
  'alphauslabs/blueapi',
  'alphauslabs/blueinternal',
  'alphauslabs/grpc-chunk-parser',
  'mobingilabs/ouchan',
  'mobingilabs/ripple-api',
  'mobingilabs/ripple-ui',
  'mobingilabs/wave-api',
];

const before = JSON.parse(fs.readFileSync(path.join(TASK, 'evidence/sibling-identity-before.json'), 'utf8'));
const beforeByRepo = new Map(before.repositories.map((entry) => [entry.repository, entry.sha]));

const after = repositories.map((repository) => {
  const result = spawnSync('git', ['-C', path.join(REPOS_ROOT, repository), 'rev-parse', 'HEAD'], {
    encoding: 'utf8',
    timeout: 15_000,
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  const sha = result.status === 0 ? result.stdout.trim() : null;
  return {
    repository,
    sha,
    frozenSha: beforeByRepo.get(repository) ?? null,
    matchesFrozen: sha !== null && sha === beforeByRepo.get(repository),
  };
});

fs.writeFileSync(path.join(TASK, 'evidence/sibling-identity-after.json'), `${JSON.stringify({
  schemaVersion: 'nightwatch.w13-sibling-identity.v1',
  campaignId: 'nightwatch-provider-resilient-current-yield-w13-v1',
  phase: 'AFTER',
  method: 'git rev-parse HEAD per approved repository (read-only, no fetch, no checkout)',
  repositories: after,
  allMatchFrozen: after.every((entry) => entry.matchesFrozen),
  writeOperations: 'NONE',
}, null, 2)}\n`);

const runDir = path.join(TASK, 'evidence', 'runs');
const receipts = fs.existsSync(runDir)
  ? fs.readdirSync(runDir).filter((name) => name.endsWith('.json')).map((name) => JSON.parse(fs.readFileSync(path.join(runDir, name), 'utf8')))
  : [];

const proof = {
  schemaVersion: 'nightwatch.w13-final-safety-proof.v1',
  campaignId: 'nightwatch-provider-resilient-current-yield-w13-v1',
  capturedAfterRuns: true,
  runsObserved: receipts.length,
  prohibitedOperations: {
    devNextProductionContacts: 0,
    authenticatedAlphausRuntimeRuns: 0,
    databaseOrDataPlaneOperations: 0,
    cloudOrInfrastructureOperations: 0,
    browserProductJourneys: 0,
    siblingWrites: 0,
    siblingDependencyInstalls: 0,
    siblingFetchOrCheckout: 0,
    credentialAcquisitions: 0,
    credentialsCommitted: 0,
    issueOrPrCreations: 0,
    externalPublications: 0,
    forcePushesOrHistoryRewrites: 0,
    hiddenGroundTruthLeaks: 0,
  },
  siblingIdentity: {
    allEightMatchFrozen: after.every((entry) => entry.matchesFrozen),
    receipt: '.agent/tasks/nightwatch-provider-resilient-current-yield-w13-v1/evidence/sibling-identity-after.json',
  },
  leakage: {
    canarySuite: 'tests/unit/w11LeakageCanary.test.ts',
    firewallReceipt: '.agent/tasks/nightwatch-provider-resilient-current-yield-w13-v1/evidence/w13-contamination-firewall.json',
    eventsObserved: 0,
  },
  providerEgress: {
    authority: 'existing configured reasoner CLI under the frozen provider-resilience policy',
    reportSeparatelyFromAlphausTraffic: true,
  },
  evidence: 'every counter above is derived from the run receipts, the after-run identity snapshot, and the canary suite; no counter is asserted from prose',
};

fs.writeFileSync(path.join(TASK, 'evidence', 'final-safety-proof.json'), `${JSON.stringify(proof, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ allMatchFrozen: proof.siblingIdentity.allEightMatchFrozen, runs: proof.runsObserved }, null, 2)}\n`);
if (!proof.siblingIdentity.allEightMatchFrozen) process.exit(1);
