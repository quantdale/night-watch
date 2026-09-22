// NW-AUD-019 — total private-payload consumer census.
//
// Proves discovery is non-zero and total over the repository, that every
// consumer is claimed by exactly one closed registry root with a compatible
// capability contract, and that unknown consumers, stale roots, duplicate
// claims, capability bypasses, and an empty census all fail closed.

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  buildPrivateConsumerCensus,
  CONSUMER_ACTIVITIES,
  CONSUMER_CLASSES,
  PRIVATE_CONSUMER_REGISTRY,
} from '../../bin/lib/privateConsumerCensus.mjs';

const ROOT = path.join(__dirname, '..', '..');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'test-results', 'artifacts', '.tmp-nightwatch'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(mjs|ts)$/.test(entry.name) && !entry.name.endsWith('.d.ts') && !entry.name.endsWith('.d.mts')) out.push(full);
  }
  return out;
}

function repositorySources(): Array<{ file: string; source: string }> {
  const files = ['bin', 'src', 'tests', 'corpus'].flatMap((d) => walk(path.join(ROOT, d)));
  return files.map((file) => ({
    file: path.relative(ROOT, file).split(path.sep).join('/'),
    source: fs.readFileSync(file, 'utf8'),
  }));
}

const ROGUE_WRITER = {
  file: 'src/rogue/writer.ts',
  source: [
    "import { PrivateArtifactStore } from '../core/policy/privateArtifacts';",
    'export const store = new PrivateArtifactStore({});',
    "store.writeJson('x.json', { a: 1 });",
  ].join('\n'),
};

test('NW-AUD-019: repository consumer census is non-zero, total, and digestible', () => {
  const census = buildPrivateConsumerCensus(repositorySources());
  expect(census.schemaVersion).toBe('nightwatch.private-consumer-census.v1');
  expect(census.violations).toEqual([]);
  expect(census.ok).toBe(true);
  expect(census.consumerCount).toBeGreaterThanOrEqual(15);
  expect(census.productionConsumerCount).toBeGreaterThanOrEqual(10);
  expect(census.writerCount).toBeGreaterThanOrEqual(8);
  expect(census.screenCallCount).toBeGreaterThanOrEqual(5);
  expect(census.digest).toMatch(/^sha256:[0-9a-f]{24}$/);
  expect(new Set(census.consumers.map((consumer) => consumer.identity)).size).toBe(census.consumers.length);
  for (const klass of CONSUMER_CLASSES) {
    expect(Object.prototype.hasOwnProperty.call(census.byClass, klass)).toBe(true);
  }
  expect(census.byClass.SCREENING_LIBRARY).toBe(1);
  expect(census.byClass.STORE_LIBRARY).toBe(1);
  expect(census.byClass.STORE_WRITER).toBeGreaterThanOrEqual(7);
  expect(census.byClass.TEST_ONLY).toBeGreaterThanOrEqual(1);
  // Every production consumer is claimed by exactly one registry root.
  for (const consumer of census.consumers.filter((entry) => !entry.file.startsWith('tests/'))) {
    expect(PRIVATE_CONSUMER_REGISTRY.some((entry) => entry.root === consumer.registryRoot)).toBe(true);
  }
});

test('NW-AUD-019: the closed registry itself is well formed', () => {
  const roots = PRIVATE_CONSUMER_REGISTRY.map((entry) => entry.root);
  expect(roots.length).toBeGreaterThanOrEqual(10);
  expect(new Set(roots).size).toBe(roots.length);
  for (const entry of PRIVATE_CONSUMER_REGISTRY) {
    expect(CONSUMER_CLASSES).toContain(entry.klass);
    expect(entry.capabilities.length).toBeGreaterThanOrEqual(1);
    for (const capability of entry.capabilities) expect(CONSUMER_ACTIVITIES).toContain(capability);
  }
});

test('NW-AUD-019: unknown consumers fail closed', () => {
  const census = buildPrivateConsumerCensus([ROGUE_WRITER]);
  expect(census.ok).toBe(false);
  expect(census.consumerCount).toBe(0);
  expect(census.violations.some((violation) => violation.code === 'UNKNOWN_CONSUMER' && violation.file === ROGUE_WRITER.file)).toBe(true);
  expect(census.violations.some((violation) => violation.code === 'EMPTY_CENSUS')).toBe(true);
});

test('NW-AUD-019: stale registered roots fail closed', () => {
  const firewall = {
    file: 'src/core/prodEvidence/firewall.ts',
    source: [
      "import { containsPrivatePayloadShape } from '../policy/privateScreening';",
      "export const hit = containsPrivatePayloadShape('x');",
    ].join('\n'),
  };
  const census = buildPrivateConsumerCensus([firewall]);
  expect(census.ok).toBe(false);
  // The single provided consumer cannot satisfy every registered root.
  expect(census.violations.some((violation) => violation.code === 'STALE_REGISTRY' && violation.file === 'src/core/reviewStore/')).toBe(true);
});

test('NW-AUD-019: duplicate registry claims fail closed', () => {
  const firewall = {
    file: 'src/core/prodEvidence/firewall.ts',
    source: [
      "import { containsPrivatePayloadShape } from '../policy/privateScreening';",
      "export const hit = containsPrivatePayloadShape('x');",
    ].join('\n'),
  };
  const census = buildPrivateConsumerCensus([firewall], [
    { root: 'src/core/prodEvidence/', klass: 'SCREENING_CALLER', capabilities: ['screen'] },
    { root: 'src/core/prodEvidence/firewall.ts', klass: 'SCREENING_LIBRARY', capabilities: ['screen'] },
  ]);
  expect(census.ok).toBe(false);
  expect(census.violations.some((violation) => violation.code === 'DUPLICATE_REGISTRY' && violation.file === firewall.file)).toBe(true);
});

test('NW-AUD-019: capability bypasses fail closed', () => {
  const census = buildPrivateConsumerCensus([ROGUE_WRITER], [
    { root: 'src/rogue/', klass: 'SCREENING_CALLER', capabilities: ['screen'] },
  ]);
  expect(census.ok).toBe(false);
  expect(census.violations.some((violation) => violation.code === 'CAPABILITY_BYPASS' && violation.file === ROGUE_WRITER.file && violation.detail.includes('write'))).toBe(true);
});

test('NW-AUD-019: an empty universe fails closed rather than proving a vacuous pass', () => {
  const census = buildPrivateConsumerCensus([{ file: 'src/none/other.ts', source: 'export const x = 1;' }]);
  expect(census.ok).toBe(false);
  expect(census.consumerCount).toBe(0);
  expect(census.violations.some((violation) => violation.code === 'EMPTY_CENSUS')).toBe(true);
});
