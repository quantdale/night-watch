import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import {
  clearTypeScriptRuntimeTranspileCache,
  loadTypeScriptModule,
  loadTypeScriptModules,
  typeScriptRuntimeProfileNames,
  typeScriptRuntimeTranspileCacheStats,
} from '../../bin/lib/typescript-runtime-loader.mjs';

const nodeRequire = createRequire(path.join(process.cwd(), 'package.json'));

function fixture(source: string): { readonly root: string; readonly file: string; readonly dispose: () => void } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-ts-loader-'));
  const file = path.join(root, 'module.ts');
  fs.writeFileSync(file, source);
  return { root, file, dispose: () => fs.rmSync(root, { recursive: true, force: true }) };
}

function boundedFixtures(count: number): { readonly files: readonly string[]; readonly dispose: () => void } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-ts-loader-bound-'));
  const files = Array.from({ length: count }, (_, index) => {
    const file = path.join(root, `module-${index}.ts`);
    fs.writeFileSync(file, `export const value: number = ${index};\n`);
    return file;
  });
  return { files, dispose: () => fs.rmSync(root, { recursive: true, force: true }) };
}

function forget(file: string): void {
  delete nodeRequire.cache[nodeRequire.resolve(file)];
}

test.describe('central TypeScript runtime loader', () => {
  test.beforeEach(() => clearTypeScriptRuntimeTranspileCache());

  test('uses a named profile, restores the hook, and reuses exact source derivatives', () => {
    const currentHook = nodeRequire.extensions['.ts'];
    const file = fixture('export const answer: number = 42;\n');
    try {
      expect(typeScriptRuntimeProfileNames()).toEqual(['NIGHTWATCH_NODE_ES2022_COMMONJS', 'NIGHTWATCH_NODE_ES2020_COMMONJS']);
      const first = loadTypeScriptModule<{ readonly answer: number }>(file.file);
      forget(file.file);
      const second = loadTypeScriptModule<{ readonly answer: number }>(file.file);
      expect(first.answer).toBe(42);
      expect(second.answer).toBe(42);
      expect(nodeRequire.extensions['.ts']).toBe(currentHook);
      expect(typeScriptRuntimeTranspileCacheStats()).toMatchObject({ hits: 1, misses: 1, transpiles: 1, entries: 1 });
    } finally {
      forget(file.file);
      file.dispose();
    }
  });

  test('supports declared module lists and invalidates on exact content changes', () => {
    const first = fixture('export const value = 1;\n');
    const second = fixture('export const value = 2;\n');
    try {
      const modules = loadTypeScriptModules<{ readonly value: number }>([first.file, second.file]);
      expect(modules.map((module) => module.value)).toEqual([1, 2]);
      const originalStat = fs.statSync(first.file);
      fs.writeFileSync(first.file, 'export const value = 3;\n');
      fs.utimesSync(first.file, originalStat.atime, originalStat.mtime);
      forget(first.file);
      const changed = loadTypeScriptModule<{ readonly value: number }>(first.file);
      expect(changed.value).toBe(3);
      expect(typeScriptRuntimeTranspileCacheStats()).toMatchObject({ misses: 3, transpiles: 3, entries: 3 });
    } finally {
      forget(first.file);
      forget(second.file);
      first.dispose();
      second.dispose();
    }
  });

  test('ignores mtime-only changes but separates explicit compiler profiles', () => {
    const file = fixture('export const value = 11;\n');
    try {
      const originalStat = fs.statSync(file.file);
      const first = loadTypeScriptModule<{ readonly value: number }>(file.file);
      forget(file.file);
      fs.utimesSync(file.file, originalStat.atime, new Date(originalStat.mtimeMs + 10_000));
      const mtimeOnly = loadTypeScriptModule<{ readonly value: number }>(file.file);
      forget(file.file);
      const alternateProfile = loadTypeScriptModule<{ readonly value: number }>(file.file, { profile: 'NIGHTWATCH_NODE_ES2020_COMMONJS' });
      expect(first.value).toBe(11);
      expect(mtimeOnly.value).toBe(11);
      expect(alternateProfile.value).toBe(11);
      expect(typeScriptRuntimeTranspileCacheStats()).toMatchObject({ hits: 1, misses: 2, transpiles: 2, entries: 2 });
    } finally {
      forget(file.file);
      file.dispose();
    }
  });

  test('restores nested and throwing hooks without retaining a failed derivative', () => {
    const outer = fixture('const inner = require("./inner.ts"); export const value = inner.value;\n');
    const innerFile = path.join(outer.root, 'inner.ts');
    fs.writeFileSync(innerFile, 'export const value = 7;\n');
    const throwing = fixture('throw new Error("SYNTHETIC_RUNTIME_FAILURE");\n');
    const originalHook = nodeRequire.extensions['.ts'];
    try {
      const nested = loadTypeScriptModule<{ readonly value: number }>(outer.file);
      expect(nested.value).toBe(7);
      forget(outer.file);
      expect(() => loadTypeScriptModule(throwing.file)).toThrow('SYNTHETIC_RUNTIME_FAILURE');
      expect(nodeRequire.extensions['.ts']).toBe(originalHook);
      const statsAfterFailure = typeScriptRuntimeTranspileCacheStats();
      expect(statsAfterFailure.entries).toBe(2);
      forget(outer.file);
      loadTypeScriptModule<{ readonly value: number }>(outer.file);
      expect(typeScriptRuntimeTranspileCacheStats()).toMatchObject({ hits: 1, misses: 3, transpiles: 3, entries: 2 });
    } finally {
      forget(outer.file);
      forget(innerFile);
      forget(throwing.file);
      outer.dispose();
      throwing.dispose();
    }
  });

  test('bounds the derivative cache and evicts the least-recently-used entry', () => {
    const modules = boundedFixtures(257);
    try {
      for (const [index, file] of modules.files.entries()) {
        const loaded = loadTypeScriptModule<{ readonly value: number }>(file);
        expect(loaded.value).toBe(index);
        forget(file);
      }
      expect(typeScriptRuntimeTranspileCacheStats()).toMatchObject({
        hits: 0,
        misses: 257,
        evictions: 1,
        transpiles: 257,
        entries: 256,
        maxEntries: 256,
      });

      const firstFile = modules.files[0];
      if (firstFile === undefined) throw new Error('SYNTHETIC_FIXTURE_EMPTY');
      const evicted = loadTypeScriptModule<{ readonly value: number }>(firstFile);
      expect(evicted.value).toBe(0);
      expect(typeScriptRuntimeTranspileCacheStats()).toMatchObject({ hits: 0, misses: 258, evictions: 2, entries: 256 });
    } finally {
      for (const file of modules.files) forget(file);
      modules.dispose();
    }
  });

  test('rejects an over-limit module list before installing a hook or compiling', () => {
    const moduleFile = fixture('export const value = 1;\n');
    const currentHook = nodeRequire.extensions['.ts'];
    try {
      expect(() => loadTypeScriptModules(Array.from({ length: 129 }, () => moduleFile.file))).toThrow('TYPESCRIPT_RUNTIME_MODULE_LIST_INVALID');
      expect(nodeRequire.extensions['.ts']).toBe(currentHook);
      expect(typeScriptRuntimeTranspileCacheStats()).toMatchObject({ hits: 0, misses: 0, transpiles: 0, entries: 0, evictions: 0 });
    } finally {
      forget(moduleFile.file);
      moduleFile.dispose();
    }
  });
});
