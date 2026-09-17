#!/usr/bin/env node
// @ts-check

// ---------------------------------------------------------------------------
// NW-HIST-005 (Wave 1, Phase 1a) — CACHE_KEY_CONTRACT report-only driver.
//
// Loads the owner-declared contract registry, reads the declared source paths
// through the confined sibling-source boundary, runs the pure extraction and
// coverage matcher, and writes the sanitized report. This driver never executes
// product code and never contacts a cache, database, network, or cloud.
//
// Phase 1a boundary: the report is an observation, never a finding.
//
// Usage: node bin/cache-key-contract.mjs [--config <path>] [--json] [--out <path>]
// Exit: 0 no NOT_COVERED · 1 NOT_COVERED present · 2 declaration/infrastructure error.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { OPERATOR_CLI_SCHEMA, defineOperatorCli } from './lib/operator-cli.mjs';
import { loadTypeScriptModule } from './lib/typescript-runtime-loader.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_CONFIG = 'config/cache-key-contracts.v1.json';
const DEFAULT_OUTPUT = 'artifacts/cache-key-contract/current.json';
const MAX_CONFIG_BYTES = 64 * 1024;

const CLI_METADATA = {
  schemaVersion: OPERATOR_CLI_SCHEMA,
  name: 'cache-key-contract',
  entry: 'bin/cache-key-contract.mjs',
  purpose: 'Report declared consumer cache-key shapes against declared producer invalidation patterns; report-only, no execution.',
  group: 'validate',
  flags: [
    { name: '--config', shape: 'path', summary: 'owner-declared cache-key contract registry (default config/cache-key-contracts.v1.json, at most 64 KiB)' },
    { name: '--json', shape: 'boolean', summary: 'emit the sanitized report as JSON' },
    { name: '--out', shape: 'path', summary: 'report destination (default artifacts/cache-key-contract/current.json)' },
  ],
  json: true,
  authorization: 'LOCAL_ONLY',
  artifacts: ['artifacts/cache-key-contract/current.json'],
};

function fail(code, detail) {
  process.stderr.write(detail === undefined ? `[cache-key-contract] ERROR: ${code}\n` : `[cache-key-contract] ERROR: ${code}: ${detail}\n`);
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

  let config;
  try {
    const stat = fs.statSync(configPath);
    if (!stat.isFile() || stat.size > MAX_CONFIG_BYTES) throw new Error('config must be a regular file of at most 64 KiB');
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    fail('CONFIG_UNREADABLE', error instanceof Error ? error.message : 'unknown read failure');
    return;
  }

  let core;
  let source;
  let universe;
  let siblingRoot;
  try {
    core = loadTypeScriptModule('src/core/source/cacheKeyContract.ts', { root });
    source = loadTypeScriptModule('src/core/source/siblingSource.ts', { root });
    universe = loadTypeScriptModule('src/core/source/universe.ts', { root });
    siblingRoot = loadTypeScriptModule('src/core/source/siblingRoot.ts', { root });
  } catch (error) {
    fail('CORE_LOAD_FAILED', error instanceof Error ? error.message : 'unknown load failure');
    return;
  }

  // The repositories root is NEVER derived from this checkout's location (a
  // C-00 session worktree lives outside the workspace tree).
  const repositoriesRoot = path.resolve(process.env.NIGHTWATCH_REPOS_ROOT ?? siblingRoot.DEFAULT_SIBLING_ROOT);
  const access = source.createSiblingSourceAccess(repositoriesRoot, { admittedRepositoryIds: universe.ownerApprovedRepositoryIds() });
  const report = core.runCacheKeyContract({ config, reader: access.reader, currentness: access.currentness });

  try {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  } catch (error) {
    fail('REPORT_WRITE_FAILED', error instanceof Error ? error.message : 'unknown write failure');
    return;
  }

  if (cli.flags['--json'] === true) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    for (const contract of report.contracts) {
      process.stdout.write(`[cache-key-contract] ${String(contract.contractId)} ${contract.verdict} rows=${contract.rows.length}\n`);
      for (const row of contract.rows) {
        process.stdout.write(`[cache-key-contract]   ${String(row.consumerShapeDigest ?? '-')} ${row.verdict}${row.reasonCode === null ? '' : ` ${row.reasonCode}`}\n`);
      }
    }
    process.stdout.write(`[cache-key-contract] verdict=${report.verdict} digest=${report.reportDigest}\n`);
    process.stdout.write(`[cache-key-contract] admissionRefusals=${access.readLedger.totalAdmissionRefusals()}\n`);
  }

  const hasNotCovered = report.contracts.some((contract) => contract.rows.some((row) => row.verdict === 'NOT_COVERED'));
  const hasDeclarationError = report.verdict === 'DECLARATION_INVALID';
  process.exitCode = hasDeclarationError ? 2 : hasNotCovered ? 1 : 0;
}

if (typeof process.argv[1] === 'string' && path.basename(process.argv[1]) === 'cache-key-contract.mjs') {
  main();
}
