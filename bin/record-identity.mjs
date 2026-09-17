#!/usr/bin/env node
// @ts-check

// ---------------------------------------------------------------------------
// NW-HIST-004 (Wave 2) — record-identity report driver.
//
// Loads the owner-declared record-identity contracts, reads the declared source
// paths through the confined sibling-source boundary, runs the bounded
// extraction and the deterministic synthetic sequences, and writes the
// sanitized report. This driver never executes product code and never contacts
// a datastore, cache, network, or cloud.
//
// Every reproduction in the report is SYNTHETIC: productionStateClaim NONE.
//
// Usage: node bin/record-identity.mjs [--config <path>] [--json] [--out <path>]
// Exit: 0 no reproduction · 1 reproduction present · 2 declaration/infrastructure error.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { OPERATOR_CLI_SCHEMA, defineOperatorCli } from './lib/operator-cli.mjs';
import { loadTypeScriptModule } from './lib/typescript-runtime-loader.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_CONFIG = 'config/record-identity-contracts.v1.json';
const DEFAULT_OUTPUT = 'artifacts/record-identity/current.json';
const MAX_CONFIG_BYTES = 64 * 1024;

const CLI_METADATA = {
  schemaVersion: OPERATOR_CLI_SCHEMA,
  name: 'record-identity',
  entry: 'bin/record-identity.mjs',
  purpose: 'Report declared record-identity contracts against bounded source facts and deterministic synthetic sequences; report-only, no execution.',
  group: 'validate',
  flags: [
    { name: '--config', shape: 'path', summary: 'owner-declared record-identity contract registry (default config/record-identity-contracts.v1.json, at most 64 KiB)' },
    { name: '--json', shape: 'boolean', summary: 'emit the sanitized report as JSON' },
    { name: '--out', shape: 'path', summary: 'report destination (default artifacts/record-identity/current.json)' },
  ],
  json: true,
  authorization: 'LOCAL_ONLY',
  artifacts: ['artifacts/record-identity/current.json'],
};

function fail(code, detail) {
  process.stderr.write(detail === undefined ? `[record-identity] ERROR: ${code}\n` : `[record-identity] ERROR: ${code}: ${detail}\n`);
  process.exitCode = 2;
}

function main() {
  const cli = defineOperatorCli(CLI_METADATA, { entryUrl: import.meta.url });
  if (cli.stop) return;
  if (!cli.ok) {
    process.exitCode = 2;
    return;
  }
  const configArg = cli.flags['--config'];
  const configPath = typeof configArg === 'string' && configArg.trim() !== '' ? configArg : path.join(root, DEFAULT_CONFIG);
  const outArg = cli.flags['--out'];
  const outPath = typeof outArg === 'string' && outArg.trim() !== '' ? outArg : path.join(root, DEFAULT_OUTPUT);

  let configText;
  try {
    configText = fs.readFileSync(configPath, 'utf8');
  } catch {
    return fail('CONFIG_UNREADABLE', configPath);
  }
  if (configText.length > MAX_CONFIG_BYTES) return fail('CONFIG_TOO_LARGE');
  let config;
  try {
    config = JSON.parse(configText);
  } catch {
    return fail('CONFIG_INVALID_JSON');
  }

  const { createSiblingSourceAccess } = loadTypeScriptModule('src/core/source/siblingSource.ts');
  const { DEFAULT_SIBLING_ROOT } = loadTypeScriptModule('src/core/source/siblingRoot.ts');
  const core = loadTypeScriptModule('src/core/source/recordIdentity.ts');

  const siblingRoot = path.resolve(process.env.NIGHTWATCH_REPOS_ROOT ?? DEFAULT_SIBLING_ROOT);
  const access = createSiblingSourceAccess(siblingRoot);
  const report = core.runRecordIdentityContracts({ config, reader: access.reader, currentness: access.currentness });

  try {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  } catch (error) {
    return fail('REPORT_WRITE_FAILED', String(error?.code ?? 'UNKNOWN'));
  }

  if (cli.flags['--json'] === true) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    for (const contract of report.contracts) {
      process.stdout.write(`[record-identity] ${contract.contractId} ${contract.verdict}\n`);
    }
    process.stdout.write(`[record-identity] digest=${report.reportDigest} contracts=${report.contracts.length}\n`);
  }
  const reproduced = report.contracts.some((contract) => contract.verdict === 'DUPLICATE_IDENTITY_REPRODUCED' || contract.verdict === 'DERIVED_RECORD_ORPHAN_REPRODUCED');
  const invalid = report.contracts.some((contract) => contract.verdict === 'DECLARATION_INVALID');
  process.exitCode = invalid ? 2 : reproduced ? 1 : 0;
}

main();
