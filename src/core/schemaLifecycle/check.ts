// ---------------------------------------------------------------------------
// Schema version lifecycle — filesystem entry point.
//
// This is the ONLY module in the cone that reads the filesystem. It exists so
// the pure scanner/validator can be driven from a CLI or a test without
// embedding path knowledge in them. It reads; it never writes.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { SCHEMA_FAMILIES } from './declarations';
import { READ_COMPATIBILITY_FIXTURES } from './fixtures';
import { SCHEMA_MIGRATIONS } from './migrations';
import { discoverSchemaIdentifiers, type ScannedSourceFile } from './scanner';
import { validateSchemaLifecycle } from './validate';
import type {
  DiscoveredSchemaIdentifier,
  SchemaFamilyDeclaration,
  SchemaLifecycleJudgement,
  SchemaStoreLocation,
} from './types';

const SOURCE_EXTENSION_RE = /\.(?:ts|tsx|mjs|js)$/;
const MAX_SOURCE_FILES = 20_000;
const MAX_SOURCE_BYTES = 64 * 1024 * 1024;

export interface SchemaLifecycleCheckOptions {
  readonly root: string;
  readonly declarations?: readonly SchemaFamilyDeclaration[];
  readonly decisionsPath?: string;
}

export interface SchemaLifecycleCheckResult {
  readonly judgement: SchemaLifecycleJudgement;
  readonly discovered: readonly DiscoveredSchemaIdentifier[];
}

/** Read every source file under `src/`, sorted, never following symlinks. */
export function readSourceTree(root: string): readonly ScannedSourceFile[] {
  const sourceRoot = path.join(root, 'src');
  const files: ScannedSourceFile[] = [];
  let totalBytes = 0;
  const walk = (directory: string): void => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(directory, { withFileTypes: true });
    } catch {
      return;
    }
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        walk(absolute);
        continue;
      }
      if (!entry.isFile() || !SOURCE_EXTENSION_RE.test(entry.name)) continue;
      if (files.length >= MAX_SOURCE_FILES) throw new Error(`SCHEMA_SCAN_TOO_MANY_FILES`);
      const text = fs.readFileSync(absolute, 'utf8');
      totalBytes += Buffer.byteLength(text, 'utf8');
      if (totalBytes > MAX_SOURCE_BYTES) throw new Error('SCHEMA_SCAN_TOO_MANY_BYTES');
      files.push({ path: path.relative(root, absolute).split(path.sep).join('/'), text });
    }
  };
  walk(sourceRoot);
  return files;
}

export function runSchemaLifecycleCheck(options: SchemaLifecycleCheckOptions): SchemaLifecycleCheckResult {
  const root = path.resolve(options.root);
  const declarations = options.declarations ?? SCHEMA_FAMILIES;
  const decisionsPath = options.decisionsPath ?? path.join(root, 'docs', 'DECISIONS.md');
  let decisionsText = '';
  try {
    decisionsText = fs.readFileSync(decisionsPath, 'utf8');
  } catch {
    decisionsText = '';
  }
  const discovered = discoverSchemaIdentifiers(readSourceTree(root));
  return {
    discovered,
    judgement: validateSchemaLifecycle({
      discovered,
      declarations,
      decisionsText,
      registeredMigrationIds: SCHEMA_MIGRATIONS.map((migration) => migration.migrationId),
      registeredFixtureIds: READ_COMPATIBILITY_FIXTURES.map((fixture) => fixture.fixtureId),
    }),
  };
}

// ---------------------------------------------------------------------------
// Bump-time store counting (read-only). Bounded by files and bytes; a file
// that cannot be parsed is counted as total but never as affected, so an
// accidental read failure cannot inflate the orphan cost.
// ---------------------------------------------------------------------------

const MAX_COUNT_FILES = 10_000;
const MAX_COUNT_BYTES = 32 * 1024 * 1024;

export interface StoreRecordCount {
  readonly totalRecords: number;
  readonly affectedRecords: number;
  readonly unreadableRecords: number;
}

export interface CountStoreRecordsOptions {
  readonly root: string;
  /** Matches the files to read, e.g. `review.`. */
  readonly fileNamePrefix?: string;
  /** Matches the files to read, e.g. `.checkpoint.json`. */
  readonly fileNameSuffix?: string;
  /** Extract the schema identifier from a parsed record. */
  readonly selectSchemaVersion: (value: unknown) => string | null;
  /** The version treated as unaffected. Everything else is affected. */
  readonly currentSchema: string;
}

export function countStoreRecordsAtVersion(options: CountStoreRecordsOptions): StoreRecordCount {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(options.root, { withFileTypes: true });
  } catch {
    return { totalRecords: 0, affectedRecords: 0, unreadableRecords: 0 };
  }
  let totalRecords = 0;
  let affectedRecords = 0;
  let unreadableRecords = 0;
  let filesRead = 0;
  let bytesRead = 0;
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (!entry.isFile() || entry.isSymbolicLink()) continue;
    if (options.fileNamePrefix !== undefined && !entry.name.startsWith(options.fileNamePrefix)) continue;
    if (options.fileNameSuffix !== undefined && !entry.name.endsWith(options.fileNameSuffix)) continue;
    if (filesRead >= MAX_COUNT_FILES || bytesRead >= MAX_COUNT_BYTES) break;
    filesRead += 1;
    let text: string;
    try {
      const absolute = path.join(options.root, entry.name);
      const stat = fs.lstatSync(absolute);
      if (stat.size > MAX_COUNT_BYTES - bytesRead) continue;
      text = fs.readFileSync(absolute, 'utf8');
      bytesRead += Buffer.byteLength(text, 'utf8');
    } catch {
      unreadableRecords += 1;
      totalRecords += 1;
      continue;
    }
    totalRecords += 1;
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      unreadableRecords += 1;
      continue;
    }
    const found = options.selectSchemaVersion(parsed);
    if (found !== options.currentSchema) affectedRecords += 1;
  }
  return { totalRecords, affectedRecords, unreadableRecords };
}

export interface StoreCountProbe {
  readonly store: SchemaStoreLocation;
  readonly location: string;
  readonly root: string;
  readonly fileNamePrefix?: string;
  readonly fileNameSuffix?: string;
  readonly selectSchemaVersion: (value: unknown) => string | null;
}

export function countAffectedStores(probes: readonly StoreCountProbe[], currentSchema: string): StoreRecordCount & {
  readonly impacts: readonly { readonly store: SchemaStoreLocation; readonly location: string; readonly affectedRecords: number; readonly totalRecords: number }[];
} {
  const counts = probes.map((probe) => ({ probe, count: countStoreRecordsAtVersion({ ...probe, currentSchema }) }));
  const impacts = counts.map(({ probe, count }) => ({
    store: probe.store,
    location: probe.location,
    affectedRecords: count.affectedRecords,
    totalRecords: count.totalRecords,
  }));
  return {
    totalRecords: counts.reduce((sum, entry) => sum + entry.count.totalRecords, 0),
    affectedRecords: counts.reduce((sum, entry) => sum + entry.count.affectedRecords, 0),
    unreadableRecords: counts.reduce((sum, entry) => sum + entry.count.unreadableRecords, 0),
    impacts,
  };
}
