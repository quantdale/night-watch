#!/usr/bin/env node
// @ts-check

// ---------------------------------------------------------------------------
// NW-PROJ-003 (Wave 2, static precursor) — silent zero-output driver.
//
// Loads the owner-declared handler/input contracts, reads the declared source
// through the confined sibling-source boundary, runs the bounded static guard
// analysis, and writes the sanitized report. This is NOT a runtime claim: the
// report carries runtimeFailureClaim NONE. No product code executes.
//
// Usage: node bin/silent-zero-output.mjs [--config <path>] [--json] [--out <path>]
// Exit: 0 no precursor · 1 precursor present · 2 declaration error.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { OPERATOR_CLI_SCHEMA, defineOperatorCli } from './lib/operator-cli.mjs';
import { loadTypeScriptModule } from './lib/typescript-runtime-loader.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_CONFIG = 'config/silent-zero-output-contracts.v1.json';
const DEFAULT_OUTPUT = 'artifacts/silent-zero-output/current.json';
const MAX_CONFIG_BYTES = 64 * 1024;
const MAX_REPORT_BYTES = 8 * 1024 * 1024;

/** @type {import('./lib/operator-cli.mjs').OperatorCliMetadata} */
const CLI_METADATA = {
  schemaVersion: OPERATOR_CLI_SCHEMA,
  name: 'silent-zero-output',
  entry: 'bin/silent-zero-output.mjs',
  purpose: 'Statically check declared handler skip paths against declared required input roles; precursor observation only, runtimeFailureClaim NONE.',
  group: 'validate',
  flags: [
    { name: '--config', shape: 'path', summary: 'owner-declared silent-zero-output contracts (default config/silent-zero-output-contracts.v1.json, at most 64 KiB)' },
    { name: '--json', shape: 'boolean', summary: 'emit the sanitized report as JSON' },
    { name: '--out', shape: 'path', summary: 'report destination (default artifacts/silent-zero-output/current.json)' },
  ],
  json: true,
  authorization: 'LOCAL_ONLY',
  artifacts: ['artifacts/silent-zero-output/current.json'],
};

/**
 * @param {string} code
 * @param {string} [detail]
 */
function fail(code, detail) {
  process.stderr.write(detail === undefined ? `[silent-zero-output] ERROR: ${code}\n` : `[silent-zero-output] ERROR: ${code}: ${detail}\n`);
  process.exitCode = 2;
}

/**
 * NW-AUD-009: the caller's exact schema validator for the silent-zero-output
 * report. The report carries runtimeFailureClaim NONE, and the publication
 * boundary admits nothing this shape does not carry, before any filesystem
 * change.
 *
 * @param {unknown} payload
 */
function validateSilentZeroReport(payload) {
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('REPORT_NOT_AN_OBJECT');
  const report = /** @type {Record<string, unknown>} */ (payload);
  if (report.schemaVersion !== 'nightwatch.silent-zero-output-report.v1') throw new Error('REPORT_SCHEMA_INVALID');
  if (report.runtimeFailureClaim !== 'NONE') throw new Error('REPORT_RUNTIME_FAILURE_CLAIM_INVALID');
  if (!Array.isArray(report.handlers)) throw new Error('REPORT_HANDLERS_INVALID');
  for (const handler of report.handlers) {
    if (handler === null || typeof handler !== 'object' || Array.isArray(handler)) throw new Error('REPORT_HANDLER_INVALID');
    const value = /** @type {Record<string, unknown>} */ (handler);
    if (typeof value.handlerId !== 'string') throw new Error('REPORT_HANDLER_ID_INVALID');
    if (typeof value.verdict !== 'string') throw new Error('REPORT_HANDLER_VERDICT_INVALID');
    if (!Array.isArray(value.reasonCodes)) throw new Error('REPORT_HANDLER_REASON_CODES_INVALID');
  }
  if (typeof report.reportDigest !== 'string' || !/^[a-z]{3}:sha256:[0-9a-f]{24}$/.test(report.reportDigest)) throw new Error('REPORT_DIGEST_INVALID');
}

/**
 * NW-AUD-009: publish the sanitized silent-zero-output report through the ONE
 * governed local-report boundary — complete admission in memory, then
 * same-directory exclusive staging and an atomic replace. A symlinked or
 * non-regular destination is refused rather than followed.
 *
 * @param {import('../src/core/source/silentZeroOutput').SilentZeroReport} report
 * @param {string} destination
 * @returns {string | null} the categorical publication failure, or null on success
 */
function publishReport(report, destination) {
  const { publishLocalReport } = loadTypeScriptModule('src/core/policy/localReportPublication.ts', { root });
  const published = publishLocalReport({
    profile: 'CURRENT_REPLACE',
    payload: report,
    validate: validateSilentZeroReport,
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
  // M6 (7.8/B-10): the ONE sibling-root resolution.
  const { resolveSiblingRoot } = loadTypeScriptModule('src/core/policy/sourceTopology.ts');
  const core = loadTypeScriptModule('src/core/source/silentZeroOutput.ts');

  const siblingRoot = path.resolve(resolveSiblingRoot());
  const access = createSiblingSourceAccess(siblingRoot);
  const report = core.runSilentZeroOutput({ config, reader: access.reader, currentness: access.currentness });

  // NW-AUD-009: publication goes through the governed boundary; a refusal is
  // the same categorical REPORT_WRITE_FAILED the direct write reported.
  const publicationFailure = publishReport(report, path.resolve(outPath));
  if (publicationFailure !== null) {
    return fail('REPORT_WRITE_FAILED', publicationFailure);
  }

  if (cli.flags['--json'] === true) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    for (const handler of report.handlers) process.stdout.write(`[silent-zero-output] ${handler.handlerId} ${handler.verdict}\n`);
    process.stdout.write(`[silent-zero-output] digest=${report.reportDigest} handlers=${report.handlers.length}\n`);
  }
  const precursor = report.handlers.some((handler) => handler.verdict === 'STATIC_ZERO_OUTPUT_PRECURSOR');
  const invalid = report.handlers.some((handler) => handler.verdict === 'DECLARATION_INVALID');
  process.exitCode = invalid ? 2 : precursor ? 1 : 0;
}

main();
