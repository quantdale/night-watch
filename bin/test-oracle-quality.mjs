#!/usr/bin/env node
// @ts-check

// ---------------------------------------------------------------------------
// NW-PROJ-010 (Wave 2, stage 1) — test-oracle quality driver.
//
// Loads the owner-declared test-oracle quality configuration, reads the
// declared PHP test files through the confined sibling-source boundary, runs
// the bounded static classifier, and writes the sanitized assurance-gap
// report. No product test executes and no product source is mutated.
//
// Stage 1 boundary: the report is an assurance-gap artifact, never a finding.
//
// Usage: node bin/test-oracle-quality.mjs [--config <path>] [--json] [--out <path>]
// Exit: 0 no assurance concern · 1 concern present · 2 declaration error.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { OPERATOR_CLI_SCHEMA, defineOperatorCli } from './lib/operator-cli.mjs';
import { loadTypeScriptModule } from './lib/typescript-runtime-loader.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_CONFIG = 'config/test-oracle-quality.v1.json';
const DEFAULT_OUTPUT = 'artifacts/test-oracle-quality/current.json';
const MAX_CONFIG_BYTES = 64 * 1024;
const MAX_REPORT_BYTES = 8 * 1024 * 1024;

const CONCERN_VERDICTS = new Set([
  'MIRROR_ONLY',
  'UNDECLARED_SKIP',
  'EARLY_RETURN_DISABLED',
  'ASSERTION_SURFACE_ABSENT',
  'LIVE_INFRA_DEPENDENCY',
  'CLASSIFICATION_AMBIGUOUS',
]);

/** @type {import('./lib/operator-cli.mjs').OperatorCliMetadata} */
const CLI_METADATA = {
  schemaVersion: OPERATOR_CLI_SCHEMA,
  name: 'test-oracle-quality',
  entry: 'bin/test-oracle-quality.mjs',
  purpose: 'Statically classify declared PHP test-oracle quality (mirror/skip/early-return/assertion surface) without executing any test; assurance-gap only.',
  group: 'validate',
  flags: [
    { name: '--config', shape: 'path', summary: 'owner-declared test-oracle quality config (default config/test-oracle-quality.v1.json, at most 64 KiB)' },
    { name: '--json', shape: 'boolean', summary: 'emit the sanitized report as JSON' },
    { name: '--out', shape: 'path', summary: 'report destination (default artifacts/test-oracle-quality/current.json)' },
  ],
  json: true,
  authorization: 'LOCAL_ONLY',
  artifacts: ['artifacts/test-oracle-quality/current.json'],
};

/**
 * @param {string} code
 * @param {string} [detail]
 */
function fail(code, detail) {
  process.stderr.write(detail === undefined ? `[test-oracle-quality] ERROR: ${code}\n` : `[test-oracle-quality] ERROR: ${code}: ${detail}\n`);
  process.exitCode = 2;
}

/**
 * NW-AUD-009: the caller's exact schema validator for the assurance-gap
 * report. The report is an assurance-gap artifact, never a finding, and the
 * publication boundary admits nothing this shape does not carry, before any
 * filesystem change.
 *
 * @param {unknown} payload
 */
function validateTestOracleReport(payload) {
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('REPORT_NOT_AN_OBJECT');
  const report = /** @type {Record<string, unknown>} */ (payload);
  if (report.schemaVersion !== 'nightwatch.test-assurance-report.v1') throw new Error('REPORT_SCHEMA_INVALID');
  if (report.finding !== 'NONE') throw new Error('REPORT_FINDING_CLAIM_INVALID');
  if (report.assuranceGapOnly !== true) throw new Error('REPORT_ASSURANCE_GAP_CLAIM_INVALID');
  if (!Array.isArray(report.targets)) throw new Error('REPORT_TARGETS_INVALID');
  for (const target of report.targets) {
    if (target === null || typeof target !== 'object' || Array.isArray(target)) throw new Error('REPORT_TARGET_INVALID');
    const value = /** @type {Record<string, unknown>} */ (target);
    if (typeof value.path !== 'string') throw new Error('REPORT_TARGET_PATH_INVALID');
    if (typeof value.verdict !== 'string') throw new Error('REPORT_TARGET_VERDICT_INVALID');
  }
  if (typeof report.reportDigest !== 'string' || !/^[a-z]{3}:sha256:[0-9a-f]{24}$/.test(report.reportDigest)) throw new Error('REPORT_DIGEST_INVALID');
}

/**
 * NW-AUD-009: publish the sanitized assurance-gap report through the ONE
 * governed local-report boundary — complete admission in memory, then
 * same-directory exclusive staging and an atomic replace. A symlinked or
 * non-regular destination is refused rather than followed.
 *
 * @param {import('../src/core/source/testOracleQuality').TestAssuranceReport} report
 * @param {string} destination
 * @returns {string | null} the categorical publication failure, or null on success
 */
function publishReport(report, destination) {
  const { publishLocalReport } = loadTypeScriptModule('src/core/policy/localReportPublication.ts', { root });
  const published = publishLocalReport({
    profile: 'CURRENT_REPLACE',
    payload: report,
    validate: validateTestOracleReport,
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
  const core = loadTypeScriptModule('src/core/source/testOracleQuality.ts');

  const siblingRoot = path.resolve(resolveSiblingRoot());
  const access = createSiblingSourceAccess(siblingRoot);
  const report = core.runTestOracleQuality({ config, reader: access.reader, currentness: access.currentness });

  // NW-AUD-009: publication goes through the governed boundary; a refusal is
  // the same categorical REPORT_WRITE_FAILED the direct write reported.
  const publicationFailure = publishReport(report, path.resolve(outPath));
  if (publicationFailure !== null) {
    return fail('REPORT_WRITE_FAILED', publicationFailure);
  }

  if (cli.flags['--json'] === true) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    for (const target of report.targets) {
      process.stdout.write(`[test-oracle-quality] ${target.path} ${target.verdict}\n`);
    }
    process.stdout.write(`[test-oracle-quality] digest=${report.reportDigest} targets=${report.targets.length}\n`);
  }
  if (report.targets.length === 1 && report.targets[0]?.verdict === 'DECLARATION_INVALID') process.exitCode = 2;
  else if (report.targets.some((target) => CONCERN_VERDICTS.has(target.verdict))) process.exitCode = 1;
  else process.exitCode = 0;
}

main();
