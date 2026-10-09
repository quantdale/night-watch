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
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { OPERATOR_CLI_SCHEMA, defineOperatorCli } from './lib/operator-cli.mjs';
import { loadTypeScriptModule } from './lib/typescript-runtime-loader.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_CONFIG = 'config/record-identity-contracts.v1.json';
const DEFAULT_OUTPUT = 'artifacts/record-identity/current.json';
const MAX_CONFIG_BYTES = 64 * 1024;
const MAX_REPORT_BYTES = 8 * 1024 * 1024;

/** @type {import('./lib/operator-cli.mjs').OperatorCliMetadata} */
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

/**
 * @param {string} code
 * @param {string} [detail]
 */
function fail(code, detail) {
  process.stderr.write(detail === undefined ? `[record-identity] ERROR: ${code}\n` : `[record-identity] ERROR: ${code}: ${detail}\n`);
  process.exitCode = 2;
}

/**
 * NW-AUD-009: the caller's exact schema validator for the record-identity
 * report. Every reproduction in it is SYNTHETIC, and the publication boundary
 * admits nothing this shape does not carry, before any filesystem change.
 *
 * @param {unknown} payload
 */
function validateRecordIdentityReport(payload) {
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('REPORT_NOT_AN_OBJECT');
  const report = /** @type {Record<string, unknown>} */ (payload);
  if (report.schemaVersion !== 'nightwatch.record-identity-report.v1') throw new Error('REPORT_SCHEMA_INVALID');
  if (report.extractionIdentity !== 'nightwatch.record-identity-extraction.v1') throw new Error('REPORT_EXTRACTION_IDENTITY_INVALID');
  if (report.productionStateClaim !== 'NONE') throw new Error('REPORT_PRODUCTION_STATE_CLAIM_INVALID');
  if (report.syntheticReproductionOnly !== true) throw new Error('REPORT_SYNTHETIC_CLAIM_INVALID');
  if (!Array.isArray(report.contracts)) throw new Error('REPORT_CONTRACTS_INVALID');
  for (const contract of report.contracts) {
    if (contract === null || typeof contract !== 'object' || Array.isArray(contract)) throw new Error('REPORT_CONTRACT_INVALID');
    const value = /** @type {Record<string, unknown>} */ (contract);
    if (typeof value.contractId !== 'string') throw new Error('REPORT_CONTRACT_ID_INVALID');
    if (typeof value.verdict !== 'string') throw new Error('REPORT_CONTRACT_VERDICT_INVALID');
    if (!Array.isArray(value.reasonCodes)) throw new Error('REPORT_CONTRACT_REASON_CODES_INVALID');
  }
  if (typeof report.reportDigest !== 'string' || !/^[a-z]{3}:sha256:[0-9a-f]{24}$/.test(report.reportDigest)) throw new Error('REPORT_DIGEST_INVALID');
}

/**
 * NW-AUD-009: publish the sanitized record-identity report through the ONE
 * governed local-report boundary — complete admission in memory, then
 * same-directory exclusive staging and an atomic replace. A symlinked or
 * non-regular destination is refused rather than followed.
 *
 * @param {import('../src/core/source/recordIdentity').RecordIdentityReport} report
 * @param {string} destination
 * @returns {string | null} the categorical publication failure, or null on success
 */
function publishReport(report, destination) {
  const { publishLocalReport } = loadTypeScriptModule('src/core/policy/localReportPublication.ts', { root });
  const published = publishLocalReport({
    profile: 'CURRENT_REPLACE',
    payload: report,
    validate: validateRecordIdentityReport,
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
  // M6 (7.8/B-10): the ONE sibling-root resolution (trimmed, env-first).
  const { resolveSiblingRoot } = loadTypeScriptModule('src/core/policy/sourceTopology.ts');
  const core = loadTypeScriptModule('src/core/source/recordIdentity.ts');

  const siblingRoot = path.resolve(resolveSiblingRoot());
  const access = createSiblingSourceAccess(siblingRoot);
  const report = core.runRecordIdentityContracts({ config, reader: access.reader, currentness: access.currentness });

  // NW-AUD-009: publication goes through the governed boundary; a refusal is
  // the same categorical REPORT_WRITE_FAILED the direct write reported.
  const publicationFailure = publishReport(report, path.resolve(outPath));
  if (publicationFailure !== null) {
    return fail('REPORT_WRITE_FAILED', publicationFailure);
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
