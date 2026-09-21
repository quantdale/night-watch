#!/usr/bin/env node
// W13 Phase B pre-freeze census harness. LOCAL owner-local read-only only.
//
// Produces the W13 current-source census (currentness, inventory counts,
// completeness, language counts, reproduction capability) plus a canonical
// census digest. No provider call, no sibling write, no raw source text.

import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTypeScriptModules } from '../../../../bin/lib/typescript-runtime-loader.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..', '..', '..');
const REPOS_ROOT = process.env.NIGHTWATCH_REPOS_ROOT ?? '/home/dalepalaca/go/src/alphaus-main/REPOSITORIES';
const OUT = path.join(ROOT, '.agent/tasks/nightwatch-provider-resilient-current-yield-w13-v1/evidence/w13-current-source-census.json');

function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
}

const [scanMod, approvedMod, siblingMod, censusMod, providerMod] = loadTypeScriptModules([
  'src/core/source/scan.ts',
  'src/core/source/approvedScan.ts',
  'src/core/source/siblingSource.ts',
  'src/core/reproductionSurface/census.ts',
  'src/core/ownerLocalReproduction/provider.ts',
], { root: ROOT });

const config = approvedMod.createApprovedRealSourceScanConfig();
const admitted = config.approvedRepositories.map((repository) => repository.repoId);
const access = siblingMod.createSiblingSourceAccess(REPOS_ROOT, { admittedRepositoryIds: admitted });
const inventory = scanMod.scanSource({ access, config });

const repositories = config.approvedRepositories.map((repository) => {
  const record = inventory.repositories.find((item) => item.repoId === repository.repoId);
  const current = access.currentness.currentSnapshot(repository.repoId);
  const liveSourceSha = current === null ? null : current.sha;
  const status = current === null
    ? 'SOURCE_UNAVAILABLE'
    : repository.expectedSourceSha === null || liveSourceSha === repository.expectedSourceSha
      ? 'CURRENT'
      : 'SOURCE_STALE';
  return {
    repository: repository.repoId,
    expectedSourceSha: repository.expectedSourceSha,
    liveSourceSha,
    status,
    fileCount: record?.fileCount ?? 0,
    admittedFileCount: record?.admittedFileCount ?? 0,
    rejectedFileCount: record?.rejectedFileCount ?? 0,
    bytesInspected: record?.bytesInspected ?? 0,
    sourceRefusalCounts: record?.rejectionCounts ?? {},
  };
});

const eligibleLanguageCounts = {};
for (const file of inventory.files) {
  if (file.status !== 'ELIGIBLE' || typeof file.language !== 'string') continue;
  eligibleLanguageCounts[file.language] = (eligibleLanguageCounts[file.language] ?? 0) + 1;
}

const truncatedRepository = inventory.completeness.repositories
  .filter((entry) => entry.enumeration.state !== 'COMPLETE')
  .map((entry) => entry.repoId);

const reproductionCapability = censusMod.buildReproductionCapabilityCensus({
  records: inventory.files
    .filter((file) => file.status === 'ELIGIBLE')
    .map((file) => ({ repository: file.repoId, relativePath: file.relativePath })),
  classify: (sourcePath) => providerMod.discoverOwnerLocalTarget({ sourcePath }),
  truncatedRepositories: truncatedRepository,
});

const counters = inventory.counters;
const census = {
  schemaVersion: 'nightwatch.w13-current-source-census.v1',
  capturedBeforeInvestigativeCall: true,
  approvedRepositoryIds: admitted,
  repositoryOrder: admitted,
  sourceInventory: {
    configDigest: inventory.configDigest,
    extractorVersion: inventory.extractorVersion,
    snapshotDigest: inventory.snapshotDigest,
    repositoriesConsidered: counters.repositoriesConsidered,
    repositoriesInspected: counters.repositoriesInspected,
    filesConsidered: counters.filesConsidered,
    filesRead: counters.filesRead,
    filesAdmitted: counters.filesAdmitted,
    filesRejected: counters.filesRejected,
    bytesRead: counters.bytesRead,
    symlinkRejections: counters.symlinkRejections,
    pathRejections: counters.pathRejections,
    enumerationBudgetRejections: counters.enumerationBudgetRejections,
    contentBudgetRejections: counters.contentBudgetRejections,
    completeness: inventory.completeness.state,
    truncationReason: inventory.completeness.enumeration.truncationReason,
    truncatedRepositories: truncatedRepository,
  },
  eligibleLanguageCounts,
  repositories,
  reproductionCapability,
};

census.censusDigest = `sha256:${crypto.createHash('sha256').update(canonical(census)).digest('hex').slice(0, 24)}`;
fs.writeFileSync(OUT, `${JSON.stringify(census, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  out: path.relative(ROOT, OUT),
  censusDigest: census.censusDigest,
  snapshotDigest: census.sourceInventory.snapshotDigest,
  completeness: census.sourceInventory.completeness,
  filesAdmitted: census.sourceInventory.filesAdmitted,
  truncatedRepositories: truncatedRepository,
  statuses: repositories.map((repository) => `${repository.repository}=${repository.status}`),
}, null, 2)}\n`);
