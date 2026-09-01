import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createSiblingSourceAccess } from '../../src/core/source/siblingSource';
import { createRealSourceScanConfig } from '../../src/core/source/scan';
import { discoverSourceSurfaces, MAX_PROJECTED_OPERATIONS } from '../../src/core/source/surfaces';
import { coverageAuthorityEffect, isComplete } from '../../src/core/source/completeness';

// C-01 — truncation truth. Operation projection is bounded but never silently
// lossy: a Ripple-like snapshot larger than the historical 128 cap must project
// every parsed operation, and an earlier-sorting repository must never evict an
// existing operation identity.

const RIPPLE_API_SHA = '27bb007ad0c798800b6bd3b29760c966422966e7';
const EARLIER_REPO_SHA = '1f2e3d4c5b6a798807162534435261708192a3b4';
const RIPPLE_OPERATION_COUNT = 223;
const EARLIER_OPERATION_COUNT = 64;

function tempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-c01-completeness-'));
}

function routingYaml(count: number): string {
  const lines: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const ordinal = String(index).padStart(3, '0');
    lines.push(`"get:/reports/${ordinal}":`);
    lines.push('  client: App\\Handler\\Account');
    lines.push(`  method: getReport${ordinal}`);
  }
  lines.push('');
  return lines.join('\n');
}

interface RepoOverrides {
  readonly maxFiles?: number;
  readonly maxFileBytes?: number;
}

function makeRepo(root: string, repoId: string, sha: string, operationCount: number, _overrides: RepoOverrides = {}): void {
  const repo = path.join(root, ...repoId.split('/'));
  const git = path.join(repo, '.git');
  fs.mkdirSync(path.join(git, 'refs', 'heads'), { recursive: true });
  fs.writeFileSync(path.join(git, 'HEAD'), 'ref: refs/heads/master\n');
  fs.writeFileSync(path.join(git, 'refs', 'heads', 'master'), `${sha}\n`);
  fs.mkdirSync(path.join(repo, 'src', 'App', 'Route', 'Config'), { recursive: true });
  fs.mkdirSync(path.join(repo, 'src', 'App', 'Handler'), { recursive: true });
  fs.writeFileSync(path.join(repo, 'src', 'App', 'Route', 'Config', 'Routing.yaml'), routingYaml(operationCount));
  fs.writeFileSync(path.join(repo, 'src', 'App', 'Handler', 'Account.php'), `<?php
function getReport000($source) {
  $res[] = ['id' => 1, 'status' => 'safe'];
  return $res;
}
`);
}

function repositoryConfig(repoId: string, sha: string, overrides: RepoOverrides = {}) {
  return {
    repoId,
    expectedSourceSha: sha,
    allowlistedRoots: ['src'],
    allowedExtensions: ['.php', '.json', '.yaml'] as const,
    maxFiles: overrides.maxFiles ?? 64,
    maxFileBytes: overrides.maxFileBytes ?? 400_000,
    maxTotalBytes: 16_000_000,
  };
}

function cleanup(root: string): void {
  fs.rmSync(root, { recursive: true, force: true });
}

function isSortedByDiscoveryOrder(operations: readonly { readonly repository: string; readonly sourcePath: string; readonly method: string; readonly routeTemplate: string; readonly operationId: string }[]): boolean {
  const key = (operation: (typeof operations)[number]): readonly string[] => [operation.repository, operation.sourcePath, operation.method, operation.routeTemplate, operation.operationId];
  for (let index = 1; index < operations.length; index += 1) {
    const previous = key(operations[index - 1]!);
    const current = key(operations[index]!);
    let comparison = 0;
    for (let part = 0; part < previous.length && comparison === 0; part += 1) comparison = previous[part]!.localeCompare(current[part]!);
    if (comparison > 0) return false;
  }
  return true;
}

test.describe('C-01 bounded truthful operation projection', () => {
  test('projects all 223 Ripple-like operations with explicit completeness truth', () => {
    const root = tempRoot();
    try {
      makeRepo(root, 'mobingilabs/ripple-api', RIPPLE_API_SHA, RIPPLE_OPERATION_COUNT);
      const access = createSiblingSourceAccess(root);
      const config = createRealSourceScanConfig({
        runtimeMappingNamespace: 'ripple',
        approvedRepositories: [repositoryConfig('mobingilabs/ripple-api', RIPPLE_API_SHA)],
      });
      const discovery = discoverSourceSurfaces({ access, config });

      expect(discovery.operations).toHaveLength(RIPPLE_OPERATION_COUNT);
      expect(discovery.counters.routeOperationsFound).toBe(RIPPLE_OPERATION_COUNT);
      expect(discovery.counters.routeOperationsTruncated).toBe(0);
      expect(new Set(discovery.operations.map((operation) => operation.routeTemplate)).size).toBe(RIPPLE_OPERATION_COUNT);
      expect(isSortedByDiscoveryOrder(discovery.operations)).toBe(true);

      const completeness = discovery.operationCompleteness;
      expect(completeness.schemaVersion).toBe('nightwatch.source-operation-projection-completeness.v1');
      expect(completeness.state).toBe('COMPLETE');
      expect(completeness.truncated).toBe(false);
      expect(completeness.limit).toBe(MAX_PROJECTED_OPERATIONS);
      expect(completeness.limit).toBeGreaterThan(RIPPLE_OPERATION_COUNT);
      expect(completeness.examinedOperations).toBe(RIPPLE_OPERATION_COUNT);
      expect(completeness.totalOperations).toBe(RIPPLE_OPERATION_COUNT);
      expect(completeness.projectedOperations).toBe(RIPPLE_OPERATION_COUNT);
      expect(completeness.droppedOperations).toBe(0);
      expect(completeness.remainingUnknown).toBe(false);
      expect(completeness.enumerationCompleteness).toBe('COMPLETE');
      expect(completeness.contentReadCompleteness).toBe('COMPLETE');
      expect(completeness.coverageState).toBe('PROVEN');
      expect(completeness.repositories).toEqual([{
        repository: 'mobingilabs/ripple-api',
        examinedOperations: RIPPLE_OPERATION_COUNT,
        projectedOperations: RIPPLE_OPERATION_COUNT,
        droppedOperations: 0,
      }]);
    } finally {
      cleanup(root);
    }
  });

  test('an earlier-sorting repository cannot silently evict existing operation identities', () => {
    const baselineRoot = tempRoot();
    const expandedRoot = tempRoot();
    try {
      makeRepo(baselineRoot, 'mobingilabs/ripple-api', RIPPLE_API_SHA, RIPPLE_OPERATION_COUNT);
      const baseline = discoverSourceSurfaces({
        access: createSiblingSourceAccess(baselineRoot),
        config: createRealSourceScanConfig({
          runtimeMappingNamespace: 'ripple',
          approvedRepositories: [repositoryConfig('mobingilabs/ripple-api', RIPPLE_API_SHA)],
        }),
      });
      const baselineIdentities = baseline.operations.map((operation) => operation.operationId).sort((left, right) => left.localeCompare(right));
      expect(baselineIdentities).toHaveLength(RIPPLE_OPERATION_COUNT);

      makeRepo(expandedRoot, 'mobingilabs/ripple-api', RIPPLE_API_SHA, RIPPLE_OPERATION_COUNT);
      makeRepo(expandedRoot, 'alphauslabs/earlier-api', EARLIER_REPO_SHA, EARLIER_OPERATION_COUNT);
      const expanded = discoverSourceSurfaces({
        access: createSiblingSourceAccess(expandedRoot),
        config: createRealSourceScanConfig({
          runtimeMappingNamespace: 'ripple',
          approvedRepositories: [
            repositoryConfig('alphauslabs/earlier-api', EARLIER_REPO_SHA),
            repositoryConfig('mobingilabs/ripple-api', RIPPLE_API_SHA),
          ],
        }),
      });

      const expandedIdentities = new Set(expanded.operations.map((operation) => operation.operationId));
      for (const identity of baselineIdentities) expect(expandedIdentities.has(identity)).toBe(true);
      expect(expanded.operations).toHaveLength(RIPPLE_OPERATION_COUNT + EARLIER_OPERATION_COUNT);
      expect(expanded.operations.filter((operation) => operation.repository === 'mobingilabs/ripple-api')).toHaveLength(RIPPLE_OPERATION_COUNT);
      expect(isSortedByDiscoveryOrder(expanded.operations)).toBe(true);

      expect(expanded.operationCompleteness.state).toBe('COMPLETE');
      expect(expanded.operationCompleteness.droppedOperations).toBe(0);
      expect(expanded.operationCompleteness.repositories.map((row) => row.repository)).toEqual(['alphauslabs/earlier-api', 'mobingilabs/ripple-api']);
      for (const row of expanded.operationCompleteness.repositories) expect(row.droppedOperations).toBe(0);
    } finally {
      cleanup(baselineRoot);
      cleanup(expandedRoot);
    }
  });

  test('a projection above MAX_PROJECTED_OPERATIONS reports explicit TRUNCATED rather than losing operations silently', () => {
    const root = tempRoot();
    const overflow = MAX_PROJECTED_OPERATIONS + 104;
    try {
      makeRepo(root, 'mobingilabs/ripple-api', RIPPLE_API_SHA, overflow, { maxFileBytes: 2_000_000 });
      const discovery = discoverSourceSurfaces({
        access: createSiblingSourceAccess(root),
        config: createRealSourceScanConfig({
          runtimeMappingNamespace: 'ripple',
          approvedRepositories: [repositoryConfig('mobingilabs/ripple-api', RIPPLE_API_SHA, { maxFileBytes: 2_000_000 })],
        }),
      });

      const completeness = discovery.operationCompleteness;
      // The drop is real, bounded, and fully counted — never a silent stop.
      expect(completeness.state).toBe('TRUNCATED');
      expect(completeness.truncated).toBe(true);
      expect(completeness.limit).toBe(MAX_PROJECTED_OPERATIONS);
      expect(completeness.examinedOperations).toBe(overflow);
      expect(completeness.projectedOperations).toBe(MAX_PROJECTED_OPERATIONS);
      expect(completeness.droppedOperations).toBe(overflow - MAX_PROJECTED_OPERATIONS);
      expect(discovery.operations).toHaveLength(MAX_PROJECTED_OPERATIONS);
      expect(discovery.counters.routeOperationsTruncated).toBe(overflow - MAX_PROJECTED_OPERATIONS);
      // Projection drops are countable, so the examined total stays knowable.
      expect(completeness.totalOperations).toBe(overflow);
      expect(completeness.remainingUnknown).toBe(false);
      expect(completeness.coverageState).toBe('TRUNCATED');
      expect(coverageAuthorityEffect(completeness.coverageState)).toBe('DENY');
      expect(isComplete(completeness.state)).toBe(false);
      expect(completeness.repositories).toEqual([{
        repository: 'mobingilabs/ripple-api',
        examinedOperations: overflow,
        projectedOperations: MAX_PROJECTED_OPERATIONS,
        droppedOperations: overflow - MAX_PROJECTED_OPERATIONS,
      }]);
    } finally {
      cleanup(root);
    }
  });
});
