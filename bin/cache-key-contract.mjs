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
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { OPERATOR_CLI_SCHEMA, defineOperatorCli } from './lib/operator-cli.mjs';
import { loadTypeScriptModule } from './lib/typescript-runtime-loader.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_CONFIG = 'config/cache-key-contracts.v1.json';
const DEFAULT_OUTPUT = 'artifacts/cache-key-contract/current.json';
const MAX_CONFIG_BYTES = 64 * 1024;
const MAX_REPORT_BYTES = 8 * 1024 * 1024;

/** @type {import('./lib/operator-cli.mjs').OperatorCliMetadata} */
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

/**
 * @param {string} code
 * @param {string} [detail]
 */
function fail(code, detail) {
  process.stderr.write(detail === undefined ? `[cache-key-contract] ERROR: ${code}\n` : `[cache-key-contract] ERROR: ${code}: ${detail}\n`);
  process.exitCode = 2;
}

/**
 * NW-AUD-009: the caller's exact schema validator for the cache-key report.
 * The publication boundary admits nothing this shape does not carry, before
 * any filesystem change.
 *
 * @param {unknown} payload
 */
function validateCacheKeyReport(payload) {
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('REPORT_NOT_AN_OBJECT');
  const report = /** @type {Record<string, unknown>} */ (payload);
  if (report.schemaVersion !== 'nightwatch.cache-key-report.v1') throw new Error('REPORT_SCHEMA_INVALID');
  if (typeof report.verdict !== 'string') throw new Error('REPORT_VERDICT_INVALID');
  if (!Array.isArray(report.contracts)) throw new Error('REPORT_CONTRACTS_INVALID');
  for (const contract of report.contracts) {
    if (contract === null || typeof contract !== 'object' || Array.isArray(contract)) throw new Error('REPORT_CONTRACT_INVALID');
    const value = /** @type {Record<string, unknown>} */ (contract);
    if (typeof value.contractId !== 'string') throw new Error('REPORT_CONTRACT_ID_INVALID');
    if (typeof value.verdict !== 'string') throw new Error('REPORT_CONTRACT_VERDICT_INVALID');
    if (!Array.isArray(value.rows)) throw new Error('REPORT_CONTRACT_ROWS_INVALID');
  }
  if (typeof report.note !== 'string') throw new Error('REPORT_NOTE_INVALID');
  if (typeof report.reportDigest !== 'string' || !/^[a-z]{3}:sha256:[0-9a-f]{24}$/.test(report.reportDigest)) throw new Error('REPORT_DIGEST_INVALID');
}

/**
 * NW-AUD-009: publish the sanitized cache-key report through the ONE governed
 * local-report boundary — complete admission in memory, then same-directory
 * exclusive staging and an atomic replace. A symlinked or non-regular
 * destination is refused rather than followed, and no observer ever sees a
 * truncated intermediate.
 *
 * @param {import('../src/core/source/cacheKeyContract').CacheKeyReport} report
 * @param {string} destination
 * @returns {string | null} the categorical publication failure, or null on success
 */
function publishReport(report, destination) {
  const { publishLocalReport } = loadTypeScriptModule('src/core/policy/localReportPublication.ts', { root });
  const published = publishLocalReport({
    profile: 'CURRENT_REPLACE',
    payload: report,
    validate: validateCacheKeyReport,
    maxBytes: MAX_REPORT_BYTES,
    destination,
    digest: (canonical) => `sha256:${crypto.createHash('sha256').update(canonical, 'utf8').digest('hex').slice(0, 24)}`,
  });
  return published.ok ? null : published.failure;
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
  let topology;
  try {
    core = loadTypeScriptModule('src/core/source/cacheKeyContract.ts', { root });
    source = loadTypeScriptModule('src/core/source/siblingSource.ts', { root });
    universe = loadTypeScriptModule('src/core/source/universe.ts', { root });
    // M6 (7.8/B-10): the ONE sibling-root resolution.
    topology = loadTypeScriptModule('src/core/policy/sourceTopology.ts', { root });
  } catch (error) {
    fail('CORE_LOAD_FAILED', error instanceof Error ? error.message : 'unknown load failure');
    return;
  }

  // The repositories root is NEVER derived from this checkout's location (a
  // C-00 session worktree lives outside the workspace tree).
  const repositoriesRoot = path.resolve(topology.resolveSiblingRoot());
  const access = source.createSiblingSourceAccess(repositoriesRoot, { admittedRepositoryIds: universe.ownerApprovedRepositoryIds() });
  const report = core.runCacheKeyContract({ config, reader: access.reader, currentness: access.currentness });

  // NW-AUD-009: publication goes through the governed boundary; a refusal is
  // the same categorical REPORT_WRITE_FAILED the direct write reported.
  const publicationFailure = publishReport(report, path.resolve(outPath));
  if (publicationFailure !== null) {
    fail('REPORT_WRITE_FAILED', publicationFailure);
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
