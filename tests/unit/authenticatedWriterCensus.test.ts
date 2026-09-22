// NW-AUD-018 — total authenticated evidence writer census.
//
// Proves discovery is non-zero and total over the repository (including the
// manual bypass writers the audit cited), that every run-root writer is
// claimed by exactly one closed-registry entry, and that unknown writers,
// stale registrations, duplicate roots, and empty universes fail closed.

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  AUTHENTICATED_WRITER_REGISTRY,
  WRITER_CLASSES,
  buildAuthenticatedWriterCensus,
  discoverRunRootWrites,
} from '../../bin/lib/authenticatedWriterCensus.mjs';

const ROOT = path.join(__dirname, '..', '..');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'test-results', 'artifacts', '.tmp-nightwatch', 'archive'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(mjs|ts)$/.test(entry.name) && !entry.name.endsWith('.d.ts') && !entry.name.endsWith('.d.mts')) out.push(full);
  }
  return out;
}

function repositorySources(): Array<{ file: string; source: string }> {
  const files = ['.agent', 'bin', 'src', 'tests', 'corpus'].flatMap((d) => {
    const full = path.join(ROOT, d);
    return fs.existsSync(full) ? walk(full) : [];
  });
  return files.map((file) => ({
    file: path.relative(ROOT, file).split(path.sep).join('/'),
    source: fs.readFileSync(file, 'utf8'),
  }));
}

test('NW-AUD-018: writer census is non-zero, total, and digestible', () => {
  const census = buildAuthenticatedWriterCensus(repositorySources());
  expect(census.schemaVersion).toBe('nightwatch.authenticated-writer-census.v1');
  expect(census.violations).toEqual([]);
  expect(census.ok).toBe(true);
  expect(census.writerCount).toBeGreaterThanOrEqual(8);
  expect(census.productionWriterCount).toBeGreaterThanOrEqual(6);
  expect(census.digest).toMatch(/^sha256:[0-9a-f]{24}$/);
  expect(new Set(census.writers.map((w) => w.identity)).size).toBe(census.writers.length);
  for (const klass of WRITER_CLASSES) {
    expect(Object.prototype.hasOwnProperty.call(census.byClass, klass)).toBe(true);
  }
  expect(census.byClass.RECORDER_FIREWALLED).toBe(1);
  expect(census.byClass.MANUAL_PUBLISHER).toBeGreaterThanOrEqual(5);
  // The audit's cited bypass writers are all claimed.
  const byFile = new Map(census.writers.map((w) => [w.file, w]));
  for (const cited of [
    'src/core/evidence/runRecorder.ts',
    'src/core/evidence/destinationManifest.ts',
    'tests/manual/phase4-real-exploration.ts',
    'tests/manual/phase9b-contained-dev-semantic.ts',
    'tests/manual/phase22-contained-dev-semantic.ts',
    'bin/evidence-retention.mjs',
    'src/auth/directRunner.ts',
  ]) {
    expect(byFile.has(cited), cited).toBe(true);
  }
  expect(byFile.get('src/core/evidence/runRecorder.ts')?.class).toBe('RECORDER_FIREWALLED');
});

test('NW-AUD-018: the closed writer registry is well formed', () => {
  const roots = AUTHENTICATED_WRITER_REGISTRY.map((e) => e.root);
  expect(new Set(roots).size).toBe(roots.length);
  for (const entry of AUTHENTICATED_WRITER_REGISTRY) {
    expect(WRITER_CLASSES).toContain(entry.klass);
    expect(entry.capabilities.length).toBeGreaterThanOrEqual(1);
  }
});

test('NW-AUD-018: unknown writers and empty universes fail closed', () => {
  const rogue = {
    file: 'src/rogue/publisher.ts',
    source: [
      'import path from \'node:path\';',
      'import fs from \'node:fs\';',
      'declare const recorder: { dir: string };',
      'fs.writeFileSync(path.join(recorder.dir, \'leak.json\'), \'{}\');',
    ].join('\n'),
  };
  const census = buildAuthenticatedWriterCensus([rogue]);
  expect(census.ok).toBe(false);
  expect(census.writerCount).toBe(0);
  expect(census.violations.some((v) => v.code === 'UNKNOWN_WRITER' && v.file === rogue.file)).toBe(true);
  expect(census.violations.some((v) => v.code === 'EMPTY_CENSUS')).toBe(true);
  expect(census.violations.some((v) => v.code === 'STALE_REGISTRY')).toBe(true);
});

test('NW-AUD-018: stale and duplicate registry roots fail closed', () => {
  const recorder = {
    file: 'src/core/evidence/runRecorder.ts',
    source: 'fs.writeFileSync(require(\'path\').join(this.dir, \'x.json\'), \'{}\');',
  };
  const stale = buildAuthenticatedWriterCensus([recorder], [
    { root: 'src/core/evidence/runRecorder.ts', klass: 'RECORDER_FIREWALLED', capabilities: ['firewall'] },
    { root: 'src/core/evidence/never-written.ts', klass: 'MANUAL_PUBLISHER', capabilities: ['owner-local-publication'] },
  ]);
  expect(stale.ok).toBe(false);
  expect(stale.violations.some((v) => v.code === 'STALE_REGISTRY' && v.file.includes('never-written'))).toBe(true);

  const duplicate = buildAuthenticatedWriterCensus([recorder], [
    { root: 'src/core/evidence/runRecorder.ts', klass: 'RECORDER_FIREWALLED', capabilities: ['firewall'] },
    { root: 'src/core/evidence/runRecorder.ts', klass: 'MANUAL_PUBLISHER', capabilities: ['owner-local-publication'] },
  ]);
  expect(duplicate.ok).toBe(false);
  expect(duplicate.violations.some((v) => v.code === 'DUPLICATE_REGISTRY')).toBe(true);
});

test('NW-AUD-018: discovery resolves const indirection and local wrappers', () => {
  const indirect = discoverRunRootWrites('tests/manual/example.ts', [
    'const fs = require(\'node:fs\');',
    'const path = require(\'node:path\');',
    'const dir = path.join(root, \'artifacts\', `${runId}-comparison`);',
    'fs.writeFileSync(path.join(dir, \'x.json\'), \'{}\');',
  ].join('\n'));
  expect(indirect.some((w) => w.targets.includes('artifacts-tree'))).toBe(true);

  const wrapper = discoverRunRootWrites('tests/manual/example2.ts', [
    'function writeAtomic(file, value) { fs.writeFileSync(file, JSON.stringify(value)); }',
    'writeAtomic(path.join(recorder.dir, \'exploration.json\'), {});',
  ].join('\n'));
  expect(wrapper.some((w) => w.op.startsWith('wrapper:writeAtomic'))).toBe(true);

  // A read-only file with pure helpers is never a writer.
  const reader = discoverRunRootWrites('src/rogue/reader.ts', [
    'function pathInside(candidate, parent) { return true; }',
    'export const read = (f) => pathInside(f, \'x\');',
  ].join('\n'));
  expect(reader).toEqual([]);
});
