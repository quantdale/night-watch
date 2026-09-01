import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createSiblingSourceAccess } from '../../src/core/source/siblingSource';
import { createRealSourceScanConfig, scanSource } from '../../src/core/source/scan';
import { analyzeSourceSurfacesIntoPhase24, discoverSourceSurfaces } from '../../src/core/source/surfaces';
import { buildReadOnlyCandidateCensus } from '../../src/core/source/readonlyCandidateCensus';
import { buildSourcePopulationCompleteness, unmeasuredSourcePopulationCompleteness } from '../../src/core/source/populationCompleteness';
import {
  coverageAuthorityEffect,
  coverageStateForCompleteness,
  isComplete,
  worstCompleteness,
  worstCoverageState,
  R2_COVERAGE_STATES,
  SOURCE_COMPLETENESS_STATES,
} from '../../src/core/source/completeness';

// C-01 — repository ENUMERATION completeness and file-BODY read completeness
// are separate facts. A repository may be fully enumerated while only some of
// its file bodies are read; neither state may be reported as the other, and
// UNKNOWN may never be read as COMPLETE.

const REPO_ID = 'mobingilabs/ripple-api';
const REPO_SHA = '27bb007ad0c798800b6bd3b29760c966422966e7';

function tempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-c01-inventory-'));
}

function cleanup(root: string): void {
  fs.rmSync(root, { recursive: true, force: true });
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

/** Build a repository with one routing file, one handler, and `filler`
 * additional PHP files so the enumeration walk can be bounded independently of
 * the content-read budget. */
function makeRepo(root: string, options: { readonly operations: number; readonly filler: number; readonly fillerBytes?: number }): void {
  const repo = path.join(root, ...REPO_ID.split('/'));
  const git = path.join(repo, '.git');
  fs.mkdirSync(path.join(git, 'refs', 'heads'), { recursive: true });
  fs.writeFileSync(path.join(git, 'HEAD'), 'ref: refs/heads/master\n');
  fs.writeFileSync(path.join(git, 'refs', 'heads', 'master'), `${REPO_SHA}\n`);
  fs.mkdirSync(path.join(repo, 'src', 'App', 'Route', 'Config'), { recursive: true });
  fs.mkdirSync(path.join(repo, 'src', 'App', 'Handler'), { recursive: true });
  fs.writeFileSync(path.join(repo, 'src', 'App', 'Route', 'Config', 'Routing.yaml'), routingYaml(options.operations));
  fs.writeFileSync(path.join(repo, 'src', 'App', 'Handler', 'Account.php'), `<?php
function getReport000($source) {
  $res[] = ['id' => 1, 'status' => 'safe'];
  return $res;
}
`);
  // Filler lives in a directory that sorts AFTER Route/Config so the routing
  // file is always enumerated before an enumeration bound can be reached.
  fs.mkdirSync(path.join(repo, 'src', 'App', 'Zfiller'), { recursive: true });
  const body = 'x'.repeat(options.fillerBytes ?? 32);
  for (let index = 0; index < options.filler; index += 1) {
    fs.writeFileSync(path.join(repo, 'src', 'App', 'Zfiller', `Filler${String(index).padStart(4, '0')}.php`), `<?php\n// ${body}\n`);
  }
}

function repositoryConfig(overrides: { readonly maxFiles?: number; readonly maxFileBytes?: number; readonly maxTotalBytes?: number } = {}) {
  return {
    repoId: REPO_ID,
    expectedSourceSha: REPO_SHA,
    allowlistedRoots: ['src'],
    allowedExtensions: ['.php', '.json', '.yaml'] as const,
    maxFiles: overrides.maxFiles ?? 512,
    maxFileBytes: overrides.maxFileBytes ?? 400_000,
    maxTotalBytes: overrides.maxTotalBytes ?? 4_000_000,
  };
}

function scan(root: string, overrides: Parameters<typeof repositoryConfig>[0] = {}) {
  return scanSource({
    access: createSiblingSourceAccess(root),
    config: createRealSourceScanConfig({ runtimeMappingNamespace: 'ripple', approvedRepositories: [repositoryConfig(overrides)] }),
  });
}

test.describe('C-01 completeness vocabulary', () => {
  test('UNKNOWN can never be interpreted as COMPLETE', () => {
    expect([...SOURCE_COMPLETENESS_STATES]).toEqual(['COMPLETE', 'TRUNCATED', 'UNKNOWN']);
    expect(isComplete('COMPLETE')).toBe(true);
    expect(isComplete('TRUNCATED')).toBe(false);
    expect(isComplete('UNKNOWN')).toBe(false);
    // Combination only ever weakens, and an unmeasured combination is UNKNOWN
    // rather than vacuously COMPLETE.
    expect(worstCompleteness()).toBe('UNKNOWN');
    expect(worstCompleteness('COMPLETE', 'COMPLETE')).toBe('COMPLETE');
    expect(worstCompleteness('COMPLETE', 'TRUNCATED')).toBe('TRUNCATED');
    expect(worstCompleteness('TRUNCATED', 'UNKNOWN')).toBe('UNKNOWN');
    expect(worstCompleteness('UNKNOWN', 'COMPLETE')).toBe('UNKNOWN');
  });

  test('the seven R2 coverage states may deny authority and never grant it', () => {
    expect([...R2_COVERAGE_STATES]).toEqual(['PROVEN', 'UNPROVEN', 'UNSUPPORTED', 'TRUNCATED', 'STALE', 'UNKNOWN', 'UNMEASURED']);
    for (const state of R2_COVERAGE_STATES) {
      const effect = coverageAuthorityEffect(state);
      expect(['DENY', 'NO_EFFECT']).toContain(effect);
      // There is deliberately no GRANT effect: PROVEN merely removes a
      // coverage-based denial.
      expect(effect).toBe(state === 'PROVEN' ? 'NO_EFFECT' : 'DENY');
    }
    expect(coverageStateForCompleteness('COMPLETE')).toBe('PROVEN');
    expect(coverageStateForCompleteness('TRUNCATED')).toBe('TRUNCATED');
    expect(coverageStateForCompleteness('UNKNOWN')).toBe('UNKNOWN');
    expect(worstCoverageState()).toBe('UNMEASURED');
    expect(worstCoverageState('PROVEN', 'STALE', 'UNPROVEN')).toBe('STALE');
    expect(worstCoverageState('PROVEN', 'TRUNCATED', 'UNKNOWN')).toBe('UNKNOWN');
  });

  test('an unmeasured population reports UNKNOWN/UNMEASURED with a null total', () => {
    const population = unmeasuredSourcePopulationCompleteness(4096);
    expect(population.state).toBe('UNKNOWN');
    expect(population.coverageState).toBe('UNMEASURED');
    expect(population.operations.total).toBeNull();
    expect(population.enumeration.totalFiles).toBeNull();
    expect(population.enumeration.droppedFiles).toBeNull();
    expect(isComplete(population.state)).toBe(false);
  });
});

test.describe('C-01 enumeration vs content-read completeness', () => {
  test('an enumeration limit of N over N + extra files reports TRUNCATED with an unknown remaining count', () => {
    const root = tempRoot();
    try {
      makeRepo(root, { operations: 8, filler: 40 });
      const limit = 12;
      const inventory = scan(root, { maxFiles: limit });
      const completeness = inventory.completeness;
      const repository = completeness.repositories[0]!;

      expect(repository.repoId).toBe(REPO_ID);
      expect(repository.enumeration.state).toBe('TRUNCATED');
      expect(repository.enumeration.limit).toBe(limit);
      expect(repository.enumeration.truncationReason).toBe('SOURCE_FILE_COUNT_EXCEEDED');
      // The walk aborts, so the remainder is not merely unlisted: it is
      // uncountable. Reporting 0 dropped here would be a lie.
      expect(repository.enumeration.totalFiles).toBeNull();
      expect(repository.enumeration.droppedFiles).toBeNull();
      expect(repository.enumeration.remainingUnknown).toBe(true);
      expect(repository.enumeration.examinedFiles).toBeGreaterThan(0);
      expect(repository.enumeration.examinedFiles).toBeLessThanOrEqual(limit);

      expect(inventory.counters.enumerationBudgetRejections).toBeGreaterThan(0);
      // Enumeration exhaustion must not be charged to the content-read budget.
      expect(inventory.counters.contentBudgetRejections).toBe(0);
      expect(completeness.enumeration.state).toBe('TRUNCATED');
      expect(completeness.state).toBe('TRUNCATED');
      expect(isComplete(completeness.state)).toBe(false);
    } finally {
      cleanup(root);
    }
  });

  test('a fully enumerated repository with limited content reads keeps the two states apart', () => {
    const root = tempRoot();
    try {
      // Every file is enumerated; the oversized filler bodies exceed the
      // per-file read budget and are dropped at read time only.
      makeRepo(root, { operations: 8, filler: 6, fillerBytes: 40_000 });
      const inventory = scan(root, { maxFiles: 512, maxFileBytes: 4_000 });
      const repository = inventory.completeness.repositories[0]!;

      expect(repository.enumeration.state).toBe('COMPLETE');
      expect(repository.enumeration.totalFiles).toBe(repository.enumeration.examinedFiles);
      expect(repository.enumeration.droppedFiles).toBe(0);
      expect(repository.enumeration.remainingUnknown).toBe(false);

      expect(repository.contentRead.state).toBe('TRUNCATED');
      expect(repository.contentRead.droppedFiles).toBe(6);
      expect(repository.contentRead.candidateFiles).toBe(repository.enumeration.examinedFiles);
      expect(repository.contentRead.admittedFiles).toBeLessThan(repository.contentRead.candidateFiles);

      expect(inventory.counters.enumerationBudgetRejections).toBe(0);
      expect(inventory.counters.contentBudgetRejections).toBe(6);
      // The inventory-wide state is weakened by the content-read dimension
      // alone; enumeration stays truthfully COMPLETE.
      expect(inventory.completeness.enumeration.state).toBe('COMPLETE');
      expect(inventory.completeness.contentRead.state).toBe('TRUNCATED');
      expect(inventory.completeness.state).toBe('TRUNCATED');
    } finally {
      cleanup(root);
    }
  });

  test('a policy exclusion is never reported as truncation', () => {
    const root = tempRoot();
    try {
      makeRepo(root, { operations: 4, filler: 3 });
      // Excluding .php leaves the handlers enumerated but deliberately unread.
      const inventory = scanSource({
        access: createSiblingSourceAccess(root),
        config: createRealSourceScanConfig({
          runtimeMappingNamespace: 'ripple',
          approvedRepositories: [{ ...repositoryConfig(), allowedExtensions: ['.yaml'] as const }],
        }),
      });
      const repository = inventory.completeness.repositories[0]!;
      expect(repository.enumeration.state).toBe('COMPLETE');
      expect(repository.contentRead.state).toBe('COMPLETE');
      expect(repository.contentRead.policyExcludedFiles).toBeGreaterThan(0);
      expect(repository.contentRead.droppedFiles).toBe(0);
      expect(inventory.completeness.state).toBe('COMPLETE');
    } finally {
      cleanup(root);
    }
  });

  test('bounded enumeration makes the operation total unknowable without claiming a projection drop', () => {
    const root = tempRoot();
    try {
      makeRepo(root, { operations: 8, filler: 40 });
      const discovery = discoverSourceSurfaces({
        access: createSiblingSourceAccess(root),
        config: createRealSourceScanConfig({ runtimeMappingNamespace: 'ripple', approvedRepositories: [repositoryConfig({ maxFiles: 12 })] }),
      });
      const completeness = discovery.operationCompleteness;

      expect(completeness.enumerationCompleteness).toBe('TRUNCATED');
      expect(completeness.contentReadCompleteness).toBe('COMPLETE');
      expect(completeness.remainingUnknown).toBe(true);
      // Projection itself dropped nothing; the loss happened upstream and is
      // therefore UNKNOWN rather than TRUNCATED.
      expect(completeness.droppedOperations).toBe(0);
      expect(completeness.truncated).toBe(false);
      expect(completeness.state).toBe('UNKNOWN');
      expect(completeness.totalOperations).toBeNull();
      expect(completeness.coverageState).toBe('UNKNOWN');
      expect(coverageAuthorityEffect(completeness.coverageState)).toBe('DENY');
      expect(isComplete(completeness.state)).toBe(false);
    } finally {
      cleanup(root);
    }
  });

  test('truncation metadata is deterministic and a truncated discovery never shares a digest with a complete one', () => {
    const truncatedRoot = tempRoot();
    const completeRoot = tempRoot();
    try {
      makeRepo(truncatedRoot, { operations: 8, filler: 40 });
      makeRepo(completeRoot, { operations: 8, filler: 40 });
      const truncatedConfig = { runtimeMappingNamespace: 'ripple', approvedRepositories: [repositoryConfig({ maxFiles: 12 })] };
      const first = discoverSourceSurfaces({ access: createSiblingSourceAccess(truncatedRoot), config: createRealSourceScanConfig(truncatedConfig) });
      const second = discoverSourceSurfaces({ access: createSiblingSourceAccess(truncatedRoot), config: createRealSourceScanConfig(truncatedConfig) });

      expect(second.operationCompleteness).toEqual(first.operationCompleteness);
      expect(second.inventory.completeness).toEqual(first.inventory.completeness);
      expect(second.deterministicDigest).toBe(first.deterministicDigest);
      expect(second.inventory.snapshotDigest).toBe(first.inventory.snapshotDigest);

      const complete = discoverSourceSurfaces({
        access: createSiblingSourceAccess(completeRoot),
        config: createRealSourceScanConfig({ runtimeMappingNamespace: 'ripple', approvedRepositories: [repositoryConfig({ maxFiles: 512 })] }),
      });
      expect(complete.inventory.completeness.enumeration.state).toBe('COMPLETE');
      expect(complete.operationCompleteness.state).toBe('COMPLETE');
      expect(complete.deterministicDigest).not.toBe(first.deterministicDigest);
    } finally {
      cleanup(truncatedRoot);
      cleanup(completeRoot);
    }
  });
});

test.describe('C-01 completeness propagation', () => {
  test('the eligibility and read-only censuses both state the population they measured', () => {
    const root = tempRoot();
    try {
      makeRepo(root, { operations: 8, filler: 2 });
      const access = createSiblingSourceAccess(root);
      const config = createRealSourceScanConfig({ runtimeMappingNamespace: 'ripple', approvedRepositories: [repositoryConfig()] });
      const discovery = discoverSourceSurfaces({ access, config });
      const integration = analyzeSourceSurfacesIntoPhase24({ access, config, discovery, maxCandidates: 6 });
      const expected = buildSourcePopulationCompleteness({ operationCompleteness: discovery.operationCompleteness, inventoryCompleteness: discovery.inventory.completeness });

      expect(integration.eligibilityCensus.schemaVersion).toBe('nightwatch.real-source-eligibility-census.v3');
      expect(integration.eligibilityCensus.summary.population).toEqual(expected);
      expect(integration.eligibilityCensus.summary.population.state).toBe('COMPLETE');
      expect(integration.eligibilityCensus.summary.population.operations.total).toBe(integration.eligibilityCensus.summary.totalOperations);

      const readOnly = buildReadOnlyCandidateCensus({ access, discovery });
      expect(readOnly.schemaVersion).toBe('nightwatch.real-source-readonly-candidate-census.v2');
      expect(readOnly.population).toEqual(expected);
    } finally {
      cleanup(root);
    }
  });

  test('a bounded enumeration is surfaced by the census as an UNKNOWN population, never as a total', () => {
    const root = tempRoot();
    try {
      makeRepo(root, { operations: 8, filler: 40 });
      const access = createSiblingSourceAccess(root);
      const config = createRealSourceScanConfig({ runtimeMappingNamespace: 'ripple', approvedRepositories: [repositoryConfig({ maxFiles: 12 })] });
      const discovery = discoverSourceSurfaces({ access, config });
      const integration = analyzeSourceSurfacesIntoPhase24({ access, config, discovery, maxCandidates: 6 });
      const population = integration.eligibilityCensus.summary.population;

      expect(population.state).toBe('UNKNOWN');
      expect(population.coverageState).toBe('UNKNOWN');
      expect(population.operations.total).toBeNull();
      expect(population.enumeration.state).toBe('TRUNCATED');
      expect(population.contentRead.state).toBe('COMPLETE');
      // totalOperations is the censused count; the population block is what
      // says it is a floor rather than a total.
      expect(integration.eligibilityCensus.summary.totalOperations).toBe(population.operations.projected);
      expect(isComplete(population.state)).toBe(false);
    } finally {
      cleanup(root);
    }
  });
});
