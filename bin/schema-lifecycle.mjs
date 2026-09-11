#!/usr/bin/env node

// ---------------------------------------------------------------------------
// Schema version lifecycle operator surface (F-17).
//
// LOCAL only, and deliberately not part of any gate:
//
//   check        — run the declaration/disposition structural rule. Read-only.
//   bump-report  — at change time, report the affected stores and the declared
//                  disposition for a persisted family version change.
//   export       — bounded, redacted, read-only dump of owner-local review
//                  records, written ONLY outside the repository. This is the
//                  path an owner takes before a migration an ORPHAN decision
//                  would abandon.
//
// The store roots are never printed and never accepted from an untrusted
// caller: `export` requires an explicit absolute --out destination and refuses
// anything inside the repository.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTypeScriptModule as loadRuntimeTypeScriptModule } from './lib/typescript-runtime-loader.mjs';
import { OPERATOR_CLI_SCHEMA, defineOperatorCli } from './lib/operator-cli.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAX_EXPORT_RECORDS = 10_000;

const CLI_METADATA = {
  schemaVersion: OPERATOR_CLI_SCHEMA,
  name: 'schema-lifecycle',
  entry: 'bin/schema-lifecycle.mjs',
  purpose: 'Check the schema-version lifecycle declarations, report bump impact, and export owner-local records outside the repository.',
  group: 'manage-evidence',
  commands: [
    { name: 'check', summary: 'run the declaration and disposition structural rule (read-only)' },
    { name: 'bump-report', summary: 'report affected stores and the disposition for a persisted version change' },
    { name: 'export', summary: 'write a bounded, redacted review-store export outside the repository' },
  ],
  defaultCommand: 'check',
  flags: [
    { name: '--json', shape: 'boolean', summary: 'emit exactly one JSON document' },
    { name: '--store', shape: 'enum', values: ['reviews'], summary: 'store to export' },
    { name: '--out', shape: 'path', summary: 'absolute destination outside the repository' },
    { name: '--root', shape: 'path', summary: 'injected store root (tests only)' },
    { name: '--schema', shape: 'string', summary: 'schema family for the bump report' },
    { name: '--from', shape: 'integer', summary: 'old version for the bump report' },
    { name: '--to', shape: 'integer', summary: 'new version for the bump report' },
  ],
  json: true,
  authorization: 'LOCAL_ONLY',
  artifacts: ['owner-chosen export path outside the repository (export command only)'],
};

function loadTypeScriptModule(file) {
  return loadRuntimeTypeScriptModule(file, { root: ROOT });
}

function parseArgs(argv) {
  let command = 'check';
  let json = false;
  let store = 'reviews';
  let out = null;
  let root = null;
  let schema = null;
  let from = null;
  let to = null;
  let sawCommand = false;
  for (const argument of argv) {
    if (argument === 'check' || argument === 'bump-report' || argument === 'export') {
      if (sawCommand) throw new Error('USAGE_MULTIPLE_COMMANDS');
      command = argument;
      sawCommand = true;
      continue;
    }
    if (argument === '--json') {
      json = true;
      continue;
    }
    if (argument.startsWith('--store=')) {
      store = argument.slice('--store='.length);
      if (store !== 'reviews') throw new Error('USAGE_STORE_UNKNOWN');
      continue;
    }
    if (argument.startsWith('--out=')) {
      out = argument.slice('--out='.length);
      if (out.length === 0 || out.length > 4096) throw new Error('USAGE_OUT_INVALID');
      continue;
    }
    if (argument.startsWith('--root=')) {
      root = argument.slice('--root='.length);
      if (root.length === 0 || root.length > 4096) throw new Error('USAGE_ROOT_INVALID');
      continue;
    }
    if (argument.startsWith('--schema=')) {
      schema = argument.slice('--schema='.length);
      if (!/^nightwatch\.[A-Za-z0-9_.-]{1,160}$/.test(schema)) throw new Error('USAGE_SCHEMA_INVALID');
      continue;
    }
    if (argument.startsWith('--from=') || argument.startsWith('--to=')) {
      const value = Number.parseInt(argument.slice(argument.indexOf('=') + 1), 10);
      if (!Number.isInteger(value) || value < 1) throw new Error('USAGE_VERSION_INVALID');
      if (argument.startsWith('--from=')) from = value;
      else to = value;
      continue;
    }
    throw new Error(`USAGE_UNKNOWN_ARGUMENT:${argument}`);
  }
  return { command, json, store, out, root, schema, from, to };
}

function status(message) {
  process.stdout.write(`${message}\n`);
}

function runCheck(json) {
  const lifecycle = loadTypeScriptModule('src/core/schemaLifecycle/index.ts');
  const result = lifecycle.runSchemaLifecycleCheck({ root: ROOT });
  if (json) {
    process.stdout.write(`${JSON.stringify(result.judgement, null, 2)}\n`);
  } else {
    status(`[schema-lifecycle] discovered=${result.judgement.discoveredCount} families=${result.judgement.familyCount} persisted=${result.judgement.persistedFamilyCount}`);
    for (const finding of result.judgement.findings) {
      process.stderr.write(`[schema-lifecycle] ERROR: ${finding.code}: ${finding.detail}\n`);
    }
    status(result.judgement.ok ? '[schema-lifecycle] PASS: every schema identifier is declared and every persisted version carries a disposition' : `[schema-lifecycle] FAIL (${result.judgement.findings.length} finding(s))`);
  }
  if (!result.judgement.ok) process.exitCode = 1;
}

function reviewStoreRoot(policy, override) {
  return override ?? policy.privateArtifactRoot(undefined, 'reviews');
}

function runExport(args) {
  if (args.out === null) throw new Error('USAGE_OUT_REQUIRED');
  const lifecycle = loadTypeScriptModule('src/core/schemaLifecycle/index.ts');
  const policy = loadTypeScriptModule('src/core/policy/privateArtifacts.ts');
  const redactionModule = loadTypeScriptModule('src/core/safety/redaction.ts');
  const root = reviewStoreRoot(policy, args.root);
  let names;
  try {
    names = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    // Absent store: an empty export is honest, not an error.
    names = [];
  }
  const files = names
    .filter((entry) => entry.isFile() && !entry.isSymbolicLink() && /^review\.[0-9a-f]+\.[0-9a-f]+\.json$/.test(entry.name))
    .map((entry) => entry.name)
    .sort()
    .slice(0, MAX_EXPORT_RECORDS);
  const records = [];
  for (const name of files) {
    try {
      records.push(JSON.parse(fs.readFileSync(path.join(root, name), 'utf8')));
    } catch {
      // An unreadable record is outside the export's scope; the export never
      // repairs or reports on store contents.
    }
  }
  const redaction = new redactionModule.RedactionLayer();
  const exported = lifecycle.buildSanitizedExport({ store: 'reviews', records, redaction });
  const content = lifecycle.serializeSanitizedExport(exported);
  const written = lifecycle.writeSanitizedExport({ destination: args.out, repositoryRoot: ROOT, content });
  status(`[schema-lifecycle] export: records=${exported.recordCount} truncated=${exported.truncated} bytes=${Buffer.byteLength(content, 'utf8')} written=outside-repository`);
  if (args.json) process.stdout.write(`${JSON.stringify({ schemaVersion: exported.schemaVersion, recordCount: exported.recordCount, truncated: exported.truncated, destination: path.basename(written) }, null, 2)}\n`);
}

function runBumpReport(args) {
  if (args.schema === null || args.from === null || args.to === null) throw new Error('USAGE_BUMP_REPORT_REQUIRES_SCHEMA_FROM_TO');
  const lifecycle = loadTypeScriptModule('src/core/schemaLifecycle/index.ts');
  const policy = loadTypeScriptModule('src/core/policy/privateArtifacts.ts');
  const declaration = lifecycle.SCHEMA_FAMILIES.find((family) => family.family === args.schema);
  if (declaration === undefined) throw new Error('USAGE_SCHEMA_UNKNOWN');
  const probes = [];
  if (declaration.store === 'REVIEW_STORE') {
    const reviewsRoot = reviewStoreRoot(policy, args.root);
    if (fs.existsSync(reviewsRoot)) {
      probes.push({
        store: 'REVIEW_STORE',
        location: '<owner-local review store>',
        root: reviewsRoot,
        fileNamePrefix: 'review.',
        selectSchemaVersion: (value) => (value !== null && typeof value === 'object' && typeof value.schemaVersion === 'string' ? value.schemaVersion : null),
      });
    }
  } else if (declaration.store === 'AGENT_RECORDS') {
    const campaignsRoot = args.root ?? path.join(os.homedir(), '.nightwatch', 'campaigns');
    if (fs.existsSync(campaignsRoot)) {
      probes.push({
        store: 'AGENT_RECORDS',
        location: '<owner-local agent campaign store>',
        root: campaignsRoot,
        fileNameSuffix: '.checkpoint.json',
        selectSchemaVersion: (value) => {
          if (value === null || typeof value !== 'object') return null;
          // Some versioned contracts live inside the checkpoint document
          // rather than at its top level; count the version the family uses.
          if (declaration.family === 'nightwatch.agent-budget') {
            const state = value.state;
            const budget = state !== null && typeof state === 'object' ? state.budget : null;
            const budgetPolicy = budget !== null && typeof budget === 'object' ? budget.policy : null;
            return budgetPolicy !== null && typeof budgetPolicy === 'object' && typeof budgetPolicy.schemaVersion === 'string' ? budgetPolicy.schemaVersion : null;
          }
          return typeof value.schemaVersion === 'string' ? value.schemaVersion : null;
        },
      });
    }
  } else if (declaration.store === 'CAMPAIGN_CHECKPOINTS') {
    const findingsRoot = args.root ?? policy.privateArtifactRoot(undefined, 'findings');
    if (fs.existsSync(findingsRoot)) {
      probes.push({
        store: 'CAMPAIGN_CHECKPOINTS',
        location: '<owner-local campaign store>',
        root: findingsRoot,
        fileNameSuffix: '.checkpoint.json',
        selectSchemaVersion: (value) => {
          if (value === null || typeof value !== 'object') return null;
          const checkpoint = value.checkpoint;
          return checkpoint !== null && typeof checkpoint === 'object' && typeof checkpoint.schemaVersion === 'string' ? checkpoint.schemaVersion : null;
        },
      });
    }
  }
  const currentSchema = declaration.currentVersion === null ? '' : `${declaration.family}.v${declaration.currentVersion}`;
  const counted = currentSchema === '' ? { impacts: [] } : lifecycle.countAffectedStores(probes, currentSchema);
  const report = lifecycle.buildSchemaBumpImpactReport({ declaration, fromVersion: args.from, toVersion: args.to, impacts: counted.impacts });
  if (args.json) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  else for (const line of report.lines) status(line);
  if (!report.ok) process.exitCode = 1;
}

function main() {
  const cli = defineOperatorCli(CLI_METADATA, { entryUrl: import.meta.url });
  if (cli.stop) return;
  const args = parseArgs(process.argv.slice(2));
  if (args.command === 'check') runCheck(args.json);
  else if (args.command === 'export') runExport(args);
  else runBumpReport(args);
}

if (typeof process.argv[1] === 'string' && path.basename(process.argv[1]) === 'schema-lifecycle.mjs') {
  main();
}
